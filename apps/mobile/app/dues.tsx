import { useState } from "react";
import { FlatList, Pressable, Text, TextInput, View } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import type { DuesFrequency, TransactionType } from "../src/types";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

const formatAmount = (value: number) => `\u20b9${value.toLocaleString("en-IN")}`;

const FREQUENCIES: { value: DuesFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one_time", label: "One-time" },
];

const frequencyLabel = (value: DuesFrequency) =>
  FREQUENCIES.find((f) => f.value === value)?.label ?? value;

export default function DuesScreen() {
  const {
    canManageDues,
    duesPlans,
    duesCycles,
    ledgerEntries,
    loading,
    createDuesPlan,
    createDuesCycle,
    generateDues,
    recordTransaction,
    navigate,
  } = useClubOs();

  // Dues plan form
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planFrequency, setPlanFrequency] = useState<DuesFrequency>("monthly");
  const [planGraceDays, setPlanGraceDays] = useState("3");

  // Dues cycle form
  const [cyclePlanId, setCyclePlanId] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");

  // Ledger form
  const [txType, setTxType] = useState<TransactionType>("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txMethod, setTxMethod] = useState("UPI");
  const [txDescription, setTxDescription] = useState("");

  if (!canManageDues) {
    return (
      <ScreenShell>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dues &amp; ledger</Text>
          <Text style={styles.memberMeta}>
            Only an owner or treasurer can manage dues plans, cycles, and the
            ledger. Ask a club admin for access.
          </Text>
          <AppButton
            label="Back to membership desk"
            onPress={() => navigate("members")}
          />
        </View>
      </ScreenShell>
    );
  }

  const onCreatePlan = async () => {
    await createDuesPlan({
      name: planName,
      amount: Number(planAmount),
      frequency: planFrequency,
      graceDays: Number(planGraceDays),
    });
    setPlanName("");
    setPlanAmount("");
    setPlanGraceDays("3");
  };

  const onCreateCycle = async () => {
    await createDuesCycle({
      duesPlanId: cyclePlanId,
      cycleLabel,
      dueDate: cycleDueDate,
    });
    setCycleLabel("");
    setCycleDueDate("");
  };

  const onRecordTransaction = async () => {
    await recordTransaction({
      type: txType,
      amount: Number(txAmount),
      category: txCategory,
      paymentMethod: txMethod,
      description: txDescription,
    });
    setTxAmount("");
    setTxCategory("");
    setTxDescription("");
  };

  return (
    <ScreenShell>
      {/* Dues plan creation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dues plans</Text>
        <Text style={styles.memberMeta}>
          Define how much members owe and how often.
        </Text>

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
                  style={active ? styles.segmentTextActive : styles.segmentText}
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

        <AppButton
          label={loading ? "Saving..." : "Create dues plan"}
          onPress={onCreatePlan}
          disabled={loading}
        />

        <Text style={styles.subTitle}>Existing plans</Text>
        {duesPlans.length === 0 ? (
          <Text style={styles.memberMeta}>No dues plans yet.</Text>
        ) : (
          <FlatList
            data={duesPlans}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberMeta}>
                    {formatAmount(item.amount)} ·{" "}
                    {frequencyLabel(item.frequency)} · {item.graceDays}d grace
                  </Text>
                </View>
              </View>
            )}
          />
        )}
      </View>

      {/* Dues cycle creation */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Billing cycles</Text>
        <Text style={styles.memberMeta}>
          Open a cycle, then generate dues to bill every active member.
        </Text>

        <Text style={styles.fieldLabel}>Plan</Text>
        {duesPlans.length === 0 ? (
          <Text style={styles.memberMeta}>Create a dues plan first.</Text>
        ) : (
          <View style={styles.segmentRow}>
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

        <Text style={styles.fieldLabel}>Due date (YYYY-MM-DD)</Text>
        <TextInput
          style={styles.input}
          placeholder="2026-06-30"
          autoCapitalize="none"
          value={cycleDueDate}
          onChangeText={setCycleDueDate}
          accessibilityLabel="Due date"
        />

        <AppButton
          label={loading ? "Saving..." : "Create billing cycle"}
          onPress={onCreateCycle}
          disabled={loading}
        />

        <Text style={styles.subTitle}>Cycles</Text>
        {duesCycles.length === 0 ? (
          <Text style={styles.memberMeta}>No billing cycles yet.</Text>
        ) : (
          <FlatList
            data={duesCycles}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>
                    {item.planName} · {item.cycleLabel}
                  </Text>
                  <Text style={styles.memberMeta}>
                    {item.dueDate ? `Due ${item.dueDate}` : "No due date"}
                  </Text>
                </View>
                <Pressable
                  onPress={() => generateDues(item.id)}
                  disabled={loading}
                  style={[
                    styles.inlineButton,
                    loading && styles.buttonDisabled,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Generate dues for ${item.cycleLabel}`}
                >
                  <Text style={styles.inlineButtonText}>Generate dues</Text>
                </Pressable>
              </View>
            )}
          />
        )}
      </View>

      {/* Manual ledger */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Manual ledger</Text>
        <Text style={styles.memberMeta}>
          Record income and expenses outside of dues.
        </Text>

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
                  style={active ? styles.segmentTextActive : styles.segmentText}
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
          onPress={onRecordTransaction}
          disabled={loading}
        />

        <Text style={styles.subTitle}>Recent transactions</Text>
        {ledgerEntries.length === 0 ? (
          <Text style={styles.memberMeta}>No transactions recorded yet.</Text>
        ) : (
          <FlatList
            data={ledgerEntries}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <View style={styles.memberRow}>
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>{item.category}</Text>
                  <Text style={styles.memberMeta}>
                    {item.paymentMethod}
                    {item.description ? ` \u00b7 ${item.description}` : ""}
                  </Text>
                </View>
                <Text style={item.type === "income" ? styles.paid : styles.unpaid}>
                  {item.type === "income" ? "+" : "-"}
                  {formatAmount(item.amount)}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      <View style={styles.card}>
        <AppButton
          label="View dues dashboard"
          onPress={() => navigate("hub")}
        />
        <AppButton
          label="Back to membership desk"
          onPress={() => navigate("members")}
        />
      </View>
    </ScreenShell>
  );
}
