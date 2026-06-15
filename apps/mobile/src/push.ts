import { Platform } from "react-native";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";

// Foreground presentation: show incoming pushes as a banner while the app is
// open. (Background/closed delivery is handled by the OS via Expo -> FCM/APNs.)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export type PushRegistration = {
  token: string;
  platform: "ios" | "android" | "web" | "unknown";
};

function currentPlatform(): PushRegistration["platform"] {
  if (Platform.OS === "ios" || Platform.OS === "android" || Platform.OS === "web") {
    return Platform.OS;
  }
  return "unknown";
}

// Requests notification permission and returns the Expo push token, or null if
// unavailable (simulator, permission denied, or missing EAS projectId). Safe to
// call repeatedly; it no-ops gracefully when push can't be set up.
export async function registerForPushNotifications(): Promise<PushRegistration | null> {
  // Remote push only works on physical devices.
  if (!Device.isDevice) {
    return null;
  }

  const existing = await Notifications.getPermissionsAsync();
  let granted = existing.granted;
  if (!granted && existing.canAskAgain) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Club updates",
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  // Needed for getExpoPushTokenAsync. Populated by EAS at build time; during
  // local dev set expo.extra.eas.projectId in app.json.
  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;
  if (!projectId) {
    return null;
  }

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
    return { token: tokenResponse.data, platform: currentPlatform() };
  } catch {
    return null;
  }
}

export const NotificationsApi = Notifications;
