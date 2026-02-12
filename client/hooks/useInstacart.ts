/**
 * =============================================================================
 * INSTACART INTEGRATION HOOK
 * =============================================================================
 *
 * Provides integration with Instacart for ordering groceries.
 *
 * KEY EXPORTS:
 * - useInstacart: Hook for Instacart API interactions
 * - checkInstacartStatus: Check if Instacart is configured
 * - createShoppingLink: Create a shopping list link
 * - createRecipeLink: Create a recipe shopping link
 *
 * @module hooks/useInstacart
 */

import { useState, useCallback, useEffect } from "react";
import { Linking, Alert } from "react-native";
import { apiRequestJson, getApiUrl } from "@/lib/query-client";
import { logger } from "@/lib/logger";
import { storage } from "@/lib/storage";

interface InstacartProduct {
  name: string;
  quantity?: number;
  unit?: string;
}

interface InstacartStatus {
  configured: boolean;
  message: string;
}

interface InstacartLinkResponse {
  products_link_url?: string;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error) {
    const msg = error.message;
    const colonIndex = msg.indexOf(": ");
    if (colonIndex > 0) {
      return msg.substring(colonIndex + 2);
    }
    return msg;
  }
  return fallback;
}

export function useInstacart() {
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);

  const checkStatus = useCallback(async () => {
    try {
      setIsCheckingStatus(true);
      const baseUrl = getApiUrl();
      const response = await fetch(`${baseUrl}/api/instacart/status`, {
        credentials: "include",
      });

      if (response.ok) {
        const data: InstacartStatus = (await response.json()).data;
        setIsConfigured(data.configured);
      } else {
        setIsConfigured(false);
      }
    } catch (error) {
      logger.error("[Instacart] Status check failed:", error);
      setIsConfigured(false);
    } finally {
      setIsCheckingStatus(false);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const createShoppingLink = useCallback(
    async (
      products: InstacartProduct[],
      title?: string,
    ): Promise<string | null> => {
      if (!isConfigured) {
        Alert.alert(
          "Instacart Not Available",
          "Instacart integration is not configured. Please contact support.",
        );
        return null;
      }

      if (products.length === 0) {
        Alert.alert("No Items", "There are no items to order.");
        return null;
      }

      try {
        setIsLoading(true);

        const prefs = await storage.getPreferences();
        const body: Record<string, unknown> = {
          products,
          title: title || "ChefSpAIce Shopping List",
        };
        if (prefs.preferredRetailerKey) {
          body.retailer_key = prefs.preferredRetailerKey;
        }

        const data: InstacartLinkResponse = await apiRequestJson(
          "POST",
          "/api/instacart/products-link",
          body,
        );

        if (data.products_link_url) {
          return data.products_link_url;
        } else {
          throw new Error("Failed to create shopping link");
        }
      } catch (error) {
        logger.error("[Instacart] Create shopping link failed:", error);
        const message = extractErrorMessage(error, "Failed to create Instacart shopping link. Please try again.");
        Alert.alert("Error", message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured],
  );

  const createRecipeLink = useCallback(
    async (
      title: string,
      ingredients: InstacartProduct[],
      imageUrl?: string,
    ): Promise<string | null> => {
      if (!isConfigured) {
        Alert.alert(
          "Instacart Not Available",
          "Instacart integration is not configured. Please contact support.",
        );
        return null;
      }

      if (ingredients.length === 0) {
        Alert.alert("No Ingredients", "There are no ingredients to order.");
        return null;
      }

      try {
        setIsLoading(true);

        const prefs = await storage.getPreferences();
        const body: Record<string, unknown> = {
          title,
          ingredients,
          imageUrl,
        };
        if (prefs.preferredRetailerKey) {
          body.retailer_key = prefs.preferredRetailerKey;
        }

        const data: InstacartLinkResponse = await apiRequestJson(
          "POST",
          "/api/instacart/recipe",
          body,
        );

        if (data.products_link_url) {
          return data.products_link_url;
        } else {
          throw new Error("Failed to create recipe link");
        }
      } catch (error) {
        logger.error("[Instacart] Create recipe link failed:", error);
        const message = extractErrorMessage(error, "Failed to create Instacart recipe link. Please try again.");
        Alert.alert("Error", message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [isConfigured],
  );

  const openShoppingLink = useCallback(
    async (products: InstacartProduct[], title?: string) => {
      const url = await createShoppingLink(products, title);
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Error", "Unable to open Instacart. Please try again.");
        }
      }
    },
    [createShoppingLink],
  );

  const openRecipeLink = useCallback(
    async (
      title: string,
      ingredients: InstacartProduct[],
      imageUrl?: string,
    ) => {
      const url = await createRecipeLink(title, ingredients, imageUrl);
      if (url) {
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert("Error", "Unable to open Instacart. Please try again.");
        }
      }
    },
    [createRecipeLink],
  );

  return {
    isConfigured,
    isCheckingStatus,
    isLoading,
    checkStatus,
    createShoppingLink,
    createRecipeLink,
    openShoppingLink,
    openRecipeLink,
  };
}
