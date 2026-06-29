// Data-access for the dues domain: member dues, plans, billing cycles and the
// income/expense ledger. Pure async fetchers returning mapped domain objects.

import { supabase } from "../../lib/supabase";
import type {
  DuesCycle,
  DuesFrequency,
  DuesPlan,
  LedgerEntry,
  LedgerSummary,
  MemberDue,
  TransactionType,
} from "../types";

export async function fetchMemberDues(clubId: string): Promise<MemberDue[]> {
  const { data, error } = await supabase
    .from("member_dues")
    .select(
      "id,member_id,amount_due,amount_paid,status,members(name),dues_cycles(cycle_label,due_date,dues_plans(name))",
    )
    .eq("club_id", clubId)
    .order("created_at", { ascending: true });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => {
    const memberRel = Array.isArray(row.members) ? row.members[0] : row.members;
    const cycleRel = Array.isArray(row.dues_cycles)
      ? row.dues_cycles[0]
      : row.dues_cycles;
    const planRel = Array.isArray(cycleRel?.dues_plans)
      ? cycleRel?.dues_plans[0]
      : cycleRel?.dues_plans;
    return {
      id: row.id,
      memberId: row.member_id,
      memberName: memberRel?.name ?? "Member",
      planName: planRel?.name ?? "Dues",
      cycleLabel: cycleRel?.cycle_label ?? "Cycle",
      dueDate: cycleRel?.due_date ?? "",
      amountDue: Number(row.amount_due ?? 0),
      amountPaid: Number(row.amount_paid ?? 0),
      status: row.status,
    } satisfies MemberDue;
  });
}

export async function fetchDuesPlans(clubId: string): Promise<DuesPlan[]> {
  const { data, error } = await supabase
    .from("dues_plans")
    .select("id,name,amount,frequency,grace_days,auto_generate,start_date,is_active")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    name: row.name,
    amount: Number(row.amount ?? 0),
    frequency: row.frequency as DuesFrequency,
    graceDays: Number(row.grace_days ?? 0),
    autoGenerate: Boolean(row.auto_generate),
    startDate: row.start_date ?? null,
    isActive: row.is_active !== false,
  }));
}

export async function fetchDuesCycles(clubId: string): Promise<DuesCycle[]> {
  const { data, error } = await supabase
    .from("dues_cycles")
    .select("id,dues_plan_id,cycle_label,due_date,dues_plans(name)")
    .eq("club_id", clubId)
    .order("due_date", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => {
    const planRel = Array.isArray(row.dues_plans)
      ? row.dues_plans[0]
      : row.dues_plans;
    return {
      id: row.id,
      duesPlanId: row.dues_plan_id,
      planName: planRel?.name ?? "Plan",
      cycleLabel: row.cycle_label,
      dueDate: row.due_date ?? "",
    } satisfies DuesCycle;
  });
}

export async function fetchLedger(clubId: string): Promise<LedgerEntry[]> {
  const { data, error } = await supabase
    .from("ledger_entries")
    .select(
      "id,type,amount,category,method,source,created_at,member:members!ledger_entries_member_id_fkey(name)",
    )
    .eq("club_id", clubId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((row: any) => {
    const member = Array.isArray(row.member) ? row.member[0] : row.member;
    return {
      id: row.id,
      type: row.type as TransactionType,
      amount: Number(row.amount ?? 0),
      category: row.category ?? "",
      method: row.method ?? "UPI",
      source: row.source ?? "manual",
      memberName: member?.name ?? null,
      createdAt: row.created_at ?? "",
    };
  });
}

export async function fetchLedgerSummary(
  clubId: string,
): Promise<LedgerSummary | null> {
  const { data, error } = await supabase.rpc("club_ledger_summary", {
    _club_id: clubId,
  });

  if (error || !data) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) {
    return null;
  }

  return {
    income: Number(row.income ?? 0),
    expense: Number(row.expense ?? 0),
    net: Number(row.net ?? 0),
    entryCount: Number(row.entry_count ?? 0),
  };
}
