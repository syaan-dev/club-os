// create-invite: owner/treasurer invites a member by phone. Creates the pending
// member row and the club_invites token row.
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
  requirePhone,
  requireUuid,
} from "../_shared/validation.ts";
import { isManager, resolveActorMembership } from "../_shared/members.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const clubId = requireUuid(body, "clubId");
    const phone = requirePhone(body, "phone");
    const name = optionalString(body, "name", { max: 255 });
    const email = optionalString(body, "email", { max: 255 });

    const actor = await resolveActorMembership(client, clubId, user.id);
    if (!isManager(actor)) {
      return errorResponse("Only an owner or treasurer can invite members", 403);
    }

    const { data: existing } = await client
      .from("members")
      .select("id")
      .eq("club_id", clubId)
      .eq("phone", phone)
      .in("membership_status", ["invited", "active", "suspended"])
      .limit(1);

    if (existing && existing.length > 0) {
      return errorResponse("This phone is already in your member records", 409);
    }

    const { data: member, error: memberError } = await client
      .from("members")
      .insert({
        club_id: clubId,
        user_id: null,
        name: name ?? "Invited member",
        email: email,
        phone,
        role: "member",
        membership_status: "invited",
        is_active: true,
      })
      .select("id")
      .single();

    if (memberError || !member) {
      return errorResponse(memberError?.message ?? "Failed to create member", 400);
    }

    const token = `invite_${crypto.randomUUID()}`;
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: inviteError } = await client
      .from("club_invites")
      .insert({
        club_id: clubId,
        invited_phone: phone,
        invited_email: email,
        token,
        invited_by: actor!.memberId,
        expires_at: expiresAt,
      })
      .select("id,token")
      .single();

    if (inviteError || !invite) {
      // Roll back the orphaned member row on failure.
      await client.from("members").delete().eq("id", member.id);
      return errorResponse(inviteError?.message ?? "Failed to create invite", 400);
    }

    await writeAudit(client, {
      clubId,
      actorMemberId: actor!.memberId,
      eventType: "invite.created",
      entityType: "club_invite",
      entityId: invite.id,
      eventData: { phone },
    });

    return jsonResponse(
      { inviteId: invite.id, memberId: member.id, token: invite.token },
      { status: 201 },
    );
  }),
);
