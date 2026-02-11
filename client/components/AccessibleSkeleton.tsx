import { View } from "react-native";
import { Skeleton as MotiSkeleton } from "moti/skeleton";
import { useReducedMotion } from "react-native-reanimated";

interface SkeletonProps {
  colorMode: "light" | "dark";
  width: number;
  height: number;
  radius?: number;
}

export function Skeleton({ colorMode, width, height, radius = 0 }: SkeletonProps) {
  const reduceMotion = useReducedMotion();

  if (reduceMotion) {
    return (
      <View
        style={{
          width,
          height,
          borderRadius: radius,
          backgroundColor:
            colorMode === "dark"
              ? "rgba(255, 255, 255, 0.08)"
              : "rgba(0, 0, 0, 0.08)",
        }}
      />
    );
  }

  return (
    <MotiSkeleton
      colorMode={colorMode}
      width={width}
      height={height}
      radius={radius}
    />
  );
}
