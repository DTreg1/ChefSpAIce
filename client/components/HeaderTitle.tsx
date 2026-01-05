import React from "react";
import { View, StyleSheet } from "react-native";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import { Spacing, AppColors } from "@/constants/theme";

interface HeaderTitleProps {
  title: string;
  icon?: keyof typeof Feather.glyphMap;
  materialIcon?: keyof typeof MaterialCommunityIcons.glyphMap;
}

export function HeaderTitle({ title, icon, materialIcon }: HeaderTitleProps) {
  return (
    <View style={styles.container}>
      {materialIcon ? (
        <MaterialCommunityIcons
          name={materialIcon}
          size={26}
          color={AppColors.primary}
        />
      ) : icon ? (
        <Feather name={icon} size={24} color={AppColors.primary} />
      ) : null}
      <ThemedText style={styles.title}>{title}</ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: Spacing.sm,
  },
  title: {
    fontSize: 17,
    fontWeight: "600",
    color: AppColors.primary,
  },
});
