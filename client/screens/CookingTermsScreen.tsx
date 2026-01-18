import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  StyleSheet,
  FlatList,
  TextInput,
  Pressable,
  Modal,
  ScrollView,
  Linking,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { useQuery } from "@tanstack/react-query";
import { Feather } from "@expo/vector-icons";

import { ExpoGlassHeader } from "@/components/ExpoGlassHeader";
import { MenuItemConfig } from "@/components/HeaderMenu";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { GlassButton } from "@/components/GlassButton";
import { CookPotLoader } from "@/components/CookPotLoader";
import { useTheme } from "@/hooks/useTheme";
import { Spacing, BorderRadius, AppColors } from "@/constants/theme";
import type { CookingTerm } from "@/components/TermHighlighter";

const CATEGORIES = [
  { id: "all", label: "All" },
  { id: "technique", label: "Techniques" },
  { id: "cut", label: "Cuts" },
  { id: "equipment", label: "Cookware" },
  { id: "temperature", label: "Temperature" },
  { id: "ingredient", label: "Ingredients" },
  { id: "measurement", label: "Measurements" },
];

const DIFFICULTY_COLORS: Record<string, string> = {
  beginner: AppColors.success,
  intermediate: AppColors.warning,
  advanced: AppColors.error,
};

export default function CookingTermsScreen() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = useBottomTabBarHeight();
  const { theme } = useTheme();
  const menuItems: MenuItemConfig[] = [];

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedTerm, setSelectedTerm] = useState<CookingTerm | null>(null);

  const { data: terms, isLoading } = useQuery<CookingTerm[]>({
    queryKey: ["/api/cooking-terms"],
  });

  const filteredTerms = useMemo(() => {
    if (!terms) return [];

    return terms.filter((term) => {
      const matchesSearch =
        !search ||
        term.term.toLowerCase().includes(search.toLowerCase()) ||
        term.definition.toLowerCase().includes(search.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || term.category === selectedCategory;

      return matchesSearch && matchesCategory;
    });
  }, [terms, search, selectedCategory]);

  const handleTermPress = useCallback((term: CookingTerm) => {
    setSelectedTerm(term);
  }, []);

  const handleRelatedTermPress = useCallback(
    (termName: string) => {
      const related = terms?.find(
        (t) => t.term.toLowerCase() === termName.toLowerCase(),
      );
      if (related) {
        setSelectedTerm(related);
      }
    },
    [terms],
  );

  const handleVideoPress = useCallback((url: string) => {
    Linking.openURL(url);
  }, []);

  const renderCategoryChip = useCallback(
    ({ item }: { item: (typeof CATEGORIES)[0] }) => {
      const isSelected = selectedCategory === item.id;
      return (
        <Pressable
          style={[
            styles.categoryChip,
            {
              backgroundColor: isSelected
                ? theme.primary
                : theme.backgroundSecondary,
            },
          ]}
          onPress={() => setSelectedCategory(item.id)}
        >
          <ThemedText
            type="small"
            style={{ color: isSelected ? "#FFFFFF" : theme.text }}
          >
            {item.label}
          </ThemedText>
        </Pressable>
      );
    },
    [selectedCategory, theme],
  );

  const renderTermCard = useCallback(
    ({ item }: { item: CookingTerm }) => (
      <GlassCard style={styles.termCard} onPress={() => handleTermPress(item)}>
        <View style={styles.termHeader}>
          <ThemedText type="h4" style={styles.termName}>
            {item.term}
          </ThemedText>
          <View
            style={[
              styles.categoryBadge,
              { backgroundColor: theme.backgroundTertiary },
            ]}
          >
            <ThemedText type="caption" style={{ color: theme.primary }}>
              {item.category}
            </ThemedText>
          </View>
        </View>
        <ThemedText
          type="small"
          numberOfLines={2}
          style={{ color: theme.textSecondary }}
        >
          {item.definition}
        </ThemedText>
        {item.difficulty ? (
          <View style={styles.difficultyContainer}>
            <View
              style={[
                styles.difficultyDot,
                {
                  backgroundColor:
                    DIFFICULTY_COLORS[item.difficulty] || theme.textSecondary,
                },
              ]}
            />
            <ThemedText type="caption" style={{ color: theme.textSecondary }}>
              {item.difficulty}
            </ThemedText>
          </View>
        ) : null}
      </GlassCard>
    ),
    [theme, handleTermPress],
  );

  const renderEmptyState = useCallback(() => {
    if (isLoading) {
      return (
        <View style={styles.emptyState}>
          <CookPotLoader size="lg" text="Loading cooking terms..." />
        </View>
      );
    }

    return (
      <View style={styles.emptyState}>
        <Feather name="search" size={48} color={theme.textSecondary} />
        <ThemedText type="h4" style={styles.emptyTitle}>
          No terms found
        </ThemedText>
        <ThemedText
          type="body"
          style={[styles.emptyText, { color: theme.textSecondary }]}
        >
          Try adjusting your search or filter
        </ThemedText>
      </View>
    );
  }, [isLoading, theme]);

  return (
    <View style={[styles.container, { backgroundColor: theme.backgroundRoot }]}>
      <ExpoGlassHeader
        title="Cooking Terms"
        screenKey="cookingTerms"
        showSearch={false}
        showBackButton={true}
        menuItems={menuItems}
      />
      <View
        style={[
          styles.header,
          {
            paddingTop: 56 + insets.top + Spacing.lg,
            backgroundColor: theme.backgroundRoot,
          },
        ]}
      >
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: theme.backgroundSecondary },
          ]}
        >
          <Feather name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Search cooking terms..."
            placeholderTextColor={theme.textSecondary}
            value={search}
            onChangeText={setSearch}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {search.length > 0 ? (
            <Pressable onPress={() => setSearch("")}>
              <Feather name="x" size={20} color={theme.textSecondary} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          horizontal
          data={CATEGORIES}
          keyExtractor={(item) => item.id}
          renderItem={renderCategoryChip}
          style={styles.categoryList}
          contentContainerStyle={styles.categoryListContent}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <FlatList
        data={filteredTerms}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderTermCard}
        contentContainerStyle={[
          styles.list,
          { paddingBottom: tabBarHeight + Spacing.xl },
        ]}
        ListEmptyComponent={renderEmptyState}
        showsVerticalScrollIndicator={false}
      />

      <Modal
        visible={selectedTerm !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedTerm(null)}
      >
        {selectedTerm ? (
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.backgroundRoot },
            ]}
          >
            <View
              style={[styles.modalHeader, { borderBottomColor: theme.border }]}
            >
              <View style={styles.modalHandle} />
              <Pressable
                style={styles.closeButton}
                onPress={() => setSelectedTerm(null)}
              >
                <Feather name="x" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalScrollContent}
            >
              <ThemedText type="h2" style={styles.modalTitle}>
                {selectedTerm.term}
              </ThemedText>

              {selectedTerm.pronunciation ? (
                <ThemedText
                  type="body"
                  style={[styles.pronunciation, { color: theme.textSecondary }]}
                >
                  /{selectedTerm.pronunciation}/
                </ThemedText>
              ) : null}

              <View style={styles.metaContainer}>
                <View
                  style={[
                    styles.metaBadge,
                    { backgroundColor: theme.backgroundSecondary },
                  ]}
                >
                  <ThemedText type="small" style={{ color: theme.primary }}>
                    {selectedTerm.category}
                  </ThemedText>
                </View>

                {selectedTerm.difficulty ? (
                  <View
                    style={[
                      styles.metaBadge,
                      {
                        backgroundColor:
                          DIFFICULTY_COLORS[selectedTerm.difficulty] + "20",
                      },
                    ]}
                  >
                    <ThemedText
                      type="small"
                      style={{
                        color: DIFFICULTY_COLORS[selectedTerm.difficulty],
                      }}
                    >
                      {selectedTerm.difficulty}
                    </ThemedText>
                  </View>
                ) : null}
              </View>

              <ThemedText type="body" style={styles.definition}>
                {selectedTerm.definition}
              </ThemedText>

              {selectedTerm.relatedTerms &&
              selectedTerm.relatedTerms.length > 0 ? (
                <View style={styles.relatedSection}>
                  <ThemedText type="h4" style={styles.sectionTitle}>
                    Related Terms
                  </ThemedText>
                  <View style={styles.relatedTerms}>
                    {selectedTerm.relatedTerms.map((relatedTerm) => (
                      <Pressable
                        key={relatedTerm}
                        style={[
                          styles.relatedChip,
                          { backgroundColor: theme.backgroundSecondary },
                        ]}
                        onPress={() => handleRelatedTermPress(relatedTerm)}
                      >
                        <ThemedText type="small">{relatedTerm}</ThemedText>
                        <Feather
                          name="arrow-right"
                          size={14}
                          color={theme.textSecondary}
                        />
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}

              {selectedTerm.videoUrl ? (
                <GlassButton
                  variant="outline"
                  onPress={() => handleVideoPress(selectedTerm.videoUrl!)}
                  style={styles.videoButton}
                  icon={
                    <Feather
                      name="play-circle"
                      size={20}
                      color={theme.primary}
                    />
                  }
                >
                  <ThemedText style={{ color: theme.primary }}>
                    Watch Video
                  </ThemedText>
                </GlassButton>
              ) : null}
            </ScrollView>
          </View>
        ) : null}
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingBottom: Spacing.md,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    gap: Spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: Spacing.xs,
  },
  categoryList: {
    flexGrow: 0,
  },
  categoryListContent: {
    gap: Spacing.sm,
  },
  categoryChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.pill,
  },
  list: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.md,
    paddingTop: Spacing.sm,
  },
  termCard: {
    marginBottom: Spacing.sm,
  },
  termHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  termName: {
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  difficultyContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.xs,
    marginTop: Spacing.sm,
  },
  difficultyDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: Spacing["4xl"],
    gap: Spacing.md,
  },
  emptyTitle: {
    marginTop: Spacing.md,
  },
  emptyText: {
    textAlign: "center",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    alignItems: "center",
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  modalHandle: {
    width: 36,
    height: 4,
    backgroundColor: "#999",
    borderRadius: 2,
    marginBottom: Spacing.sm,
  },
  closeButton: {
    position: "absolute",
    right: Spacing.lg,
    top: Spacing.md,
    padding: Spacing.sm,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.xl,
    gap: Spacing.lg,
  },
  modalTitle: {
    marginBottom: Spacing.xs,
  },
  pronunciation: {
    fontStyle: "italic",
    marginTop: -Spacing.sm,
  },
  metaContainer: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  metaBadge: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  definition: {
    lineHeight: 26,
  },
  relatedSection: {
    marginTop: Spacing.lg,
  },
  sectionTitle: {
    marginBottom: Spacing.md,
  },
  relatedTerms: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  relatedChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    gap: Spacing.xs,
  },
  videoButton: {
    marginTop: Spacing.lg,
  },
});
