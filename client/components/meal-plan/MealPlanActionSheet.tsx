import React from "react";
import { View, StyleSheet, Pressable, Modal } from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { Recipe } from "@/lib/storage";

interface MealPlanActionSheetProps {
  visible: boolean;
  recipe: Recipe | null;
  onChangeRecipe: () => void;
  onRemoveMeal: () => void;
  onClose: () => void;
}

export function MealPlanActionSheet({
  visible,
  recipe,
  onChangeRecipe,
  onRemoveMeal,
  onClose,
}: MealPlanActionSheetProps) {
  const { theme } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable
        style={styles.modalOverlay}
        onPress={onClose}
        accessibilityRole="button"
        accessibilityLabel="Close meal options"
      >
        <View
          style={[
            styles.actionSheet,
            { backgroundColor: theme.backgroundDefault },
          ]}
        >
          <ThemedText type="h4" style={styles.actionSheetTitle}>
            {recipe?.title || "Meal Options"}
          </ThemedText>

          <Pressable
            style={[styles.actionButton, { borderColor: theme.border }]}
            onPress={onChangeRecipe}
            accessibilityRole="button"
            accessibilityLabel="Change recipe for this meal"
          >
            <Feather name="refresh-cw" size={20} color={AppColors.primary} />
            <ThemedText type="body" style={{ color: AppColors.primary }}>
              Change Recipe
            </ThemedText>
          </Pressable>

          <Pressable
            style={[styles.actionButton, { borderColor: theme.border }]}
            onPress={onRemoveMeal}
            accessibilityRole="button"
            accessibilityLabel="Remove this meal from your plan"
          >
            <Feather name="trash-2" size={20} color={AppColors.error} />
            <ThemedText type="body" style={{ color: AppColors.error }}>
              Remove from Plan
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.actionButton,
              styles.cancelButton,
              { backgroundColor: theme.backgroundSecondary },
            ]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Cancel"
          >
            <ThemedText type="body">Cancel</ThemedText>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  actionSheet: {
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.sm,
  },
  actionSheetTitle: {
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  cancelButton: {
    marginTop: Spacing.sm,
    justifyContent: "center",
    borderWidth: 0,
  },
});
