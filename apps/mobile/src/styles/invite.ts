import { StyleSheet } from "react-native";
import { colors } from "./colors";

// The invite bottom sheet (contact picker): search, contact rows, checkboxes,
// the send footer, the empty state and the large share-QR fallback.
export const inviteStyles = StyleSheet.create({
  inviteSheetSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: -6,
  },
  inviteSearch: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.textPrimary,
    fontSize: 14,
  },
  contactPickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  contactCheckbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  contactCheckboxOn: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  contactCheckboxTick: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  contactPickName: {
    fontSize: 14,
    color: colors.textPrimary,
  },
  contactPickPhone: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 1,
  },
  contactStatusPill: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  contactStatusPillText: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  inviteSheetFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 12,
    marginTop: 4,
  },
  inviteSheetCount: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  inviteSendBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  inviteSendBtnDisabled: {
    borderColor: colors.border,
  },
  inviteSendBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  inviteSendBtnTextDisabled: {
    color: colors.textMuted,
  },
  inviteSheetAltLink: {
    alignSelf: "center",
    paddingVertical: 6,
  },
  inviteSheetAltLinkText: {
    color: colors.accent,
    fontSize: 13,
  },
  inviteEmptyState: {
    alignItems: "center",
    gap: 10,
    paddingVertical: 24,
  },
  inviteEmptyIcon: {
    fontSize: 40,
  },
  inviteEmptyHeading: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  inviteEmptyBody: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  inviteSheetPrimaryBtn: {
    borderWidth: 1,
    borderColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    alignSelf: "stretch",
  },
  inviteSheetPrimaryBtnText: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: "600",
  },
  inviteSheetGhostBtn: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
    alignSelf: "stretch",
  },
  inviteSheetGhostBtnText: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  shareQrLarge: {
    width: 180,
    height: 180,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
  },
  shareQrLargeGlyph: {
    fontSize: 120,
    color: colors.textPrimary,
  },
  shareLinkCentered: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
