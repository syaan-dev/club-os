// create-dues-plan: owner/treasurer defines a recurring dues plan for a club.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import {
  requireEnum,
  requireNonNegativeInteger,
  requirePositiveNumber,
  requireString,
  requireUuid,
} from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";

const FREQUENCIES = ["one_time", "monthly", "quarterly"] as const;

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const name = requireString(body, "name", { max: 100 });
    const amount = requirePositiveNumber(body, "amount");
    const frequency = requireEnum(body, "frequency", FREQUENCIES);
    const graceDays = requireNonNegativeInteger(body, "graceDays", 0);

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!isManager(actor)) {
      return errorResponse("Only an owner or treasurer can create dues plans", 403);
    }

    const { data: plan, error } = await client
      .from("dues_plans")
      .insert({
        club_id: clubId,
        name,
        amount,
        frequency,
        grace_days: graceDays,
        created_by: actor!.memberId,
      })
      .select("id,name,amount,frequency,grace_days")
      .single();

    if (error || !plan) {
      return errorResponse(error?.message ?? "Failed to create dues plan", 400);
    }

    await writeAudit(client, {
      clubId,
      actorMemberId: actor!.memberId,
      eventType: "dues_plan.created",
      entityType: "dues_plan",
      entityId: plan.id,
      eventData: { name, amount, frequency },
    });

    return jsonResponse({ plan }, { status: 201 });
  }),
);
