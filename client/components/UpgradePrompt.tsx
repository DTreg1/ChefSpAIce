import { StyleSheet, View, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { MONTHLY_PRICE, ANNUAL_PRICE } from "@shared/subscription";

interface UpgradePromptProps {
  type: "limit" | "feature";
  limitName?: string;
  remaining?: number;
  max?: number;
  featureName?: string;
  onUpgrade: () => void;
  onDismiss: () => void;
}

export function UpgradePrompt({
  type,
  limitName,
  remaining,
  max,
  featureName,
  onUpgrade,
  onDismiss,
}: UpgradePromptProps) {
  const { theme } = useTheme();

  const isLimit = type === "limit";
  const iconName = isLimit ? "alert-circle" : "lock";
  const title = isLimit ? "Upgrade to Continue" : "Premium Feature";

  const message = isLimit
    ? `You've reached your ${limitName} limit (${remaining}/${max}). Subscribe to ChefSpAIce for unlimited access.`
    : `${featureName} is available with a ChefSpAIce subscription.`;

  const annualMonthly = (ANNUAL_PRICE / 12).toFixed(2);
  const priceInfo = `$${annualMonthly}/mo (billed annually at $${ANNUAL_PRICE.toFixed(2)}/yr) or $${MONTHLY_PRICE.toFixed(2)}/mo`;

  return (
    <View style={styles.overlay} data-testid="upgrade-prompt-overlay">
      <GlassCard style={styles.card} testID="upgrade-prompt-card">
        <Pressable
          style={styles.closeButton}
          onPress={onDismiss}
          accessibilityLabel="Close upgrade prompt"
          accessibilityRole="button"
          data-testid="button-dismiss-upgrade"
        >
          <Feather name="x" size={22} color={theme.textSecondary} />
        </Pressable>

        <View style={styles.content}>
          <View style={[styles.iconContainer, { backgroundColor: `${AppColors.primary}20` }]}>
            <Feather name={iconName} size={32} color={AppColors.primary} />
          </View>

          <ThemedText type="h3" style={styles.title} data-testid="text-upgrade-title">
            {title}
          </ThemedText>

          <ThemedText type="body" style={[styles.message, { color: theme.textSecondary }]} data-testid="text-upgrade-message">
            {message}
          </ThemedText>

          <ThemedText type="caption" style={[styles.priceInfo, { color: theme.textSecondary }]} data-testid="text-upgrade-price">
            {priceInfo}
          </ThemedText>

          <GlassButton
            onPress={onUpgrade}
            variant="primary"
            style={styles.subscribeButton}
            testID="button-subscribe-now"
            accessibilityLabel="Subscribe Now"
          >
            Subscribe Now
          </GlassButton>

          <Pressable
            onPress={onDismiss}
            style={styles.laterButton}
            accessibilityLabel="Maybe Later"
            accessibilityRole="button"
            data-testid="button-maybe-later"
          >
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              Maybe Later
            </ThemedText>
          </Pressable>
        </View>
      </GlassCard>
    </View>
  );
}

interface UsageBadgeProps {
  label: string;
  used: number;
  max: number | "unlimited";
}

export function UsageBadge({ label, used, max }: UsageBadgeProps) {
  const { theme } = useTheme();

  const displayText =
    max === "unlimited" ? `Unlimited ${label}` : `${used}/${max} ${label}`;

  return (
    <View
      style={[styles.badge, { backgroundColor: `${AppColors.primary}15` }]}
      data-testid={`badge-usage-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <ThemedText type="caption" style={{ color: theme.textSecondary }}>
        {displayText}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 1000,
    padding: Spacing.lg,
  },
  card: {
    width: "100%",
    maxWidth: 380,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    padding: Spacing.xs,
  },
  content: {
    alignItems: "center",
    paddingTop: Spacing.sm,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: BorderRadius.full,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  message: {
    textAlign: "center",
    marginBottom: Spacing.md,
    paddingHorizontal: Spacing.sm,
  },
  priceInfo: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  subscribeButton: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  laterButton: {
    paddingVertical: Spacing.sm,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
});
