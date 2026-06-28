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
  const {
    duesPlans,
    createDuesCycle,
    updateDuesCycle,
    generateDues,
    sendDuePaymentLinks,
  } = useDues();
  const { loading } = useUi();

  const [cyclePlanId, setCyclePlanId] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");
  const [planOpen, setPlanOpen] = useState(false);

  // Only active plans can be chosen for a new/edited cycle, but keep the
  // currently-selected plan visible even if it was archived after this cycle
  // was created, so editing doesn't silently drop it.
  const selectablePlans = duesPlans.filter(
    (plan) => plan.isActive || plan.id === cyclePlanId,
  );

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
      setCyclePlanId(duesPlans.find((plan) => plan.isActive)?.id ?? "");
      setCycleLabel("");
      setCycleDueDate("");
    }
    setPlanOpen(false);
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

  // Generating dues bills every active member and notifies them, so confirm
  // before firing this fan-out action.
  const confirmGenerate = () => {
    if (!editingCycle) {
      return;
    }
    Alert.alert(
      "Generate dues",
      `Bill every active member for ${editingCycle.planName} \u00b7 ${editingCycle.cycleLabel}? This creates dues and notifies members.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Generate",
          onPress: () => {
            void generateDues(editingCycle.id);
            onClose();
          },
        },
      ],
    );
  };

  // Resending payment links messages every billed member, so confirm first.
  const confirmResend = () => {
    if (!editingCycle) {
      return;
    }
    Alert.alert(
      "Resend payment links",
      `Send fresh payment links to members billed in ${editingCycle.planName} \u00b7 ${editingCycle.cycleLabel}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send links",
          onPress: () => {
            void sendDuePaymentLinks({ cycleId: editingCycle.id });
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
            {editingCycle ? "Edit billing cycle" : "New billing cycle"}
          </Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.fieldLabel}>Plan</Text>
            {selectablePlans.length === 0 ? (
              <Text style={styles.memberMeta}>Create a dues plan first.</Text>
            ) : (
              <View>
                <Pressable
                  style={styles.dateField}
                  onPress={() => setPlanOpen((open) => !open)}
                  accessibilityRole="button"
                  accessibilityLabel="Select plan"
                >
                  <Text style={styles.dateFieldText}>
                    {selectablePlans.find((plan) => plan.id === cyclePlanId)
                      ?.name ?? "Select a plan"}
                  </Text>
                  <Text style={styles.dateFieldIcon}>
                    {planOpen ? "\u2303" : "\u2304"}
                  </Text>
                </Pressable>
                {planOpen ? (
                  <View style={[styles.dropdownMenu, { marginTop: 6 }]}>
                    {selectablePlans.map((plan, index) => {
                      const active = cyclePlanId === plan.id;
                      return (
                        <Pressable
                          key={plan.id}
                          onPress={() => {
                            setCyclePlanId(plan.id);
                            setPlanOpen(false);
                          }}
                          style={[
                            styles.dropdownOption,
                            active && styles.dropdownOptionActive,
                            index > 0 && {
                              borderTopWidth: 1,
                              borderTopColor: styles.separator.backgroundColor,
                            },
                          ]}
                          accessibilityRole="button"
                          accessibilityLabel={`Select plan ${plan.name}`}
                        >
                          <Text
                            style={[
                              styles.dropdownOptionText,
                              active && styles.dropdownOptionTextActive,
                            ]}
                          >
                            {plan.name}
                          </Text>
                          {active ? (
                            <Text style={styles.dropdownOptionCheck}>
                              {"\u2713"}
                            </Text>
                          ) : null}
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
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

            {editingCycle ? (
              <>
                <View style={styles.separator} />
                <Text style={styles.fieldLabel}>Actions</Text>
                <Pressable
                  onPress={confirmGenerate}
                  disabled={loading}
                  style={[
                    styles.inlineButton,
                    loading && styles.buttonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Generate dues for ${editingCycle.cycleLabel}`}
                >
                  <Text style={styles.inlineButtonText}>Generate dues</Text>
                </Pressable>
                <Pressable
                  onPress={confirmResend}
                  disabled={loading}
                  style={[
                    styles.inlineButton,
                    loading && styles.buttonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Resend payment links for ${editingCycle.cycleLabel}`}
                >
                  <Text style={styles.inlineButtonText}>
                    Resend payment links
                  </Text>
                </Pressable>
              </>
            ) : null}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
