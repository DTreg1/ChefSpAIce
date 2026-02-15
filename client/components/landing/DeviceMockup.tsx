import { StyleSheet, View, Text, Platform } from "react-native";
import { PhoneFrame } from "./PhoneFrame";
import { getLandingColors } from "./landing-colors";
import { useTheme } from "@/hooks/useTheme";

const isWeb = Platform.OS === "web";

interface DeviceMockupProps {
  imageUrl: string;
  label: string;
  description: string;
  testId: string;
  isWide: boolean;
  index?: number;
  isHovered?: boolean;
  hoveredIndex?: number | null;
  onHover?: (index: number | null) => void;
  totalCount?: number;
}

export function DeviceMockup({
  imageUrl,
  label,
  description,
  testId,
  isWide,
  index = 0,
  isHovered = false,
  hoveredIndex = null,
  onHover,
  totalCount = 4,
}: DeviceMockupProps) {
  const { isDark } = useTheme();
  const lc = getLandingColors(isDark);
  const frameWidth = isWide ? 220 : 160;

  const centerIndex = (totalCount - 1) / 2;
  const offset = index - centerIndex;
  const anyHovered = hoveredIndex !== null;

  let transformX: number;
  let rotateY: number;
  let translateZ: number;
  let scale: number;

  if (isHovered) {
    transformX = 0;
    rotateY = 0;
    translateZ = 80;
    scale = 1.08;
  } else if (anyHovered && hoveredIndex !== null) {
    const distanceFromHovered = index - hoveredIndex;
    const spreadAmount = distanceFromHovered * 60;
    transformX = spreadAmount;
    rotateY = offset * 15;
    translateZ = -20;
    scale = 0.95;
  } else {
    transformX = offset * -30;
    rotateY = offset * 12;
    translateZ = 0;
    scale = 1;
  }

  const webWrapperStyle: React.CSSProperties = isWeb
    ? {
        perspective: "1000px",
        transformStyle: "preserve-3d",
        transition: "all 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)",
        transform: `rotateY(${rotateY}deg) translateX(${transformX}px) translateZ(${translateZ}px) scale(${scale})`,
        zIndex: isHovered ? 100 : 10 - Math.abs(offset),
        cursor: "pointer",
        marginLeft: index === 0 ? 0 : -40,
      }
    : {};

  const mockupContent = (
    <View
      style={styles.mockupContainer}
      data-testid={`device-mockup-${testId}`}
    >
      <PhoneFrame
        frameWidth={frameWidth}
        imageUrl={imageUrl}
        imageAlt={`${label} screenshot`}
      />
      <Text
        style={[
          styles.mockupLabel,
          { color: lc.textPrimary, opacity: isHovered || !isWeb ? 1 : 0.7 },
        ]}
        data-testid={`text-mockup-label-${testId}`}
      >
        {label}
      </Text>
      <Text
        style={[
          styles.mockupDescription,
          { color: lc.textMuted, opacity: isHovered || !isWeb ? 1 : 0.5 },
        ]}
        data-testid={`text-mockup-desc-${testId}`}
      >
        {description}
      </Text>
    </View>
  );

  if (isWeb && onHover) {
    return (
      <div
        style={webWrapperStyle}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
      >
        {mockupContent}
      </div>
    );
  }

  return mockupContent;
}

const styles = StyleSheet.create({
  mockupContainer: {
    alignItems: "center",
    gap: 12,
  },
  mockupLabel: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 4,
  },
  mockupDescription: {
    fontSize: 13,
    textAlign: "center",
  },
});
