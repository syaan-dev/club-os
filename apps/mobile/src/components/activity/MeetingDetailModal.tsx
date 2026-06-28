import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { colors, styles } from "../../styles";
import type { ClubMeeting } from "../../types";
import { formatDateAndTime, meetingStatusColor } from "./format";

// Read-only detail sheet for a past meeting. The parent owns the open state so
// this stays a pure presentation sheet driven by the `meeting` prop.
export function MeetingDetailModal({
  meeting,
  onClose,
}: {
  meeting: ClubMeeting | null;
  onClose: () => void;
}) {
  return (
    <Modal
      visible={meeting !== null}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          {meeting ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 40 }}
            >
              <Text style={styles.noticeDetailSubject}>{meeting.title}</Text>
              <Text style={styles.noticeDetailMeta}>
                {formatDateAndTime(meeting.scheduledAt)}
                {meeting.location ? ` \u00b7 ${meeting.location}` : ""}
              </Text>
              <View
                style={[styles.statusPill, { backgroundColor: colors.surfaceAlt }]}
              >
                <Text
                  style={[
                    styles.statusPillText,
                    { color: meetingStatusColor(meeting.status) },
                  ]}
                >
                  {meeting.status}
                </Text>
              </View>
              <View style={styles.separator} />
              {meeting.description ? (
                <Text style={styles.noticeDetailBody}>
                  {meeting.description}
                </Text>
              ) : null}
              <Text style={styles.organiserMeta}>
                Organised by {meeting.createdByName}
              </Text>
            </ScrollView>
          ) : null}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
