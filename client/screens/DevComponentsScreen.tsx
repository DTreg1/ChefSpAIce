import React from "react";
import {
  ScrollView,
  View,
  StyleSheet,
  Platform,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { GlassCard } from "@/components/GlassCard";
import { Button } from "@/components/Button";
import { GlassButton } from "@/components/GlassButton";
import { useTheme } from "@/hooks/useTheme";
import {
  Spacing,
  GlassEffect,
  GlassColors,
  AppColors,
  BorderRadius,
} from "@/constants/theme";

function SectionHeader({ title }: { title: string }) {
  const { theme } = useTheme();
  return (
    <View style={styles.sectionHeader}>
      <ThemedText type="h3" style={{ color: theme.text }}>
        {title}
      </ThemedText>
    </View>
  );
}

function GlassChip({
  label,
  selected = false,
}: {
  label: string;
  selected?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.chip,
          {
            backgroundColor: selected
              ? AppColors.primary
              : glassColors.background,
            borderColor: selected ? AppColors.primary : glassColors.border,
          },
        ]}
      >
        <ThemedText
          type="small"
          style={{ color: selected ? "#FFFFFF" : theme.textOnGlass }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  return (
    <BlurView
      intensity={30}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.chip,
        {
          borderColor: selected ? AppColors.primary : glassColors.border,
          backgroundColor: selected ? AppColors.primary : "transparent",
        },
      ]}
    >
      <ThemedText
        type="small"
        style={{ color: selected ? "#FFFFFF" : theme.textOnGlass }}
      >
        {label}
      </ThemedText>
    </BlurView>
  );
}

function GlassPill({
  label,
  active = false,
}: {
  label: string;
  active?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.pill,
          {
            backgroundColor: active
              ? AppColors.primary
              : glassColors.background,
            borderColor: active ? AppColors.primary : glassColors.border,
          },
        ]}
      >
        <ThemedText
          type="caption"
          style={{ color: active ? "#FFFFFF" : theme.textOnGlass }}
        >
          {label}
        </ThemedText>
      </View>
    );
  }

  return (
    <BlurView
      intensity={25}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.pill,
        {
          borderColor: active ? AppColors.primary : glassColors.border,
          backgroundColor: active ? AppColors.primary : "transparent",
        },
      ]}
    >
      <ThemedText
        type="caption"
        style={{ color: active ? "#FFFFFF" : theme.textOnGlass }}
      >
        {label}
      </ThemedText>
    </BlurView>
  );
}

function GlassInput({ placeholder }: { placeholder: string }) {
  const { theme, isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.glassInput,
          {
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
        ]}
      >
        <Feather
          name="search"
          size={18}
          color={theme.textSecondary}
          style={styles.inputIcon}
        />
        <TextInput
          placeholder={placeholder}
          placeholderTextColor={theme.textSecondary}
          style={[styles.inputText, { color: theme.text }]}
        />
      </View>
    );
  }

  return (
    <BlurView
      intensity={30}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.glassInput,
        {
          borderColor: glassColors.border,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
    >
      <Feather
        name="search"
        size={18}
        color={theme.textSecondary}
        style={styles.inputIcon}
      />
      <TextInput
        placeholder={placeholder}
        placeholderTextColor={theme.textSecondary}
        style={[styles.inputText, { color: theme.textOnGlass }]}
      />
    </BlurView>
  );
}

function GlassBadge({
  label,
  color = AppColors.primary,
}: {
  label: string;
  color?: string;
}) {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.badge,
          {
            backgroundColor: `${color}20`,
            borderColor: color,
          },
        ]}
      >
        <ThemedText type="caption" style={{ color, fontWeight: "600" }}>
          {label}
        </ThemedText>
      </View>
    );
  }

  return (
    <BlurView
      intensity={20}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.badge,
        {
          borderColor: color,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
    >
      <ThemedText type="caption" style={{ color, fontWeight: "600" }}>
        {label}
      </ThemedText>
    </BlurView>
  );
}

function MessageBubble({
  message,
  isUser = false,
}: {
  message: string;
  isUser?: boolean;
}) {
  const { theme, isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.assistantBubble,
          {
            backgroundColor: isUser
              ? AppColors.primary
              : glassColors.background,
            borderColor: isUser ? AppColors.primary : glassColors.border,
          },
        ]}
      >
        <ThemedText
          type="body"
          style={{ color: isUser ? "#FFFFFF" : theme.text }}
        >
          {message}
        </ThemedText>
      </View>
    );
  }

  if (isUser) {
    return (
      <View
        style={[
          styles.messageBubble,
          styles.userBubble,
          { backgroundColor: AppColors.primary },
        ]}
      >
        <ThemedText type="body" style={{ color: "#FFFFFF" }}>
          {message}
        </ThemedText>
      </View>
    );
  }

  return (
    <BlurView
      intensity={30}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.messageBubble,
        styles.assistantBubble,
        {
          borderColor: glassColors.border,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
    >
      <ThemedText type="body" style={{ color: theme.textOnGlass }}>
        {message}
      </ThemedText>
    </BlurView>
  );
}

function GlassFAB() {
  const { isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.fab,
          {
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
        ]}
      >
        <Feather name="plus" size={24} color={AppColors.primary} />
      </View>
    );
  }

  return (
    <BlurView
      intensity={40}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.fab,
        {
          borderColor: glassColors.border,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
    >
      <Feather name="plus" size={24} color={AppColors.primary} />
    </BlurView>
  );
}

function EmptyStateGlass() {
  const { theme, isDark } = useTheme();
  const glassColors = isDark ? GlassColors.dark : GlassColors.light;

  if (Platform.OS === "web") {
    return (
      <View
        style={[
          styles.emptyState,
          {
            backgroundColor: glassColors.background,
            borderColor: glassColors.border,
          },
        ]}
      >
        <Feather name="inbox" size={48} color={theme.textSecondary} />
        <ThemedText
          type="body"
          style={{ color: theme.textSecondary, marginTop: Spacing.md }}
        >
          No items found
        </ThemedText>
        <ThemedText
          type="small"
          style={{
            color: theme.textSecondary,
            opacity: 0.7,
            marginTop: Spacing.xs,
          }}
        >
          Add your first item to get started
        </ThemedText>
      </View>
    );
  }

  return (
    <BlurView
      intensity={30}
      tint={isDark ? "dark" : "light"}
      style={[
        styles.emptyState,
        {
          borderColor: glassColors.border,
          borderWidth: GlassEffect.borderWidth,
        },
      ]}
    >
      <Feather name="inbox" size={48} color={theme.textSecondary} />
      <ThemedText
        type="body"
        style={{ color: theme.textSecondary, marginTop: Spacing.md }}
      >
        No items found
      </ThemedText>
      <ThemedText
        type="small"
        style={{
          color: theme.textSecondary,
          opacity: 0.7,
          marginTop: Spacing.xs,
        }}
      >
        Add your first item to get started
      </ThemedText>
    </BlurView>
  );
}

export default function DevComponentsScreen() {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: Spacing.lg, paddingBottom: insets.bottom + Spacing.xl },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <ThemedText type="h2">Component Library</ThemedText>
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginTop: Spacing.xs }}
          >
            iOS 26 Liquid Glass Design System
          </ThemedText>
          <View
            style={[styles.devBadge, { backgroundColor: AppColors.warning }]}
          >
            <ThemedText
              type="caption"
              style={{ color: "#FFFFFF", fontWeight: "600" }}
            >
              DEV ONLY
            </ThemedText>
          </View>
        </View>

        <SectionHeader title="GlassCard Variants" />
        <View style={styles.cardRow}>
          <GlassCard intensity="subtle" style={styles.demoCard}>
            <ThemedText type="small" style={{ color: theme.textOnGlass }}>
              Subtle
            </ThemedText>
          </GlassCard>
          <GlassCard intensity="regular" style={styles.demoCard}>
            <ThemedText type="small" style={{ color: theme.textOnGlass }}>
              Regular
            </ThemedText>
          </GlassCard>
          <GlassCard intensity="strong" style={styles.demoCard}>
            <ThemedText type="small" style={{ color: theme.textOnGlass }}>
              Strong
            </ThemedText>
          </GlassCard>
        </View>

        <GlassCard
          title="Card with Title"
          description="This is a glass card with title and description props"
          style={{ marginTop: Spacing.md }}
        />

        <GlassCard
          title="Pressable Card"
          description="Tap to see the spring animation"
          onPress={() => {}}
          style={{ marginTop: Spacing.md }}
        />

        <SectionHeader title="Card (Non-Glass) Variants" />
        <View style={styles.cardRow}>
          <GlassCard style={styles.demoCard}>
            <ThemedText type="small">Elevation 1</ThemedText>
          </GlassCard>
          <GlassCard style={styles.demoCard}>
            <ThemedText type="small">Elevation 2</ThemedText>
          </GlassCard>
          <GlassCard style={styles.demoCard}>
            <ThemedText type="small">Elevation 3</ThemedText>
          </GlassCard>
        </View>

        <GlassCard
          title="Card with Title"
          description="Non-glass card uses solid background colors"
          style={{ marginTop: Spacing.md }}
        />

        <SectionHeader title="Button Variants" />
        <View style={styles.buttonColumn}>
          <Button variant="primary" onPress={() => {}}>
            Primary Button
          </Button>
          <Button variant="secondary" onPress={() => {}}>
            Secondary Button
          </Button>
          <Button variant="outline" onPress={() => {}}>
            Outline Button
          </Button>
          <Button variant="ghost" onPress={() => {}}>
            Ghost Button
          </Button>
          <Button variant="primary" loading>
            Loading State
          </Button>
          <Button variant="primary" disabled>
            Disabled State
          </Button>
          <Button
            variant="primary"
            icon={<Feather name="plus" size={18} color="#FFFFFF" />}
            onPress={() => {}}
          >
            With Icon
          </Button>
        </View>

        <SectionHeader title="Glass Button Variants" />
        <View style={styles.buttonColumn}>
          <GlassButton variant="primary" onPress={() => {}}>
            Glass Primary
          </GlassButton>
          <GlassButton variant="secondary" onPress={() => {}}>
            Glass Secondary
          </GlassButton>
          <GlassButton variant="outline" onPress={() => {}}>
            Glass Outline
          </GlassButton>
          <GlassButton variant="ghost" onPress={() => {}}>
            Glass Ghost
          </GlassButton>
          <GlassButton variant="primary" loading>
            Glass Loading
          </GlassButton>
          <GlassButton variant="primary" disabled>
            Glass Disabled
          </GlassButton>
          <GlassButton
            variant="primary"
            icon={<Feather name="plus" size={18} color="#FFFFFF" />}
            onPress={() => {}}
          >
            Glass With Icon
          </GlassButton>
        </View>

        <SectionHeader title="Glass Input" />
        <GlassInput placeholder="Search for items..." />

        <SectionHeader title="Filter Chips (Storage Locations)" />
        <View style={styles.chipRow}>
          <GlassChip label="Fridge" selected />
          <GlassChip label="Freezer" />
          <GlassChip label="Pantry" />
          <GlassChip label="Counter" />
        </View>

        <SectionHeader title="Pill Chips (Nutrition Filters)" />
        <View style={styles.pillRow}>
          <GlassPill label="Low Calorie" active />
          <GlassPill label="High Protein" />
          <GlassPill label="Low Carb" />
          <GlassPill label="Keto" />
          <GlassPill label="Vegan" />
        </View>

        <SectionHeader title="Glass Badges" />
        <View style={styles.badgeRow}>
          <GlassBadge label="Fresh" color={AppColors.success} />
          <GlassBadge label="Expiring Soon" color={AppColors.warning} />
          <GlassBadge label="Expired" color={AppColors.error} />
          <GlassBadge label="New" color={AppColors.primary} />
        </View>

        <SectionHeader title="Message Bubbles" />
        <View style={styles.messageContainer}>
          <MessageBubble
            message="What can I make with chicken and rice?"
            isUser
          />
          <MessageBubble message="Here are some delicious recipes you can make with chicken and rice. Try a classic chicken fried rice or a comforting chicken and rice casserole!" />
        </View>

        <SectionHeader title="Empty State" />
        <EmptyStateGlass />

        <SectionHeader title="Floating Action Button" />
        <View style={styles.fabContainer}>
          <GlassFAB />
          <ThemedText
            type="small"
            style={{ color: theme.textSecondary, marginLeft: Spacing.md }}
          >
            Glass FAB Example
          </ThemedText>
        </View>

        <SectionHeader title="Theme Info" />
        <GlassCard>
          <View style={styles.themeInfo}>
            <ThemedText type="body" style={{ color: theme.textOnGlass }}>
              Current Theme: {isDark ? "Dark" : "Light"}
            </ThemedText>
            <View style={styles.colorSwatch}>
              <View
                style={[styles.swatch, { backgroundColor: AppColors.primary }]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Primary
              </ThemedText>
            </View>
            <View style={styles.colorSwatch}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: AppColors.secondary },
                ]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Secondary
              </ThemedText>
            </View>
            <View style={styles.colorSwatch}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: theme.glass.background },
                ]}
              />
              <ThemedText type="caption" style={{ color: theme.textSecondary }}>
                Glass BG
              </ThemedText>
            </View>
          </View>
        </GlassCard>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    marginBottom: Spacing.xl,
  },
  devBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    marginTop: Spacing["2xl"],
    marginBottom: Spacing.md,
  },
  cardRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  demoCard: {
    flex: 1,
    minHeight: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonColumn: {
    gap: Spacing.md,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: GlassEffect.borderWidth,
    overflow: "hidden",
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  pill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: GlassEffect.borderRadius.pill,
    borderWidth: GlassEffect.borderWidth,
    overflow: "hidden",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  glassInput: {
    flexDirection: "row",
    alignItems: "center",
    height: Spacing.inputHeight,
    borderRadius: GlassEffect.borderRadius.md,
    borderWidth: GlassEffect.borderWidth,
    paddingHorizontal: Spacing.md,
    overflow: "hidden",
  },
  inputIcon: {
    marginRight: Spacing.sm,
  },
  inputText: {
    flex: 1,
    fontSize: 16,
  },
  badge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
    borderWidth: GlassEffect.borderWidth,
    overflow: "hidden",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  messageBubble: {
    maxWidth: "80%",
    padding: Spacing.md,
    borderRadius: GlassEffect.borderRadius.lg,
    marginBottom: Spacing.sm,
    overflow: "hidden",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: Spacing.xs,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: Spacing.xs,
  },
  messageContainer: {
    gap: Spacing.sm,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  fabContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing["2xl"],
    borderRadius: GlassEffect.borderRadius.lg,
    borderWidth: GlassEffect.borderWidth,
    overflow: "hidden",
  },
  themeInfo: {
    gap: Spacing.md,
  },
  colorSwatch: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  swatch: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.sm,
  },
});
