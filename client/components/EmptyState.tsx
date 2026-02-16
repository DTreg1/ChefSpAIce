import type { ComponentProps } from "react";
import { View, Pressable, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors, Typography } from "@/constants/theme";

type FeatherIconName = ComponentProps<typeof Feather>["name"];

interface EmptyStateProps {
  icon: FeatherIconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  actionDisabled,
}: EmptyStateProps) {
  const { theme, style: themeStyle } = useTheme();

  return (
    <View
      style={styles.container}
      testID="container-empty-state"
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${description}`}
    >
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: themeStyle.glass.background,
            borderColor: themeStyle.glass.border,
          },
        ]}
      >
        <Feather
          name={icon}
          size={48}
          color={theme.textSecondary}
          testID="icon-empty-state"
        />
      </View>
      <ThemedText
        type="h3"
        style={styles.title}
        testID="text-empty-state-title"
      >
        {title}
      </ThemedText>
      <ThemedText
        type="body"
        style={[styles.description, { color: theme.textSecondary }]}
        testID="text-empty-state-description"
      >
        {description}
      </ThemedText>
      {actionLabel && onAction && (
        <Pressable
          style={[
            styles.actionButton,
            { backgroundColor: AppColors.primary },
            actionDisabled && { opacity: 0.7 },
          ]}
          onPress={onAction}
          disabled={actionDisabled}
          accessibilityRole="button"
          accessibilityLabel={actionLabel}
          accessibilityState={{ disabled: actionDisabled }}
          testID="button-empty-state-action"
        >
          <ThemedText type="button" style={[styles.actionButtonText, { color: theme.buttonText }]}>
            {actionLabel}
          </ThemedText>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing["4xl"],
    paddingHorizontal: Spacing.xl,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  title: {
    marginTop: Spacing.lg,
    textAlign: "center",
    fontSize: Typography.h4.fontSize,
    fontWeight: "bold",
  },
  description: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontSize: Typography.small.fontSize,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.lg,
    marginTop: Spacing.xl,
  },
  actionButtonText: {
    fontWeight: "600",
  },
});
