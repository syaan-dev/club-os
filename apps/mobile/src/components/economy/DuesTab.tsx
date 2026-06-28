import { useMemo } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";
import { styles, colors } from "../../styles";
import { useDues, useMembers, useUi } from "../../context/domainHooks";
import type { MemberDue } from "../../types";
import { dueStatusLabel, dueStatusStyle, formatAmount } from "./format";

type DueSection = {
  key: string;
  planName: string;
  cycleLabel: string;
  dueDate: string;
  billed: number;
  collected: number;
  data: MemberDue[];
};

// Groups member dues by billing cycle (plan + cycle label) so each plan's
// collection reads as a self-contained block with its own subtotal. Cycles are
// ordered most-recent-due first, then by plan name.
function groupDuesByCycle(dues: MemberDue[]): DueSection[] {
  const byCycle = new Map<string, DueSection>();

  for (const due of dues) {
    const key = `${due.planName}\u0000${due.cycleLabel}\u0000${due.dueDate}`;
    let section = byCycle.get(key);
    if (!section) {
      section = {
        key,
        planName: due.planName,
        cycleLabel: due.cycleLabel,
        dueDate: due.dueDate,
        billed: 0,
        collected: 0,
        data: [],
      };
      byCycle.set(key, section);
    }
    section.billed += due.amountDue;
    section.collected += due.amountPaid;
    section.data.push(due);
  }

  return Array.from(byCycle.values()).sort((a, b) => {
    if (a.dueDate !== b.dueDate) {
      return a.dueDate < b.dueDate ? 1 : -1;
    }
    return a.planName.localeCompare(b.planName);
  });
}

// "Dues" tab: collection metrics plus the per-cycle dues list, with an inline
// "Pay now" action on the current member's own pending/overdue rows.
export function DuesTab() {
  const { memberDues, duesSummary, duesLoading, startDuePayment } = useDues();
  const { members, currentMemberId } = useMembers();
  const { loading } = useUi();

  const sections = useMemo(() => groupDuesByCycle(memberDues), [memberDues]);

  const metrics: { label: string; value: string | number }[] = [
    { label: "Total members", value: members.length },
    { label: "Total billed", value: formatAmount(duesSummary.totalBilled) },
    { label: "Collected", value: formatAmount(duesSummary.totalCollected) },
    { label: "Outstanding", value: formatAmount(duesSummary.totalOutstanding) },
    { label: "Collection health", value: `${duesSummary.collectionPercent}%` },
    { label: "Overdue dues", value: duesSummary.overdueCount },
  ];

  return (
    <>
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
      </View>

      <Text style={styles.subTitle}>Member dues</Text>
      {duesLoading && memberDues.length === 0 ? (
        <ActivityIndicator color={colors.accent} />
      ) : memberDues.length === 0 ? (
        <Text style={styles.memberMeta}>
          No dues assigned yet. Create a plan and cycle under Plans to start
          tracking collections.
        </Text>
      ) : null}

      {sections.map((section) => (
        <View key={section.key} style={styles.card}>
          <View style={styles.duesGroupHeader}>
            <View style={styles.dueRowText}>
              <Text style={styles.duesGroupTitle}>{section.planName}</Text>
              <Text style={styles.memberMeta}>
                {section.cycleLabel}
                {section.dueDate ? ` \u00b7 Due ${section.dueDate}` : ""}
              </Text>
            </View>
            <Text style={styles.duesGroupSubtotal}>
              {formatAmount(section.collected)} of{" "}
              {formatAmount(section.billed)}
            </Text>
          </View>

          {section.data.map((item, index) => (
            <View key={item.id}>
              {index > 0 ? <View style={styles.separator} /> : null}
              <View style={styles.memberRow}>
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>{item.memberName}</Text>
                  <Text style={styles.metaText}>
                    Paid {formatAmount(item.amountPaid)} of{" "}
                    {formatAmount(item.amountDue)}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end", gap: 6 }}>
                  <Text style={dueStatusStyle(item.status)}>
                    {dueStatusLabel(item.status)}
                  </Text>
                  {item.memberId === currentMemberId &&
                  (item.status === "pending" || item.status === "overdue") ? (
                    <Pressable
                      onPress={() => startDuePayment(item)}
                      disabled={loading}
                      style={[
                        styles.inlineButton,
                        loading && styles.buttonDisabled,
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={`Pay dues for ${item.cycleLabel}`}
                    >
                      <Text style={styles.inlineButtonText}>Pay now</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            </View>
          ))}
        </View>
      ))}
    </>
  );
}
