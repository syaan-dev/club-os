import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Members directory + home club list: club rows, the member directory rows,
// role chips, contact rows and the share/invite link surfaces.
export const membersStyles = StyleSheet.create({
  inviteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  clubRowLogo: {
    width: 36,
    height: 36,
    borderRadius: 9,
    marginRight: 10,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  clubRowLogoImage: {
    width: 36,
    height: 36,
  },
  clubRowLogoText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 14,
  },
  clubRowText: {
    flex: 1,
    paddingRight: 8,
  },
  clubChevron: {
    fontSize: 26,
    color: colors.accent,
    fontWeight: "700",
  },
  contactsCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  contactRow: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
    paddingVertical: 8,
  },
  directoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  directoryTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  inviteLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  inviteLinkText: {
    color: colors.accent,
    fontWeight: "600",
    fontSize: 14,
  },
  directoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSoft,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceAlt,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  memberAvatarImage: {
    width: 40,
    height: 40,
  },
  memberAvatarText: {
    color: colors.textSecondary,
    fontWeight: "700",
    fontSize: 13,
  },
  directoryNameCol: {
    flex: 1,
    gap: 2,
  },
  directoryName: {
    fontSize: 16,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  directoryMeta: {
    fontSize: 13,
    color: colors.textMuted,
  },
  roleChip: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleChipText: {
    fontSize: 12,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  shareCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 18,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  shareQr: {
    width: 34,
    height: 34,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  shareQrGlyph: {
    fontSize: 26,
    color: colors.textSecondary,
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  shareLink: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  shareCopy: {
    fontSize: 20,
    color: colors.accent,
  },
  inviteSurface: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    padding: 20,
    alignItems: "center",
    gap: 10,
  },
});
