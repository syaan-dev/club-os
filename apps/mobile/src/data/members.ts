// Data-access for club members. Returns the mapped roster plus the caller's own
// member id + role (derived from matching the authenticated user id).

import { supabase } from "../../lib/supabase";
import { mapRole } from "../lib/format";
import type { Member } from "../types";

export type MembersResult = {
  members: Member[];
  myMemberId: string;
  myRole: Member["role"] | "";
};

export async function fetchMembers(
  clubId: string,
  userId: string | undefined,
): Promise<MembersResult | null> {
  const { data, error } = await supabase
    .from("members")
    .select(
      "id,name,role,user_id,membership_status,phone,avatar_url,location,skills",
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return null;
  }

  const myMemberRow = data.find((member) => member.user_id === userId);

  return {
    myMemberId: myMemberRow?.id ?? "",
    myRole: myMemberRow ? mapRole(myMemberRow.role) : "",
    members: data.map((member) => ({
      id: member.id,
      name: member.name,
      role: mapRole(member.role),
      duesPaid: false,
      status: member.membership_status,
      phone: member.phone ?? undefined,
      avatarUrl: member.avatar_url ?? undefined,
      location: member.location ?? undefined,
      skills: member.skills ?? undefined,
    })),
  };
}
