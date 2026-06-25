// Data-access functions for clubs + membership invitations. Pure async
// functions that query Supabase and return mapped domain objects; they hold no
// React state so callers own the resulting setState.

import { supabase } from "../../lib/supabase";
import { buildInviteLink, mapRole } from "../lib/format";
import type { MembershipRequest, MyClub } from "../types";

// Returns the active clubs the given user belongs to, newest membership last.
export async function fetchMyClubs(userId: string): Promise<MyClub[]> {
  const { data: memberships } = await supabase
    .from("members")
    .select("id,club_id,role,membership_status")
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .order("created_at", { ascending: true });

  const clubIds = Array.from(
    new Set((memberships || []).map((membership) => membership.club_id)),
  );

  let clubsById = new Map<
    string,
    {
      id: string;
      name: string;
      description: string | null;
      logo_url: string | null;
    }
  >();
  if (clubIds.length > 0) {
    const { data: clubsData } = await supabase
      .from("clubs")
      .select("id,name,description,logo_url")
      .in("id", clubIds);
    clubsById = new Map((clubsData || []).map((club) => [club.id, club]));
  }

  return (memberships || []).map((membership) => ({
    clubId: membership.club_id,
    name: clubsById.get(membership.club_id)?.name ?? "Your club",
    description: clubsById.get(membership.club_id)?.description ?? "",
    role: mapRole(membership.role),
    logoUrl: clubsById.get(membership.club_id)?.logo_url ?? undefined,
  }));
}

// Returns pending/accepted invitations for a phone number, joined with the
// invited member row (if any) and the club name.
export async function fetchMembershipRequests(
  invitedPhone: string,
): Promise<MembershipRequest[]> {
  const { data: invitesData, error: invitesError } = await supabase
    .from("club_invites")
    .select("id,club_id,token,status")
    .eq("invited_phone", invitedPhone)
    .in("status", ["pending", "accepted"])
    .order("created_at", { ascending: false });

  if (invitesError || !invitesData || invitesData.length === 0) {
    return [];
  }

  const { data: memberRows, error: memberRowsError } = await supabase
    .from("members")
    .select("id,club_id")
    .eq("phone", invitedPhone)
    .is("user_id", null)
    .eq("membership_status", "invited");

  if (memberRowsError) {
    return [];
  }

  const memberByClub = new Map((memberRows || []).map((m) => [m.club_id, m.id]));
  const clubIds = Array.from(
    new Set(invitesData.map((invite) => invite.club_id)),
  );

  const { data: clubsData } = await supabase
    .from("clubs")
    .select("id,name")
    .in("id", clubIds);

  const clubNameById = new Map(
    (clubsData || []).map((club) => [club.id, club.name]),
  );

  return invitesData
    .map((invite) => {
      const memberId = memberByClub.get(invite.club_id);
      const club = clubNameById.get(invite.club_id) ?? "Your club";
      return {
        inviteId: invite.id,
        memberId: memberId ?? null,
        clubId: invite.club_id,
        clubName: club,
        token: invite.token,
        inviteLink: buildInviteLink(invite.token, club),
        status: invite.status,
      } satisfies MembershipRequest;
    })
    .filter((item): item is MembershipRequest => Boolean(item));
}
