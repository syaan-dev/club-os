import { StyleSheet } from "react-native";

export const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#f6f8fb",
  },
  container: {
    padding: 20,
    gap: 14,
  },
  stepText: {
    fontSize: 13,
    color: "#4f6b95",
    fontWeight: "600",
  },
  errorText: {
    color: "#b42318",
    fontWeight: "600",
  },
  infoText: {
    color: "#0f4fa8",
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1d2a3b",
  },
  subtitle: {
    color: "#4f647f",
    fontSize: 14,
    marginTop: -6,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: "#e3e9f3",
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1d2a3b",
  },
  subTitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "700",
    color: "#1d2a3b",
  },
  input: {
    borderWidth: 1,
    borderColor: "#d5deec",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    fontSize: 16,
  },
  button: {
    backgroundColor: "#0f4fa8",
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
    paddingVertical: 6,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#172232",
  },
  memberMeta: {
    marginTop: 2,
    color: "#61748d",
  },
  inviteRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f8",
  },
  clubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#d8e2f2",
    borderRadius: 10,
    padding: 12,
  },
  clubRowText: {
    flex: 1,
    paddingRight: 8,
  },
  clubChevron: {
    fontSize: 26,
    color: "#0f4fa8",
    fontWeight: "700",
  },
  contactsCard: {
    borderWidth: 1,
    borderColor: "#d8e2f2",
    borderRadius: 10,
    padding: 10,
    gap: 8,
  },
  contactRow: {
    borderBottomWidth: 1,
    borderBottomColor: "#edf1f8",
    paddingVertical: 8,
  },
  rowActions: {
    marginTop: 8,
    gap: 8,
  },
  separator: {
    height: 1,
    backgroundColor: "#edf1f8",
  },
  paid: {
    color: "#0f8d46",
    fontWeight: "600",
  },
  unpaid: {
    color: "#c03a2f",
    fontWeight: "600",
  },
  warn: {
    color: "#b25e09",
    fontWeight: "600",
  },
  muted: {
    color: "#61748d",
    fontWeight: "600",
  },
  dueRowText: {
    flex: 1,
    paddingRight: 8,
  },
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: "#f7faff",
    borderWidth: 1,
    borderColor: "#d8e6ff",
    borderRadius: 10,
    padding: 12,
  },
  metricLabel: {
    color: "#4f647f",
    fontSize: 13,
  },
  metricValue: {
    marginTop: 4,
    color: "#173055",
    fontSize: 24,
    fontWeight: "700",
  },
  metaText: {
    color: "#61748d",
    fontSize: 12,
    marginTop: 4,
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
  },
  segment: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d5deec",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
  },
  segmentActive: {
    backgroundColor: "#0f4fa8",
    borderColor: "#0f4fa8",
  },
  segmentText: {
    color: "#33455e",
    fontWeight: "600",
  },
  segmentTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  inlineButton: {
    backgroundColor: "#e7f0ff",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  inlineButtonText: {
    color: "#0f4fa8",
    fontWeight: "700",
  },
  fieldLabel: {
    color: "#33455e",
    fontWeight: "600",
    fontSize: 13,
  },
});
