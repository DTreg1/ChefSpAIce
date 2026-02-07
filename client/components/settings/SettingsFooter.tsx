import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors } from "@/constants/theme";

export function SettingsFooter() {
  return (
    <View style={styles.footer}>
      <ThemedText type="caption" style={styles.footerText}>
        Made with care for food lovers everywhere
      </ThemedText>
      <View style={styles.featureList}>
        <View style={styles.featureItem}>
          <Feather
            name="check-circle"
            size={14}
            color={AppColors.success}
          />
          <ThemedText type="caption">USDA Nutrition Data</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather
            name="check-circle"
            size={14}
            color={AppColors.success}
          />
          <ThemedText type="caption">AI Recipe Generation</ThemedText>
        </View>
        <View style={styles.featureItem}>
          <Feather
            name="check-circle"
            size={14}
            color={AppColors.success}
          />
          <ThemedText type="caption">Barcode Scanning</ThemedText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.md,
  },
  footerText: {
    textAlign: "center",
  },
  featureList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
});
