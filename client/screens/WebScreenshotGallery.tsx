import { StyleSheet, View, Text, ScrollView, Image, useWindowDimensions, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/hooks/useTheme";

const screenshotFiles = [
  "05A74C26-45A7-4730-B737-FC913B2CA307_1_105_c.jpeg",
  "080CF3F6-1DB0-4108-BA61-8D810DC58889_1_105_c.jpeg",
  "09BE8ADF-C339-4558-9BED-FD2AA1BB3BBD_1_105_c.jpeg",
  "167E6531-84F6-4A23-B557-935189D470A8_1_105_c.jpeg",
  "16FB0231-C86A-4BA5-8D3F-FAA2147F01CB_1_105_c.jpeg",
  "1B0757DB-B517-4343-8EB8-0F31C9979E85_1_105_c.jpeg",
  "2C5D2FD8-9018-42D2-8672-FA64689D248C_1_105_c.jpeg",
  "338A0B62-F334-41D1-8AE9-F27252F582DC_1_105_c.jpeg",
  "44A97B44-A237-4795-8114-992BB2A74071_1_105_c.jpeg",
  "46F4C3AD-6C75-4423-9858-D93FB1551FBA_1_105_c.jpeg",
  "5AC51E75-C259-42B6-BD38-58A279F2ABC3_1_105_c.jpeg",
  "5D100C9F-4B0C-4C3B-A30D-ED80D0870FEF_1_105_c.jpeg",
  "5F4FAC3E-316B-4E51-8399-1D377B7B1360_1_105_c.jpeg",
  "6541917E-130B-4B02-B05B-E363732B0637_1_105_c.jpeg",
  "67B683FA-11A9-4FE7-8391-95984C82C7AF_1_105_c.jpeg",
  "690BBEC4-BC33-46AD-9D1C-4D5DAEC8693E_1_105_c.jpeg",
  "6E2E76E3-4F64-49C8-A45B-70EA2A07B79C_1_105_c.jpeg",
  "74FD0928-213C-4E10-8218-F73ABBAF2B66_1_105_c.jpeg",
  "74FF617B-7E78-404D-B03C-A77D5B525F32_1_105_c.jpeg",
  "85633BFE-AEE0-4C16-85F3-EB3E54BDCF22_1_105_c.jpeg",
  "9923E5F7-BDF1-4437-8DE5-2265D313F287_1_105_c.jpeg",
  "9C67C637-7D8C-417C-A88E-91312DA29B7C_1_105_c.jpeg",
  "A2E0AD86-AB65-44E3-8E9C-1FCFC3B15980_1_105_c.jpeg",
  "A62419D4-04EF-4627-9440-3E75E9748BE8_1_105_c.jpeg",
  "AC10B10C-C2DB-486D-ACBD-794C04904A2A_1_105_c.jpeg",
  "B01E9872-731B-4973-968A-69F8BABC1E11_1_105_c.jpeg",
  "B0FEA50E-ACE6-4A4B-9632-8C96301B405E_1_105_c.jpeg",
  "B1DD5F3A-BCFE-4861-9097-6313C695FE20_1_105_c.jpeg",
  "C780F8D0-728B-4925-A247-A9198B90CD57_1_105_c.jpeg",
  "CC2C8439-9204-4C46-941F-40B8DF01020A_1_105_c.jpeg",
];

interface WebScreenshotGalleryProps {
  onBack?: () => void;
}

export function WebScreenshotGallery({ onBack }: WebScreenshotGalleryProps) {
  const { width } = useWindowDimensions();
  const { isDark } = useTheme();
  
  const columns = width > 1200 ? 5 : width > 900 ? 4 : width > 600 ? 3 : 2;
  const imageWidth = (width - 48 - (columns - 1) * 16) / columns;
  const imageHeight = imageWidth * 2.16;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={isDark ? ["#0A1F0F", "#0F1419", "#0A0F14"] : ["#1A3D2A", "#1E4D35", "#0F2A1A"]}
        style={StyleSheet.absoluteFill}
      />
      
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {onBack && (
          <Pressable
            onPress={onBack}
            style={({ pressed }) => [styles.backButton, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.backButtonText}>← Back to Landing</Text>
          </Pressable>
        )}
        <Text style={styles.title}>Screenshot Gallery</Text>
        <Text style={styles.subtitle}>
          Copy the screenshots you want to use into the showcase folders:
        </Text>
        <Text style={styles.folders}>
          showcase/hero{"\n"}
          showcase/inventory{"\n"}
          showcase/recipes{"\n"}
          showcase/mealplan{"\n"}
          showcase/scanning
        </Text>
        
        <View style={[styles.grid, { gap: 16 }]}>
          {screenshotFiles.map((filename, index) => (
            <View key={index} style={[styles.imageContainer, { width: imageWidth }]}>
              <Image
                source={{ uri: `/attached_assets/screenshots/ios/iPhone/${filename}` }}
                style={[styles.image, { width: imageWidth, height: imageHeight }]}
                resizeMode="cover"
              />
              <View style={styles.labelContainer}>
                <Text style={styles.label}>#{index + 1}</Text>
                <Text style={styles.labelId}>{filename.split('-')[0]}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 24,
    paddingBottom: 100,
  },
  backButton: {
    marginBottom: 16,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    alignSelf: "flex-start",
  },
  backButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "500",
  },
  title: {
    fontSize: 32,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.7)",
    marginBottom: 8,
  },
  folders: {
    fontSize: 14,
    fontFamily: "monospace",
    color: "rgba(255,255,255,0.5)",
    marginBottom: 24,
    lineHeight: 22,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  imageContainer: {
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  image: {
    borderRadius: 12,
  },
  labelContainer: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  labelId: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 10,
    fontFamily: "monospace",
  },
});
