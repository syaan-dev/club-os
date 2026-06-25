import { styles } from "../src/styles";
import {
  FREQUENCIES,
  dueStatusLabel,
  dueStatusStyle,
  formatAmount,
  formatDateTime,
  frequencyLabel,
} from "../src/components/economy/format";

describe("formatAmount", () => {
  it("prefixes the rupee sign and groups with Indian digits", () => {
    expect(formatAmount(100000)).toBe("\u20b91,00,000");
    expect(formatAmount(0)).toBe("\u20b90");
    expect(formatAmount(500)).toBe("\u20b9500");
  });
});

describe("formatDateTime", () => {
  it("returns empty string for blank input", () => {
    expect(formatDateTime("")).toBe("");
  });

  it("returns the raw value when unparsable", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
  });

  it("renders a short day/month/year date for valid input", () => {
    const out = formatDateTime("2026-06-30T10:00:00.000Z");
    expect(out).toMatch(/\d{1,2} \w{3} \d{4}/);
    expect(out).toContain("2026");
  });
});

describe("frequencyLabel / FREQUENCIES", () => {
  it("exposes the supported frequencies", () => {
    expect(FREQUENCIES.map((f) => f.value)).toEqual([
      "monthly",
      "quarterly",
      "one_time",
    ]);
  });

  it("maps each frequency value to its label", () => {
    expect(frequencyLabel("monthly")).toBe("Monthly");
    expect(frequencyLabel("quarterly")).toBe("Quarterly");
    expect(frequencyLabel("one_time")).toBe("One-time");
  });
});

describe("dueStatusStyle", () => {
  it("maps each status to its themed style", () => {
    expect(dueStatusStyle("paid")).toBe(styles.paid);
    expect(dueStatusStyle("overdue")).toBe(styles.unpaid);
    expect(dueStatusStyle("waived")).toBe(styles.muted);
    expect(dueStatusStyle("pending")).toBe(styles.warn);
  });
});

describe("dueStatusLabel", () => {
  it("capitalizes the status", () => {
    expect(dueStatusLabel("paid")).toBe("Paid");
    expect(dueStatusLabel("overdue")).toBe("Overdue");
    expect(dueStatusLabel("pending")).toBe("Pending");
    expect(dueStatusLabel("waived")).toBe("Waived");
  });
});
