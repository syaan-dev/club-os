// create-dues-cycle: owner/treasurer opens a billing cycle for a dues plan.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { requireIsoDate, requireString, requireUuid } from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const duesPlanId = requireUuid(body, "duesPlanId");
    const cycleLabel = requireString(body, "cycleLabel", { max: 50 });
    const dueDate = requireIsoDate(body, "dueDate");

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!isManager(actor)) {
      return errorResponse("Only an owner or treasurer can create dues cycles", 403);
    }

    const { data: cycle, error } = await client
      .from("dues_cycles")
      .insert({
        club_id: clubId,
        dues_plan_id: duesPlanId,
        cycle_label: cycleLabel,
        due_date: dueDate,
      })
      .select("id,cycle_label,due_date,dues_plan_id")
      .single();

    if (error || !cycle) {
      return errorResponse(error?.message ?? "Failed to create dues cycle", 400);
    }

    await writeAudit(client, {
      clubId,
      actorMemberId: actor!.memberId,
      eventType: "dues_cycle.created",
      entityType: "dues_cycle",
      entityId: cycle.id,
      eventData: { cycleLabel, dueDate },
    });

    return jsonResponse({ cycle }, { status: 201 });
  }),
);
