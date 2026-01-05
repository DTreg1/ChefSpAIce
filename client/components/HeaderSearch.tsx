import React, { useRef, useEffect } from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { useSearch } from "@/contexts/SearchContext";
import { useTheme } from "@/hooks/useTheme";
import { BorderRadius } from "@/constants/theme";

interface HeaderSearchProps {
  screenKey: string;
  placeholder?: string;
}

export function HeaderSearch({ screenKey, placeholder = "Search..." }: HeaderSearchProps) {
  const { theme } = useTheme();
  const { getSearchQuery, setSearchQuery, isSearchOpen, openSearch, closeSearch } = useSearch();
  const inputRef = useRef<TextInput>(null);

  const searchQuery = getSearchQuery(screenKey);
  const isOpen = isSearchOpen(screenKey);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      inputRef.current?.blur();
    }
  }, [isOpen]);

  const handleIconPress = () => {
    if (!isOpen) {
      openSearch(screenKey);
    }
  };

  const handleClose = () => {
    closeSearch(screenKey);
  };

  const handleClear = () => {
    setSearchQuery(screenKey, "");
    inputRef.current?.focus();
  };

  const handleChangeText = (text: string) => {
    setSearchQuery(screenKey, text);
  };

  const textColor = typeof theme.text === 'string' ? theme.text : '#000';
  const secondaryColor = typeof theme.textSecondary === 'string' ? theme.textSecondary : '#888';
  const bgColor = typeof theme.glass?.background === 'string' ? theme.glass.background : 'rgba(255,255,255,0.1)';
  const borderColor = typeof theme.glass?.border === 'string' ? theme.glass.border : 'rgba(255,255,255,0.2)';

  if (!isOpen) {
    return (
      <Pressable
        style={styles.iconButton}
        onPress={handleIconPress}
        data-testid="button-header-search"
      >
        <Feather name="search" size={22} color={secondaryColor} />
      </Pressable>
    );
  }

  return (
    <View
      style={[
        styles.expandedContainer,
        {
          backgroundColor: bgColor,
          borderColor: borderColor,
        },
      ]}
    >
      <Pressable style={styles.closeButton} onPress={handleClose}>
        <Feather name="arrow-left" size={20} color={secondaryColor} />
      </Pressable>

      <TextInput
        ref={inputRef}
        style={[styles.input, { color: textColor }]}
        placeholder={placeholder}
        placeholderTextColor={secondaryColor}
        value={searchQuery}
        onChangeText={handleChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
      />

      {searchQuery.length > 0 ? (
        <Pressable style={styles.clearButton} onPress={handleClear}>
          <Feather name="x" size={18} color={secondaryColor} />
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  expandedContainer: {
    position: "absolute",
    left: 0,
    top: 0,
    flexDirection: "row",
    alignItems: "center",
    height: 44,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    width: 260,
    zIndex: 1000,
  },
  closeButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
    height: 40,
  },
  clearButton: {
    width: 36,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
});
