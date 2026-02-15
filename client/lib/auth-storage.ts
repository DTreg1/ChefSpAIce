import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

export const isWeb = Platform.OS === "web";
export const isIOS = Platform.OS === "ios";
export const isAndroid = Platform.OS === "android";

export const AUTH_STORAGE_KEY = "@chefspaice/auth";

export interface AuthUser {
  id: string;
  displayName?: string;
  email: string;
  avatarUrl?: string;
  provider?: "password" | "apple" | "google";
  createdAt: string;
  hasCompletedOnboarding?: boolean;
}

export interface StoredAuthData {
  user: AuthUser;
  token: string | null;
}

export async function saveAuthData(data: StoredAuthData): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(data));
}

export async function loadAuthData(): Promise<StoredAuthData | null> {
  const storedData = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
  if (!storedData) return null;
  return JSON.parse(storedData);
}

export async function clearAuthData(): Promise<void> {
  await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
}
