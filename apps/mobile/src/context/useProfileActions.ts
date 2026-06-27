// Profile-domain mutations for the signed-in member's own account: saving the
// editable profile fields (with email-verification handling), resending the
// email-confirmation link, and uploading an avatar. Extracted from
// ClubOsContext so the provider stays lean.
//
// State + loaders remain owned by the provider; this hook receives them (plus
// the toast/loading helpers) as `deps` and returns the action callbacks.

import * as ImagePicker from "expo-image-picker";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";
import { emailRedirectUrl } from "../lib/email";
import { isValidEmail } from "../lib/format";

type ProfileActionsDeps = {
  clubId: string;
  currentMemberId: string;
  session: Session | null;
  onboardName: string;
  onboardEmail: string;
  onboardLocation: string;
  onboardSkills: string;
  onboardAvatarUrl: string;
  setOnboardAvatarUrl: (value: string) => void;
  setUploadingAvatar: (value: boolean) => void;
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  loadMembers: (clubId: string) => Promise<void>;
};

export function useProfileActions(deps: ProfileActionsDeps) {
  const {
    clubId,
    currentMemberId,
    session,
    onboardName,
    onboardEmail,
    onboardLocation,
    onboardSkills,
    onboardAvatarUrl,
    setOnboardAvatarUrl,
    setUploadingAvatar,
    setErrorText,
    setInfoText,
    setLoading,
    loadMembers,
  } = deps;

  const saveProfile = async () => {
    setErrorText("");
    setInfoText("");

    const trimmedName = onboardName.trim();
    const trimmedEmail = onboardEmail.trim().toLowerCase();

    if (!trimmedName || !trimmedEmail) {
      setErrorText("Name and email are required.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorText("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const needsEmailVerify =
      trimmedEmail !== (session?.user?.email ?? "").toLowerCase();
    const { error } = await supabase.auth.updateUser(
      {
        ...(needsEmailVerify ? { email: trimmedEmail } : {}),
        data: {
          full_name: trimmedName,
          member_email: trimmedEmail,
          location: onboardLocation.trim() || null,
          skills: onboardSkills.trim() || null,
          avatar_url: onboardAvatarUrl || null,
        },
      },
      needsEmailVerify ? { emailRedirectTo: emailRedirectUrl() } : undefined,
    );

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    // Best-effort sync of the directory row. Owners/treasurers can write any
    // member row; a plain member's own-row write is blocked by RLS, so we
    // ignore that failure rather than surfacing a confusing error.
    if (clubId && currentMemberId) {
      const { error: syncError } = await supabase
        .from("members")
        .update({
          name: trimmedName,
          email: trimmedEmail,
          location: onboardLocation.trim() || null,
          skills: onboardSkills.trim() || null,
          avatar_url: onboardAvatarUrl || null,
        })
        .eq("id", currentMemberId);
      if (!syncError) {
        await loadMembers(clubId);
      }
    }

    setLoading(false);
    setInfoText(
      needsEmailVerify
        ? `Profile updated. We sent a verification link to ${trimmedEmail}.`
        : "Profile updated.",
    );
  };

  // Re-sends the email-confirmation link for the address currently on file so
  // the member can prove ownership. Re-issuing the email change via updateUser
  // triggers Supabase to deliver a fresh confirmation link.
  const resendEmailVerification = async () => {
    setErrorText("");
    setInfoText("");
    const trimmedEmail = onboardEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setErrorText("Add an email address first.");
      return;
    }

    if (!isValidEmail(trimmedEmail)) {
      setErrorText("Enter a valid email address.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser(
      { email: trimmedEmail },
      { emailRedirectTo: emailRedirectUrl() },
    );
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }
    setInfoText(`Verification link sent to ${trimmedEmail}.`);
  };

  // Lets a user pick an image from their library and uploads it to the public
  // `avatars` storage bucket under a folder named after their auth uid. The
  // resulting public URL is stored on the auth account (user-global) and
  // best-effort synced onto the current club's member row so the directory can
  // render it. The image is decoded from base64 (Expo gives us this directly)
  // into bytes for the storage upload — no extra native module needed.
  const pickAndUploadAvatar = async () => {
    setErrorText("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorText("Photo access is needed to set a profile picture.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
      base64: true,
    });
    const asset = result.canceled ? null : result.assets[0];
    if (!asset?.base64) {
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      setErrorText("Session not found. Please login again.");
      return;
    }

    setUploadingAvatar(true);

    // Decode base64 -> bytes (atob is available in the RN/Hermes runtime).
    const binary = atob(asset.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const path = `${user.id}/avatar.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      setUploadingAvatar(false);
      setErrorText(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    // Cache-bust so a replaced photo shows immediately (same path, new bytes).
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    await supabase.auth.updateUser({ data: { avatar_url: versionedUrl } });
    if (clubId && currentMemberId) {
      const { error: syncError } = await supabase
        .from("members")
        .update({ avatar_url: versionedUrl })
        .eq("id", currentMemberId);
      if (!syncError) {
        await loadMembers(clubId);
      }
    }

    setOnboardAvatarUrl(versionedUrl);
    setUploadingAvatar(false);
    setInfoText("Profile photo updated.");
  };

  return {
    saveProfile,
    resendEmailVerification,
    pickAndUploadAvatar,
  };
}
