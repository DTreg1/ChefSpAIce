import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  SlideInRight,
  SlideOutLeft,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";

interface WelcomeStepProps {
  theme: any;
  onNext: () => void;
}

export function WelcomeStep({ theme, onNext }: WelcomeStepProps) {
  return (
    <Animated.View
      entering={SlideInRight.duration(300)}
      exiting={SlideOutLeft.duration(200)}
      style={styles.stepContainer}
      data-testid="onboarding-welcome-step"
    >
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingHorizontal: Spacing.xl }}>
        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: `${AppColors.primary}26`,
            justifyContent: "center",
            alignItems: "center",
            marginBottom: Spacing.lg,
          }}
        >
          <Feather name="home" size={48} color={AppColors.primary} />
        </View>

        <ThemedText style={{ fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: Spacing.sm }}>
          Welcome to ChefSpAIce
        </ThemedText>
        <ThemedText style={{ fontSize: 16, textAlign: "center", color: theme.textSecondary, marginBottom: Spacing.xl, lineHeight: 22 }}>
          Your smart kitchen companion for reducing food waste and discovering delicious recipes
        </ThemedText>

        <View style={{ width: "100%", gap: Spacing.sm, marginBottom: Spacing.xl }}>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md }}>
            <Feather name="package" size={22} color={AppColors.primary} style={{ marginRight: Spacing.md }} />
            <ThemedText style={{ flex: 1, fontSize: 14, color: theme.text }}>Track your pantry and never waste food again</ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md }}>
            <Feather name="book-open" size={22} color={AppColors.primary} style={{ marginRight: Spacing.md }} />
            <ThemedText style={{ flex: 1, fontSize: 14, color: theme.text }}>Get AI-powered recipe ideas from what you have</ThemedText>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", backgroundColor: theme.backgroundSecondary, borderWidth: 1, borderColor: theme.border, borderRadius: BorderRadius.md, padding: Spacing.md }}>
            <Feather name="calendar" size={22} color={AppColors.primary} style={{ marginRight: Spacing.md }} />
            <ThemedText style={{ flex: 1, fontSize: 14, color: theme.text }}>Plan meals and generate smart shopping lists</ThemedText>
          </View>
        </View>

        <ThemedText style={{ fontSize: 13, color: theme.textSecondary, textAlign: "center", marginBottom: Spacing.lg }}>
          Let's set up your kitchen in just a few steps
        </ThemedText>

        <GlassButton
          onPress={onNext}
          variant="primary"
          style={{ width: "100%" }}
          data-testid="button-get-started"
        >
          Get Started
        </GlassButton>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
});
