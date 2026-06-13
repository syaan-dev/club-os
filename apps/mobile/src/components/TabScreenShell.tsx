import { ReactNode } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { styles } from "../styles";
import { useClubOs } from "../ClubOsContext";
import { ClubHeader } from "./ClubHeader";

export function TabScreenShell({
  children,
  showLoading = false,
}: {
  children: ReactNode;
  showLoading?: boolean;
}) {
  const { loading, errorText, infoText } = useClubOs();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
      <StatusBar style="light" />
      <ClubHeader />
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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
