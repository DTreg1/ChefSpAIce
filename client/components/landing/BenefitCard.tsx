import { StyleSheet, View, Text } from "react-native";
import { getLandingColors } from "./landing-colors";
import { useTheme } from "@/hooks/useTheme";

interface BenefitCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  testId: string;
  isWide?: boolean;
}

export function BenefitCard({
  icon,
  title,
  description,
  testId,
  isWide,
}: BenefitCardProps) {
  const { isDark } = useTheme();
  const lc = getLandingColors(isDark);

  return (
    <View
      style={[styles.benefitCard, isWide && styles.benefitCardWide]}
      data-testid={`card-benefit-${testId}`}
    >
      <View style={[styles.benefitIconContainer, { backgroundColor: lc.iconBgTint }]}>{icon}</View>
      <Text
        style={[styles.benefitTitle, { color: lc.textPrimary }]}
        data-testid={`text-benefit-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={[styles.benefitDescription, { color: lc.textSecondary }]}
        data-testid={`text-benefit-desc-${testId}`}
      >
        {description}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitCard: {
    alignItems: "center",
    padding: 24,
  },
  benefitCardWide: {
    width: "45%" as unknown as number,
    minWidth: 280,
  },
  benefitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  benefitDescription: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 24,
  },
});
