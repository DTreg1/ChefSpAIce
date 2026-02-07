import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Platform,
  ScrollView,
} from "react-native";
import { logger } from "@/lib/logger";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import {
  CameraView,
  useCameraPermissions,
  BarcodeScanningResult,
} from "expo-camera";
import { Feather } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import * as Haptics from "expo-haptics";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassButton } from "@/components/GlassButton";
import { GlassCard } from "@/components/GlassCard";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { getApiUrl } from "@/lib/query-client";

interface BarcodeRawData {
  barcode: string;
  barcodeType: string;
  openFoodFacts: {
    found: boolean;
    raw: any;
  };
  usda: {
    found: boolean;
    raw: any;
  };
}

function RenderValue({ value, depth = 0 }: { value: any; depth?: number }) {
  const indent = depth * 12;

  if (value === null || value === undefined) {
    return (
      <ThemedText style={[styles.valueNull, { marginLeft: indent }]}>
        null
      </ThemedText>
    );
  }

  if (typeof value === "boolean") {
    return (
      <ThemedText
        style={[
          styles.valueBoolean,
          {
            marginLeft: indent,
            color: value ? AppColors.success : AppColors.error,
          },
        ]}
      >
        {value.toString()}
      </ThemedText>
    );
  }

  if (typeof value === "number") {
    return (
      <ThemedText
        style={[
          styles.valueNumber,
          { marginLeft: indent, color: AppColors.primary },
        ]}
      >
        {value}
      </ThemedText>
    );
  }

  if (typeof value === "string") {
    if (value.length > 200) {
      return (
        <ThemedText style={[styles.valueString, { marginLeft: indent }]}>
          "{value.substring(0, 200)}..." ({value.length} chars)
        </ThemedText>
      );
    }
    return (
      <ThemedText style={[styles.valueString, { marginLeft: indent }]}>
        "{value}"
      </ThemedText>
    );
  }

  if (Array.isArray(value)) {
    if (value.length === 0) {
      return (
        <ThemedText style={[styles.valueNull, { marginLeft: indent }]}>
          []
        </ThemedText>
      );
    }
    return (
      <View style={{ marginLeft: indent }}>
        <ThemedText style={styles.bracket}>[</ThemedText>
        {value.slice(0, 10).map((item, index) => (
          <View key={index} style={styles.arrayItem}>
            <ThemedText style={styles.arrayIndex}>[{index}]:</ThemedText>
            <RenderValue value={item} depth={depth + 1} />
          </View>
        ))}
        {value.length > 10 ? (
          <ThemedText style={[styles.valueNull, { marginLeft: 12 }]}>
            ... and {value.length - 10} more items
          </ThemedText>
        ) : null}
        <ThemedText style={styles.bracket}>]</ThemedText>
      </View>
    );
  }

  if (typeof value === "object") {
    const keys = Object.keys(value);
    if (keys.length === 0) {
      return (
        <ThemedText style={[styles.valueNull, { marginLeft: indent }]}>
          {"{}"}
        </ThemedText>
      );
    }
    return (
      <View style={{ marginLeft: indent }}>
        {keys.map((key) => (
          <View key={key} style={styles.objectProperty}>
            <ThemedText style={styles.propertyKey}>{key}:</ThemedText>
            <RenderValue value={value[key]} depth={depth + 1} />
          </View>
        ))}
      </View>
    );
  }

  return (
    <ThemedText style={{ marginLeft: indent }}>{String(value)}</ThemedText>
  );
}

function DataSection({
  title,
  found,
  data,
}: {
  title: string;
  found: boolean;
  data: any;
}) {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(true);

  return (
    <GlassCard style={styles.section}>
      <Pressable
        style={styles.sectionHeader}
        onPress={() => setExpanded(!expanded)}
      >
        <View style={styles.sectionTitleRow}>
          <Feather
            name={found ? "check-circle" : "x-circle"}
            size={20}
            color={found ? AppColors.success : AppColors.error}
          />
          <ThemedText type="h4" style={styles.sectionTitle}>
            {title}
          </ThemedText>
        </View>
        <Feather
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={theme.textSecondary}
        />
      </Pressable>
      {expanded ? (
        <View style={styles.sectionContent}>
          {found ? (
            <RenderValue value={data} />
          ) : (
            <ThemedText style={styles.notFound}>No data found</ThemedText>
          )}
        </View>
      ) : null}
    </GlassCard>
  );
}

export default function BarcodeTestScreen() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const [permission, requestPermission] = useCameraPermissions();
  const [scanning, setScanning] = useState(true);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<BarcodeRawData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBarCodeScanned = async (scanResult: BarcodeScanningResult) => {
    if (!scanning || loading) return;

    setScanning(false);
    setLoading(true);
    setError(null);

    if (Platform.OS !== "web") {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }

    try {
      const url = new URL("/api/barcode/raw", getApiUrl());
      url.searchParams.set("barcode", scanResult.data);

      const response = await fetch(url.toString());
      const rawJson = await response.json();

      if (!response.ok) {
        throw new Error(rawJson.error || "Failed to lookup barcode");
      }

      const data = rawJson.data;
      setResult({
        ...data,
        barcodeType: scanResult.type,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = () => {
    setResult(null);
    setError(null);
    setScanning(true);
  };

  const handleClose = () => {
    navigation.goBack();
  };

  if (!permission) {
    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <ThemedText>Loading camera permissions...</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    if (permission.status === "denied" && !permission.canAskAgain) {
      return (
        <ThemedView style={[styles.container, styles.centered]}>
          <Feather name="camera-off" size={64} color={theme.textSecondary} />
          <ThemedText type="h3" style={styles.permissionTitle}>
            Camera Access Required
          </ThemedText>
          <ThemedText type="body" style={styles.permissionText}>
            Please enable camera access in your device settings to scan
            barcodes.
          </ThemedText>
          {Platform.OS !== "web" ? (
            <GlassButton
              onPress={async () => {
                try {
                  await Linking.openSettings();
                } catch (err) {
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
        </ThemedView>
      );
    }

    return (
      <ThemedView style={[styles.container, styles.centered]}>
        <Feather name="camera" size={64} color={theme.textSecondary} />
        <ThemedText type="h3" style={styles.permissionTitle}>
          Camera Permission Needed
        </ThemedText>
        <ThemedText type="body" style={styles.permissionText}>
          We need access to your camera to scan barcodes for testing.
        </ThemedText>
        <GlassButton
          onPress={requestPermission}
          style={styles.permissionButton}
        >
          Enable Camera
        </GlassButton>
        <GlassButton
          variant="ghost"
          onPress={handleClose}
          style={styles.cancelButton}
        >
          Cancel
        </GlassButton>
      </ThemedView>
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
          Barcode scanning works best on your mobile device. Scan the QR code to
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

  if (result) {
    return (
      <ThemedView style={styles.container}>
        <View
          style={[
            styles.resultsHeader,
            { paddingTop: insets.top + Spacing.md },
          ]}
        >
          <ThemedText type="h3">Barcode Test Results</ThemedText>
          <GlassButton onPress={handleRescan}>Scan Another</GlassButton>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: insets.bottom + Spacing.xl },
          ]}
        >
          <GlassCard style={styles.section}>
            <ThemedText type="h4">Barcode Info</ThemedText>
            <View style={styles.barcodeInfo}>
              <ThemedText style={styles.label}>Code:</ThemedText>
              <ThemedText style={styles.barcodeValue}>
                {result.barcode}
              </ThemedText>
            </View>
            <View style={styles.barcodeInfo}>
              <ThemedText style={styles.label}>Type:</ThemedText>
              <ThemedText>{result.barcodeType}</ThemedText>
            </View>
          </GlassCard>

          <DataSection
            title="OpenFoodFacts"
            found={result.openFoodFacts.found}
            data={result.openFoodFacts.raw}
          />

          <DataSection
            title="USDA FoodData Central"
            found={result.usda.found}
            data={result.usda.raw}
          />
        </ScrollView>
      </ThemedView>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
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
        onBarcodeScanned={
          scanning && !loading ? handleBarCodeScanned : undefined
        }
      />

      <View style={[styles.overlay, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable style={styles.closeButton} onPress={handleClose}>
            <Feather name="x" size={28} color="#FFFFFF" />
          </Pressable>
          <ThemedText type="h4" style={styles.headerTitle}>
            Barcode Test Scanner
          </ThemedText>
          <View style={styles.placeholder} />
        </View>

        <View style={styles.scanArea}>
          <View style={styles.corner} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>

        <View
          style={[styles.footer, { paddingBottom: insets.bottom + Spacing.xl }]}
        >
          {loading ? (
            <ThemedText type="body" style={styles.footerText}>
              Looking up barcode...
            </ThemedText>
          ) : error ? (
            <>
              <ThemedText
                type="body"
                style={[styles.footerText, styles.errorText]}
              >
                {error}
              </ThemedText>
              <GlassButton onPress={handleRescan} style={styles.rescanButton}>
                Try Again
              </GlassButton>
            </>
          ) : (
            <ThemedText type="body" style={styles.footerText}>
              Position barcode within frame to scan
            </ThemedText>
          )}
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
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
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
  errorText: {
    color: AppColors.error,
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
  resultsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.md,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
  },
  section: {
    padding: Spacing.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  sectionTitle: {
    marginLeft: Spacing.xs,
  },
  sectionContent: {
    marginTop: Spacing.md,
  },
  notFound: {
    fontStyle: "italic",
    opacity: 0.6,
  },
  barcodeInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.sm,
    gap: Spacing.sm,
  },
  label: {
    fontWeight: "600",
  },
  barcodeValue: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize: 16,
  },
  objectProperty: {
    marginTop: Spacing.xs,
  },
  propertyKey: {
    fontWeight: "600",
    fontSize: 13,
  },
  arrayItem: {
    marginTop: Spacing.xs,
  },
  arrayIndex: {
    fontSize: 12,
    opacity: 0.6,
  },
  bracket: {
    fontSize: 12,
    opacity: 0.5,
  },
  valueNull: {
    fontStyle: "italic",
    opacity: 0.5,
    fontSize: 13,
  },
  valueBoolean: {
    fontWeight: "600",
    fontSize: 13,
  },
  valueNumber: {
    fontSize: 13,
  },
  valueString: {
    fontSize: 13,
  },
});
