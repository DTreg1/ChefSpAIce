import { useState, useEffect } from "react";
import { useWindowDimensions, Dimensions } from "react-native";

export function useDeviceType() {
  const { width, height } = useWindowDimensions();
  const [isLandscape, setIsLandscape] = useState(width > height);

  useEffect(() => {
    const subscription = Dimensions.addEventListener("change", ({ window }) => {
      setIsLandscape(window.width > window.height);
    });
    return () => subscription.remove();
  }, []);

  return {
    isPhone: width < 768,
    isTablet: width >= 768,
    isLargeTablet: width >= 1024,
    screenWidth: width,
    isLandscape,
  };
}
