import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

interface TrialMilestoneBannerProps {
  daysRemaining: number;
}

export function TrialMilestoneBanner({ daysRemaining }: TrialMilestoneBannerProps) {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSubscribe = () => {
    navigation.navigate("Subscription");
  };

  const bannerColor = daysRemaining <= 1 ? AppColors.error : AppColors.warning;

  return (
    <View
      style={[styles.container, { backgroundColor: bannerColor + "15", borderColor: bannerColor + "40" }]}
      data-testid="banner-trial-milestone"
      accessibilityRole="alert"
      accessibilityLabel={`Your Pro trial ends in ${daysRemaining} day${daysRemaining !== 1 ? "s" : ""}. Subscribe now to keep your features.`}
    >
      <View style={styles.content}>
        <Feather name="clock" size={18} color={bannerColor} />
        <View style={styles.textContainer}>
          <ThemedText style={[styles.text, { color: bannerColor }]}>
            Your Pro trial ends in {daysRemaining} day{daysRemaining !== 1 ? "s" : ""}.{" "}
            Subscribe now to keep your features.
          </ThemedText>
        </View>
      </View>
      <Pressable
        style={[styles.button, { backgroundColor: bannerColor }]}
        onPress={handleSubscribe}
        data-testid="button-subscribe-banner"
        accessibilityRole="button"
        accessibilityLabel="Subscribe Now"
      >
        <ThemedText style={styles.buttonText}>Subscribe Now</ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
  },
  content: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  textContainer: {
    flex: 1,
  },
  text: {
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 20,
  },
  button: {
    marginTop: Spacing.sm,
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    alignItems: "center",
  },
  buttonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    fontSize: 14,
  },
});
