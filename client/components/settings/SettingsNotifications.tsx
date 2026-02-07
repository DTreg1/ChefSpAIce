import React from "react";
import { View, StyleSheet, Switch, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { UserPreferences } from "@/lib/storage";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";

interface SettingsNotificationsProps {
  preferences: UserPreferences;
  onToggleNotifications: (value: boolean) => void;
  onExpirationDaysChange: (days: number) => void;
  theme: any;
}

export function SettingsNotifications({
  preferences,
  onToggleNotifications,
  onExpirationDaysChange,
  theme,
}: SettingsNotificationsProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Notifications
      </ThemedText>

      <View style={styles.settingRow}>
        <View style={styles.settingInfo}>
          <Feather name="bell" size={20} color={theme.text} />
          <View style={styles.settingText}>
            <ThemedText type="body">Expiration Alerts</ThemedText>
            <ThemedText type="caption">
              Get notified when items are about to expire
            </ThemedText>
          </View>
        </View>
        <Switch
          value={preferences.notificationsEnabled}
          onValueChange={onToggleNotifications}
          trackColor={{
            false: theme.backgroundSecondary,
            true: AppColors.primary,
          }}
          thumbColor="#FFFFFF"
        />
      </View>

      {preferences.notificationsEnabled ? (
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Feather name="clock" size={20} color={theme.text} />
            <View style={styles.settingText}>
              <ThemedText type="body">Alert Before Expiration</ThemedText>
              <ThemedText type="caption">
                Days before expiration to send alert
              </ThemedText>
            </View>
          </View>
          <View style={styles.daysSelector}>
            <Pressable
              onPress={() =>
                onExpirationDaysChange(
                  (preferences.expirationAlertDays || 3) - 1,
                )
              }
              style={[
                styles.dayButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="minus" size={16} color={theme.text} />
            </Pressable>
            <View
              style={[
                styles.daysValue,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <ThemedText type="body" style={styles.daysText}>
                {preferences.expirationAlertDays || 3}
              </ThemedText>
            </View>
            <Pressable
              onPress={() =>
                onExpirationDaysChange(
                  (preferences.expirationAlertDays || 3) + 1,
                )
              }
              style={[
                styles.dayButton,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="plus" size={16} color={theme.text} />
            </Pressable>
          </View>
        </View>
      ) : null}
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
  daysSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  dayButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  daysValue: {
    minWidth: 40,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  daysText: {
    fontWeight: "600",
  },
});
