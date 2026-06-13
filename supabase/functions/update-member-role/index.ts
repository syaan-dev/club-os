// update-member-role: owner/treasurer changes a member's role. Only the owner
// may grant or revoke the 'owner' role.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { requireEnum, requireUuid } from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";

const ROLES = ["owner", "treasurer", "secretary", "member"] as const;

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const memberId = requireUuid(body, "memberId");
    const role = requireEnum(body, "role", ROLES);

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!isManager(actor)) {
      return errorResponse("Only an owner or treasurer can change roles", 403);
    }

    // Read the target's current role to enforce owner-only escalation rules.
    const { data: target, error: targetError } = await client
      .from("members")
      .select("id,role")
      .eq("id", memberId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (targetError || !target) {
      return errorResponse("Member not found in this club", 404);
    }

    const touchesOwner = role === "owner" || target.role === "owner";
    if (touchesOwner && actor!.role !== "owner") {
      return errorResponse("Only the owner can assign or remove the owner role", 403);
    }

    const { data: updated, error: updateError } = await client
      .from("members")
      .update({ role })
      .eq("id", memberId)
      .eq("club_id", clubId)
      .select("id,role")
      .single();

    if (updateError || !updated) {
      return errorResponse(updateError?.message ?? "Failed to update role", 400);
    }

    await writeAudit(client, {
      clubId,
      actorMemberId: actor!.memberId,
      eventType: "member.role_changed",
      entityType: "member",
      entityId: memberId,
      eventData: { from: target.role, to: role },
    });

    return jsonResponse({ memberId: updated.id, role: updated.role });
  }),
);
