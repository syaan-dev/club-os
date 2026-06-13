import { type SupabaseClient } from "jsr:@supabase/supabase-js@2";

export type ActorMembership = {
  memberId: string;
  role: "owner" | "treasurer" | "secretary" | "member";
};

// Resolves the caller's active membership (id + role) within a club. Returns
// null when the caller is not an active member. RLS already restricts which
// rows are visible, but we filter explicitly for clarity and correctness.
export async function resolveActorMembership(
  client: SupabaseClient,
  clubId: string,
  userId: string,
): Promise<ActorMembership | null> {
  const { data, error } = await client
    .from("members")
    .select("id,role")
    .eq("club_id", clubId)
    .eq("user_id", userId)
    .eq("membership_status", "active")
    .maybeSingle();

  if (error || !data) {
    return null;
  }
  return { memberId: data.id as string, role: data.role as ActorMembership["role"] };
}

export function isManager(membership: ActorMembership | null): boolean {
  return membership?.role === "owner" || membership?.role === "treasurer";
}
