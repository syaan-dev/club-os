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
            contentStyle: { backgroundColor: "#f6f8fb" },
          }}
        />
      </ClubOsProvider>
    </SafeAreaProvider>
  );
}
