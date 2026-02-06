import { StyleSheet, View, Text } from "react-native";

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
  return (
    <View
      style={[styles.benefitCard, isWide && styles.benefitCardWide]}
      data-testid={`card-benefit-${testId}`}
    >
      <View style={styles.benefitIconContainer}>{icon}</View>
      <Text
        style={styles.benefitTitle}
        data-testid={`text-benefit-title-${testId}`}
      >
        {title}
      </Text>
      <Text
        style={styles.benefitDescription}
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
    width: "45%" as any,
    minWidth: 280,
  },
  benefitIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(39, 174, 96, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  benefitTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    marginBottom: 8,
    textAlign: "center",
  },
  benefitDescription: {
    fontSize: 15,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    lineHeight: 24,
  },
});
