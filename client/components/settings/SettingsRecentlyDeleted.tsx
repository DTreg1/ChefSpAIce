import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { ThemedText } from "@/components/ThemedText";
import { GlassCard } from "@/components/GlassCard";
import { Spacing, AppColors, BorderRadius } from "@/constants/theme";
import { storage, FoodItem } from "@/lib/storage";
import { logger } from "@/lib/logger";

interface SettingsRecentlyDeletedProps {
  theme: any;
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const deleted = new Date(dateStr).getTime();
  const diffMs = now - deleted;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return "Over 30 days ago";
}

function daysUntilPurge(dateStr: string): number {
  const deleted = new Date(dateStr).getTime();
  const purgeAt = deleted + 30 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.ceil((purgeAt - Date.now()) / (1000 * 60 * 60 * 24)));
}

export function SettingsRecentlyDeleted({ theme }: SettingsRecentlyDeletedProps) {
  const [deletedItems, setDeletedItems] = useState<FoodItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const loadDeletedItems = useCallback(async () => {
    try {
      const items = await storage.getDeletedInventory();
      setDeletedItems(items.sort((a, b) => {
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bTime - aTime;
      }));
    } catch (error) {
      logger.error("Error loading deleted items:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDeletedItems();
  }, [loadDeletedItems]);

  const handleRestore = async (item: FoodItem) => {
    Alert.alert(
      "Restore Item",
      `Restore "${item.name}" to your inventory?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Restore",
          onPress: async () => {
            setRestoringId(item.id);
            try {
              await storage.restoreInventoryItem(item.id);
              await loadDeletedItems();
            } catch (error) {
              logger.error("Error restoring item:", error);
              Alert.alert("Error", "Failed to restore item. Please try again.");
            } finally {
              setRestoringId(null);
            }
          },
        },
      ],
    );
  };

  const itemCount = deletedItems.length;

  return (
    <GlassCard style={styles.section}>
      <Pressable
        style={styles.headerRow}
        onPress={() => setExpanded(!expanded)}
        data-testid="button-recently-deleted-toggle"
        accessibilityRole="button"
        accessibilityLabel={`Recently Deleted, ${itemCount} items`}
      >
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, { backgroundColor: `${AppColors.error}15` }]}>
            <Feather name="trash-2" size={18} color={AppColors.error} />
          </View>
          <View style={styles.headerText}>
            <ThemedText type="h4" style={styles.sectionTitle}>
              Recently Deleted
            </ThemedText>
            <ThemedText type="caption">
              {loading
                ? "Loading..."
                : itemCount === 0
                  ? "No recently deleted items"
                  : `${itemCount} item${itemCount !== 1 ? "s" : ""} can be restored`}
            </ThemedText>
          </View>
        </View>
        {itemCount > 0 && (
          <Feather
            name={expanded ? "chevron-up" : "chevron-down"}
            size={20}
            color={theme.textSecondary}
          />
        )}
      </Pressable>

      {expanded && itemCount > 0 && (
        <View style={styles.itemsList}>
          <ThemedText type="caption" style={styles.purgeNote}>
            Items are permanently removed 30 days after deletion.
          </ThemedText>
          {deletedItems.map((item) => {
            const isRestoring = restoringId === item.id;
            const remaining = item.deletedAt ? daysUntilPurge(item.deletedAt) : 0;

            return (
              <View
                key={item.id}
                style={[styles.deletedItem, { borderColor: theme.glass.border }]}
                data-testid={`card-deleted-item-${item.id}`}
              >
                <View style={styles.itemInfo}>
                  <ThemedText type="body" style={styles.itemName}>
                    {item.name}
                  </ThemedText>
                  <ThemedText type="caption" style={styles.itemMeta}>
                    {item.quantity} {item.unit} \u00B7 {item.storageLocation}
                  </ThemedText>
                  <ThemedText type="caption" style={[styles.itemTime, remaining <= 3 ? { color: AppColors.error } : null]}>
                    Deleted {item.deletedAt ? formatTimeAgo(item.deletedAt) : "unknown"} \u00B7 {remaining} day{remaining !== 1 ? "s" : ""} left
                  </ThemedText>
                </View>
                <Pressable
                  style={[styles.restoreButton, { borderColor: AppColors.primary }]}
                  onPress={() => handleRestore(item)}
                  disabled={isRestoring}
                  data-testid={`button-restore-item-${item.id}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Restore ${item.name}`}
                >
                  {isRestoring ? (
                    <ActivityIndicator size="small" color={AppColors.primary} />
                  ) : (
                    <>
                      <Feather name="rotate-ccw" size={14} color={AppColors.primary} />
                      <ThemedText type="caption" style={{ color: AppColors.primary, fontWeight: "600" }}>
                        Restore
                      </ThemedText>
                    </>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 36,
    minHeight: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  sectionTitle: {
    marginBottom: 0,
  },
  itemsList: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  purgeNote: {
    fontStyle: "italic",
    marginBottom: Spacing.xs,
  },
  deletedItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.sm,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    gap: Spacing.sm,
  },
  itemInfo: {
    flex: 1,
    gap: 2,
  },
  itemName: {
    fontWeight: "600",
  },
  itemMeta: {
    opacity: 0.7,
  },
  itemTime: {
    opacity: 0.5,
    fontSize: 11,
  },
  restoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
  },
});
