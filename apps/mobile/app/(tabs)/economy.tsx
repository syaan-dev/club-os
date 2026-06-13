import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import type { TextStyle } from "react-native";
import { styles } from "../../src/styles";
import { useClubOs } from "../../src/ClubOsContext";
import type {
  DuesFrequency,
  DueStatus,
  TransactionType,
} from "../../src/types";
import { AppButton } from "../../src/components/AppButton";
import { TabScreenShell } from "../../src/components/TabScreenShell";

const formatAmount = (value: number) => `\u20b9${value.toLocaleString("en-IN")}`;

const FREQUENCIES: { value: DuesFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one_time", label: "One-time" },
];

const frequencyLabel = (value: DuesFrequency) =>
  FREQUENCIES.find((f) => f.value === value)?.label ?? value;

const dueStatusStyle = (status: DueStatus): TextStyle => {
  if (status === "paid") {
    return styles.paid;
  }
  if (status === "overdue") {
    return styles.unpaid;
  }
  if (status === "waived") {
    return styles.muted;
  }
  return styles.warn;
};

const dueStatusLabel = (status: DueStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);

type EconomyTab = "dues" | "ledger" | "plans";

const ECONOMY_TABS: { value: EconomyTab; label: string }[] = [
  { value: "dues", label: "Dues" },
  { value: "ledger", label: "Ledger" },
  { value: "plans", label: "Plans" },
];

export default function EconomyScreen() {
  const {
    members,
    memberDues,
    duesSummary,
    duesLoading,
    canManageDues,
    duesPlans,
    duesCycles,
    ledgerEntries,
    loading,
    refreshDues,
    createDuesPlan,
    createDuesCycle,
    generateDues,
    recordTransaction,
  } = useClubOs();

  const [tab, setTab] = useState<EconomyTab>("dues");

  // Plans form
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planFrequency, setPlanFrequency] = useState<DuesFrequency>("monthly");
  const [planGraceDays, setPlanGraceDays] = useState("3");

  // Cycle form
  const [cyclePlanId, setCyclePlanId] = useState("");
  const [cycleLabel, setCycleLabel] = useState("");
  const [cycleDueDate, setCycleDueDate] = useState("");

  // Ledger form
  const [txType, setTxType] = useState<TransactionType>("income");
  const [txAmount, setTxAmount] = useState("");
  const [txCategory, setTxCategory] = useState("");
  const [txMethod, setTxMethod] = useState("UPI");
  const [txDescription, setTxDescription] = useState("");

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

  const metrics: { label: string; value: string | number }[] = [
    { label: "Total members", value: members.length },
    { label: "Total billed", value: formatAmount(duesSummary.totalBilled) },
    { label: "Collected", value: formatAmount(duesSummary.totalCollected) },
    { label: "Outstanding", value: formatAmount(duesSummary.totalOutstanding) },
    { label: "Collection health", value: `${duesSummary.collectionPercent}%` },
    { label: "Overdue dues", value: duesSummary.overdueCount },
  ];

  return (
    <TabScreenShell>
      <View style={styles.segmentRow}>
        {ECONOMY_TABS.map((option) => {
          const active = tab === option.value;
          return (
            <Pressable
              key={option.value}
              onPress={() => setTab(option.value)}
              style={[styles.segment, active && styles.segmentActive]}
              accessibilityRole="button"
              accessibilityLabel={`${option.label} tab`}
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

      {tab === "dues" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Dues dashboard</Text>
          <View style={styles.metricGrid}>
            {metrics.map((metric) => (
              <View key={metric.label} style={styles.metricCard}>
                <Text style={styles.metricLabel}>{metric.label}</Text>
                <Text style={styles.metricValue}>{metric.value}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.subTitle}>Member dues</Text>
          {duesLoading && memberDues.length === 0 ? (
            <ActivityIndicator color="#0f4fa8" />
          ) : memberDues.length === 0 ? (
            <Text style={styles.memberMeta}>
              No dues assigned yet. Create a plan and cycle under Plans to start
              tracking collections.
            </Text>
          ) : (
            <FlatList
              data={memberDues}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => (
                <View style={styles.memberRow}>
                  <View style={styles.dueRowText}>
                    <Text style={styles.memberName}>{item.memberName}</Text>
                    <Text style={styles.memberMeta}>
                      {item.cycleLabel}
                      {item.dueDate ? ` \u00b7 Due ${item.dueDate}` : ""}
                    </Text>
                    <Text style={styles.metaText}>
                      Paid {formatAmount(item.amountPaid)} of{" "}
                      {formatAmount(item.amountDue)}
                    </Text>
                  </View>
                  <Text style={dueStatusStyle(item.status)}>
                    {dueStatusLabel(item.status)}
                  </Text>
                </View>
              )}
            />
          )}
          <AppButton
            label={duesLoading ? "Refreshing..." : "Refresh"}
            onPress={refreshDues}
            disabled={duesLoading}
          />
        </View>
      ) : null}

      {tab === "ledger" ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Ledger</Text>
          <Text style={styles.memberMeta}>
            Income and expenses outside of dues.
          </Text>

          {canManageDues ? (
            <>
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
                onPress={onRecordTransaction}
                disabled={loading}
              />
            </>
          ) : (
            <Text style={styles.memberMeta}>
              Only an owner or treasurer can record transactions.
            </Text>
          )}

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
                  <Text
                    style={item.type === "income" ? styles.paid : styles.unpaid}
                  >
                    {item.type === "income" ? "+" : "-"}
                    {formatAmount(item.amount)}
                  </Text>
                </View>
              )}
            />
          )}
        </View>
      ) : null}

      {tab === "plans" ? (
        canManageDues ? (
          <>
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
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
                  renderItem={({ item }) => (
                    <View style={styles.memberRow}>
                      <View style={styles.dueRowText}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberMeta}>
                          {formatAmount(item.amount)} ·{" "}
                          {frequencyLabel(item.frequency)} · {item.graceDays}d
                          grace
                        </Text>
                      </View>
                    </View>
                  )}
                />
              )}
            </View>

            <View style={styles.card}>
              <Text style={styles.cardTitle}>Billing cycles</Text>
              <Text style={styles.memberMeta}>
                Open a cycle, then generate dues to bill every active member.
              </Text>

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
                            active
                              ? styles.segmentTextActive
                              : styles.segmentText
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
                  ItemSeparatorComponent={() => (
                    <View style={styles.separator} />
                  )}
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
                        <Text style={styles.inlineButtonText}>
                          Generate dues
                        </Text>
                      </Pressable>
                    </View>
                  )}
                />
              )}
            </View>
          </>
        ) : (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Dues plans</Text>
            <Text style={styles.memberMeta}>
              Only an owner or treasurer can manage dues plans and cycles.
            </Text>
          </View>
        )
      ) : null}
    </TabScreenShell>
  );
}
