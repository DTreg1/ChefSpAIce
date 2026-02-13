import React, { useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { storage, UserPreferences } from "@/lib/storage";
import { getApiUrl } from "@/lib/query-client";

interface Retailer {
  retailer_key: string;
  name: string;
  retailer_logo_url: string;
}

interface SettingsInstacartProps {
  preferences: UserPreferences;
  onPreferencesChange: (prefs: UserPreferences) => void;
  theme: any;
}

export function SettingsInstacart({
  preferences,
  onPreferencesChange,
  theme,
}: SettingsInstacartProps) {
  const [postalCode, setPostalCode] = useState(
    preferences.instacartPostalCode || "",
  );
  const [countryCode, setCountryCode] = useState<"US" | "CA">(
    (preferences.instacartCountryCode as "US" | "CA") || "US",
  );
  const [retailers, setRetailers] = useState<Retailer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  const handleFindStores = useCallback(async () => {
    if (!postalCode.trim()) return;

    setIsLoading(true);
    setError(null);
    setHasSearched(true);

    try {
      const baseUrl = getApiUrl();
      const response = await fetch(
        `${baseUrl}/api/instacart/retailers?postal_code=${encodeURIComponent(postalCode.trim())}&country_code=${countryCode}`,
      );

      if (!response.ok) {
        throw new Error("Failed to fetch nearby retailers");
      }

      const result = await response.json();
      const data = result.data || result;
      setRetailers(data.retailers || []);

      const newPrefs = {
        ...preferences,
        instacartPostalCode: postalCode.trim(),
        instacartCountryCode: countryCode,
      };
      await storage.setPreferences(newPrefs);
      onPreferencesChange(newPrefs);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to fetch retailers",
      );
      setRetailers([]);
    } finally {
      setIsLoading(false);
    }
  }, [postalCode, countryCode, preferences, onPreferencesChange]);

  const handleSelectRetailer = useCallback(
    async (retailer: Retailer) => {
      const newPrefs = {
        ...preferences,
        preferredRetailerKey: retailer.retailer_key,
        preferredRetailerName: retailer.name,
        preferredRetailerLogo: retailer.retailer_logo_url,
        instacartPostalCode: postalCode.trim(),
        instacartCountryCode: countryCode,
      };
      await storage.setPreferences(newPrefs);
      onPreferencesChange(newPrefs);
    },
    [preferences, postalCode, countryCode, onPreferencesChange],
  );

  const handleClearRetailer = useCallback(async () => {
    const newPrefs = {
      ...preferences,
      preferredRetailerKey: undefined,
      preferredRetailerName: undefined,
      preferredRetailerLogo: undefined,
    };
    await storage.setPreferences(newPrefs);
    onPreferencesChange(newPrefs);
  }, [preferences, onPreferencesChange]);

  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Instacart
      </ThemedText>
      <ThemedText type="caption" style={styles.description}>
        Set your preferred grocery store for Instacart orders
      </ThemedText>

      {preferences.preferredRetailerName ? (
        <View
          style={[
            styles.preferredRetailer,
            { borderColor: AppColors.primary },
          ]}
          data-testid="container-preferred-retailer"
        >
          <View style={styles.retailerInfo}>
            {preferences.preferredRetailerLogo ? (
              <Image
                source={{ uri: preferences.preferredRetailerLogo }}
                style={styles.retailerLogo}
                contentFit="contain"
                cachePolicy="memory-disk"
                transition={200}
                data-testid="img-preferred-retailer-logo"
              />
            ) : (
              <View
                style={[
                  styles.retailerLogo,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather
                  name="shopping-cart"
                  size={18}
                  color={theme.textSecondary}
                />
              </View>
            )}
            <View style={styles.retailerText}>
              <ThemedText type="body">
                {preferences.preferredRetailerName}
              </ThemedText>
              <ThemedText type="caption">Preferred store</ThemedText>
            </View>
            <Feather name="check-circle" size={20} color={AppColors.primary} />
          </View>
          <Pressable
            onPress={handleClearRetailer}
            style={styles.clearButton}
            data-testid="button-clear-retailer"
            accessibilityRole="button"
            accessibilityLabel="Clear preferred retailer"
          >
            <Feather name="x" size={14} color={theme.textSecondary} />
            <ThemedText
              type="small"
              style={{ color: theme.textSecondary }}
            >
              Clear
            </ThemedText>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.countryRow}>
        {(["US", "CA"] as const).map((code) => (
          <Pressable
            key={code}
            onPress={() => setCountryCode(code)}
            style={[
              styles.countryChip,
              {
                borderColor:
                  countryCode === code ? AppColors.primary : theme.border,
                backgroundColor:
                  countryCode === code
                    ? `${AppColors.primary}15`
                    : "transparent",
              },
            ]}
            data-testid={`button-country-${code}`}
            accessibilityRole="button"
            accessibilityLabel={`Select ${code === "US" ? "United States" : "Canada"}`}
            accessibilityState={{ selected: countryCode === code }}
          >
            <ThemedText
              type="small"
              style={{
                color:
                  countryCode === code ? AppColors.primary : theme.textSecondary,
                fontWeight: countryCode === code ? "600" : "400",
              }}
            >
              {code === "US" ? "United States" : "Canada"}
            </ThemedText>
          </Pressable>
        ))}
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[
            styles.input,
            {
              color: theme.text,
              borderColor: theme.border,
              backgroundColor: theme.backgroundSecondary,
            },
          ]}
          value={postalCode}
          onChangeText={setPostalCode}
          placeholder={countryCode === "US" ? "Enter zip code" : "Enter postal code"}
          placeholderTextColor={theme.textSecondary}
          keyboardType="default"
          data-testid="input-postal-code"
        />
        <Pressable
          onPress={handleFindStores}
          disabled={isLoading || !postalCode.trim()}
          style={[
            styles.findButton,
            {
              backgroundColor: postalCode.trim()
                ? AppColors.primary
                : theme.backgroundSecondary,
            },
          ]}
          data-testid="button-find-stores"
          accessibilityRole="button"
          accessibilityLabel="Find nearby stores"
          accessibilityState={{ disabled: isLoading || !postalCode.trim() }}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <ThemedText
              type="button"
              style={{
                color: postalCode.trim() ? "#FFFFFF" : theme.textSecondary,
              }}
            >
              Find Stores
            </ThemedText>
          )}
        </Pressable>
      </View>

      {error ? (
        <View style={styles.errorContainer} data-testid="text-retailer-error">
          <Feather name="alert-circle" size={16} color={AppColors.error} />
          <ThemedText type="small" style={{ color: AppColors.error }}>
            {error}
          </ThemedText>
        </View>
      ) : null}

      {hasSearched && !isLoading && !error && retailers.length === 0 ? (
        <ThemedText
          type="caption"
          style={styles.noResults}
          data-testid="text-no-retailers"
        >
          No retailers found for this area
        </ThemedText>
      ) : null}

      {retailers.length > 0 ? (
        <ScrollView
          style={styles.retailerList}
          nestedScrollEnabled
          data-testid="list-retailers"
        >
          {retailers.map((retailer) => {
            const isSelected =
              preferences.preferredRetailerKey === retailer.retailer_key;
            return (
              <Pressable
                key={retailer.retailer_key}
                onPress={() => handleSelectRetailer(retailer)}
                style={[
                  styles.retailerItem,
                  {
                    borderColor: isSelected
                      ? AppColors.primary
                      : theme.border,
                    backgroundColor: isSelected
                      ? `${AppColors.primary}15`
                      : "transparent",
                  },
                ]}
                data-testid={`button-retailer-${retailer.retailer_key}`}
                accessibilityRole="button"
                accessibilityLabel={`Select ${retailer.name} as preferred retailer${isSelected ? ', currently selected' : ''}`}
                accessibilityState={{ selected: isSelected }}
              >
                {retailer.retailer_logo_url ? (
                  <Image
                    source={{ uri: retailer.retailer_logo_url }}
                    style={styles.retailerLogo}
                    contentFit="contain"
                    cachePolicy="memory-disk"
                    transition={200}
                    data-testid={`img-retailer-logo-${retailer.retailer_key}`}
                  />
                ) : (
                  <View
                    style={[
                      styles.retailerLogo,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name="shopping-cart"
                      size={18}
                      color={theme.textSecondary}
                    />
                  </View>
                )}
                <ThemedText type="body" style={styles.retailerName}>
                  {retailer.name}
                </ThemedText>
                {isSelected ? (
                  <Feather
                    name="check-circle"
                    size={20}
                    color={AppColors.primary}
                  />
                ) : (
                  <Feather
                    name="circle"
                    size={20}
                    color={theme.textSecondary}
                  />
                )}
              </Pressable>
            );
          })}
        </ScrollView>
      ) : null}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  description: {
    marginBottom: Spacing.sm,
  },
  countryRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  countryChip: {
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  preferredRetailer: {
    flexDirection: "column",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1.5,
    gap: Spacing.sm,
  },
  retailerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
  },
  retailerText: {
    flex: 1,
    gap: 2,
  },
  clearButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.sm,
  },
  searchRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    alignItems: "center",
  },
  input: {
    flex: 1,
    height: Spacing.inputHeight,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  findButton: {
    height: Spacing.inputHeight,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  noResults: {
    textAlign: "center",
    marginTop: Spacing.sm,
  },
  retailerList: {
    maxHeight: 250,
  },
  retailerItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.md,
  },
  retailerLogo: {
    width: 36,
    minHeight: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  retailerName: {
    flex: 1,
  },
});
