// Dues-domain mutations (plans, cycles, generation, transactions, payment
// links). Extracted from ClubOsContext so the provider stays lean. Each action
// validates, writes to Supabase, then reloads the affected slice via the
// provided loaders.
//
// State + loaders remain owned by the provider; this hook receives them (plus
// the toast/loading helpers) as `deps` and returns the action callbacks.

import * as WebBrowser from "expo-web-browser";

import { supabase } from "../../lib/supabase";
import { canManageFinances } from "../dues";
import type {
  DuesFrequency,
  DuesPlan,
  MemberDue,
  Member,
  TransactionType,
} from "../types";

type DuesActionsDeps = {
  clubId: string;
  currentRole: Member["role"] | "";
  currentMemberId: string;
  duesPlans: DuesPlan[];
  setErrorText: (message: string) => void;
  setInfoText: (message: string) => void;
  setLoading: (value: boolean) => void;
  loadDues: (clubId: string) => Promise<void>;
  loadDuesPlans: (clubId: string) => Promise<void>;
  loadDuesCycles: (clubId: string) => Promise<void>;
  loadLedger: (clubId: string) => Promise<void>;
  refreshDues: () => Promise<void>;
};

export function useDuesActions(deps: DuesActionsDeps) {
  const {
    clubId,
    currentRole,
    currentMemberId,
    duesPlans,
    setErrorText,
    setInfoText,
    setLoading,
    loadDues,
    loadDuesPlans,
    loadDuesCycles,
    loadLedger,
    refreshDues,
  } = deps;

  const ensureAutoDuesCycles = async (options?: { announce?: boolean }) => {
    const announce = options?.announce ?? false;
    if (!clubId) {
      return;
    }
    if (!canManageFinances(currentRole)) {
      return;
    }

    const autoPlans = duesPlans.filter(
      (plan) => plan.autoGenerate && plan.startDate,
    );
    if (autoPlans.length === 0) {
      if (announce) {
        setInfoText("No auto-billing plans set up yet.");
      }
      return;
    }

    let created = 0;
    for (const plan of autoPlans) {
      const { data, error } = await supabase.rpc(
        "ensure_dues_cycles_for_plan",
        { _plan_id: plan.id },
      );
      if (error) {
        setErrorText(error.message);
        return;
      }
      created += typeof data === "number" ? data : 0;
    }

    if (created > 0) {
      await Promise.all([loadDuesCycles(clubId), loadDues(clubId)]);
      setInfoText(
        `Auto-billing created ${created} new cycle${created === 1 ? "" : "s"}.`,
      );
    } else if (announce) {
      setInfoText("Auto-billing is up to date — no new cycles.");
    }
  };

  const createDuesPlan = async (input: {
    name: string;
    amount: number;
    frequency: DuesFrequency;
    graceDays: number;
    autoGenerate: boolean;
    startDate: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can create dues plans.");
      return;
    }

    const name = input.name.trim();
    if (!name) {
      setErrorText("Plan name is required.");
      return;
    }
    if (!(input.amount > 0)) {
      setErrorText("Amount must be greater than zero.");
      return;
    }
    if (!Number.isInteger(input.graceDays) || input.graceDays < 0) {
      setErrorText("Grace days must be a non-negative whole number.");
      return;
    }
    const startDate = input.startDate.trim();
    if (input.autoGenerate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setErrorText("Auto-billing needs a start date in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("dues_plans").insert({
      club_id: clubId,
      name,
      amount: input.amount,
      frequency: input.frequency,
      grace_days: input.graceDays,
      auto_generate: input.autoGenerate,
      start_date: input.autoGenerate ? startDate : null,
      created_by: currentMemberId,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesPlans(clubId);
    if (input.autoGenerate) {
      await ensureAutoDuesCycles();
    }
    setInfoText(`Dues plan "${name}" created.`);
  };

  const updateDuesPlan = async (
    planId: string,
    input: {
      name: string;
      amount: number;
      frequency: DuesFrequency;
      graceDays: number;
      autoGenerate: boolean;
      startDate: string;
    },
  ) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can edit dues plans.");
      return;
    }

    const name = input.name.trim();
    if (!name) {
      setErrorText("Plan name is required.");
      return;
    }
    if (!(input.amount > 0)) {
      setErrorText("Amount must be greater than zero.");
      return;
    }
    if (!Number.isInteger(input.graceDays) || input.graceDays < 0) {
      setErrorText("Grace days must be a non-negative whole number.");
      return;
    }
    const startDate = input.startDate.trim();
    if (input.autoGenerate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setErrorText("Auto-billing needs a start date in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("dues_plans")
      .update({
        name,
        amount: input.amount,
        frequency: input.frequency,
        grace_days: input.graceDays,
        auto_generate: input.autoGenerate,
        start_date: input.autoGenerate ? startDate : null,
      })
      .eq("id", planId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesPlans(clubId);
    if (input.autoGenerate) {
      await ensureAutoDuesCycles();
    }
    setInfoText(`Dues plan "${name}" updated.`);
  };

  // Archive (active=false) or reactivate (active=true) a dues plan. Archiving
  // stops all future billing but keeps the plan's cycles and history intact;
  // it never deletes data.
  const setDuesPlanActive = async (planId: string, active: boolean) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can archive dues plans.");
      return;
    }

    const plan = duesPlans.find((item) => item.id === planId);

    setLoading(true);
    const { error } = await supabase
      .from("dues_plans")
      .update({ is_active: active })
      .eq("id", planId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesPlans(clubId);
    const label = plan?.name ?? "Dues plan";
    setInfoText(active ? `"${label}" reactivated.` : `"${label}" archived.`);
  };

  const createDuesCycle = async (input: {
    duesPlanId: string;
    cycleLabel: string;
    dueDate: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can create dues cycles.");
      return;
    }
    if (!input.duesPlanId) {
      setErrorText("Select a dues plan for this cycle.");
      return;
    }
    const cycleLabel = input.cycleLabel.trim();
    if (!cycleLabel) {
      setErrorText("Cycle label is required (e.g. 2026-06).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      setErrorText("Due date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("dues_cycles").insert({
      club_id: clubId,
      dues_plan_id: input.duesPlanId,
      cycle_label: cycleLabel,
      due_date: input.dueDate,
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesCycles(clubId);
    setInfoText(`Dues cycle "${cycleLabel}" created.`);
  };

  const updateDuesCycle = async (
    cycleId: string,
    input: {
      duesPlanId: string;
      cycleLabel: string;
      dueDate: string;
    },
  ) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can edit dues cycles.");
      return;
    }
    if (!input.duesPlanId) {
      setErrorText("Select a dues plan for this cycle.");
      return;
    }
    const cycleLabel = input.cycleLabel.trim();
    if (!cycleLabel) {
      setErrorText("Cycle label is required (e.g. 2026-06).");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) {
      setErrorText("Due date must be in YYYY-MM-DD format.");
      return;
    }

    setLoading(true);
    const { error } = await supabase
      .from("dues_cycles")
      .update({
        dues_plan_id: input.duesPlanId,
        cycle_label: cycleLabel,
        due_date: input.dueDate,
      })
      .eq("id", cycleId)
      .eq("club_id", clubId);
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadDuesCycles(clubId);
    setInfoText(`Dues cycle "${cycleLabel}" updated.`);
  };

  const generateDues = async (cycleId: string) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can generate dues.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.rpc("generate_dues_for_cycle", {
      _cycle_id: cycleId,
    });

    if (error) {
      setLoading(false);
      setErrorText(error.message);
      return;
    }

    await loadDues(clubId);
    setLoading(false);
    const count = typeof data === "number" ? data : 0;
    setInfoText(
      count > 0
        ? `Billed ${count} member${count === 1 ? "" : "s"} for this cycle.`
        : "No new dues to generate — everyone is already billed.",
    );
  };

  const recordTransaction = async (input: {
    type: TransactionType;
    amount: number;
    category: string;
    paymentMethod: string;
    description: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId || !currentMemberId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can record transactions.");
      return;
    }
    if (!(input.amount > 0)) {
      setErrorText("Amount must be greater than zero.");
      return;
    }
    const category = input.category.trim();
    if (!category) {
      setErrorText("Category is required.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.from("transactions").insert({
      club_id: clubId,
      member_id: null,
      recorded_by: currentMemberId,
      type: input.type,
      amount: input.amount,
      category,
      payment_method: input.paymentMethod.trim() || "UPI",
      status: "completed",
      description: input.description.trim() || null,
      source: "manual",
    });
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    await loadLedger(clubId);
    setInfoText(
      `${input.type === "income" ? "Income" : "Expense"} of ${input.amount} recorded.`,
    );
  };

  // Member taps "Pay now": mint (or reuse) a Stripe Payment Link for their due
  // and open it in the in-app browser. Stripe confirms via webhook, so we just
  // refresh dues when the browser closes.
  const startDuePayment = async (due: MemberDue) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "create-due-payment-link",
      { body: { dueId: due.id } },
    );
    setLoading(false);

    const url = (data as { url?: string } | null)?.url;
    if (error || !url) {
      setErrorText(error?.message ?? "Could not start the payment.");
      return;
    }

    await WebBrowser.openBrowserAsync(url);
    await refreshDues();
  };

  // Manager action: ask the backend to create and push payment links for a
  // whole billing cycle or a single due.
  const sendDuePaymentLinks = async (input: {
    cycleId?: string;
    dueId?: string;
  }) => {
    setErrorText("");
    setInfoText("");

    if (!clubId) {
      setErrorText("Open a club first.");
      return;
    }
    if (!canManageFinances(currentRole)) {
      setErrorText("Only an owner or treasurer can send payment links.");
      return;
    }

    setLoading(true);
    const { data, error } = await supabase.functions.invoke(
      "send-due-payment-links",
      { body: input },
    );
    setLoading(false);

    if (error) {
      setErrorText(error.message);
      return;
    }

    const sent = (data as { sent?: number } | null)?.sent ?? 0;
    setInfoText(`Sent ${sent} payment link${sent === 1 ? "" : "s"}.`);
  };

  return {
    ensureAutoDuesCycles,
    createDuesPlan,
    updateDuesPlan,
    setDuesPlanActive,
    createDuesCycle,
    updateDuesCycle,
    generateDues,
    recordTransaction,
    startDuePayment,
    sendDuePaymentLinks,
  };
}
