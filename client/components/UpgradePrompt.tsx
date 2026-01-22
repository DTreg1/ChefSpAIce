import { StyleSheet, View, Pressable, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { GlassView, isLiquidGlassAvailable } from "@/lib/glass-effect-safe";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  WithSpringConfig,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, AppColors, GlassEffect } from "@/constants/theme";

type ProBenefit = {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  text: string;
};

const PRO_BENEFITS: Record<string, ProBenefit[]> = {
  pantryItems: [
    { icon: "infinity", text: "Unlimited pantry items" },
    { icon: "robot", text: "Unlimited AI recipes" },
    { icon: "chef-hat", text: "Live AI Kitchen Assistant" },
  ],
  aiRecipes: [
    { icon: "infinity", text: "Unlimited AI recipe generation" },
    { icon: "camera", text: "Recipe scanning from photos" },
    { icon: "barcode-scan", text: "Bulk barcode scanning" },
  ],
  cookware: [
    { icon: "infinity", text: "Unlimited cookware items" },
    { icon: "pot-steam", text: "Equipment-aware recipes" },
    { icon: "robot", text: "Smart cooking suggestions" },
  ],
  recipeScanning: [
    { icon: "camera", text: "Scan recipes from photos" },
    { icon: "text-recognition", text: "AI ingredient extraction" },
    { icon: "content-save", text: "Save to your collection" },
  ],
  bulkScanning: [
    { icon: "barcode-scan", text: "Scan multiple items at once" },
    { icon: "lightning-bolt", text: "Faster inventory updates" },
    { icon: "clock-fast", text: "Save time restocking" },
  ],
  aiKitchenAssistant: [
    { icon: "robot", text: "Live AI Kitchen Assistant" },
    { icon: "chat", text: "Ask cooking questions anytime" },
    { icon: "lightbulb", text: "Get personalized tips" },
  ],
  weeklyMealPrepping: [
    { icon: "calendar-week", text: "Weekly meal prep plans" },
    { icon: "food-variant", text: "Batch cooking guides" },
    { icon: "chart-timeline", text: "Smart shopping lists" },
  ],
  customStorageAreas: [
    { icon: "archive", text: "Custom storage locations" },
    { icon: "sort", text: "Organize your way" },
    { icon: "magnify", text: "Find items faster" },
  ],
  default: [
    { icon: "infinity", text: "Unlimited everything" },
    { icon: "star", text: "All premium features" },
    { icon: "rocket-launch", text: "Priority support" },
  ],
};

interface UpgradePromptProps {
  type: "limit" | "feature";
  limitName?: string;
  featureName?: string;
  remaining?: number;
  max?: number;
  onUpgrade: () => void;
  onDismiss: () => void;
}

const springConfig: WithSpringConfig = {
  damping: 15,
  mass: 0.3,
  stiffness: 150,
  overshootClamping: true,
  energyThreshold: 0.001,
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function UpgradePrompt({
  type,
  limitName,
  featureName,
  remaining,
  max,
  onUpgrade,
  onDismiss,
}: UpgradePromptProps) {
  const { theme, isDark } = useTheme();
  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  const benefitKey = type === "limit" 
    ? (limitName?.replace(/\s+/g, "") || "default").toLowerCase()
    : (featureName?.replace(/\s+/g, "") || "default").toLowerCase();
  
  const benefits = PRO_BENEFITS[benefitKey] || PRO_BENEFITS.default;

  const getMessage = () => {
    if (type === "limit" && limitName) {
      if (remaining !== undefined && max !== undefined) {
        const used = max - remaining;
        return `You've used ${used} of ${max} ${limitName}. Upgrade to Pro for unlimited access.`;
      }
      if (remaining === 0) {
        return `You've reached your ${limitName} limit. Upgrade to Pro for unlimited access.`;
      }
      return `You're running low on ${limitName}. Upgrade to Pro for unlimited access.`;
    }
    if (type === "feature" && featureName) {
      return `${featureName} is a Pro feature. Upgrade to unlock it.`;
    }
    return "Upgrade to Pro to unlock all features.";
  };

  const getTitle = () => {
    if (type === "limit") {
      return remaining === 0 ? "Limit Reached" : "Running Low";
    }
    return "Pro Feature";
  };

  const getIcon = () => {
    if (type === "limit") {
      return remaining === 0 ? "alert-circle" : "alert";
    }
    return "lock-closed";
  };

  const renderContent = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${AppColors.secondary}30` }]}>
          <Ionicons name={getIcon()} size={28} color={AppColors.secondary} />
        </View>
        <Pressable
          onPress={onDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          data-testid="button-dismiss-upgrade"
        >
          <Ionicons name="close" size={24} color={theme.textOnGlass} />
        </Pressable>
      </View>

      <ThemedText type="h3" style={[styles.title, { color: theme.textOnGlass }]} data-testid="text-upgrade-title">
        {getTitle()}
      </ThemedText>

      <ThemedText type="body" style={[styles.message, { color: theme.textSecondaryOnGlass }]} data-testid="text-upgrade-message">
        {getMessage()}
      </ThemedText>

      <View style={styles.benefitsContainer}>
        <ThemedText type="caption" style={[styles.benefitsLabel, { color: theme.textSecondaryOnGlass }]}>
          Pro includes:
        </ThemedText>
        {benefits.map((benefit, index) => (
          <View key={index} style={styles.benefitRow}>
            <MaterialCommunityIcons
              name={benefit.icon}
              size={20}
              color={AppColors.primary}
            />
            <ThemedText type="body" style={[styles.benefitText, { color: theme.textOnGlass }]}>
              {benefit.text}
            </ThemedText>
          </View>
        ))}
      </View>

      <View style={styles.buttonContainer}>
        <GlassButton
          variant="primary"
          onPress={onUpgrade}
          style={styles.upgradeButton}
          testID="button-upgrade-to-pro"
          icon={<Ionicons name="rocket" size={18} color="#FFFFFF" />}
        >
          Upgrade to Pro
        </GlassButton>
        <GlassButton
          variant="ghost"
          onPress={onDismiss}
          style={styles.laterButton}
          testID="button-maybe-later"
        >
          Maybe Later
        </GlassButton>
      </View>
    </View>
  );

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.card,
          styles.webGlass,
          {
            backgroundColor: theme.glass.backgroundStrong,
            borderColor: theme.glass.border,
          },
        ]}
        data-testid="upgrade-prompt"
      >
        {renderContent()}
      </View>
    );
  }

  if (useLiquidGlass) {
    return (
      <GlassView
        glassEffectStyle="regular"
        style={styles.card}
        testID="upgrade-prompt"
      >
        {renderContent()}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={60}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.card,
        {
          borderColor: theme.glass.border,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
      testID="upgrade-prompt"
    >
      <View style={styles.glassOverlay}>{renderContent()}</View>
    </BlurView>
  );
}

interface UsageBadgeProps {
  current: number;
  max: number | "unlimited";
  onPress?: () => void;
}

export function UsageBadge({ current, max, onPress }: UsageBadgeProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (onPress) {
      scale.value = withSpring(0.97, springConfig);
    }
  };

  const handlePressOut = () => {
    if (onPress) {
      scale.value = withSpring(1, springConfig);
    }
  };

  const remaining = max === "unlimited" ? Infinity : max - current;
  const isLow = max !== "unlimited" && remaining <= 2 && remaining > 0;
  const isExhausted = max !== "unlimited" && remaining <= 0;

  const getColor = () => {
    if (isExhausted) return AppColors.error;
    if (isLow) return AppColors.warning;
    return AppColors.primary;
  };

  const getText = () => {
    if (max === "unlimited") return `${current}`;
    return `${current}/${max}`;
  };

  const BadgeContent = (
    <>
      {max === "unlimited" ? (
        <MaterialCommunityIcons name="infinity" size={14} color={getColor()} />
      ) : null}
      <ThemedText type="small" style={[styles.usageBadgeText, { color: getColor() }]}>
        {getText()}
      </ThemedText>
      {isExhausted || isLow ? (
        <Ionicons name="arrow-up-circle" size={14} color={getColor()} />
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={[
          styles.usageBadge,
          { backgroundColor: `${getColor()}15`, borderColor: `${getColor()}40` },
          animatedStyle,
        ]}
        data-testid="badge-usage"
      >
        {BadgeContent}
      </AnimatedPressable>
    );
  }

  return (
    <View
      style={[
        styles.usageBadge,
        { backgroundColor: `${getColor()}15`, borderColor: `${getColor()}40` },
      ]}
      data-testid="badge-usage"
    >
      {BadgeContent}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: GlassEffect.borderRadius.xl,
    overflow: "hidden",
    maxWidth: 400,
    width: "100%",
  },
  webGlass: {
    borderWidth: 1,
    ...Platform.select({
      web: {
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      } as any,
    }),
  },
  glassOverlay: {
    flex: 1,
  },
  content: {
    padding: Spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    padding: Spacing.xs,
  },
  title: {
    marginBottom: Spacing.sm,
  },
  message: {
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  benefitsContainer: {
    marginBottom: Spacing.xl,
  },
  benefitsLabel: {
    marginBottom: Spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 1,
    fontSize: 11,
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  benefitText: {
    flex: 1,
  },
  buttonContainer: {
    gap: Spacing.sm,
  },
  upgradeButton: {
    width: "100%",
  },
  laterButton: {
    width: "100%",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
  },
  compactBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: "600",
    fontSize: 12,
  },
  usageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingVertical: 4,
    paddingHorizontal: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: 1,
  },
  usageBadgeText: {
    fontWeight: "600",
    fontSize: 12,
  },
});
