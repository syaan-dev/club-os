import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Shared primitives used across every screen: layout containers, cards, inputs,
// buttons, member rows, status text, the segmented control and section headers.
export const baseStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  container: {
    padding: 20,
    gap: 14,
  },
  errorText: {
    color: colors.red,
    fontWeight: "600",
  },
  infoText: {
    color: colors.accent,
    fontWeight: "600",
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  subTitle: {
    marginTop: 10,
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceAlt,
  },
  button: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  memberMeta: {
    marginTop: 4,
    color: colors.textSecondary,
  },
  rowActions: {
    marginTop: 14,
    gap: 8,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderSoft,
  },
  paid: {
    color: colors.green,
    fontWeight: "600",
  },
  unpaid: {
    color: colors.red,
    fontWeight: "600",
  },
  warn: {
    color: colors.amber,
    fontWeight: "600",
  },
  muted: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dueRowText: {
    flex: 1,
    paddingRight: 8,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  inlineButton: {
    backgroundColor: colors.accentSoft,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  inlineButtonText: {
    color: colors.accent,
    fontWeight: "700",
  },
  fieldLabel: {
    color: colors.textSecondary,
    fontWeight: "600",
    fontSize: 13,
  },
  dateField: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: colors.surfaceAlt,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dateFieldText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dateFieldPlaceholder: {
    fontSize: 16,
    color: colors.textMuted,
  },
  dateFieldIcon: {
    fontSize: 16,
  },
  dateFieldClear: {
    fontSize: 20,
    color: colors.textMuted,
    fontWeight: "600",
  },
  dateFieldPickerActions: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingBottom: 4,
  },
  dateFieldCancel: {
    fontSize: 16,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dateFieldDone: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "700",
  },
  dropdownMenu: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.surface,
    overflow: "hidden",
  },
  dropdownOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 12,
  },
  dropdownOptionActive: {
    backgroundColor: colors.accentSoft,
  },
  dropdownOptionText: {
    fontSize: 16,
    color: colors.textPrimary,
  },
  dropdownOptionTextActive: {
    color: colors.accent,
    fontWeight: "700",
  },
  dropdownOptionCheck: {
    fontSize: 16,
    color: colors.accent,
    fontWeight: "700",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  badge: {
    alignSelf: "flex-start",
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 2,
    backgroundColor: colors.surfaceAlt,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  segmentText: {
    color: colors.textSecondary,
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  segmentBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    paddingHorizontal: 5,
    backgroundColor: colors.red,
    alignItems: "center",
    justifyContent: "center",
  },
  segmentBadgeText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "700",
  },
});
