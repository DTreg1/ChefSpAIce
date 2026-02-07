import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { RegisterPrompt } from "@/components/RegisterPrompt";
import { Spacing, AppColors } from "@/constants/theme";

interface InventoryFunFactProps {
  funFact: string | null;
  funFactLoading: boolean;
  funFactTimeRemaining: string;
  onRefresh: () => void;
  theme: any;
  showFunFact: boolean;
}

export function InventoryFunFact({
  funFact,
  funFactLoading,
  funFactTimeRemaining,
  onRefresh,
  theme,
  showFunFact,
}: InventoryFunFactProps) {
  return (
    <View style={styles.listHeader}>
      <RegisterPrompt variant="banner" />
      {showFunFact && (
        <GlassCard style={styles.funFactCard}>
          {funFact && (
            <View style={styles.funFactContainer} accessibilityLiveRegion="polite">
              <View style={styles.funFactHeader}>
                <Feather name="info" size={14} color={AppColors.primary} />
                {funFactTimeRemaining && (
                  <ThemedText type="caption" style={styles.funFactTimer}>
                    Next in {funFactTimeRemaining}
                  </ThemedText>
                )}
                <Pressable
                  onPress={onRefresh}
                  disabled={funFactLoading}
                  style={styles.funFactRefreshButton}
                  testID="button-refresh-fun-fact"
                  accessibilityRole="button"
                  accessibilityLabel="Refresh fun fact"
                  accessibilityHint="Fetches a new fun fact about your kitchen"
                >
                  <Feather
                    name="refresh-cw"
                    size={14}
                    color={
                      funFactLoading ? theme.textSecondary : AppColors.primary
                    }
                  />
                </Pressable>
              </View>
              <ThemedText type="caption" style={styles.funFactText}>
                {funFact}
              </ThemedText>
            </View>
          )}
          {funFactLoading && !funFact && (
            <View style={styles.funFactContainer}>
              <ThemedText type="caption" style={styles.funFactText}>
                Discovering a fun fact about your kitchen...
              </ThemedText>
            </View>
          )}
        </GlassCard>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  listHeader: {
    gap: Spacing.md,
  },
  funFactCard: {
    paddingHorizontal: Spacing.sm,
  },
  funFactContainer: {
    flexDirection: "column",
  },
  funFactHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  funFactTimer: {
    flex: 1,
    opacity: 0.6,
    fontSize: 11,
  },
  funFactRefreshButton: {
    padding: Spacing.xs,
  },
  funFactText: {
    fontStyle: "italic",
    opacity: 0.9,
  },
});
