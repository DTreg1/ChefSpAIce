import React from "react";
import { View, StyleSheet, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { CookingTerm } from "./TermHighlighter";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface TermTooltipProps {
  term: CookingTerm | null;
  visible: boolean;
  onClose: () => void;
  onLearnMore?: (term: CookingTerm) => void;
}

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: AppColors.success,
  intermediate: AppColors.warning,
  advanced: AppColors.error,
};

export function TermTooltip({
  term,
  visible,
  onClose,
  onLearnMore,
}: TermTooltipProps) {
  const { theme, style: themeStyle } = useTheme();
  const insets = useSafeAreaInsets();
  const { onAccessibilityEscape } = useFocusTrap({
    visible,
    onDismiss: onClose,
  });

  if (!term) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal={true}
    >
      <Pressable style={[styles.overlay, { backgroundColor: themeStyle.surface.overlaySubtle }]} onPress={onClose} accessibilityRole="button" accessibilityLabel="Dismiss tooltip">
        <Pressable
          style={[
            styles.tooltipContainer,
            { paddingBottom: insets.bottom + Spacing.lg },
          ]}
          onPress={(e) => e.stopPropagation()}
          accessibilityRole="none"
          onAccessibilityEscape={onAccessibilityEscape}
        >
          <GlassCard style={styles.tooltip} intensity="strong">
            <View style={styles.header}>
              <View style={styles.titleRow}>
                <ThemedText type="h3">{term.term}</ThemedText>
                <Pressable
                  onPress={onClose}
                  style={styles.closeButton}
                  accessibilityLabel="Close"
                  accessibilityRole="button"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Feather name="x" size={20} color={theme.textSecondary} />
                </Pressable>
              </View>

              {term.pronunciation ? (
                <ThemedText
                  type="small"
                  style={[styles.pronunciation, { color: theme.textSecondary }]}
                >
                  /{term.pronunciation}/
                </ThemedText>
              ) : null}
            </View>

            <View style={styles.badges}>
              <View
                style={[
                  styles.badge,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <ThemedText type="caption" style={{ color: theme.primary }}>
                  {term.category}
                </ThemedText>
              </View>

              {term.difficulty ? (
                <View
                  style={[
                    styles.badge,
                    {
                      backgroundColor:
                        (DIFFICULTY_COLORS[term.difficulty] ||
                          theme.textSecondary) + "20",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.difficultyDot,
                      {
                        backgroundColor:
                          DIFFICULTY_COLORS[term.difficulty] ||
                          theme.textSecondary,
                      },
                    ]}
                  />
                  <ThemedText
                    type="caption"
                    style={{
                      color:
                        DIFFICULTY_COLORS[term.difficulty] ||
                        theme.textSecondary,
                    }}
                  >
                    {term.difficulty}
                  </ThemedText>
                </View>
              ) : null}
            </View>

            <ThemedText type="body" style={styles.definition}>
              {term.definition}
            </ThemedText>

            {onLearnMore ? (
              <GlassButton
                variant="ghost"
                onPress={() => onLearnMore(term)}
                style={styles.learnMoreButton}
              >
                <View style={styles.learnMoreContent}>
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    Learn more
                  </ThemedText>
                  <Feather name="arrow-right" size={14} color={theme.primary} />
                </View>
              </GlassButton>
            ) : null}
          </GlassCard>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  tooltipContainer: {
    paddingHorizontal: Spacing.lg,
  },
  tooltip: {
    gap: Spacing.md,
  },
  header: {
    gap: Spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  closeButton: {
    padding: Spacing.xs,
    marginTop: -Spacing.xs,
    marginRight: -Spacing.xs,
  },
  pronunciation: {
    fontStyle: "italic",
  },
  badges: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
  },
  difficultyDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  definition: {
    lineHeight: 24,
  },
  learnMoreButton: {
    alignSelf: "flex-start",
    paddingHorizontal: 0,
    paddingVertical: Spacing.xs,
  },
  learnMoreContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
});
