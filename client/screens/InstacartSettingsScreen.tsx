import { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Switch,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useHeaderHeight } from "@react-navigation/elements";
import { useFocusEffect } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, InstacartSettings, InstacartStore } from "@/lib/storage";
import { API_URL } from "@/lib/api";

const COMMON_STORES = [
  { id: "heb", name: "H-E-B" },
  { id: "randalls", name: "Randall's" },
  { id: "kroger", name: "Kroger" },
  { id: "walmart", name: "Walmart" },
  { id: "target", name: "Target" },
  { id: "costco", name: "Costco" },
  { id: "cvs", name: "CVS" },
  { id: "walgreens", name: "Walgreens" },
  { id: "7eleven", name: "7-Eleven" },
];

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
  const [zipCode, setZipCode] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const loadSettings = useCallback(async () => {
    const instacartSettings = await storage.getInstacartSettings();
    
    try {
      const response = await fetch(`${API_URL}/instacart/status`);
      const status = await response.json();
      
      if (status.configured !== instacartSettings.apiKeyConfigured) {
        const updatedSettings = { ...instacartSettings, apiKeyConfigured: status.configured };
        await storage.setInstacartSettings(updatedSettings);
        setSettings(updatedSettings);
        setZipCode(updatedSettings.zipCode || "");
        return;
      }
    } catch (error) {
      console.log("Could not check Instacart API status:", error);
    }
    
    setSettings(instacartSettings);
    setZipCode(instacartSettings.zipCode || "");
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  const handleToggleConnection = async (value: boolean) => {
    if (value && !settings.apiKeyConfigured) {
      Alert.alert(
        "API Key Required",
        "Instacart integration requires an API key. Please apply for access at instacart.com/company/business/developers and configure it in your server settings.",
        [{ text: "OK" }]
      );
      return;
    }
    const newSettings = { ...settings, isConnected: value };
    setSettings(newSettings);
    await storage.setInstacartSettings(newSettings);
  };

  const handleSaveZipCode = async () => {
    if (zipCode.length !== 5 || !/^\d{5}$/.test(zipCode)) {
      Alert.alert("Invalid Zip Code", "Please enter a valid 5-digit zip code.");
      return;
    }
    await storage.updateInstacartZipCode(zipCode);
    setIsEditing(false);
    const newSettings = { ...settings, zipCode };
    setSettings(newSettings);
  };

  const handleToggleStore = async (store: { id: string; name: string }) => {
    const isSelected = settings.preferredStores.some(s => s.id === store.id);
    if (isSelected) {
      await storage.removeInstacartStore(store.id);
      setSettings(prev => ({
        ...prev,
        preferredStores: prev.preferredStores.filter(s => s.id !== store.id),
      }));
    } else {
      const newStore: InstacartStore = { id: store.id, name: store.name };
      await storage.addInstacartStore(newStore);
      setSettings(prev => ({
        ...prev,
        preferredStores: [...prev.preferredStores, newStore],
      }));
    }
  };

  const handleSetDefaultStore = async (storeId: string) => {
    await storage.setDefaultInstacartStore(storeId);
    setSettings(prev => ({
      ...prev,
      preferredStores: prev.preferredStores.map(s => ({
        ...s,
        isDefault: s.id === storeId,
      })),
    }));
  };

  const defaultStore = settings.preferredStores.find(s => s.isDefault);

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
          <ThemedText type="h4" style={styles.sectionTitle}>
            Instacart Connection
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Connect to Instacart to search products and add items to your cart
          </ThemedText>

          <View style={styles.row}>
            <ThemedText type="body">Enable Instacart</ThemedText>
            <Switch
              value={settings.isConnected}
              onValueChange={handleToggleConnection}
              trackColor={{ false: theme.border, true: AppColors.primary }}
              thumbColor="#FFFFFF"
              data-testid="switch-instacart-connection"
            />
          </View>

          {!settings.apiKeyConfigured && (
            <View style={[styles.warningBanner, { backgroundColor: AppColors.warning + "20" }]}>
              <Feather name="alert-circle" size={16} color={AppColors.warning} />
              <ThemedText type="caption" style={styles.warningText}>
                API key not configured. Contact your admin to set up the Instacart API.
              </ThemedText>
            </View>
          )}
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Delivery Location
          </ThemedText>

          <View style={styles.zipCodeRow}>
            <View style={styles.zipCodeInputContainer}>
              <Feather name="map-pin" size={18} color={theme.textSecondary} />
              <TextInput
                style={[styles.zipCodeInput, { color: theme.text }]}
                placeholder="Enter zip code"
                placeholderTextColor={theme.textSecondary}
                value={zipCode}
                onChangeText={setZipCode}
                keyboardType="number-pad"
                maxLength={5}
                editable={isEditing || !settings.zipCode}
                data-testid="input-zip-code"
              />
            </View>
            {settings.zipCode && !isEditing ? (
              <Pressable onPress={() => setIsEditing(true)} data-testid="button-edit-zip">
                <Feather name="edit-2" size={18} color={AppColors.primary} />
              </Pressable>
            ) : (
              <Button
                variant="primary"
                onPress={handleSaveZipCode}
                testID="button-save-zip"
              >
                Save
              </Button>
            )}
          </View>
        </View>
      </GlassCard>

      <GlassCard>
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            Preferred Stores
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionDescription}>
            Select the stores you shop at. We'll check availability and prices at these locations.
          </ThemedText>

          <View style={styles.storeGrid}>
            {COMMON_STORES.map(store => {
              const isSelected = settings.preferredStores.some(s => s.id === store.id);
              return (
                <Pressable
                  key={store.id}
                  style={[
                    styles.storeChip,
                    {
                      backgroundColor: isSelected ? AppColors.primary + "20" : "transparent",
                      borderColor: isSelected ? AppColors.primary : theme.border,
                    },
                  ]}
                  onPress={() => handleToggleStore(store)}
                  data-testid={`button-store-${store.id}`}
                >
                  <ThemedText
                    type="body"
                    style={[styles.storeChipText, isSelected && { color: AppColors.primary }]}
                  >
                    {store.name}
                  </ThemedText>
                  {isSelected && (
                    <Feather name="check" size={14} color={AppColors.primary} />
                  )}
                </Pressable>
              );
            })}
          </View>
        </View>
      </GlassCard>

      {settings.preferredStores.length > 0 && (
        <GlassCard>
          <View style={styles.section}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Default Store
            </ThemedText>
            <ThemedText type="caption" style={styles.sectionDescription}>
              Choose your primary store for quick ordering
            </ThemedText>

            {settings.preferredStores.map(store => (
              <Pressable
                key={store.id}
                style={[
                  styles.defaultStoreRow,
                  { borderColor: store.isDefault ? AppColors.primary : theme.border },
                ]}
                onPress={() => handleSetDefaultStore(store.id)}
                data-testid={`button-default-store-${store.id}`}
              >
                <ThemedText type="body">{store.name}</ThemedText>
                <View
                  style={[
                    styles.radioButton,
                    {
                      borderColor: store.isDefault ? AppColors.primary : theme.border,
                      backgroundColor: store.isDefault ? AppColors.primary : "transparent",
                    },
                  ]}
                >
                  {store.isDefault && <Feather name="check" size={12} color="#FFFFFF" />}
                </View>
              </Pressable>
            ))}
          </View>
        </GlassCard>
      )}

      <GlassCard>
        <View style={styles.section}>
          <ThemedText type="h4" style={styles.sectionTitle}>
            How It Works
          </ThemedText>
          <View style={styles.infoRow}>
            <View style={styles.infoBullet}>
              <ThemedText type="body" style={styles.infoBulletNumber}>1</ThemedText>
            </View>
            <ThemedText type="body" style={styles.infoText}>
              Add items to your shopping list
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoBullet}>
              <ThemedText type="body" style={styles.infoBulletNumber}>2</ThemedText>
            </View>
            <ThemedText type="body" style={styles.infoText}>
              Tap "Send to Instacart" to match products
            </ThemedText>
          </View>
          <View style={styles.infoRow}>
            <View style={styles.infoBullet}>
              <ThemedText type="body" style={styles.infoBulletNumber}>3</ThemedText>
            </View>
            <ThemedText type="body" style={styles.infoText}>
              Complete your order on Instacart
            </ThemedText>
          </View>
        </View>
      </GlassCard>
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
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  sectionDescription: {
    opacity: 0.7,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  warningText: {
    flex: 1,
  },
  zipCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  zipCodeInputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  zipCodeInput: {
    flex: 1,
    fontSize: 16,
  },
  storeGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  storeChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  storeChipText: {
    fontSize: 14,
  },
  defaultStoreRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    marginBottom: Spacing.xs,
  },
  radioButton: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: Spacing.xs,
  },
  infoBullet: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  infoBulletNumber: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  infoText: {
    flex: 1,
  },
});
