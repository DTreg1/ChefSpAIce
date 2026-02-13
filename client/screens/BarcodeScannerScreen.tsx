import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  AppState,
  AppStateStatus,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { GlassButton } from "@/components/GlassButton";
import { EmptyState } from "@/components/EmptyState";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { RootStackParamList } from "@/navigation/RootStackNavigator";

export default function BarcodeScannerScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [permission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
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

  const handleBarCodeScanned = async (result: BarcodeScanningResult) => {
    if (scanned) return;

    setScanned(true);

    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {}


    navigation.replace("AddItem", {
      barcode: result.data,
      productName: "",
    });
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (!permission) return <ActivityIndicator size="large" accessibilityLabel="Loading camera permissions" />;

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
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: theme.backgroundRoot },
        ]}
        accessibilityRole="text"
      >
        <Feather name="smartphone" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Use Expo Go
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          Barcode scanning works best on your mobile device. Scan the QR code to
          open in Expo Go.
        </ThemedText>
        <GlassButton
          variant="ghost"
          onPress={handleClose}
          style={styles.cancelButton}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          Go Back
        </GlassButton>
      </View>
    );
  }

  return (
    <View style={styles.container} accessibilityLabel="Barcode scanner camera view">
      {isCameraActive && (
        <CameraView
          style={[StyleSheet.absoluteFill, styles.cameraView]}
          facing="back"
          barcodeScannerSettings={{
            barcodeTypes: [
              "ean13",
              "ean8",
              "upc_a",
              "upc_e",
              "code128",
              "code39",
            ],
          }}
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          accessibilityLabel="Camera viewfinder for barcode scanning"
        />
      )}

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose} accessibilityLabel="Close scanner" accessibilityRole="button">
            <Feather name="x" size={28} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h4" style={styles.headerTitle}>
            Scan Barcode
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.scanArea} accessibilityRole="image" accessibilityLabel="Barcode scanning frame. Position barcode within the frame">
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}
        >
          <ThemedText type="body" style={styles.footerText} accessibilityRole="text">
            Position the barcode within the frame
          </ThemedText>
          {scanned ? (
            <GlassButton
              onPress={() => setScanned(false)}
              style={styles.rescanButton}
              accessibilityRole="button"
              accessibilityLabel="Tap to scan again"
            >
              Tap to Scan Again
            </GlassButton>
          ) : null}
        </View>
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
    zIndex: 10,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  closeButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 11,
  },
  headerTitle: {
    color: "#FFFFFF",
  },
  placeholder: {
    width: 44,
  },
  scanArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  corner: {
    position: "absolute",
    width: 60,
    height: 60,
    borderColor: AppColors.primary,
    borderTopWidth: 4,
    borderLeftWidth: 4,
    top: "25%",
    left: "15%",
    borderTopLeftRadius: BorderRadius.sm,
  },
  topRight: {
    left: undefined,
    right: "15%",
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderTopLeftRadius: 0,
    borderTopRightRadius: BorderRadius.sm,
  },
  bottomLeft: {
    top: undefined,
    bottom: "25%",
    borderTopWidth: 0,
    borderBottomWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomLeftRadius: BorderRadius.sm,
  },
  bottomRight: {
    top: undefined,
    left: undefined,
    right: "15%",
    bottom: "25%",
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
    borderTopLeftRadius: 0,
    borderBottomRightRadius: BorderRadius.sm,
  },
  footer: {
    alignItems: "center",
    paddingHorizontal: Spacing.xl,
  },
  footerText: {
    color: "#FFFFFF",
    textAlign: "center",
  },
  rescanButton: {
    marginTop: Spacing.lg,
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
});
