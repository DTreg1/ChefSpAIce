import Svg, { Path } from "react-native-svg";

export function ReplitLogo({
  size = 24,
  color = "rgba(255,255,255,0.5)",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 50 50">
      <Path
        d="M40 32H27V19h13c1.657 0 3 1.343 3 3v7C43 30.657 41.657 32 40 32zM14 6h10c1.657 0 3 1.343 3 3v10H14c-1.657 0-3-1.343-3-3V9C11 7.343 12.343 6 14 6zM14 45h10c1.657 0 3-1.343 3-3V32H14c-1.657 0-3 1.343-3 3v7C11 43.657 12.343 45 14 45z"
        fill={color}
      />
    </Svg>
  );
}
