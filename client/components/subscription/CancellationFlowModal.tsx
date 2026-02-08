import { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  ScrollView,
  ActivityIndicator,
  TextInput,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { AppColors, Spacing, BorderRadius } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface CancellationFlowModalProps {
  visible: boolean;
  onClose: () => void;
  onCanceled: () => void;
  token: string | null;
}

const REASONS = [
  {
    key: "too_expensive",
    icon: "dollar-sign" as const,
    label: "Too Expensive",
    description: "The price doesn't fit my budget",
  },
  {
    key: "not_using",
    icon: "clock" as const,
    label: "Not Using It Enough",
    description: "I don't use it as often as I thought",
  },
  {
    key: "missing_features",
    icon: "tool" as const,
    label: "Missing Features",
    description: "It doesn't have what I need",
  },
  {
    key: "other",
    icon: "message-circle" as const,
    label: "Other Reason",
    description: "Something else",
  },
];

const UPCOMING_FEATURES = [
  "Advanced Meal Planning with AI",
  "Recipe Sharing & Community",
  "Smart Grocery Price Comparison",
];

const LOSS_ITEMS = [
  "AI recipe generation",
  "Unlimited pantry items",
  "Priority support",
];

export function CancellationFlowModal({
  visible,
  onClose,
  onCanceled,
  token,
}: CancellationFlowModalProps) {
  const { theme, isDark } = useTheme();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState("");
  const [pauseDuration, setPauseDuration] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [offerShown, setOfferShown] = useState<string | null>(null);
  const [featureFeedback, setFeatureFeedback] = useState("");

  const resetState = () => {
    setStep(1);
    setSelectedReason(null);
    setDetails("");
    setPauseDuration(1);
    setIsSubmitting(false);
    setOfferShown(null);
    setFeatureFeedback("");
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const getHeaders = () => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  };

  const handleContinueToStep2 = () => {
    if (!selectedReason) return;
    let offer: string | null = null;
    if (selectedReason === "too_expensive" || selectedReason === "other") {
      offer = "discount";
    } else if (selectedReason === "not_using") {
      offer = "pause";
    } else if (selectedReason === "missing_features") {
      offer = "roadmap";
    }
    setOfferShown(offer);
    setStep(2);
  };

  const handleAcceptDiscount = async () => {
    setIsSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/subscriptions/apply-retention-offer`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ reason: selectedReason, details }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to apply offer");
      }
      Alert.alert("Offer Applied!", "Your 50% discount has been applied for the next 3 months.");
      onCanceled();
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePauseSubscription = async () => {
    setIsSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/subscriptions/pause`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({ durationMonths: pauseDuration }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to pause subscription");
      }
      Alert.alert("Subscription Paused", `Your subscription has been paused for ${pauseDuration} month${pauseDuration > 1 ? "s" : ""}.`);
      onCanceled();
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCancel = async () => {
    setIsSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/subscriptions/cancel`, {
        method: "POST",
        headers: getHeaders(),
        credentials: "include",
        body: JSON.stringify({
          reason: selectedReason,
          details,
          offerShown,
          offerAccepted: false,
        }),
      });
      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || "Failed to cancel subscription");
      }
      Alert.alert("Subscription Canceled", "Your subscription will remain active until the end of your current billing period.");
      onCanceled();
      handleClose();
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator} data-testid="step-indicator">
      {[1, 2, 3].map((s) => (
        <View
          key={s}
          style={[
            styles.stepDot,
            {
              backgroundColor: s === step ? AppColors.primary : (isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.2)"),
            },
            s === step && styles.stepDotActive,
          ]}
        />
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          We're sorry to see you go
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Help us improve by telling us why you're considering canceling.
        </ThemedText>
      </View>

      {REASONS.map((reason) => (
        <Pressable
          key={reason.key}
          style={[
            styles.reasonCard,
            {
              borderColor: selectedReason === reason.key ? AppColors.primary : theme.border,
              backgroundColor: selectedReason === reason.key ? `${AppColors.primary}10` : "transparent",
            },
          ]}
          onPress={() => setSelectedReason(reason.key)}
          data-testid={`button-reason-${reason.key}`}
          accessibilityRole="radio"
          accessibilityState={{ selected: selectedReason === reason.key }}
          accessibilityLabel={reason.label}
        >
          <View style={[styles.reasonIconContainer, { backgroundColor: `${AppColors.primary}15` }]}>
            <Feather name={reason.icon} size={20} color={AppColors.primary} />
          </View>
          <View style={styles.reasonTextContainer}>
            <ThemedText type="h4" style={{ fontSize: 16 }}>{reason.label}</ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>{reason.description}</ThemedText>
          </View>
          {selectedReason === reason.key && (
            <Feather name="check-circle" size={20} color={AppColors.primary} />
          )}
        </Pressable>
      ))}

      {selectedReason === "other" && (
        <TextInput
          style={[
            styles.textInput,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
            },
          ]}
          placeholder="Tell us more..."
          placeholderTextColor={theme.textSecondary}
          value={details}
          onChangeText={setDetails}
          multiline
          numberOfLines={3}
          data-testid="input-other-details"
        />
      )}

      <GlassButton
        variant="primary"
        onPress={handleContinueToStep2}
        disabled={!selectedReason}
        testID="button-continue-step1"
        style={styles.actionButton}
      >
        Continue
      </GlassButton>
    </View>
  );

  const renderStep2TooExpensive = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          We have a special offer for you!
        </ThemedText>
      </View>

      <GlassCard style={styles.offerCard}>
        <View style={styles.offerContent}>
          <View style={[styles.offerIconContainer, { backgroundColor: `${AppColors.success}20` }]}>
            <Feather name="percent" size={28} color={AppColors.success} />
          </View>
          <ThemedText type="h3" style={styles.offerTitle}>50% Off for 3 Months</ThemedText>
          <ThemedText type="body" style={[styles.offerDescription, { color: theme.textSecondary }]}>
            We'd love to keep you around. Enjoy half off your current plan for the next 3 months.
          </ThemedText>
        </View>
      </GlassCard>

      <GlassButton
        variant="primary"
        onPress={handleAcceptDiscount}
        loading={isSubmitting}
        disabled={isSubmitting}
        testID="button-accept-offer"
        style={styles.actionButton}
      >
        Accept Offer
      </GlassButton>
      <GlassButton
        variant="outline"
        onPress={() => setStep(3)}
        disabled={isSubmitting}
        testID="button-no-thanks"
        style={styles.actionButton}
      >
        No Thanks, Continue Canceling
      </GlassButton>
    </View>
  );

  const renderStep2NotUsing = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          How about a break instead?
        </ThemedText>
      </View>

      <GlassCard style={styles.offerCard}>
        <View style={styles.offerContent}>
          <View style={[styles.offerIconContainer, { backgroundColor: `${AppColors.accent}20` }]}>
            <Feather name="pause-circle" size={28} color={AppColors.accent} />
          </View>
          <ThemedText type="h3" style={styles.offerTitle}>Pause Your Subscription</ThemedText>
          <ThemedText type="body" style={[styles.offerDescription, { color: theme.textSecondary }]}>
            Take a break without losing your data. Your subscription will automatically resume.
          </ThemedText>
        </View>
      </GlassCard>

      <View style={styles.durationSelector}>
        {([1, 2, 3] as const).map((months) => (
          <Pressable
            key={months}
            style={[
              styles.durationChip,
              {
                borderColor: pauseDuration === months ? AppColors.primary : theme.border,
                backgroundColor: pauseDuration === months ? `${AppColors.primary}20` : "transparent",
              },
            ]}
            onPress={() => setPauseDuration(months)}
            data-testid={`button-pause-${months}-month`}
            accessibilityRole="radio"
            accessibilityState={{ selected: pauseDuration === months }}
          >
            <ThemedText
              type="caption"
              style={{
                color: pauseDuration === months ? AppColors.primary : theme.text,
                fontWeight: pauseDuration === months ? "700" : "500",
              }}
            >
              {months} Month{months > 1 ? "s" : ""}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <GlassButton
        variant="primary"
        onPress={handlePauseSubscription}
        loading={isSubmitting}
        disabled={isSubmitting}
        testID="button-pause-subscription"
        style={styles.actionButton}
      >
        Pause Subscription
      </GlassButton>
      <GlassButton
        variant="outline"
        onPress={() => setStep(3)}
        disabled={isSubmitting}
        testID="button-no-thanks"
        style={styles.actionButton}
      >
        No Thanks, Continue Canceling
      </GlassButton>
    </View>
  );

  const renderStep2MissingFeatures = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          We're always improving!
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          We're working hard to add new features. Here's what's coming soon:
        </ThemedText>
      </View>

      <View style={styles.featuresList}>
        {UPCOMING_FEATURES.map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Feather name="star" size={16} color={AppColors.warning} />
            <ThemedText type="body" style={{ flex: 1 }}>{feature}</ThemedText>
          </View>
        ))}
      </View>

      <TextInput
        style={[
          styles.textInput,
          {
            color: theme.text,
            borderColor: theme.border,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)",
          },
        ]}
        placeholder="Tell us what features you'd like to see"
        placeholderTextColor={theme.textSecondary}
        value={featureFeedback}
        onChangeText={setFeatureFeedback}
        multiline
        numberOfLines={3}
        data-testid="input-feature-feedback"
      />

      <GlassButton
        variant="primary"
        onPress={handleClose}
        testID="button-ill-stay"
        style={styles.actionButton}
      >
        I'll Stay!
      </GlassButton>
      <GlassButton
        variant="outline"
        onPress={() => setStep(3)}
        testID="button-continue-canceling"
        style={styles.actionButton}
      >
        Continue Canceling
      </GlassButton>
    </View>
  );

  const renderStep2Other = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          Is there anything we can do?
        </ThemedText>
      </View>

      {details ? (
        <View style={[styles.feedbackDisplay, { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.04)", borderColor: theme.border }]}>
          <ThemedText type="caption" style={{ color: theme.textSecondary, marginBottom: Spacing.xs }}>Your feedback:</ThemedText>
          <ThemedText type="body">{details}</ThemedText>
        </View>
      ) : null}

      <GlassCard style={styles.offerCard}>
        <View style={styles.offerContent}>
          <View style={[styles.offerIconContainer, { backgroundColor: `${AppColors.success}20` }]}>
            <Feather name="percent" size={28} color={AppColors.success} />
          </View>
          <ThemedText type="h3" style={styles.offerTitle}>50% Off for 3 Months</ThemedText>
          <ThemedText type="body" style={[styles.offerDescription, { color: theme.textSecondary }]}>
            We'd love to keep you around. Enjoy half off your current plan for the next 3 months.
          </ThemedText>
        </View>
      </GlassCard>

      <GlassButton
        variant="primary"
        onPress={handleAcceptDiscount}
        loading={isSubmitting}
        disabled={isSubmitting}
        testID="button-accept-50-off"
        style={styles.actionButton}
      >
        Accept 50% Off
      </GlassButton>
      <GlassButton
        variant="outline"
        onPress={() => setStep(3)}
        disabled={isSubmitting}
        testID="button-continue-canceling"
        style={styles.actionButton}
      >
        Continue Canceling
      </GlassButton>
    </View>
  );

  const renderStep2 = () => {
    switch (selectedReason) {
      case "too_expensive":
        return renderStep2TooExpensive();
      case "not_using":
        return renderStep2NotUsing();
      case "missing_features":
        return renderStep2MissingFeatures();
      case "other":
        return renderStep2Other();
      default:
        return null;
    }
  };

  const renderStep3 = () => (
    <View>
      <View style={styles.header}>
        <ThemedText type="h2" style={styles.title}>
          Confirm Cancellation
        </ThemedText>
        <ThemedText type="body" style={[styles.subtitle, { color: theme.textSecondary }]}>
          Your subscription will remain active until the end of your current billing period. After that:
        </ThemedText>
      </View>

      <View style={styles.lossList}>
        {LOSS_ITEMS.map((item, index) => (
          <View key={index} style={styles.lossRow}>
            <Feather name="x-circle" size={18} color={AppColors.error} />
            <ThemedText type="body" style={{ flex: 1 }}>{item}</ThemedText>
          </View>
        ))}
      </View>

      <GlassButton
        variant="primary"
        onPress={handleClose}
        testID="button-keep-subscription"
        style={styles.actionButton}
      >
        Keep My Subscription
      </GlassButton>
      <Pressable
        style={[styles.destructiveButton, isSubmitting && { opacity: 0.7 }]}
        onPress={handleConfirmCancel}
        disabled={isSubmitting}
        data-testid="button-confirm-cancel"
        accessibilityRole="button"
        accessibilityLabel="Cancel Subscription"
        accessibilityState={{ disabled: isSubmitting }}
      >
        {isSubmitting ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <ThemedText type="button" style={{ color: "#fff" }}>
            Cancel Subscription
          </ThemedText>
        )}
      </Pressable>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="fade" accessibilityViewIsModal={true}>
      <View style={styles.overlay}>
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
          <View style={styles.modalHeader}>
            {renderStepIndicator()}
            <Pressable
              onPress={handleClose}
              style={styles.closeButton}
              data-testid="button-close-cancellation-modal"
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Feather name="x" size={24} color={theme.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollContent}>
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}
            {step === 3 && renderStep3()}
          </ScrollView>
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
    maxWidth: 420,
    maxHeight: "90%",
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    right: 0,
    top: 0,
    padding: Spacing.xs,
  },
  scrollContent: {
    flexGrow: 0,
  },
  stepIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: Spacing.sm,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  stepDotActive: {
    width: 24,
    borderRadius: 4,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  subtitle: {
    textAlign: "center",
    lineHeight: 22,
  },
  reasonCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  reasonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  reasonTextContainer: {
    flex: 1,
    gap: 2,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    minHeight: 80,
    textAlignVertical: "top",
    fontSize: 14,
  },
  actionButton: {
    marginBottom: Spacing.sm,
  },
  offerCard: {
    marginBottom: Spacing.lg,
  },
  offerContent: {
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  offerIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  offerTitle: {
    textAlign: "center",
    marginBottom: Spacing.xs,
  },
  offerDescription: {
    textAlign: "center",
    lineHeight: 22,
  },
  durationSelector: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  durationChip: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
    borderWidth: 1.5,
  },
  featuresList: {
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  feedbackDisplay: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  lossList: {
    marginBottom: Spacing.xl,
    gap: Spacing.md,
  },
  lossRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  destructiveButton: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    backgroundColor: AppColors.error,
    marginBottom: Spacing.sm,
    height: 52,
  },
});
