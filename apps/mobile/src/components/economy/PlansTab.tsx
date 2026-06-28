import { FlatList, Pressable, Text, View } from "react-native";
import { styles } from "../../styles";
import { useDues, useUi } from "../../context/domainHooks";
import type { DuesCycle, DuesPlan } from "../../types";
import { AppButton } from "../AppButton";
import { formatAmount, frequencyLabel } from "./format";

// "Plans" tab: dues plans and billing cycles management (leadership only).
// Open/edit actions are delegated to the parent so the form sheets live there.
export function PlansTab({
  onNewPlan,
  onEditPlan,
  onNewCycle,
  onEditCycle,
}: {
  onNewPlan: () => void;
  onEditPlan: (plan: DuesPlan) => void;
  onNewCycle: () => void;
  onEditCycle: (cycle: DuesCycle) => void;
}) {
  const {
    duesPlans,
    duesCycles,
    canManageDues,
    ensureAutoDuesCycles,
  } = useDues();
  const { loading } = useUi();

  if (!canManageDues) {
    return (
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Dues plans</Text>
        <Text style={styles.memberMeta}>
          Only an owner or treasurer can manage dues plans and cycles.
        </Text>
      </View>
    );
  }

  const activePlans = duesPlans.filter((plan) => plan.isActive);
  const archivedPlans = duesPlans.filter((plan) => !plan.isActive);

  const renderPlanItem = (item: DuesPlan) => (
    <Pressable
      style={styles.memberRow}
      onPress={() => onEditPlan(item)}
      accessibilityRole="button"
      accessibilityLabel={`Edit plan ${item.name}`}
    >
      <View style={styles.dueRowText}>
        <Text style={styles.memberName}>{item.name}</Text>
        <Text style={styles.memberMeta}>
          {formatAmount(item.amount)} · {frequencyLabel(item.frequency)} ·{" "}
          {item.graceDays}d grace
          {item.autoGenerate ? ` · Auto from ${item.startDate ?? "—"}` : ""}
        </Text>
      </View>
      <Text style={styles.headerChevron}>›</Text>
    </Pressable>
  );

  return (
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
            onPress={onNewPlan}
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
            data={activePlans}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            ListEmptyComponent={
              <Text style={styles.memberMeta}>No active plans.</Text>
            }
            renderItem={({ item }) => renderPlanItem(item)}
          />
        )}

        {archivedPlans.length > 0 ? (
          <>
            <Text style={[styles.subTitle, { marginTop: 16 }]}>Archived</Text>
            <FlatList
              data={archivedPlans}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
              renderItem={({ item }) => renderPlanItem(item)}
            />
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.sectionHeaderRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.cardTitle}>Billing cycles</Text>
            <Text style={styles.memberMeta}>
              Open a cycle to edit it, generate dues, or resend payment links.
            </Text>
          </View>
          <Pressable
            style={styles.inviteLink}
            onPress={onNewCycle}
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
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.memberRow}
                onPress={() => onEditCycle(item)}
                accessibilityRole="button"
                accessibilityLabel={`Manage cycle ${item.cycleLabel}`}
              >
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>
                    {item.planName} · {item.cycleLabel}
                  </Text>
                  <Text style={styles.memberMeta}>
                    {item.dueDate ? `Due ${item.dueDate}` : "No due date"}
                  </Text>
                </View>
                <Text style={styles.headerChevron}>›</Text>
              </Pressable>
            )}
          />
        )}
      </View>
    </>
  );
}
