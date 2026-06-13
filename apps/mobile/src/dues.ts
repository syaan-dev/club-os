// Pure, dependency-free dues logic. Mirrors the server-side dues lifecycle
// implemented in the `record_due_payment`, `waive_member_due`, and
// `mark_overdue_dues` Postgres RPCs so the client can reason about state
// transitions without a round-trip. Kept free of React/Supabase imports so it
// can be unit tested in isolation.
import type { DuesSummary, MemberDue, Member } from "./types";

export type DueState = Pick<MemberDue, "amountDue" | "amountPaid" | "status">;

// Roles permitted to manage finances (dues plans, cycles, ledger). Mirrors the
// `*_manage_owner_treasurer` RLS policies and the Edge Function role guards.
export function canManageFinances(role: Member["role"] | ""): boolean {
  return role === "Owner" || role === "Treasurer";
}

// Resolves the status a due should hold after a payment is applied. A due is
// only "paid" once the full amount is collected; partial payments stay in their
// prior open state (pending/overdue).
export function statusAfterPayment(
  due: DueState,
  newAmountPaid: number,
): MemberDue["status"] {
  if (newAmountPaid >= due.amountDue) {
    return "paid";
  }
  return due.status === "overdue" ? "overdue" : "pending";
}

// Applies a payment, capping the recorded amount at the outstanding balance and
// never allowing a negative/zero payment. Returns a new DueState (immutable).
export function applyPayment(due: DueState, amount: number): DueState {
  if (!(amount > 0)) {
    throw new Error("Payment amount must be positive");
  }
  if (due.status === "waived") {
    throw new Error("Cannot pay a waived due");
  }
  const remaining = Math.max(due.amountDue - due.amountPaid, 0);
  const applied = Math.min(amount, remaining);
  const amountPaid = due.amountPaid + applied;
  return {
    amountDue: due.amountDue,
    amountPaid,
    status: statusAfterPayment(due, amountPaid),
  };
}

// Waives a due. Only open dues (pending/overdue) may be waived.
export function waiveDue(due: DueState): DueState {
  if (due.status === "paid") {
    throw new Error("Cannot waive a paid due");
  }
  return { ...due, status: "waived" };
}

// Transitions a pending due to overdue when its due date has passed. Paid and
// waived dues are never reopened.
export function markOverdue(
  due: DueState & { dueDate: string },
  today: string,
): DueState {
  if (due.status === "pending" && due.dueDate && due.dueDate < today) {
    return { amountDue: due.amountDue, amountPaid: due.amountPaid, status: "overdue" };
  }
  return { amountDue: due.amountDue, amountPaid: due.amountPaid, status: due.status };
}

// Aggregates a list of member dues into the dashboard summary. A member is
// "unpaid" when they have any open (pending/overdue) due.
export function deriveDuesSummary(dues: MemberDue[]): DuesSummary {
  const totalBilled = dues.reduce((sum, due) => sum + due.amountDue, 0);
  const totalCollected = dues.reduce((sum, due) => sum + due.amountPaid, 0);
  const totalOutstanding = Math.max(totalBilled - totalCollected, 0);
  return {
    totalBilled,
    totalCollected,
    totalOutstanding,
    paidCount: dues.filter((due) => due.status === "paid").length,
    unpaidCount: dues.filter(
      (due) => due.status === "pending" || due.status === "overdue",
    ).length,
    overdueCount: dues.filter((due) => due.status === "overdue").length,
    waivedCount: dues.filter((due) => due.status === "waived").length,
    collectionPercent:
      totalBilled === 0
        ? 0
        : Math.round((totalCollected / totalBilled) * 100),
  };
}
