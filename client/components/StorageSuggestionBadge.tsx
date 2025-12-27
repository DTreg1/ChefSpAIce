import React, { useState, useEffect } from "react";
import { View, Pressable, StyleSheet, AccessibilityRole } from "react-native";
import Animated, {
  useAnimatedStyle,
  withSpring,
  useSharedValue,
  withTiming,
  interpolateColor,
  Easing,
} from "react-native-reanimated";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/hooks/useTheme";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import type { StorageLocation } from "@/lib/shelf-life-data";

interface StorageSuggestionBadgeProps {
  suggestedLocation: string;
  alternatives: string[];
  onSelect: (location: string) => void;
  selectedLocation: string;
  confidence?: "high" | "medium" | "low" | "learned" | "strong" | "weak";
  shelfLifeDays?: number;
}

const LOCATION_CONFIG: Record<
  StorageLocation,
  {
    icon: keyof typeof Feather.glyphMap;
    label: string;
    description: string;
    shelfLifeHint: string;
  }
> = {
  refrigerator: {
    icon: "thermometer",
    label: "Fridge",
    description: "Cool storage at 35-40°F",
    shelfLifeHint: "keeps food fresh for days to weeks",
  },
  freezer: {
    icon: "wind",
    label: "Freezer",
    description: "Frozen at 0°F or below",
    shelfLifeHint: "extends storage to months",
  },
  pantry: {
    icon: "archive",
    label: "Pantry",
    description: "Cool, dark, dry storage",
    shelfLifeHint: "best for dry goods, weeks to months",
  },
  counter: {
    icon: "coffee",
    label: "Counter",
    description: "Room temperature storage",
    shelfLifeHint: "use within days, check ripeness",
  },
};

const MIN_CHIP_HEIGHT = 44;
const ICON_SIZE = 18;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function LocationChip({
  location,
  isSelected,
  isSuggested,
  isLearned,
  onPress,
  shelfLifeDays,
}: {
  location: StorageLocation;
  isSelected: boolean;
  isSuggested: boolean;
  isLearned?: boolean;
  onPress: () => void;
  shelfLifeDays?: number;
}) {
  const { theme } = useTheme();
  const scale = useSharedValue(1);
  const selectionProgress = useSharedValue(isSelected ? 1 : 0);
  const config = LOCATION_CONFIG[location] || {
    icon: "box",
    label: location,
    description: "",
    shelfLifeHint: "",
  };

  const getAccessibilityLabel = () => {
    let label = config.label;
    if (isSelected) {
      label += ", currently selected";
    }
    if (isLearned) {
      label += ", your preferred choice based on past selections";
    } else if (isSuggested) {
      label += ", recommended storage";
    }
    if (shelfLifeDays) {
      label += `, approximately ${shelfLifeDays} days shelf life`;
    } else if (config.shelfLifeHint) {
      label += `, ${config.shelfLifeHint}`;
    }
    return label;
  };

  useEffect(() => {
    selectionProgress.value = withTiming(isSelected ? 1 : 0, {
      duration: 200,
      easing: Easing.bezier(0.4, 0, 0.2, 1),
    });
  }, [isSelected]);

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    backgroundColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [theme.glass.background, AppColors.primary],
    ),
    borderColor: interpolateColor(
      selectionProgress.value,
      [0, 1],
      [theme.glass.border, AppColors.primary],
    ),
  }));

  const handlePressIn = () => {
    scale.value = withSpring(0.96, { damping: 15, stiffness: 400 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 400 });
  };

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  const getBadgeText = () => {
    if (isLearned) return "Your Pick";
    if (isSuggested) return "Suggested";
    return null;
  };

  const badgeText = getBadgeText();

  return (
    <AnimatedPressable
      style={[styles.chip, animatedContainerStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="radio"
      accessibilityLabel={getAccessibilityLabel()}
      accessibilityState={{ selected: isSelected }}
      accessibilityHint={`Double tap to select ${config.label} as storage location`}
    >
      <View style={styles.chipContent}>
        <View
          style={[
            styles.iconContainer,
            isSelected && styles.iconContainerSelected,
          ]}
        >
          <Feather
            name={config.icon}
            size={ICON_SIZE}
            color={isSelected ? "#FFFFFF" : theme.text}
          />
        </View>
        <ThemedText
          type="body"
          style={[
            styles.chipLabel,
            { color: isSelected ? "#FFFFFF" : theme.text },
          ]}
        >
          {config.label}
        </ThemedText>
        {isSelected ? (
          <View style={styles.checkmark}>
            <Feather name="check" size={14} color="#FFFFFF" />
          </View>
        ) : null}
      </View>
      {badgeText ? (
        <View
          style={[
            styles.badge,
            {
              backgroundColor: isSelected
                ? "rgba(255,255,255,0.25)"
                : isLearned
                  ? AppColors.secondary + "20"
                  : AppColors.primary + "20",
            },
          ]}
        >
          {isLearned ? (
            <Feather
              name="star"
              size={10}
              color={isSelected ? "#FFFFFF" : AppColors.secondary}
              style={{ marginRight: 2 }}
            />
          ) : null}
          <ThemedText
            type="caption"
            style={[
              styles.badgeText,
              {
                color: isSelected
                  ? "#FFFFFF"
                  : isLearned
                    ? AppColors.secondary
                    : AppColors.primary,
              },
            ]}
          >
            {badgeText}
          </ThemedText>
        </View>
      ) : null}
    </AnimatedPressable>
  );
}

export function StorageSuggestionBadge({
  suggestedLocation,
  alternatives,
  onSelect,
  selectedLocation,
  confidence,
  shelfLifeDays,
}: StorageSuggestionBadgeProps) {
  const { theme } = useTheme();

  const allLocations: StorageLocation[] = [
    "refrigerator",
    "freezer",
    "pantry",
    "counter",
  ];
  const isLearned = confidence === "learned" || confidence === "strong";

  const getConfidenceLabel = () => {
    switch (confidence) {
      case "strong":
        return "Based on your preferences";
      case "learned":
        return "Learned from your choices";
      case "high":
        return "Recommended storage";
      case "medium":
        return "Suggested storage";
      case "low":
        return "Best guess";
      default:
        return "Storage options";
    }
  };

  return (
    <View
      style={styles.container}
      accessibilityRole={"radiogroup" as AccessibilityRole}
      accessibilityLabel="Storage location options"
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ThemedText type="h4" style={styles.headerTitle}>
            Where to Store
          </ThemedText>
          {confidence ? (
            <ThemedText
              type="caption"
              style={[styles.headerSubtitle, { color: theme.textSecondary }]}
            >
              {getConfidenceLabel()}
            </ThemedText>
          ) : null}
        </View>
        {shelfLifeDays ? (
          <View
            style={[
              styles.shelfLifeIndicator,
              { backgroundColor: theme.glass.background },
            ]}
            accessibilityLabel={`Shelf life: approximately ${shelfLifeDays} days`}
          >
            <Feather name="clock" size={12} color={AppColors.primary} />
            <ThemedText
              type="caption"
              style={{ color: AppColors.primary, fontWeight: "600" }}
            >
              ~{shelfLifeDays}d
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.chipsContainer}>
        {allLocations.map((location) => {
          const normalizedSuggested =
            suggestedLocation === "fridge" ? "refrigerator" : suggestedLocation;
          const isSuggested = location === normalizedSuggested;
          const normalizedSelected =
            selectedLocation === "fridge" ? "refrigerator" : selectedLocation;
          const isSelected = normalizedSelected === location;

          return (
            <LocationChip
              key={location}
              location={location}
              isSelected={isSelected}
              isSuggested={isSuggested}
              isLearned={isSuggested && isLearned}
              onPress={() =>
                onSelect(location === "refrigerator" ? "fridge" : location)
              }
              shelfLifeDays={isSelected ? shelfLifeDays : undefined}
            />
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: Spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    marginBottom: 2,
  },
  headerSubtitle: {
    opacity: 0.8,
  },
  shelfLifeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  chipsContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 4,
    width: "100%",
  },
  chip: {
    flex: 1,
    flexBasis: 0,
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    minHeight: MIN_CHIP_HEIGHT,
    gap: 2,
    overflow: "hidden",
  },
  chipContent: {
    alignItems: "center",
    gap: 2,
    position: "relative",
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  iconContainerSelected: {
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  chipLabel: {
    fontWeight: "600",
    fontSize: 12,
  },
  checkmark: {
    position: "absolute",
    top: -4,
    right: -8,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: AppColors.success,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.xs,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
    marginTop: 2,
  },
  badgeText: {
    fontSize: 8,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
});
