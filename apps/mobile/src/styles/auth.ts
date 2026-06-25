import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Auth + onboarding screens: the centered card layout, headings, the avatar
// picker and the consent checkbox row.
export const authStyles = StyleSheet.create({
  authSafe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  authScroll: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  authLogoWrap: {
    alignItems: "center",
    marginBottom: 36,
  },
  authCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 22,
    gap: 14,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3,
  },
  authHeading: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  authSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: -6,
    lineHeight: 20,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textSecondary,
    marginBottom: -4,
  },
  authFooter: {
    textAlign: "center",
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 24,
    lineHeight: 18,
  },
  avatarPicker: {
    alignSelf: "center",
    alignItems: "center",
    gap: 6,
  },
  avatarPickerCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarPickerImage: {
    width: 88,
    height: 88,
  },
  avatarPickerGlyph: {
    fontSize: 30,
    color: colors.textMuted,
  },
  avatarPickerHint: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.accent,
  },
  consentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  consentBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  consentBoxChecked: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  consentTick: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "700",
  },
  consentText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 19,
  },
  consentLink: {
    color: colors.accent,
    fontWeight: "600",
  },
});
