import { useWindowDimensions } from "react-native";

export function useDeviceType() {
  const { width, height } = useWindowDimensions();

  return {
    isPhone: width < 768,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
    screenWidth: width,
    isLandscape: width > height,
  };
}
