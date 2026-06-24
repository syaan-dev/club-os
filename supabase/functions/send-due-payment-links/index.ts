// send-due-payment-links: ensures a Stripe Payment Link exists for one or more
// unpaid member dues and notifies each member (in-app + push) with the link.
//
// Two callers:
//   - A manager from the app (caller JWT) passing { cycleId } | { dueIds } |
//     { dueId } to blast links for a whole billing cycle or a selection.
//   - The database trigger on_member_due_payable (shared secret in the
//     Authorization header) passing { dueId } when a due is freshly payable.
//
// Writes use the service role; the JWT path is authorized as a club manager.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  getServiceClient,
  handlePost,
  jsonResponse,
} from "../_shared/http.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";
import { ValidationError } from "../_shared/validation.ts";
import { createDuePaymentLink } from "../_shared/stripe.ts";
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PAYABLE = ["pending", "overdue"];

type DueRow = {
  id: string;
  club_id: string;
  member_id: string;
  amount_due: number;
  amount_paid: number;
  status: string;
  dues_cycles: { cycle_label: string } | { cycle_label: string }[] | null;
  clubs: { name: string; currency: string } | { name: string; currency: string }[] | null;
};

const DUE_SELECT =
  "id,club_id,member_id,amount_due,amount_paid,status," +
  "dues_cycles(cycle_label),clubs(name,currency)";

function asUuidArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new ValidationError("Field 'dueIds' must be an array of UUIDs");
  }
  return value.map((v) => {
    if (typeof v !== "string" || !UUID_RE.test(v)) {
      throw new ValidationError("Field 'dueIds' must contain valid UUIDs");
    }
    return v;
  });
}

async function ensureLinkForDue(
  svc: SupabaseClient,
  due: DueRow,
  secretKey: string,
): Promise<{ url: string; amount: number } | null> {
  const remaining = Number(due.amount_due) - Number(due.amount_paid);
  if (!(remaining > 0) || !PAYABLE.includes(due.status)) {
    return null;
  }

  const { data: existing } = await svc
    .from("due_payment_links")
    .select("url,status")
    .eq("member_due_id", due.id)
    .maybeSingle();

  if (existing && existing.status === "pending" && existing.url) {
    return { url: existing.url as string, amount: remaining };
  }

  const cycle = Array.isArray(due.dues_cycles)
    ? due.dues_cycles[0]
    : due.dues_cycles;
  const club = Array.isArray(due.clubs) ? due.clubs[0] : due.clubs;
  const currency = club?.currency ?? "INR";
  const clubName = club?.name ?? "Club";
  const cycleLabel = cycle?.cycle_label ?? "dues";

  const pmTypesEnv = Deno.env.get("STRIPE_PAYMENT_METHOD_TYPES") ?? "";
  const paymentMethodTypes = pmTypesEnv
    .split(",")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  const link = await createDuePaymentLink({
    secretKey,
    amount: remaining,
    currency,
    productName: `${clubName} dues - ${cycleLabel}`,
    metadata: { dueId: due.id, clubId: due.club_id, memberId: due.member_id },
    successUrl: Deno.env.get("PAYMENT_SUCCESS_URL") || undefined,
    paymentMethodTypes: paymentMethodTypes.length > 0
      ? paymentMethodTypes
      : undefined,
  });

  await svc.from("due_payment_links").upsert(
    {
      club_id: due.club_id,
      member_id: due.member_id,
      member_due_id: due.id,
      stripe_payment_link_id: link.id,
      url: link.url,
      amount: remaining,
      currency,
      status: "pending",
    },
    { onConflict: "member_due_id" },
  );

  return { url: link.url, amount: remaining };
}

Deno.serve(
  handlePost(async (body, req) => {
    const sharedSecret = Deno.env.get("PAYMENT_WEBHOOK_SECRET") ?? "";
    const authHeader = req.headers.get("Authorization") ?? "";
    const isSystem = sharedSecret.length > 0 &&
      authHeader === `Bearer ${sharedSecret}`;

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!secretKey) {
      return errorResponse("Stripe is not configured", 500);
    }

    const svc = getServiceClient();

    // Resolve the set of target dues.
    let dueIds: string[] = [];
    if (typeof body.dueId === "string") {
      if (!UUID_RE.test(body.dueId)) {
        throw new ValidationError("Field 'dueId' must be a valid UUID");
      }
      dueIds = [body.dueId];
    } else if (body.dueIds !== undefined) {
      dueIds = asUuidArray(body.dueIds);
    } else if (typeof body.cycleId === "string") {
      if (!UUID_RE.test(body.cycleId)) {
        throw new ValidationError("Field 'cycleId' must be a valid UUID");
      }
      const { data: cycleDues, error } = await svc
        .from("member_dues")
        .select("id")
        .eq("dues_cycle_id", body.cycleId);
      if (error) {
        return errorResponse(error.message, 400);
      }
      dueIds = (cycleDues ?? []).map((d) => d.id as string);
    } else {
      throw new ValidationError("Provide one of: dueId, dueIds, cycleId");
    }

    if (dueIds.length === 0) {
      return jsonResponse({ sent: 0, links: 0 });
    }

    const { data: dues, error: duesError } = await svc
      .from("member_dues")
      .select(DUE_SELECT)
      .in("id", dueIds);

    if (duesError) {
      return errorResponse(duesError.message, 400);
    }
    const rows = (dues ?? []) as unknown as DueRow[];

    // Authorize the JWT path: caller must manage every club referenced.
    if (!isSystem) {
      const client = getClientForRequest(req);
      const user = await getAuthedUser(client);
      const clubIds = [...new Set(rows.map((r) => r.club_id))];
      for (const clubId of clubIds) {
        const actor = await resolveActorMembership(client, clubId, user.id);
        if (!isManager(actor)) {
          return errorResponse(
            "Only an owner or treasurer can send payment links",
            403,
          );
        }
      }
    }

    let links = 0;
    let sent = 0;
    for (const due of rows) {
      const link = await ensureLinkForDue(svc, due, secretKey);
      if (!link) {
        continue;
      }
      links += 1;

      const cycle = Array.isArray(due.dues_cycles)
        ? due.dues_cycles[0]
        : due.dues_cycles;
      const cycleLabel = cycle?.cycle_label ?? "dues";

      const { error: notifyError } = await svc.from("notifications").insert({
        club_id: due.club_id,
        recipient_member_id: due.member_id,
        type: "dues_payment_link",
        title: "Dues payment link",
        body: `Tap to pay your dues of ${link.amount} for ${cycleLabel}.`,
        data: { dueId: due.id, url: link.url, amount: link.amount },
      });
      if (!notifyError) {
        sent += 1;
      }
    }

    return jsonResponse({ sent, links });
  }),
);
