import { StyleSheet } from "react-native";
import { colors } from "./colors";

// Economy tab: the dues dashboard metric grid.
export const economyStyles = StyleSheet.create({
  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCard: {
    width: "48%",
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: 12,
  },
  metricLabel: {
    color: colors.textSecondary,
    fontSize: 13,
  },
  metricValue: {
    marginTop: 4,
    color: colors.textPrimary,
    fontSize: 24,
    fontWeight: "700",
  },
});
