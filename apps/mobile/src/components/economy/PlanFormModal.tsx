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
import { useDues } from "../../context/domainHooks";
import { useUi } from "../../context/domainHooks";
import type { DuesFrequency, DuesPlan } from "../../types";
import { AppButton } from "../AppButton";
import { DateField } from "../DateField";
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
  const { createDuesPlan, updateDuesPlan, setDuesPlanActive } = useDues();
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

  // Archiving stops all future billing but keeps cycles and history intact, so
  // confirm before flipping the plan inactive.
  const confirmArchive = () => {
    if (!editingPlan) {
      return;
    }
    Alert.alert(
      "Archive plan",
      `Stop billing for ${editingPlan.name}? Existing dues and history stay intact, and you can reactivate it later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Archive",
          style: "destructive",
          onPress: () => {
            void setDuesPlanActive(editingPlan.id, false);
            onClose();
          },
        },
      ],
    );
  };

  const confirmReactivate = () => {
    if (!editingPlan) {
      return;
    }
    Alert.alert(
      "Reactivate plan",
      `Resume ${editingPlan.name}? It will appear in the plan list and can bill members again.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reactivate",
          onPress: () => {
            void setDuesPlanActive(editingPlan.id, true);
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
                <Text style={styles.fieldLabel}>Start date</Text>
                <DateField
                  value={planStartDate}
                  onChange={setPlanStartDate}
                  placeholder="Pick a start date"
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

            {editingPlan ? (
              <>
                <View style={styles.separator} />
                {editingPlan.isActive ? (
                  <>
                    <Pressable
                      onPress={confirmArchive}
                      disabled={loading}
                      style={[
                        styles.dangerButton,
                        loading && styles.buttonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Archive plan ${editingPlan.name}`}
                    >
                      <Text style={styles.dangerButtonText}>Archive plan</Text>
                    </Pressable>
                    <Text style={styles.memberMeta}>
                      Archiving stops future billing. Cycles and history are
                      kept, and you can reactivate any time.
                    </Text>
                  </>
                ) : (
                  <>
                    <Pressable
                      onPress={confirmReactivate}
                      disabled={loading}
                      style={[
                        styles.inlineButton,
                        loading && styles.buttonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Reactivate plan ${editingPlan.name}`}
                    >
                      <Text style={styles.inlineButtonText}>
                        Reactivate plan
                      </Text>
                    </Pressable>
                    <Text style={styles.memberMeta}>
                      This plan is archived. Reactivate it to bill members
                      again.
                    </Text>
                  </>
                )}
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
