import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Setup tab: settings rows, the email verification status row, the role-edit
// sheet rows/pills and the destructive (leave club) button.
export const setupStyles = StyleSheet.create({
  setupRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  setupRowLabel: {
    fontSize: 15,
    color: colors.textPrimary,
    fontWeight: "500",
  },
  setupRowMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  sheetLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: -4,
  },
  emailStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
    marginTop: -2,
  },
  emailStatusVerified: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.green,
  },
  emailStatusPending: {
    fontSize: 13,
    color: colors.textMuted,
    flexShrink: 1,
  },
  emailStatusAction: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  sheetMemberRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    gap: 8,
  },
  rolePillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  rolePill: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  rolePillActive: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  rolePillText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  rolePillTextActive: {
    color: colors.accent,
    fontWeight: "600",
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: colors.red,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  dangerButtonText: {
    color: colors.red,
    fontSize: 15,
    fontWeight: "600",
  },
});
