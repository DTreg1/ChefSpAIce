import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
} from "react-native";
import { logger } from "@/lib/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { getApiUrl } from "@/lib/query-client";
import { storage, generateId } from "@/lib/storage";

interface ScannedRecipe {
  title: string;
  description?: string;
  ingredients: string[];
  instructions: string[];
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  notes?: string;
  error?: string;
  suggestion?: string;
}

export default function RecipeScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme, isDark } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScannedRecipe | null>(null);
  const cameraRef = useRef<CameraView>(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  // Handle navigation focus/blur - suspend camera when navigating away
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, [])
  );

  // Handle AppState changes - suspend camera when app goes to background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setIsCameraActive(nextAppState === "active" && isScreenFocused);
    };
    
    const subscription = AppState.addEventListener("change", handleAppStateChange);
    return () => subscription.remove();
  }, [isScreenFocused]);

  // Update camera active state based on both screen focus and app state
  useEffect(() => {
    setIsCameraActive(isScreenFocused && AppState.currentState === "active");
  }, [isScreenFocused]);

  const handleCapture = async () => {
    if (!cameraRef.current || isCapturing) return;

    setIsCapturing(true);

    try {
      if (Platform.OS !== "web") {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: true,
      });

      if (!photo?.base64) {
        Alert.alert("Error", "Failed to capture image");
        setIsCapturing(false);
        return;
      }

      setIsProcessing(true);

      const manipResult = await ImageManipulator.manipulateAsync(
        photo.uri,
        [{ resize: { width: 1200 } }],
        {
          compress: 0.8,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      const response = await fetch(
        new URL("/api/recipes/scan", getApiUrl()).toString(),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            image: manipResult.base64,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error (${response.status})`);
      }

      const result: ScannedRecipe = await response.json();

      if (result.error) {
        Alert.alert("Scan Failed", result.error, [
          { text: "Try Again", onPress: () => {} },
        ]);
        setScanResult(null);
      } else if (!result.title) {
        Alert.alert(
          "No Recipe Found",
          result.suggestion ||
            "Could not extract a recipe from this image. Try taking a clearer photo of the recipe.",
          [{ text: "Try Again", onPress: () => {} }],
        );
        setScanResult(null);
      } else {
        setScanResult(result);

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
      }
    } catch (error) {
      console.error("Recipe scan error:", error);
      Alert.alert(
        "Error",
        "Failed to scan recipe. Please try again.",
      );
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
    }
  };

  const handleSaveRecipe = async () => {
    if (!scanResult) return;

    try {
      const newRecipe = {
        id: generateId(),
        title: scanResult.title,
        description: scanResult.description || "",
        ingredients: scanResult.ingredients,
        instructions: scanResult.instructions,
        prepTime: scanResult.prepTime || "",
        cookTime: scanResult.cookTime || "",
        servings: scanResult.servings || 4,
        notes: scanResult.notes || "",
        createdAt: new Date().toISOString(),
        source: "scanned",
      };

      await storage.addRecipe(newRecipe as any);

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      Alert.alert(
        "Recipe Saved",
        `"${scanResult.title}" has been added to your recipes.`,
        [
          {
            text: "Done",
            onPress: () => navigation.goBack(),
          },
          {
            text: "Scan Another",
            onPress: () => {
              setScanResult(null);
            },
          },
        ],
      );
    } catch (error) {
      console.error("Failed to save recipe:", error);
      Alert.alert("Error", "Failed to save recipe. Please try again.");
    }
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleRetake = () => {
    setScanResult(null);
  };

  if (!permission) {
    return (
      <View
        style={[styles.container, { backgroundColor: theme.backgroundRoot }]}
      >
        <ThemedText>Loading camera permissions...</ThemedText>
      </View>
    );
  }

  if (!permission.granted) {
    if (permission.status === "denied" && !permission.canAskAgain) {
      return (
        <View
          style={[
            styles.container,
            styles.centered,
            { backgroundColor: theme.backgroundRoot },
          ]}
        >
          <Feather name="camera-off" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText type="body" style={styles.permissionText}>
            Please enable camera access in your device settings to scan
            recipes.
          </ThemedText>
          {Platform.OS !== "web" ? (
            <GlassButton
              onPress={async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  logger.log("Could not open settings");
                }
              }}
              style={styles.permissionButton}
            >
              Open Settings
            </GlassButton>
          ) : null}
          <GlassButton
            variant="ghost"
            onPress={handleClose}
            style={styles.cancelButton}
          >
            Cancel
          </GlassButton>
        </View>
      );
    }

    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <Feather name="camera" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Permission Needed
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          We need access to your camera to scan recipes from cookbooks and
          printed pages.
        </ThemedText>
        <GlassButton onPress={requestPermission} style={styles.permissionButton}>
          Enable Camera
        </GlassButton>
        <GlassButton
          variant="ghost"
          onPress={handleClose}
          style={styles.cancelButton}
        >
          Cancel
        </GlassButton>
      </View>
    );
  }

  if (scanResult) {
    return (
      <ThemedView style={styles.container}>
        <View style={[styles.header, { paddingTop: insets.top }]}>
          <Pressable
            testID="button-close-recipe-scanner"
            onPress={handleClose}
            style={styles.headerButton}
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h3" style={styles.headerTitle}>
            Scanned Recipe
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          <GlassCard style={styles.recipeCard}>
            <ThemedText type="h3" style={styles.recipeTitle}>
              {scanResult.title}
            </ThemedText>
            
            {scanResult.description ? (
              <ThemedText type="body" style={styles.recipeDescription}>
                {scanResult.description}
              </ThemedText>
            ) : null}

            {(scanResult.prepTime || scanResult.cookTime || scanResult.servings) ? (
              <View style={styles.metaRow}>
                {scanResult.prepTime ? (
                  <View style={styles.metaItem}>
                    <Feather name="clock" size={14} color={theme.textSecondary} />
                    <ThemedText type="caption" style={styles.metaText}>
                      Prep: {scanResult.prepTime}
                    </ThemedText>
                  </View>
                ) : null}
                {scanResult.cookTime ? (
                  <View style={styles.metaItem}>
                    <Feather name="thermometer" size={14} color={theme.textSecondary} />
                    <ThemedText type="caption" style={styles.metaText}>
                      Cook: {scanResult.cookTime}
                    </ThemedText>
                  </View>
                ) : null}
                {scanResult.servings ? (
                  <View style={styles.metaItem}>
                    <Feather name="users" size={14} color={theme.textSecondary} />
                    <ThemedText type="caption" style={styles.metaText}>
                      Serves: {scanResult.servings}
                    </ThemedText>
                  </View>
                ) : null}
              </View>
            ) : null}
          </GlassCard>

          <GlassCard style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Ingredients
            </ThemedText>
            {scanResult.ingredients.map((ingredient, index) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.bulletPoint} />
                <ThemedText type="body" style={styles.ingredientText}>
                  {ingredient}
                </ThemedText>
              </View>
            ))}
          </GlassCard>

          <GlassCard style={styles.sectionCard}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Instructions
            </ThemedText>
            {scanResult.instructions.map((instruction, index) => (
              <View key={index} style={styles.instructionRow}>
                <View style={styles.stepNumber}>
                  <ThemedText type="caption" style={styles.stepNumberText}>
                    {index + 1}
                  </ThemedText>
                </View>
                <ThemedText type="body" style={styles.instructionText}>
                  {instruction}
                </ThemedText>
              </View>
            ))}
          </GlassCard>

          {scanResult.notes ? (
            <GlassCard style={styles.sectionCard}>
              <ThemedText type="h4" style={styles.sectionTitle}>
                Notes
              </ThemedText>
              <ThemedText type="body">{scanResult.notes}</ThemedText>
            </GlassCard>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.resultsActions,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <GlassButton
            variant="ghost"
            onPress={handleRetake}
            style={styles.retakeButton}
          >
            Retake Photo
          </GlassButton>
          <GlassButton onPress={handleSaveRecipe} style={styles.saveButton}>
            Save Recipe
          </GlassButton>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      {isCameraActive && (
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing="back"
          mode="picture"
        >
          <View style={[styles.cameraOverlay, { paddingTop: insets.top }]}>
            <View style={styles.cameraHeader}>
              <Pressable
                testID="button-close-recipe-scanner"
                onPress={handleClose}
                style={styles.cameraButton}
              >
                <Feather name="x" size={24} color="#FFFFFF" />
              </Pressable>
              <View style={styles.cameraHeaderCenter}>
                <ThemedText type="h4" style={styles.cameraTitle}>
                  Scan Recipe
                </ThemedText>
                <ThemedText type="caption" style={styles.cameraSubtitle}>
                  Point at a cookbook or printed recipe
                </ThemedText>
              </View>
              <View style={styles.cameraHeaderSpacer} />
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTL]} />
              <View style={[styles.corner, styles.cornerTR]} />
              <View style={[styles.corner, styles.cornerBL]} />
              <View style={[styles.corner, styles.cornerBR]} />
            </View>

            <View
              style={[styles.cameraFooter, { paddingBottom: insets.bottom + 20 }]}
            >
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <ThemedText type="body" style={styles.processingText}>
                    Extracting recipe...
                  </ThemedText>
                </View>
              ) : (
                <>
                  <ThemedText type="caption" style={styles.tipText}>
                    Tip: Make sure the recipe text is clearly visible
                  </ThemedText>
                  <Pressable
                    testID="button-capture-recipe"
                    onPress={handleCapture}
                    disabled={isCapturing}
                    style={[
                      styles.captureButton,
                      isCapturing && styles.captureButtonDisabled,
                    ]}
                  >
                    <View style={styles.captureButtonInner} />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </CameraView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  camera: {
    flex: 1,
    zIndex: 1,
  },
  cameraOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 10,
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    zIndex: 10,
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  cameraHeaderCenter: {
    alignItems: "center",
  },
  cameraTitle: {
    color: "#FFFFFF",
    ...Platform.select({
      web: {
        textShadow: "0px 1px 3px rgba(0, 0, 0, 0.5)",
      },
      default: {},
    }),
  },
  cameraSubtitle: {
    color: "rgba(255, 255, 255, 0.8)",
    ...Platform.select({
      web: {
        textShadow: "0px 1px 2px rgba(0, 0, 0, 0.5)",
      },
      default: {},
    }),
  },
  cameraHeaderSpacer: {
    width: 44,
  },
  scanFrame: {
    flex: 1,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
    position: "relative",
    zIndex: 10,
  },
  corner: {
    position: "absolute",
    width: 30,
    height: 30,
    borderColor: "#FFFFFF",
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 8,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 8,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 8,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 8,
  },
  cameraFooter: {
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    zIndex: 10,
  },
  tipText: {
    color: "rgba(255, 255, 255, 0.8)",
    marginBottom: Spacing.md,
    textAlign: "center",
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    padding: 4,
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    flex: 1,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
  processingContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  processingText: {
    color: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 44,
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  recipeCard: {
    padding: Spacing.lg,
  },
  recipeTitle: {
    marginBottom: Spacing.sm,
  },
  recipeDescription: {
    opacity: 0.8,
    marginBottom: Spacing.md,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  metaText: {
    opacity: 0.7,
  },
  sectionCard: {
    padding: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  bulletPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: AppColors.primary,
    marginTop: 8,
  },
  ingredientText: {
    flex: 1,
  },
  instructionRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.md,
    gap: Spacing.md,
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: AppColors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  instructionText: {
    flex: 1,
  },
  resultsActions: {
    flexDirection: "row",
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    gap: Spacing.md,
  },
  retakeButton: {
    flex: 1,
  },
  saveButton: {
    flex: 2,
  },
  permissionTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    opacity: 0.7,
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    marginBottom: Spacing.md,
  },
  cancelButton: {},
});
