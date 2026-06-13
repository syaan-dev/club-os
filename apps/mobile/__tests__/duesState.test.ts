import {
  applyPayment,
  canManageFinances,
  deriveDuesSummary,
  markOverdue,
  statusAfterPayment,
  waiveDue,
} from "../src/dues";
import type { MemberDue } from "../src/types";

const due = (over: Partial<MemberDue> = {}): MemberDue => ({
  id: "d1",
  memberId: "m1",
  memberName: "Mia",
  cycleLabel: "2026-06",
  dueDate: "2026-06-30",
  amountDue: 1000,
  amountPaid: 0,
  status: "pending",
  ...over,
});

describe("canManageFinances (role matrix)", () => {
  it.each([
    ["Owner", true],
    ["Treasurer", true],
    ["Secretary", false],
    ["Member", false],
    ["", false],
  ] as const)("role %s -> %s", (role, expected) => {
    expect(canManageFinances(role)).toBe(expected);
  });
});

describe("statusAfterPayment", () => {
  it("stays pending on a partial payment", () => {
    expect(statusAfterPayment(due(), 400)).toBe("pending");
  });

  it("becomes paid when fully covered", () => {
    expect(statusAfterPayment(due(), 1000)).toBe("paid");
  });

  it("keeps overdue state on a partial payment", () => {
    expect(statusAfterPayment(due({ status: "overdue" }), 400)).toBe("overdue");
  });

  it("becomes paid from overdue when fully covered", () => {
    expect(statusAfterPayment(due({ status: "overdue" }), 1000)).toBe("paid");
  });
});

describe("applyPayment", () => {
  it("accumulates partial payments without flipping to paid", () => {
    const first = applyPayment(due(), 200);
    expect(first.amountPaid).toBe(200);
    expect(first.status).toBe("pending");

    const second = applyPayment({ ...due(), ...first }, 300);
    expect(second.amountPaid).toBe(500);
    expect(second.status).toBe("pending");
  });

  it("marks paid and caps the payment at the outstanding balance", () => {
    const result = applyPayment(due({ amountPaid: 800 }), 500);
    expect(result.amountPaid).toBe(1000); // capped, not 1300
    expect(result.status).toBe("paid");
  });

  it("rejects non-positive payments", () => {
    expect(() => applyPayment(due(), 0)).toThrow();
    expect(() => applyPayment(due(), -5)).toThrow();
  });

  it("refuses to pay a waived due", () => {
    expect(() => applyPayment(due({ status: "waived" }), 100)).toThrow();
  });
});

describe("waiveDue", () => {
  it("waives an open due", () => {
    expect(waiveDue(due()).status).toBe("waived");
    expect(waiveDue(due({ status: "overdue" })).status).toBe("waived");
  });

  it("refuses to waive a paid due", () => {
    expect(() => waiveDue(due({ status: "paid", amountPaid: 1000 }))).toThrow();
  });
});

describe("markOverdue", () => {
  it("flips a pending due past its due date", () => {
    expect(markOverdue(due({ dueDate: "2026-06-01" }), "2026-06-10").status).toBe(
      "overdue",
    );
  });

  it("leaves a not-yet-due pending due untouched", () => {
    expect(markOverdue(due({ dueDate: "2026-07-01" }), "2026-06-10").status).toBe(
      "pending",
    );
  });

  it("never reopens paid or waived dues", () => {
    expect(
      markOverdue(due({ status: "paid", dueDate: "2026-06-01" }), "2026-06-10")
        .status,
    ).toBe("paid");
    expect(
      markOverdue(due({ status: "waived", dueDate: "2026-06-01" }), "2026-06-10")
        .status,
    ).toBe("waived");
  });
});

describe("deriveDuesSummary", () => {
  it("aggregates mixed dues states", () => {
    const summary = deriveDuesSummary([
      due({ id: "1", status: "paid", amountPaid: 1000 }),
      due({ id: "2", status: "paid", amountPaid: 1000 }),
      due({ id: "3", status: "overdue", amountPaid: 0 }),
      due({ id: "4", status: "overdue", amountPaid: 200 }),
      due({ id: "5", status: "waived", amountDue: 1000, amountPaid: 0 }),
    ]);

    expect(summary.totalBilled).toBe(5000);
    expect(summary.totalCollected).toBe(2200);
    expect(summary.totalOutstanding).toBe(2800);
    expect(summary.paidCount).toBe(2);
    expect(summary.unpaidCount).toBe(2); // both overdue
    expect(summary.overdueCount).toBe(2);
    expect(summary.waivedCount).toBe(1);
    expect(summary.collectionPercent).toBe(44);
  });

  it("returns zeroes for an empty list", () => {
    const summary = deriveDuesSummary([]);
    expect(summary.totalBilled).toBe(0);
    expect(summary.collectionPercent).toBe(0);
  });
});
