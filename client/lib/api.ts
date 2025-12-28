import Constants from "expo-constants";
import { Platform } from "react-native";

const getApiUrl = (): string => {
  if (Platform.OS === "web") {
    return "";
  }

  const expoPublicDomain = Constants.expoConfig?.extra?.EXPO_PUBLIC_DOMAIN;
  if (expoPublicDomain) {
    return `https://${expoPublicDomain}`;
  }

  return "http://localhost:5000";
};

export const API_URL = getApiUrl();
