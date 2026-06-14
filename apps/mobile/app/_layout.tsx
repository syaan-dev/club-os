import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { ClubOsProvider } from "../src/ClubOsContext";
import { Toast } from "../src/components/Toast";
import { colors } from "../src/styles";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClubOsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
          }}
        />
        <Toast />
      </ClubOsProvider>
    </SafeAreaProvider>
  );
}
