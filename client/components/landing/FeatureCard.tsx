import { StyleSheet, View, Text, ViewStyle } from "react-native";
import { GlassCard } from "./GlassCard";
import { useTheme } from "@/hooks/useTheme";

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isWide?: boolean;
}

export function FeatureCard({
  icon,
  title,
  description,
  testId,
  isWide,
}: FeatureCardProps) {
  const { style } = useTheme();
  const lc = style.landing;

  return (
    <GlassCard
      style={[styles.featureCard, isWide && styles.featureCardWide] as ViewStyle[]}
      testId={`card-feature-${testId}`}
    >
      <View style={[styles.featureIconContainer, { backgroundColor: lc.iconBgTint }]}>{icon}</View>
      <Text
        style={[styles.featureTitle, { color: lc.textPrimary }]}
        data-testid={`text-feature-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={[styles.featureDescription, { color: lc.textSecondary }]}
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
