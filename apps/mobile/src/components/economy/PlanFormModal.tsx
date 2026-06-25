import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../../styles";
import { useDues } from "../../context/domainHooks";
import { useUi } from "../../context/domainHooks";
import type { DuesFrequency, DuesPlan } from "../../types";
import { AppButton } from "../AppButton";
import { FREQUENCIES, frequencyLabel } from "./format";

// Create / edit a dues plan (leadership only). Owns its own form state and
// commits through the dues domain hook; the parent only toggles visibility.
export function PlanFormModal({
  visible,
  editingPlan,
  onClose,
}: {
  visible: boolean;
  editingPlan: DuesPlan | null;
  onClose: () => void;
}) {
  const { createDuesPlan, updateDuesPlan } = useDues();
  const { loading } = useUi();

  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planFrequency, setPlanFrequency] = useState<DuesFrequency>("monthly");
  const [planGraceDays, setPlanGraceDays] = useState("3");
  const [planAutoGenerate, setPlanAutoGenerate] = useState(false);
  const [planStartDate, setPlanStartDate] = useState("");

  // Re-seed the form whenever the sheet opens, from the plan being edited.
  useEffect(() => {
    if (!visible) {
      return;
    }
    if (editingPlan) {
      setPlanName(editingPlan.name);
      setPlanAmount(String(editingPlan.amount));
      setPlanFrequency(editingPlan.frequency);
      setPlanGraceDays(String(editingPlan.graceDays));
      setPlanAutoGenerate(editingPlan.autoGenerate);
      setPlanStartDate(editingPlan.startDate ?? "");
    } else {
      setPlanName("");
      setPlanAmount("");
      setPlanFrequency("monthly");
      setPlanGraceDays("3");
      setPlanAutoGenerate(false);
      setPlanStartDate("");
    }
  }, [visible, editingPlan]);

  const onSubmit = async () => {
    const payload = {
      name: planName,
      amount: Number(planAmount),
      frequency: planFrequency,
      graceDays: Number(planGraceDays),
      autoGenerate: planAutoGenerate,
      startDate: planStartDate,
    };
    if (editingPlan) {
      await updateDuesPlan(editingPlan.id, payload);
    } else {
      await createDuesPlan(payload);
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
            {editingPlan ? "Edit dues plan" : "New dues plan"}
          </Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Plan name</Text>
            <TextInput
              style={styles.input}
              placeholder="Monthly Membership"
              value={planName}
              onChangeText={setPlanName}
              accessibilityLabel="Plan name"
            />

            <Text style={styles.fieldLabel}>Amount (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="1000"
              keyboardType="numeric"
              value={planAmount}
              onChangeText={setPlanAmount}
              accessibilityLabel="Plan amount"
            />

            <Text style={styles.fieldLabel}>Frequency</Text>
            <View style={styles.segmentRow}>
              {FREQUENCIES.map((option) => {
                const active = planFrequency === option.value;
                return (
                  <Pressable
                    key={option.value}
                    onPress={() => setPlanFrequency(option.value)}
                    style={[styles.segment, active && styles.segmentActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Frequency ${option.label}`}
                  >
                    <Text
                      style={
                        active ? styles.segmentTextActive : styles.segmentText
                      }
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Grace days</Text>
            <TextInput
              style={styles.input}
              placeholder="3"
              keyboardType="numeric"
              value={planGraceDays}
              onChangeText={setPlanGraceDays}
              accessibilityLabel="Grace days"
            />

            <Text style={styles.fieldLabel}>Auto-billing</Text>
            <View style={styles.segmentRow}>
              {[
                { value: false, label: "Manual only" },
                { value: true, label: "Auto-generate" },
              ].map((option) => {
                const active = planAutoGenerate === option.value;
                return (
                  <Pressable
                    key={option.label}
                    onPress={() => setPlanAutoGenerate(option.value)}
                    style={[styles.segment, active && styles.segmentActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Auto billing ${option.label}`}
                  >
                    <Text
                      style={
                        active ? styles.segmentTextActive : styles.segmentText
                      }
                    >
                      {option.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {planAutoGenerate ? (
              <>
                <Text style={styles.fieldLabel}>Start date (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="2026-01-01"
                  autoCapitalize="none"
                  value={planStartDate}
                  onChangeText={setPlanStartDate}
                  accessibilityLabel="Auto billing start date"
                />
                <Text style={styles.memberMeta}>
                  Cycles roll forward from this date every{" "}
                  {frequencyLabel(planFrequency).toLowerCase()} period and bill
                  all active members automatically.
                </Text>
              </>
            ) : null}

            <AppButton
              label={
                loading
                  ? "Saving..."
                  : editingPlan
                    ? "Save plan"
                    : "Create dues plan"
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
