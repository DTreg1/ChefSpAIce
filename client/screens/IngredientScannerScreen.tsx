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
import { getApiUrl, apiRequest } from "@/lib/query-client";
import { storage, generateId } from "@/lib/storage";

interface ScannedIngredient {
  name: string;
  simplifiedName: string;
  category: string;
  storageLocation: string;
  selected?: boolean;
}

interface NutritionInfo {
  servingSize?: string;
  servingsPerContainer?: number;
  calories?: number;
  protein?: number;
  carbs?: number;
  fat?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
}

interface ScanResult {
  productName: string | null;
  ingredients: ScannedIngredient[];
  nutrition: NutritionInfo | null;
  rawText: string;
  confidence: number;
  notes?: string;
  error?: string;
  suggestion?: string;
}

export default function IngredientScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(
    new Set(),
  );
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
        [{ resize: { width: 1024 } }],
        {
          compress: 0.7,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        },
      );

      const response = await fetch(
        new URL("/api/ingredients/scan", getApiUrl()).toString(),
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

      const result: ScanResult = await response.json();

      if (result.error) {
        Alert.alert("Scan Failed", result.error, [
          { text: "Try Again", onPress: () => {} },
        ]);
        setScanResult(null);
      } else if (!result.ingredients || result.ingredients.length === 0) {
        Alert.alert(
          "No Ingredients Found",
          result.suggestion ||
            "The label could not be read clearly. Try taking a closer photo of the ingredient list.",
          [{ text: "Try Again", onPress: () => {} }],
        );
        setScanResult(null);
      } else {
        setScanResult(result);
        const allIndices = new Set(result.ingredients.map((_, index) => index));
        setSelectedIngredients(allIndices);

        if (Platform.OS !== "web") {
          await Haptics.notificationAsync(
            Haptics.NotificationFeedbackType.Success,
          );
        }
      }
    } catch (error) {
      console.error("Scan error:", error);
      Alert.alert(
        "Error",
        "Failed to scan ingredient label. Please try again.",
      );
    } finally {
      setIsCapturing(false);
      setIsProcessing(false);
    }
  };

  const toggleIngredient = (index: number) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleAddSelected = async () => {
    if (!scanResult || selectedIngredients.size === 0) return;

    const selectedItems = scanResult.ingredients.filter((_, index) =>
      selectedIngredients.has(index),
    );

    const today = new Date();
    const defaultExpiry = new Date(today);
    defaultExpiry.setDate(defaultExpiry.getDate() + 14);

    for (const ingredient of selectedItems) {
      const newItem = {
        id: generateId(),
        name: ingredient.simplifiedName || ingredient.name,
        category: ingredient.category || "other",
        quantity: 1,
        unit: "item",
        expirationDate: defaultExpiry.toISOString().split("T")[0],
        storageLocation: ingredient.storageLocation || "pantry",
        nutrition: scanResult.nutrition
          ? {
              calories: scanResult.nutrition.calories || 0,
              protein: scanResult.nutrition.protein || 0,
              carbs: scanResult.nutrition.carbs || 0,
              fat: scanResult.nutrition.fat || 0,
              fiber: scanResult.nutrition.fiber || 0,
              sugar: scanResult.nutrition.sugar || 0,
              sodium: scanResult.nutrition.sodium || 0,
            }
          : undefined,
        addedDate: new Date().toISOString(),
      };

      await storage.addInventoryItem(newItem as any);
    }

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    Alert.alert(
      "Items Added",
      `Added ${selectedItems.length} item${selectedItems.length > 1 ? "s" : ""} to your inventory.`,
      [
        {
          text: "Done",
          onPress: () => navigation.goBack(),
        },
        {
          text: "Scan More",
          onPress: () => {
            setScanResult(null);
            setSelectedIngredients(new Set());
          },
        },
      ],
    );
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleRetake = () => {
    setScanResult(null);
    setSelectedIngredients(new Set());
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
            ingredient labels.
          </ThemedText>
          {Platform.OS !== "web" ? (
            <GlassButton
              onPress={async () => {
                try {
                  await Linking.openSettings();
                } catch (error) {
                  console.log("Could not open settings");
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
          We need access to your camera to scan ingredient labels from food
          packaging.
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

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
      >
        <Feather name="smartphone" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Use Expo Go
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          Ingredient scanning works best on your mobile device. Scan the QR code
          to open in Expo Go.
        </ThemedText>
        <GlassButton
          variant="ghost"
          onPress={handleClose}
          style={styles.cancelButton}
        >
          Go Back
        </GlassButton>
      </View>
    );
  }

  if (scanResult && !scanResult.error) {
    return (
      <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.resultsHeader}>
          <Pressable onPress={handleRetake} style={styles.headerButton}>
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h3">Scan Results</ThemedText>
          <Pressable onPress={handleClose} style={styles.headerButton}>
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.resultsScroll}
          contentContainerStyle={[
            styles.resultsContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
        >
          {scanResult.productName ? (
            <GlassCard style={styles.productCard}>
              <ThemedText type="h4">{scanResult.productName}</ThemedText>
              {scanResult.nutrition ? (
                <View style={styles.nutritionRow}>
                  <ThemedText type="small" style={styles.nutritionText}>
                    {scanResult.nutrition.calories} cal
                  </ThemedText>
                  {scanResult.nutrition.protein ? (
                    <ThemedText type="small" style={styles.nutritionText}>
                      {scanResult.nutrition.protein}g protein
                    </ThemedText>
                  ) : null}
                </View>
              ) : null}
            </GlassCard>
          ) : null}

          <ThemedText type="h4" style={styles.sectionTitle}>
            Ingredients Found ({scanResult.ingredients.length})
          </ThemedText>
          <ThemedText type="caption" style={styles.sectionHint}>
            Tap to select items to add to your inventory
          </ThemedText>

          {scanResult.ingredients.map((ingredient, index) => (
            <Pressable
              key={index}
              onPress={() => toggleIngredient(index)}
              style={[
                styles.ingredientItem,
                {
                  backgroundColor: selectedIngredients.has(index)
                    ? AppColors.primary + "20"
                    : theme.backgroundDefault,
                  borderColor: selectedIngredients.has(index)
                    ? AppColors.primary
                    : theme.glass.border,
                },
              ]}
            >
              <View style={styles.ingredientCheckbox}>
                {selectedIngredients.has(index) ? (
                  <Feather
                    name="check-circle"
                    size={24}
                    color={AppColors.primary}
                  />
                ) : (
                  <Feather
                    name="circle"
                    size={24}
                    color={theme.textSecondary}
                  />
                )}
              </View>
              <View style={styles.ingredientInfo}>
                <ThemedText type="body" numberOfLines={1}>
                  {ingredient.simplifiedName || ingredient.name}
                </ThemedText>
                <ThemedText type="caption" style={styles.ingredientMeta}>
                  {ingredient.category} • {ingredient.storageLocation}
                </ThemedText>
              </View>
            </Pressable>
          ))}

          {scanResult.notes ? (
            <GlassCard style={styles.notesCard}>
              <ThemedText type="caption">{scanResult.notes}</ThemedText>
            </GlassCard>
          ) : null}
        </ScrollView>

        <View
          style={[
            styles.resultsFooter,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <GlassButton
            onPress={handleAddSelected}
            disabled={selectedIngredients.size === 0}
            style={styles.addButton}
          >
            Add {selectedIngredients.size} Item
            {selectedIngredients.size !== 1 ? "s" : ""} to Inventory
          </GlassButton>
        </View>
      </ThemedView>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: "#000" }]}>
      {isCameraActive && (
        <CameraView ref={cameraRef} style={styles.camera} facing="back">
          <View style={[styles.overlay, { paddingTop: insets.top }]}>
            <View style={styles.header}>
              <Pressable onPress={handleClose} style={styles.closeButton}>
                <Feather name="x" size={28} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.scanFrame}>
              <View style={styles.scanGuide}>
                <View style={[styles.corner, styles.topLeft]} />
                <View style={[styles.corner, styles.topRight]} />
                <View style={[styles.corner, styles.bottomLeft]} />
                <View style={[styles.corner, styles.bottomRight]} />
              </View>
            </View>

            <View style={styles.instructions}>
              <ThemedText type="body" style={styles.instructionText}>
                Position the ingredient label within the frame
              </ThemedText>
            </View>

            <View
              style={[
                styles.controls,
                { paddingBottom: insets.bottom + Spacing.xl },
              ]}
            >
              {isProcessing ? (
                <View style={styles.processingContainer}>
                  <ActivityIndicator size="large" color="#FFFFFF" />
                  <ThemedText type="body" style={styles.processingText}>
                    Scanning label...
                  </ThemedText>
                </View>
              ) : (
                <Pressable
                  onPress={handleCapture}
                  disabled={isCapturing}
                  style={[
                    styles.captureButton,
                    isCapturing && styles.captureButtonDisabled,
                  ]}
                >
                  <View style={styles.captureButtonInner} />
                </Pressable>
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
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.xl,
  },
  camera: {
    flex: 1,
    zIndex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.3)",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    padding: Spacing.lg,
    zIndex: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.5)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  scanFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  scanGuide: {
    width: 280,
    height: 200,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: "#FFFFFF",
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
    borderTopLeftRadius: 12,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
    borderTopRightRadius: 12,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
    borderBottomLeftRadius: 12,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
    borderBottomRightRadius: 12,
  },
  instructions: {
    alignItems: "center",
    padding: Spacing.lg,
    zIndex: 10,
  },
  instructionText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  controls: {
    alignItems: "center",
    padding: Spacing.xl,
    zIndex: 10,
  },
  captureButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureButtonDisabled: {
    opacity: 0.5,
  },
  captureButtonInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
  },
  processingContainer: {
    alignItems: "center",
    gap: Spacing.md,
  },
  processingText: {
    color: "#FFFFFF",
  },
  permissionTitle: {
    marginTop: Spacing.xl,
    textAlign: "center",
  },
  permissionText: {
    marginTop: Spacing.md,
    textAlign: "center",
    opacity: 0.7,
  },
  permissionButton: {
    marginTop: Spacing.xl,
    minWidth: 200,
  },
  cancelButton: {
    marginTop: Spacing.md,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: Spacing.lg,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  productCard: {
    marginBottom: Spacing.sm,
  },
  nutritionRow: {
    flexDirection: "row",
    gap: Spacing.md,
    marginTop: Spacing.xs,
  },
  nutritionText: {
    opacity: 0.7,
  },
  sectionTitle: {
    marginTop: Spacing.sm,
  },
  sectionHint: {
    opacity: 0.6,
    marginBottom: Spacing.sm,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
  },
  ingredientCheckbox: {
    marginRight: Spacing.md,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientMeta: {
    opacity: 0.6,
    marginTop: 2,
  },
  notesCard: {
    marginTop: Spacing.md,
  },
  resultsFooter: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  addButton: {
    width: "100%",
  },
});
