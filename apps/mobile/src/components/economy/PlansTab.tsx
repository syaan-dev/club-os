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
    generateDues,
    ensureAutoDuesCycles,
    sendDuePaymentLinks,
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
            data={duesPlans}
            keyExtractor={(item) => item.id}
            scrollEnabled={false}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            renderItem={({ item }) => (
              <Pressable
                style={styles.memberRow}
                onPress={() => onEditPlan(item)}
                accessibilityRole="button"
                accessibilityLabel={`Edit plan ${item.name}`}
              >
                <View style={styles.dueRowText}>
                  <Text style={styles.memberName}>{item.name}</Text>
                  <Text style={styles.memberMeta}>
                    {formatAmount(item.amount)} ·{" "}
                    {frequencyLabel(item.frequency)} · {item.graceDays}d grace
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
              Open a cycle, then generate dues to bill every active member.
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
              <View style={styles.memberRow}>
                <Pressable
                  style={styles.dueRowText}
                  onPress={() => onEditCycle(item)}
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
                <View style={{ alignItems: "flex-end", gap: 6 }}>
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
                  <Pressable
                    onPress={() => sendDuePaymentLinks({ cycleId: item.id })}
                    disabled={loading}
                    style={[
                      styles.inlineButton,
                      loading && styles.buttonDisabled,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={`Resend payment links for ${item.cycleLabel}`}
                  >
                    <Text style={styles.inlineButtonText}>Resend links</Text>
                  </Pressable>
                </View>
              </View>
            )}
          />
        )}
      </View>
    </>
  );
}
