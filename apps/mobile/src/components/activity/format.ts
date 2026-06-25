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

export const meetingStatusColor = (status: MeetingStatus) => {
  if (status === "completed") {
    return colors.accent;
  }
  if (status === "cancelled") {
    return colors.red;
  }
  return colors.green;
};
