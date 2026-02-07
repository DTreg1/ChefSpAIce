import { useWindowDimensions } from "react-native";

export function useDeviceType() {
  const { width } = useWindowDimensions();
  return {
    isPhone: width < 768,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
  };
}
