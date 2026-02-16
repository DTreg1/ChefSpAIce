import React, { useState } from "react";
import {
  View,
  Pressable,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import { useFocusTrap } from "@/hooks/useFocusTrap";

export interface MenuItemConfig {
  label: string;
  sublabel?: string;
  icon: keyof typeof Feather.glyphMap;
  onPress: () => void | Promise<void>;
  disabled?: boolean;
  active?: boolean;
}

interface HeaderMenuProps {
  items: MenuItemConfig[];
  testID?: string;
}

export function HeaderMenu({
  items,
  testID = "button-header-menu",
}: HeaderMenuProps) {
  const { theme, style: themeStyle } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const { focusTargetRef, triggerRef, containerRef, onAccessibilityEscape } = useFocusTrap({
    visible: isOpen,
    onDismiss: () => setIsOpen(false),
  });

  const handleItemPress = async (item: MenuItemConfig) => {
    setIsOpen(false);
    await item.onPress();
  };

  if (items.length === 0) {
    return null;
  }

  return (
    <>
      <Pressable
        ref={triggerRef}
        style={styles.menuButton}
        onPress={() => setIsOpen(true)}
        testID={testID}
        accessibilityLabel="Options menu"
        accessibilityRole="button"
        accessibilityHint="Opens a menu with additional actions"
      >
        <Feather name="more-vertical" size={22} color={theme.text} />
      </Pressable>

      <Modal
        visible={isOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setIsOpen(false)}
        accessibilityViewIsModal={true}
      >
        <TouchableWithoutFeedback
          onPress={() => setIsOpen(false)}
          accessibilityLabel="Close options menu"
          accessibilityRole="button"
        >
          <View style={[styles.modalOverlay, { backgroundColor: themeStyle.glass.backgroundSubtle }]}>
            <TouchableWithoutFeedback>
              <View
                ref={containerRef}
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: theme.backgroundSecondary,
                    borderColor: themeStyle.glass.border,
                    shadowColor: themeStyle.glass.shadowColor,
                  },
                ]}
                accessibilityRole="menu"
                onAccessibilityEscape={onAccessibilityEscape}
              >
                {items.map((item, index) => (
                  <Pressable
                    key={item.label}
                    ref={index === 0 ? focusTargetRef : undefined}
                    style={[
                      styles.menuItem,
                      index < items.length - 1 && {
                        borderBottomWidth: 1,
                        borderBottomColor: themeStyle.glass.border,
                      },
                      item.disabled && styles.menuItemDisabled,
                    ]}
                    onPress={() => handleItemPress(item)}
                    disabled={item.disabled}
                    testID={`menu-item-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    accessibilityRole="menuitem"
                    accessibilityLabel={`${item.label}${item.active ? ', currently active' : ''}${item.disabled ? ', unavailable' : ''}`}
                    accessibilityState={{ disabled: item.disabled, selected: item.active }}
                  >
                    <View style={styles.menuItemContent}>
                      <Feather
                        name={item.icon}
                        size={18}
                        color={
                          item.active
                            ? AppColors.primary
                            : item.disabled
                              ? theme.textSecondary
                              : theme.text
                        }
                      />
                      <View style={{ flex: 1 }}>
                        <ThemedText
                          style={[
                            styles.menuItemText,
                            item.disabled && { color: theme.textSecondary },
                            item.active && { color: AppColors.primary },
                          ]}
                        >
                          {item.label}
                        </ThemedText>
                        {item.sublabel ? (
                          <ThemedText
                            style={[
                              styles.menuItemSublabel,
                              { color: theme.textSecondary },
                            ]}
                          >
                            {item.sublabel}
                          </ThemedText>
                        ) : null}
                      </View>
                      {item.active && (
                        <Feather
                          name="check"
                          size={16}
                          color={AppColors.primary}
                          style={styles.activeCheck}
                        />
                      )}
                    </View>
                  </Pressable>
                ))}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  menuButton: {
    width: 44,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 60,
    paddingRight: Spacing.md,
  },
  dropdown: {
    minWidth: 180,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
    overflow: "hidden",
  },
  menuItem: {
    padding: Spacing.md,
  },
  menuItemDisabled: {
    opacity: 0.5,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  menuItemText: {
    fontSize: 15,
  },
  menuItemSublabel: {
    fontSize: 12,
    marginTop: 2,
  },
  activeCheck: {
    marginLeft: "auto",
  },
});
