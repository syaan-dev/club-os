import "@testing-library/jest-native/extend-expect";

jest.mock("@react-native-async-storage/async-storage", () =>
  require("@react-native-async-storage/async-storage/jest/async-storage-mock"),
);

jest.mock("expo-device", () => ({
  isDevice: false,
}));

jest.mock("expo-notifications", () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(async () => ({
    granted: false,
    canAskAgain: true,
  })),
  requestPermissionsAsync: jest.fn(async () => ({ granted: false })),
  getExpoPushTokenAsync: jest.fn(async () => ({ data: "" })),
  setNotificationChannelAsync: jest.fn(async () => undefined),
  addNotificationResponseReceivedListener: jest.fn(() => ({
    remove: jest.fn(),
  })),
  AndroidImportance: { DEFAULT: 3 },
}));
