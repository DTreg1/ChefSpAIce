import { StyleSheet, View, Text } from "react-native";
import { Feather } from "@expo/vector-icons";
import { AppColors } from "@/constants/theme";
import { BenefitCard } from "./BenefitCard";
import { sharedStyles, getLandingTextStyles } from "./shared-styles";
import { useTheme } from "@/hooks/useTheme";

interface BenefitsSectionProps {
  isWide: boolean;
}

export function BenefitsSection({ isWide }: BenefitsSectionProps) {
  const { style } = useTheme();
  const textStyles = getLandingTextStyles(style.landing);

  return (
    <View style={sharedStyles.section} data-testid="section-benefits">
      <Text style={textStyles.sectionTitle} data-testid="text-benefits-title">
        Why Choose ChefSpAIce?
      </Text>
      <Text
        style={textStyles.sectionSubtitle}
        data-testid="text-benefits-subtitle"
      >
        Save money, reduce waste, and eat better
      </Text>

      <View
        style={[styles.benefitsGrid, isWide && styles.benefitsGridWide]}
      >
        <BenefitCard
          testId="save-money"
          isWide={isWide}
          icon={
            <Feather
              name="dollar-sign"
              size={32}
              color={AppColors.primary}
            />
          }
          title="Save $200+/month"
          description="Stop throwing away expired food. Our users save an average of $200 per month on groceries."
        />
        <BenefitCard
          testId="reduce-waste"
          isWide={isWide}
          icon={
            <Feather name="trash-2" size={32} color={AppColors.primary} />
          }
          title="Reduce Waste by 70%"
          description="Smart expiration tracking and AI-powered meal planning means less food in the trash."
        />
        <BenefitCard
          testId="eat-better"
          isWide={isWide}
          icon={
            <Feather name="heart" size={32} color={AppColors.primary} />
          }
          title="Eat Healthier"
          description="Personalized recipes based on your dietary preferences and what's actually in your kitchen."
        />
        <BenefitCard
          testId="save-time"
          isWide={isWide}
          icon={
            <Feather name="clock" size={32} color={AppColors.primary} />
          }
          title="Save 5+ Hours/Week"
          description="No more wondering 'what's for dinner?' AI suggests meals in seconds, not hours."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  benefitsGrid: {
    flexDirection: "column",
    gap: 24,
    width: "100%",
    maxWidth: 800,
  },
  benefitsGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 32,
  },
});
