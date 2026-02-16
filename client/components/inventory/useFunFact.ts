import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiClient } from "@/lib/api-client";
import type { FoodItem } from "@/lib/storage";
import { logger } from "@/lib/logger";
import { AnimationDelays } from "@/constants/animations";

const FUN_FACT_TTL = 24 * 60 * 60 * 1000; // 24 hours

function formatTimeRemaining(ms: number): string {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  itemsWithNutrition: number;
}

export function useFunFact(items: FoodItem[], nutritionTotals: NutritionTotals) {
  const [funFact, setFunFact] = useState<string | null>(null);
  const [funFactLoading, setFunFactLoading] = useState(false);
  const [funFactTimestamp, setFunFactTimestamp] = useState<number | null>(null);
  const [funFactTimeRemaining, setFunFactTimeRemaining] = useState<string>("");

  const fetchFunFactFromAPI = useCallback(async (forceRefresh = false) => {
    if (items.length === 0 || nutritionTotals.itemsWithNutrition === 0) {
      setFunFact(null);
      return;
    }

    if (!forceRefresh) {
      try {
        const cached = await AsyncStorage.getItem("@chefspaice/fun_fact");
        if (cached) {
          const parsed = JSON.parse(cached);
          const elapsed = Date.now() - parsed.timestamp;
          if (elapsed < FUN_FACT_TTL) {
            setFunFact(parsed.fact);
            setFunFactTimestamp(parsed.timestamp);
            return;
          }
        }
      } catch (e) {
        logger.warn("Failed to parse cached fun fact", { error: e instanceof Error ? e.message : String(e) });
      }
    }

    setFunFactLoading(true);
    try {
      const data = await apiClient.post<{ fact: string }>("/api/suggestions/fun-fact", {
        items: items.slice(0, 20).map((i) => ({
          name: i.name,
          category: i.category,
          quantity: i.quantity,
        })),
        nutritionTotals,
        forceRefresh,
      });
      const timestamp = Date.now();
      setFunFact(data.fact);
      setFunFactTimestamp(timestamp);
      await AsyncStorage.setItem(
        "@chefspaice/fun_fact",
        JSON.stringify({ fact: data.fact, timestamp }),
      );
    } catch (error) {
      logger.error("Error fetching fun fact:", error);
    } finally {
      setFunFactLoading(false);
    }
  }, [items, nutritionTotals]);

  const handleRefreshFunFact = useCallback(() => {
    fetchFunFactFromAPI(true);
  }, [fetchFunFactFromAPI]);

  useEffect(() => {
    fetchFunFactFromAPI();
  }, [items.length, nutritionTotals.calories]);

  useEffect(() => {
    if (!funFactTimestamp) return;

    const updateTimeRemaining = () => {
      const elapsed = Date.now() - funFactTimestamp;
      const remaining = Math.max(0, FUN_FACT_TTL - elapsed);
      setFunFactTimeRemaining(formatTimeRemaining(remaining));
    };

    updateTimeRemaining();
    const interval = setInterval(updateTimeRemaining, AnimationDelays.funFactInterval);
    return () => clearInterval(interval);
  }, [funFactTimestamp]);

  const showFunFact = items.length > 0 && (funFact !== null || funFactLoading);

  return {
    funFact,
    funFactLoading,
    funFactTimeRemaining,
    showFunFact,
    handleRefreshFunFact,
  };
}
