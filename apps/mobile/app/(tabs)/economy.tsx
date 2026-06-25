import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { styles } from "../../src/styles";
import { useDues } from "../../src/context/domainHooks";
import type { DuesCycle, DuesPlan } from "../../src/types";
import { TabScreenShell } from "../../src/components/TabScreenShell";
import { DuesTab } from "../../src/components/economy/DuesTab";
import { LedgerTab } from "../../src/components/economy/LedgerTab";
import { PlansTab } from "../../src/components/economy/PlansTab";
import { PlanFormModal } from "../../src/components/economy/PlanFormModal";
import { CycleFormModal } from "../../src/components/economy/CycleFormModal";
import { LedgerFormModal } from "../../src/components/economy/LedgerFormModal";

type EconomyTab = "dues" | "ledger" | "plans";

const ECONOMY_TABS: { value: EconomyTab; label: string }[] = [
  { value: "dues", label: "Dues" },
  { value: "ledger", label: "Ledger" },
  { value: "plans", label: "Plans" },
];

export default function EconomyScreen() {
  const { canManageDues, ensureAutoDuesCycles } = useDues();

  const [tab, setTab] = useState<EconomyTab>("dues");

  // Ledger record sheet is leadership-only, mirroring the Activity tab.
  const [ledgerFormOpen, setLedgerFormOpen] = useState(false);

  // Plan + cycle create/edit sheets follow the Activity "＋ New" pattern.
  const [planFormOpen, setPlanFormOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DuesPlan | null>(null);
  const [cycleFormOpen, setCycleFormOpen] = useState(false);
  const [editingCycle, setEditingCycle] = useState<DuesCycle | null>(null);

  // Roll auto-billing plans forward whenever a leader opens the Economy tab.
  useEffect(() => {
    if (canManageDues) {
      void ensureAutoDuesCycles();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openPlanForm = (plan?: DuesPlan) => {
    setEditingPlan(plan ?? null);
    setPlanFormOpen(true);
  };

  const openCycleForm = (cycle?: DuesCycle) => {
    setEditingCycle(cycle ?? null);
    setCycleFormOpen(true);
  };

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

      {tab === "dues" ? <DuesTab /> : null}

      {tab === "ledger" ? (
        <LedgerTab onAddTransaction={() => setLedgerFormOpen(true)} />
      ) : null}

      {tab === "plans" ? (
        <PlansTab
          onNewPlan={() => openPlanForm()}
          onEditPlan={openPlanForm}
          onNewCycle={() => openCycleForm()}
          onEditCycle={openCycleForm}
        />
      ) : null}

      <PlanFormModal
        visible={planFormOpen}
        editingPlan={editingPlan}
        onClose={() => {
          setPlanFormOpen(false);
          setEditingPlan(null);
        }}
      />

      <CycleFormModal
        visible={cycleFormOpen}
        editingCycle={editingCycle}
        onClose={() => {
          setCycleFormOpen(false);
          setEditingCycle(null);
        }}
      />

      <LedgerFormModal
        visible={ledgerFormOpen}
        onClose={() => setLedgerFormOpen(false)}
      />
    </TabScreenShell>
  );
}
