import { useEffect, useRef } from "react";
import { Animated, Pressable, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, styles } from "../styles";
import { useToast } from "../context/domainHooks";

const AUTO_DISMISS_MS = 3200;

const accentFor = (kind: "success" | "error" | "info") => {
  if (kind === "success") {
    return colors.green;
  }
  if (kind === "error") {
    return colors.red;
  }
  return colors.accent;
};

const iconFor = (kind: "success" | "error" | "info") => {
  if (kind === "success") {
    return "\u2713";
  }
  if (kind === "error") {
    return "\u2715";
  }
  return "\u2139";
};

// Root-level toast host: shows the latest action result and auto-dismisses.
// Driven entirely by ClubOsContext's `toast` so any screen gets feedback for
// free without per-screen wiring.
export function Toast() {
  const { toast, dismissToast } = useToast();
  const insets = useSafeAreaInsets();
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    if (!toast) {
      return;
    }
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start();

    const timer = setTimeout(() => {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 20,
          duration: 160,
          useNativeDriver: true,
        }),
      ]).start(() => dismissToast());
    }, AUTO_DISMISS_MS);

    return () => clearTimeout(timer);
    // Re-run whenever a new toast arrives (id changes).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast?.id]);

  if (!toast) {
    return null;
  }

  const accent = accentFor(toast.kind);

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.toastHost,
        { bottom: insets.bottom + 24, opacity, transform: [{ translateY }] },
      ]}
    >
      <Pressable
        onPress={dismissToast}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        style={[styles.toast, { borderLeftColor: accent }]}
      >
        <Text style={[styles.toastIcon, { color: accent }]}>
          {iconFor(toast.kind)}
        </Text>
        <Text style={styles.toastText}>{toast.message}</Text>
      </Pressable>
    </Animated.View>
  );
}
