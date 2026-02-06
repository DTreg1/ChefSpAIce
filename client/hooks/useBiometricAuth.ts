import { useState, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";

const BIOMETRIC_PREF_KEY = "@chefspaice/biometric_enabled";

let LocalAuthentication: typeof import("expo-local-authentication") | null =
  null;

if (Platform.OS !== "web") {
  try {
    LocalAuthentication = require("expo-local-authentication");
  } catch {
    logger.log("[Biometric] expo-local-authentication not available");
  }
}

export interface BiometricAuthState {
  isAvailable: boolean;
  isEnrolled: boolean;
  biometricType: string | null;
  isEnabled: boolean;
  isLoading: boolean;
}

export function useBiometricAuth() {
  const [state, setState] = useState<BiometricAuthState>({
    isAvailable: false,
    isEnrolled: false,
    biometricType: null,
    isEnabled: false,
    isLoading: true,
  });

  useEffect(() => {
    checkBiometricStatus();
  }, []);

  const checkBiometricStatus = async () => {
    if (!LocalAuthentication) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled = await LocalAuthentication.isEnrolledAsync();

      let biometricType: string | null = null;
      if (hasHardware && isEnrolled) {
        const types =
          await LocalAuthentication.supportedAuthenticationTypesAsync();
        if (
          types.includes(
            LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION,
          )
        ) {
          biometricType = "Face ID";
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)
        ) {
          biometricType = "Fingerprint";
        } else if (
          types.includes(LocalAuthentication.AuthenticationType.IRIS)
        ) {
          biometricType = "Iris";
        }
      }

      const storedPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
      const isEnabled = storedPref === "true";

      setState({
        isAvailable: hasHardware,
        isEnrolled,
        biometricType,
        isEnabled: hasHardware && isEnrolled && isEnabled,
        isLoading: false,
      });
    } catch (error) {
      logger.log("[Biometric] Error checking status:", error);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const authenticate = useCallback(
    async (promptMessage?: string): Promise<boolean> => {
      if (!LocalAuthentication) {
        return false;
      }

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage: promptMessage || "Verify your identity",
          cancelLabel: "Use Password",
          disableDeviceFallback: false,
          fallbackLabel: "Use Passcode",
        });

        return result.success;
      } catch (error) {
        logger.log("[Biometric] Authentication error:", error);
        return false;
      }
    },
    [],
  );

  const setEnabled = useCallback(
    async (enabled: boolean): Promise<boolean> => {
      if (!LocalAuthentication) {
        return false;
      }

      if (enabled) {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!hasHardware || !isEnrolled) {
          return false;
        }

        const verified = await authenticate(
          "Verify your identity to enable biometric login",
        );
        if (!verified) {
          return false;
        }
      }

      await AsyncStorage.setItem(BIOMETRIC_PREF_KEY, enabled ? "true" : "false");
      setState((prev) => ({ ...prev, isEnabled: enabled }));
      return true;
    },
    [authenticate],
  );

  return {
    ...state,
    authenticate,
    setEnabled,
  };
}

export async function isBiometricEnabled(): Promise<boolean> {
  try {
    const storedPref = await AsyncStorage.getItem(BIOMETRIC_PREF_KEY);
    return storedPref === "true";
  } catch {
    return false;
  }
}

export async function clearBiometricPreference(): Promise<void> {
  try {
    await AsyncStorage.removeItem(BIOMETRIC_PREF_KEY);
  } catch {
    logger.log("[Biometric] Error clearing preference");
  }
}

export async function authenticateBiometric(
  promptMessage?: string,
): Promise<boolean> {
  if (!LocalAuthentication) {
    return false;
  }

  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (!hasHardware || !isEnrolled) {
      return false;
    }

    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: promptMessage || "Verify your identity",
      cancelLabel: "Use Password",
      disableDeviceFallback: false,
      fallbackLabel: "Use Passcode",
    });

    return result.success;
  } catch (error) {
    logger.log("[Biometric] Standalone auth error:", error);
    return false;
  }
}
