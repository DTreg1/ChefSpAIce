import React from "react";
import { View, StyleSheet, Switch, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors } from "@/constants/theme";
import type { ThemeColors } from "@/lib/types";

interface SettingsBiometricProps {
  biometric: {
    isAvailable: boolean;
    isEnrolled: boolean;
    biometricType: string | null;
    isEnabled: boolean;
    setEnabled: (value: boolean) => Promise<void>;
  };
  theme: ThemeColors;
}

export function SettingsBiometric({ biometric, theme }: SettingsBiometricProps) {
  if (
    !biometric.isAvailable ||
    !biometric.isEnrolled ||
    Platform.OS === "web"
  ) {
    return null;
  }

  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Security
      </ThemedText>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Feather
            name={
              biometric.biometricType === "Face ID"
                ? "eye"
                : "smartphone"
            }
            size={20}
            color={theme.text}
          />
          <View style={styles.settingText}>
            <ThemedText type="body">
              {biometric.biometricType || "Biometric"} Login
            </ThemedText>
            <ThemedText type="caption">
              Require {biometric.biometricType || "biometric verification"}{" "}
              to access the app
            </ThemedText>
          </View>
        </View>
        <Switch
          value={biometric.isEnabled}
          onValueChange={async (value) => {
            await biometric.setEnabled(value);
          }}
          trackColor={{
            false: theme.backgroundSecondary,
            true: AppColors.primary,
          }}
          thumbColor="#FFFFFF"
          accessibilityLabel={`Toggle ${biometric.biometricType || "biometric"} login`}
          data-testid="switch-biometric-login"
        />
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: Spacing.md,
  },
  settingText: {
    flex: 1,
  },
});
