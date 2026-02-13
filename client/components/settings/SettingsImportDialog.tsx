import React from "react";
import { View, StyleSheet, Platform } from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import type { ThemeColors } from "@/lib/types";

interface SettingsImportDialogProps {
  showImportDialog: boolean;
  onImportData: (mode: "merge" | "replace") => void;
  onClose: () => void;
  theme: ThemeColors;
}

export function SettingsImportDialog({
  showImportDialog,
  onImportData,
  onClose,
  theme,
}: SettingsImportDialogProps) {
  if (Platform.OS !== "web" || !showImportDialog) {
    return null;
  }

  return (
    <View style={styles.modalOverlay}>
      <View style={[styles.modalContent, { backgroundColor: theme.backgroundRoot }]}>
        <View style={styles.modalHeader}>
          <Feather name="alert-circle" size={24} color={AppColors.primary} />
          <ThemedText type="h4">Import Data</ThemedText>
        </View>

        <ThemedText type="body" style={styles.modalDescription}>
          You are about to import data from a backup file. Choose how you would like to handle your existing data:
        </ThemedText>

        <View style={[styles.modalOption, { borderColor: theme.glass.border }]}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>Merge</ThemedText>
          <ThemedText type="caption">
            Combine the imported data with your existing data. Items with the same ID will be updated, and new items will be added.
          </ThemedText>
        </View>

        <View style={[styles.modalOption, { borderColor: theme.glass.border }]}>
          <ThemedText type="body" style={{ fontWeight: "600" }}>Replace</ThemedText>
          <ThemedText type="caption">
            Remove all your existing data and replace it entirely with the imported backup. This cannot be undone.
          </ThemedText>
        </View>

        <ThemedText type="caption" style={{ marginTop: Spacing.xs }}>
          Subscription limits apply. If the backup exceeds your plan's limits, some items may be trimmed.
        </ThemedText>

        <View style={styles.modalButtons}>
          <GlassButton
            variant="outline"
            onPress={onClose}
            style={styles.modalButton}
            testID="button-import-cancel"
          >
            Cancel
          </GlassButton>
          <GlassButton
            variant="secondary"
            onPress={() => onImportData("merge")}
            style={styles.modalButton}
            testID="button-import-merge"
          >
            Merge
          </GlassButton>
          <GlassButton
            variant="primary"
            onPress={() => onImportData("replace")}
            style={styles.modalButton}
            testID="button-import-replace"
          >
            Replace
          </GlassButton>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    position: "absolute" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modalContent: {
    width: "90%" as const,
    maxWidth: 440,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    gap: Spacing.md,
  },
  modalHeader: {
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: Spacing.md,
  },
  modalDescription: {
    lineHeight: 22,
  },
  modalOption: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  modalButtons: {
    flexDirection: "row" as const,
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});
