import { StyleSheet, View, Platform, ViewStyle } from "react-native";

const isWeb = Platform.OS === "web";

interface PhoneFrameProps {
  frameWidth: number;
  imageUrl: string;
  imageAlt: string;
  style?: ViewStyle;
  enhancedShadow?: boolean;
}

export function PhoneFrame({
  frameWidth,
  imageUrl,
  imageAlt,
  style,
  enhancedShadow,
}: PhoneFrameProps) {
  const frameHeight = frameWidth * 2.16;
  const screenWidth = frameWidth - (enhancedShadow ? 14 : 12);
  const screenHeight = frameHeight - (enhancedShadow ? 28 : 24);
  const notchWidth = frameWidth * 0.35;
  const notchHeight = enhancedShadow ? 24 : 22;
  const borderRadius = frameWidth * 0.15;
  const screenBorderRadius = borderRadius - 4;
  const homeWidth = enhancedShadow ? 120 : 100;
  const homeHeight = enhancedShadow ? 5 : 4;
  const homeBottom = enhancedShadow ? 10 : 8;

  return (
    <View
      style={[
        enhancedShadow ? styles.phoneFrameEnhanced : styles.phoneFrame,
        {
          width: frameWidth,
          height: frameHeight,
          borderRadius,
        },
        style,
      ]}
    >
      <View
        style={[
          styles.notch,
          {
            width: notchWidth,
            height: notchHeight,
            borderBottomLeftRadius: notchHeight / 2,
            borderBottomRightRadius: notchHeight / 2,
          },
        ]}
      />
      <View
        style={[
          styles.screen,
          {
            width: screenWidth,
            height: screenHeight,
            borderRadius: screenBorderRadius,
          },
        ]}
      >
        {isWeb ? (
          <img
            src={imageUrl}
            alt={imageAlt}
            style={{
              width: screenWidth,
              height: screenHeight,
              objectFit: "cover",
              borderRadius: screenBorderRadius,
            }}
          />
        ) : (
          <View
            style={{
              width: screenWidth,
              height: screenHeight,
              backgroundColor: "#1a1a1a",
            }}
          />
        )}
      </View>
      <View
        style={[
          styles.homeIndicator,
          {
            bottom: homeBottom,
            width: homeWidth,
            height: homeHeight,
            borderRadius: homeHeight / 2,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  phoneFrame: {
    backgroundColor: "#1a1a1a",
    borderWidth: 3,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web"
      ? {
          boxShadow:
            "0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.1)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 12 },
          shadowOpacity: 0.5,
          shadowRadius: 25,
          elevation: 25,
        }),
  },
  phoneFrameEnhanced: {
    backgroundColor: "#1a1a1a",
    borderWidth: 3,
    borderColor: "#2a2a2a",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    ...(Platform.OS === "web"
      ? {
          boxShadow:
            "0 30px 60px -15px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1), 0 0 80px rgba(39, 174, 96, 0.15)",
        }
      : {
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 15 },
          shadowOpacity: 0.6,
          shadowRadius: 30,
          elevation: 30,
        }),
  },
  notch: {
    backgroundColor: "#1a1a1a",
    position: "absolute",
    top: 0,
    zIndex: 10,
  },
  screen: {
    overflow: "hidden",
    backgroundColor: "#0a0a0a",
  },
  homeIndicator: {
    position: "absolute",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
});
