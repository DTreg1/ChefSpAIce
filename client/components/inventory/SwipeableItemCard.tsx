import React from "react";
import { View, StyleSheet, Pressable, Platform, ActionSheetIOS, Alert } from "react-native";
import { Feather } from "@expo/vector-icons";
import Animated, {
  FadeIn,
  FadeOut,
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  interpolate,
  Extrapolation,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import { GlassView } from "@/components/GlassViewWithContext";

import { ThemedText } from "@/components/ThemedText";
import { NutritionBadge } from "@/components/NutritionBadge";
import { NutritionScoreBadge } from "@/components/NutritionScoreBadge";
import { Spacing, BorderRadius } from "@/constants/theme";
import {
  FoodItem,
  getExpirationStatus,
  getDaysUntilExpiration,
  formatDate,
} from "@/lib/storage";

const SWIPE_THRESHOLD = 20;
const ACTION_WIDTH = 80;

interface SwipeableItemCardProps {
  item: FoodItem;
  onConsumed: (item: FoodItem) => void;
  onWasted: (item: FoodItem) => void;
  onPress: (itemId: string) => void;
  theme: any;
  showHint?: boolean;
}

export function SwipeableItemCard({
  item,
  onConsumed,
  onWasted,
  onPress,
  theme,
  showHint,
}: SwipeableItemCardProps) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  React.useEffect(() => {
    if (showHint) {
      translateX.value = withDelay(
        600,
        withSequence(
          withTiming(-60, { duration: 500 }),
          withDelay(700, withTiming(0, { duration: 500 }))
        )
      );
    }
  }, [showHint]);

  const status = getExpirationStatus(item.expirationDate);
  const daysLeft = getDaysUntilExpiration(item.expirationDate);

  const getBadgeColor = () => {
    const mutedColors = {
      success: "#6B8E6B",
      warning: "#C4956A",
      error: "#B57D7D",
    };

    switch (status) {
      case "expired":
        return mutedColors.error;
      case "expiring":
        return mutedColors.warning;
      default:
        return mutedColors.success;
    }
  };

  const getBadgeText = () => {
    if (status === "expired") return "Expired";
    if (daysLeft === 0) return "Today";
    if (daysLeft === 1) return "Tomorrow";
    return `${daysLeft} days`;
  };

  const handleConsumed = () => {
    translateX.value = withSpring(0);
    onConsumed(item);
  };

  const handleWasted = () => {
    translateX.value = withSpring(0);
    onWasted(item);
  };

  const handleLongPress = () => {
    if (Platform.OS === "ios") {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ["Mark Consumed", "Delete", "Cancel"],
          destructiveButtonIndex: 1,
          cancelButtonIndex: 2,
        },
        (buttonIndex) => {
          if (buttonIndex === 0) handleConsumed();
          if (buttonIndex === 1) handleWasted();
        },
      );
    } else {
      Alert.alert(item.name, "Choose an action", [
        { text: "Mark Consumed", onPress: handleConsumed },
        { text: "Delete", onPress: handleWasted, style: "destructive" },
        { text: "Cancel", style: "cancel" },
      ]);
    }
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      const newValue = startX.value + event.translationX;
      translateX.value = Math.max(
        -ACTION_WIDTH,
        Math.min(ACTION_WIDTH, newValue),
      );
    })
    .onEnd((event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        translateX.value = withSpring(ACTION_WIDTH);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withSpring(-ACTION_WIDTH);
      } else {
        translateX.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const consumedActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [0, ACTION_WIDTH],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [0, ACTION_WIDTH / 2, ACTION_WIDTH],
          [0.5, 0.8, 1],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  const wastedActionStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      translateX.value,
      [-ACTION_WIDTH, 0],
      [1, 0],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        scale: interpolate(
          translateX.value,
          [-ACTION_WIDTH, -ACTION_WIDTH / 2, 0],
          [1, 0.8, 0.5],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Animated.View
      entering={FadeIn}
      exiting={FadeOut}
      style={styles.swipeContainer}
      {...(Platform.OS === "web" ? { accessibilityRole: "listitem" as any } : {})}
      accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, expires ${formatDate(item.expirationDate)}`}
    >
      <Pressable
        style={styles.consumedAction}
        onPress={handleConsumed}
        testID={`button-consumed-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${item.name} as consumed`}
      >
        <LinearGradient
          colors={["rgba(46, 204, 113, 0.25)", "transparent"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.actionGradient}
        >
          <Animated.View
            style={[styles.actionButtonInner, consumedActionStyle]}
          >
            <Feather name="check-circle" size={22} color="#FFFFFF" />
            <ThemedText type="caption" style={styles.actionText}>
              Consumed
            </ThemedText>
          </Animated.View>
        </LinearGradient>
      </Pressable>

      <Pressable
        style={styles.wastedAction}
        onPress={handleWasted}
        testID={`button-wasted-${item.id}`}
        accessibilityRole="button"
        accessibilityLabel={`Mark ${item.name} as wasted`}
      >
        <LinearGradient
          colors={["transparent", "rgba(231, 76, 60, 0.25)"]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.actionGradient}
        >
          <Animated.View
            style={[styles.actionButtonInner, wastedActionStyle]}
          >
            <Feather name="trash-2" size={22} color="#FFFFFF" />
            <ThemedText type="caption" style={styles.actionText}>
              Wasted
            </ThemedText>
          </Animated.View>
        </LinearGradient>
      </Pressable>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[cardStyle, styles.cardWrapper]}>
          <Pressable
            onPress={() => onPress(item.id)}
            onLongPress={handleLongPress}
            testID={`card-inventory-item-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={`${item.name}, ${item.quantity} ${item.unit}, expires ${formatDate(item.expirationDate)}`}
            accessibilityHint="Opens item details. Long press for more options."
            accessibilityActions={[
              { name: "consumed", label: "Mark as consumed" },
              { name: "delete", label: "Delete item" },
            ]}
            onAccessibilityAction={(event) => {
              switch (event.nativeEvent.actionName) {
                case "consumed":
                  handleConsumed();
                  break;
                case "delete":
                  handleWasted();
                  break;
              }
            }}
          >
            <GlassView
              style={[
                styles.itemCard,
                {
                  borderColor: theme.glass.border,
                },
              ]}
            >
              <View style={styles.itemCardContent}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <ThemedText type="h4" numberOfLines={1}>
                      {item.name}
                    </ThemedText>
                    <ThemedText type="small" style={styles.itemCategory}>
                      {item.category} · {item.quantity} {item.unit}
                    </ThemedText>
                  </View>
                  <View style={styles.headerRight}>
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: getBadgeColor() + "E6" },
                      ]}
                    >
                      <ThemedText type="caption" style={styles.badgeText}>
                        {getBadgeText()}
                      </ThemedText>
                    </View>
                    <View style={styles.headerNutrition}>
                      {item.nutrition ? (
                        <NutritionBadge
                          nutrition={item.nutrition}
                          quantity={item.quantity}
                          showCalories={true}
                          showMacros={false}
                        />
                      ) : null}
                      {item.nutrition ? (
                        <NutritionScoreBadge
                          nutrition={item.nutrition}
                          size="small"
                        />
                      ) : null}
                    </View>
                  </View>
                </View>
                <View style={styles.itemFooter}>
                  <ThemedText type="caption" style={styles.expirationText}>
                    Expires {formatDate(item.expirationDate)}
                  </ThemedText>
                  {item.nutrition ? (
                    <NutritionBadge
                      nutrition={item.nutrition}
                      quantity={item.quantity}
                      showCalories={false}
                      showMacros={true}
                    />
                  ) : null}
                </View>
              </View>
            </GlassView>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  swipeContainer: {
    position: "relative",
    overflow: "hidden",
    borderRadius: BorderRadius.md,
  },
  consumedAction: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 125,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderTopLeftRadius: BorderRadius.md,
    borderBottomLeftRadius: BorderRadius.md,
    overflow: "hidden",
  },
  wastedAction: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 125,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
    borderTopRightRadius: BorderRadius.md,
    borderBottomRightRadius: BorderRadius.md,
    overflow: "hidden",
  },
  actionGradient: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  cardWrapper: {
    zIndex: 2,
  },
  actionButtonInner: {
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  actionText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemCard: {
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  itemCardContent: {
    padding: Spacing.md,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  itemInfo: {
    flex: 1,
    marginRight: Spacing.md,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: Spacing.xs,
  },
  headerNutrition: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
  },
  itemCategory: {
    marginTop: Spacing.xs,
    opacity: 0.8,
    letterSpacing: 0.3,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  badgeText: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: Spacing.sm,
  },
  expirationText: {
    opacity: 0.8,
    letterSpacing: 0.3,
    fontSize: 12,
  },
});
