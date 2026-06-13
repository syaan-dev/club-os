// generate-member-dues: bills every active member for a dues cycle by invoking
// the generate_dues_for_cycle RPC (which enforces owner/treasurer authority and
// is idempotent).
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { requireUuid } from "../_shared/validation.ts";
import { resolveActorMembership } from "../_shared/members.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const cycleId = requireUuid(body, "cycleId");

    const { data: generated, error } = await client.rpc(
      "generate_dues_for_cycle",
      { _cycle_id: cycleId },
    );

    if (error) {
      // RPC raises insufficient_privilege for non-managers.
      const status = error.message?.includes("not authorized") ? 403 : 400;
      return errorResponse(error.message, status);
    }

    const actor = await resolveActorMembership(client, clubId, user.id);
    await writeAudit(client, {
      clubId,
      actorMemberId: actor?.memberId ?? null,
      eventType: "member_dues.generated",
      entityType: "dues_cycle",
      entityId: cycleId,
      eventData: { generated },
    });

    return jsonResponse({ generated }, { status: 201 });
  }),
);
