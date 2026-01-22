import React, { useCallback, useEffect, useRef } from "react";
import { View, Pressable, StyleSheet, Platform, Animated } from "react-native";
import { BlurView } from "expo-blur";
import {
  GlassView,
  isLiquidGlassAvailable,
} from "@/components/GlassViewWithContext";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import {
  Colors,
  Spacing,
  BorderRadius,
  GlassEffect,
  AppColors,
} from "@/constants/theme";

const IS_WEB = Platform.OS === "web";

interface RecipeVoiceControlsProps {
  currentStep: number;
  totalSteps: number;
  isSpeaking: boolean;
  isPaused: boolean;
  isListening: boolean;
  isProcessing: boolean;
  speechRate: number;
  handsFreeModeEnabled: boolean;
  canPause: boolean;
  onNextStep: () => void;
  onPreviousStep: () => void;
  onRepeatStep: () => void;
  onTogglePause: () => void;
  onStop: () => void;
  onIncreaseSpeechRate: () => void;
  onDecreaseSpeechRate: () => void;
  onToggleHandsFree: () => void;
  onStartListening: () => void;
  onStopListening: () => void;
  onReadRecipe: () => void;
}

export function RecipeVoiceControls({
  currentStep,
  totalSteps,
  isSpeaking,
  isPaused,
  isListening,
  isProcessing,
  speechRate,
  handsFreeModeEnabled,
  canPause,
  onNextStep,
  onPreviousStep,
  onRepeatStep,
  onTogglePause,
  onStop,
  onIncreaseSpeechRate,
  onDecreaseSpeechRate,
  onToggleHandsFree,
  onStartListening,
  onStopListening,
  onReadRecipe,
}: RecipeVoiceControlsProps) {
  const { isDark, theme } = useTheme();
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const speakingAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isListening) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      pulseAnim.stopAnimation();
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [isListening, pulseAnim]);

  useEffect(() => {
    if (isSpeaking && !isPaused) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(speakingAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(speakingAnim, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      speakingAnim.stopAnimation();
      Animated.timing(speakingAnim, {
        toValue: 0,
        duration: 100,
        useNativeDriver: true,
      }).start();
    }
  }, [isSpeaking, isPaused, speakingAnim]);

  const triggerHaptic = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, []);

  const handleVoiceButtonPress = useCallback(() => {
    triggerHaptic();
    if (isListening) {
      onStopListening();
    } else if (!isProcessing) {
      onStartListening();
    }
  }, [
    isListening,
    isProcessing,
    onStartListening,
    onStopListening,
    triggerHaptic,
  ]);

  const handlePreviousPress = useCallback(() => {
    triggerHaptic();
    onPreviousStep();
  }, [onPreviousStep, triggerHaptic]);

  const handleNextPress = useCallback(() => {
    triggerHaptic();
    onNextStep();
  }, [onNextStep, triggerHaptic]);

  const handleRepeatPress = useCallback(() => {
    triggerHaptic();
    onRepeatStep();
  }, [onRepeatStep, triggerHaptic]);

  const handlePlayPausePress = useCallback(() => {
    triggerHaptic();
    if (isSpeaking || isPaused) {
      if (canPause) {
        onTogglePause();
      } else {
        onStop();
      }
    } else {
      onReadRecipe();
    }
  }, [
    isSpeaking,
    isPaused,
    canPause,
    onTogglePause,
    onStop,
    onReadRecipe,
    triggerHaptic,
  ]);

  const handleSpeedDecrease = useCallback(() => {
    triggerHaptic();
    onDecreaseSpeechRate();
  }, [onDecreaseSpeechRate, triggerHaptic]);

  const handleSpeedIncrease = useCallback(() => {
    triggerHaptic();
    onIncreaseSpeechRate();
  }, [onIncreaseSpeechRate, triggerHaptic]);

  const handleHandsFreeToggle = useCallback(() => {
    triggerHaptic();
    onToggleHandsFree();
  }, [onToggleHandsFree, triggerHaptic]);

  const getVoiceButtonColor = () => {
    if (isProcessing) return theme.textSecondary;
    if (isListening) return "#E53935";
    return AppColors.primary;
  };

  const speakingOpacity = speakingAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const containerStyle = [
    styles.container,
    {
      backgroundColor: isDark
        ? Colors.dark.glass.background
        : Colors.light.glass.background,
      borderColor: isDark
        ? Colors.dark.glass.border
        : Colors.light.glass.border,
    },
  ];

  const renderContent = () => (
    <>
      <View style={styles.stepIndicator}>
        <ThemedText type="caption" style={styles.stepText}>
          Step {currentStep + 1} of {totalSteps}
        </ThemedText>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${((currentStep + 1) / totalSteps) * 100}%`,
                backgroundColor: AppColors.primary,
              },
            ]}
          />
        </View>
      </View>

      <View style={styles.statusRow}>
        {isSpeaking && !isPaused ? (
          <Animated.View
            style={[styles.statusBadge, { opacity: speakingOpacity }]}
          >
            <Feather name="volume-2" size={12} color={AppColors.primary} />
            <ThemedText type="caption" style={{ color: AppColors.primary }}>
              Speaking
            </ThemedText>
          </Animated.View>
        ) : null}

        {isListening ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: "rgba(229, 57, 53, 0.15)" },
            ]}
          >
            <Feather name="mic" size={12} color="#E53935" />
            <ThemedText type="caption" style={{ color: "#E53935" }}>
              Listening
            </ThemedText>
          </View>
        ) : null}

        {isProcessing ? (
          <View style={styles.statusBadge}>
            <Feather name="loader" size={12} color={theme.textSecondary} />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Processing
            </ThemedText>
          </View>
        ) : null}

        {handsFreeModeEnabled ? (
          <View
            style={[
              styles.statusBadge,
              { backgroundColor: "rgba(76, 175, 80, 0.15)" },
            ]}
          >
            <Feather name="headphones" size={12} color={AppColors.success} />
            <ThemedText type="caption" style={{ color: AppColors.success }}>
              Hands-free
            </ThemedText>
          </View>
        ) : null}
      </View>

      <View style={styles.mainControls}>
        <Pressable
          onPress={handlePreviousPress}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          disabled={currentStep === 0}
          accessibilityLabel="Previous step"
        >
          <Feather
            name="skip-back"
            size={20}
            color={currentStep === 0 ? theme.textSecondary : theme.text}
          />
        </Pressable>

        <Pressable
          onPress={handleRepeatPress}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel="Repeat current step"
        >
          <Feather name="repeat" size={20} color={theme.text} />
        </Pressable>

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Pressable
            onPress={handleVoiceButtonPress}
            disabled={isProcessing}
            style={({ pressed }) => [
              styles.voiceButton,
              {
                backgroundColor: getVoiceButtonColor(),
                opacity: pressed ? 0.8 : 1,
              },
            ]}
            accessibilityLabel={
              isListening ? "Stop listening" : "Start voice command"
            }
          >
            <Feather name="mic" size={24} color="#FFFFFF" />
          </Pressable>
        </Animated.View>

        <Pressable
          onPress={handlePlayPausePress}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel={isSpeaking && !isPaused ? "Pause" : "Play recipe"}
        >
          <Feather
            name={
              isSpeaking && !isPaused ? (canPause ? "pause" : "square") : "play"
            }
            size={20}
            color={theme.text}
          />
        </Pressable>

        <Pressable
          onPress={handleNextPress}
          style={({ pressed }) => [
            styles.navButton,
            {
              backgroundColor: theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          disabled={currentStep >= totalSteps - 1}
          accessibilityLabel="Next step"
        >
          <Feather
            name="skip-forward"
            size={20}
            color={
              currentStep >= totalSteps - 1 ? theme.textSecondary : theme.text
            }
          />
        </Pressable>
      </View>

      <View style={styles.secondaryControls}>
        <View style={styles.speedControl}>
          <Pressable
            onPress={handleSpeedDecrease}
            style={({ pressed }) => [
              styles.speedButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            disabled={speechRate <= 0.5}
            accessibilityLabel="Decrease speed"
          >
            <Feather name="minus" size={16} color={theme.text} />
          </Pressable>

          <ThemedText type="caption" style={styles.speedText}>
            {speechRate.toFixed(1)}x
          </ThemedText>

          <Pressable
            onPress={handleSpeedIncrease}
            style={({ pressed }) => [
              styles.speedButton,
              {
                backgroundColor: theme.backgroundDefault,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            disabled={speechRate >= 2.0}
            accessibilityLabel="Increase speed"
          >
            <Feather name="plus" size={16} color={theme.text} />
          </Pressable>
        </View>

        <Pressable
          onPress={handleHandsFreeToggle}
          style={({ pressed }) => [
            styles.handsFreeButton,
            {
              backgroundColor: handsFreeModeEnabled
                ? AppColors.success
                : theme.backgroundDefault,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          accessibilityLabel={
            handsFreeModeEnabled
              ? "Disable hands-free mode"
              : "Enable hands-free mode"
          }
        >
          <Feather
            name="headphones"
            size={16}
            color={handsFreeModeEnabled ? "#FFFFFF" : theme.text}
          />
          <ThemedText
            type="caption"
            style={{ color: handsFreeModeEnabled ? "#FFFFFF" : theme.text }}
          >
            Hands-free
          </ThemedText>
        </Pressable>
      </View>
    </>
  );

  if (IS_WEB) {
    return (
      <View style={[containerStyle, styles.webFallback]}>
        {renderContent()}
      </View>
    );
  }

  const useLiquidGlass = Platform.OS === "ios" && isLiquidGlassAvailable();

  if (useLiquidGlass) {
    return (
      <GlassView glassEffectStyle="regular" style={containerStyle}>
        {renderContent()}
      </GlassView>
    );
  }

  return (
    <BlurView
      intensity={GlassEffect.blur.regular}
      tint={isDark ? "dark" : "light"}
      style={containerStyle}
    >
      {renderContent()}
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    padding: Spacing.md,
    gap: Spacing.sm,
    overflow: "hidden",
  },
  stepIndicator: {
    gap: Spacing.xs,
  },
  stepText: {
    textAlign: "center",
    fontWeight: "600",
  },
  progressBar: {
    height: 4,
    backgroundColor: "rgba(128, 128, 128, 0.2)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: 2,
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    minHeight: 24,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    backgroundColor: "rgba(128, 128, 128, 0.1)",
  },
  mainControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  voiceButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      web: {
        boxShadow: "0px 2px 4px rgba(0, 0, 0, 0.25)",
      },
      default: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 4,
      },
    }),
  },
  secondaryControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  speedControl: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  speedButton: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  speedText: {
    width: 40,
    textAlign: "center",
    fontWeight: "600",
  },
  handsFreeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
  },
  webFallback: {
    ...Platform.select({
      web: {
        backdropFilter: "blur(10px) saturate(180%)",
        WebkitBackdropFilter: "blur(10px) saturate(180%)",
      } as any,
    }),
  },
});
