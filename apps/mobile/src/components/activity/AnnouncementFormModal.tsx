import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import { AppButton } from "../AppButton";

// Post a notice / announcement (leadership only). Owns its own form state and
// commits through the activities domain hook.
export function AnnouncementFormModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { createAnnouncement } = useActivities();
  const { loading } = useUi();

  const [announceTitle, setAnnounceTitle] = useState("");
  const [announceBody, setAnnounceBody] = useState("");

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setAnnounceTitle("");
    setAnnounceBody("");
  }, [visible]);

  const onSubmit = async () => {
    await createAnnouncement({ title: announceTitle, body: announceBody });
    onClose();
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
          <Text style={styles.sheetTitle}>New notice</Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Title</Text>
            <TextInput
              style={styles.input}
              placeholder="Venue changed for Saturday"
              value={announceTitle}
              onChangeText={setAnnounceTitle}
              accessibilityLabel="Announcement title"
            />

            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[styles.input, { minHeight: 80 }]}
              placeholder="Share the details..."
              value={announceBody}
              onChangeText={setAnnounceBody}
              multiline
              accessibilityLabel="Announcement message"
            />

            <AppButton
              label={loading ? "Posting..." : "Post notice"}
              onPress={onSubmit}
              disabled={loading || announceTitle.trim().length === 0}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
