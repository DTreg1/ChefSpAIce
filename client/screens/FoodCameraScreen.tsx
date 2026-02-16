import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  Alert,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from "react-native";
import { logger } from "@/lib/logger";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import * as FileSystem from "expo-file-system/legacy";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { EmptyState } from "@/components/EmptyState";
import {
  ImageAnalysisResult,
  IdentifiedFood,
  AnalysisResult,
} from "@/components/ImageAnalysisResult";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { apiClient } from "@/lib/api-client";
import { RootStackParamList } from "@/navigation/RootStackNavigator";
import { storage, FoodItem, generateId } from "@/lib/storage";

type StorageLocationValue = "fridge" | "freezer" | "pantry" | "counter";

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
          <Feather name="cpu" size={48} color="#FFFFFF" />
        </View>

        <ThemedText type="h3" style={styles.analyzingTitle}>
          Analyzing Food
        </ThemedText>

        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.dot, dot1Style]} />
          <Animated.View style={[styles.dot, dot2Style]} />
          <Animated.View style={[styles.dot, dot3Style]} />
        </View>

        <ThemedText type="body" style={styles.analyzingSubtext}>
          AI is identifying items in your photo
        </ThemedText>

        <ThemedText type="caption" style={styles.estimatedTime}>
          Usually takes 3-5 seconds
        </ThemedText>
      </Animated.View>
    </Animated.View>
  );
}

export default function FoodCameraScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const queryClient = useQueryClient();
  const cameraRef = useRef<CameraView>(null);
  const [permission] = useCameraPermissions();
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("idle");
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isScreenFocused, setIsScreenFocused] = useState(true);

  // Handle navigation focus/blur - suspend camera when navigating away
  useFocusEffect(
    useCallback(() => {
      setIsScreenFocused(true);
      return () => setIsScreenFocused(false);
    }, []),
  );

  // Handle AppState changes - suspend camera when app goes to background
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

  // Update camera active state based on both screen focus and app state
  useEffect(() => {
    setIsCameraActive(isScreenFocused && AppState.currentState === "active");
  }, [isScreenFocused]);

  const analyzeImageMutation = useMutation({
    mutationFn: async (imageUri: string): Promise<AnalysisResult> => {
      const formData = new FormData();

      if (Platform.OS === "web") {
        const response = await fetch(imageUri);
        const blob = await response.blob();
        formData.append("image", blob, "photo.jpg");
      } else {
        const fileInfo = await FileSystem.getInfoAsync(imageUri);
        if (!fileInfo.exists) {
          throw new Error("Image file not found");
        }

        formData.append("image", {
          uri: imageUri,
          type: "image/jpeg",
          name: "photo.jpg",
        } as unknown as Blob);
      }

      return apiClient.postFormData<AnalysisResult>("/api/ai/analyze-food", formData);
    },
    onSuccess: (data) => {
      setScreenState("results");
      if (Platform.OS !== "web" && data.items && data.items.length > 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    onError: (error: Error) => {
      logger.error("Food analysis error:", error);
      setScreenState("preview");

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }

      Alert.alert(
        "Analysis Failed",
        error.message ||
          "Unable to analyze the image. Please try again or use manual entry.",
        [
          {
            text: "Try Again",
            onPress: () => {
              if (capturedImage) {
                setScreenState("analyzing");
                analyzeImageMutation.mutate(capturedImage);
              }
            },
          },
          {
            text: "Manual Entry",
            onPress: () => navigation.navigate("AddItem", {}),
          },
          { text: "OK", style: "cancel" },
        ],
      );
    },
  });

  const takePhoto = async () => {
    if (!cameraRef.current) return;

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (photo) {
        if (Platform.OS !== "web") {
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        setCapturedImage(photo.uri);
        setScreenState("preview");
      }
    } catch (error) {
      logger.error("Error taking photo:", error);
    }
  };

  const pickFromGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedImage(result.assets[0].uri);
        setScreenState("preview");
      }
    } catch (error) {
      logger.error("Error picking image:", error);
    }
  };

  const handleAnalyze = () => {
    if (capturedImage) {
      setScreenState("analyzing");
      analyzeImageMutation.mutate(capturedImage);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setScreenState("idle");
    analyzeImageMutation.reset();
  };

  const handleClose = () => {
    navigation.goBack();
  };

  const mapStorageLocation = (loc: string): StorageLocationValue => {
    const locationMap: Record<string, StorageLocationValue> = {
      refrigerator: "fridge",
      fridge: "fridge",
      freezer: "freezer",
      pantry: "pantry",
      counter: "counter",
    };
    return locationMap[loc?.toLowerCase()] || "fridge";
  };

  const handleConfirmItems = (
    items: IdentifiedFood[],
    goToSingleItem?: boolean,
  ) => {
    if (items.length === 0) return;

    if (items.length === 1 && goToSingleItem) {
      const item = items[0];
      navigation.navigate("AddItem", {
        productName: item.name,
        identifiedFoods: items,
      });
    } else {
      navigation.navigate("AddFoodBatch", {
        items,
      });
    }
  };

  const handleQuickAdd = async (items: IdentifiedFood[]) => {
    if (items.length === 0) return;

    try {
      const today = new Date().toISOString().split("T")[0];

      const foodItems: FoodItem[] = items.map((item) => {
        const expirationDate = new Date(
          Date.now() + (item.shelfLifeDays || 7) * 24 * 60 * 60 * 1000,
        )
          .toISOString()
          .split("T")[0];

        const category = item.category
          ? item.category.charAt(0).toUpperCase() +
            item.category.slice(1).toLowerCase()
          : "Other";

        return {
          id: generateId(),
          name: item.name || "Unknown Item",
          normalizedName: (item.name || "unknown item").toLowerCase(),
          category,
          quantity: item.quantity || 1,
          unit: item.quantityUnit || "pcs",
          storageLocation: mapStorageLocation(item.storageLocation),
          purchaseDate: today,
          expirationDate,
          dataCompleteness: 50,
        };
      });

      await storage.addInventoryItems(foodItems);

      queryClient.invalidateQueries({ queryKey: ["/api/inventory"] });

      if (Platform.OS !== "web") {
        await Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        );
      }

      navigation.goBack();
    } catch (error) {
      logger.error("Error quick adding items:", error);
    }
  };

  if (!permission) return <ActivityIndicator size="large" />;

  if (!permission.granted) {
    return (
      <EmptyState
        icon="camera-off"
        title="Camera Access Needed"
        description="ChefSpAIce needs camera access to scan items. You can enable this in your device settings."
        actionLabel="Open Settings"
        onAction={() => Linking.openSettings()}
      />
    );
  }

  if (Platform.OS === "web") {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="smartphone" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Use Expo Go
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          Food camera scanning works best on your mobile device. Scan the QR
          code to open in Expo Go.
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

  if (screenState === "results" && analyzeImageMutation.data && capturedImage) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.resultsHeader,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <Pressable
            style={styles.headerButton}
            onPress={handleRetake}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={24} color={theme.text} />
          </Pressable>
          <ThemedText type="h4">Analysis Results</ThemedText>
          <Pressable
            style={styles.headerButton}
            onPress={handleClose}
            accessibilityLabel="Close camera"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color={theme.text} />
          </Pressable>
        </View>

        <ImageAnalysisResult
          results={analyzeImageMutation.data}
          imageUri={capturedImage}
          onRetake={handleRetake}
          onConfirm={handleConfirmItems}
          onQuickAdd={handleQuickAdd}
          onScanMore={handleRetake}
        />
      </ThemedView>
    );
  }

  if (
    (screenState === "preview" || screenState === "analyzing") &&
    capturedImage
  ) {
    return (
      <View style={styles.container}>
        <View style={styles.previewContainer}>
          <Image
            source={{ uri: capturedImage }}
            style={styles.preview}
            contentFit="cover"
            accessibilityLabel="Captured food photo"
          />
          {screenState === "analyzing" ? <AnalyzingOverlay /> : null}
        </View>

        <View
          style={[
            styles.previewHeader,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <Pressable
            style={styles.headerButton}
            onPress={handleRetake}
            accessibilityLabel="Retake photo"
            accessibilityRole="button"
          >
            <Feather name="arrow-left" size={24} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h4" style={styles.previewHeaderTitle}>
            Review Photo
          </ThemedText>
          <Pressable
            style={styles.headerButton}
            onPress={handleClose}
            accessibilityLabel="Close camera"
            accessibilityRole="button"
          >
            <Feather name="x" size={24} color="#FFFFFF" />
          </Pressable>
        </View>

        <View
          style={[
            styles.previewControls,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <GlassButton
            variant="ghost"
            onPress={handleRetake}
            disabled={screenState === "analyzing"}
            style={styles.previewRetakeButton}
          >
            Retake
          </GlassButton>
          <GlassButton
            onPress={handleAnalyze}
            disabled={screenState === "analyzing"}
            loading={screenState === "analyzing"}
            style={styles.previewAnalyzeButton}
          >
            Analyze Food
          </GlassButton>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isCameraActive && (
        <CameraView
          ref={cameraRef}
          style={[StyleSheet.absoluteFill, styles.cameraView]}
          facing="back"
        >
          <View style={[styles.cameraOverlay, { paddingTop: insets.top }]}>
            <View style={styles.cameraHeader}>
              <View style={styles.headerPlaceholder} />
              <ThemedText type="h4" style={styles.cameraHeaderTitle}>
                Scan Food
              </ThemedText>
              <Pressable
                style={styles.headerButton}
                onPress={handleClose}
                accessibilityLabel="Close camera"
                accessibilityRole="button"
              >
                <Feather name="x" size={28} color="#FFFFFF" />
              </Pressable>
            </View>

            <View style={styles.frameContainer}>
              <View style={styles.frameGuide}>
                <View style={styles.frameCorner} />
                <View style={[styles.frameCorner, styles.topRight]} />
                <View style={[styles.frameCorner, styles.bottomLeft]} />
                <View style={[styles.frameCorner, styles.bottomRight]} />
              </View>
            </View>

            <View style={styles.hintContainer}>
              <ThemedText type="body" style={styles.hintText}>
                Position food items within the frame
              </ThemedText>
            </View>
          </View>
        </CameraView>
      )}

      <View
        style={[styles.controls, { paddingBottom: insets.bottom + Spacing.xl }]}
      >
        <Pressable
          style={styles.galleryButton}
          onPress={pickFromGallery}
          accessibilityLabel="Pick from gallery"
          accessibilityRole="button"
        >
          <Feather name="image" size={24} color="#FFFFFF" />
        </Pressable>

        <Pressable style={styles.captureButton} onPress={takePhoto} accessibilityRole="button" accessibilityLabel="Take photo">
          <View style={styles.captureInner} />
        </Pressable>

        <Pressable
          style={styles.closeButtonControl}
          onPress={handleClose}
          accessibilityLabel="Close camera"
          accessibilityRole="button"
        >
          <Feather name="x" size={24} color="#FFFFFF" />
        </Pressable>
      </View>
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
    paddingHorizontal: Spacing.xl,
  },
  cameraView: {
    zIndex: 1,
  },
  previewContainer: {
    flex: 1,
  },
  preview: {
    flex: 1,
  },
  previewHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 10,
  },
  previewHeaderTitle: {
    color: "#FFFFFF",
  },
  previewControls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    zIndex: 10,
  },
  previewRetakeButton: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  previewAnalyzeButton: {
    flex: 2,
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 20,
  },
  analyzingContent: {
    alignItems: "center",
    padding: Spacing.xl,
  },
  analyzingIconContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
  },
  analyzingTitle: {
    color: "#FFFFFF",
    marginBottom: Spacing.md,
  },
  dotsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: BorderRadius.full,
    backgroundColor: AppColors.primary,
  },
  analyzingSubtext: {
    color: "rgba(255, 255, 255, 0.8)",
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  estimatedTime: {
    color: "rgba(255, 255, 255, 0.5)",
  },
  cameraOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
    zIndex: 10,
  },
  cameraHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  cameraHeaderTitle: {
    color: "#FFFFFF",
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  headerPlaceholder: {
    width: 44,
  },
  frameContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  frameGuide: {
    width: "80%",
    aspectRatio: 1,
    position: "relative",
  },
  frameCorner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: AppColors.primary,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: 0,
    left: 0,
    borderTopLeftRadius: BorderRadius.md,
  },
  topRight: {
    left: undefined,
    right: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: BorderRadius.md,
  },
  bottomLeft: {
    top: undefined,
    bottom: 0,
    borderTopWidth: 0,
    borderBottomWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: BorderRadius.md,
  },
  bottomRight: {
    top: undefined,
    left: undefined,
    right: 0,
    bottom: 0,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: BorderRadius.md,
  },
  hintContainer: {
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing["2xl"],
    alignItems: "center",
  },
  hintText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  controls: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.xl,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    zIndex: 10,
  },
  galleryButton: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#FFFFFF",
  },
  captureInner: {
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: "#FFFFFF",
  },
  closeButtonControl: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
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
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  resultsContent: {
    flex: 1,
  },
  resultsContentContainer: {
    paddingHorizontal: Spacing.lg,
  },
  resultsThumbnail: {
    width: "100%",
    height: 200,
    borderRadius: BorderRadius.lg,
    marginBottom: Spacing.lg,
  },
  itemsCount: {
    marginBottom: Spacing.md,
    opacity: 0.7,
  },
  itemCard: {
    flexDirection: "row",
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  itemCardSelected: {
    borderColor: AppColors.primary,
    borderWidth: 2,
  },
  itemCheckbox: {
    marginRight: Spacing.md,
    justifyContent: "center",
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
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.xs,
  },
  itemName: {
    flex: 1,
  },
  confidenceBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    marginLeft: Spacing.sm,
  },
  confidenceDot: {
    width: 6,
    height: 6,
    borderRadius: BorderRadius.full,
    marginRight: Spacing.xs,
  },
  itemDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginRight: Spacing.sm,
  },
  itemMeta: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    marginHorizontal: Spacing.sm,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing["3xl"],
  },
  emptyStateTitle: {
    marginTop: Spacing.lg,
    textAlign: "center",
  },
  emptyStateText: {
    marginTop: Spacing.sm,
    textAlign: "center",
    opacity: 0.7,
    paddingHorizontal: Spacing.xl,
  },
  retakeButton: {
    marginTop: Spacing.xl,
  },
  resultsFooter: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    gap: Spacing.sm,
  },
  addButton: {
    width: "100%",
  },
});
