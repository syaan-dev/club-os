// Auth-domain mutations: sending the phone OTP and verifying it. Extracted from
// ClubOsContext so the provider stays lean.
//
// State remains owned by the provider; this hook receives it (plus the
// toast/loading helpers and the post-login orchestrator) as `deps` and returns
// the action callbacks. `logout` stays in the provider because it depends on
// the push-token ref and onboarding-reset glue.

import type { Session } from "@supabase/supabase-js";

import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { isValidPhone, normalizePhone } from "../lib/format";

type AuthActionsDeps = {
  phone: string;
  otp: string;
  setPhone: (value: string) => void;
  setOtpSent: (value: boolean) => void;
  setSession: (value: Session | null) => void;
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  detectPostLoginFlow: () => Promise<void>;
};

export function useAuthActions(deps: AuthActionsDeps) {
  const {
    phone,
    otp,
    setPhone,
    setOtpSent,
    setSession,
    setErrorText,
    setInfoText,
    setLoading,
    detectPostLoginFlow,
  } = deps;

  const sendOtp = async () => {
    setErrorText("");
    setInfoText("");

    if (!isSupabaseConfigured) {
      setErrorText(
        "Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (!isValidPhone(normalizedPhone)) {
      setErrorText("Enter a valid phone number with country code.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      phone: normalizedPhone,
    });
    setLoading(false);

    if (error) {
      if (error.message.toLowerCase().includes("unsupported phone provider")) {
        setErrorText(
          "Local SMS provider mismatch. Ensure [auth.sms] enable_signup=true, [auth.sms.test_otp] has +919876543210 mapping, restart Supabase, and use EXPO_PUBLIC_SUPABASE_ANON_KEY (not a secret key).",
        );
      } else {
        setErrorText(error.message);
      }
      return;
    }

    setPhone(normalizedPhone);
    setOtpSent(true);
    setInfoText("OTP sent. Enter the 6-digit code to continue.");
  };

  const verifyOtpAndContinue = async () => {
    setErrorText("");
    setInfoText("");

    if (!isSupabaseConfigured) {
      setErrorText(
        "Supabase env vars are missing. Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const normalizedPhone = normalizePhone(phone);
    if (otp.trim().length < 6) {
      setErrorText("Enter the 6-digit OTP.");
      return;
    }

    setLoading(true);
    const {
      data: { session: verifiedSession },
      error,
    } = await supabase.auth.verifyOtp({
      phone: normalizedPhone,
      token: otp.trim(),
      type: "sms",
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    setSession(verifiedSession);
    await detectPostLoginFlow();
    setInfoText("Phone verified successfully.");
  };

  return {
    sendOtp,
    verifyOtpAndContinue,
  };
}
