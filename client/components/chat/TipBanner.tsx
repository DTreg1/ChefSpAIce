import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

export interface WasteTip {
  text: string;
  category: "recipe" | "storage" | "freeze" | "preserve" | "general";
}

export const TIP_ICONS: Record<string, keyof typeof Feather.glyphMap> = {
  recipe: "book-open",
  storage: "box",
  freeze: "thermometer",
  preserve: "archive",
  general: "zap",
};

export const TIP_COLORS: Record<string, string> = {
  recipe: AppColors.primary,
  storage: AppColors.secondary,
  freeze: "#4FC3F7",
  preserve: AppColors.accent,
  general: AppColors.warning,
};

interface TipBannerProps {
  currentTip: WasteTip | null;
  tipLoading: boolean;
  expiringCount: number;
  onRefreshTip: () => void;
}

export function TipBanner({
  currentTip,
  tipLoading,
  expiringCount,
  onRefreshTip,
}: TipBannerProps) {
  const { style: themeStyle } = useTheme();
  if (!currentTip && !tipLoading && expiringCount <= 0) {
    return null;
  }

  return (
    <Pressable
      style={[
        styles.tipBanner,
        {
          backgroundColor: themeStyle.surface.feedbackBg,
        },
      ]}
      onPress={onRefreshTip}
      accessibilityRole="button"
      accessibilityLabel="Kitchen tip. Tap for another tip"
    >
      {tipLoading ? (
        <ActivityIndicator size="small" color={AppColors.primary} />
      ) : currentTip ? (
        <>
          <View
            style={[
              styles.tipIcon,
              {
                backgroundColor: `${TIP_COLORS[currentTip.category] || TIP_COLORS.general}20`,
              },
            ]}
          >
            <Feather
              name={TIP_ICONS[currentTip.category] || TIP_ICONS.general}
              size={12}
              color={TIP_COLORS[currentTip.category] || TIP_COLORS.general}
            />
          </View>
          <ThemedText
            type="caption"
            style={styles.tipText}
            numberOfLines={2}
          >
            {currentTip.text}
          </ThemedText>
          {expiringCount > 0 ? (
            <View
              style={[
                styles.expiringBadge,
                { backgroundColor: AppColors.warning },
              ]}
            >
              <ThemedText type="caption" style={styles.expiringBadgeText}>
                {expiringCount}
              </ThemedText>
            </View>
          ) : null}
        </>
      ) : expiringCount > 0 ? (
        <>
          <Feather
            name="alert-circle"
            size={14}
            color={AppColors.warning}
          />
          <ThemedText type="caption" style={styles.tipText}>
            {expiringCount} item{expiringCount > 1 ? "s" : ""} expiring soon
          </ThemedText>
        </>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tipBanner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.1)",
    minHeight: 44,
  },
  tipIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  tipText: {
    flex: 1,
    fontSize: 12,
  },
  expiringBadge: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    minWidth: 20,
    alignItems: "center",
  },
  expiringBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },
});
