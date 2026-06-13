import { ActivityIndicator, FlatList, Text, View } from "react-native";
import type { TextStyle } from "react-native";
import { styles } from "../src/styles";
import { useClubOs } from "../src/ClubOsContext";
import type { DueStatus } from "../src/types";
import { AppButton } from "../src/components/AppButton";
import { ScreenShell } from "../src/components/ScreenShell";

const formatAmount = (value: number) => `\u20b9${value.toLocaleString("en-IN")}`;

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

export default function HubScreen() {
  const {
    members,
    memberDues,
    duesSummary,
    duesLoading,
    refreshDues,
    navigate,
  } = useClubOs();

  const metrics: { label: string; value: string | number }[] = [
    { label: "Total members", value: members.length },
    { label: "Total billed", value: formatAmount(duesSummary.totalBilled) },
    { label: "Collected", value: formatAmount(duesSummary.totalCollected) },
    {
      label: "Outstanding",
      value: formatAmount(duesSummary.totalOutstanding),
    },
    { label: "Collection health", value: `${duesSummary.collectionPercent}%` },
    { label: "Overdue dues", value: duesSummary.overdueCount },
  ];

  return (
    <ScreenShell>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>4. Club operations hub</Text>
        <Text style={styles.memberMeta}>
          Member lifecycle and dues readiness at a glance.
        </Text>
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
            No dues have been assigned to members yet. Create a dues plan and
            cycle to start tracking collections.
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
          label={duesLoading ? "Refreshing dues..." : "Refresh dues"}
          onPress={refreshDues}
          disabled={duesLoading}
        />
        <AppButton
          label="Back to membership desk"
          onPress={() => navigate("members")}
        />
      </View>
    </ScreenShell>
  );
}
