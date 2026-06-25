import { ReactNode } from "react";
import { ActivityIndicator, ScrollView, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles, colors } from "../styles";
import { useUi } from "../context/domainHooks";
import { ClubHeader } from "./ClubHeader";

export function TabScreenShell({
  children,
  showLoading = false,
}: {
  children: ReactNode;
  showLoading?: boolean;
}) {
  const { loading } = useUi();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="dark" />
      <ClubHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
        {children}
        {showLoading && loading ? (
          <View>
            <ActivityIndicator color={colors.accent} />
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
