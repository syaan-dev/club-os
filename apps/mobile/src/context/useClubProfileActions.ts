// Club-profile mutations (load/edit the club's name, description and logo).
// Extracted from ClubOsContext so the provider stays lean.
//
// State + loaders remain owned by the provider; this hook receives them (plus
// the toast/loading helpers) as `deps` and returns the action callbacks.

import * as ImagePicker from "expo-image-picker";

import { supabase } from "../../lib/supabase";
import type { Member } from "../types";

type ClubProfileActionsDeps = {
  clubId: string;
  currentRole: Member["role"] | "";
  currentMemberId: string;
  setClubName: (value: string) => void;
  setClubDescription: (value: string) => void;
  setClubLogoUrl: (value: string) => void;
  setActiveClubName: (value: string) => void;
  setUploadingClubLogo: (value: boolean) => void;
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  loadHomeData: () => Promise<void>;
  persistActiveClub: (clubId: string, name: string) => Promise<void>;
};

export function useClubProfileActions(deps: ClubProfileActionsDeps) {
  const {
    clubId,
    currentRole,
    currentMemberId,
    setClubName,
    setClubDescription,
    setClubLogoUrl,
    setActiveClubName,
    setUploadingClubLogo,
    setErrorText,
    setInfoText,
    setLoading,
    loadHomeData,
    persistActiveClub,
  } = deps;

  const loadClubProfile = async () => {
    if (!clubId) {
      return;
    }
    const { data } = await supabase
      .from("clubs")
      .select("name,description,logo_url")
      .eq("id", clubId)
      .maybeSingle();
    if (data) {
      setClubName(data.name ?? "");
      setClubDescription(data.description ?? "");
      setClubLogoUrl(data.logo_url ?? "");
    }
  };

  // Lets a leadership member pick a club logo. Stored in the same public
  // `avatars` bucket under the uploader's own uid folder (so existing storage
  // policies apply): `<uid>/club-<clubId|draft>.jpg`. During club creation
  // there is no clubId yet, so the URL is held in `clubLogoUrl` and written
  // when the club is inserted; from Club settings it updates the row directly.
  const pickAndUploadClubLogo = async () => {
    setErrorText("");

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setErrorText("Photo access is needed to set a club logo.");
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

    setUploadingClubLogo(true);

    const binary = atob(asset.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }

    const path = `${user.id}/club-${clubId || "draft"}.jpg`;
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, bytes, { contentType: "image/jpeg", upsert: true });

    if (uploadError) {
      setUploadingClubLogo(false);
      setErrorText(uploadError.message);
      return;
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    const versionedUrl = `${publicUrl}?v=${Date.now()}`;

    // From Club settings (existing club), persist immediately. During creation
    // we only stage the URL; createClub writes it on insert.
    if (clubId && currentRole !== "Member" && currentRole !== "") {
      const { error: updateError } = await supabase
        .from("clubs")
        .update({ logo_url: versionedUrl })
        .eq("id", clubId);
      if (updateError) {
        setUploadingClubLogo(false);
        setErrorText(updateError.message);
        return;
      }
      await loadHomeData();
    }

    setClubLogoUrl(versionedUrl);
    setUploadingClubLogo(false);
    setInfoText("Club logo updated.");
  };

  const updateClubProfile = async (name: string, description: string) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("No active club to update.");
      return;
    }
    if (currentRole === "Member" || currentRole === "") {
      setErrorText("You don't have permission to edit the club profile.");
      return;
    }

    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName) {
      setErrorText("Club name is required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("clubs")
      .update({
        name: trimmedName,
        description: trimmedDescription || null,
      })
      .eq("id", clubId);

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    await supabase.from("audit_events").insert({
      club_id: clubId,
      actor_member_id: currentMemberId || null,
      event_type: "club_profile_updated",
      entity_type: "club",
      entity_id: clubId,
      event_data: { name: trimmedName },
    });

    setActiveClubName(trimmedName);
    setClubName(trimmedName);
    setClubDescription(trimmedDescription);
    void persistActiveClub(clubId, trimmedName);
    await loadHomeData();
    setLoading(false);
    setInfoText("Club profile updated.");
  };

  return {
    loadClubProfile,
    pickAndUploadClubLogo,
    updateClubProfile,
  };
}
