import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  Share,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../styles";
import { useClubOs } from "../ClubOsContext";
import type { ContactOption } from "../types";

type SheetMode = "picker" | "denied" | "share";

// Two-letter initials for the contact avatar glyph.
const initialsFor = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) {
    return "?";
  }
  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Masks the middle of a phone number for the contact list (privacy friendly).
const maskPhone = (phone: string) => {
  if (phone.length <= 6) {
    return phone;
  }
  const head = phone.slice(0, phone.length - 8);
  const tail = phone.slice(-3);
  return `${head} ●●●●● ●●${tail}`;
};

export function InviteSheet({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const {
    members,
    invites,
    contactOptions,
    contactsLoading,
    contactsPermission,
    requestContactsForInvite,
    inviteContacts,
    loading,
  } = useClubOs();

  const [mode, setMode] = useState<SheetMode>("picker");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Record<string, ContactOption>>({});

  // On open, request contact access on demand (never at club creation).
  useEffect(() => {
    if (!visible) {
      return;
    }
    setQuery("");
    setSelected({});
    let cancelled = false;
    (async () => {
      const result = await requestContactsForInvite();
      if (cancelled) {
        return;
      }
      setMode(result === "granted" ? "picker" : "denied");
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Phone -> dedupe status, derived from current members and pending invites.
  const statusByPhone = useMemo(() => {
    const map = new Map<string, "member" | "invited">();
    members.forEach((member) => {
      if (!member.phone) {
        return;
      }
      map.set(member.phone, member.status === "invited" ? "invited" : "member");
    });
    invites.forEach((invite) => {
      if (invite.invitedPhone && !map.has(invite.invitedPhone)) {
        map.set(invite.invitedPhone, "invited");
      }
    });
    return map;
  }, [members, invites]);

  const filteredContacts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return contactOptions;
    }
    return contactOptions.filter(
      (contact) =>
        contact.name.toLowerCase().includes(q) || contact.phone.includes(q),
    );
  }, [contactOptions, query]);

  const inviteLink =
    invites.find((invite) => invite.inviteLink)?.inviteLink ??
    "clubos://join?token=…";

  const selectedList = Object.values(selected);
  const selectedCount = selectedList.length;

  const toggle = (contact: ContactOption) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[contact.id]) {
        delete next[contact.id];
      } else {
        next[contact.id] = contact;
      }
      return next;
    });
  };

  const onSend = async () => {
    if (selectedCount === 0) {
      return;
    }
    const count = await inviteContacts(selectedList);
    if (count >= 0) {
      onClose();
    }
  };

  const onShareLink = async () => {
    try {
      await Share.share({ message: inviteLink });
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  };

  const renderHeader = () => (
    <>
      <View style={styles.sheetHandle} />
      <Text style={styles.sheetTitle}>
        {mode === "share" ? "Share invite link" : "Invite members"}
      </Text>
      <Text style={styles.inviteSheetSubtitle}>
        {mode === "share"
          ? "Anyone with the link can request to join"
          : mode === "denied"
            ? "Contact access is off"
            : "Select from contacts"}
      </Text>
    </>
  );

  const renderPicker = () => (
    <>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="🔍  Search name or number"
        placeholderTextColor={styles.contactPickPhone.color}
        style={styles.inviteSearch}
        autoCapitalize="none"
      />
      <ScrollView
        style={{ maxHeight: 320 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {contactsLoading ? (
          <ActivityIndicator
            color={styles.inviteSendBtnText.color}
            style={{ marginVertical: 20 }}
          />
        ) : filteredContacts.length === 0 ? (
          <Text style={styles.inviteEmptyBody}>
            No contacts match your search.
          </Text>
        ) : (
          filteredContacts.map((contact) => {
            const status = statusByPhone.get(contact.phone);
            const isSelected = Boolean(selected[contact.id]);
            const disabled = Boolean(status);
            return (
              <Pressable
                key={contact.id}
                style={styles.contactPickRow}
                onPress={() => !disabled && toggle(contact)}
                disabled={disabled}
                accessibilityRole="button"
                accessibilityLabel={`Invite ${contact.name}`}
              >
                {disabled ? (
                  <View style={styles.contactStatusPill}>
                    <Text style={styles.contactStatusPillText}>
                      {status === "member" ? "Already in club" : "Invited"}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.contactCheckbox,
                      isSelected && styles.contactCheckboxOn,
                    ]}
                  >
                    {isSelected ? (
                      <Text style={styles.contactCheckboxTick}>✓</Text>
                    ) : null}
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.contactPickName} numberOfLines={1}>
                    {contact.name}
                  </Text>
                  <Text style={styles.contactPickPhone}>
                    {maskPhone(contact.phone)}
                  </Text>
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>

      <View style={styles.inviteSheetFooter}>
        <Text style={styles.inviteSheetCount}>
          {selectedCount > 0 ? `${selectedCount} selected` : "Tap to select"}
        </Text>
        <Pressable
          style={[
            styles.inviteSendBtn,
            (selectedCount === 0 || loading) && styles.inviteSendBtnDisabled,
          ]}
          onPress={onSend}
          disabled={selectedCount === 0 || loading}
          accessibilityRole="button"
          accessibilityLabel="Send invites"
        >
          <Text
            style={[
              styles.inviteSendBtnText,
              (selectedCount === 0 || loading) &&
                styles.inviteSendBtnTextDisabled,
            ]}
          >
            {loading ? "Sending…" : "Send invites"}
          </Text>
        </Pressable>
      </View>

      <Pressable
        style={styles.inviteSheetAltLink}
        onPress={() => setMode("share")}
        accessibilityRole="button"
      >
        <Text style={styles.inviteSheetAltLinkText}>
          🔗 Or share an invite link instead
        </Text>
      </Pressable>
    </>
  );

  const renderDenied = () => (
    <View style={styles.inviteEmptyState}>
      <Text style={styles.inviteEmptyIcon}>👤</Text>
      <Text style={styles.inviteEmptyHeading}>Contact access is off</Text>
      <Text style={styles.inviteEmptyBody}>
        No problem — you can still invite members with a shareable link or QR
        code.
      </Text>
      <Pressable
        style={styles.inviteSheetPrimaryBtn}
        onPress={() => setMode("share")}
        accessibilityRole="button"
      >
        <Text style={styles.inviteSheetPrimaryBtnText}>
          🔗 Share invite link instead
        </Text>
      </Pressable>
      <Pressable
        style={styles.inviteSheetGhostBtn}
        onPress={() => Linking.openSettings()}
        accessibilityRole="button"
      >
        <Text style={styles.inviteSheetGhostBtnText}>
          Enable contact access in Settings
        </Text>
      </Pressable>
    </View>
  );

  const renderShare = () => (
    <View style={{ gap: 14 }}>
      <View style={styles.shareQrLarge}>
        <Text style={styles.shareQrLargeGlyph}>▦</Text>
      </View>
      <Text style={styles.shareLinkCentered} numberOfLines={1}>
        {inviteLink}
      </Text>
      <Pressable
        style={styles.inviteSheetPrimaryBtn}
        onPress={onShareLink}
        accessibilityRole="button"
      >
        <Text style={styles.inviteSheetPrimaryBtnText}>🔗 Share link</Text>
      </Pressable>
      {contactsPermission === "granted" ? (
        <Pressable
          style={styles.inviteSheetAltLink}
          onPress={() => setMode("picker")}
          accessibilityRole="button"
        >
          <Text style={styles.inviteSheetAltLinkText}>Back to contacts</Text>
        </Pressable>
      ) : null}
    </View>
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {renderHeader()}
          {mode === "picker"
            ? renderPicker()
            : mode === "denied"
              ? renderDenied()
              : renderShare()}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
