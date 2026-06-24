import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import type { Member } from "../../src/types";
import { AppButton } from "../../src/components/AppButton";
import { TabScreenShell } from "../../src/components/TabScreenShell";
import { InviteSheet } from "../../src/components/InviteSheet";

const ASSIGNABLE_ROLES: Member["role"][] = [
  "Owner",
  "Treasurer",
  "Secretary",
  "Member",
];

// Builds two-letter initials from a member name for the avatar circle.
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

const roleChipLabel = (member: Member) =>
  member.status === "invited" ? `${member.role} · pending` : member.role;

export default function MembersScreen() {
  const {
    members,
    invites,
    currentRole,
    currentMemberId,
    updateMemberRole,
    loading,
  } = useClubOs();

  const canInvite = currentRole === "Owner" || currentRole === "Treasurer";
  // Owner, Treasurer and Secretary can reassign member roles.
  const canManageRoles =
    currentRole === "Owner" ||
    currentRole === "Treasurer" ||
    currentRole === "Secretary";
  const [inviteOpen, setInviteOpen] = useState(false);
  const [roleMember, setRoleMember] = useState<Member | null>(null);

  // The role sheet only applies to active members (invited members must
  // accept before a role means anything). Tapping your own row is a no-op
  // because you cannot change your own role.
  const openRoleSheet = (member: Member) => {
    if (!canManageRoles || member.status !== "active") {
      return;
    }
    if (member.id === currentMemberId) {
      return;
    }
    setRoleMember(member);
  };

  const onAssignRole = async (role: Member["role"]) => {
    if (!roleMember) {
      return;
    }
    await updateMemberRole(roleMember.id, role);
    setRoleMember(null);
  };

  const inviteLink =
    invites.find((invite) => invite.inviteLink)?.inviteLink ??
    "clubos://join?token=…";

  const onShare = async () => {
    try {
      await Share.share({ message: inviteLink });
    } catch {
      // User dismissed the share sheet; nothing to do.
    }
  };

  const isEmpty = !loading && members.length === 0;

  return (
    <TabScreenShell showLoading>
      <View style={styles.directoryHeader}>
        <Text style={styles.directoryTitle}>Member directory</Text>
        {canInvite && !isEmpty ? (
          <Pressable
            style={styles.inviteLink}
            onPress={() => setInviteOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Invite a member"
          >
            <Text style={styles.inviteLinkText}>＋ Invite</Text>
          </Pressable>
        ) : null}
      </View>

      {isEmpty && canInvite ? (
        <View style={styles.inviteSurface}>
          <Text style={styles.inviteEmptyHeading}>Add your members</Text>
          <Text style={styles.inviteEmptyBody}>
            Invite people straight from your contacts, or share a join link.
          </Text>
          <Pressable
            style={styles.inviteSheetPrimaryBtn}
            onPress={() => setInviteOpen(true)}
            accessibilityRole="button"
            accessibilityLabel="Select from contacts"
          >
            <Text style={styles.inviteSheetPrimaryBtnText}>
              ＋ Select from contacts
            </Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={members}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={styles.inviteLinkText.color} />
            ) : (
              <Text style={styles.memberMeta}>No members yet.</Text>
            )
          }
          renderItem={({ item }) => {
            const manageable =
              canManageRoles &&
              item.status === "active" &&
              item.id !== currentMemberId;
            return (
              <Pressable
                style={styles.directoryRow}
                onPress={() => openRoleSheet(item)}
                disabled={!manageable}
                accessibilityRole={manageable ? "button" : undefined}
                accessibilityLabel={
                  manageable ? `Manage role for ${item.name}` : undefined
                }
              >
                <View style={styles.memberAvatar}>
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={styles.memberAvatarImage}
                    />
                  ) : (
                    <Text style={styles.memberAvatarText}>
                      {initialsFor(item.name)}
                    </Text>
                  )}
                </View>
                <View style={styles.directoryNameCol}>
                  <Text style={styles.directoryName} numberOfLines={1}>
                    {item.name}
                  </Text>
                  {item.skills || item.location ? (
                    <Text style={styles.directoryMeta} numberOfLines={1}>
                      {item.skills || item.location}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.roleChip}>
                  <Text style={styles.roleChipText}>{roleChipLabel(item)}</Text>
                </View>
                {manageable ? (
                  <Text style={styles.headerChevron}>›</Text>
                ) : null}
              </Pressable>
            );
          }}
        />
      )}

      {canInvite && !isEmpty ? (
        <Pressable
          style={styles.shareCard}
          onPress={onShare}
          accessibilityRole="button"
          accessibilityLabel="Share invite link"
        >
          <View style={styles.shareQr}>
            <Text style={styles.shareQrGlyph}>▦</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.shareTitle}>Share invite link</Text>
            <Text style={styles.shareLink} numberOfLines={1}>
              {inviteLink}
            </Text>
          </View>
          <Text style={styles.shareCopy}>⧉</Text>
        </Pressable>
      ) : null}

      <InviteSheet visible={inviteOpen} onClose={() => setInviteOpen(false)} />

      {/* Per-member role sheet (leadership only) */}
      <Modal
        visible={roleMember !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setRoleMember(null)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setRoleMember(null)}
        >
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {roleMember ? roleMember.name : "Member role"}
            </Text>
            <Text style={styles.inviteSheetSubtitle}>
              Tap a role to reassign. Owner has full access.
            </Text>
            <View style={styles.rolePillRow}>
              {ASSIGNABLE_ROLES.map((role) => {
                const active = roleMember?.role === role;
                return (
                  <Pressable
                    key={role}
                    style={[styles.rolePill, active && styles.rolePillActive]}
                    disabled={loading || active}
                    onPress={() => onAssignRole(role)}
                    accessibilityRole="button"
                    accessibilityLabel={`Set ${
                      roleMember ? roleMember.name : "member"
                    } as ${role}`}
                  >
                    <Text
                      style={[
                        styles.rolePillText,
                        active && styles.rolePillTextActive,
                      ]}
                    >
                      {role}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <AppButton label="Done" onPress={() => setRoleMember(null)} />
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenShell>
  );
}
