import { useEffect, useState } from "react";
import { Modal, Pressable, ScrollView, Text, TextInput, View } from "react-native";
import { styles } from "../../styles";
import { useDues } from "../../context/domainHooks";
import { useUi } from "../../context/domainHooks";
import type { TransactionType } from "../../types";
import { AppButton } from "../AppButton";

// Record a manual ledger transaction (leadership only). Owns its own form
// state and commits through the dues domain hook.
export function LedgerFormModal({
  visible,
  onClose,
}: {
  visible: boolean;
  onClose: () => void;
}) {
  const { recordTransaction } = useDues();
  const { loading } = useUi();

  const [txType, setTxType] = useState<TransactionType>("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txMethod, setTxMethod] = useState("UPI");
  const [txDescription, setTxDescription] = useState("");

  // Reset the form each time the sheet opens.
  useEffect(() => {
    if (!visible) {
      return;
    }
    setTxType("income");
    setTxAmount("");
    setTxCategory("");
    setTxMethod("UPI");
    setTxDescription("");
  }, [visible]);

  const onSubmit = async () => {
    await recordTransaction({
      type: txType,
      amount: Number(txAmount),
      category: txCategory,
      paymentMethod: txMethod,
      description: txDescription,
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
          <Text style={styles.sheetTitle}>New transaction</Text>
          <ScrollView
            contentContainerStyle={{ gap: 12 }}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.segmentRow}>
              {(["income", "expense"] as TransactionType[]).map((option) => {
                const active = txType === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setTxType(option)}
                    style={[styles.segment, active && styles.segmentActive]}
                    accessibilityRole="button"
                    accessibilityLabel={`Transaction type ${option}`}
                  >
                    <Text
                      style={
                        active ? styles.segmentTextActive : styles.segmentText
                      }
                    >
                      {option === "income" ? "Income" : "Expense"}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.fieldLabel}>Amount (INR)</Text>
            <TextInput
              style={styles.input}
              placeholder="500"
              keyboardType="numeric"
              value={txAmount}
              onChangeText={setTxAmount}
              accessibilityLabel="Transaction amount"
            />

            <Text style={styles.fieldLabel}>Category</Text>
            <TextInput
              style={styles.input}
              placeholder="Venue, Equipment, Sponsorship..."
              value={txCategory}
              onChangeText={setTxCategory}
              accessibilityLabel="Transaction category"
            />

            <Text style={styles.fieldLabel}>Payment method</Text>
            <TextInput
              style={styles.input}
              placeholder="UPI"
              value={txMethod}
              onChangeText={setTxMethod}
              accessibilityLabel="Payment method"
            />

            <Text style={styles.fieldLabel}>Description (optional)</Text>
            <TextInput
              style={styles.input}
              placeholder="Hall rent for June meet"
              value={txDescription}
              onChangeText={setTxDescription}
              accessibilityLabel="Transaction description"
            />

            <AppButton
              label={loading ? "Saving..." : "Record transaction"}
              onPress={onSubmit}
              disabled={loading}
            />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
