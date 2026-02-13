import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { SyncStatusIndicator } from "@/components/SyncStatusIndicator";
import { Spacing } from "@/constants/theme";
import type { ThemeColors } from "@/lib/types";

interface SettingsCloudSyncProps {
  user: { email?: string } | null;
  theme: ThemeColors;
}

export function SettingsCloudSync({ user, theme }: SettingsCloudSyncProps) {
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Cloud Sync
      </ThemedText>
      <View style={styles.syncRow}>
        <SyncStatusIndicator showLabel size="medium" />
      </View>
      <ThemedText type="caption" style={styles.dataInfo}>
        Signed in as {user?.email}. Your data is synced across devices.
      </ThemedText>
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
  syncRow: {
    paddingVertical: Spacing.sm,
  },
  dataInfo: {
    marginBottom: Spacing.sm,
  },
});
