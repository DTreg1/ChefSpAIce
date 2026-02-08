import { StyleSheet, View, Text, ViewStyle } from "react-native";
import { GlassCard } from "./GlassCard";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isDark: boolean;
  isWide?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  testId,
  isDark,
  isWide,
}: FeatureCardProps) {
  return (
    <GlassCard
      style={[styles.featureCard, isWide && styles.featureCardWide] as ViewStyle[]}
      testId={`card-feature-${testId}`}
    >
      <View style={styles.featureIconContainer}>{icon}</View>
      <Text
        style={[styles.featureTitle, { color: "rgba(255, 255, 255, 0.5)" }]}
        data-testid={`text-feature-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={[styles.featureDescription, { color: "rgba(255,255,255,0.8)" }]}
        data-testid={`text-feature-desc-${testId}`}
      >
        {description}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  featureCard: {
    padding: 24,
  },
  featureCardWide: {
    minWidth: 280,
    maxWidth: 300,
  },
  featureIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  featureTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
  },
  featureDescription: {
    fontSize: 14,
    lineHeight: 22,
  },
});
