import React from "react";
import { View, StyleSheet, Modal, Pressable, ScrollView } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

const PRO_FEATURES = [
  { icon: "infinite" as const, name: "Unlimited Pantry Items" },
  { icon: "restaurant" as const, name: "Unlimited AI Recipes" },
  { icon: "construct" as const, name: "Unlimited Cookware" },
  { icon: "scan" as const, name: "Recipe Scanning" },
  { icon: "barcode" as const, name: "Bulk Scanning" },
  { icon: "chatbubbles" as const, name: "AI Kitchen Assistant" },
  { icon: "calendar" as const, name: "Weekly Meal Prepping" },
];

interface TrialExpiringModalProps {
  visible: boolean;
  onDismiss: () => void;
}

export function TrialExpiringModal({ visible, onDismiss }: TrialExpiringModalProps) {
  const { theme, isDark } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const handleSubscribe = () => {
    onDismiss();
    navigation.navigate("Subscription");
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
      accessibilityViewIsModal={true}
    >
      <View style={styles.overlay} data-testid="modal-trial-expiring">
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[
            styles.modal,
            {
              backgroundColor: isDark
                ? "rgba(26, 26, 26, 0.95)"
                : "rgba(255, 255, 255, 0.95)",
            },
          ]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: `${AppColors.error}20` }]}>
                <Ionicons name="warning" size={40} color={AppColors.error} />
              </View>
              <ThemedText type="h2" style={styles.title}>
                Your Trial Ends Tomorrow
              </ThemedText>
              <ThemedText
                type="body"
                style={[styles.subtitle, { color: theme.textSecondary }]}
              >
                Don't lose access to these Pro features:
              </ThemedText>
            </View>

            <View style={styles.featureList}>
              {PRO_FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <Ionicons name={feature.icon} size={18} color={AppColors.error} />
                  <ThemedText style={[styles.featureName, { color: theme.text }]}>
                    {feature.name}
                  </ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.subscribeButton, { backgroundColor: AppColors.primary }]}
              onPress={handleSubscribe}
              data-testid="button-subscribe-trial-expiring"
              accessibilityRole="button"
              accessibilityLabel="Subscribe Now"
            >
              <Ionicons name="star" size={20} color="#fff" />
              <ThemedText type="button" style={styles.subscribeButtonText}>
                Subscribe Now
              </ThemedText>
            </Pressable>
            <Pressable
              style={styles.laterButton}
              onPress={onDismiss}
              data-testid="button-maybe-later-trial"
              accessibilityRole="button"
              accessibilityLabel="Maybe Later"
            >
              <ThemedText style={[styles.laterButtonText, { color: theme.textSecondary }]}>
                Maybe Later
              </ThemedText>
            </Pressable>
          </View>
        </BlurView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.lg,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  featureList: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  featureName: {
    fontSize: 15,
    fontWeight: "500",
  },
  actions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  subscribeButtonText: {
    color: "#fff",
  },
  laterButton: {
    paddingVertical: Spacing.sm,
    alignItems: "center",
  },
  laterButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
});
