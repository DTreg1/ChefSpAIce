import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
} from "react-native";
import Animated, {
  FadeInDown,
  FadeInUp,
  FadeOutUp,
  Layout,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import {
  getConfidenceColor,
  getConfidenceLabel,
  getConfidenceIcon,
  shouldShowLowConfidenceWarning,
  shouldShowEmptyState,
  toggleItemInSet,
  selectAllItems,
  deselectAllItems,
  getSelectedItems,
  updateItemInArray,
  formatCategoryDisplay,
  formatStorageLocationDisplay,
  CATEGORIES,
  STORAGE_LOCATIONS,
  QUANTITY_UNITS,
  type IdentifiedFood,
  type AnalysisResult,
} from "@/lib/image-analysis-utils";

export type { IdentifiedFood, AnalysisResult };

interface ImageAnalysisResultProps {
  results: AnalysisResult;
  imageUri: string;
  onRetake: () => void;
  onConfirm: (items: IdentifiedFood[], goToSingleItem?: boolean) => void;
  onQuickAdd?: (items: IdentifiedFood[]) => void;
  onScanMore?: () => void;
}

export function ImageAnalysisResult({
  results,
  imageUri,
  onRetake,
  onConfirm,
  onQuickAdd,
  onScanMore,
}: ImageAnalysisResultProps) {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const [editedItems, setEditedItems] = useState<IdentifiedFood[]>(
    results.items,
  );
  const [selectedItems, setSelectedItems] = useState<Set<number>>(
    selectAllItems(results.items.length),
  );
  const [expandedItem, setExpandedItem] = useState<number | null>(null);

  const toggleItemSelection = (index: number) => {
    setSelectedItems((prev) => toggleItemInSet(index, prev));
  };

  const toggleExpanded = (index: number) => {
    setExpandedItem((prev) => (prev === index ? null : index));
  };

  const updateItem = (index: number, updates: Partial<IdentifiedFood>) => {
    setEditedItems((prev) => updateItemInArray(prev, index, updates));
  };

  const addMissingItem = () => {
    const newItem: IdentifiedFood = {
      name: "",
      category: "other",
      quantity: 1,
      quantityUnit: "pcs",
      storageLocation: "fridge",
      shelfLifeDays: 7,
      confidence: 1.0,
    };
    const newIndex = editedItems.length;
    setEditedItems((prev) => [...prev, newItem]);
    setSelectedItems((prev) => new Set([...prev, newIndex]));
    setExpandedItem(newIndex);
  };

  const handleConfirm = (goToSingleItem?: boolean) => {
    const selectedFoods = getSelectedItems(editedItems, selectedItems);
    onConfirm(selectedFoods, goToSingleItem);
  };

  const handleQuickAdd = () => {
    const selectedFoods = getSelectedItems(editedItems, selectedItems);
    if (onQuickAdd) {
      onQuickAdd(selectedFoods);
    } else {
      onConfirm(selectedFoods, false);
    }
  };

  const selectAll = () => {
    setSelectedItems(selectAllItems(editedItems.length));
  };

  const deselectAll = () => {
    setSelectedItems(deselectAllItems());
  };

  if (shouldShowEmptyState(results, editedItems)) {
    return (
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.emptyStateContainer,
            {
              paddingTop: insets.top + Spacing.xl,
              paddingBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <Image
            source={{ uri: imageUri }}
            style={styles.emptyStateThumbnail}
            contentFit="cover"
            accessibilityLabel="Analyzed food image"
          />

          <View style={styles.emptyStateContent}>
            <View
              style={[
                styles.emptyStateIcon,
                { backgroundColor: theme.backgroundSecondary },
              ]}
            >
              <Feather name="search" size={48} color={theme.textSecondary} />
            </View>

            <ThemedText type="h3" style={styles.emptyStateTitle}>
              No Food Items Detected
            </ThemedText>

            <ThemedText
              type="body"
              style={[styles.emptyStateText, { color: theme.textSecondary }]}
            >
              We couldn't identify any food items in this photo. Here are some
              tips for better results:
            </ThemedText>

            <View style={styles.tipsContainer}>
              <View style={styles.tipRow}>
                <Feather name="sun" size={20} color={AppColors.primary} />
                <ThemedText type="body" style={styles.tipText}>
                  Use good lighting
                </ThemedText>
              </View>
              <View style={styles.tipRow}>
                <Feather name="maximize" size={20} color={AppColors.primary} />
                <ThemedText type="body" style={styles.tipText}>
                  Keep items within the frame
                </ThemedText>
              </View>
              <View style={styles.tipRow}>
                <Feather name="eye" size={20} color={AppColors.primary} />
                <ThemedText type="body" style={styles.tipText}>
                  Ensure labels are visible
                </ThemedText>
              </View>
              <View style={styles.tipRow}>
                <Feather name="layers" size={20} color={AppColors.primary} />
                <ThemedText type="body" style={styles.tipText}>
                  Avoid cluttered backgrounds
                </ThemedText>
              </View>
            </View>
          </View>

          <View style={styles.emptyStateActions}>
            <GlassButton onPress={onRetake} style={styles.fullWidthButton}>
              Retake Photo
            </GlassButton>
            {onScanMore ? (
              <GlassButton
                variant="outline"
                onPress={onScanMore}
                style={styles.fullWidthButton}
              >
                Try Different Photo
              </GlassButton>
            ) : null}
          </View>
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Image
          source={{ uri: imageUri }}
          style={styles.thumbnail}
          contentFit="cover"
          accessibilityLabel="Analyzed food image"
        />

        <View style={styles.headerRow}>
          <ThemedText type="body" style={{ color: theme.textSecondary }}>
            {editedItems.length} item{editedItems.length !== 1 ? "s" : ""}{" "}
            detected
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

        {editedItems.map((item, index) => {
          const isExpanded = expandedItem === index;
          const isSelected = selectedItems.has(index);
          const confidenceColor = getConfidenceColor(item.confidence, theme);

          return (
            <Animated.View
              key={index}
              entering={FadeInDown.delay(index * 100).springify()}
              layout={Layout.springify()}
              style={[
                styles.itemCard,
                { backgroundColor: theme.surface, borderColor: theme.border },
                isSelected && {
                  borderColor: AppColors.primary,
                  borderWidth: 2,
                },
              ]}
            >
              <Pressable
                style={styles.itemMainRow}
                onPress={() => toggleExpanded(index)}
                accessibilityRole="button"
                accessibilityLabel={`${isExpanded ? "Collapse" : "Expand"} details for ${item.name || "item"}`}
              >
                <Pressable
                  style={styles.checkbox}
                  onPress={() => toggleItemSelection(index)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  accessibilityRole="checkbox"
                  accessibilityLabel={`${isSelected ? "Deselect" : "Select"} ${item.name || "item"}`}
                  accessibilityState={{ checked: isSelected }}
                >
                  {isSelected ? (
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
                        name={getConfidenceIcon(item.confidence)}
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
                      <ThemedText type="caption">
                        {formatCategoryDisplay(item.category)}
                      </ThemedText>
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
                      {formatStorageLocationDisplay(item.storageLocation)}
                    </ThemedText>
                  </View>

                  {shouldShowLowConfidenceWarning(item.confidence) ? (
                    <View
                      style={[
                        styles.reviewWarning,
                        { backgroundColor: theme.confidenceLow + "15" },
                      ]}
                    >
                      <Feather
                        name="alert-circle"
                        size={14}
                        color={theme.confidenceLow}
                      />
                      <ThemedText
                        type="caption"
                        style={{
                          color: theme.confidenceLow,
                          marginLeft: 6,
                        }}
                      >
                        Low confidence - please review
                      </ThemedText>
                    </View>
                  ) : null}
                </View>

                <View style={styles.expandButton}>
                  <Feather
                    name={isExpanded ? "chevron-up" : "chevron-down"}
                    size={20}
                    color={theme.textSecondary}
                  />
                </View>
              </Pressable>

              {isExpanded ? (
                <Animated.View
                  entering={FadeInUp.duration(200)}
                  exiting={FadeOutUp.duration(150)}
                  style={[
                    styles.expandedContent,
                    { borderTopColor: theme.border },
                  ]}
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
                        styles.textInput,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                        },
                      ]}
                      value={item.name}
                      onChangeText={(text) => updateItem(index, { name: text })}
                      placeholder="Item name"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>

                  <View style={styles.editField}>
                    <ThemedText
                      type="caption"
                      style={[styles.editLabel, { color: theme.textSecondary }]}
                    >
                      Category
                    </ThemedText>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      style={styles.chipScroll}
                    >
                      {CATEGORIES.map((cat) => (
                        <Pressable
                          key={cat}
                          style={[
                            styles.chip,
                            { backgroundColor: theme.backgroundSecondary },
                            item.category.toLowerCase() === cat && {
                              backgroundColor: AppColors.primary,
                            },
                          ]}
                          onPress={() => updateItem(index, { category: cat })}
                          accessibilityRole="button"
                          accessibilityLabel={`Set category to ${formatCategoryDisplay(cat)}`}
                          accessibilityState={{ selected: item.category.toLowerCase() === cat }}
                        >
                          <ThemedText
                            type="caption"
                            style={
                              item.category.toLowerCase() === cat
                                ? { color: "#FFFFFF" }
                                : undefined
                            }
                          >
                            {formatCategoryDisplay(cat)}
                          </ThemedText>
                        </Pressable>
                      ))}
                    </ScrollView>
                  </View>

                  <View style={styles.editRow}>
                    <View style={[styles.editField, { flex: 1 }]}>
                      <ThemedText
                        type="caption"
                        style={[
                          styles.editLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Quantity
                      </ThemedText>
                      <TextInput
                        style={[
                          styles.textInput,
                          {
                            backgroundColor: theme.backgroundSecondary,
                            color: theme.text,
                          },
                        ]}
                        value={String(item.quantity)}
                        onChangeText={(text) => {
                          const num = parseFloat(text) || 0;
                          updateItem(index, { quantity: num });
                        }}
                        keyboardType="numeric"
                        placeholder="0"
                        placeholderTextColor={theme.textSecondary}
                      />
                    </View>
                    <View
                      style={[
                        styles.editField,
                        { flex: 1, marginLeft: Spacing.md },
                      ]}
                    >
                      <ThemedText
                        type="caption"
                        style={[
                          styles.editLabel,
                          { color: theme.textSecondary },
                        ]}
                      >
                        Unit
                      </ThemedText>
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={styles.chipScroll}
                      >
                        {QUANTITY_UNITS.map((unit) => (
                          <Pressable
                            key={unit}
                            style={[
                              styles.chip,
                              styles.chipSmall,
                              { backgroundColor: theme.backgroundSecondary },
                              item.quantityUnit === unit && {
                                backgroundColor: AppColors.primary,
                              },
                            ]}
                            onPress={() =>
                              updateItem(index, { quantityUnit: unit })
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Set unit to ${unit}`}
                            accessibilityState={{ selected: item.quantityUnit === unit }}
                          >
                            <ThemedText
                              type="caption"
                              style={
                                item.quantityUnit === unit
                                  ? { color: "#FFFFFF" }
                                  : undefined
                              }
                            >
                              {unit}
                            </ThemedText>
                          </Pressable>
                        ))}
                      </ScrollView>
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
                      {STORAGE_LOCATIONS.map((loc) => (
                        <Pressable
                          key={loc}
                          style={[
                            styles.chip,
                            { backgroundColor: theme.backgroundSecondary },
                            item.storageLocation.toLowerCase() === loc && {
                              backgroundColor: AppColors.primary,
                            },
                          ]}
                          onPress={() =>
                            updateItem(index, { storageLocation: loc })
                          }
                          accessibilityRole="button"
                          accessibilityLabel={`Set storage to ${formatStorageLocationDisplay(loc)}`}
                          accessibilityState={{ selected: item.storageLocation.toLowerCase() === loc }}
                        >
                          <ThemedText
                            type="caption"
                            style={
                              item.storageLocation.toLowerCase() === loc
                                ? { color: "#FFFFFF" }
                                : undefined
                            }
                          >
                            {formatStorageLocationDisplay(loc)}
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
                      Shelf Life (days)
                    </ThemedText>
                    <TextInput
                      style={[
                        styles.textInput,
                        styles.textInputSmall,
                        {
                          backgroundColor: theme.backgroundSecondary,
                          color: theme.text,
                        },
                      ]}
                      value={String(item.shelfLifeDays)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10) || 0;
                        updateItem(index, { shelfLifeDays: num });
                      }}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor={theme.textSecondary}
                    />
                  </View>
                </Animated.View>
              ) : null}
            </Animated.View>
          );
        })}

        <Pressable
          style={[styles.addMissingButton, { borderColor: theme.border }]}
          onPress={addMissingItem}
          accessibilityRole="button"
          accessibilityLabel="Add missing item"
        >
          <View
            style={[
              styles.addMissingIcon,
              { backgroundColor: AppColors.primary + "15" },
            ]}
          >
            <Feather name="plus" size={20} color={AppColors.primary} />
          </View>
          <View style={styles.addMissingText}>
            <ThemedText type="body" style={{ color: AppColors.primary }}>
              Add Missing Item
            </ThemedText>
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              Manually add items the AI didn't detect
            </ThemedText>
          </View>
        </Pressable>
      </ScrollView>

      <View
        style={[
          styles.footer,
          {
            paddingBottom: insets.bottom + Spacing.lg,
            backgroundColor: theme.backgroundDefault,
          },
        ]}
      >
        {selectedItems.size === 1 ? (
          <View style={styles.footerButtons}>
            <GlassButton
              onPress={() => handleConfirm(true)}
              variant="outline"
              style={styles.singleItemButton}
            >
              Edit Details
            </GlassButton>
            <GlassButton
              onPress={handleQuickAdd}
              style={styles.singleItemButton}
            >
              Quick Add
            </GlassButton>
          </View>
        ) : (
          <GlassButton
            onPress={() => handleConfirm(false)}
            disabled={selectedItems.size === 0}
            style={styles.confirmButton}
          >
            Add {selectedItems.size} Item{selectedItems.size !== 1 ? "s" : ""}{" "}
            to Inventory
          </GlassButton>
        )}
        <View style={styles.footerSecondary}>
          <GlassButton
            variant="ghost"
            onPress={onRetake}
            style={styles.secondaryButton}
          >
            Retake Photo
          </GlassButton>
          {onScanMore ? (
            <GlassButton
              variant="ghost"
              onPress={onScanMore}
              style={styles.secondaryButton}
            >
              Scan More
            </GlassButton>
          ) : null}
        </View>
      </View>
    </ThemedView>
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
    paddingTop: Spacing.lg,
  },
  thumbnail: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
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
  itemCard: {
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
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
  reviewWarning: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  expandButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  expandedContent: {
    padding: Spacing.md,
    paddingTop: Spacing.lg,
    borderTopWidth: 1,
  },
  editField: {
    marginBottom: Spacing.md,
  },
  editLabel: {
    marginBottom: Spacing.xs,
  },
  textInput: {
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 16,
  },
  textInputSmall: {
    width: 100,
  },
  editRow: {
    flexDirection: "row",
  },
  chipScroll: {
    flexDirection: "row",
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
    marginRight: Spacing.xs,
  },
  chipSmall: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
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
  confirmButton: {
    width: "100%",
  },
  footerButtons: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  singleItemButton: {
    flex: 1,
  },
  footerSecondary: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  secondaryButton: {
    flex: 1,
  },
  emptyStateContainer: {
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
  },
  emptyStateThumbnail: {
    width: "100%",
    height: 180,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.xl,
  },
  emptyStateContent: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
  },
  emptyStateIcon: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  emptyStateTitle: {
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  emptyStateText: {
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
  tipsContainer: {
    width: "100%",
  },
  tipRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tipText: {
    marginLeft: Spacing.md,
  },
  emptyStateActions: {
    width: "100%",
    marginTop: Spacing.xl,
    gap: Spacing.sm,
  },
  fullWidthButton: {
    width: "100%",
  },
  manualEntryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  addMissingButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  addMissingIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  addMissingText: {
    flex: 1,
  },
});
