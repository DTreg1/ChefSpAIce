import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  ScrollView,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
  FadeIn,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";
import { useMutation } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { IdentifiedFood } from "@/components/ImageAnalysisResult";
import { logger } from "@/lib/logger";

export interface ReceiptItem {
  name: string;
  category: string;
  quantity: number;
  quantityUnit: string;
  storageLocation: string;
  shelfLifeDays: number;
  confidence: number;
  price?: number;
  upc?: string;
  originalText?: string;
}

export interface ReceiptAnalysisResult {
  items: ReceiptItem[];
  storeName?: string;
  purchaseDate?: string;
  totalAmount?: number;
  notes?: string;
  error?: string;
}

type ScreenState = "idle" | "preview" | "analyzing" | "results";

function AnalyzingOverlay() {
  const dotScale1 = useSharedValue(1);
  const dotScale2 = useSharedValue(1);
  const dotScale3 = useSharedValue(1);
  const pulseScale = useSharedValue(1);

  useEffect(() => {
    pulseScale.value = withRepeat(
      withSequence(
        withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      true,
    );

    dotScale1.value = withRepeat(
      withSequence(
        withTiming(1.4, { duration: 300 }),
        withTiming(1, { duration: 300 }),
        withTiming(1, { duration: 600 }),
      ),
      -1,
    );

    const timeout1 = setTimeout(() => {
      dotScale2.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
      );
    }, 200);

    const timeout2 = setTimeout(() => {
      dotScale3.value = withRepeat(
        withSequence(
          withTiming(1.4, { duration: 300 }),
          withTiming(1, { duration: 300 }),
          withTiming(1, { duration: 600 }),
        ),
        -1,
      );
    }, 400);

    return () => {
      clearTimeout(timeout1);
      clearTimeout(timeout2);
    };
  }, [dotScale1, dotScale2, dotScale3, pulseScale]);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale1.value }],
  }));
  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale2.value }],
  }));
  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dotScale3.value }],
  }));
  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      style={styles.analyzingOverlay}
    >
      <Animated.View style={[styles.analyzingContent, containerStyle]}>
        <View style={styles.analyzingIconContainer}>
          <Feather name="file-text" size={48} color="#FFFFFF" />
        </View>

        <ThemedText type="h3" style={styles.analyzingTitle}>
          Analyzing Receipt
        </ThemedText>

        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>

        <ThemedText type="body" style={styles.analyzingSubtext}>
          AI is extracting grocery items
        </ThemedText>

        <ThemedText type="caption" style={styles.estimatedTime}>
          Usually takes 5-10 seconds
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

function ReceiptResultsView({
  result,
  capturedImage,
  onAddToInventory,
  onRetake,
  isLoading,
}: {
  result: ReceiptAnalysisResult;
  capturedImage: string;
  onAddToInventory: () => void;
  onRetake: () => void;
  isLoading: boolean;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.resultsContainer}>
      <View
        style={[styles.resultsHeader, { paddingTop: insets.top + Spacing.md }]}
      >
        <Pressable
          onPress={onRetake}
          style={styles.retakeButton}
          accessibilityLabel="Retake photo"
          accessibilityRole="button"
          data-testid="button-retake"
        >
          <Feather name="arrow-left" size={24} color={theme.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <ThemedText type="h3">Receipt Items</ThemedText>
          {result.storeName && (
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {result.storeName}{" "}
              {result.purchaseDate ? `• ${result.purchaseDate}` : ""}
            </ThemedText>
          )}
        </View>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.resultsScroll}
        contentContainerStyle={styles.resultsContent}
        showsVerticalScrollIndicator={false}
      >
        {result.error ? (
          <View style={styles.errorContainer}>
            <Feather
              name="alert-circle"
              size={48}
              color={theme.textSecondary}
            />
            <ThemedText
              type="body"
              style={[styles.errorText, { color: theme.textSecondary }]}
            >
              {result.error}
            </ThemedText>
            <GlassButton onPress={onRetake} style={styles.retryButton}>
              Try Another Receipt
            </GlassButton>
          </View>
        ) : result.items.length === 0 ? (
          <EmptyState
            icon="shopping-bag"
            title="No Items Found"
            description="No food items were detected on this receipt."
            actionLabel="Try Another Receipt"
            onAction={onRetake}
          />
        ) : (
          <>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <View style={styles.summaryItem}>
                  <Feather name="package" size={20} color={AppColors.primary} />
                  <ThemedText type="h4" style={styles.summaryValue}>
                    {result.items.length}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: theme.textSecondary }}
                  >
                    Items
                  </ThemedText>
                </View>
                {result.totalAmount && (
                  <View style={styles.summaryItem}>
                    <Feather
                      name="dollar-sign"
                      size={20}
                      color={AppColors.success}
                    />
                    <ThemedText type="h4" style={styles.summaryValue}>
                      ${result.totalAmount.toFixed(2)}
                    </ThemedText>
                    <ThemedText
                      type="caption"
                      style={{ color: theme.textSecondary }}
                    >
                      Total
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>

            {result.items.map((item, index) => (
              <View
                key={index}
                style={[
                  styles.itemCard,
                  { backgroundColor: theme.surface, borderColor: theme.border },
                ]}
                data-testid={`receipt-item-${index}`}
              >
                <View style={styles.itemHeader}>
                  <ThemedText
                    type="body"
                    style={styles.itemName}
                    numberOfLines={2}
                  >
                    {item.name}
                  </ThemedText>
                  {item.price && (
                    <ThemedText type="body" style={styles.itemPrice}>
                      ${item.price.toFixed(2)}
                    </ThemedText>
                  )}
                </View>
                <View style={styles.itemMeta}>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <ThemedText type="caption">
                      {item.quantity} {item.quantityUnit}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather name="box" size={12} color={theme.textSecondary} />
                    <ThemedText type="caption" style={{ marginLeft: 4 }}>
                      {item.storageLocation}
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.badge,
                      { backgroundColor: theme.backgroundSecondary },
                    ]}
                  >
                    <Feather
                      name="clock"
                      size={12}
                      color={theme.textSecondary}
                    />
                    <ThemedText type="caption" style={{ marginLeft: 4 }}>
                      {item.shelfLifeDays}d
                    </ThemedText>
                  </View>
                </View>
                {item.originalText && (
                  <ThemedText
                    type="small"
                    style={{
                      color: theme.textSecondary,
                      marginTop: Spacing.xs,
                    }}
                  >
                    Receipt: {item.originalText}
                  </ThemedText>
                )}
              </View>
            ))}

            {result.notes && (
              <View
                style={[
                  styles.notesCard,
                  { backgroundColor: theme.backgroundSecondary },
                ]}
              >
                <Feather name="info" size={16} color={theme.textSecondary} />
                <ThemedText
                  type="caption"
                  style={{
                    color: theme.textSecondary,
                    marginLeft: Spacing.sm,
                    flex: 1,
                  }}
                >
                  {result.notes}
                </ThemedText>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {result.items.length > 0 && (
        <View
          style={[
            styles.resultsFooter,
            { paddingBottom: insets.bottom + Spacing.md },
          ]}
        >
          <GlassButton
            onPress={onAddToInventory}
            loading={isLoading}
            style={styles.addButton}
            data-testid="button-add-to-inventory"
          >
            Add {result.items.length} Items to Inventory
          </GlassButton>
        </View>
      )}
    </ThemedView>
  );
}

export default function ReceiptScanScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [analysisResult, setAnalysisResult] =
    useState<ReceiptAnalysisResult | null>(null);

  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      setIsCameraActive(nextAppState === "active" && isScreenFocused);
    };

    const subscription = AppState.addEventListener(
      "change",
      handleAppStateChange,
    );
    return () => subscription.remove();
  }, [isScreenFocused]);

  useEffect(() => {
    setIsCameraActive(isScreenFocused && AppState.currentState === "active");
  }, [isScreenFocused]);

  const analyzeReceiptMutation = useMutation({
    mutationFn: async (imageUri: string) => {
      const baseUrl = getApiUrl();
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append("image", blob, "receipt.jpg");
      } else {
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
          encoding: FileSystem.EncodingType.Base64,
        });

        const byteString = atob(base64);
        const arrayBuffer = new ArrayBuffer(byteString.length);
        const uint8Array = new Uint8Array(arrayBuffer);
        for (let i = 0; i < byteString.length; i++) {
          uint8Array[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([uint8Array], { type: "image/jpeg" });
        formData.append("image", blob, "receipt.jpg");
      }

      const response = await fetch(`${baseUrl}/api/receipt/analyze-receipt`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || "Failed to analyze receipt");
      }

      return (await response.json()).data as ReceiptAnalysisResult;
    },
    onSuccess: (data) => {
      setAnalysisResult(data);
      setScreenState("results");
      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error) => {
      logger.error("[ReceiptScan] Analysis error:", error);
      Alert.alert(
        "Analysis Failed",
        error instanceof Error
          ? error.message
          : "Could not analyze the receipt. Please try again.",
        [{ text: "OK", onPress: () => setScreenState("preview") }],
      );
    },
  });

  const handleCapture = async () => {
    if (!cameraRef.current) return;

    try {
      if (Platform.OS !== "web") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }

      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        skipProcessing: false,
      });

      if (photo?.uri) {
        setCapturedImage(photo.uri);
        setScreenState("preview");
      }
    } catch (error) {
      logger.error("[ReceiptScan] Capture error:", error);
      Alert.alert("Error", "Failed to capture photo. Please try again.");
    }
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.9,
        allowsEditing: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setCapturedImage(result.assets[0].uri);
        setScreenState("preview");
      }
    } catch (error) {
      logger.error("[ReceiptScan] Pick image error:", error);
      Alert.alert("Error", "Failed to select image. Please try again.");
    }
  };

  const handleAnalyze = () => {
    if (!capturedImage) return;
    setScreenState("analyzing");
    analyzeReceiptMutation.mutate(capturedImage);
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setAnalysisResult(null);
    setScreenState("idle");
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const handleAddToInventory = () => {
    if (!analysisResult || analysisResult.items.length === 0) return;

    const identifiedFoods: IdentifiedFood[] = analysisResult.items.map(
      (item) => ({
        name: item.name,
        category: item.category,
        quantity: item.quantity,
        quantityUnit: item.quantityUnit,
        storageLocation: item.storageLocation,
        shelfLifeDays: item.shelfLifeDays,
        confidence: item.confidence,
      }),
    );

    navigation.replace("AddFoodBatch", { items: identifiedFoods });
  };

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="smartphone" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Use Expo Go
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          Receipt scanning works best on your mobile device. Scan the QR code to
          open in Expo Go.
        </ThemedText>
        <GlassButton
          variant="ghost"
          onPress={handleClose}
          style={styles.cancelButton}
        >
          Go Back
        </GlassButton>
      </ThemedView>
    );
  }

  if (screenState === "results" && analysisResult && capturedImage) {
    return (
      <ReceiptResultsView
        result={analysisResult}
        capturedImage={capturedImage}
        onAddToInventory={handleAddToInventory}
        onRetake={handleRetake}
        isLoading={false}
      />
    );
  }

  if (!permission) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="loader" size={48} color={theme.textSecondary} />
        <ThemedText type="body" style={styles.permissionText}>
          Checking camera permissions...
        </ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="camera-off" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Access Required
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          To scan receipts, we need access to your camera.
        </ThemedText>
        {permission.canAskAgain ? (
          <GlassButton
            onPress={requestPermission}
            style={styles.permissionButton}
          >
            Continue
          </GlassButton>
        ) : (
          <GlassButton
            onPress={() => Linking.openSettings()}
            style={styles.permissionButton}
          >
            Open Settings
          </GlassButton>
        )}
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      {screenState === "idle" && (
        <>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing="back"
            active={isCameraActive}
          />

          <View style={styles.overlay}>
            <View
              style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
            >
              <Pressable
                onPress={handleClose}
                style={styles.closeButton}
                accessibilityLabel="Close scanner"
                accessibilityRole="button"
                data-testid="button-close"
              >
                <Feather name="x" size={28} color="#FFFFFF" />
              </Pressable>
              <ThemedText type="h3" style={styles.headerTitle}>
                Scan Receipt
              </ThemedText>
              <View style={styles.headerRight} />
            </View>

            <View style={styles.scanFrame}>
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
            </View>

            <View style={styles.instructions}>
              <ThemedText type="body" style={styles.instructionText}>
                Position the receipt within the frame
              </ThemedText>
              <ThemedText type="caption" style={styles.instructionSubtext}>
                Make sure text is clear and readable
              </ThemedText>
            </View>

            <View
              style={[
                styles.controls,
                { paddingBottom: insets.bottom + Spacing.lg },
              ]}
            >
              <Pressable
                onPress={handlePickImage}
                style={styles.controlButton}
                data-testid="button-gallery"
                accessibilityRole="button"
                accessibilityLabel="Pick image from gallery"
              >
                <View style={styles.controlButtonInner}>
                  <Feather name="image" size={24} color="#FFFFFF" />
                </View>
                <ThemedText type="caption" style={styles.controlLabel}>
                  Gallery
                </ThemedText>
              </Pressable>

              <Pressable
                onPress={handleCapture}
                style={styles.captureButton}
                data-testid="button-capture"
                accessibilityRole="button"
                accessibilityLabel="Capture receipt photo"
              >
                <View style={styles.captureButtonOuter}>
                  <View style={styles.captureButtonInner} />
                </View>
              </Pressable>

              <View style={styles.controlButton}>
                <View style={[styles.controlButtonInner, { opacity: 0 }]} />
              </View>
            </View>
          </View>
        </>
      )}

      {screenState === "preview" && capturedImage && (
        <View style={StyleSheet.absoluteFill}>
          <Image
            source={{ uri: capturedImage }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            accessibilityLabel="Captured receipt photo"
          />
          <View style={styles.previewOverlay}>
            <View
              style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}
            >
              <Pressable
                onPress={handleRetake}
                style={styles.closeButton}
                accessibilityLabel="Retake photo"
                accessibilityRole="button"
                data-testid="button-retake-preview"
              >
                <Feather name="arrow-left" size={28} color="#FFFFFF" />
              </Pressable>
              <ThemedText type="h3" style={styles.headerTitle}>
                Preview
              </ThemedText>
              <View style={styles.headerRight} />
            </View>

            <View
              style={[
                styles.previewControls,
                { paddingBottom: insets.bottom + Spacing.lg },
              ]}
            >
              <GlassButton
                variant="ghost"
                onPress={handleRetake}
                style={styles.previewButton}
              >
                Retake
              </GlassButton>
              <GlassButton
                onPress={handleAnalyze}
                style={styles.previewButton}
                data-testid="button-analyze"
              >
                Analyze Receipt
              </GlassButton>
            </View>
          </View>
        </View>
      )}

      {screenState === "analyzing" && <AnalyzingOverlay />}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
    padding: Spacing.xl,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  headerRight: {
    width: 44,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  scanFrame: {
    flex: 1,
    marginHorizontal: Spacing.xl,
    marginVertical: Spacing.lg,
    position: "relative",
  },
  corner: {
    position: "absolute",
    width: 40,
    height: 40,
    borderColor: AppColors.primary,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    borderTopLeftRadius: BorderRadius.md,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderTopWidth: 4,
    borderRightWidth: 4,
    borderTopRightRadius: BorderRadius.md,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 4,
    borderLeftWidth: 4,
    borderBottomLeftRadius: BorderRadius.md,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: BorderRadius.md,
  },
  instructions: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  instructionText: {
    color: "#FFFFFF",
    textAlign: "center",
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  instructionSubtext: {
    color: "rgba(255,255,255,0.7)",
    textAlign: "center",
    marginTop: Spacing.xs,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  controlButton: {
    alignItems: "center",
    width: 70,
  },
  controlButtonInner: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  controlLabel: {
    color: "#FFFFFF",
    marginTop: Spacing.xs,
  },
  captureButton: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureButtonOuter: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 4,
    borderColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF",
  },
  previewOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "space-between",
  },
  previewControls: {
    flexDirection: "row",
    gap: Spacing.md,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
  },
  previewButton: {
    flex: 1,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingContent: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  analyzingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: AppColors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  analyzingTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: AppColors.primary,
  },
  analyzingSubtext: {
    color: "rgba(255,255,255,0.8)",
    textAlign: "center",
  },
  estimatedTime: {
    color: "rgba(255,255,255,0.5)",
    marginTop: Spacing.sm,
  },
  permissionTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  permissionText: {
    textAlign: "center",
    marginTop: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  permissionButton: {
    marginBottom: Spacing.md,
    minWidth: 200,
  },
  cancelButton: {
    minWidth: 200,
  },
  resultsContainer: {
    flex: 1,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  retakeButton: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsScroll: {
    flex: 1,
  },
  resultsContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  summaryCard: {
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    gap: Spacing.xs,
  },
  summaryValue: {
    marginTop: Spacing.xs,
  },
  itemCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  itemName: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  itemPrice: {
    fontWeight: "600",
  },
  itemMeta: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.xs,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  notesCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
  },
  errorContainer: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
  },
  errorText: {
    textAlign: "center",
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  retryButton: {
    minWidth: 200,
  },
  resultsFooter: {
    padding: Spacing.lg,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  addButton: {
    width: "100%",
  },
});

export { IdentifiedFood };
