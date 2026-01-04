import React, { useState } from "react";
import { View, StyleSheet, Pressable, ScrollView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

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
    description: "Point at the barcode on any packaged food item to quickly look up product details and nutrition info.",
    color: AppColors.accent,
    screen: "BarcodeScanner",
  },
  {
    id: "nutrition",
    icon: "file-text",
    title: "Nutrition Label",
    subtitle: "Scan ingredients & nutrition facts",
    description: "Take a photo of the nutrition label or ingredients list on food packaging to extract detailed information.",
    color: "#9B59B6",
    screen: "IngredientScanner",
  },
  {
    id: "recipe",
    icon: "book-open",
    title: "Recipe from Paper",
    subtitle: "Scan a cookbook or printed recipe",
    description: "Photograph a recipe from a cookbook, magazine, or printed page to digitize and save it.",
    color: AppColors.warning,
    screen: "RecipeScanner",
  },
  {
    id: "food",
    icon: "camera",
    title: "Food & Leftovers",
    subtitle: "Identify food with AI",
    description: "Take a photo of groceries, produce, or leftovers to automatically identify and add multiple items at once.",
    color: AppColors.primary,
    screen: "FoodCamera",
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
      accessibilityLabel={`${option.title}: ${option.subtitle}${isLocked ? ' (Pro feature)' : ''}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.optionPressable,
        pressed && styles.optionPressed,
      ]}
    >
      <GlassCard style={[styles.optionCard, isLocked && styles.optionCardLocked]}>
        <View style={styles.optionContent}>
          <View
            style={[
              styles.iconContainer,
              { backgroundColor: `${option.color}20`, borderColor: option.color },
            ]}
          >
            <Feather name={isLocked ? "lock" : option.icon} size={28} color={option.color} />
          </View>
          <View style={styles.textContainer}>
            <View style={styles.titleRow}>
              <ThemedText type="body" style={styles.optionTitle}>
                {option.title}
              </ThemedText>
              {isLocked && (
                <View style={styles.proBadge}>
                  <ThemedText type="small" style={styles.proBadgeText}>PRO</ThemedText>
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
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { checkFeature } = useSubscription();
  const [upgradePrompt, setUpgradePrompt] = useState<{
    visible: boolean;
    feature: 'recipeScanning' | 'bulkScanning';
  }>({ visible: false, feature: 'recipeScanning' });

  const isOptionLocked = (optionId: string): boolean => {
    if (optionId === 'recipe') {
      return !checkFeature('canUseRecipeScanning');
    }
    if (optionId === 'food') {
      return !checkFeature('canUseBulkScanning');
    }
    return false;
  };

  const handleOptionPress = async (option: ScanOption) => {
    if (Platform.OS !== "web") {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    
    // Check if this is a Pro-only feature
    if (option.id === 'recipe' && !checkFeature('canUseRecipeScanning')) {
      setUpgradePrompt({ visible: true, feature: 'recipeScanning' });
      return;
    }
    if (option.id === 'food' && !checkFeature('canUseBulkScanning')) {
      setUpgradePrompt({ visible: true, feature: 'bulkScanning' });
      return;
    }
    
    navigation.replace(option.screen as any, option.params);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  return (
    <ThemedView style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.md }]}>
        <View style={styles.headerContent}>
          <Pressable
            testID="button-close-scan-hub"
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={handleClose}
            style={styles.closeButton}
          >
            <Feather
              name="x"
              size={24}
              color={isDark ? "#FFFFFF" : "#000000"}
            />
          </Pressable>
          <ThemedText type="h2" style={styles.headerTitle}>
            Choose Scan Type
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        <ThemedText type="body" style={styles.headerSubtitle}>
          Select what you want to scan to get the best results
        </ThemedText>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + Spacing.xl },
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
          featureName={upgradePrompt.feature === 'recipeScanning' ? 'Recipe Scanning' : 'Bulk Scanning'}
          onUpgrade={() => {
            setUpgradePrompt({ ...upgradePrompt, visible: false });
            // Navigate: Root -> Main (Drawer) -> Tabs (TabNav) -> ProfileTab -> Subscription
            navigation.navigate("Main" as any, { 
              screen: 'Tabs', 
              params: { 
                screen: 'ProfileTab', 
                params: { screen: 'Subscription' } 
              } 
            });
          }}
          onDismiss={() => setUpgradePrompt({ ...upgradePrompt, visible: false })}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  headerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },
  headerSubtitle: {
    textAlign: "center",
    opacity: 0.7,
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
