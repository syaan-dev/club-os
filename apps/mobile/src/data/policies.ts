import { Platform } from "react-native";
import Constants from "expo-constants";
import { supabase } from "../../lib/supabase";
import {
  AGE_GATE_VERSION,
  PRIVACY_VERSION,
  TERMS_VERSION,
} from "../legal/policies";

// Records one row per policy the user accepted during a single consent event.
// Best-effort: the caller should not block onboarding if this fails — the user
// has already consented via the checkbox; we log and move on. Returns the
// Supabase error (if any) so callers can decide how to surface it.
export async function recordPolicyConsent(userId: string, method: string) {
  const appVersion = Constants.expoConfig?.version ?? null;
  const rows = [
    { policy_type: "terms", policy_version: TERMS_VERSION },
    { policy_type: "privacy", policy_version: PRIVACY_VERSION },
    { policy_type: "age_18_plus", policy_version: AGE_GATE_VERSION },
  ].map((row) => ({
    user_id: userId,
    policy_type: row.policy_type,
    policy_version: row.policy_version,
    method,
    app_version: appVersion,
    platform: Platform.OS,
  }));

  const { error } = await supabase.from("policy_acceptances").insert(rows);
  return error;
}
