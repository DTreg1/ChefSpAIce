import React, { useState, useCallback } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  View,
  StyleSheet,
  Pressable,
  Alert,
  Platform,
  TextInput,
  Modal,
} from "react-native";
import { logger } from "@/lib/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { useTheme } from "@/hooks/useTheme";
import { useSubscription } from "@/hooks/useSubscription";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  storage,
  FoodItem,
  generateId,
  DEFAULT_STORAGE_LOCATIONS,
} from "@/lib/storage";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import type { RootNavigation } from "@/lib/types";
import { IdentifiedFood } from "@/components/ImageAnalysisResult";
import { useAppReview } from "@/hooks/useAppReview";

const SWIPE_THRESHOLD = -80;

interface BatchItem extends IdentifiedFood {
  selected: boolean;
  id: string;
}

function SwipeableItem({
  item,
  index,
  onToggleSelect,
  onEdit,
  onRemove,
}: {
  item: BatchItem;
  index: number;
  onToggleSelect: (index: number) => void;
  onEdit: (index: number) => void;
  onRemove: (index: number) => void;
}) {
  const { theme } = useTheme();
  const translateX = useSharedValue(0);
  const itemHeight = useSharedValue(1);
  const marginBottom = useSharedValue(Spacing.md);

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return theme.confidenceHigh;
    if (confidence >= 0.5) return theme.confidenceMedium;
    return theme.confidenceLow;
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.5) return "Medium";
    return "Low";
  };

  const handleRemove = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    }
    onRemove(index);
  }, [index, onRemove]);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((event) => {
      translateX.value = Math.max(-120, Math.min(0, event.translationX));
    })
    .onEnd((event) => {
      if (event.translationX < SWIPE_THRESHOLD) {
        translateX.value = withTiming(-120);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const animatedContainerStyle = useAnimatedStyle(() => ({
    height: itemHeight.value === 1 ? "auto" : 0,
    marginBottom: marginBottom.value,
    opacity: itemHeight.value,
    overflow: "hidden" as const,
  }));

  const confidenceColor = getConfidenceColor(item.confidence);

  return (
    <Animated.View style={animatedContainerStyle}>
      <View style={styles.swipeContainer}>
        <View style={styles.deleteAction}>
          <Pressable style={styles.deleteButton} onPress={handleRemove} accessibilityRole="button" accessibilityLabel="Remove item from batch">
            <Feather name="trash-2" size={20} color="#FFFFFF" />
            <ThemedText type="caption" style={styles.deleteText}>
              Remove
            </ThemedText>
          </Pressable>
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.itemCard,
              { backgroundColor: theme.surface, borderColor: theme.border },
              item.selected && {
                borderColor: AppColors.primary,
                borderWidth: 2,
              },
              animatedStyle,
            ]}
          >
            <Pressable
              style={styles.itemMainRow}
              onPress={() => onEdit(index)}
              accessibilityRole="button"
              accessibilityLabel={`${item.name}, ${item.quantity} ${item.quantityUnit}, ${item.category}`}
              accessibilityHint="Double tap to edit. Use actions to remove."
              accessibilityActions={[
                { name: "activate", label: "Edit item" },
                { name: "delete", label: "Remove from batch" },
              ]}
              onAccessibilityAction={(event) => {
                switch (event.nativeEvent.actionName) {
                  case "activate":
                    onEdit(index);
                    break;
                  case "delete":
                    handleRemove();
                    break;
                }
              }}
            >
              <Pressable
                style={styles.checkbox}
                onPress={() => onToggleSelect(index)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                accessibilityRole="button"
                accessibilityLabel={`Toggle select ${item.name}`}
              >
                {item.selected ? (
                  <View
                    style={[
                      styles.checkboxChecked,
                      { backgroundColor: AppColors.primary },
                    ]}
                  >
                    <Feather name="check" size={14} color="#FFFFFF" />
                  </View>
                ) : (
                  <View
                    style={[
                      styles.checkboxUnchecked,
                      { borderColor: theme.border },
                    ]}
                  />
                )}
              </Pressable>

              <View style={styles.itemInfo}>
                <View style={styles.itemNameRow}>
                  <ThemedText
                    type="h4"
                    numberOfLines={1}
                    style={styles.itemName}
                  >
                    {item.name}
                  </ThemedText>
                  <View
                    style={[
                      styles.confidenceBadge,
                      { backgroundColor: confidenceColor + "20" },
                    ]}
                  >
                    <Feather
                      name={
                        item.confidence >= 0.8
                          ? "check-circle"
                          : item.confidence >= 0.5
                            ? "alert-triangle"
                            : "alert-circle"
                      }
                      size={12}
                      color={confidenceColor}
                    />
                    <ThemedText
                      type="caption"
                      style={{ color: confidenceColor, marginLeft: 4 }}
                    >
                      {getConfidenceLabel(item.confidence)}
                    </ThemedText>
                  </View>
                </View>

                <View style={styles.itemMeta}>
                  <View
                    style={[
                      styles.categoryBadge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText type="caption">{item.category}</ThemedText>
                  </View>
                  <ThemedText
                    type="small"
                    style={{ color: theme.textSecondary }}
                  >
                    {item.quantity} {item.quantityUnit}
                  </ThemedText>
                  <View style={styles.metaDot} />
                  <Feather name="box" size={12} color={theme.textSecondary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginLeft: 2 }}
                  >
                    {item.storageLocation}
                  </ThemedText>
                  <View style={styles.metaDot} />
                  <Feather name="clock" size={12} color={theme.textSecondary} />
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary, marginLeft: 2 }}
                  >
                    {item.shelfLifeDays}d
                  </ThemedText>
                </View>
              </View>

              <View style={styles.editIcon}>
                <Feather name="edit-2" size={16} color={theme.textSecondary} />
              </View>
            </Pressable>
          </Animated.View>
        </GestureDetector>
      </View>
    </Animated.View>
  );
}

export default function AddFoodBatchScreen() {
  const insets = useSafeAreaInsets();
  const MODAL_HEADER_HEIGHT = 56;
  const { theme } = useTheme();
  const navigation = useNavigation<RootNavigation>();
  const route = useRoute<RouteProp<RootStackParamList, "AddFoodBatch">>();
  const { checkLimit, entitlements } = useSubscription();
  const { checkAfterInventoryAdd } = useAppReview();
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  const { focusTargetRef: upgradeFocusRef, containerRef: upgradeContainerRef, onAccessibilityEscape: onUpgradeEscape } = useFocusTrap({
    visible: showUpgradePrompt,
    onDismiss: () => setShowUpgradePrompt(false),
  });

  const initialItems: BatchItem[] = (route.params?.items || []).map(
    (item: IdentifiedFood, idx: number) => ({
      ...item,
      selected: true,
      id: generateId() + idx,
    }),
  );

  const [items, setItems] = useState<BatchItem[]>(initialItems);
  const [saving, setSaving] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const selectedCount = items.filter((item) => item.selected).length;

  const toggleItemSelection = useCallback((index: number) => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    setItems((prev) => {
      const newItems = [...prev];
      newItems[index] = {
        ...newItems[index],
        selected: !newItems[index].selected,
      };
      return newItems;
    });
  }, []);

  const selectAll = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setItems((prev) => prev.map((item) => ({ ...item, selected: true })));
  }, []);

  const deselectAll = useCallback(() => {
    if (Platform.OS !== "web") {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    setItems((prev) => prev.map((item) => ({ ...item, selected: false })));
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const openEditModal = useCallback((index: number) => {
    setEditingIndex(index);
  }, []);

  const updateItem = useCallback(
    (updates: Partial<IdentifiedFood>) => {
      if (editingIndex === null) return;
      setItems((prev) => {
        const newItems = [...prev];
        newItems[editingIndex] = { ...newItems[editingIndex], ...updates };
        return newItems;
      });
    },
    [editingIndex],
  );

  const closeEditModal = useCallback(() => {
    setEditingIndex(null);
  }, []);

  const mapStorageLocation = (loc: string): string => {
    const locationMap: Record<string, string> = {
      refrigerator: "fridge",
      fridge: "fridge",
      freezer: "freezer",
      pantry: "pantry",
      counter: "counter",
    };
    return locationMap[loc.toLowerCase()] || loc.toLowerCase() || "fridge";
  };

  const handleAddItems = async () => {
    const pantryLimit = checkLimit("pantryItems");
    if (!pantryLimit.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    const selectedItems = items.filter((item) => item.selected);

    if (selectedItems.length === 0) {
      Alert.alert(
        "No Items Selected",
        "Please select at least one item to add.",
      );
      return;
    }

    if (typeof pantryLimit.remaining === "number" && selectedItems.length > pantryLimit.remaining) {
      Alert.alert(
        "Limit Exceeded",
        `You can only add ${pantryLimit.remaining} more item${pantryLimit.remaining !== 1 ? 's' : ''} on your current plan. Please deselect some items or upgrade your subscription for unlimited items.`,
      );
      return;
    }

    setSaving(true);

    try {
      const today = new Date().toISOString().split("T")[0];

      const foodItems: FoodItem[] = selectedItems.map((item) => ({
        id: generateId(),
        name: item.name,
        quantity: item.quantity,
        unit: item.quantityUnit,
        storageLocation: mapStorageLocation(item.storageLocation),
        purchaseDate: today,
        expirationDate: new Date(
          Date.now() + item.shelfLifeDays * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0],
        category:
          item.category.charAt(0).toUpperCase() + item.category.slice(1),
      }));

      const result = await storage.addInventoryItems(foodItems);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      checkAfterInventoryAdd();

      Alert.alert(
        "Items Added",
        `Successfully added ${result.added} item${result.added !== 1 ? "s" : ""} to your inventory.`,
        [
          {
            text: "Scan More",
            onPress: () => navigation.replace("FoodCamera"),
          },
          {
            text: "View Inventory",
            onPress: () => navigation.popToTop(),
            style: "default",
          },
        ],
      );
    } catch (error) {
      logger.error("Error adding items:", error);
      Alert.alert(
        "Error",
        "Failed to add items to inventory. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (items.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.emptyState, { paddingTop: Spacing.xl }]}>
          <Feather name="package" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.emptyTitle}>
            No Items to Add
          </ThemedText>
          <ThemedText
            type="body"
            style={[styles.emptyText, { color: theme.textSecondary }]}
          >
            All items have been removed. Go back to scan more food items.
          </ThemedText>
          <GlassButton
            onPress={() => navigation.goBack()}
            style={styles.emptyButton}
          >
            Go Back
          </GlassButton>
        </View>
      </ThemedView>
    );
  }

  const editingItem = editingIndex !== null ? items[editingIndex] : null;

  return (
    <ThemedView style={styles.container}>
      <ExpoGlassHeader
        title="Add Items"
        screenKey="addFoodBatch"
        showSearch={false}
        showBackButton={true}
      />
      <KeyboardAwareScrollViewCompat
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          {
            paddingTop: insets.top + MODAL_HEADER_HEIGHT + Spacing.lg,
            paddingBottom: insets.bottom + 140,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h2">Add to Inventory</ThemedText>
          <ThemedText
            type="body"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            Review and edit items before adding
          </ThemedText>
        </View>

        <View style={styles.selectionRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {selectedCount} of {items.length} selected
          </ThemedText>
          <View style={styles.selectionActions}>
            <Pressable onPress={selectAll} style={styles.selectionButton} accessibilityRole="button" accessibilityLabel="Select all items">
              <ThemedText type="caption" style={{ color: AppColors.primary }}>
                Select All
              </ThemedText>
            </Pressable>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              |
            </ThemedText>
            <Pressable onPress={deselectAll} style={styles.selectionButton} accessibilityRole="button" accessibilityLabel="Clear selection">
              <ThemedText type="caption" style={{ color: AppColors.primary }}>
                Clear
              </ThemedText>
            </Pressable>
          </View>
        </View>

        <View style={styles.helpText}>
          <Feather name="info" size={14} color={theme.textSecondary} />
          <ThemedText
            type="caption"
            style={{ color: theme.textSecondary, marginLeft: Spacing.xs }}
          >
            Tap an item to edit, swipe left to remove
          </ThemedText>
        </View>

        {items.map((item, index) => (
          <SwipeableItem
            key={item.id}
            item={item}
            index={index}
            onToggleSelect={toggleItemSelection}
            onEdit={openEditModal}
            onRemove={removeItem}
          />
        ))}
      </KeyboardAwareScrollViewCompat>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        <GlassButton
          onPress={handleAddItems}
          disabled={selectedCount === 0 || saving}
          loading={saving}
          style={styles.addButton}
        >
          Add {selectedCount} Item{selectedCount !== 1 ? "s" : ""} to Inventory
        </GlassButton>
      </View>

      {editingItem !== null && editingIndex !== null ? (
        <EditModal
          item={editingItem}
          onUpdate={updateItem}
          onClose={closeEditModal}
        />
      ) : null}

      <Modal
        visible={showUpgradePrompt}
        transparent
        animationType="fade"
        onRequestClose={() => setShowUpgradePrompt(false)}
        accessibilityViewIsModal={true}
        data-testid="modal-upgrade-pantry-limit"
      >
        <View ref={upgradeContainerRef} style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: 24 }} onAccessibilityEscape={onUpgradeEscape}>
          <UpgradePrompt
            ref={upgradeFocusRef}
            type="limit"
            limitName="pantry items"
            remaining={0}
            max={typeof entitlements.maxPantryItems === "number" ? entitlements.maxPantryItems : 25}
            onUpgrade={() => {
              setShowUpgradePrompt(false);
              navigation.navigate("Main", {
                screen: "Tabs",
                params: {
                  screen: "ProfileTab",
                  params: { screen: "Subscription" },
                },
              });
            }}
            onDismiss={() => setShowUpgradePrompt(false)}
          />
        </View>
      </Modal>
    </ThemedView>
  );
}

interface StorageLocationOption {
  key: string;
  label: string;
  icon: string;
}

function EditModal({
  item,
  onUpdate,
  onClose,
}: {
  item: BatchItem;
  onUpdate: (updates: Partial<IdentifiedFood>) => void;
  onClose: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(String(item.quantity));
  const [shelfLife, setShelfLife] = useState(String(item.shelfLifeDays));
  const [category, setCategory] = useState(item.category);
  const [storageLocation, setStorageLocation] = useState(item.storageLocation);
  const [quantityUnit, setQuantityUnit] = useState(item.quantityUnit);
  const [storageLocations, setStorageLocations] = useState<
    StorageLocationOption[]
  >([...DEFAULT_STORAGE_LOCATIONS]);

  React.useEffect(() => {
    const loadStorageLocations = async () => {
      try {
        const allLocations = await storage.getAllStorageLocations();
        setStorageLocations(allLocations);
      } catch (e) {
        logger.log("Error loading storage locations:", e);
      }
    };
    loadStorageLocations();
  }, []);

  const CATEGORIES = [
    "produce",
    "dairy",
    "meat",
    "seafood",
    "bread",
    "canned",
    "frozen",
    "beverages",
    "condiments",
    "snacks",
    "grains",
    "spices",
    "other",
  ];

  const QUANTITY_UNITS = [
    "items",
    "lbs",
    "oz",
    "kg",
    "g",
    "cups",
    "bottles",
    "cans",
    "bags",
  ];

  const handleSave = () => {
    onUpdate({
      name,
      quantity: parseFloat(quantity) || 1,
      quantityUnit,
      shelfLifeDays: parseInt(shelfLife) || 7,
      category,
      storageLocation,
    });
    onClose();
  };

  return (
    <Pressable style={styles.modalOverlay} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close edit modal">
      <Pressable
        style={[
          styles.modalContent,
          { backgroundColor: theme.backgroundDefault },
        ]}
        onPress={(e) => e.stopPropagation()}
        accessibilityRole="button"
        accessibilityLabel="Edit item modal content"
      >
        <View style={styles.modalHeader}>
          <ThemedText type="h3">Edit Item</ThemedText>
          <Pressable
            accessibilityLabel="Close"
            accessibilityRole="button"
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <KeyboardAwareScrollViewCompat
          style={styles.modalScroll}
          contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.xl }}
        >
          <View style={styles.editField}>
            <ThemedText
              type="caption"
              style={[styles.editLabel, { color: theme.textSecondary }]}
            >
              Name
            </ThemedText>
            <TextInput
              style={[
                styles.textInputField,
                {
                  backgroundColor: theme.backgroundSecondary,
                  color: theme.text,
                },
              ]}
              value={name}
              onChangeText={setName}
              placeholder="Item name"
              placeholderTextColor={theme.textSecondary}
            />
          </View>

          <View style={styles.editRow}>
            <View style={[styles.editField, { flex: 1 }]}>
              <ThemedText
                type="caption"
                style={[styles.editLabel, { color: theme.textSecondary }]}
              >
                Quantity
              </ThemedText>
              <TextInput
                style={[
                  styles.textInputField,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                  },
                ]}
                value={quantity}
                onChangeText={setQuantity}
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
            <View
              style={[styles.editField, { flex: 1, marginLeft: Spacing.md }]}
            >
              <ThemedText
                type="caption"
                style={[styles.editLabel, { color: theme.textSecondary }]}
              >
                Shelf Life (days)
              </ThemedText>
              <TextInput
                style={[
                  styles.textInputField,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    color: theme.text,
                  },
                ]}
                value={shelfLife}
                onChangeText={setShelfLife}
                keyboardType="numeric"
                placeholder="7"
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          </View>

          <View style={styles.editField}>
            <ThemedText
              type="caption"
              style={[styles.editLabel, { color: theme.textSecondary }]}
            >
              Unit
            </ThemedText>
            <View style={styles.chipRow}>
              {QUANTITY_UNITS.map((unit) => (
                <Pressable
                  key={unit}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundSecondary },
                    quantityUnit === unit && {
                      backgroundColor: AppColors.primary,
                    },
                  ]}
                  onPress={() => setQuantityUnit(unit)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select unit ${unit}`}
                >
                  <ThemedText
                    type="caption"
                    style={
                      quantityUnit === unit ? { color: "#FFFFFF" } : undefined
                    }
                  >
                    {unit}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.editField}>
            <ThemedText
              type="caption"
              style={[styles.editLabel, { color: theme.textSecondary }]}
            >
              Category
            </ThemedText>
            <View style={styles.chipRow}>
              {CATEGORIES.map((cat) => (
                <Pressable
                  key={cat}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundSecondary },
                    category === cat && { backgroundColor: AppColors.primary },
                  ]}
                  onPress={() => setCategory(cat)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select category ${cat}`}
                >
                  <ThemedText
                    type="caption"
                    style={category === cat ? { color: "#FFFFFF" } : undefined}
                  >
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.editField}>
            <ThemedText
              type="caption"
              style={[styles.editLabel, { color: theme.textSecondary }]}
            >
              Storage Location
            </ThemedText>
            <View style={styles.chipRow}>
              {storageLocations.map((loc) => (
                <Pressable
                  key={loc.key}
                  style={[
                    styles.chip,
                    { backgroundColor: theme.backgroundSecondary },
                    (storageLocation === loc.key ||
                      storageLocation === loc.label.toLowerCase()) && {
                      backgroundColor: AppColors.primary,
                    },
                  ]}
                  onPress={() => setStorageLocation(loc.key)}
                  accessibilityRole="button"
                  accessibilityLabel={`Select storage location ${loc.label}`}
                >
                  <ThemedText
                    type="caption"
                    style={
                      storageLocation === loc.key ||
                      storageLocation === loc.label.toLowerCase()
                        ? { color: "#FFFFFF" }
                        : undefined
                    }
                  >
                    {loc.label}
                  </ThemedText>
                </Pressable>
              ))}
            </View>
          </View>
        </KeyboardAwareScrollViewCompat>

        <View style={styles.modalFooter}>
          <GlassButton variant="ghost" onPress={onClose} style={{ flex: 1 }}>
            Cancel
          </GlassButton>
          <GlassButton
            onPress={handleSave}
            style={{ flex: 2, marginLeft: Spacing.md }}
          >
            Save Changes
          </GlassButton>
        </View>
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.lg,
  },
  selectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.sm,
  },
  selectionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  selectionButton: {
    paddingHorizontal: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  helpText: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  swipeContainer: {
    position: "relative",
  },
  deleteAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 120,
    backgroundColor: AppColors.error,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BorderRadius.lg,
  },
  deleteButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.md,
  },
  deleteText: {
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  itemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: "hidden",
  },
  itemMainRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
  },
  checkbox: {
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxUnchecked: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
    borderWidth: 2,
  },
  itemInfo: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  itemName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(128, 128, 128, 0.5)",
    marginHorizontal: Spacing.sm,
  },
  editIcon: {
    padding: Spacing.sm,
    marginLeft: Spacing.sm,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  addButton: {
    width: "100%",
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptyText: {
    marginTop: Spacing.sm,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: Spacing.xl,
    minWidth: 200,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(128, 128, 128, 0.2)",
  },
  modalScroll: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.2)",
  },
  editField: {
    marginBottom: Spacing.lg,
  },
  editLabel: {
    marginBottom: Spacing.xs,
  },
  editRow: {
    flexDirection: "row",
  },
  textInput: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 44,
  },
  textInputField: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
    minHeight: 44,
  },
  textInputWrapper: {
    marginTop: -44,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
});
