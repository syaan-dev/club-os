import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Activity tab: meeting status pills, poll option bars and the email-style
// notice list + detail reader.
export const activityStyles = StyleSheet.create({
  statusPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  // Action-named section heading: "NEEDS YOUR VOTE  [1] ───────".
  sectionHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 18,
    marginBottom: 2,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: colors.textSecondary,
    textTransform: "uppercase",
  },
  sectionCountBadge: {
    minWidth: 22,
    alignItems: "center",
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 1,
    backgroundColor: colors.surfaceAlt,
  },
  sectionCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  sectionRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 2,
  },
  // Card around each item that still wants the member's action.
  activeCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    padding: 14,
    marginTop: 10,
    backgroundColor: colors.surface,
  },
  activeCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  activeCardTopLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  openPill: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 3,
    backgroundColor: "rgba(22, 163, 74, 0.14)",
  },
  openPillText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    color: colors.green,
    textTransform: "uppercase",
  },
  countdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  countdownText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  itemQuestion: {
    fontSize: 18,
    fontWeight: "800",
    color: colors.textPrimary,
  },
  itemMeta: {
    marginTop: 2,
    fontSize: 13,
    color: colors.textMuted,
  },
  changeHint: {
    marginTop: 10,
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  // RSVP control: three segmented yes/no/maybe buttons on an upcoming meeting.
  rsvpRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  rsvpButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: "center",
    backgroundColor: colors.surface,
  },
  rsvpButtonYes: {
    borderColor: colors.green,
    backgroundColor: "rgba(22, 163, 74, 0.12)",
  },
  rsvpButtonNo: {
    borderColor: colors.red,
    backgroundColor: "rgba(220, 38, 38, 0.10)",
  },
  rsvpButtonMaybe: {
    borderColor: colors.amber,
    backgroundColor: "rgba(217, 119, 6, 0.12)",
  },
  rsvpButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  rsvpButtonTextYes: {
    color: colors.green,
  },
  rsvpButtonTextNo: {
    color: colors.red,
  },
  rsvpButtonTextMaybe: {
    color: colors.amber,
  },
  rsvpSummary: {
    marginTop: 8,
    fontSize: 13,
    color: colors.textSecondary,
  },
  // Standard separation before an unrelated metadata line (e.g. "Organised by").
  organiserMeta: {
    marginTop: 14,
    color: colors.textMuted,
    fontSize: 12,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  optionCheck: {
    color: colors.accent,
    fontWeight: "800",
    fontSize: 15,
  },
  optionRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.border,
  },
  // Collapsed one-line history row (closed polls / past meetings).
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    paddingVertical: 12,
  },
  collapsedMain: {
    flex: 1,
  },
  collapsedTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  collapsedMeta: {
    marginTop: 2,
    fontSize: 12,
    color: colors.textMuted,
  },
  collapsedRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 0,
  },
  collapsedSummary: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: "500",
    textAlign: "right",
  },
  collapsedChevron: {
    fontSize: 14,
    color: colors.textMuted,
  },
  pollOption: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginTop: 8,
    overflow: "hidden",
  },
  pollOptionActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  pollOptionFill: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: colors.surfaceAlt,
  },
  pollOptionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  pollOptionLabel: {
    color: colors.textPrimary,
    fontWeight: "600",
    flexShrink: 1,
    paddingRight: 8,
  },
  pollOptionCount: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 12,
    gap: 4,
  },
  noticeUnreadCol: {
    width: 16,
    paddingTop: 6,
    alignItems: "center",
  },
  noticeTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  noticeSubject: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  noticeSubjectUnread: {
    fontWeight: "800",
  },
  noticeSender: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 1,
  },
  noticePreview: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  noticeDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  noticeDetailSubject: {
    fontSize: 20,
    fontWeight: "800",
    color: colors.textPrimary,
    marginBottom: 6,
  },
  noticeDetailMeta: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  noticeDetailBody: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.textPrimary,
    marginTop: 12,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
