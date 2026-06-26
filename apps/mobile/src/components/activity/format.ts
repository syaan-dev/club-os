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

export const meetingStatusColor = (status: MeetingStatus) => {
  if (status === "completed") {
    return colors.accent;
  }
  if (status === "cancelled") {
    return colors.red;
  }
  return colors.green;
};
