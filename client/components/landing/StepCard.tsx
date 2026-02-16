import { StyleSheet, View, Text, ViewStyle } from "react-native";
import { GlassCard } from "./GlassCard";
import { AppColors } from "@/constants/theme";
import { useTheme } from "@/hooks/useTheme";

interface StepCardProps {
  number: string;
  title: string;
  description: string;
  isWide?: boolean;
}

export function StepCard({
  number,
  title,
  description,
  isWide,
}: StepCardProps) {
  const { style } = useTheme();
  const lc = style.landing;

  return (
    <GlassCard
      style={[styles.stepCard, isWide && styles.stepCardWide] as ViewStyle[]}
      testId={`card-step-${number}`}
    >
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text
          style={[styles.stepTitle, { color: lc.textPrimary }]}
          data-testid={`text-step-title-${number}`}
        >
          {title}
        </Text>
        <Text
          style={[styles.stepDescription, { color: lc.textSecondary }]}
          data-testid={`text-step-desc-${number}`}
        >
          {description}
        </Text>
      </View>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  stepCardWide: {
    flex: 1,
    minWidth: 280,
  },
  stepNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontSize: 18,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  stepDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
});
