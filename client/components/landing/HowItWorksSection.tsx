import { StyleSheet, View, Text } from "react-native";
import { StepCard } from "./StepCard";
import { sharedStyles, getLandingTextStyles } from "./shared-styles";

interface HowItWorksSectionProps {
  isWide: boolean;
  isDark: boolean;
}

export function HowItWorksSection({ isWide, isDark }: HowItWorksSectionProps) {
  const textStyles = getLandingTextStyles(isDark);

  return (
    <View style={sharedStyles.section} data-testid="section-how-it-works">
      <Text style={textStyles.sectionTitle} data-testid="text-howitworks-title">
        How It Works
      </Text>
      <Text
        style={textStyles.sectionSubtitle}
        data-testid="text-howitworks-subtitle"
      >
        Get started in three simple steps
      </Text>

      <View
        style={[styles.stepsContainer, isWide && styles.stepsContainerWide]}
      >
        <StepCard
          number="1"
          title="Add Your Food"
          description="Scan barcodes, take photos, or manually add items to your inventory."
          isDark={isDark}
          isWide={isWide}
        />
        <StepCard
          number="2"
          title="Get AI Recipes"
          description="Tell us what you're craving and we'll create recipes using your ingredients."
          isDark={isDark}
          isWide={isWide}
        />
        <StepCard
          number="3"
          title="Plan & Cook"
          description="Add recipes to your meal plan and follow step-by-step instructions."
          isDark={isDark}
          isWide={isWide}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stepsContainer: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  stepsContainerWide: {
    flexDirection: "row",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
});
