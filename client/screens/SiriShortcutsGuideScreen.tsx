/**
 * =============================================================================
 * SIRI SHORTCUTS GUIDE SCREEN
 * =============================================================================
 *
 * User-facing help documentation for setting up Siri Shortcuts with ChefSpAIce.
 * Provides step-by-step instructions for creating shortcuts that integrate
 * with the ChefSpAIce external API.
 *
 * @module screens/SiriShortcutsGuideScreen
 */

import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Feather } from "@expo/vector-icons";

import { GlassHeader } from "@/components/GlassHeader";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/contexts/SubscriptionContext";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { apiClient, ApiClientError } from "@/lib/api-client";
import { logger } from "@/lib/logger";

type StepData = {
  number: number;
  title: string;
  description: string;
  substeps?: string[];
};

function StepCard({ step, theme }: { step: StepData; theme: ReturnType<typeof useTheme>["theme"] }) {
  return (
    <View style={styles.stepCard}>
      <View style={[styles.stepNumber, { backgroundColor: AppColors.primary }]}>
        <ThemedText type="body" style={styles.stepNumberText}>
          {step.number}
        </ThemedText>
      </View>
      <View style={styles.stepContent}>
        <ThemedText type="body" style={styles.stepTitle}>
          {step.title}
        </ThemedText>
        <ThemedText type="caption" style={styles.stepDescription}>
          {step.description}
        </ThemedText>
        {step.substeps && step.substeps.length > 0 && (
          <View style={styles.substepsList}>
            {step.substeps.map((substep, index) => (
              <View key={index} style={styles.substepRow}>
                <View style={[styles.substepBullet, { backgroundColor: theme.textSecondary }]} />
                <ThemedText type="small" style={styles.substepText}>
                  {substep}
                </ThemedText>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function CodeBlock({ code, theme, onCopy }: { code: string; theme: ReturnType<typeof useTheme>["theme"]; onCopy: () => void }) {
  return (
    <View style={[styles.codeBlock, { backgroundColor: theme.backgroundSecondary }]}>
      <ThemedText type="small" style={[styles.codeText, { color: theme.text }]}>
        {code}
      </ThemedText>
      <Pressable
        onPress={onCopy}
        style={[styles.copyButton, { backgroundColor: themeStyle.glass.background }]}
        accessibilityLabel="Copy code"
        accessibilityRole="button"
        testID="button-copy-code"
      >
        <Feather name="copy" size={14} color={theme.textSecondary} />
      </Pressable>
    </View>
  );
}

export default function SiriShortcutsGuideScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme, style: themeStyle } = useTheme();
  const { isAuthenticated } = useAuth();
  const { isStandardUser } = useSubscription();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);

  const apiUrl = getApiUrl();
  const canGenerateKey = isAuthenticated && isStandardUser;

  const handleGenerateApiKey = async () => {
    if (!isAuthenticated) {
      Alert.alert("Sign In Required", "Please sign in to generate an API key.");
      return;
    }

    if (!isStandardUser) {
      Alert.alert(
        "Subscription Required",
        "Siri Shortcuts integration requires an active subscription. Please upgrade to use this feature.",
      );
      return;
    }

    setIsGeneratingKey(true);
    try {
      const data = await apiClient.post<{ success?: boolean; apiKey?: string; message?: string }>("/api/external/generate-key");
      if (data.success && data.apiKey) {
        setApiKey(data.apiKey);
        Alert.alert(
          "API Key Generated",
          "Your API key has been generated. Copy it now - it won't be shown again!",
        );
      } else {
        Alert.alert("Error", data.message || "Failed to generate API key");
      }
    } catch (error) {
      logger.error("Generate API key error:", error);
      const msg = error instanceof ApiClientError ? error.message : "Failed to generate API key. Please try again.";
      Alert.alert("Error", msg);
    } finally {
      setIsGeneratingKey(false);
    }
  };

  const handleCopyToClipboard = async (text: string, label: string) => {
    try {
      await Clipboard.setStringAsync(text);
      if (Platform.OS === "web") {
        window.alert(`${label} copied to clipboard!`);
      } else {
        Alert.alert("Copied", `${label} copied to clipboard!`);
      }
    } catch (error) {
      logger.error("Copy error:", error);
    }
  };

  const prerequisiteSteps: StepData[] = [
    {
      number: 1,
      title: "iPhone with iOS 13 or later",
      description: "Siri Shortcuts requires iOS 13 or newer. Check your version in Settings > General > About.",
    },
    {
      number: 2,
      title: "Shortcuts App Installed",
      description: "The Shortcuts app comes pre-installed on iOS. If you removed it, download it from the App Store.",
    },
    {
      number: 3,
      title: "ChefSpAIce Subscription",
      description: "Siri Shortcuts integration requires an active subscription. Upgrade in the app's Subscription settings if needed.",
    },
  ];

  const generateKeySteps: StepData[] = [
    {
      number: 1,
      title: "Open ChefSpAIce App",
      description: "Launch the ChefSpAIce app on your iPhone.",
    },
    {
      number: 2,
      title: "Go to Settings",
      description: "Tap your profile icon, then tap Settings.",
    },
    {
      number: 3,
      title: "Find Integrations Section",
      description: "Scroll down to the Integrations section and tap 'Siri Shortcuts'.",
    },
    {
      number: 4,
      title: "Generate API Key",
      description: "Tap the 'Generate API Key' button below. Copy the key immediately - it won't be shown again!",
    },
  ];

  const addToPantrySteps: StepData[] = [
    {
      number: 1,
      title: "Open Shortcuts App",
      description: "Launch the Shortcuts app on your iPhone.",
    },
    {
      number: 2,
      title: "Create New Shortcut",
      description: "Tap the + button in the top right to create a new shortcut.",
    },
    {
      number: 3,
      title: "Add 'Ask for Input' Action",
      description: "Search for 'Ask for Input' and add it.",
      substeps: [
        "Set prompt to: 'What do you want to add to your pantry?'",
        "Set input type to: Text",
      ],
    },
    {
      number: 4,
      title: "Add 'Get Contents of URL' Action",
      description: "Search for 'Get Contents of URL' and configure it.",
      substeps: [
        `URL: ${apiUrl}/api/external/action`,
        "Method: POST",
        "Request Body: JSON",
      ],
    },
    {
      number: 5,
      title: "Configure JSON Body",
      description: "Add these fields to the JSON body:",
      substeps: [
        "apiKey: [Paste your API key]",
        'action: "add_item"',
        "item: [Select 'Provided Input' from Ask for Input]",
      ],
    },
    {
      number: 6,
      title: "Add 'Get Dictionary Value' Action",
      description: "Extract the response message.",
      substeps: [
        "Get value for key: 'message'",
        "From: Contents of URL",
      ],
    },
    {
      number: 7,
      title: "Add 'Speak Text' Action",
      description: "Make Siri read the confirmation.",
      substeps: [
        "Text: [Select Dictionary Value from previous step]",
      ],
    },
    {
      number: 8,
      title: "Name and Save",
      description: "Tap the shortcut name at the top and rename it to 'Add to Pantry'. Tap the settings icon and enable 'Show in Share Sheet' for extra convenience.",
    },
  ];

  const whatsExpiringSteps: StepData[] = [
    {
      number: 1,
      title: "Create New Shortcut",
      description: "Create another new shortcut in the Shortcuts app.",
    },
    {
      number: 2,
      title: "Add 'Get Contents of URL' Action",
      description: "Configure the API call (no input needed this time).",
      substeps: [
        `URL: ${apiUrl}/api/external/action`,
        "Method: POST",
        "Request Body: JSON",
      ],
    },
    {
      number: 3,
      title: "Configure JSON Body",
      description: "Add these fields:",
      substeps: [
        "apiKey: [Paste your API key]",
        'action: "what_expires"',
      ],
    },
    {
      number: 4,
      title: "Add Response Handling",
      description: "Add 'Get Dictionary Value' for 'message' key, then 'Speak Text' action.",
    },
    {
      number: 5,
      title: "Name and Save",
      description: "Rename to \"What's Expiring\" and save.",
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <GlassHeader
        title="Siri Shortcuts Setup"
        screenKey="siri-shortcuts"
        showSearch={false}
        showBackButton={true}
      />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: tabBarHeight + Spacing.xl,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
        <GlassCard style={styles.section}>
          <View style={styles.headerRow}>
            <Feather name="mic" size={24} color={AppColors.primary} />
            <ThemedText type="h3" style={styles.headerTitle}>
              Siri Shortcuts for ChefSpAIce
            </ThemedText>
          </View>
          <ThemedText type="body" style={styles.introText}>
            Control your kitchen inventory with your voice! Set up Siri Shortcuts
            to add items, check what's expiring, and more - all hands-free.
          </ThemedText>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Prerequisites
          </ThemedText>
          {prerequisiteSteps.map((step) => (
            <StepCard key={step.number} step={step} theme={theme} />
          ))}
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Step 1: Generate Your API Key
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            You need an API key to authenticate Siri Shortcuts with ChefSpAIce.
          </ThemedText>
          
          {generateKeySteps.map((step) => (
            <StepCard key={step.number} step={step} theme={theme} />
          ))}

          <View style={styles.apiKeySection}>
            {apiKey ? (
              <>
                <ThemedText type="body" style={styles.apiKeyLabel}>
                  Your API Key (copy now!):
                </ThemedText>
                <CodeBlock
                  code={apiKey}
                  theme={theme}
                  onCopy={() => handleCopyToClipboard(apiKey, "API Key")}
                />
                <View style={styles.warningBox}>
                  <Feather name="alert-triangle" size={16} color={AppColors.warning} />
                  <ThemedText type="small" style={styles.warningText}>
                    Save this key somewhere safe. It won't be shown again!
                  </ThemedText>
                </View>
              </>
            ) : (
              <GlassButton
                variant="primary"
                onPress={handleGenerateApiKey}
                loading={isGeneratingKey}
                disabled={!canGenerateKey}
                icon={<Feather name="key" size={18} color="#FFFFFF" />}
                testID="button-generate-api-key"
              >
                <ThemedText type="body" style={{ color: "#FFFFFF" }}>
                  Generate API Key
                </ThemedText>
              </GlassButton>
            )}
            {!isAuthenticated && (
              <ThemedText type="caption" style={styles.signInNote}>
                Please sign in to generate an API key.
              </ThemedText>
            )}
            {isAuthenticated && !isStandardUser && (
              <View style={styles.proRequiredBox}>
                <Feather name="lock" size={16} color={AppColors.warning} />
                <ThemedText type="small" style={styles.proRequiredText}>
                  Active subscription required. Upgrade to use Siri Shortcuts.
                </ThemedText>
              </View>
            )}
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Step 2: Create "Add to Pantry" Shortcut
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            This shortcut lets you say "Hey Siri, Add to Pantry" to add items to your inventory.
          </ThemedText>
          
          {addToPantrySteps.map((step) => (
            <StepCard key={step.number} step={step} theme={theme} />
          ))}

          <View style={styles.apiEndpointInfo}>
            <ThemedText type="small" style={styles.apiEndpointLabel}>
              API Endpoint:
            </ThemedText>
            <CodeBlock
              code={`${apiUrl}/api/external/action`}
              theme={theme}
              onCopy={() => handleCopyToClipboard(`${apiUrl}/api/external/action`, "API Endpoint")}
            />
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Step 3: Create "What's Expiring" Shortcut
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            This shortcut tells you which items are expiring soon.
          </ThemedText>
          
          {whatsExpiringSteps.map((step) => (
            <StepCard key={step.number} step={step} theme={theme} />
          ))}
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Available Actions
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Use these action values in your shortcuts:
          </ThemedText>
          
          <View style={styles.actionsList}>
            <View style={styles.actionItem}>
              <View style={[styles.actionBadge, { backgroundColor: AppColors.primary }]}>
                <ThemedText type="small" style={styles.actionBadgeText}>add_item</ThemedText>
              </View>
              <ThemedText type="small" style={styles.actionDescription}>
                Add an item to your inventory. Requires: item (name), optional: quantity, unit
              </ThemedText>
            </View>
            
            <View style={styles.actionItem}>
              <View style={[styles.actionBadge, { backgroundColor: AppColors.warning }]}>
                <ThemedText type="small" style={styles.actionBadgeText}>check_inventory</ThemedText>
              </View>
              <ThemedText type="small" style={styles.actionDescription}>
                Check if you have an item. Requires: item (name)
              </ThemedText>
            </View>
            
            <View style={styles.actionItem}>
              <View style={[styles.actionBadge, { backgroundColor: AppColors.error }]}>
                <ThemedText type="small" style={styles.actionBadgeText}>what_expires</ThemedText>
              </View>
              <ThemedText type="small" style={styles.actionDescription}>
                List items expiring in the next 3 days. No additional fields needed.
              </ThemedText>
            </View>
            
            <View style={styles.actionItem}>
              <View style={[styles.actionBadge, { backgroundColor: AppColors.accent }]}>
                <ThemedText type="small" style={styles.actionBadgeText}>quick_recipe</ThemedText>
              </View>
              <ThemedText type="small" style={styles.actionDescription}>
                Get a quick recipe suggestion based on your inventory.
              </ThemedText>
            </View>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Using with Siri
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Once your shortcuts are set up, you can use them hands-free:
          </ThemedText>
          
          <View style={styles.examplesList}>
            <View style={styles.exampleItem}>
              <Feather name="mic" size={16} color={AppColors.primary} />
              <ThemedText type="body" style={styles.exampleText}>
                "Hey Siri, Add to Pantry"
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.exampleDescription}>
              Siri will ask what to add, then confirm when done.
            </ThemedText>
            
            <View style={[styles.exampleItem, { marginTop: Spacing.md }]}>
              <Feather name="mic" size={16} color={AppColors.primary} />
              <ThemedText type="body" style={styles.exampleText}>
                "Hey Siri, What's Expiring"
              </ThemedText>
            </View>
            <ThemedText type="small" style={styles.exampleDescription}>
              Siri will read out your expiring items.
            </ThemedText>
          </View>
        </GlassCard>

        <GlassCard style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Troubleshooting
          </ThemedText>
          
          <View style={styles.troubleshootItem}>
            <ThemedText type="body" style={styles.troubleshootQuestion}>
              Shortcut says "Invalid API key"
            </ThemedText>
            <ThemedText type="caption" style={styles.troubleshootAnswer}>
              Make sure you copied the entire API key including the "csa_" prefix. 
              If you've lost your key, generate a new one.
            </ThemedText>
          </View>
          
          <View style={styles.troubleshootItem}>
            <ThemedText type="body" style={styles.troubleshootQuestion}>
              Shortcut isn't working
            </ThemedText>
            <ThemedText type="caption" style={styles.troubleshootAnswer}>
              Check that you have an active subscription and that your phone 
              has an internet connection.
            </ThemedText>
          </View>
          
          <View style={styles.troubleshootItem}>
            <ThemedText type="body" style={styles.troubleshootQuestion}>
              Siri doesn't recognize the shortcut name
            </ThemedText>
            <ThemedText type="caption" style={styles.troubleshootAnswer}>
              Try renaming your shortcut to something simpler, or enable 
              "Show in Siri" in the shortcut settings.
            </ThemedText>
          </View>
        </GlassCard>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.md,
  },
  section: {
    marginBottom: Spacing.md,
    padding: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  headerTitle: {
    flex: 1,
  },
  introText: {
    lineHeight: 22,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    marginBottom: Spacing.md,
  },
  stepCard: {
    flexDirection: "row",
    marginBottom: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.sm,
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontWeight: "600",
    marginBottom: 2,
  },
  stepDescription: {
    lineHeight: 20,
  },
  substepsList: {
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  substepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  substepBullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    marginTop: 7,
    marginRight: Spacing.xs,
  },
  substepText: {
    flex: 1,
    lineHeight: 18,
  },
  apiKeySection: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  apiKeyLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  codeBlock: {
    borderRadius: BorderRadius.md,
    padding: Spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  codeText: {
    flex: 1,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 12,
  },
  copyButton: {
    padding: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginLeft: Spacing.sm,
  },
  warningBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    borderRadius: BorderRadius.sm,
  },
  warningText: {
    flex: 1,
    color: AppColors.warning,
  },
  signInNote: {
    marginTop: Spacing.sm,
    textAlign: "center",
    fontStyle: "italic",
  },
  apiEndpointInfo: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  apiEndpointLabel: {
    marginBottom: Spacing.xs,
    fontWeight: "600",
  },
  actionsList: {
    gap: Spacing.md,
  },
  actionItem: {
    gap: Spacing.xs,
  },
  actionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.sm,
  },
  actionBadgeText: {
    color: "#FFFFFF",
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontWeight: "600",
  },
  actionDescription: {
    lineHeight: 18,
  },
  examplesList: {
    marginTop: Spacing.sm,
  },
  exampleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  exampleText: {
    fontStyle: "italic",
  },
  exampleDescription: {
    marginLeft: 24,
    marginTop: 4,
  },
  troubleshootItem: {
    marginBottom: Spacing.md,
  },
  troubleshootQuestion: {
    fontWeight: "600",
    marginBottom: 4,
  },
  troubleshootAnswer: {
    lineHeight: 20,
  },
  proRequiredBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    padding: Spacing.sm,
    backgroundColor: "rgba(255, 193, 7, 0.15)",
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  proRequiredText: {
    flex: 1,
    color: AppColors.warning,
  },
});
