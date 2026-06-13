import { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "../styles";
import { useClubOs } from "../ClubOsContext";
import { AppButton } from "./AppButton";

export function ScreenShell({
  children,
  showLoading = false,
}: {
  children: ReactNode;
  showLoading?: boolean;
}) {
  const { session, loading, errorText, infoText, logout } = useClubOs();

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        <StatusBar style="dark" />
        <Text style={styles.stepText}>Club operations onboarding</Text>
        <Text style={styles.title}>Club OS onboarding</Text>
        <Text style={styles.subtitle}>
          Manage membership, communication, and dues in one workflow.
        </Text>
        {session ? (
          <AppButton label="Logout" onPress={logout} disabled={loading} />
        ) : null}
        {errorText ? <Text style={styles.errorText}>{errorText}</Text> : null}
        {infoText ? <Text style={styles.infoText}>{infoText}</Text> : null}
        {children}
        {showLoading && loading ? (
          <View>
            <ActivityIndicator color="#0f4fa8" />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
