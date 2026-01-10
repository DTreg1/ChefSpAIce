import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { NutritionSection } from "@/components/NutritionSection";
import { ExpoGlassHeader, MenuItemConfig } from "@/components/ExpoGlassHeader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { storage, FoodItem, formatDate } from "@/lib/storage";
import { InventoryStackParamList } from "@/navigation/InventoryStackNavigator";

type StorageLocation = "fridge" | "freezer" | "pantry" | "counter";

const STORAGE_OPTIONS: { key: StorageLocation; label: string; icon: string }[] =
  [
    { key: "fridge", label: "Fridge", icon: "thermometer" },
    { key: "freezer", label: "Freezer", icon: "wind" },
    { key: "pantry", label: "Pantry", icon: "archive" },
    { key: "counter", label: "Counter", icon: "coffee" },
  ];

const CATEGORIES = [
  "Produce",
  "Dairy",
  "Meat",
  "Seafood",
  "Bakery",
  "Frozen",
  "Canned",
  "Beverages",
  "Snacks",
  "Condiments",
  "Other",
];

export default function ItemDetailScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<InventoryStackParamList, "ItemDetail">>();

  const [item, setItem] = useState<FoodItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [datePickerField, setDatePickerField] = useState<
    "purchase" | "expiration"
  >("expiration");

  useEffect(() => {
    const loadItem = async () => {
      if (route.params?.itemId) {
        const items = await storage.getInventory();
        const found = items.find((i) => i.id === route.params.itemId);
        if (found) {
          setItem(found);
        }
      }
      setLoading(false);
    };
    loadItem();
  }, [route.params?.itemId]);

  const handleSave = async () => {
    if (!item) return;

    if (!item.name.trim()) {
      Alert.alert("Error", "Please enter an item name");
      return;
    }

    try {
      await storage.updateInventoryItem(item);
      navigation.goBack();
    } catch (error) {
      Alert.alert("Error", "Failed to save item");
    }
  };

  const handleDelete = async () => {
    if (!item) return;

    // Use window.confirm on web, Alert.alert on native
    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Are you sure you want to remove "${item.name}" from your inventory? This cannot be undone.`
      );
      if (confirmed) {
        await storage.deleteInventoryItem(item.id);
        navigation.goBack();
      }
    } else {
      Alert.alert(
        "Remove Inventory",
        `Are you sure you want to remove "${item.name}" from your inventory? This cannot be undone.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove",
            style: "destructive",
            onPress: async () => {
              await storage.deleteInventoryItem(item.id);
              navigation.goBack();
            },
          },
        ],
      );
    }
  };

  const handleDateChange = (
    event: DateTimePickerEvent,
    selectedDate?: Date,
  ) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false);
    }
    if (selectedDate && item) {
      const dateString = selectedDate.toISOString().split("T")[0];
      if (datePickerField === "expiration") {
        setItem({ ...item, expirationDate: dateString });
      } else {
        setItem({ ...item, purchaseDate: dateString });
      }
    }
  };

  const handleDatePickerDone = () => {
    setShowDatePicker(false);
  };

  const openDatePicker = (field: "purchase" | "expiration") => {
    setDatePickerField(field);
    setShowDatePicker(true);
  };

  const headerPadding = 56 + insets.top + Spacing.lg;

  const menuItems: MenuItemConfig[] = [
    {
      label: "Save",
      icon: "check",
      onPress: handleSave,
    },
    {
      label: "Delete",
      icon: "trash-2",
      onPress: handleDelete,
    },
  ];

  if (loading || !item) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <ExpoGlassHeader
          title="Item Details"
          screenKey="item-detail"
          showSearch={false}
          showBackButton={true}
          menuItems={[]}
        />
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", paddingTop: headerPadding }}>
          <ThemedText>Loading...</ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title={item.name || "Item Details"}
        screenKey="item-detail"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerPadding,
            paddingBottom: insets.bottom + 120,
          },
        ]}
        scrollIndicatorInsets={{ bottom: insets.bottom }}
      >
      <GlassCard style={styles.section}>
        <View style={styles.sectionHeader}>
          <ThemedText type="h4">Basic Info</ThemedText>
          <Pressable style={styles.removeButton} onPress={handleDelete} testID="button-remove-item">
            <Feather name="trash-2" size={14} color={AppColors.warning} />
            <ThemedText
              style={{
                color: AppColors.warning,
                fontSize: 12,
                fontWeight: "500",
              }}
            >
              Remove Inventory
            </ThemedText>
          </Pressable>
        </View>

        <View style={styles.inputGroup}>
          <ThemedText type="small" style={styles.label}>
            Name
          </ThemedText>
          <TextInput
            testID="input-item-name"
            style={[
              styles.input,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                borderColor: theme.glass.border,
                borderWidth: 1,
                color: theme.text,
              },
            ]}
            value={item.name}
            onChangeText={(text) => setItem({ ...item, name: text })}
            placeholder="Item name"
            placeholderTextColor={theme.textSecondary}
          />
        </View>

        <View style={styles.row}>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={styles.label}>
              Quantity
            </ThemedText>
            <TextInput
              testID="input-item-quantity"
              style={[
                styles.input,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  borderColor: theme.glass.border,
                  borderWidth: 1,
                  color: theme.text,
                },
              ]}
              value={item.quantity.toString()}
              onChangeText={(text) =>
                setItem({ ...item, quantity: parseInt(text) || 0 })
              }
              keyboardType="numeric"
              placeholder="1"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1 }]}>
            <ThemedText type="small" style={styles.label}>
              Unit
            </ThemedText>
            <TextInput
              testID="input-item-unit"
              style={[
                styles.input,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  borderColor: theme.glass.border,
                  borderWidth: 1,
                  color: theme.text,
                },
              ]}
              value={item.unit}
              onChangeText={(text) => setItem({ ...item, unit: text })}
              placeholder="pcs"
              placeholderTextColor={theme.textSecondary}
            />
          </View>
          <View style={[styles.inputGroup, { flex: 1.5 }]}>
            <ThemedText type="small" style={styles.label}>
              Category
            </ThemedText>
            <View
              style={[
                styles.readOnlyField,
                {
                  backgroundColor: theme.glass.backgroundSubtle,
                  borderColor: theme.glass.border,
                  borderWidth: 1,
                },
              ]}
            >
              <ThemedText
                type="body"
                style={{ color: theme.text }}
                numberOfLines={1}
              >
                {item.usdaCategory || item.category || "Not specified"}
              </ThemedText>
            </View>
          </View>
        </View>
      </GlassCard>

      <NutritionSection
        foodId={item.id}
        foodName={item.name}
        defaultQuantity={item.quantity}
        nutrition={item.nutrition}
        onSearchNutrition={() => {
          Alert.alert(
            "Search Nutrition",
            `Search for nutrition information for "${item.name}"?`,
            [
              { text: "Cancel", style: "cancel" },
              { text: "Search", onPress: () => {} },
            ],
          );
        }}
        onManualEntry={() => {
          Alert.alert(
            "Manual Entry",
            "Manual nutrition entry is coming soon.",
            [{ text: "OK" }],
          );
        }}
      />

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Where to Store
        </ThemedText>
        <View style={styles.locationGrid}>
          {STORAGE_OPTIONS.map((loc) => (
            <Pressable
              key={loc.key}
              testID={`button-storage-${loc.key}`}
              style={[
                styles.locationCard,
                {
                  backgroundColor:
                    item.storageLocation === loc.key
                      ? AppColors.primary
                      : theme.backgroundSecondary,
                },
              ]}
              onPress={() => setItem({ ...item, storageLocation: loc.key })}
            >
              <Feather
                name={loc.icon as any}
                size={24}
                color={
                  item.storageLocation === loc.key ? "#FFFFFF" : theme.text
                }
              />
              <ThemedText
                type="small"
                style={{
                  color:
                    item.storageLocation === loc.key ? "#FFFFFF" : theme.text,
                  marginTop: Spacing.xs,
                }}
              >
                {loc.label}
              </ThemedText>
            </Pressable>
          ))}
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Dates
        </ThemedText>

        <View style={styles.row}>
          <Pressable
            testID="button-purchase-date"
            style={[
              styles.dateButtonCompact,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                borderColor: theme.glass.border,
                flex: 1,
              },
            ]}
            onPress={() => openDatePicker("purchase")}
          >
            <ThemedText type="small" style={styles.label}>
              Purchase
            </ThemedText>
            <View style={styles.dateValueRow}>
              <ThemedText type="body" numberOfLines={1}>
                {formatDate(item.purchaseDate)}
              </ThemedText>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
            </View>
          </Pressable>

          <Pressable
            testID="button-expiration-date"
            style={[
              styles.dateButtonCompact,
              {
                backgroundColor: theme.glass.backgroundSubtle,
                borderColor: theme.glass.border,
                flex: 1,
              },
            ]}
            onPress={() => openDatePicker("expiration")}
          >
            <ThemedText type="small" style={styles.label}>
              Expiration
            </ThemedText>
            <View style={styles.dateValueRow}>
              <ThemedText type="body" numberOfLines={1}>
                {formatDate(item.expirationDate)}
              </ThemedText>
              <Feather name="calendar" size={16} color={theme.textSecondary} />
            </View>
          </Pressable>
        </View>
      </GlassCard>

      <GlassCard style={styles.section}>
        <ThemedText type="h4" style={styles.sectionTitle}>
          Notes
        </ThemedText>
        <TextInput
          testID="input-item-notes"
          style={[
            styles.input,
            styles.textArea,
            {
              backgroundColor: theme.glass.backgroundSubtle,
              borderColor: theme.glass.border,
              borderWidth: 1,
              color: theme.text,
            },
          ]}
          value={item.notes || ""}
          onChangeText={(text) => setItem({ ...item, notes: text })}
          placeholder="Add notes..."
          placeholderTextColor={theme.textSecondary}
          multiline
          numberOfLines={4}
        />
      </GlassCard>

      {Platform.OS === "ios" ? (
        <Modal
          visible={showDatePicker}
          transparent
          animationType="slide"
          onRequestClose={handleDatePickerDone}
        >
          <Pressable
            style={styles.datePickerOverlay}
            onPress={handleDatePickerDone}
          >
            <Pressable
              style={[
                styles.datePickerContainer,
                { backgroundColor: theme.backgroundDefault },
              ]}
              onPress={(e) => e.stopPropagation()}
            >
              <View style={styles.datePickerHeader}>
                <ThemedText type="h4">
                  {datePickerField === "expiration"
                    ? "Expiration Date"
                    : "Purchase Date"}
                </ThemedText>
                <Pressable onPress={handleDatePickerDone} testID="button-date-picker-done">
                  <ThemedText
                    style={{ color: AppColors.primary, fontWeight: "600" }}
                  >
                    Done
                  </ThemedText>
                </Pressable>
              </View>
              <DateTimePicker
                value={
                  new Date(
                    datePickerField === "expiration"
                      ? item.expirationDate
                      : item.purchaseDate,
                  )
                }
                mode="date"
                display="spinner"
                onChange={handleDateChange}
                style={styles.datePicker}
              />
            </Pressable>
          </Pressable>
        </Modal>
      ) : showDatePicker ? (
        <DateTimePicker
          value={
            new Date(
              datePickerField === "expiration"
                ? item.expirationDate
                : item.purchaseDate,
            )
          }
          mode="date"
          display="default"
          onChange={handleDateChange}
        />
      ) : null}
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
    paddingHorizontal: Spacing.lg,
    gap: Spacing.lg,
  },
  section: {
    gap: Spacing.md,
  },
  sectionTitle: {
    marginBottom: Spacing.xs,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  label: {
    opacity: 0.7,
  },
  input: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    paddingTop: Spacing.md,
    textAlignVertical: "top",
  },
  row: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  chipContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  locationGrid: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 4,
    width: "100%",
  },
  locationCard: {
    flex: 1,
    flexBasis: 0,
    alignItems: "center",
    paddingVertical: Spacing.sm,
    paddingHorizontal: 4,
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  dateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  dateButtonCompact: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: 2,
  },
  dateValueRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.xs,
  },
  usdaCategoryContainer: {
    gap: Spacing.sm,
  },
  usdaCategoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    alignSelf: "flex-start",
  },
  usdaCategoryText: {
    fontWeight: "500",
  },
  usdaCategoryHint: {
    fontStyle: "italic",
  },
  datePickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  datePickerContainer: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    paddingBottom: 40,
  },
  datePickerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  datePicker: {
    height: 200,
  },
  readOnlyField: {
    height: 48,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    justifyContent: "center",
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  removeButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
});
