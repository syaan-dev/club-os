// Member-domain mutations (role changes, manual invites, contact-based
// invites). Extracted from ClubOsContext so the provider stays lean. Each
// action validates, writes to Supabase, then reloads the affected slice via the
// provided loaders.
//
// State + loaders remain owned by the provider; this hook receives them (plus
// the toast/loading helpers) as `deps` and returns the action callbacks.

import * as Contacts from "expo-contacts";

import { supabase } from "../../lib/supabase";
import { buildInviteLink, normalizePhone } from "../lib/format";
import type { ContactOption, Member } from "../types";

type MemberActionsDeps = {
  clubId: string;
  currentRole: Member["role"] | "";
  currentMemberId: string;
  activeClubName: string;
  invitePhone: string;
  inviteName: string;
  inviteEmail: string;
  setInviteName: (value: string) => void;
  setInvitePhone: (value: string) => void;
  setInviteEmail: (value: string) => void;
  setContactOptions: (value: ContactOption[]) => void;
  setContactsVisible: (value: boolean) => void;
  setContactsLoading: (value: boolean) => void;
  setContactsPermission: (value: "unknown" | "granted" | "denied") => void;
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  loadInvites: (clubId: string) => Promise<void>;
  loadMembers: (clubId: string) => Promise<void>;
};

export function useMemberActions(deps: MemberActionsDeps) {
  const {
    clubId,
    currentRole,
    currentMemberId,
    activeClubName,
    invitePhone,
    inviteName,
    inviteEmail,
    setInviteName,
    setInvitePhone,
    setInviteEmail,
    setContactOptions,
    setContactsVisible,
    setContactsLoading,
    setContactsPermission,
    setErrorText,
    setInfoText,
    setLoading,
    loadInvites,
    loadMembers,
  } = deps;

  const updateMemberRole = async (
    memberId: string,
    newRole: Member["role"],
  ) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("No active club.");
      return;
    }
    if (currentRole === "Member" || currentRole === "") {
      setErrorText("You don't have permission to change member roles.");
      return;
    }
    if (memberId === currentMemberId) {
      setErrorText("You can't change your own role.");
      return;
    }

    const dbRole = newRole.toLowerCase();

    setLoading(true);
    const { error } = await supabase
      .from("members")
      .update({ role: dbRole })
      .eq("id", memberId)
      .eq("club_id", clubId);

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    await supabase.from("audit_events").insert({
      club_id: clubId,
      actor_member_id: currentMemberId || null,
      event_type: "member_role_changed",
      entity_type: "member",
      entity_id: memberId,
      event_data: { new_role: dbRole },
    });

    await loadMembers(clubId);
    setLoading(false);
    setInfoText("Member role updated.");
  };

  const inviteMember = async () => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Create a club first.");
      return;
    }

    if (!currentMemberId) {
      setErrorText("Unable to resolve your membership role. Please re-login.");
      return;
    }

    const normalizedPhone = invitePhone ? normalizePhone(invitePhone) : "";
    const trimmedName = inviteName.trim();
    const trimmedEmail = inviteEmail.trim().toLowerCase();

    if (!normalizedPhone) {
      setErrorText(
        "Phone number is required for member invitation in Phase 1.",
      );
      return;
    }

    if (normalizedPhone.length < 10) {
      setErrorText("Enter a valid phone number with country code.");
      return;
    }

    const { data: existingMember } = await supabase
      .from("members")
      .select("id,membership_status")
      .eq("club_id", clubId)
      .eq("phone", normalizedPhone)
      .in("membership_status", ["invited", "active", "suspended"])
      .order("created_at", { ascending: false })
      .limit(1);

    if (existingMember && existingMember.length > 0) {
      setErrorText("This phone number is already in your club member records.");
      return;
    }

    setLoading(true);
    const token = `invite_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: invitedMemberRow, error: invitedMemberCreateError } =
      await supabase
        .from("members")
        .insert({
          club_id: clubId,
          user_id: null,
          name: trimmedName || "Invited member",
          email: trimmedEmail || null,
          phone: normalizedPhone,
          role: "member",
          membership_status: "invited",
          is_active: true,
        })
        .select("id")
        .single();

    if (invitedMemberCreateError || !invitedMemberRow) {
      setLoading(false);
      setErrorText(
        invitedMemberCreateError?.message ??
          "Failed to create member invite record.",
      );
      return;
    }

    const { error } = await supabase.from("club_invites").insert({
      club_id: clubId,
      invited_phone: normalizedPhone || null,
      invited_email: trimmedEmail || null,
      token,
      invited_by: currentMemberId,
      expires_at: expiresAt,
    });

    if (error) {
      await supabase.from("members").delete().eq("id", invitedMemberRow.id);
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    setInviteName("");
    setInvitePhone("");
    setInviteEmail("");
    await Promise.all([loadInvites(clubId), loadMembers(clubId)]);
    setLoading(false);
    const inviteLink = buildInviteLink(token, activeClubName || "Your club");
    setInfoText(
      `Invite created for ${activeClubName || "your club"}. Link: ${inviteLink}`,
    );
  };

  const loadContacts = async () => {
    setErrorText("");
    setContactsLoading(true);

    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== "granted") {
      setContactsLoading(false);
      setErrorText("Contacts permission denied. Please enter phone manually.");
      return;
    }

    const contactsResult = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 80,
    });

    const mappedContacts: ContactOption[] = (contactsResult.data || [])
      .map((contact, index) => {
        const phoneValue = contact.phoneNumbers?.[0]?.number ?? "";
        return {
          id: contact.id ?? `contact_${index}`,
          name: contact.name || "Unnamed contact",
          phone: normalizePhone(phoneValue),
        };
      })
      .filter((contact) => contact.phone.length >= 10);

    setContactOptions(mappedContacts);
    setContactsVisible(true);
    setContactsLoading(false);
    if (mappedContacts.length === 0) {
      setInfoText("No contacts with valid phone numbers found on this device.");
    }
  };

  const selectContact = (selectedContact: ContactOption) => {
    setInviteName(selectedContact.name);
    setInvitePhone(selectedContact.phone);
    setContactsVisible(false);
    setInfoText(`Selected ${selectedContact.name}. You can now send invite.`);
  };

  const requestContactsForInvite = async (): Promise<"granted" | "denied"> => {
    setErrorText("");
    setContactsLoading(true);

    const permission = await Contacts.requestPermissionsAsync();
    if (permission.status !== "granted") {
      setContactsPermission("denied");
      setContactsLoading(false);
      return "denied";
    }

    const contactsResult = await Contacts.getContactsAsync({
      fields: [Contacts.Fields.PhoneNumbers],
      pageSize: 200,
    });

    const seen = new Set<string>();
    const mappedContacts: ContactOption[] = (contactsResult.data || [])
      .map((contact, index) => {
        const phoneValue = contact.phoneNumbers?.[0]?.number ?? "";
        return {
          id: contact.id ?? `contact_${index}`,
          name: contact.name || "Unnamed contact",
          phone: normalizePhone(phoneValue),
        };
      })
      .filter((contact) => {
        if (contact.phone.length < 10 || seen.has(contact.phone)) {
          return false;
        }
        seen.add(contact.phone);
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));

    setContactOptions(mappedContacts);
    setContactsPermission("granted");
    setContactsLoading(false);
    return "granted";
  };

  const inviteContacts = async (
    selectedContacts: ContactOption[],
  ): Promise<number> => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Create a club first.");
      return 0;
    }
    if (!currentMemberId) {
      setErrorText("Unable to resolve your membership role. Please re-login.");
      return 0;
    }
    if (selectedContacts.length === 0) {
      return 0;
    }

    setLoading(true);

    const expiresAt = new Date(
      Date.now() + 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    let invitedCount = 0;
    const seenPhones = new Set<string>();

    for (const contact of selectedContacts) {
      const normalizedPhone = normalizePhone(contact.phone);
      if (normalizedPhone.length < 10 || seenPhones.has(normalizedPhone)) {
        continue;
      }
      seenPhones.add(normalizedPhone);

      const { data: existingMember } = await supabase
        .from("members")
        .select("id")
        .eq("club_id", clubId)
        .eq("phone", normalizedPhone)
        .in("membership_status", ["invited", "active", "suspended"])
        .limit(1);

      if (existingMember && existingMember.length > 0) {
        continue;
      }

      const token = `invite_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

      const { data: invitedMemberRow, error: invitedMemberCreateError } =
        await supabase
          .from("members")
          .insert({
            club_id: clubId,
            user_id: null,
            name: contact.name.trim() || "Invited member",
            email: null,
            phone: normalizedPhone,
            role: "member",
            membership_status: "invited",
            is_active: true,
          })
          .select("id")
          .single();

      if (invitedMemberCreateError || !invitedMemberRow) {
        continue;
      }

      const { error: inviteError } = await supabase
        .from("club_invites")
        .insert({
          club_id: clubId,
          invited_phone: normalizedPhone,
          invited_email: null,
          token,
          invited_by: currentMemberId,
          expires_at: expiresAt,
        });

      if (inviteError) {
        await supabase.from("members").delete().eq("id", invitedMemberRow.id);
        continue;
      }

      invitedCount += 1;
    }

    await Promise.all([loadInvites(clubId), loadMembers(clubId)]);
    setLoading(false);

    if (invitedCount > 0) {
      setInfoText(
        invitedCount === 1
          ? "Invite sent. They'll appear as invited until they join."
          : `${invitedCount} invites sent. They'll appear as invited until they join.`,
      );
    } else {
      setInfoText(
        "No new invites sent — those contacts are already in the club.",
      );
    }

    return invitedCount;
  };

  return {
    updateMemberRole,
    inviteMember,
    loadContacts,
    selectContact,
    requestContactsForInvite,
    inviteContacts,
  };
}
