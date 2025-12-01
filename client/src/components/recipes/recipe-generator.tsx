/**
 * Smart Recipe Generator Component
 * 
 * AI-powered one-click recipe generation using intelligent inventory analysis.
 * Automatically prioritizes expiring items and abundant ingredients to reduce waste.
 * 
 * Features:
 * - Intelligent Inventory Analysis: Tracks expiring items, high-quantity items, and categories
 * - Waste Reduction: Prioritizes items expiring within 3 days in recipe generation
 * - User Preferences: Remembers cuisine type, dietary restrictions, serving size, cooking time
 * - Auto-Generation: Optional automatic recipe creation when multiple items are expiring
 * - Multi-Variant Display: Supports default, quick (icon-only), and sidebar presentations
 * - Visual Indicators: Shows expiring item count with pulsing badge
 * 
 * Inventory Analysis:
 * - Expiring Items: Items with ≤3 days until expiration
 * - High Quantity: Items with quantity > 5
 * - Categories: Groups items by USDA food category
 * - Smart Prioritization: Balances expiring items with abundant ingredients
 * 
 * API Integration:
 * - POST /api/recipes/generate: Generate recipe with smart request payload
 *   Payload includes: onlyUseOnHand, prioritizeExpiring, expiringItems[], abundantItems[]
 * - Auto-invalidates: /api/food-items, /api/recipes queries after generation
 * 
 * State Management:
 * - localStorage: Persists user preferences (PREFERENCE_KEY)
 * - sessionStorage: Prevents duplicate auto-generation per day
 * - Query: Fetches inventory from /api/food-items
 * - Mutation: Generates recipe and invalidates queries on success
 * 
 * User Preferences (Persistent):
 * - lastCuisineType: Preferred cuisine style
 * - lastDietaryRestrictions: Dietary limitations array
 * - lastServingSize: Default serving count (default: 4)
 * - lastCookingTime: Max cooking duration in minutes (default: "30")
 * - preferExpiringItems: Prioritize expiring ingredients (default: true)
 * - autoGenerateOnExpiring: Auto-generate when >2 items expiring (default: false)
 * 
 * Component Variants:
 * - default: Full button with badge showing expiring count
 * - quick: Icon-only button for toolbars (responsive: icon on mobile, text on desktop)
 * - sidebar: Full-width button optimized for sidebar navigation
 * 
 * User Flow:
 * 1. Component analyzes inventory on mount (expiring, abundant, categories)
 * 2. User clicks Smart Recipe button (or auto-generates if enabled)
 * 3. Builds intelligent request with inventory analysis + preferences
 * 4. Sends POST /api/recipes/generate with smart payload
 * 5. AI generates recipe prioritizing expiring/abundant items
 * 6. Invalidates queries and fetches updated recipe with inventory matching
 * 7. Shows success toast with context-specific message
 * 8. Calls onRecipeGenerated callback with updated recipe
 * 
 * Auto-Generation Logic:
 * - Triggered when: autoGenerateOnExpiring=true AND >2 items expiring
 * - Frequency: Once per calendar day (tracked in sessionStorage)
 * - Session Key: `auto-generated-${dateString}`
 * 
 * Error Handling:
 * - No inventory: Button disabled with tooltip explanation
 * - Generation failure: Shows destructive toast with error message
 * - Network errors: Caught and displayed in user-friendly format
 * 
 * Performance:
 * - Inventory analysis recalculated on foodItems change (via Array.reduce)
 * - Auto-generation check via useEffect (triggers when conditions met)
 * - Query invalidation after successful generation
 * 
 * @example
 * // Default variant with full features
 * <SmartRecipeGenerator 
 *   onRecipeGenerated={(recipe) => navigate(`/recipes/${recipe.id}`)} 
 * />
 * 
 * @example
 * // Quick variant for header toolbar
 * <SmartRecipeGenerator variant="quick" />
 * 
 * @example
 * // Sidebar variant for navigation
 * <SmartRecipeGenerator variant="sidebar" />
 */

import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ChefHat, AlertTriangle, Loader2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import type { Recipe, UserInventory as FoodItem } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface SmartRecipeGeneratorProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
  variant?: "default" | "quick" | "sidebar";
}

// Store user preferences for smart recipe generation
const PREFERENCE_KEY = 'smart-recipe-preferences';

interface SmartRecipePreferences {
  lastCuisineType?: string;
  lastDietaryRestrictions?: string[];
  lastServingSize?: number;
  lastCookingTime?: string;
  preferExpiringItems?: boolean;
  autoGenerateOnExpiring?: boolean;
}

function getPreferences(): SmartRecipePreferences {
  try {
    const stored = localStorage.getItem(PREFERENCE_KEY);
    return stored ? JSON.parse(stored) : {
      preferExpiringItems: true,
      autoGenerateOnExpiring: false,
      lastServingSize: 4,
      lastCookingTime: "30",
    };
  } catch {
    return {
      preferExpiringItems: true,
      autoGenerateOnExpiring: false,
      lastServingSize: 4,
      lastCookingTime: "30",
    };
  }
}

function savePreferences(prefs: SmartRecipePreferences) {
  localStorage.setItem(PREFERENCE_KEY, JSON.stringify(prefs));
}

export function RecipeGenerator({ 
  onRecipeGenerated,
  variant = "default" 
}: SmartRecipeGeneratorProps) {
  const { toast } = useToast();
  const preferences = getPreferences();

  const { data: foodItemsResponse } = useQuery<{ data: FoodItem[], pagination?: unknown }>({
    queryKey: ["/api/food-items"],
  });

  // Extract the data array from the paginated response
  const foodItems = Array.isArray(foodItemsResponse) 
    ? foodItemsResponse 
    : foodItemsResponse?.data || [];

  // Calculate expiring items and analyze inventory
  const inventoryAnalysis = foodItems.reduce((acc, item) => {
    if (item.expirationDate) {
      const daysUntilExpiration = Math.floor(
        (new Date(item.expirationDate).getTime() - new Date().getTime()) / 
        (1000 * 60 * 60 * 24)
      );
      if (daysUntilExpiration <= 3) {
        acc.expiring.push(item);
        acc.expiringCount++;
      }
    }

    // Categorize by type for smart recipe suggestions
    if (item.foodCategory) {
      if (!acc.categories[item.foodCategory]) {
        acc.categories[item.foodCategory] = [];
      }
      acc.categories[item.foodCategory].push(item);
    }

    // Track high-quantity items (quantity is stored as text)
    if (parseFloat(item.quantity) > 5) {
      acc.highQuantity.push(item);
    }

    return acc;
  }, {
    expiring: [] as FoodItem[],
    expiringCount: 0,
    categories: {} as Record<string, FoodItem[]>,
    highQuantity: [] as FoodItem[]
  });

  const smartGenerateRecipeMutation = useMutation({
    mutationFn: async () => {
      // Build intelligent request based on inventory analysis
      const smartRequest: any = {
        onlyUseOnHand: true, // ALWAYS only use ingredients we have!
        prioritizeExpiring: preferences.preferExpiringItems && (inventoryAnalysis?.expiringCount ?? 0) > 0,
        servings: preferences.lastServingSize || 4,
        maxCookingTime: preferences.lastCookingTime || "30",
      };

      // Add expiring items to prioritize
      if ((inventoryAnalysis?.expiringCount ?? 0) > 0) {
        smartRequest.expiringItems = inventoryAnalysis!.expiring.map((item: FoodItem) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          daysUntilExpiration: Math.floor(
            (new Date(item.expirationDate!).getTime() - new Date().getTime()) / 
            (1000 * 60 * 60 * 24)
          )
        }));
      }

      // Add high quantity items to use up
      if ((inventoryAnalysis?.highQuantity?.length ?? 0) > 0) {
        smartRequest.abundantItems = inventoryAnalysis!.highQuantity.map((item: FoodItem) => ({
          name: item.name,
          quantity: item.quantity,
          unit: item.unit
        }));
      }

      // Add cuisine preference if remembered
      if (preferences.lastCuisineType) {
        smartRequest.cuisineType = preferences.lastCuisineType;
      }

      // Add dietary restrictions if remembered
      if (preferences.lastDietaryRestrictions?.length) {
        smartRequest.dietaryRestrictions = preferences.lastDietaryRestrictions;
      }

      const response = await apiRequest("/api/recipes/generate", "POST", smartRequest);
      return response;
    },
    onSuccess: async (recipe: Recipe) => {
      // Update preferences with any new settings from this generation
      const newPrefs = { ...preferences };
      savePreferences(newPrefs);

      // Invalidate queries for fresh data
      await queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });

      // Fetch the recipe with fresh inventory matching
      const recipesWithMatching = await queryClient.fetchQuery({
        queryKey: ["/api/recipes"],
        staleTime: 0,
      });

      // Find the newly generated recipe with updated matching
      const updatedRecipe = (recipesWithMatching as Recipe[])?.find((r: Recipe) => r.id === recipe.id);

      const smartMessage = (inventoryAnalysis?.expiringCount ?? 0) > 0
        ? `Recipe ready to cook now using ${inventoryAnalysis!.expiringCount} expiring items - no shopping needed!`
        : (inventoryAnalysis?.highQuantity?.length ?? 0) > 0
        ? `Recipe ready using your abundant ingredients - start cooking immediately!`
        : `Recipe ready using only what you have - no shopping required!`;

      toast({
        title: "🪄 " + recipe.title,
        description: smartMessage,
      });

      onRecipeGenerated?.(updatedRecipe || recipe);
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Generation Failed",
        description: error instanceof Error ? error.message : "Could not generate smart recipe",
        variant: "destructive",
      });
    },
  });

  const hasItems = (foodItems?.length || 0) > 0;
  const expiringCount = inventoryAnalysis?.expiringCount || 0;
  const isGenerating = smartGenerateRecipeMutation.isPending;

  // Auto-generate if preference is set and items are expiring
  useEffect(() => {
    if (
      preferences.autoGenerateOnExpiring &&
      expiringCount > 2 &&
      !isGenerating &&
      hasItems
    ) {
      // Auto-generate once per session when multiple items are expiring
      const sessionKey = `auto-generated-${new Date().toDateString()}`;
      if (!sessionStorage.getItem(sessionKey)) {
        sessionStorage.setItem(sessionKey, "true");
        smartGenerateRecipeMutation.mutate();
      }
    }
  }, [expiringCount, preferences.autoGenerateOnExpiring, hasItems]);

  // Render based on variant
  if (variant === "quick") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => smartGenerateRecipeMutation.mutate()}
              disabled={!hasItems || isGenerating}
              data-testid="button-smart-recipe-quick"
              variant="default"
              className="relative transition-all-smooth h-9 w-9 p-0 lg:w-auto lg:px-3"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 lg:mr-2 animate-spin" />
                  <span className="hidden lg:inline">Generating...</span>
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 lg:mr-2" />
                  <span className="hidden lg:inline">Smart Recipe</span>
                  {expiringCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  )}
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p className="font-semibold">Smart Recipe (1-click)</p>
            {expiringCount > 0 ? (
              <p className="text-xs">Create recipe using {expiringCount} expiring items - no shopping needed!</p>
            ) : (
              <p className="text-xs">Instant recipe using only what's in your kitchen</p>
            )}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "sidebar") {
    return (
      <Button
        onClick={() => smartGenerateRecipeMutation.mutate()}
        disabled={!hasItems || isGenerating}
        data-testid="button-smart-recipe-sidebar"
        size="sm"
        variant="ghost"
        className="w-full justify-start relative"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            <span>Generating...</span>
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            <span>Smart Recipe</span>
            {expiringCount > 0 && (
              <Badge variant="destructive" className="ml-auto">
                {expiringCount}
              </Badge>
            )}
          </>
        )}
      </Button>
    );
  }

  // Default variant
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => smartGenerateRecipeMutation.mutate()}
            disabled={!hasItems || isGenerating}
            data-testid="button-smart-recipe"
            size="default"
            variant={expiringCount > 0 ? "default" : "outline"}
            className="relative group"
          >
            {expiringCount > 0 && (
              <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-destructive animate-pulse" />
            )}
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                <span>Creating Smart Recipe...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2 group-hover:animate-pulse" />
                <span className="hidden sm:inline">Smart Recipe</span>
                <span className="sm:hidden">Smart</span>
                {expiringCount > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {expiringCount} expiring
                  </Badge>
                )}
              </>
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="space-y-1">
            <p className="font-semibold flex items-center gap-1">
              <Sparkles className="w-3 h-3" />
              One-Click Smart Recipe
            </p>
            {inventoryAnalysis && (
              <div className="text-xs space-y-0.5">
                {expiringCount > 0 && (
                  <p>• Uses {expiringCount} expiring items</p>
                )}
                {inventoryAnalysis.highQuantity.length > 0 && (
                  <p>• Uses abundant ingredients</p>
                )}
                {preferences.lastCuisineType && (
                  <p>• Prefers {preferences.lastCuisineType}</p>
                )}
                <p className="text-muted-foreground mt-1">
                  Generates instantly with your preferences
                </p>
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}