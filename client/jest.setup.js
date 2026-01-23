jest.mock("@react-native-async-storage/async-storage", () =>
  require("./__mocks__/@react-native-async-storage/async-storage")
);

jest.mock("expo-notifications", () => require("./__mocks__/expo-notifications"));

jest.mock("react-native", () => ({
  Platform: {
    OS: "ios",
    select: jest.fn((obj) => obj.ios || obj.default),
  },
  Alert: {
    alert: jest.fn(),
  },
  Linking: {
    openURL: jest.fn(() => Promise.resolve()),
    canOpenURL: jest.fn(() => Promise.resolve(true)),
  },
  AppState: {
    currentState: "active",
    addEventListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));
