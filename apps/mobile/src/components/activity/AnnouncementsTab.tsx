import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import { useActivities } from "../../context/domainHooks";
import type { Announcement } from "../../types";
import { formatDateTime } from "./format";

// "Notices" tab: an email-style inbox of announcements. Opening a notice is
// delegated to the parent (which shows the reader and marks it read).
export function AnnouncementsTab({
  onNewNotice,
  onOpenNotice,
}: {
  onNewNotice: () => void;
  onOpenNotice: (notice: Announcement) => void;
}) {
  const { announcements, activityLoading, canManageActivities } =
    useActivities();

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Inbox</Text>
        </View>
        {canManageActivities ? (
          <Pressable
            style={styles.inviteLink}
            onPress={onNewNotice}
            accessibilityRole="button"
            accessibilityLabel="New notice"
          >
            <Text style={styles.inviteLinkText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      {activityLoading && announcements.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : announcements.length === 0 ? (
        <Text style={styles.memberMeta}>No notices posted yet.</Text>
      ) : (
        <FlatList
          data={announcements}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={({ item }) => (
            <Pressable
              style={styles.noticeRow}
              onPress={() => onOpenNotice(item)}
              accessibilityRole="button"
              accessibilityLabel={`Open notice ${item.title}`}
            >
              <View style={styles.noticeUnreadCol}>
                {!item.isRead ? <View style={styles.unreadDot} /> : null}
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.noticeTopRow}>
                  <Text
                    style={[
                      styles.noticeSubject,
                      !item.isRead && styles.noticeSubjectUnread,
                    ]}
                    numberOfLines={1}
                  >
                    {item.title}
                  </Text>
                  <Text style={styles.noticeDate}>
                    {formatDateTime(item.createdAt)}
                  </Text>
                </View>
                <Text style={styles.noticeSender} numberOfLines={1}>
                  {item.createdByName}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}
    </View>
  );
}
