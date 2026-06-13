// create-club: creates a club and bootstraps the caller as the active owner.
import {
  errorResponse,
  getAuthedUser,
  getClientForRequest,
  handlePost,
  jsonResponse,
  writeAudit,
} from "../_shared/http.ts";
import { requireString } from "../_shared/validation.ts";

Deno.serve(
  handlePost(async (body, req) => {
    const client = getClientForRequest(req);
    const user = await getAuthedUser(client);

    const name = requireString(body, "name", { max: 255 });
    const description = requireString(body, "description", { max: 2000 });

    const { data: club, error: clubError } = await client
      .from("clubs")
      .insert({ name, description, created_by: user.id })
      .select("id,name")
      .single();

    if (clubError || !club) {
      return errorResponse(clubError?.message ?? "Failed to create club", 400);
    }

    const { data: member, error: memberError } = await client
      .from("members")
      .insert({
        club_id: club.id,
        user_id: user.id,
        name: (user.user_metadata?.full_name as string) ?? user.phone ?? "Owner",
        email: user.email ?? null,
        phone: user.phone ?? null,
        role: "owner",
        membership_status: "active",
        is_active: true,
      })
      .select("id")
      .single();

    if (memberError || !member) {
      return errorResponse(
        memberError?.message ?? "Failed to bootstrap owner membership",
        400,
      );
    }

    await writeAudit(client, {
      clubId: club.id,
      actorMemberId: member.id,
      eventType: "club.created",
      entityType: "club",
      entityId: club.id,
      eventData: { name },
    });

    return jsonResponse(
      { club: { id: club.id, name: club.name }, ownerMemberId: member.id },
      { status: 201 },
    );
  }),
);
