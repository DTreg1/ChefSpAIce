import React from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Modal,
  TextInput,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";

interface SettingsAccountDataProps {
  isAuthenticated: boolean;
  isExporting: boolean;
  isImporting: boolean;
  isDownloadingData: boolean;
  showDeleteModal: boolean;
  deleteConfirmText: string;
  isDeleting: boolean;
  showDeletionLevelsModal: boolean;
  onExportData: () => void;
  onImportFilePick: () => void;
  onDownloadMyData: () => void;
  onDeleteAccountPress: () => void;
  onDeleteAccountConfirm: () => void;
  onCancelDelete: () => void;
  onDeleteConfirmTextChange: (text: string) => void;
  onClearData: () => void;
  onResetForTesting: () => void;
  onDeletionLevelsPress: () => void;
  onDeletionLevelsClose: () => void;
  theme: any;
}

export function SettingsAccountData({
  isAuthenticated,
  isExporting,
  isImporting,
  isDownloadingData,
  showDeleteModal,
  deleteConfirmText,
  isDeleting,
  showDeletionLevelsModal,
  onExportData,
  onImportFilePick,
  onDownloadMyData,
  onDeleteAccountPress,
  onDeleteAccountConfirm,
  onCancelDelete,
  onDeleteConfirmTextChange,
  onClearData,
  onResetForTesting,
  onDeletionLevelsPress,
  onDeletionLevelsClose,
  theme,
}: SettingsAccountDataProps) {
  const modalBg = theme.surface;

  const handleDeletionOption = (callback: () => void) => {
    onDeletionLevelsClose();
    setTimeout(() => callback(), 300);
  };
  return (
    <GlassCard style={styles.section}>
      <ThemedText type="h4" style={styles.sectionTitle}>
        Account & Data
      </ThemedText>

      {isAuthenticated ? (
        <>
          <Pressable
            style={[
              styles.legalMenuItem,
              { borderColor: theme.glass.border },
            ]}
            onPress={onExportData}
            disabled={isExporting}
            data-testid="button-export-data"
          >
            <View style={styles.legalMenuIcon}>
              {isExporting ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Feather name="download" size={18} color={AppColors.primary} />
              )}
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Export My Data</ThemedText>
              <ThemedText type="caption">
                Download a full backup of all your data as a JSON file
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[
              styles.legalMenuItem,
              { borderColor: theme.glass.border },
            ]}
            onPress={onImportFilePick}
            disabled={isImporting}
            data-testid="button-import-data"
          >
            <View style={styles.legalMenuIcon}>
              {isImporting ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Feather name="upload" size={18} color={AppColors.primary} />
              )}
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Import Data</ThemedText>
              <ThemedText type="caption">
                Restore data from a previously exported backup file
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </Pressable>

          <Pressable
            style={[
              styles.legalMenuItem,
              { borderColor: theme.glass.border },
            ]}
            onPress={onDownloadMyData}
            disabled={isDownloadingData}
            data-testid="button-download-my-data"
            accessibilityRole="button"
            accessibilityLabel="Download my data"
            accessibilityHint="Downloads all your personal data as a JSON file for GDPR compliance"
          >
            <View style={styles.legalMenuIcon}>
              {isDownloadingData ? (
                <ActivityIndicator size="small" color={AppColors.primary} />
              ) : (
                <Feather name="shield" size={18} color={AppColors.primary} />
              )}
            </View>
            <View style={styles.legalMenuText}>
              <ThemedText type="body">Download My Data</ThemedText>
              <ThemedText type="caption">
                Get a copy of all your personal data (GDPR)
              </ThemedText>
            </View>
            <Feather name="chevron-right" size={16} color={theme.textSecondary} />
          </Pressable>
        </>
      ) : null}

      <View style={{ marginTop: 16 }}>
        <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600", marginBottom: 8 }}>
          Danger Zone
        </ThemedText>
      </View>

      <Pressable
        style={[
          styles.dangerMenuItem,
          { borderColor: theme.glass.border },
        ]}
        onPress={onDeletionLevelsPress}
        data-testid="button-manage-account-data"
        accessibilityRole="button"
        accessibilityLabel="Manage account data"
      >
        <View style={styles.dangerMenuIcon}>
          <Feather name="trash-2" size={18} color={AppColors.error} />
        </View>
        <View style={styles.dangerMenuText}>
          <ThemedText type="body">Manage Account Data</ThemedText>
          <ThemedText type="caption">
            Clear data, delete account, or reset app
          </ThemedText>
        </View>
        <Feather name="chevron-right" size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal
        visible={showDeletionLevelsModal}
        transparent
        animationType="fade"
        onRequestClose={onDeletionLevelsClose}
      >
        <View style={styles.deleteModalOverlay} data-testid="modal-deletion-levels">
          <View style={[styles.deleteModalContent, { backgroundColor: modalBg }]}>
            <View style={[styles.warningBanner, { backgroundColor: `${theme.textSecondary}15`, marginBottom: Spacing.md }]}>
              <Feather name="sliders" size={24} color={theme.text} />
              <ThemedText type="body" style={{ fontWeight: "600" }}>
                Manage Account Data
              </ThemedText>
            </View>

            <Pressable
              style={[
                styles.dangerMenuItem,
                { borderColor: theme.glass.border, marginBottom: Spacing.sm },
              ]}
              onPress={() => handleDeletionOption(onClearData)}
              data-testid="button-clear-app-data"
              accessibilityRole="button"
              accessibilityLabel="Clear app data"
            >
              <View style={styles.dangerMenuIcon}>
                <Feather name="trash" size={18} color={AppColors.warning} />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body">Clear App Data</ThemedText>
                <ThemedText type="caption">
                  Remove all local data including inventory, recipes, meal plans, and chat history. Your account stays active.
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textSecondary} />
            </Pressable>

            <Pressable
              style={[
                styles.dangerMenuItem,
                { borderColor: AppColors.error, borderWidth: 1, marginBottom: Spacing.sm },
              ]}
              onPress={() => handleDeletionOption(onDeleteAccountPress)}
              data-testid="button-delete-account-level"
              accessibilityRole="button"
              accessibilityLabel="Delete my account permanently"
            >
              <View style={styles.dangerMenuIcon}>
                <Feather name="user-x" size={18} color={AppColors.error} />
              </View>
              <View style={styles.dangerMenuText}>
                <ThemedText type="body" style={{ color: AppColors.error }}>
                  Delete My Account
                </ThemedText>
                <ThemedText type="caption">
                  Permanently delete your account and all associated data from our servers. This cannot be undone.
                </ThemedText>
              </View>
              <Feather name="chevron-right" size={16} color={theme.textSecondary} />
            </Pressable>

            {__DEV__ ? (
              <Pressable
                style={[
                  styles.dangerMenuItem,
                  { borderColor: theme.glass.border, marginBottom: Spacing.sm },
                ]}
                onPress={() => handleDeletionOption(onResetForTesting)}
                data-testid="button-reset-app-level"
                accessibilityRole="button"
                accessibilityLabel="Reset app for testing"
              >
                <View style={styles.dangerMenuIcon}>
                  <Feather name="refresh-cw" size={18} color={theme.textSecondary} />
                </View>
                <View style={styles.dangerMenuText}>
                  <ThemedText type="body">Reset App</ThemedText>
                  <ThemedText type="caption">
                    Sign out and reset to experience the app as a brand new user.
                  </ThemedText>
                </View>
                <Feather name="chevron-right" size={16} color={theme.textSecondary} />
              </Pressable>
            ) : null}

            <GlassButton
              variant="outline"
              onPress={onDeletionLevelsClose}
              style={{ marginTop: Spacing.sm }}
            >
              <ThemedText>Cancel</ThemedText>
            </GlassButton>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={onCancelDelete}
      >
        <View style={styles.deleteModalOverlay}>
          <View style={[styles.deleteModalContent, { backgroundColor: modalBg }]}>
            <View style={[styles.warningBanner, { backgroundColor: `${AppColors.error}15` }]}>
              <Feather name="alert-triangle" size={24} color={AppColors.error} />
              <ThemedText type="body" style={{ color: AppColors.error, fontWeight: "600" }}>
                Delete Account
              </ThemedText>
            </View>

            <ThemedText type="body" style={styles.deleteWarningText}>
              This action is permanent and cannot be undone. Deleting your account will remove:
            </ThemedText>

            <View style={{ paddingHorizontal: 4, marginBottom: 12 }}>
              <ThemedText type="caption" style={{ marginBottom: 4 }}>
                {"\u2022"} All inventory and pantry items
              </ThemedText>
              <ThemedText type="caption" style={{ marginBottom: 4 }}>
                {"\u2022"} All saved recipes and generated images
              </ThemedText>
              <ThemedText type="caption" style={{ marginBottom: 4 }}>
                {"\u2022"} Meal plans and shopping lists
              </ThemedText>
              <ThemedText type="caption" style={{ marginBottom: 4 }}>
                {"\u2022"} Chat history and preferences
              </ThemedText>
              <ThemedText type="caption" style={{ marginBottom: 4 }}>
                {"\u2022"} Your subscription and payment data
              </ThemedText>
              <ThemedText type="caption">
                {"\u2022"} Cookware and all other account data
              </ThemedText>
            </View>

            <ThemedText type="body" style={{ fontWeight: "600", marginBottom: 8 }}>
              Type DELETE to confirm:
            </ThemedText>

            <TextInput
              style={[
                styles.deleteConfirmInput,
                {
                  color: theme.text,
                  borderColor: deleteConfirmText === "DELETE" ? AppColors.error : theme.glass.border,
                  backgroundColor: theme.glass.background,
                },
              ]}
              value={deleteConfirmText}
              onChangeText={onDeleteConfirmTextChange}
              placeholder="Type DELETE here"
              placeholderTextColor={theme.textSecondary}
              autoCapitalize="characters"
              autoCorrect={false}
              editable={!isDeleting}
              data-testid="input-delete-confirm"
            />

            <View style={styles.deleteButtonRow}>
              <GlassButton
                variant="outline"
                onPress={onCancelDelete}
                style={styles.cancelDeleteButton}
                disabled={isDeleting}
              >
                <ThemedText>Cancel</ThemedText>
              </GlassButton>
              <GlassButton
                variant="primary"
                onPress={onDeleteAccountConfirm}
                style={[
                  styles.confirmDeleteButton,
                  { opacity: deleteConfirmText === "DELETE" && !isDeleting ? 1 : 0.5 },
                ]}
                disabled={deleteConfirmText !== "DELETE" || isDeleting}
                icon={
                  isDeleting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Feather name="trash-2" size={16} color="#FFFFFF" />
                  )
                }
              >
                <ThemedText style={{ color: "#FFFFFF" }}>
                  {isDeleting ? "Deleting..." : "Delete Permanently"}
                </ThemedText>
              </GlassButton>
            </View>
          </View>
        </View>
      </Modal>
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
  legalMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  legalMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  legalMenuText: {
    flex: 1,
    gap: 2,
  },
  dangerMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.md,
  },
  dangerMenuIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  dangerMenuText: {
    flex: 1,
    gap: 2,
  },
  deleteModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  deleteModalContent: {
    width: "100%" as any,
    maxWidth: 420,
    borderRadius: 16,
    padding: 20,
  },
  deleteConfirmInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    fontWeight: "600" as const,
    letterSpacing: 2,
    textAlign: "center" as const,
    marginBottom: 16,
  },
  warningBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
  },
  deleteWarningText: {
    lineHeight: 22,
  },
  deleteButtonRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  cancelDeleteButton: {
    flex: 1,
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: AppColors.error,
  },
});
