import { ReactNode } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles, colors } from "../styles";
import { useClubOs } from "../ClubOsContext";
import { Logo } from "./Logo";

// Onboarding scaffold sharing the sign-in screen theme: brand logo on top,
// content centered on a soft background, optional sign-out for an active
// session. Inner screens supply their own authCard blocks.
export function OnboardingShell({
  children,
  showLoading = false,
}: {
  children: ReactNode;
  showLoading?: boolean;
}) {
  const { session, loading, logout } = useClubOs();

  return (
    <SafeAreaView style={styles.authSafe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.authScroll}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.authLogoWrap}>
            <Logo size={58} />
          </View>

          {children}

          {showLoading && loading ? (
            <ActivityIndicator
              color={colors.accent}
              style={{ marginTop: 20 }}
            />
          ) : null}

          {session ? (
            <Pressable
              onPress={logout}
              disabled={loading}
              style={{ alignItems: "center", paddingVertical: 14 }}
            >
              <Text style={styles.inviteLinkText}>Sign out</Text>
            </Pressable>
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
