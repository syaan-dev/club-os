import { SafeAreaProvider } from "react-native-safe-area-context";
import { Stack } from "expo-router";
import { ClubOsProvider } from "../src/ClubOsContext";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ClubOsProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "#0f1113" },
          }}
        />
      </ClubOsProvider>
    </SafeAreaProvider>
  );
}
