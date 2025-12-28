import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  ActivityIndicator,
  Platform,
  Linking,
} from "react-native";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system";
import { Image } from "expo-image";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import type { NutritionFacts } from "@shared/schema";

interface NutritionCorrectionModalProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
  barcode?: string;
  brand?: string;
  originalSource?: string;
  originalSourceId?: string;
  originalNutrition?: NutritionFacts;
}

export function NutritionCorrectionModal({
  visible,
  onClose,
  productName,
  barcode,
  brand,
  originalSource,
  originalSourceId,
  originalNutrition,
}: NutritionCorrectionModalProps) {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraPermissionDenied, setCameraPermissionDenied] = useState(false);

  const handlePickImage = async () => {
    setErrorMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      setErrorMessage("Unable to access photo library. Please try again.");
    }
  };

  const handleTakePhoto = async () => {
    setErrorMessage(null);
    setCameraPermissionDenied(false);
    
    try {
      const { status, canAskAgain } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== "granted") {
        if (!canAskAgain && Platform.OS !== "web") {
          setCameraPermissionDenied(true);
        } else {
          setErrorMessage("Camera permission is required to take photos.");
        }
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        setImageUri(result.assets[0].uri);
      }
    } catch (error) {
      setErrorMessage("Unable to access camera. Please try again.");
    }
  };

  const handleOpenSettings = async () => {
    try {
      await Linking.openSettings();
    } catch (error) {
      setErrorMessage("Unable to open settings.");
    }
  };

  const handleSubmit = async () => {
    if (submitting) return;

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const baseUrl = getApiUrl();
      const url = new URL("/api/nutrition/corrections", baseUrl);

      let imageUrlToStore: string | undefined;
      
      if (imageUri && Platform.OS !== "web") {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: "base64",
        });
        imageUrlToStore = `data:image/jpeg;base64,${base64}`;
      } else if (imageUri) {
        imageUrlToStore = imageUri;
      }

      const response = await fetch(url.toString(), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          productName,
          barcode,
          brand,
          originalSource,
          originalSourceId,
          originalNutrition: originalNutrition
            ? JSON.stringify(originalNutrition)
            : undefined,
          imageUrl: imageUrlToStore,
          notes: notes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to submit correction");
      }

      setSubmitted(true);
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (error) {
      setErrorMessage("Unable to submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setImageUri(null);
    setNotes("");
    setSubmitted(false);
    setErrorMessage(null);
    setCameraPermissionDenied(false);
    onClose();
  };

  const handleRemoveImage = () => {
    setImageUri(null);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <BlurView
        intensity={30}
        tint={isDark ? "dark" : "light"}
        style={styles.backdrop}
      >
        <Pressable style={styles.backdropPressable} onPress={handleClose} />
        <Animated.View
          entering={FadeIn.duration(200)}
          exiting={FadeOut.duration(150)}
          style={[
            styles.container,
            {
              marginTop: insets.top + Spacing.xl,
              marginBottom: insets.bottom + Spacing.xl,
            },
          ]}
        >
          <GlassCard style={styles.card}>
            <View style={styles.header}>
              <ThemedText type="h3" style={styles.title}>
                Report Nutrition Issue
              </ThemedText>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            {submitted ? (
              <View style={styles.successContainer}>
                <View
                  style={[
                    styles.successIcon,
                    { backgroundColor: AppColors.success },
                  ]}
                >
                  <Feather name="check" size={32} color="#FFFFFF" />
                </View>
                <ThemedText type="h4" style={styles.successTitle}>
                  Thank You!
                </ThemedText>
                <ThemedText type="body" style={styles.successText}>
                  Your correction has been submitted for review.
                </ThemedText>
              </View>
            ) : (
              <KeyboardAwareScrollViewCompat
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <ThemedText type="body" style={styles.productName}>
                  {productName}
                </ThemedText>
                {brand ? (
                  <ThemedText type="caption" style={styles.brandText}>
                    {brand}
                  </ThemedText>
                ) : null}

                {errorMessage ? (
                  <View style={styles.errorBanner}>
                    <Feather
                      name="alert-circle"
                      size={16}
                      color={AppColors.error}
                    />
                    <ThemedText type="small" style={styles.errorText}>
                      {errorMessage}
                    </ThemedText>
                  </View>
                ) : null}

                <ThemedText type="small" style={styles.sectionLabel}>
                  Upload a photo of the actual nutrition label
                </ThemedText>

                {imageUri ? (
                  <View style={styles.imagePreviewContainer}>
                    <Image
                      source={{ uri: imageUri }}
                      style={styles.imagePreview}
                      contentFit="cover"
                    />
                    <Pressable
                      style={styles.removeImageButton}
                      onPress={handleRemoveImage}
                    >
                      <Feather name="x" size={16} color="#FFFFFF" />
                    </Pressable>
                  </View>
                ) : cameraPermissionDenied ? (
                  <View style={styles.permissionDeniedContainer}>
                    <Feather
                      name="camera-off"
                      size={24}
                      color={theme.textSecondary}
                    />
                    <ThemedText type="small" style={styles.permissionText}>
                      Camera access was denied. Please enable it in Settings.
                    </ThemedText>
                    <GlassButton
                      variant="outline"
                      onPress={handleOpenSettings}
                      style={styles.settingsButton}
                    >
                      <ThemedText style={{ color: AppColors.primary }}>
                        Open Settings
                      </ThemedText>
                    </GlassButton>
                    <GlassButton
                      variant="outline"
                      onPress={handlePickImage}
                      style={styles.settingsButton}
                      icon={
                        <Feather
                          name="image"
                          size={18}
                          color={AppColors.primary}
                        />
                      }
                    >
                      <ThemedText style={{ color: AppColors.primary }}>
                        Choose from Library
                      </ThemedText>
                    </GlassButton>
                  </View>
                ) : (
                  <View style={styles.imageButtons}>
                    {Platform.OS !== "web" ? (
                      <GlassButton
                        variant="outline"
                        onPress={handleTakePhoto}
                        style={styles.imageButton}
                        icon={
                          <Feather
                            name="camera"
                            size={18}
                            color={AppColors.primary}
                          />
                        }
                      >
                        <ThemedText style={{ color: AppColors.primary }}>
                          Take Photo
                        </ThemedText>
                      </GlassButton>
                    ) : null}
                    <GlassButton
                      variant="outline"
                      onPress={handlePickImage}
                      style={styles.imageButton}
                      icon={
                        <Feather
                          name="image"
                          size={18}
                          color={AppColors.primary}
                        />
                      }
                    >
                      <ThemedText style={{ color: AppColors.primary }}>
                        Choose Photo
                      </ThemedText>
                    </GlassButton>
                  </View>
                )}

                <ThemedText type="small" style={styles.sectionLabel}>
                  Additional notes (optional)
                </ThemedText>
                <TextInput
                  style={[
                    styles.notesInput,
                    {
                      backgroundColor: theme.backgroundSecondary,
                      color: theme.text,
                      borderColor: theme.border,
                    },
                  ]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Describe what's different on your label..."
                  placeholderTextColor={theme.textSecondary}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />

                <GlassButton
                  onPress={handleSubmit}
                  disabled={submitting}
                  style={styles.submitButton}
                >
                  {submitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                  ) : (
                    <ThemedText style={{ color: "#FFFFFF", fontWeight: "600" }}>
                      Submit Correction
                    </ThemedText>
                  )}
                </GlassButton>

                <ThemedText type="caption" style={styles.disclaimer}>
                  Your submission helps us improve nutrition data accuracy.
                </ThemedText>
              </KeyboardAwareScrollViewCompat>
            )}
          </GlassCard>
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  backdropPressable: {
    ...StyleSheet.absoluteFillObject,
  },
  container: {
    width: "90%",
    maxWidth: 400,
    maxHeight: "80%",
  },
  card: {
    padding: Spacing.lg,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    flex: 1,
    marginBottom: 0,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  scrollView: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingBottom: Spacing.sm,
  },
  productName: {
    fontWeight: "600",
    marginBottom: Spacing.xs,
  },
  brandText: {
    marginBottom: Spacing.lg,
    opacity: 0.7,
  },
  sectionLabel: {
    marginBottom: Spacing.sm,
    marginTop: Spacing.md,
    opacity: 0.8,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    padding: Spacing.md,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.sm,
  },
  errorText: {
    flex: 1,
    color: AppColors.error,
  },
  imageButtons: {
    flexDirection: "row",
    gap: Spacing.sm,
    flexWrap: "wrap",
  },
  imageButton: {
    flex: 1,
    minWidth: 120,
  },
  imagePreviewContainer: {
    position: "relative",
    borderRadius: BorderRadius.md,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.md,
  },
  removeImageButton: {
    position: "absolute",
    top: Spacing.sm,
    right: Spacing.sm,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  permissionDeniedContainer: {
    alignItems: "center",
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  permissionText: {
    textAlign: "center",
    opacity: 0.7,
  },
  settingsButton: {
    width: "100%",
  },
  notesInput: {
    minHeight: 80,
    borderWidth: 1,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontSize: 14,
  },
  submitButton: {
    marginTop: Spacing.lg,
  },
  disclaimer: {
    textAlign: "center",
    marginTop: Spacing.md,
    opacity: 0.6,
  },
  successContainer: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  successIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  successTitle: {
    marginBottom: Spacing.sm,
  },
  successText: {
    textAlign: "center",
    opacity: 0.8,
  },
});
