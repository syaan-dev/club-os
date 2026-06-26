import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import { useActivities } from "../../context/domainHooks";
import type { ClubMeeting } from "../../types";
import { formatDateAndTime, meetingStatusColor } from "./format";

// "Meetings" tab: upcoming and past meeting lists with leadership-only
// status/edit actions. Create/edit form lives in the parent.
export function MeetingsTab({
  onNewMeeting,
  onEditMeeting,
}: {
  onNewMeeting: () => void;
  onEditMeeting: (meeting: ClubMeeting) => void;
}) {
  const {
    meetings,
    activityLoading,
    canManageActivities,
    updateMeetingStatus,
  } = useActivities();

  const upcomingMeetings = meetings.filter(
    (meeting) => meeting.status === "scheduled",
  );
  const pastMeetings = meetings.filter(
    (meeting) => meeting.status !== "scheduled",
  );

  const renderMeetingItem = ({ item }: { item: ClubMeeting }) => (
    <View style={{ paddingVertical: 10 }}>
      <Text style={styles.memberName}>{item.title}</Text>
      <Text style={styles.memberMeta}>
        {formatDateAndTime(item.scheduledAt)}
        {item.location ? ` \u00b7 ${item.location}` : ""}
      </Text>
      {item.description ? (
        <Text style={styles.metaText}>{item.description}</Text>
      ) : null}
      <View style={[styles.statusPill, { backgroundColor: colors.surfaceAlt }]}>
        <Text
          style={[
            styles.statusPillText,
            { color: meetingStatusColor(item.status) },
          ]}
        >
          {item.status}
        </Text>
      </View>
      <Text style={styles.metaText}>Organised by {item.createdByName}</Text>
      {canManageActivities && item.status === "scheduled" ? (
        <View style={styles.rowActions}>
          <Pressable
            style={styles.inlineButton}
            onPress={() => onEditMeeting(item)}
            accessibilityRole="button"
            accessibilityLabel={`Edit ${item.title}`}
          >
            <Text style={styles.inlineButtonText}>Edit</Text>
          </Pressable>
          <Pressable
            style={styles.inlineButton}
            onPress={() => updateMeetingStatus(item.id, "completed")}
            accessibilityRole="button"
            accessibilityLabel={`Mark ${item.title} completed`}
          >
            <Text style={styles.inlineButtonText}>Mark completed</Text>
          </Pressable>
          <Pressable
            style={styles.inlineButton}
            onPress={() => updateMeetingStatus(item.id, "cancelled")}
            accessibilityRole="button"
            accessibilityLabel={`Cancel ${item.title}`}
          >
            <Text style={styles.inlineButtonText}>Cancel</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={styles.card}>
      <View style={styles.sectionHeaderRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Meetings</Text>
          <Text style={styles.memberMeta}>
            Schedule club meetings and track whether they happened.
          </Text>
        </View>
        {canManageActivities ? (
          <Pressable
            style={styles.inviteLink}
            onPress={onNewMeeting}
            accessibilityRole="button"
            accessibilityLabel="New meeting"
          >
            <Text style={styles.inviteLinkText}>＋ New</Text>
          </Pressable>
        ) : null}
      </View>

      <Text style={styles.subTitle}>Upcoming</Text>
      {activityLoading && meetings.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : upcomingMeetings.length === 0 ? (
        <Text style={styles.memberMeta}>No upcoming meetings.</Text>
      ) : (
        <FlatList
          data={upcomingMeetings}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={renderMeetingItem}
        />
      )}

      <Text style={[styles.subTitle, { marginTop: 16 }]}>Past</Text>
      {activityLoading && meetings.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : pastMeetings.length === 0 ? (
        <Text style={styles.memberMeta}>No past meetings yet.</Text>
      ) : (
        <FlatList
          data={pastMeetings}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          renderItem={renderMeetingItem}
        />
      )}
    </View>
  );
}
