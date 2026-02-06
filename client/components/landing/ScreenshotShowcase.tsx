import { StyleSheet, View, Text, ScrollView, Platform } from "react-native";
import { useState } from "react";
import { DeviceMockup } from "./DeviceMockup";
import { showcaseScreenshots, getShowcaseImageUrl } from "@/data/landing-data";

const isWeb = Platform.OS === "web";

interface ScreenshotShowcaseProps {
  isWide: boolean;
}

export function ScreenshotShowcase({ isWide }: ScreenshotShowcaseProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (isWeb) {
    return (
      <View
        style={styles.showcaseSection}
        data-testid="section-screenshot-showcase"
      >
        <Text
          style={styles.showcaseTitle}
          data-testid="text-showcase-title"
        >
          See ChefSpAIce in Action
        </Text>
        <Text
          style={styles.showcaseSubtitle}
          data-testid="text-showcase-subtitle"
        >
          Experience the app that transforms your kitchen
        </Text>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "flex-start",
            padding: "20px 60px",
            perspective: "1200px",
            width: "100%",
          }}
        >
          {showcaseScreenshots.map((screenshot, index) => (
            <DeviceMockup
              key={index}
              imageUrl={getShowcaseImageUrl(
                screenshot.category,
                screenshot.filename,
              )}
              label={screenshot.label}
              description={screenshot.description}
              testId={screenshot.category}
              isWide={isWide}
              index={index}
              isHovered={hoveredIndex === index}
              hoveredIndex={hoveredIndex}
              onHover={setHoveredIndex}
              totalCount={showcaseScreenshots.length}
            />
          ))}
        </div>
        <Text style={styles.hoverHint} data-testid="text-hover-hint">
          Hover over a screen to explore
        </Text>
      </View>
    );
  }

  return (
    <View
      style={styles.showcaseSection}
      data-testid="section-screenshot-showcase"
    >
      <Text
        style={styles.showcaseTitle}
        data-testid="text-showcase-title"
      >
        See ChefSpAIce in Action
      </Text>
      <Text
        style={styles.showcaseSubtitle}
        data-testid="text-showcase-subtitle"
      >
        Experience the app that transforms your kitchen
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[
          styles.showcaseScrollContent,
          isWide && styles.showcaseScrollContentWide,
        ]}
        style={styles.showcaseScroll}
      >
        {showcaseScreenshots.map((screenshot, index) => (
          <DeviceMockup
            key={index}
            imageUrl={getShowcaseImageUrl(
              screenshot.category,
              screenshot.filename,
            )}
            label={screenshot.label}
            description={screenshot.description}
            testId={screenshot.category}
            isWide={isWide}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  showcaseSection: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    alignItems: "center",
  },
  showcaseTitle: {
    fontSize: 32,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.5)",
    textAlign: "center",
    marginBottom: 12,
  },
  showcaseSubtitle: {
    fontSize: 16,
    color: "rgba(255, 255, 255, 0.7)",
    textAlign: "center",
    marginBottom: 32,
    maxWidth: 500,
  },
  showcaseScroll: {
    width: "100%",
  },
  showcaseScrollContent: {
    paddingHorizontal: 16,
    gap: 24,
    justifyContent: "flex-start",
  },
  showcaseScrollContentWide: {
    justifyContent: "center",
    paddingHorizontal: 0,
  },
  hoverHint: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.4)",
    textAlign: "center",
    marginTop: 16,
    fontStyle: "italic",
  },
});
