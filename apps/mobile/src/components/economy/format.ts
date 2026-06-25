import type { TextStyle } from "react-native";
import { styles } from "../../styles";
import type { DueStatus, DuesFrequency } from "../../types";

// Rupee amount with Indian digit grouping (e.g. ₹1,00,000).
export const formatAmount = (value: number) =>
  `\u20b9${value.toLocaleString("en-IN")}`;

// Short, human date for ledger rows; falls back to the raw value if unparsable.
export const formatDateTime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

export const FREQUENCIES: { value: DuesFrequency; label: string }[] = [
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "one_time", label: "One-time" },
];

export const frequencyLabel = (value: DuesFrequency) =>
  FREQUENCIES.find((f) => f.value === value)?.label ?? value;

export const dueStatusStyle = (status: DueStatus): TextStyle => {
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

export const dueStatusLabel = (status: DueStatus) =>
  status.charAt(0).toUpperCase() + status.slice(1);
