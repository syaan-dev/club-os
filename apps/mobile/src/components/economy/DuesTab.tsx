import { ActivityIndicator, FlatList, Pressable, Text, View } from "react-native";
import { styles } from "../../styles";
import { useDues, useMembers, useUi } from "../../context/domainHooks";
import {
  dueStatusLabel,
  dueStatusStyle,
  formatAmount,
} from "./format";

// "Dues" tab: collection metrics plus the per-member dues list, with an inline
// "Pay now" action on the current member's own pending/overdue rows.
export function DuesTab() {
  const { memberDues, duesSummary, duesLoading, startDuePayment } = useDues();
  const { members, currentMemberId } = useMembers();
  const { loading } = useUi();

  const metrics: { label: string; value: string | number }[] = [
    { label: "Total members", value: members.length },
    { label: "Total billed", value: formatAmount(duesSummary.totalBilled) },
    { label: "Collected", value: formatAmount(duesSummary.totalCollected) },
    { label: "Outstanding", value: formatAmount(duesSummary.totalOutstanding) },
    { label: "Collection health", value: `${duesSummary.collectionPercent}%` },
    { label: "Overdue dues", value: duesSummary.overdueCount },
  ];

  return (
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
          )}
        />
      )}
    </View>
  );
}
