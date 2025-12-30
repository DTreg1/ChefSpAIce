import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Switch,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, InstacartSettings } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";


export default function InstacartSettingsScreen() {
  const insets = useSafeAreaInsets();
  const headerHeight = useHeaderHeight();
  const { theme } = useTheme();

  const [settings, setSettings] = useState<InstacartSettings>({
    isConnected: false,
    preferredStores: [],
    zipCode: undefined,
    apiKeyConfigured: false,
  });
  const [checkingStatus, setCheckingStatus] = useState(false);

  const loadSettings = useCallback(async () => {
    const instacartSettings = await storage.getInstacartSettings();
    setSettings(instacartSettings);
    
    setCheckingStatus(true);
    try {
      const response = await fetch(`${getApiUrl()}api/instacart/status`);
      const status = await response.json();
      
      if (status.configured !== instacartSettings.apiKeyConfigured) {
        const updatedSettings = { ...instacartSettings, apiKeyConfigured: status.configured };
        await storage.setInstacartSettings(updatedSettings);
        setSettings(updatedSettings);
      }
    } catch (error) {
      console.log("Could not check Instacart API status:", error);
    } finally {
      setCheckingStatus(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleToggleConnection = async (value: boolean) => {
    if (value && !settings.apiKeyConfigured) {
      return;
    }
    const newSettings = { ...settings, isConnected: value };
    setSettings(newSettings);
    await storage.setInstacartSettings(newSettings);
  };

  const handleOpenInstacart = async () => {
    const url = "https://www.instacart.com";
    if (Platform.OS === "web") {
      window.open(url, "_blank");
    } else {
      await Linking.openURL(url);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: "transparent" }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: headerHeight + Spacing.md, paddingBottom: insets.bottom + Spacing.xl },
      ]}
    >
      <GlassCard>
        <View style={styles.section}>
          <View style={styles.headerRow}>
            <View style={[styles.iconContainer, { backgroundColor: "#003D29" }]}>
              <Feather name="shopping-bag" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.headerText}>
              <ThemedText type="h4">Instacart Integration</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Shop groceries from your recipes
              </ThemedText>
            </View>
          </View>

          <View style={styles.row}>
            <View>
              <ThemedText type="body">Enable Instacart</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                {settings.apiKeyConfigured 
                  ? "Send ingredients directly to Instacart" 
                  : "API not configured"}
              </ThemedText>
            </View>
            <Switch
              value={settings.isConnected}
              onValueChange={handleToggleConnection}
              trackColor={{ false: theme.border, true: "#003D29" }}
              thumbColor="#FFFFFF"
              disabled={!settings.apiKeyConfigured}
              data-testid="switch-instacart-connection"
            />
          </View>

          {settings.apiKeyConfigured ? (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.success + "20" }]}>
              <Feather name="check-circle" size={16} color={AppColors.success} />
              <ThemedText type="caption" style={{ color: AppColors.success, flex: 1 }}>
                Instacart API is connected and ready
              </ThemedText>
            </View>
          ) : (
            <View style={[styles.statusBanner, { backgroundColor: AppColors.warning + "20" }]}>
              <Feather name="alert-circle" size={16} color={AppColors.warning} />
              <ThemedText type="caption" style={{ color: AppColors.warning, flex: 1 }}>
                Instacart API key not configured. Contact app admin.
              </ThemedText>
            </View>
          )}
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            How It Works
          </ThemedText>
          
          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: "#003D29" }]}>
              <ThemedText style={styles.stepNumberText}>1</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body">Add to Shopping List</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Add missing recipe ingredients or items you need
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: "#003D29" }]}>
              <ThemedText style={styles.stepNumberText}>2</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body">Send to Instacart</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Tap the button to create your Instacart shopping list
              </ThemedText>
            </View>
          </View>

          <View style={styles.stepRow}>
            <View style={[styles.stepNumber, { backgroundColor: "#003D29" }]}>
              <ThemedText style={styles.stepNumberText}>3</ThemedText>
            </View>
            <View style={styles.stepContent}>
              <ThemedText type="body">Complete Your Order</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Choose your store and schedule delivery on Instacart
              </ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Features
          </ThemedText>
          
          <View style={styles.featureRow}>
            <Feather name="list" size={20} color="#003D29" />
            <View style={styles.featureContent}>
              <ThemedText type="body">Shopping Lists</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Send your shopping list items to Instacart
              </ThemedText>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Feather name="book-open" size={20} color="#003D29" />
            <View style={styles.featureContent}>
              <ThemedText type="body">Recipe Ingredients</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Shop all ingredients for a recipe with one tap
              </ThemedText>
            </View>
          </View>

          <View style={styles.featureRow}>
            <Feather name="truck" size={20} color="#003D29" />
            <View style={styles.featureContent}>
              <ThemedText type="body">Same-Day Delivery</ThemedText>
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Get groceries delivered from 85,000+ stores
              </ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      <GlassButton
        variant="outline"
        onPress={handleOpenInstacart}
        icon={<Feather name="external-link" size={18} color={theme.text} />}
        data-testid="button-open-instacart"
      >
        Open Instacart Website
      </GlassButton>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    gap: Spacing.md,
  },
  section: {
    gap: Spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: Spacing.xs,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.sm,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  stepNumber: {
    width: 28,
    height: 28,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  stepContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  featureContent: {
    flex: 1,
    gap: Spacing.xs,
  },
});
