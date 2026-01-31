import React, { useEffect, useState } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
  BackHandler,
  ActivityIndicator,
  Alert,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { CookPotLoader } from "@/components/CookPotLoader";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";
import { useStoreKit } from "@/hooks/useStoreKit";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const LOST_FEATURES = [
  {
    key: "aiRecipes",
    name: "AI Recipe Generation",
    icon: "zap" as const,
    description: "Create personalized recipes from your ingredients",
  },
  {
    key: "pantry",
    name: "Pantry Management",
    icon: "package" as const,
    description: "Track and organize all your ingredients",
  },
  {
    key: "mealPlan",
    name: "Meal Planning",
    icon: "calendar" as const,
    description: "Plan your weekly meals effortlessly",
  },
  {
    key: "shoppingList",
    name: "Shopping Lists",
    icon: "shopping-cart" as const,
    description: "Auto-generate shopping lists from recipes",
  },
  {
    key: "cookware",
    name: "Kitchen Equipment Tracking",
    icon: "tool" as const,
    description: "Manage your kitchen tools and appliances",
  },
];

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export default function TrialExpiredScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation<NavigationProp>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { isActive, isLoading: subscriptionLoading, refetch } = useSubscription();
  const [isRestoring, setIsRestoring] = useState(false);

  const {
    isAvailable: isStoreKitAvailable,
    restorePurchases,
  } = useStoreKit();

  const shouldUseStoreKit =
    (Platform.OS === "ios" || Platform.OS === "android") && isStoreKitAvailable;

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const handleNavigateToAuth = () => {
    navigation.navigate("Auth");
  };

  const handleNavigateToSubscription = () => {
    navigation.navigate("Subscription", { reason: "expired" });
  };

  const handleRestorePurchases = async () => {
    if (!shouldUseStoreKit) return;

    setIsRestoring(true);
    try {
      const success = await restorePurchases();
      if (success) {
        Alert.alert("Success", "Purchases restored successfully!");
        refetch();
      } else {
        Alert.alert(
          "No Purchases Found",
          "No previous purchases were found to restore.",
        );
      }
    } catch (error) {
      Alert.alert("Error", "Failed to restore purchases. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  if (authLoading || subscriptionLoading) {
    return (
      <ThemedView
        style={[
          styles.loadingContainer,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <CookPotLoader size="lg" text="Loading..." />
      </ThemedView>
    );
  }

  if (isActive) {
    navigation.navigate("Main");
    return null;
  }

  return (
    <ThemedView style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <ExpoGlassHeader
        title="Trial Ended"
        screenKey="trial-expired"
        showSearch={false}
        showBackButton={false}
        showMenu={false}
      />
      <ScrollView
        style={[styles.container, { backgroundColor: "transparent" }]}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <GlassCard
          style={[
            styles.expiredBanner,
            { backgroundColor: `${AppColors.error}15` },
          ]}
        >
          <View style={styles.expiredIconContainer}>
            <Feather name="clock" size={40} color={AppColors.error} />
          </View>
          <ThemedText
            type="h2"
            style={[styles.expiredTitle, { color: AppColors.error }]}
          >
            {isAuthenticated
              ? "Your Trial Has Ended"
              : "Your 7-Day Trial Has Ended"}
          </ThemedText>
          <ThemedText
            style={[styles.expiredSubtitle, { color: theme.textSecondary }]}
          >
            {isAuthenticated
              ? "Subscribe now to continue using all ChefSpAIce features."
              : "Create an account or sign in to subscribe and continue using ChefSpAIce."}
          </ThemedText>
        </GlassCard>

        <GlassCard style={styles.featuresCard}>
          <View style={styles.sectionHeader}>
            <Feather
              name="alert-triangle"
              size={20}
              color={AppColors.warning}
            />
            <ThemedText
              style={[styles.sectionTitle, { color: theme.textSecondaryOnGlass }]}
            >
              Features You're Losing Access To
            </ThemedText>
          </View>

          <View style={styles.featuresList}>
            {LOST_FEATURES.map((feature, index) => (
              <View
                key={feature.key}
                style={[
                  styles.featureItem,
                  index === LOST_FEATURES.length - 1 && styles.featureItemLast,
                ]}
              >
                <View
                  style={[
                    styles.featureIconContainer,
                    { backgroundColor: `${AppColors.error}15` },
                  ]}
                >
                  <Feather
                    name={feature.icon}
                    size={20}
                    color={AppColors.error}
                  />
                </View>
                <View style={styles.featureTextContainer}>
                  <ThemedText style={styles.featureName}>
                    {feature.name}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.featureDescription,
                      { color: theme.textSecondary },
                    ]}
                  >
                    {feature.description}
                  </ThemedText>
                </View>
                <Feather name="x" size={18} color={AppColors.error} />
              </View>
            ))}
          </View>
        </GlassCard>

        {!isAuthenticated ? (
          <GlassCard style={styles.actionCard}>
            <View style={styles.sectionHeader}>
              <Feather
                name="user-plus"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[styles.sectionTitle, { color: theme.textSecondaryOnGlass }]}
              >
                Get Started
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.actionDescription, { color: theme.textSecondary }]}
            >
              Create an account to subscribe and unlock all ChefSpAIce features.
              Already have an account? Sign in to restore your subscription.
            </ThemedText>

            <GlassButton
              onPress={handleNavigateToAuth}
              style={styles.primaryButton}
              icon={<Feather name="user-plus" size={18} color="#FFFFFF" />}
              testID="button-register-subscribe"
            >
              Register & Subscribe
            </GlassButton>

            <Pressable
              onPress={handleNavigateToAuth}
              style={styles.signInLink}
              data-testid="link-sign-in"
            >
              <ThemedText
                style={[styles.signInText, { color: AppColors.primary }]}
              >
                Already have an account? Sign In
              </ThemedText>
            </Pressable>
          </GlassCard>
        ) : (
          <GlassCard style={styles.actionCard}>
            <View style={styles.sectionHeader}>
              <Feather
                name="credit-card"
                size={20}
                color={theme.textSecondaryOnGlass}
              />
              <ThemedText
                style={[styles.sectionTitle, { color: theme.textSecondaryOnGlass }]}
              >
                Choose Your Plan
              </ThemedText>
            </View>
            <ThemedText
              style={[styles.actionDescription, { color: theme.textSecondary }]}
            >
              Subscribe to continue using ChefSpAIce. Choose from our Basic or
              Pro plans to unlock all features.
            </ThemedText>

            <View style={styles.planPreview}>
              <View
                style={[
                  styles.planOption,
                  { borderColor: AppColors.primary, backgroundColor: theme.glass.background },
                ]}
              >
                <ThemedText style={styles.planName}>Basic</ThemedText>
                <ThemedText
                  style={[styles.planFeatures, { color: theme.textSecondary }]}
                >
                  25 pantry items, 5 AI recipes/month
                </ThemedText>
              </View>
              <View
                style={[
                  styles.planOption,
                  styles.planOptionHighlighted,
                  { borderColor: AppColors.warning, backgroundColor: theme.glass.background },
                ]}
              >
                <View
                  style={[
                    styles.popularBadge,
                    { backgroundColor: AppColors.warning },
                  ]}
                >
                  <ThemedText style={styles.popularBadgeText}>
                    Popular
                  </ThemedText>
                </View>
                <ThemedText style={styles.planName}>Pro</ThemedText>
                <ThemedText
                  style={[styles.planFeatures, { color: theme.textSecondary }]}
                >
                  Unlimited everything
                </ThemedText>
              </View>
            </View>

            <GlassButton
              onPress={handleNavigateToSubscription}
              style={styles.primaryButton}
              icon={<Feather name="star" size={18} color="#FFFFFF" />}
              testID="button-subscribe-now"
            >
              Subscribe Now
            </GlassButton>
          </GlassCard>
        )}

        {shouldUseStoreKit && (
          <Pressable
            onPress={handleRestorePurchases}
            disabled={isRestoring}
            style={[styles.restoreButton, { borderColor: theme.border }]}
            data-testid="button-restore-purchases"
          >
            {isRestoring ? (
              <ActivityIndicator
                size="small"
                color={theme.textSecondaryOnGlass}
              />
            ) : (
              <Feather
                name="rotate-ccw"
                size={16}
                color={theme.textSecondaryOnGlass}
              />
            )}
            <ThemedText
              style={[
                styles.restoreText,
                { color: theme.textSecondaryOnGlass },
              ]}
            >
              {isRestoring ? "Restoring..." : "Restore Purchases"}
            </ThemedText>
          </Pressable>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.md,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.md,
  },
  expiredBanner: {
    padding: Spacing.xl,
    alignItems: "center",
  },
  expiredIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${AppColors.error}15`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  expiredTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  expiredSubtitle: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  featuresCard: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  featuresList: {
    gap: Spacing.sm,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  featureItemLast: {
    borderBottomWidth: 0,
  },
  featureIconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  featureTextContainer: {
    flex: 1,
  },
  featureName: {
    fontSize: 15,
    fontWeight: "600",
  },
  featureDescription: {
    fontSize: 12,
    marginTop: 2,
  },
  actionCard: {
    padding: Spacing.lg,
  },
  actionDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  primaryButton: {
    marginTop: Spacing.sm,
  },
  signInLink: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    marginTop: Spacing.sm,
  },
  signInText: {
    fontSize: 14,
    fontWeight: "600",
    textDecorationLine: "underline",
  },
  planPreview: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  planOption: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
  },
  planOptionHighlighted: {
    position: "relative",
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: Spacing.xs,
  },
  planFeatures: {
    fontSize: 11,
    lineHeight: 16,
  },
  popularBadge: {
    position: "absolute",
    top: -10,
    right: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.pill,
  },
  popularBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.sm,
  },
  restoreText: {
    fontSize: 14,
  },
});
