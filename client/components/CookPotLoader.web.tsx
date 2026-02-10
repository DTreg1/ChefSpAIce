import { View, StyleSheet, Text } from "react-native";
import Svg, { Rect, Path, Circle, G } from "react-native-svg";
import { useTheme } from "@/hooks/useTheme";

export interface CookPotLoaderProps {
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  text?: string;
  textClassName?: string;
}

const sizeMap = {
  xs: { container: 48, svg: 48, fontSize: 10 },
  sm: { container: 64, svg: 64, fontSize: 12 },
  md: { container: 96, svg: 96, fontSize: 14 },
  lg: { container: 128, svg: 128, fontSize: 16 },
  xl: { container: 160, svg: 160, fontSize: 18 },
};

export function CookPotLoader({
  size = "md",
  text = "Prepping the Kitchen",
}: CookPotLoaderProps) {
  const { theme, isDark } = useTheme();
  const dimensions = sizeMap[size];

  const potFill = isDark
    ? "rgba(101, 163, 13, 0.2)"
    : "rgba(101, 163, 13, 0.15)";
  const potStroke = isDark ? "#84cc16" : "#65a30d";
  const lidFill = isDark ? "#a3e635" : "#84cc16";
  const steamFill = isDark
    ? "rgba(101, 163, 13, 0.4)"
    : "rgba(101, 163, 13, 0.3)";
  const bubbleFill = isDark
    ? "rgba(163, 230, 53, 0.7)"
    : "rgba(132, 204, 22, 0.7)";
  const textColor = theme.text;

  return (
    <View style={styles.container} accessibilityLiveRegion="polite" accessibilityLabel={text}>
      <View
        style={{ width: dimensions.container, height: dimensions.container }}
      >
        <Svg
          viewBox="0 0 100 100"
          width={dimensions.svg}
          height={dimensions.svg}
          style={{ overflow: "visible" }}
        >
          <Rect
            x="10"
            y="50"
            width="80"
            height="50"
            rx="10"
            fill={potFill}
            stroke={potStroke}
            strokeWidth="4"
          />
          <Path
            d="M15 70 L85 70"
            stroke="#507f45"
            strokeWidth="2"
            strokeOpacity="0.3"
            fill="none"
          />
          <Path
            d="M10 55 L90 55"
            stroke="#707070"
            strokeWidth="2"
            strokeOpacity="0.7"
            fill="none"
          />
          <Path
            d="M5 70 Q0 70 0 60 Q0 50 5 50"
            stroke={potStroke}
            strokeWidth="4"
            fill="none"
          />
          <Path
            d="M95 70 Q100 70 100 60 Q100 50 95 50"
            stroke={potStroke}
            strokeWidth="4"
            fill="none"
          />
          <Rect x="20" y="40" width="60" height="10" rx="5" fill={lidFill} />
          <Circle cx="50" cy="40" r="7" fill={lidFill} />
          <G>
            <Circle cx="30" cy="10" r="9" fill={steamFill} opacity={0.6} />
            <Circle cx="50" cy="3" r="11" fill={steamFill} opacity={0.6} />
            <Circle cx="70" cy="10" r="9" fill={steamFill} opacity={0.6} />
          </G>
          <G>
            <Circle cx="30" cy="70" r="4" fill={bubbleFill} />
            <Circle cx="50" cy="75" r="3" fill={bubbleFill} />
            <Circle cx="70" cy="65" r="5" fill={bubbleFill} />
          </G>
        </Svg>
      </View>

      <Text
        style={[
          styles.text,
          { color: textColor, fontSize: dimensions.fontSize },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    marginTop: 8,
    textAlign: "center",
  },
});

export default CookPotLoader;
