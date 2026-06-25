// Pure, stateless helpers shared across the data layer and context hooks.
// Kept free of React/Supabase so they can be unit tested in isolation.

import type { Member } from "../types";

// Normalizes user-entered phone input to strict E.164. A bare 10-digit number
// is assumed to be Indian (+91); anything else is prefixed with '+'.
export function normalizePhone(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }
  const digitsOnly = trimmed.replace(/\D/g, "");
  if (digitsOnly.length === 10) {
    return `+91${digitsOnly}`;
  }
  return `+${digitsOnly}`;
}

// Builds the deep-link invite URL carrying the invite token + club name.
export function buildInviteLink(token: string, club: string): string {
  return `clubos://join?token=${encodeURIComponent(token)}&club=${encodeURIComponent(club)}`;
}

// Maps the lowercase DB role to the app's display role.
export function mapRole(role: string | null): Member["role"] {
  if (role === "owner") {
    return "Owner";
  }
  if (role === "treasurer") {
    return "Treasurer";
  }
  if (role === "secretary") {
    return "Secretary";
  }
  return "Member";
}

// Roles permitted to manage club activities (meetings, polls, announcements).
// Mirrors the `*_manage_leadership` RLS policies.
export function isLeadership(role: Member["role"] | ""): boolean {
  return role === "Owner" || role === "Treasurer" || role === "Secretary";
}
