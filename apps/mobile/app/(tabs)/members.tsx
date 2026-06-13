import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Share,
  Text,
  View,
} from "react-native";
import { styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import type { Member } from "../../src/types";
import { TabScreenShell } from "../../src/components/TabScreenShell";
import { InviteSheet } from "../../src/components/InviteSheet";

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
  const { members, invites, currentRole, loading } = useClubOs();

  const canInvite = currentRole === "Owner" || currentRole === "Treasurer";
  const [inviteOpen, setInviteOpen] = useState(false);

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
          renderItem={({ item }) => (
            <View style={styles.directoryRow}>
              <View style={styles.memberAvatar}>
                <Text style={styles.memberAvatarText}>
                  {initialsFor(item.name)}
                </Text>
              </View>
              <Text style={styles.directoryName} numberOfLines={1}>
                {item.name}
              </Text>
              <View style={styles.roleChip}>
                <Text style={styles.roleChipText}>{roleChipLabel(item)}</Text>
              </View>
            </View>
          )}
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
    </TabScreenShell>
  );
}
