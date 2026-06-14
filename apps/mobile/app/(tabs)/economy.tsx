import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
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

const formatAmount = (value: number) =>
  `\u20b9${value.toLocaleString("en-IN")}`;

const formatDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

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
    createDuesPlan,
    updateDuesPlan,
    createDuesCycle,
    updateDuesCycle,
    generateDues,
    ensureAutoDuesCycles,
    recordTransaction,
  } = useClubOs();

  const [tab, setTab] = useState<EconomyTab>("dues");

  // Ledger record sheet is leadership-only, mirroring the Activity tab.
  const [ledgerFormOpen, setLedgerFormOpen] = useState(false);

  // Plan + cycle create/edit sheets follow the Activity "＋ New" pattern.
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | null>(null);

  // Plans form
  const [planName, setPlanName] = useState("");
  const [planAmount, setPlanAmount] = useState("");
  const [planFrequency, setPlanFrequency] = useState<DuesFrequency>("monthly");
  const [planGraceDays, setPlanGraceDays] = useState("3");
  const [planAutoGenerate, setPlanAutoGenerate] = useState(false);
  const [planStartDate, setPlanStartDate] = useState("");

  // Roll auto-billing plans forward whenever a leader opens the Economy tab.
  useEffect(() => {
    if (canManageDues) {
      void ensureAutoDuesCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    if (editingPlanId) {
      await updateDuesPlan(editingPlanId, {
        name: planName,
        amount: Number(planAmount),
        frequency: planFrequency,
        graceDays: Number(planGraceDays),
        autoGenerate: planAutoGenerate,
        startDate: planStartDate,
      });
    } else {
      await createDuesPlan({
        name: planName,
        amount: Number(planAmount),
        frequency: planFrequency,
        graceDays: Number(planGraceDays),
        autoGenerate: planAutoGenerate,
        startDate: planStartDate,
      });
    }
    closePlanForm();
  };

  const openPlanForm = (plan?: (typeof duesPlans)[number]) => {
    if (plan) {
      setEditingPlanId(plan.id);
      setPlanName(plan.name);
      setPlanAmount(String(plan.amount));
      setPlanFrequency(plan.frequency);
      setPlanGraceDays(String(plan.graceDays));
      setPlanAutoGenerate(plan.autoGenerate);
      setPlanStartDate(plan.startDate ?? "");
    } else {
      setEditingPlanId(null);
      setPlanName("");
      setPlanAmount("");
      setPlanFrequency("monthly");
      setPlanGraceDays("3");
      setPlanAutoGenerate(false);
      setPlanStartDate("");
    }
    setPlanFormOpen(true);
  };

  const closePlanForm = () => {
    setPlanFormOpen(false);
    setEditingPlanId(null);
    setPlanName("");
    setPlanAmount("");
    setPlanGraceDays("3");
    setPlanAutoGenerate(false);
    setPlanStartDate("");
  };

  const onCreateCycle = async () => {
    if (editingCycleId) {
      await updateDuesCycle(editingCycleId, {
        duesPlanId: cyclePlanId,
        cycleLabel,
        dueDate: cycleDueDate,
      });
    } else {
      await createDuesCycle({
        duesPlanId: cyclePlanId,
        cycleLabel,
        dueDate: cycleDueDate,
      });
    }
    closeCycleForm();
  };

  const openCycleForm = (cycle?: (typeof duesCycles)[number]) => {
    if (cycle) {
      setEditingCycleId(cycle.id);
      setCyclePlanId(cycle.duesPlanId);
      setCycleLabel(cycle.cycleLabel);
      setCycleDueDate(cycle.dueDate);
    } else {
      setEditingCycleId(null);
      setCyclePlanId(duesPlans[0]?.id ?? "");
      setCycleLabel("");
      setCycleDueDate("");
    }
    setCycleFormOpen(true);
  };

  const closeCycleForm = () => {
    setCycleFormOpen(false);
    setEditingCycleId(null);
    setCyclePlanId("");
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
    setLedgerFormOpen(false);
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
        </View>
      ) : null}

      {tab === "ledger" ? (
        <View style={styles.card}>
          <View style={styles.sectionHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitle}>Ledger</Text>
              <Text style={styles.memberMeta}>
                Income and expenses outside of dues.
              </Text>
            </View>
            {canManageDues ? (
              <Pressable
                style={styles.inviteLink}
                onPress={() => setLedgerFormOpen(true)}
                accessibilityRole="button"
                accessibilityLabel="New transaction"
              >
                <Text style={styles.inviteLinkText}>＋ New</Text>
              </Pressable>
            ) : null}
          </View>

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
                    <Text style={styles.metaText}>
                      {formatDateTime(item.createdAt)}
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
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Dues plans</Text>
                  <Text style={styles.memberMeta}>
                    Define how much members owe and how often.
                  </Text>
                </View>
                <Pressable
                  style={styles.inviteLink}
                  onPress={() => openPlanForm()}
                  accessibilityRole="button"
                  accessibilityLabel="New dues plan"
                >
                  <Text style={styles.inviteLinkText}>＋ New</Text>
                </Pressable>
              </View>

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
                    <Pressable
                      style={styles.memberRow}
                      onPress={() => openPlanForm(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Edit plan ${item.name}`}
                    >
                      <View style={styles.dueRowText}>
                        <Text style={styles.memberName}>{item.name}</Text>
                        <Text style={styles.memberMeta}>
                          {formatAmount(item.amount)} ·{" "}
                          {frequencyLabel(item.frequency)} · {item.graceDays}d
                          grace
                          {item.autoGenerate
                            ? ` · Auto from ${item.startDate ?? "—"}`
                            : ""}
                        </Text>
                      </View>
                      <Text style={[styles.metaText, { fontSize: 18 }]}>
                        {"\u270E"}
                      </Text>
                    </Pressable>
                  )}
                />
              )}
            </View>

            <View style={styles.card}>
              <View style={styles.sectionHeaderRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle}>Billing cycles</Text>
                  <Text style={styles.memberMeta}>
                    Open a cycle, then generate dues to bill every active
                    member.
                  </Text>
                </View>
                <Pressable
                  style={styles.inviteLink}
                  onPress={() => openCycleForm()}
                  accessibilityRole="button"
                  accessibilityLabel="New billing cycle"
                >
                  <Text style={styles.inviteLinkText}>＋ New</Text>
                </Pressable>
              </View>

              <AppButton
                label={loading ? "Running..." : "Run auto-billing now"}
                onPress={() => ensureAutoDuesCycles({ announce: true })}
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
                      <Pressable
                        style={styles.dueRowText}
                        onPress={() => openCycleForm(item)}
                        accessibilityRole="button"
                        accessibilityLabel={`Edit cycle ${item.cycleLabel}`}
                      >
                        <Text style={styles.memberName}>
                          {item.planName} · {item.cycleLabel}
                        </Text>
                        <Text style={styles.memberMeta}>
                          {item.dueDate ? `Due ${item.dueDate}` : "No due date"}
                        </Text>
                      </Pressable>
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

      {/* Create / edit dues plan (leadership only) */}
      <Modal
        visible={planFormOpen}
        transparent
        animationType="slide"
        onRequestClose={closePlanForm}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closePlanForm}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingPlanId ? "Edit dues plan" : "New dues plan"}
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
                    {frequencyLabel(planFrequency).toLowerCase()} period and
                    bill all active members automatically.
                  </Text>
                </>
              ) : null}

              <AppButton
                label={
                  loading
                    ? "Saving..."
                    : editingPlanId
                      ? "Save plan"
                      : "Create dues plan"
                }
                onPress={onCreatePlan}
                disabled={loading}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Create / edit billing cycle (leadership only) */}
      <Modal
        visible={cycleFormOpen}
        transparent
        animationType="slide"
        onRequestClose={closeCycleForm}
      >
        <Pressable style={styles.sheetBackdrop} onPress={closeCycleForm}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {editingCycleId ? "Edit billing cycle" : "New billing cycle"}
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
                label={
                  loading
                    ? "Saving..."
                    : editingCycleId
                      ? "Save cycle"
                      : "Create billing cycle"
                }
                onPress={onCreateCycle}
                disabled={loading}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Record transaction (leadership only) */}
      <Modal
        visible={ledgerFormOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setLedgerFormOpen(false)}
      >
        <Pressable
          style={styles.sheetBackdrop}
          onPress={() => setLedgerFormOpen(false)}
        >
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
                onPress={onRecordTransaction}
                disabled={loading}
              />
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </TabScreenShell>
  );
}
