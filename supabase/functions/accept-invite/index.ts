// accept-invite: the invited user (authenticated by phone) claims their pending
// membership and activates it. RLS policy members_update_invited_self_claim
// authorizes the update by matching the caller's phone.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { optionalString, requireString } from "../_shared/validation.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const token = requireString(body, "token", { max: 255 });
    const fullName = requireString(body, "name", { max: 255 });
    const email = requireString(body, "email", { max: 255 });
    const location = optionalString(body, "location", { max: 255 });
    const skills = optionalString(body, "skills", { max: 500 });

    const { data: invite, error: inviteError } = await client
      .from("club_invites")
      .select("id,club_id,status")
      .eq("token", token)
      .maybeSingle();

    if (inviteError || !invite) {
      return errorResponse("Invite not found", 404);
    }
    if (invite.status === "revoked" || invite.status === "expired") {
      return errorResponse(`Invite is ${invite.status}`, 409);
    }

    // Mark the invite accepted (idempotent if already accepted).
    if (invite.status === "pending") {
      await client
        .from("club_invites")
        .update({ status: "accepted" })
        .eq("id", invite.id)
        .eq("status", "pending");
    }

    // Claim the pending member row by phone ownership.
    const { data: claimed, error: claimError } = await client
      .from("members")
      .update({
        user_id: user.id,
        name: fullName,
        email: email.toLowerCase(),
        membership_status: "active",
        is_active: true,
      })
      .eq("club_id", invite.club_id)
      .is("user_id", null)
      .eq("membership_status", "invited")
      .select("id")
      .maybeSingle();

    if (claimError || !claimed) {
      return errorResponse(
        claimError?.message ?? "No matching pending membership to claim",
        409,
      );
    }

    await client.auth.updateUser({
      data: {
        full_name: fullName,
        member_email: email.toLowerCase(),
        location,
        skills,
      },
    });

    await writeAudit(client, {
      clubId: invite.club_id,
      actorMemberId: claimed.id,
      eventType: "invite.accepted",
      entityType: "member",
      entityId: claimed.id,
    });

    return jsonResponse({ memberId: claimed.id, clubId: invite.club_id });
  }),
);
