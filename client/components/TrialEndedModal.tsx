import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";

const PRO_FEATURES = [
  { icon: "infinite" as const, name: "Unlimited Pantry Items", description: "Track everything in your kitchen" },
  { icon: "restaurant" as const, name: "Unlimited AI Recipes", description: "Generate recipes anytime" },
  { icon: "construct" as const, name: "Unlimited Cookware", description: "Equipment-aware recipes" },
  { icon: "scan" as const, name: "Recipe Scanning", description: "Scan recipes from books & websites" },
  { icon: "barcode" as const, name: "Bulk Scanning", description: "Scan multiple items at once" },
  { icon: "chatbubbles" as const, name: "Live AI Kitchen Assistant", description: "Real-time cooking help" },
  { icon: "folder-open" as const, name: "Custom Storage Areas", description: "Organize your way" },
  { icon: "calendar" as const, name: "Weekly Meal Prepping", description: "Plan meals in advance" },
];

const BASIC_LIMITS = {
  pantryItems: 25,
  aiRecipes: 5,
  cookware: 5,
};

interface TrialEndedModalProps {
  visible: boolean;
  onDismiss: () => void;
  onUpgrade: () => void;
}

export function TrialEndedModal({ visible, onDismiss, onUpgrade }: TrialEndedModalProps) {
  const { theme, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.overlay}>
        <BlurView
          intensity={80}
          tint={isDark ? "dark" : "light"}
          style={[styles.modal, { backgroundColor: isDark ? 'rgba(26, 26, 26, 0.85)' : 'rgba(255, 255, 255, 0.85)' }]}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <View style={styles.header}>
              <View style={[styles.iconContainer, { backgroundColor: `${AppColors.warning}20` }]}>
                <Ionicons name="time" size={40} color={AppColors.warning} />
              </View>
              <ThemedText type="h2" style={styles.title}>
                Your Trial Has Ended
              </ThemedText>
              <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
                You still have Basic access. Upgrade to Pro to unlock all features.
              </ThemedText>
            </View>

            <View style={[styles.section, { backgroundColor: theme.surface }]}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Your Basic Plan Includes:
              </ThemedText>
              <View style={styles.limitRow}>
                <Ionicons name="cube-outline" size={20} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.text }}>
                  {BASIC_LIMITS.pantryItems} pantry items
                </ThemedText>
              </View>
              <View style={styles.limitRow}>
                <Ionicons name="sparkles-outline" size={20} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.text }}>
                  {BASIC_LIMITS.aiRecipes} AI recipes per month
                </ThemedText>
              </View>
              <View style={styles.limitRow}>
                <Ionicons name="construct-outline" size={20} color={theme.textSecondary} />
                <ThemedText type="body" style={{ color: theme.text }}>
                  {BASIC_LIMITS.cookware} cookware items
                </ThemedText>
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText type="h4" style={[styles.sectionTitle, { color: theme.text }]}>
                Pro Features You're Missing:
              </ThemedText>
              {PRO_FEATURES.map((feature, index) => (
                <View key={index} style={styles.featureRow}>
                  <View style={[styles.featureIcon, { backgroundColor: `${AppColors.secondary}15` }]}>
                    <Ionicons name={feature.icon} size={18} color={AppColors.secondary} />
                  </View>
                  <View style={styles.featureText}>
                    <ThemedText type="body" style={{ color: theme.text, fontWeight: "600" }}>
                      {feature.name}
                    </ThemedText>
                    <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                      {feature.description}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <Pressable
              style={[styles.upgradeButton, { backgroundColor: AppColors.secondary }]}
              onPress={onUpgrade}
              data-testid="button-upgrade-trial-ended"
            >
              <Ionicons name="star" size={20} color="#fff" />
              <ThemedText type="button" style={styles.upgradeButtonText}>
                Upgrade to Pro
              </ThemedText>
            </Pressable>
            <Pressable
              style={[styles.dismissButton, { borderColor: theme.border }]}
              onPress={onDismiss}
              data-testid="button-dismiss-trial-ended"
            >
              <ThemedText type="body" style={{ color: theme.textSecondary }}>
                Continue with Basic
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
    backgroundColor: "rgba(0, 0, 0, 0.6)",
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
  section: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.sm,
  },
  limitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: {
    flex: 1,
  },
  actions: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  upgradeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  upgradeButtonText: {
    color: "#fff",
  },
  dismissButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
});
