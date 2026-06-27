import { colors } from "../../styles";
import type { MeetingStatus } from "../../types";

// Short, human date used across the Activity tab lists and detail views.
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

// Like formatDateTime but also includes the time of day. Used for meetings,
// which are scheduled at a specific date and time.
export const formatDateAndTime = (value: string) => {
  if (!value) {
    return "";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

// Relative countdown such as "in an hour", "tomorrow", "in 3 days". Used to
// show how long an open poll or upcoming meeting has left without spelling out
// a full date. Falls back to minutes/hours when under a day so a poll closing
// soon reads "closes in an hour" rather than a vague "today". Returns null for
// blank/unparsable input.
export const formatCountdown = (value: string | null) => {
  if (!value) {
    return null;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const diff = date.getTime() - Date.now();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  if (diff < minuteMs) {
    return "now";
  }
  if (diff < hourMs) {
    const minutes = Math.round(diff / minuteMs);
    return minutes === 1 ? "in a minute" : `in ${minutes} minutes`;
  }
  if (diff < dayMs) {
    // Cap at 23 so the 23.5–24h sliver never reads "in 24 hours".
    const hours = Math.min(23, Math.round(diff / hourMs));
    return hours === 1 ? "in an hour" : `in ${hours} hours`;
  }
  const days = Math.round(diff / dayMs);
  if (days === 1) {
    return "tomorrow";
  }
  if (days <= 30) {
    return `in ${days} days`;
  }
  return formatDateTime(value);
};

export const meetingStatusColor = (status: MeetingStatus) => {
  if (status === "completed") {
    return colors.accent;
  }
  if (status === "cancelled") {
    return colors.red;
  }
  return colors.green;
};
