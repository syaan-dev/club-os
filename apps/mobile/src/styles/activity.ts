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
