import React, { useEffect, useMemo } from "react";
import { StyleSheet, View, Dimensions } from "react-native";
import Svg, {
  Path,
  Defs,
  LinearGradient,
  Stop,
  RadialGradient,
  G,
  Circle,
  Ellipse,
  ClipPath,
} from "react-native-svg";
import { LinearGradient as ExpoLinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withTiming,
  withDelay,
  Easing,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse);
const AnimatedView = Animated.View;

interface WaterDropletProps {
  cx: number;
  cy: number;
  size: number;
  delay: number;
}

function WaterDroplet({ cx, cy, size, delay }: WaterDropletProps) {
  const shimmer = useSharedValue(0);

  useEffect(() => {
    shimmer.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, shimmer]);

  const animatedProps = useAnimatedProps(() => {
    const opacity = interpolate(shimmer.value, [0, 0.5, 1], [0.6, 0.9, 0.6]);
    return {
      opacity,
    };
  });

  return (
    <G>
      <Defs>
        <RadialGradient id={`droplet-grad-${cx}-${cy}`} cx="30%" cy="30%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
          <Stop offset="40%" stopColor="#ffffff" stopOpacity="0.6" />
          <Stop offset="70%" stopColor="rgba(200, 230, 255, 0.4)" />
          <Stop offset="100%" stopColor="rgba(180, 220, 255, 0.2)" />
        </RadialGradient>
      </Defs>
      <AnimatedEllipse
        cx={cx}
        cy={cy}
        rx={size}
        ry={size * 1.2}
        fill={`url(#droplet-grad-${cx}-${cy})`}
        animatedProps={animatedProps}
      />
      <Circle
        cx={cx - size * 0.3}
        cy={cy - size * 0.4}
        r={size * 0.25}
        fill="#ffffff"
        opacity={0.9}
      />
    </G>
  );
}

interface BubbleProps {
  cx: number;
  cy: number;
  r: number;
  delay: number;
}

function Bubble({ cx, cy, r, delay }: BubbleProps) {
  const float = useSharedValue(0);
  const pulse = useSharedValue(0);

  useEffect(() => {
    float.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, {
          duration: 4000 + Math.random() * 2000,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      ),
    );
    pulse.value = withDelay(
      delay + 500,
      withRepeat(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, float, pulse]);

  const animatedProps = useAnimatedProps(() => {
    const translateY = interpolate(float.value, [0, 1], [0, -8]);
    const scale = interpolate(pulse.value, [0, 1], [1, 1.1]);
    const opacity = interpolate(pulse.value, [0, 0.5, 1], [0.3, 0.5, 0.3]);
    return {
      cy: cy + translateY,
      r: r * scale,
      opacity,
    };
  });

  return (
    <G>
      <Defs>
        <RadialGradient id={`bubble-grad-${cx}-${cy}`} cx="35%" cy="35%">
          <Stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
          <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.2" />
          <Stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
        </RadialGradient>
      </Defs>
      <AnimatedCircle
        cx={cx}
        fill={`url(#bubble-grad-${cx}-${cy})`}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={0.5}
        animatedProps={animatedProps}
      />
    </G>
  );
}

interface SparkleProps {
  cx: number;
  cy: number;
  size: number;
  delay: number;
}

function Sparkle({ cx, cy, size, delay }: SparkleProps) {
  const twinkle = useSharedValue(0);

  useEffect(() => {
    twinkle.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.ease) }),
        -1,
        true,
      ),
    );
  }, [delay, twinkle]);

  const animatedProps = useAnimatedProps(() => {
    const scale = interpolate(twinkle.value, [0, 0.5, 1], [0.3, 1, 0.3]);
    const opacity = interpolate(twinkle.value, [0, 0.5, 1], [0.2, 1, 0.2]);
    return {
      r: size * scale,
      opacity,
    };
  });

  return (
    <G>
      <AnimatedCircle
        cx={cx}
        cy={cy}
        fill="#ffffff"
        animatedProps={animatedProps}
      />
      <Path
        d={`M${cx},${cy - size * 2} L${cx},${cy + size * 2} M${cx - size * 2},${cy} L${cx + size * 2},${cy}`}
        stroke="rgba(255, 255, 255, 0.6)"
        strokeWidth={0.8}
        opacity={0.7}
      />
    </G>
  );
}

interface GlassLeafProps {
  width?: number;
  height?: number;
}

export function GlassLeaf({
  width = SCREEN_WIDTH,
  height = SCREEN_HEIGHT,
}: GlassLeafProps) {
  const glowPulse = useSharedValue(0);

  useEffect(() => {
    glowPulse.value = withRepeat(
      withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true,
    );
  }, [glowPulse]);

  const glowStyle = useAnimatedStyle(() => {
    const opacity = interpolate(glowPulse.value, [0, 0.5, 1], [0.3, 0.6, 0.3]);
    return {
      opacity,
    };
  });

  const droplets = useMemo(
    () => [
      { cx: 180, cy: 280, size: 6, delay: 0 },
      { cx: 220, cy: 350, size: 4, delay: 300 },
      { cx: 160, cy: 400, size: 5, delay: 600 },
      { cx: 200, cy: 450, size: 3.5, delay: 900 },
      { cx: 175, cy: 320, size: 4.5, delay: 1200 },
      { cx: 210, cy: 380, size: 3, delay: 1500 },
    ],
    [],
  );

  const bubbles = useMemo(
    () => [
      { cx: 120, cy: 250, r: 8, delay: 0 },
      { cx: 280, cy: 320, r: 6, delay: 500 },
      { cx: 100, cy: 400, r: 10, delay: 1000 },
      { cx: 290, cy: 450, r: 7, delay: 1500 },
      { cx: 85, cy: 300, r: 5, delay: 2000 },
      { cx: 310, cy: 380, r: 9, delay: 2500 },
      { cx: 70, cy: 480, r: 6, delay: 3000 },
      { cx: 320, cy: 280, r: 4, delay: 3500 },
    ],
    [],
  );

  const sparkles = useMemo(
    () => [
      { cx: 195, cy: 270, size: 2.5, delay: 0 },
      { cx: 170, cy: 340, size: 2, delay: 400 },
      { cx: 220, cy: 400, size: 3, delay: 800 },
      { cx: 185, cy: 470, size: 2, delay: 1200 },
      { cx: 205, cy: 310, size: 2.5, delay: 1600 },
      { cx: 150, cy: 430, size: 1.8, delay: 2000 },
    ],
    [],
  );

  const leafPath = `
    M 195 180
    C 140 220, 100 300, 120 420
    C 130 500, 170 560, 195 590
    C 220 560, 260 500, 270 420
    C 290 300, 250 220, 195 180
    Z
  `;

  const mainVeinPath = `
    M 195 200
    Q 195 350, 195 580
  `;

  const sideVeins = [
    "M 195 260 Q 160 280, 130 320",
    "M 195 260 Q 230 280, 260 320",
    "M 195 320 Q 155 345, 125 390",
    "M 195 320 Q 235 345, 265 390",
    "M 195 380 Q 160 405, 135 450",
    "M 195 380 Q 230 405, 255 450",
    "M 195 440 Q 168 460, 150 495",
    "M 195 440 Q 222 460, 240 495",
    "M 195 500 Q 175 515, 165 540",
    "M 195 500 Q 215 515, 225 540",
  ];

  return (
    <View style={[styles.container, { width, height }]}>
      <ExpoLinearGradient
        colors={["#1a2e05", "#4a6b2a", "#8ba870", "#c5d4b8", "#fafaf9"]}
        locations={[0, 0.25, 0.5, 0.75, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <AnimatedView style={[styles.glowContainer, glowStyle]}>
        <View style={styles.glow} />
      </AnimatedView>

      <Svg
        width={width}
        height={height}
        viewBox="0 0 390 700"
        style={styles.svg}
      >
        <Defs>
          <LinearGradient id="leafGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.35)" />
            <Stop offset="30%" stopColor="rgba(200, 240, 200, 0.25)" />
            <Stop offset="60%" stopColor="rgba(180, 230, 180, 0.2)" />
            <Stop offset="100%" stopColor="rgba(150, 220, 150, 0.15)" />
          </LinearGradient>

          <LinearGradient id="leafShine" x1="0%" y1="0%" x2="50%" y2="100%">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.5)" />
            <Stop offset="50%" stopColor="rgba(255, 255, 255, 0.1)" />
            <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </LinearGradient>

          <LinearGradient id="leafEdge" x1="0%" y1="0%" x2="100%" y2="0%">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.6)" />
            <Stop offset="50%" stopColor="rgba(255, 255, 255, 0.2)" />
            <Stop offset="100%" stopColor="rgba(255, 255, 255, 0.6)" />
          </LinearGradient>

          <RadialGradient id="innerGlow" cx="40%" cy="30%">
            <Stop offset="0%" stopColor="rgba(255, 255, 255, 0.4)" />
            <Stop offset="60%" stopColor="rgba(255, 255, 255, 0.1)" />
            <Stop offset="100%" stopColor="rgba(255, 255, 255, 0)" />
          </RadialGradient>

          <ClipPath id="leafClip">
            <Path d={leafPath} />
          </ClipPath>
        </Defs>

        <G>
          <Path
            d={leafPath}
            fill="rgba(0, 50, 0, 0.15)"
            transform="translate(5, 8)"
          />
        </G>

        <G>
          <Path
            d={leafPath}
            fill="url(#leafGradient)"
            stroke="url(#leafEdge)"
            strokeWidth={1.5}
          />

          <Path d={leafPath} fill="url(#innerGlow)" />

          <Path
            d={`
              M 195 190
              C 155 220, 130 280, 140 360
              C 145 400, 160 430, 180 450
              Q 170 400, 165 340
              Q 160 280, 195 220
              Z
            `}
            fill="url(#leafShine)"
            opacity={0.6}
          />
        </G>

        <G clipPath="url(#leafClip)">
          <Path
            d={mainVeinPath}
            stroke="rgba(255, 255, 255, 0.5)"
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
          />

          <Path
            d={mainVeinPath}
            stroke="rgba(255, 255, 255, 0.25)"
            strokeWidth={4}
            fill="none"
            strokeLinecap="round"
          />

          {sideVeins.map((d, index) => (
            <G key={index}>
              <Path
                d={d}
                stroke="rgba(255, 255, 255, 0.35)"
                strokeWidth={1.2}
                fill="none"
                strokeLinecap="round"
              />
              <Path
                d={d}
                stroke="rgba(255, 255, 255, 0.15)"
                strokeWidth={2.5}
                fill="none"
                strokeLinecap="round"
              />
            </G>
          ))}

          {droplets.map((droplet, index) => (
            <WaterDroplet key={`droplet-${index}`} {...droplet} />
          ))}
        </G>

        {bubbles.map((bubble, index) => (
          <Bubble key={`bubble-${index}`} {...bubble} />
        ))}

        {sparkles.map((sparkle, index) => (
          <Sparkle key={`sparkle-${index}`} {...sparkle} />
        ))}

        <Circle
          cx={160}
          cy={260}
          r={15}
          fill="rgba(255, 255, 255, 0.15)"
          opacity={0.5}
        />
        <Circle cx={155} cy={255} r={5} fill="rgba(255, 255, 255, 0.4)" />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  svg: {
    position: "absolute",
  },
  glowContainer: {
    position: "absolute",
    top: "25%",
    left: "20%",
    width: "60%",
    height: "50%",
  },
  glow: {
    flex: 1,
    borderRadius: 200,
    backgroundColor: "rgba(180, 255, 180, 0.15)",
    shadowColor: "#90EE90",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 60,
  },
});
