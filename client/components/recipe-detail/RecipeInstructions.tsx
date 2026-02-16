import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { TermHighlighter, CookingTerm } from "./TermHighlighter";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { Recipe } from "@/lib/storage";
import type { ThemeColors } from "@/lib/types";

interface RecipeInstructionsProps {
  recipe: Recipe;
  showVoiceControls: boolean;
  voiceNav: {
    currentStep: number;
    isSpeaking: boolean;
    goToStep: (step: number) => void;
  };
  termHighlightingEnabled: boolean;
  onTermPress: (term: CookingTerm) => void;
  stepPositions: React.MutableRefObject<Record<number, number>>;
  onInstructionSectionLayout: (y: number) => void;
  theme: ThemeColors;
}

export function RecipeInstructions({
  recipe,
  showVoiceControls,
  voiceNav,
  termHighlightingEnabled,
  onTermPress,
  stepPositions,
  onInstructionSectionLayout,
  theme,
}: RecipeInstructionsProps) {
  return (
    <View
      onLayout={(e) => {
        onInstructionSectionLayout(e.nativeEvent.layout.y);
      }}
    >
      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Instructions</ThemedText>
          {showVoiceControls ? (
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              Step {voiceNav.currentStep + 1}/{recipe.instructions.length}
            </ThemedText>
          ) : null}
        </View>

        {recipe.instructions.map((instruction, index) => {
          const isCurrentStep =
            showVoiceControls && voiceNav.currentStep === index;
          const isPastStep =
            showVoiceControls && index < voiceNav.currentStep;

          return (
            <View
              key={index}
              onLayout={(e) => {
                stepPositions.current[index] = e.nativeEvent.layout.y;
              }}
            >
              <Pressable
                onPress={() => {
                  if (showVoiceControls) {
                    voiceNav.goToStep(index);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`Step ${index + 1}${isCurrentStep ? ', current step' : ''}${isPastStep ? ', completed' : ''}`}
                accessibilityHint={showVoiceControls ? "Tap to jump to this step" : ""}
              >
                <View
                  style={[
                    styles.instructionRow,
                    isCurrentStep && styles.currentStepRow,
                    isPastStep && styles.pastStepRow,
                  ]}
                >
                  <View
                    style={[
                      styles.stepNumber,
                      {
                        backgroundColor: isCurrentStep
                          ? AppColors.primary
                          : isPastStep
                            ? AppColors.success
                            : theme.backgroundDefault,
                      },
                    ]}
                  >
                    {isPastStep ? (
                      <Feather name="check" size={14} color="#FFFFFF" />
                    ) : (
                      <ThemedText
                        type="small"
                        style={[
                          styles.stepNumberText,
                          { color: isCurrentStep ? "#FFFFFF" : theme.text },
                        ]}
                      >
                        {index + 1}
                      </ThemedText>
                    )}
                  </View>
                  <View style={styles.instructionText}>
                    {termHighlightingEnabled ? (
                      <TermHighlighter
                        text={instruction}
                        onTermPress={onTermPress}
                      />
                    ) : (
                      <ThemedText
                        type="body"
                        style={[
                          isCurrentStep && styles.currentStepText,
                          isPastStep && styles.pastStepText,
                        ]}
                      >
                        {instruction}
                      </ThemedText>
                    )}
                  </View>
                  {isCurrentStep && voiceNav.isSpeaking ? (
                    <Feather
                      name="volume-2"
                      size={16}
                      color={AppColors.primary}
                    />
                  ) : null}
                </View>
              </Pressable>
            </View>
          );
        })}
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.md,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  instructionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignItems: "flex-start",
  },
  currentStepRow: {
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    borderWidth: 1,
    borderColor: AppColors.primary,
  },
  pastStepRow: {},
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontWeight: "600",
  },
  instructionText: {
    flex: 1,
    paddingTop: 2,
  },
  currentStepText: {
    fontWeight: "600",
  },
  pastStepText: {
    textDecorationLine: "line-through",
  },
});
