import { View, Text } from "react-native";
import { colors } from "../styles";

// Brand mark rendered from native primitives (no SVG/runtime dep) so it stays
// crisp at any size. Mirrors assets/logo/club-os-icon.svg: a central core node
// with six member nodes and connecting spokes — a "connected club" network.
const NODE_ANGLES = [-90, -30, 30, 90, 150, 210];

function Mark({ size }: { size: number }) {
  const center = size / 2;
  const radius = size * 0.34;
  const coreSize = size * 0.26;
  const nodeSize = size * 0.15;
  const spokeThickness = Math.max(2, size * 0.05);

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.24,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      {NODE_ANGLES.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const midX = center + (radius / 2) * Math.cos(rad);
        const midY = center + (radius / 2) * Math.sin(rad);
        return (
          <View
            key={`spoke-${angle}`}
            style={{
              position: "absolute",
              width: radius,
              height: spokeThickness,
              borderRadius: spokeThickness / 2,
              backgroundColor: colors.accent,
              opacity: 0.45,
              left: midX - radius / 2,
              top: midY - spokeThickness / 2,
              transform: [{ rotate: `${angle}deg` }],
            }}
          />
        );
      })}

      {NODE_ANGLES.map((angle) => {
        const rad = (angle * Math.PI) / 180;
        return (
          <View
            key={`node-${angle}`}
            style={{
              position: "absolute",
              width: nodeSize,
              height: nodeSize,
              borderRadius: nodeSize / 2,
              backgroundColor: colors.brand,
              left: center + radius * Math.cos(rad) - nodeSize / 2,
              top: center + radius * Math.sin(rad) - nodeSize / 2,
            }}
          />
        );
      })}

      <View
        style={{
          position: "absolute",
          width: coreSize,
          height: coreSize,
          borderRadius: coreSize / 2,
          backgroundColor: colors.brand,
          left: center - coreSize / 2,
          top: center - coreSize / 2,
        }}
      />
    </View>
  );
}

export function Logo({
  size = 72,
  showWordmark = true,
}: {
  size?: number;
  showWordmark?: boolean;
}) {
  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Mark size={size} />
      {showWordmark ? (
        <View style={{ alignItems: "center", gap: 2 }}>
          <Text
            style={{
              fontSize: size * 0.46,
              fontWeight: "700",
              color: colors.textPrimary,
              letterSpacing: -0.5,
            }}
          >
            Club OS
          </Text>
          <Text
            style={{
              fontSize: size * 0.16,
              fontWeight: "600",
              letterSpacing: 4,
              color: colors.textMuted,
            }}
          >
            CLUB OPERATIONS
          </Text>
        </View>
      ) : null}
    </View>
  );
}
