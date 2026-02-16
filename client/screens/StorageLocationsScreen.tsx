import React, { useState, useCallback } from "react";
import type { ComponentProps } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  Alert,
  Platform,
} from "react-native";
import { logger } from "@/lib/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

type FeatherIconName = ComponentProps<typeof Feather>["name"];
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { UpgradePrompt } from "@/components/subscription/UpgradePrompt";
import { GlassHeader } from "@/components/GlassHeader";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, DEFAULT_STORAGE_LOCATIONS } from "@/lib/storage";
import type { RootNavigation } from "@/lib/types";

interface StorageLocationOption {
  key: string;
  label: string;
  icon: string;
}

const AVAILABLE_ICONS = [
  "box",
  "package",
  "archive",
  "thermometer",
  "wind",
  "coffee",
  "home",
  "shopping-bag",
  "briefcase",
  "gift",
  "truck",
  "layers",
];

export default function StorageLocationsScreen() {
  const insets = useSafeAreaInsets();
  const { theme, style: themeStyle } = useTheme();
  const { checkFeature } = useSubscription();
  const navigation = useNavigation<RootNavigation>();

  const [customLocations, setCustomLocations] = useState<
    StorageLocationOption[]
  >([]);
  const [newLocationName, setNewLocationName] = useState("");
  const [selectedIcon, setSelectedIcon] = useState("box");
  const [isAdding, setIsAdding] = useState(false);
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const canCustomize = checkFeature("canCustomizeStorageAreas");

  const loadCustomLocations = useCallback(async () => {
    try {
      const locations = await storage.getCustomStorageLocations();
      setCustomLocations(locations);
    } catch (e) {
      logger.log("Error loading custom locations:", e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCustomLocations();
    }, [loadCustomLocations]),
  );

  const handleAddLocation = async () => {
    const trimmedName = newLocationName.trim().replace(/\s+/g, " ");
    if (!trimmedName) {
      Alert.alert("Error", "Please enter a location name.");
      return;
    }

    const key = trimmedName.toLowerCase().replace(/\s+/g, "_");
    const allLocations = [...DEFAULT_STORAGE_LOCATIONS, ...customLocations];

    const isDuplicateKey = allLocations.some((loc) => loc.key === key);
    const isDuplicateName = allLocations.some(
      (loc) =>
        loc.label.toLowerCase().replace(/\s+/g, "") ===
        trimmedName.toLowerCase().replace(/\s+/g, ""),
    );

    if (isDuplicateKey || isDuplicateName) {
      Alert.alert("Error", "A location with this name already exists.");
      return;
    }

    try {
      await storage.addCustomStorageLocation({
        key,
        label: trimmedName,
        icon: selectedIcon,
      });
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
      setNewLocationName("");
      setSelectedIcon("box");
      setIsAdding(false);
      loadCustomLocations();
    } catch (e) {
      logger.log("Error adding location:", e);
      Alert.alert("Error", "Failed to add storage location.");
    }
  };

  const handleRemoveLocation = (key: string, label: string) => {
    Alert.alert(
      "Remove Location",
      `Are you sure you want to remove "${label}"? Any items stored there will be moved to Pantry.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await storage.removeCustomStorageLocation(
                key,
                "pantry",
              );
              if (Platform.OS !== "web") {
                Haptics.notificationAsync(
                  Haptics.NotificationFeedbackType.Warning,
                );
              }
              loadCustomLocations();
              if (result.migratedCount > 0) {
                Alert.alert(
                  "Items Moved",
                  `${result.migratedCount} item${result.migratedCount !== 1 ? "s" : ""} moved to Pantry.`,
                );
              }
            } catch (e) {
              logger.log("Error removing location:", e);
              Alert.alert("Error", "Failed to remove storage location.");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: theme.backgroundRoot }}>
      <GlassHeader
        title="Storage Locations"
        screenKey="storageLocations"
        showSearch={false}
        showBackButton={true}
      />
      <KeyboardAwareScrollViewCompat
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            paddingBottom: insets.bottom + Spacing.xl,
          },
        ]}
      >
        <ThemedText type="h4" style={styles.sectionTitle}>
          Default Locations
        </ThemedText>
        <ThemedText type="caption" style={styles.description}>
          These are the built-in storage locations that cannot be removed.
        </ThemedText>

        <GlassCard style={styles.locationsCard}>
          {DEFAULT_STORAGE_LOCATIONS.map((location, index) => (
            <View key={location.key}>
              <View style={styles.locationRow}>
                <View
                  style={[
                    styles.iconContainer,
                    { backgroundColor: `${AppColors.primary}15` },
                  ]}
                >
                  <Feather
                    name={location.icon as FeatherIconName}
                    size={20}
                    color={AppColors.primary}
                  />
                </View>
                <ThemedText type="body" style={styles.locationLabel}>
                  {location.label}
                </ThemedText>
                <View style={styles.defaultBadge}>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Default
                  </ThemedText>
                </View>
              </View>
              {index < DEFAULT_STORAGE_LOCATIONS.length - 1 ? (
                <View
                  style={[
                    styles.divider,
                    { backgroundColor: themeStyle.glass.border },
                  ]}
                />
              ) : null}
            </View>
          ))}
        </GlassCard>

        <ThemedText
          type="h4"
          style={[styles.sectionTitle, { marginTop: Spacing.xl }]}
        >
          Custom Locations
        </ThemedText>
        <ThemedText type="caption" style={styles.description}>
          Add your own storage locations like "Garage Fridge", "Wine Cellar",
          etc.
        </ThemedText>

        {customLocations.length > 0 ? (
          <GlassCard style={styles.locationsCard}>
            {customLocations.map((location, index) => (
              <View key={location.key}>
                <View style={styles.locationRow}>
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: `${AppColors.accent}15` },
                    ]}
                  >
                    <Feather
                      name={location.icon as FeatherIconName}
                      size={20}
                      color={AppColors.accent}
                    />
                  </View>
                  <ThemedText type="body" style={styles.locationLabel}>
                    {location.label}
                  </ThemedText>
                  <Pressable
                    style={styles.removeButton}
                    onPress={() =>
                      handleRemoveLocation(location.key, location.label)
                    }
                    accessibilityLabel="Remove location"
                    accessibilityRole="button"
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Feather name="trash-2" size={18} color={AppColors.error} />
                  </Pressable>
                </View>
                {index < customLocations.length - 1 ? (
                  <View
                    style={[
                      styles.divider,
                      { backgroundColor: themeStyle.glass.border },
                    ]}
                  />
                ) : null}
              </View>
            ))}
          </GlassCard>
        ) : (
          <EmptyState
            icon="inbox"
            title="No Custom Locations"
            description="Add a custom storage location to organize your pantry."
            actionLabel={canCustomize ? "Add Location" : undefined}
            onAction={canCustomize ? () => setIsAdding(true) : undefined}
          />
        )}

        {canCustomize ? (
          isAdding ? (
            <GlassCard style={styles.addCard}>
              <ThemedText type="h4" style={styles.addTitle}>
                New Storage Location
              </ThemedText>

              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: themeStyle.glass.backgroundSubtle,
                    color: theme.text,
                    borderColor: themeStyle.glass.border,
                  },
                ]}
                value={newLocationName}
                onChangeText={setNewLocationName}
                placeholder="Enter location name..."
                placeholderTextColor={theme.textSecondary}
                autoFocus
              />

              <ThemedText type="caption" style={styles.iconLabel}>
                Choose an icon
              </ThemedText>
              <View style={styles.iconGrid}>
                {AVAILABLE_ICONS.map((icon) => (
                  <Pressable
                    key={icon}
                    style={[
                      styles.iconOption,
                      { backgroundColor: themeStyle.glass.backgroundSubtle },
                      selectedIcon === icon && {
                        backgroundColor: AppColors.primary,
                        borderColor: AppColors.primary,
                      },
                    ]}
                    onPress={() => setSelectedIcon(icon)}
                    accessibilityRole="button"
                    accessibilityLabel={`Select icon ${icon}`}
                  >
                    <Feather
                      name={icon as FeatherIconName}
                      size={20}
                      color={selectedIcon === icon ? "#FFFFFF" : theme.text}
                    />
                  </Pressable>
                ))}
              </View>

              <View style={styles.addActions}>
                <GlassButton
                  variant="ghost"
                  onPress={() => {
                    setIsAdding(false);
                    setNewLocationName("");
                    setSelectedIcon("box");
                  }}
                  style={{ flex: 1 }}
                >
                  Cancel
                </GlassButton>
                <GlassButton
                  variant="primary"
                  onPress={handleAddLocation}
                  style={{ flex: 1, marginLeft: Spacing.md }}
                >
                  Add Location
                </GlassButton>
              </View>
            </GlassCard>
          ) : (
            <GlassButton
              variant="primary"
              onPress={() => setIsAdding(true)}
              style={styles.addButton}
            >
              <Feather
                name="plus"
                size={20}
                color="#FFFFFF"
                style={{ marginRight: Spacing.sm }}
              />
              Add Custom Location
            </GlassButton>
          )
        ) : (
          <Pressable
            style={styles.proUpgradeCard}
            onPress={() => setShowUpgradePrompt(true)}
            accessibilityRole="button"
            accessibilityLabel="Upgrade to add custom storage locations"
          >
            <GlassCard style={styles.proUpgradeCardInner}>
              <View style={styles.proUpgradeContent}>
                <View
                  style={[
                    styles.lockIconContainer,
                    { backgroundColor: `${AppColors.warning}20` },
                  ]}
                >
                  <Feather name="lock" size={24} color={AppColors.warning} />
                </View>
                <View style={styles.proUpgradeText}>
                  <View style={styles.proTitleRow}>
                    <ThemedText type="body" style={styles.proUpgradeTitle}>
                      Add Custom Locations
                    </ThemedText>
                    <View style={styles.proBadge}>
                      <ThemedText type="small" style={styles.proBadgeText}>
                        STANDARD
                      </ThemedText>
                    </View>
                  </View>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Upgrade to create custom storage areas like "Garage Fridge"
                    or "Wine Cellar"
                  </ThemedText>
                </View>
                <Feather
                  name="chevron-right"
                  size={20}
                  color={theme.textSecondary}
                />
              </View>
            </GlassCard>
          </Pressable>
        )}

        {showUpgradePrompt && (
          <UpgradePrompt
            type="feature"
            featureName="Custom Storage Areas"
            onUpgrade={() => {
              setShowUpgradePrompt(false);
              // Use getParent 3x to reach root: Stack -> Tab -> Drawer -> Root
              const rootNav = navigation.getParent()?.getParent()?.getParent() as RootNavigation | undefined;
              if (rootNav) {
                rootNav.navigate("Main", {
                  screen: "Tabs",
                  params: {
                    screen: "ProfileTab",
                    params: { screen: "Subscription" },
                  },
                });
              }
            }}
            onDismiss={() => setShowUpgradePrompt(false)}
          />
        )}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  description: {
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  locationsCard: {
    padding: 0,
    overflow: "hidden",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  locationLabel: {
    flex: 1,
  },
  defaultBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  removeButton: {
    padding: Spacing.sm,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
  },
  emptyCard: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  addCard: {
    marginTop: Spacing.lg,
  },
  addTitle: {
    marginBottom: Spacing.md,
  },
  input: {
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontSize: 16,
    marginBottom: Spacing.md,
  },
  iconLabel: {
    marginBottom: Spacing.sm,
    opacity: 0.7,
  },
  iconGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  iconOption: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "transparent",
  },
  addActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  addButton: {
    marginTop: Spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  proUpgradeCard: {
    marginTop: Spacing.lg,
  },
  proUpgradeCardInner: {
    padding: Spacing.md,
  },
  proUpgradeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  lockIconContainer: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  proUpgradeText: {
    flex: 1,
  },
  proTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: 4,
  },
  proUpgradeTitle: {
    fontWeight: "600",
  },
  proBadge: {
    backgroundColor: AppColors.warning,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  proBadgeText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.5,
  },
});
