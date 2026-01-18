import { useMemo } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import { useTheme } from "@/hooks/useTheme";
import { LinearGradient } from "expo-linear-gradient";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const LIME_950 = "#1a2e05";
const LIME_900 = "#3d6b1c";

interface BubbleConfig {
  id: number;
  size: number;
  startX: number;
  delay: number;
  duration: number;
  opacity: number;
  wobbleAmount: number;
}

interface AnimatedBackgroundProps {
  bubbleCount?: number;
}

export function AnimatedBackground({
  bubbleCount = 15,
}: AnimatedBackgroundProps) {
  const { isDark } = useTheme();

  const baseColor = isDark ? LIME_950 : LIME_900;
  const highlightColor = isDark ? LIME_900 : "#4a7a25";

  const bubbles = useMemo(() => {
    const configs: BubbleConfig[] = [];
    for (let i = 0; i < bubbleCount; i++) {
      configs.push({
        id: i,
        size: Math.random() * 15 + 8,
        startX: Math.random() * SCREEN_WIDTH,
        delay: Math.random() * 8000,
        duration: Math.random() * 6000 + 8000,
        opacity: Math.random() * 0.3 + 0.1,
        wobbleAmount: Math.random() * 30 + 10,
      });
    }
    return configs;
  }, [bubbleCount]);

  return (
    <View style={[styles.container, { backgroundColor: baseColor }]}>
      <LinearGradient
        colors={[highlightColor, "transparent"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      <style>
        {`
          @keyframes floatUp {
            0% {
              transform: translateY(${SCREEN_HEIGHT + 50}px) scale(0.3);
              opacity: 0;
            }
            10% {
              opacity: var(--bubble-opacity);
              transform: translateY(${SCREEN_HEIGHT * 0.9}px) scale(1);
            }
            80% {
              opacity: var(--bubble-opacity);
              transform: translateY(${SCREEN_HEIGHT * 0.2}px) scale(1);
            }
            100% {
              transform: translateY(-50px) scale(0.5);
              opacity: 0;
            }
          }
          @keyframes wobble {
            0%, 100% {
              margin-left: calc(var(--wobble-amount) * -1);
            }
            50% {
              margin-left: var(--wobble-amount);
            }
          }
          .bubble {
            position: absolute;
            background-color: rgba(255, 255, 255, 0.15);
            border: 1px solid rgba(255, 255, 255, 0.25);
            border-radius: 50%;
            opacity: 0;
            transform: translateY(${SCREEN_HEIGHT + 50}px);
            animation: floatUp var(--duration) linear infinite, wobble calc(var(--duration) * 0.3) ease-in-out infinite;
            animation-delay: var(--delay);
            animation-fill-mode: backwards;
          }
        `}
      </style>
      {bubbles.map((config) => (
        <div
          key={config.id}
          className="bubble"
          style={{
            width: config.size,
            height: config.size,
            left: config.startX,
            "--duration": `${config.duration}ms`,
            "--delay": `${config.delay}ms`,
            "--bubble-opacity": config.opacity,
            "--wobble-amount": `${config.wobbleAmount}px`,
          } as React.CSSProperties}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    overflow: "hidden",
    pointerEvents: "none",
  },
  gradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
