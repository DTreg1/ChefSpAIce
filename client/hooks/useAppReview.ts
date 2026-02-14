import { useCallback } from "react";
import { Platform } from "react-native";
import * as StoreReview from "expo-store-review";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";
import { trackEvent } from "@/lib/crash-reporter";
import { analytics } from "@/lib/analytics";
import { storage } from "@/lib/storage";

const REVIEW_STORAGE_KEY = "@chefspaice/review_prompt";
const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
const MAX_PROMPT_COUNT = 3;
const MIN_RECIPES_GENERATED = 3;
const MIN_INVENTORY_ITEMS = 10;

interface ReviewPromptData {
  lastReviewPromptDate: string | null;
  reviewPromptCount: number;
}

async function getReviewData(): Promise<ReviewPromptData> {
  try {
    const raw = await AsyncStorage.getItem(REVIEW_STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    logger.error("Error reading review prompt data:", error);
  }
  return { lastReviewPromptDate: null, reviewPromptCount: 0 };
}

async function saveReviewData(data: ReviewPromptData): Promise<void> {
  try {
    await AsyncStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    logger.error("Error saving review prompt data:", error);
  }
}

async function shouldPromptReview(): Promise<boolean> {
  const data = await getReviewData();

  if (data.reviewPromptCount >= MAX_PROMPT_COUNT) {
    return false;
  }

  if (data.lastReviewPromptDate) {
    const lastDate = new Date(data.lastReviewPromptDate).getTime();
    const now = Date.now();
    if (now - lastDate < NINETY_DAYS_MS) {
      return false;
    }
  }

  return true;
}

async function recordPrompt(): Promise<void> {
  const data = await getReviewData();
  data.lastReviewPromptDate = new Date().toISOString();
  data.reviewPromptCount += 1;
  await saveReviewData(data);

  trackEvent("review_prompt_shown", {
    promptCount: String(data.reviewPromptCount),
    lastPromptDate: data.lastReviewPromptDate,
  });
}

async function tryRequestReview(): Promise<void> {
  try {
    if (Platform.OS === "web") {
      return;
    }

    const canPrompt = await shouldPromptReview();
    if (!canPrompt) {
      return;
    }

    const isAvailable = await StoreReview.isAvailableAsync();
    if (!isAvailable) {
      return;
    }

    await StoreReview.requestReview();
    await recordPrompt();
    logger.log("[useAppReview] Review prompt shown successfully");
  } catch (error) {
    logger.error("[useAppReview] Error requesting review:", error);
  }
}

export function useAppReview() {
  const checkAfterRecipeGeneration = useCallback(async () => {
    try {
      const analyticsData = await analytics.getAllEvents();
      const totalRecipes = analyticsData.recipeGenerationEvents.length;

      if (totalRecipes >= MIN_RECIPES_GENERATED) {
        await tryRequestReview();
      }
    } catch (error) {
      logger.error("[useAppReview] Error checking recipe milestone:", error);
    }
  }, []);

  const checkAfterInventoryAdd = useCallback(async () => {
    try {
      const items = await storage.getInventory();

      if (items.length >= MIN_INVENTORY_ITEMS) {
        await tryRequestReview();
      }
    } catch (error) {
      logger.error("[useAppReview] Error checking inventory milestone:", error);
    }
  }, []);

  return {
    checkAfterRecipeGeneration,
    checkAfterInventoryAdd,
  };
}
