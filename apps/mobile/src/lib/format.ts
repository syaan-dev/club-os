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

// Validates an email address. Intentionally pragmatic (not RFC-exhaustive):
// requires a single local part, an '@', and a domain with at least one dot,
// and rejects any whitespace.
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return false;
  }
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Validates a phone number after E.164 normalization. Accepts a leading '+'
// followed by 8–15 digits (ITU E.164 caps the total at 15 digits including the
// country code).
export function isValidPhone(value: string): boolean {
  return /^\+\d{8,15}$/.test(normalizePhone(value));
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
