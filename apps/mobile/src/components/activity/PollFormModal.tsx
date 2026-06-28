import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../../styles";
import { useActivities, useUi } from "../../context/domainHooks";
import type { Poll } from "../../types";
import { AppButton } from "../AppButton";
import { DateField } from "../DateField";

// Create / edit a poll (leadership only). Owns its own option list + form state
// and commits through the activities domain hook. Editing is only offered for
// open polls; once votes exist the options lock so existing ballots (stored by
// option index) can't be silently invalidated.
export function PollFormModal({
  visible,
  editingPoll,
  onClose,
}: {
  visible: boolean;
  editingPoll: Poll | null;
  onClose: () => void;
}) {
  const { createPoll, updatePoll } = useActivities();
  const { loading } = useUi();

  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);
  const [pollCloses, setPollCloses] = useState("");

  const optionsLocked =
    editingPoll !== null && editingPoll.totalVotes > 0;

  // Re-seed the form each time the sheet opens, from the poll being edited.
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editingPoll) {
      setPollQuestion(editingPoll.question);
      setPollOptions(
        editingPoll.options.length >= 2 ? editingPoll.options : ["", ""],
      );
      setPollCloses(editingPoll.closesAt ? editingPoll.closesAt.slice(0, 10) : "");
    } else {
      setPollQuestion("");
      setPollOptions(["", ""]);
      setPollCloses("");
    }
  }, [visible, editingPoll]);

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
    const payload = {
      question: pollQuestion,
      options: pollOptions,
      closesAt: pollCloses,
    };
    if (editingPoll) {
      await updatePoll(editingPoll.id, payload);
    } else {
      await createPoll(payload);
    }
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
          <Text style={styles.sheetTitle}>
            {editingPoll ? "Edit poll" : "New poll"}
          </Text>
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
            {optionsLocked ? (
              <Text style={styles.memberMeta}>
                Options are locked because members have already voted.
              </Text>
            ) : null}
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
                  editable={!optionsLocked}
                  accessibilityLabel={`Poll option ${index + 1}`}
                />
                {!optionsLocked && pollOptions.length > 2 ? (
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
            {!optionsLocked && pollOptions.length < 10 ? (
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
            <DateField
              value={pollCloses}
              onChange={setPollCloses}
              placeholder="No close date"
              accessibilityLabel="Poll close date"
              clearable
            />

            <AppButton
              label={
                loading
                  ? "Saving..."
                  : editingPoll
                    ? "Save changes"
                    : "Create poll"
              }
              onPress={onSubmit}
              disabled={loading || pollQuestion.trim().length === 0}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
