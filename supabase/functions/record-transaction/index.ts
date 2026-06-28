// record-transaction: owner/treasurer records a manual income/expense ledger
// entry.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import {
  optionalString,
  requireEnum,
  requirePositiveNumber,
  requireString,
  requireUuid,
} from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";

const TYPES = ["income", "expense"] as const;

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const type = requireEnum(body, "type", TYPES);
    const amount = requirePositiveNumber(body, "amount");
    const category = requireString(body, "category", { max: 100 });
    const method = optionalString(body, "method", { max: 50 }) ??
      "UPI";
    const receiptUrl = optionalString(body, "receiptUrl");
    const memberId = body.memberId === undefined || body.memberId === null
      ? null
      : requireUuid(body, "memberId");

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!isManager(actor)) {
      return errorResponse(
        "Only an owner or treasurer can record transactions",
        403,
      );
    }

    const { data: tx, error } = await client
      .from("ledger_entries")
      .insert({
        club_id: clubId,
        member_id: memberId,
        recorded_by: actor!.memberId,
        type,
        amount,
        category,
        method,
        status: "completed",
        source: "manual",
        receipt_url: receiptUrl,
        occurred_at: new Date().toISOString(),
      })
      .select("id,type,amount,category,method,created_at")
      .single();

    if (error || !tx) {
      return errorResponse(error?.message ?? "Failed to record transaction", 400);
    }

    await writeAudit(client, {
      clubId,
      actorMemberId: actor!.memberId,
      eventType: "transaction.recorded",
      entityType: "ledger_entry",
      entityId: tx.id,
      eventData: { type, amount, category },
    });

    return jsonResponse({ transaction: tx }, { status: 201 });
  }),
);
