import React, { useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation, DrawerActions } from "@react-navigation/native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  interpolate,
  Easing,
} from "react-native-reanimated";

import { ThemedText } from "@/components/ThemedText";
import { HeaderMenu, MenuItemConfig } from "@/components/HeaderMenu";
export type { MenuItemConfig };
import { useSearch } from "@/contexts/SearchContext";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius } from "@/constants/theme";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const BUTTON_SIZE = 44;
const HEADER_HEIGHT = 56;

interface ExpoGlassHeaderProps {
  title: string;
  materialIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
  screenKey: string;
  searchPlaceholder?: string;
  menuItems?: MenuItemConfig[];
  showSearch?: boolean;
  showMenu?: boolean;
  showBackButton?: boolean;
}

export function ExpoGlassHeader({
  title,
  materialIcon,
  screenKey,
  searchPlaceholder = "Search...",
  menuItems = [],
  showSearch = true,
  showMenu = true,
  showBackButton = false,
}: ExpoGlassHeaderProps) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const inputRef = useRef<TextInput>(null);

  const { getSearchQuery, setSearchQuery, isSearchOpen, openSearch, closeSearch } = useSearch();

  const handleGoBack = () => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    }
  };
  const searchQuery = getSearchQuery(screenKey);
  const isOpen = isSearchOpen(screenKey);

  const searchExpansion = useSharedValue(0);

  useEffect(() => {
    searchExpansion.value = withTiming(isOpen ? 1 : 0, {
      duration: 250,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      inputRef.current?.blur();
    }
  }, [isOpen]);

  const handleOpenDrawer = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  const handleSearchPress = () => {
    if (!isOpen) {
      openSearch(screenKey);
    }
  };

  const handleCloseSearch = () => {
    closeSearch(screenKey);
  };

  const handleClearSearch = () => {
    setSearchQuery(screenKey, "");
    inputRef.current?.focus();
  };

  const handleSearchChange = (text: string) => {
    setSearchQuery(screenKey, text);
  };

  const expandedWidth = SCREEN_WIDTH - BUTTON_SIZE - Spacing.md * 2 - (showMenu ? BUTTON_SIZE : 0);

  const searchContainerStyle = useAnimatedStyle(() => {
    const width = interpolate(
      searchExpansion.value,
      [0, 1],
      [BUTTON_SIZE, expandedWidth]
    );

    return {
      width,
    };
  });

  const searchInputStyle = useAnimatedStyle(() => {
    return {
      opacity: searchExpansion.value,
    };
  });

  const titleContainerStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(searchExpansion.value, [0, 0.3], [1, 0]),
      transform: [
        {
          translateX: interpolate(searchExpansion.value, [0, 1], [0, -50]),
        },
      ],
    };
  });

  const textColor = typeof theme.text === "string" ? theme.text : "#000";
  const secondaryColor = typeof theme.textSecondary === "string" ? theme.textSecondary : "#888";
  const glassBg = typeof theme.glass?.background === "string" ? theme.glass.background : "rgba(255,255,255,0.1)";
  const glassBorder = typeof theme.glass?.border === "string" ? theme.glass.border : "rgba(255,255,255,0.2)";

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop: insets.top,
          backgroundColor: Platform.select({
            ios: "transparent",
            android: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
            web: isDark ? "rgba(0,0,0,0.5)" : "rgba(255,255,255,0.8)",
          }),
        },
      ]}
    >
      <View style={styles.headerContent}>
        {/* Title centered absolutely between hamburger and menu */}
        <Animated.View style={[styles.titleContainer, titleContainerStyle]}>
          {materialIcon && (
            <MaterialCommunityIcons
              name={materialIcon}
              size={22}
              color={theme.primary}
              style={styles.titleIcon}
            />
          )}
          <ThemedText style={styles.title} numberOfLines={1}>
            {title}
          </ThemedText>
        </Animated.View>

        {/* Left side: back/hamburger + search */}
        <View style={styles.leftContainer}>
          {showBackButton ? (
            <Pressable
              style={styles.hamburgerButton}
              onPress={handleGoBack}
              testID="button-go-back"
              accessibilityLabel="Go back"
            >
              <Feather name="chevron-left" size={28} color={textColor} />
            </Pressable>
          ) : (
            <Pressable
              style={styles.hamburgerButton}
              onPress={handleOpenDrawer}
              testID="button-open-drawer"
              accessibilityLabel="Open menu"
            >
              <Feather name="menu" size={24} color={textColor} />
            </Pressable>
          )}

          {showSearch && (
            <Animated.View
              style={[
                styles.searchContainer,
                { backgroundColor: glassBg, borderColor: glassBorder },
                searchContainerStyle,
              ]}
            >
              {!isOpen ? (
                <Pressable
                  style={styles.searchIconButton}
                  onPress={handleSearchPress}
                  testID="button-header-search"
                >
                  <Feather name="search" size={22} color={secondaryColor} />
                </Pressable>
              ) : (
                <>
                  <Pressable style={styles.searchCloseButton} onPress={handleCloseSearch}>
                    <Feather name="arrow-left" size={20} color={secondaryColor} />
                  </Pressable>
                  <Animated.View style={[styles.searchInputWrapper, searchInputStyle]}>
                    <TextInput
                      ref={inputRef}
                      style={[styles.searchInput, { color: textColor }]}
                      placeholder={searchPlaceholder}
                      placeholderTextColor={secondaryColor}
                      value={searchQuery}
                      onChangeText={handleSearchChange}
                      autoCapitalize="none"
                      autoCorrect={false}
                      returnKeyType="search"
                    />
                  </Animated.View>
                  {searchQuery.length > 0 && (
                    <Pressable style={styles.searchClearButton} onPress={handleClearSearch}>
                      <Feather name="x" size={18} color={secondaryColor} />
                    </Pressable>
                  )}
                </>
              )}
            </Animated.View>
          )}
        </View>

        {/* Right side: menu */}
        <View style={styles.rightContainer}>
          {showMenu && menuItems.length > 0 && (
            <HeaderMenu items={menuItems} testID={`button-${screenKey}-menu`} />
          )}
          {showMenu && menuItems.length === 0 && (
            <View style={styles.menuPlaceholder} />
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerContent: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.md,
  },
  leftContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  hamburgerButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  searchContainer: {
    height: 40,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    overflow: "hidden",
    marginLeft: Spacing.xs,
  },
  searchIconButton: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  searchCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  searchInputWrapper: {
    flex: 1,
    height: 40,
    justifyContent: "center",
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  searchClearButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    position: "absolute",
    left: BUTTON_SIZE + Spacing.md,
    right: BUTTON_SIZE + Spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  titleIcon: {
    marginRight: Spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
  },
  rightContainer: {
    flexDirection: "row",
    alignItems: "center",
    zIndex: 2,
  },
  menuPlaceholder: {
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
  },
});
