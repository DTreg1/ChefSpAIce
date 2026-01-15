import { StyleSheet, View, Text, ScrollView, useWindowDimensions, Pressable, Platform } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

const showcaseCategories = {
  hero: {
    title: "Hero",
    description: "Main app showcase",
    files: ["EB0F64E2-5BB7-4CB9-9C62-3AABEAF61B38_1_105_c.jpeg"],
  },
  inventory: {
    title: "Inventory",
    description: "Pantry & storage management",
    files: ["338A0B62-F334-41D1-8AE9-F27252F582DC_1_105_c.jpeg"],
  },
  recipes: {
    title: "Recipes",
    description: "AI recipe generation",
    files: [
      "85633BFE-AEE0-4C16-85F3-EB3E54BDCF22_1_105_c.jpeg",
      "AC10B10C-C2DB-486D-ACBD-794C04904A2A_1_105_c.jpeg",
    ],
  },
  mealplan: {
    title: "Meal Plan",
    description: "Weekly meal planning",
    files: ["9923E5F7-BDF1-4437-8DE5-2265D313F287_1_105_c.jpeg"],
  },
  scanning: {
    title: "Scanning",
    description: "Camera & barcode scanning",
    files: ["B1DD5F3A-BCFE-4861-9097-6313C695FE20_1_105_c.jpeg"],
  },
};

interface WebScreenshotGalleryProps {
  onBack?: () => void;
}

function getBaseUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin;
  }
  return '';
}

export function WebScreenshotGallery({ onBack }: WebScreenshotGalleryProps) {
  const { width } = useWindowDimensions();
  const baseUrl = getBaseUrl();
  
  const columns = width > 1200 ? 5 : width > 900 ? 4 : width > 600 ? 3 : 2;
  const imageWidth = (width - 48 - (columns - 1) * 16) / columns;
  const imageHeight = imageWidth * 2.16;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#1A3D2A", "#1E4D35", "#0F2A1A"]}
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
        <Text style={styles.title}>Screenshot Showcase</Text>
        <Text style={styles.subtitle}>
          Organized screenshots for the landing page device mockups
        </Text>
        
        {Object.entries(showcaseCategories).map(([category, data]) => (
          <View key={category} style={styles.categorySection}>
            <Text style={styles.categoryTitle}>{data.title}</Text>
            <Text style={styles.categoryDescription}>{data.description}</Text>
            <View style={[styles.grid, { gap: 16 }]}>
              {data.files.map((filename, index) => (
                <View key={index} style={[styles.imageContainer, { width: imageWidth }]}>
                  <img
                    src={`${baseUrl}/api/showcase/${category}/${filename}`}
                    alt={`${data.title} screenshot ${index + 1}`}
                    style={{
                      width: imageWidth,
                      height: imageHeight,
                      objectFit: 'cover',
                      borderRadius: 12,
                    }}
                  />
                  <View style={styles.labelContainer}>
                    <Text style={styles.label}>{data.title} #{index + 1}</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ))}
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
    marginBottom: 24,
  },
  categorySection: {
    marginBottom: 32,
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  categoryDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
    marginBottom: 16,
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
