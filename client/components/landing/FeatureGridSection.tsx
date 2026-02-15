import { StyleSheet, View, Text } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import { AppColors } from "@/constants/theme";
import { FeatureCard } from "./FeatureCard";
import { sharedStyles, getLandingTextStyles } from "./shared-styles";

interface FeatureGridSectionProps {
  isWide: boolean;
  isDark: boolean;
}

export function FeatureGridSection({ isWide, isDark }: FeatureGridSectionProps) {
  const textStyles = getLandingTextStyles(isDark);

  return (
    <View style={sharedStyles.section} data-testid="section-features">
      <Text style={textStyles.sectionTitle} data-testid="text-features-title">
        Smart Features
      </Text>
      <Text
        style={textStyles.sectionSubtitle}
        data-testid="text-features-subtitle"
      >
        Everything you need to run an efficient kitchen
      </Text>

      <View
        style={[styles.featuresGrid, isWide && styles.featuresGridWide]}
      >
        <FeatureCard
          testId="barcode"
          isDark={isDark}
          isWide={isWide}
          icon={
            <MaterialCommunityIcons
              name="barcode-scan"
              size={28}
              color={AppColors.primary}
            />
          }
          title="Barcode Scanning"
          description="Quickly add items to your inventory by scanning barcodes. Automatic product info lookup."
        />
        <FeatureCard
          testId="ai-recipes"
          isDark={isDark}
          isWide={isWide}
          icon={
            <MaterialCommunityIcons
              name="creation"
              size={28}
              color={AppColors.primary}
            />
          }
          title="AI Recipe Generation"
          description="Get personalized recipes based on what's in your pantry. No more wasted ingredients."
        />
        <FeatureCard
          testId="expiration"
          isDark={isDark}
          isWide={isWide}
          icon={
            <Feather name="clock" size={28} color={AppColors.primary} />
          }
          title="Expiration Tracking"
          description="Never forget about food again. Get notifications before items expire."
        />
        <FeatureCard
          testId="meal-planning"
          isDark={isDark}
          isWide={isWide}
          icon={
            <Feather name="calendar" size={28} color={AppColors.primary} />
          }
          title="Meal Planning"
          description="Plan your week with a beautiful calendar view. Drag and drop recipes to any day."
        />
        <FeatureCard
          testId="shopping"
          isDark={isDark}
          isWide={isWide}
          icon={
            <Feather
              name="shopping-cart"
              size={28}
              color={AppColors.primary}
            />
          }
          title="Smart Shopping Lists"
          description="Auto-generate shopping lists from recipes. Check off items as you shop."
        />
        <FeatureCard
          testId="analytics"
          isDark={isDark}
          isWide={isWide}
          icon={
            <Feather
              name="bar-chart-2"
              size={28}
              color={AppColors.primary}
            />
          }
          title="Waste Analytics"
          description="Track your food waste and savings over time. See your environmental impact."
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  featuresGrid: {
    flexDirection: "column",
    gap: 16,
    width: "100%",
  },
  featuresGridWide: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: 1000,
    gap: 20,
  },
});
