import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { GlassCard } from "@/components/GlassCard";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { RootNavigation } from "@/lib/types";

type ScanOption = {
  id: string;
  icon: keyof typeof Feather.glyphMap;
  title: string;
  subtitle: string;
  description: string;
  color: string;
  screen: string;
  params?: object;
};

const SCAN_OPTIONS: ScanOption[] = [
  {
    id: "barcode",
    icon: "maximize",
    title: "Product Barcode",
    subtitle: "Scan the barcode on packaging",
    description:
      "Point at the barcode on any packaged food item to quickly look up product details and nutrition info.",
    color: AppColors.accent,
    screen: "BarcodeScanner",
  },
  {
    id: "nutrition",
    icon: "file-text",
    title: "Nutrition Label",
    subtitle: "Scan ingredients & nutrition facts",
    description:
      "Take a photo of the nutrition label or ingredients list on food packaging to extract detailed information.",
    color: "#9B59B6",
    screen: "IngredientScanner",
  },
  {
    id: "recipe",
    icon: "book-open",
    title: "Recipe from Paper",
    subtitle: "Scan a cookbook or printed recipe",
    description:
      "Photograph a recipe from a cookbook, magazine, or printed page to digitize and save it.",
    color: AppColors.warning,
    screen: "RecipeScanner",
  },
  {
    id: "food",
    icon: "camera",
    title: "Food & Leftovers",
    subtitle: "Identify food with AI",
    description:
      "Take a photo of groceries, produce, or leftovers to automatically identify and add multiple items at once.",
    color: AppColors.primary,
    screen: "FoodCamera",
  },
  {
    id: "receipt",
    icon: "shopping-bag",
    title: "Grocery Receipt",
    subtitle: "Import purchases to inventory",
    description:
      "Scan any grocery store receipt to automatically extract items and add them to your inventory. Works with any store.",
    color: AppColors.success,
    screen: "ReceiptScan",
  },
];

function ScanOptionCard({
  option,
  onPress,
  isDark,
  isLocked,
}: {
  option: ScanOption;
  onPress: () => void;
  isDark: boolean;
  isLocked?: boolean;
}) {
  return (
    <Pressable
      testID={`scan-option-${option.id}`}
      accessibilityLabel={`${option.title}: ${option.subtitle}${isLocked ? " (requires subscription)" : ""}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionPressable,
        pressed && styles.optionPressed,
      ]}
    >
      <GlassCard
        style={[styles.optionCard, isLocked && styles.optionCardLocked]}
      >
        <View style={styles.optionContent}>
          <View
            style={[
              styles.iconContainer,
              {
                backgroundColor: `${option.color}20`,
                borderColor: option.color,
              },
            ]}
          >
            <Feather
              name={isLocked ? "lock" : option.icon}
              size={28}
              color={option.color}
            />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="body" style={styles.optionTitle}>
                {option.title}
              </ThemedText>
              {isLocked && (
                <View style={styles.proBadge}>
                  <ThemedText type="small" style={styles.proBadgeText}>
                    PRO
                  </ThemedText>
                </View>
              )}
            </View>
            <ThemedText
              type="caption"
              style={[styles.optionSubtitle, { color: option.color }]}
            >
              {option.subtitle}
            </ThemedText>
            <ThemedText type="caption" style={styles.optionDescription}>
              {option.description}
            </ThemedText>
          </View>
          <Feather
            name={isLocked ? "lock" : "chevron-right"}
            size={24}
            color={isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.3)"}
          />
        </View>
      </GlassCard>
    </Pressable>
  );
}

export default function ScanHubScreen() {
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const navigation =
    useNavigation<RootNavigation>();
  const { checkFeature } = useSubscription();
  const [upgradePrompt, setUpgradePrompt] = useState<{
    visible: boolean;
    feature: "recipeScanning" | "bulkScanning";
  }>({ visible: false, feature: "recipeScanning" });

  const isOptionLocked = (optionId: string): boolean => {
    if (optionId === "recipe") {
      return !checkFeature("canUseRecipeScanning");
    }
    if (optionId === "food" || optionId === "receipt") {
      return !checkFeature("canUseBulkScanning");
    }
    return false;
  };

  const handleOptionPress = async (option: ScanOption) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    // Check if this is a Pro-only feature
    if (option.id === "recipe" && !checkFeature("canUseRecipeScanning")) {
      setUpgradePrompt({ visible: true, feature: "recipeScanning" });
      return;
    }
    if (
      (option.id === "food" || option.id === "receipt") &&
      !checkFeature("canUseBulkScanning")
    ) {
      setUpgradePrompt({ visible: true, feature: "bulkScanning" });
      return;
    }

    (navigation as any).replace(option.screen, option.params);
  };

  return (
    <>
      <ExpoGlassHeader
        title="Choose Scan Type"
        screenKey="scanHub"
        showSearch={false}
        showBackButton={true}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: 56 + insets.top + Spacing.lg,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
          showsVerticalScrollIndicator={false}
        >
          {SCAN_OPTIONS.map((option) => (
            <ScanOptionCard
              key={option.id}
              option={option}
              onPress={() => handleOptionPress(option)}
              isDark={isDark}
              isLocked={isOptionLocked(option.id)}
            />
          ))}
        </ScrollView>

        {upgradePrompt.visible && (
          <UpgradePrompt
            type="feature"
            featureName={
              upgradePrompt.feature === "recipeScanning"
                ? "Recipe Scanning"
                : "Bulk Scanning"
            }
            onUpgrade={() => {
              setUpgradePrompt({ ...upgradePrompt, visible: false });
              // Navigate: Root -> Main (Drawer) -> Tabs (TabNav) -> ProfileTab -> Subscription
              navigation.navigate("Main", {
                screen: "Tabs",
                params: {
                  screen: "ProfileTab",
                  params: { screen: "Subscription" },
                },
              });
            }}
            onDismiss={() =>
              setUpgradePrompt({ ...upgradePrompt, visible: false })
            }
          />
        )}
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  optionPressable: {
    borderRadius: BorderRadius.lg,
  },
  optionPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  optionCard: {
    padding: Spacing.md,
  },
  optionContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  optionTitle: {
    fontWeight: "600",
  },
  optionSubtitle: {
    fontWeight: "500",
    fontSize: 13,
  },
  optionDescription: {
    opacity: 0.6,
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  optionCardLocked: {
    opacity: 0.85,
  },
  proBadge: {
    backgroundColor: AppColors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
