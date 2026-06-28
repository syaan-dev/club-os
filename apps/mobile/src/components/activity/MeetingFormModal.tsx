import { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import type { ClubMeeting } from "../../types";
import { AppButton } from "../AppButton";
import { DateField } from "../DateField";

// Create / edit a meeting (leadership only). Owns its own form state and
// commits through the activities domain hook.
export function MeetingFormModal({
  visible,
  editingMeeting,
  onClose,
}: {
  visible: boolean;
  editingMeeting: ClubMeeting | null;
  onClose: () => void;
}) {
  const { createMeeting, updateMeeting, updateMeetingStatus } = useActivities();
  const { loading } = useUi();

  const [meetingTitle, setMeetingTitle] = useState("");
  const [meetingDescription, setMeetingDescription] = useState("");
  const [meetingLocation, setMeetingLocation] = useState("");
  const [meetingDate, setMeetingDate] = useState("");

  // Re-seed the form whenever the sheet opens, from the meeting being edited.
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editingMeeting) {
      setMeetingTitle(editingMeeting.title);
      setMeetingDescription(editingMeeting.description ?? "");
      setMeetingLocation(editingMeeting.location ?? "");
      setMeetingDate(editingMeeting.scheduledAt ?? "");
    } else {
      setMeetingTitle("");
      setMeetingDescription("");
      setMeetingLocation("");
      setMeetingDate("");
    }
  }, [visible, editingMeeting]);

  const onSubmit = async () => {
    const payload = {
      title: meetingTitle,
      description: meetingDescription,
      location: meetingLocation,
      scheduledAt: meetingDate,
    };
    if (editingMeeting) {
      await updateMeeting(editingMeeting.id, payload);
    } else {
      await createMeeting(payload);
    }
    onClose();
  };

  const confirmComplete = () => {
    if (!editingMeeting) {
      return;
    }
    Alert.alert(
      "Mark completed",
      `Mark "${editingMeeting.title}" as completed?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark completed",
          onPress: async () => {
            await updateMeetingStatus(editingMeeting.id, "completed");
            onClose();
          },
        },
      ],
    );
  };

  const confirmCancelMeeting = () => {
    if (!editingMeeting) {
      return;
    }
    Alert.alert(
      "Cancel meeting",
      `Cancel "${editingMeeting.title}"? This can't be undone.`,
      [
        { text: "Keep meeting", style: "cancel" },
        {
          text: "Cancel meeting",
          style: "destructive",
          onPress: async () => {
            await updateMeetingStatus(editingMeeting.id, "cancelled");
            onClose();
          },
        },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>
            {editingMeeting ? "Edit meeting" : "New meeting"}
          </Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Monthly general meeting"
              value={meetingTitle}
              onChangeText={setMeetingTitle}
              accessibilityLabel="Meeting title"
            />

            <Text style={styles.fieldLabel}>Date &amp; time</Text>
            <DateField
              mode="datetime"
              value={meetingDate}
              onChange={setMeetingDate}
              placeholder="Pick a date and time"
              accessibilityLabel="Meeting date"
            />

            <Text style={styles.fieldLabel}>Location (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Clubhouse / Google Meet"
              value={meetingLocation}
              onChangeText={setMeetingLocation}
              accessibilityLabel="Meeting location"
            />

            <Text style={styles.fieldLabel}>Agenda (optional)</Text>
            <TextInput
              style={[styles.input, { minHeight: 64 }]}
              placeholder="What will be discussed?"
              value={meetingDescription}
              onChangeText={setMeetingDescription}
              multiline
              accessibilityLabel="Meeting agenda"
            />

            <AppButton
              label={
                loading
                  ? "Saving..."
                  : editingMeeting
                    ? "Save changes"
                    : "Schedule meeting"
              }
              onPress={onSubmit}
              disabled={loading || meetingTitle.trim().length === 0}
            />

            {editingMeeting && editingMeeting.status === "scheduled" ? (
              <>
                <View style={styles.separator} />
                <Text style={styles.fieldLabel}>Actions</Text>
                <Pressable
                  onPress={confirmComplete}
                  disabled={loading}
                  style={[styles.inlineButton, loading && styles.buttonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Mark meeting completed"
                >
                  <Text style={styles.inlineButtonText}>Mark completed</Text>
                </Pressable>
                <Pressable
                  onPress={confirmCancelMeeting}
                  disabled={loading}
                  style={[styles.dangerButton, loading && styles.buttonDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel="Cancel meeting"
                >
                  <Text style={styles.dangerButtonText}>Cancel meeting</Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
