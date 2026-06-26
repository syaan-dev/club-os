import { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { styles } from "../../styles";
import { useDues } from "../../context/domainHooks";
import { useUi } from "../../context/domainHooks";
import type { DuesCycle } from "../../types";
import { AppButton } from "../AppButton";
import { DateField } from "../DateField";

// Create / edit a billing cycle (leadership only). Owns its own form state and
// commits through the dues domain hook; the parent only toggles visibility.
export function CycleFormModal({
  visible,
  editingCycle,
  onClose,
}: {
  visible: boolean;
  editingCycle: DuesCycle | null;
  onClose: () => void;
}) {
  const { duesPlans, createDuesCycle, updateDuesCycle } = useDues();
  const { loading } = useUi();

  const [cyclePlanId, setCyclePlanId] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");

  // Re-seed the form whenever the sheet opens, from the cycle being edited.
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editingCycle) {
      setCyclePlanId(editingCycle.duesPlanId);
      setCycleLabel(editingCycle.cycleLabel);
      setCycleDueDate(editingCycle.dueDate);
    } else {
      setCyclePlanId(duesPlans[0]?.id ?? "");
      setCycleLabel("");
      setCycleDueDate("");
    }
  }, [visible, editingCycle, duesPlans]);

  const onSubmit = async () => {
    const payload = {
      duesPlanId: cyclePlanId,
      cycleLabel,
      dueDate: cycleDueDate,
    };
    if (editingCycle) {
      await updateDuesCycle(editingCycle.id, payload);
    } else {
      await createDuesCycle(payload);
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
            {editingCycle ? "Edit billing cycle" : "New billing cycle"}
          </Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Plan</Text>
            {duesPlans.length === 0 ? (
              <Text style={styles.memberMeta}>Create a dues plan first.</Text>
            ) : (
              <FlatList
                data={duesPlans}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 8 }}
                renderItem={({ item }) => {
                  const active = cyclePlanId === item.id;
                  return (
                    <Pressable
                      onPress={() => setCyclePlanId(item.id)}
                      style={[styles.segment, active && styles.segmentActive]}
                      accessibilityRole="button"
                      accessibilityLabel={`Select plan ${item.name}`}
                    >
                      <Text
                        style={
                          active ? styles.segmentTextActive : styles.segmentText
                        }
                      >
                        {item.name}
                      </Text>
                    </Pressable>
                  );
                }}
              />
            )}

            <Text style={styles.fieldLabel}>Cycle label</Text>
            <TextInput
              style={styles.input}
              placeholder="2026-06"
              value={cycleLabel}
              onChangeText={setCycleLabel}
              accessibilityLabel="Cycle label"
            />

            <Text style={styles.fieldLabel}>Due date</Text>
            <DateField
              value={cycleDueDate}
              onChange={setCycleDueDate}
              placeholder="Pick a due date"
              accessibilityLabel="Due date"
            />

            <AppButton
              label={
                loading
                  ? "Saving..."
                  : editingCycle
                    ? "Save cycle"
                    : "Create billing cycle"
              }
              onPress={onSubmit}
              disabled={loading}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
