import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import { AppButton } from "../AppButton";

// Create a poll (leadership only). Owns its own option list + form state and
// commits through the activities domain hook.
export function PollFormModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { createPoll } = useActivities();
  const { loading } = useUi();

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollCloses, setPollCloses] = useState("");

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setPollQuestion("");
    setPollOptions(["", ""]);
    setPollCloses("");
  }, [visible]);

  const updateOption = (index: number, value: string) => {
    setPollOptions((prev) =>
      prev.map((option, i) => (i === index ? value : option)),
    );
  };

  const addOption = () => {
    setPollOptions((prev) => (prev.length >= 10 ? prev : [...prev, ""]));
  };

  const removeOption = (index: number) => {
    setPollOptions((prev) =>
      prev.length <= 2 ? prev : prev.filter((_, i) => i !== index),
    );
  };

  const onSubmit = async () => {
    await createPoll({
      question: pollQuestion,
      options: pollOptions,
      closesAt: pollCloses,
    });
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
          <Text style={styles.sheetTitle}>New poll</Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Question</Text>
            <TextInput
              style={styles.input}
              placeholder="Where should we host the next event?"
              value={pollQuestion}
              onChangeText={setPollQuestion}
              accessibilityLabel="Poll question"
            />

            <Text style={styles.fieldLabel}>Options</Text>
            {pollOptions.map((option, index) => (
              <View
                key={index}
                style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
              >
                <TextInput
                  style={[styles.input, { flex: 1 }]}
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChangeText={(value) => updateOption(index, value)}
                  accessibilityLabel={`Poll option ${index + 1}`}
                />
                {pollOptions.length > 2 ? (
                  <Pressable
                    onPress={() => removeOption(index)}
                    accessibilityRole="button"
                    accessibilityLabel={`Remove option ${index + 1}`}
                  >
                    <Text style={[styles.unpaid, { fontSize: 20 }]}>
                      {"\u00d7"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            ))}
            {pollOptions.length < 10 ? (
              <Pressable
                style={styles.inlineButton}
                onPress={addOption}
                accessibilityRole="button"
                accessibilityLabel="Add poll option"
              >
                <Text style={styles.inlineButtonText}>+ Add option</Text>
              </Pressable>
            ) : null}

            <Text style={styles.fieldLabel}>Closes on (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-06-30"
              value={pollCloses}
              onChangeText={setPollCloses}
              accessibilityLabel="Poll close date"
            />

            <AppButton
              label={loading ? "Saving..." : "Create poll"}
              onPress={onSubmit}
              disabled={loading || pollQuestion.trim().length === 0}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
