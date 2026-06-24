// create-due-payment-link: a member (paying their own due) or a manager
// requests a Stripe Payment Link for a single member due. The amount always
// comes from the database row — never the client — so the price cannot be
// tampered with. The hosted URL is the only Stripe data returned to the caller.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  getServiceClient,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { requireUuid } from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";
import { createDuePaymentLink } from "../_shared/stripe.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const dueId = requireUuid(body, "dueId");

    // Read the due under the caller's RLS. is_club_member lets any active
    // member see club dues; we still authorize ownership/role below.
    const { data: due, error: dueError } = await client
      .from("member_dues")
      .select(
        "id,club_id,member_id,amount_due,amount_paid,status," +
          "dues_cycles(cycle_label),clubs(name,currency)",
      )
      .eq("id", dueId)
      .maybeSingle();

    if (dueError || !due) {
      return errorResponse("Due not found", 404);
    }

    const actor = await resolveActorMembership(client, due.club_id, user.id);
    const isOwnDue = actor?.memberId === due.member_id;
    if (!actor || (!isOwnDue && !isManager(actor))) {
      return errorResponse(
        "Only the member who owes this due or a manager can create a payment link",
        403,
      );
    }

    if (due.status === "paid" || due.status === "waived") {
      return errorResponse("This due has nothing left to pay", 400);
    }

    const remaining = Number(due.amount_due) - Number(due.amount_paid);
    if (!(remaining > 0)) {
      return errorResponse("This due has nothing left to pay", 400);
    }

    const svc = getServiceClient();

    // Reuse an existing pending link so repeated taps don't mint duplicates.
    const { data: existing } = await svc
      .from("due_payment_links")
      .select("url,status")
      .eq("member_due_id", dueId)
      .maybeSingle();

    if (existing && existing.status === "pending" && existing.url) {
      return jsonResponse({ url: existing.url });
    }

    const secretKey = Deno.env.get("STRIPE_SECRET_KEY") ?? "";
    if (!secretKey) {
      return errorResponse("Stripe is not configured", 500);
    }

    const cycle = Array.isArray(due.dues_cycles)
      ? due.dues_cycles[0]
      : due.dues_cycles;
    const club = Array.isArray(due.clubs) ? due.clubs[0] : due.clubs;
    const currency = (club?.currency as string) ?? "INR";
    const clubName = (club?.name as string) ?? "Club";
    const cycleLabel = (cycle?.cycle_label as string) ?? "dues";

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
      metadata: {
        dueId: due.id,
        clubId: due.club_id,
        memberId: due.member_id,
      },
      successUrl: Deno.env.get("PAYMENT_SUCCESS_URL") || undefined,
      paymentMethodTypes: paymentMethodTypes.length > 0
        ? paymentMethodTypes
        : undefined,
    });

    const { error: upsertError } = await svc
      .from("due_payment_links")
      .upsert(
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

    if (upsertError) {
      return errorResponse(upsertError.message, 400);
    }

    await writeAudit(client, {
      clubId: due.club_id,
      actorMemberId: actor.memberId,
      eventType: "due_payment_link.created",
      entityType: "member_due",
      entityId: due.id,
      eventData: { amount: remaining },
    });

    return jsonResponse({ url: link.url }, { status: 201 });
  }),
);
