import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChefHat,
  Clock,
  Users,
  Sparkles,
  GraduationCap,
  Utensils,
  ShoppingBasket,
  ChevronDown,
  ChevronUp,
  Zap,
  Loader2,
  Package,
  X,
} from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Recipe, UserInventory as FoodItem } from "@shared/schema";
import { cn } from "@/lib/utils";

interface RecipePreferences {
  timeConstraint: "quick" | "moderate" | "elaborate";
  servings: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  creativity: number;
  onlyUseOnHand: boolean;
  dietaryRestrictions?: string[];
  cuisineType?: string;
  specificItems?: string[];
}

const PREF_KEY = "unified-recipe-preferences";
const SMART_PREF_KEY = "smart-recipe-preferences";

interface SmartRecipePreferences {
  lastCuisineType?: string;
  lastDietaryRestrictions?: string[];
  lastServingSize?: number;
  lastCookingTime?: string;
  preferExpiringItems?: boolean;
}

function getStoredPreferences(): Partial<RecipePreferences> {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function getSmartPreferences(): SmartRecipePreferences {
  try {
    const stored = localStorage.getItem(SMART_PREF_KEY);
    return stored
      ? JSON.parse(stored)
      : {
          preferExpiringItems: true,
          lastServingSize: 4,
          lastCookingTime: "30",
        };
  } catch {
    return {
      preferExpiringItems: true,
      lastServingSize: 4,
      lastCookingTime: "30",
    };
  }
}

function storePreferences(prefs: RecipePreferences) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

function getSmartDefaults(): RecipePreferences {
  const hour = new Date().getHours();
  const stored = getStoredPreferences();

  let mealType: RecipePreferences["mealType"] = "dinner";
  let timeConstraint: RecipePreferences["timeConstraint"] = "moderate";

  if (hour >= 5 && hour < 11) {
    mealType = "breakfast";
    timeConstraint = "quick";
  } else if (hour >= 11 && hour < 14) {
    mealType = "lunch";
    timeConstraint = "quick";
  } else if (hour >= 14 && hour < 17) {
    mealType = "snack";
    timeConstraint = "quick";
  }

  return {
    timeConstraint: stored.timeConstraint || timeConstraint,
    servings: stored.servings || 4,
    difficulty: stored.difficulty || "intermediate",
    mealType: stored.mealType || mealType,
    creativity: stored.creativity ?? 5,
    onlyUseOnHand: stored.onlyUseOnHand ?? true,
    dietaryRestrictions: stored.dietaryRestrictions || [],
    cuisineType: stored.cuisineType || undefined,
    specificItems: stored.specificItems || [],
  };
}

interface UnifiedRecipeDialogProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function UnifiedRecipeDialog({
  onRecipeGenerated,
  open: externalOpen,
  onOpenChange: externalOnOpenChange,
}: UnifiedRecipeDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);

  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const { toast } = useToast();

  const [preferences, setPreferences] =
    useState<RecipePreferences>(getSmartDefaults());

  const { data: foodItemsResponse } = useQuery<{
    data: FoodItem[];
    pagination?: unknown;
  }>({
    queryKey: ["/api/food-items"],
  });

  // Extract the data array from the paginated response
  const foodItems = Array.isArray(foodItemsResponse)
    ? foodItemsResponse
    : foodItemsResponse?.data || [];

  // Calculate expiring items and analyze inventory
  const inventoryAnalysis = foodItems.reduce(
    (
      acc: {
        expiring: FoodItem[];
        expiringCount: number;
        highQuantity: FoodItem[];
      },
      item: FoodItem,
    ) => {
      if (item.expirationDate) {
        const daysUntilExpiration = Math.floor(
          (new Date(item.expirationDate).getTime() - new Date().getTime()) /
            (1000 * 60 * 60 * 24),
        );
        if (daysUntilExpiration <= 3) {
          acc.expiring.push(item);
          acc.expiringCount++;
        }
      }

      if (parseFloat(item.quantity) > 5) {
        acc.highQuantity.push(item);
      }

      return acc;
    },
    {
      expiring: [] as FoodItem[],
      expiringCount: 0,
      highQuantity: [] as FoodItem[],
    },
  );

  const smartPreferences = getSmartPreferences();
  const hasItems = foodItems.length > 0;
  const expiringCount = inventoryAnalysis?.expiringCount || 0;

  // 1-Click Smart Generation Mutation
  const smartGenerateRecipeMutation = useMutation({
    mutationFn: async () => {
      const smartRequest: any = {
        onlyUseOnHand: true,
        prioritizeExpiring:
          smartPreferences.preferExpiringItems && expiringCount > 0,
        servings: smartPreferences.lastServingSize || 4,
        maxCookingTime: smartPreferences.lastCookingTime || "30",
      };

      if (expiringCount > 0) {
        smartRequest.expiringItems = inventoryAnalysis.expiring.map(
          (item: FoodItem) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            daysUntilExpiration: Math.floor(
              (new Date(item.expirationDate!).getTime() -
                new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            ),
          }),
        );
      }

      if ((inventoryAnalysis.highQuantity.length ?? 0) > 0) {
        smartRequest.abundantItems = inventoryAnalysis.highQuantity.map(
          (item: FoodItem) => ({
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
          }),
        );
      }

      if (smartPreferences.lastCuisineType) {
        smartRequest.cuisineType = smartPreferences.lastCuisineType;
      }

      if (smartPreferences.lastDietaryRestrictions?.length) {
        smartRequest.dietaryRestrictions =
          smartPreferences.lastDietaryRestrictions;
      }

      const response = await apiRequest(
        "/api/recipes/generate",
        "POST",
        smartRequest,
      );
      return response;
    },
    onSuccess: async (recipe: Recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });

      const recipesWithMatching = await queryClient.fetchQuery({
        queryKey: ["/api/recipes"],
        staleTime: 0,
      });

      const updatedRecipe = (recipesWithMatching as Recipe[])?.find(
        (r: Recipe) => r.id === recipe.id,
      );

      const smartMessage =
        expiringCount > 0
          ? `Using ${expiringCount} expiring item${expiringCount > 1 ? "s" : ""}`
          : "Using only what's in your kitchen";

      toast({
        title: "🪄 " + recipe.title,
        description: smartMessage,
      });

      onRecipeGenerated?.(updatedRecipe || recipe);
      setOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Could not generate smart recipe";
      toast({
        title: "Generation Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Custom Generation Mutation
  const generateRecipeMutation = useMutation({
    mutationFn: async (prefs: RecipePreferences) => {
      storePreferences(prefs);

      const response = await apiRequest("/api/recipes/generate", "POST", prefs);
      return response;
    },
    onSuccess: async (recipe: Recipe) => {
      await queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });

      const recipesWithMatching = await queryClient.fetchQuery({
        queryKey: ["/api/recipes"],
        staleTime: 0,
      });

      const updatedRecipe = (recipesWithMatching as Recipe[])?.find(
        (r: Recipe) => r.id === recipe.id,
      );

      toast({
        title: "Recipe Generated!",
        description: `${recipe.title} - Customized to your preferences`,
      });

      onRecipeGenerated?.(updatedRecipe || recipe);
      setOpen(false);
    },
    onError: (error: unknown) => {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to generate recipe";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleSmartGenerate = () => {
    smartGenerateRecipeMutation.mutate();
  };

  const handleCustomGenerate = () => {
    generateRecipeMutation.mutate(preferences);
  };

  const getTimeLabel = (value: string) => {
    switch (value) {
      case "quick":
        return "< 30 min";
      case "moderate":
        return "30-60 min";
      case "elaborate":
        return "> 60 min";
      default:
        return value;
    }
  };

  const getCreativityLabel = (value: number) => {
    if (value <= 3) return "Traditional";
    if (value <= 7) return "Balanced";
    return "Experimental";
  };

  const toggleFoodItem = (itemName: string) => {
    setPreferences((prev) => {
      const current = prev.specificItems || [];
      const isSelected = current.includes(itemName);
      return {
        ...prev,
        specificItems: isSelected
          ? current.filter((name) => name !== itemName)
          : [...current, itemName],
      };
    });
  };

  const isGenerating =
    smartGenerateRecipeMutation.isPending || generateRecipeMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        className="sm:max-w-md bg-muted"
        data-testid="dialog-unified-recipe"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Generate Recipe
          </DialogTitle>
          <DialogDescription>
            Generate instantly or customize your preferences
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* 1-Click Smart Generate Button */}
          <div className="flex flex-col gap-2 pb-4 border-b">
            <Button
              onClick={handleSmartGenerate}
              disabled={!hasItems || isGenerating}
              data-testid="button-smart-generate"
              size="lg"
              className="w-full relative"
            >
              {smartGenerateRecipeMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Smart Recipe...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  1-Click Generate
                  {expiringCount > 0 && (
                    <Badge variant="destructive" className="ml-auto">
                      {expiringCount} expiring
                    </Badge>
                  )}
                </>
              )}
            </Button>
            {expiringCount > 0 ? (
              <p className="text-xs text-muted-foreground text-center">
                Uses {expiringCount} expiring item{expiringCount > 1 ? "s" : ""}{" "}
                - no shopping needed
              </p>
            ) : (
              <p className="text-xs text-muted-foreground text-center">
                Instant recipe using only what's in your kitchen
              </p>
            )}
          </div>

          {/* Customization Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCustomization(!showCustomization)}
            className="w-full justify-between"
            data-testid="button-toggle-customization"
          >
            <span>Customize Recipe Options</span>
            {showCustomization ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </Button>

          {/* Customization Options */}
          {showCustomization && (
            <div
              className={cn(
                "space-y-4 pt-2",
                "animate-in slide-in-from-top-2 duration-200",
              )}
            >
              {/* Time Constraint */}
              <div className="space-y-2">
                <Label
                  htmlFor="time"
                  className="flex items-center gap-2 text-sm"
                >
                  <Clock className="w-3 h-3" />
                  Time Available
                </Label>
                <div className="flex gap-2">
                  {(["quick", "moderate", "elaborate"] as const).map((time) => (
                    <Button
                      key={time}
                      variant={
                        preferences.timeConstraint === time
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() =>
                        setPreferences({ ...preferences, timeConstraint: time })
                      }
                      className="flex-1"
                      data-testid={`button-time-${time}`}
                    >
                      {getTimeLabel(time)}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Meal Type */}
              <div className="space-y-2">
                <Label
                  htmlFor="meal-type"
                  className="flex items-center gap-2 text-sm"
                >
                  <Utensils className="w-3 h-3" />
                  Meal Type
                </Label>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      "breakfast",
                      "lunch",
                      "dinner",
                      "snack",
                      "dessert",
                    ] as const
                  ).map((meal) => (
                    <Badge
                      key={meal}
                      variant={
                        preferences.mealType === meal ? "default" : "outline"
                      }
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() =>
                        setPreferences({ ...preferences, mealType: meal })
                      }
                      data-testid={`badge-meal-${meal}`}
                    >
                      {meal.charAt(0).toUpperCase() + meal.slice(1)}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Servings */}
              <div className="space-y-2">
                <Label
                  htmlFor="servings"
                  className="flex items-center gap-2 text-sm"
                >
                  <Users className="w-3 h-3" />
                  Servings: {preferences.servings}
                </Label>
                <Slider
                  id="servings"
                  min={1}
                  max={12}
                  step={1}
                  value={[preferences.servings]}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, servings: value[0] })
                  }
                  className="w-full"
                  data-testid="slider-servings"
                />
              </div>

              {/* Only Use On Hand */}
              <div className="flex items-center justify-between">
                <Label
                  htmlFor="on-hand"
                  className="flex items-center gap-2 text-sm"
                >
                  <ShoppingBasket className="w-3 h-3" />
                  Only use ingredients I have
                </Label>
                <Switch
                  id="on-hand"
                  checked={preferences.onlyUseOnHand}
                  onCheckedChange={(checked) =>
                    setPreferences({ ...preferences, onlyUseOnHand: checked })
                  }
                  data-testid="switch-only-on-hand"
                />
              </div>

              {/* Specific Food Items Selection */}
              {foodItems && foodItems.length > 0 && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2 text-sm">
                    <Package className="w-3 h-3" />
                    Specific Foods to Use (
                    {preferences.specificItems?.length || 0} selected)
                  </Label>
                  <ScrollArea className="h-40 border rounded-md p-2">
                    <div className="flex flex-wrap gap-1">
                      {foodItems.map((item) => {
                        const isSelected =
                          preferences.specificItems?.includes(item.name) ||
                          false;
                        return (
                          <Badge
                            key={item.id}
                            variant={isSelected ? "default" : "outline"}
                            className="cursor-pointer hover-elevate active-elevate-2"
                            onClick={() => toggleFoodItem(item.name)}
                            data-testid={`badge-food-${item.id}`}
                          >
                            {item.name}
                            {isSelected && <X className="w-3 h-3 ml-1" />}
                          </Badge>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Difficulty */}
              <div className="space-y-2">
                <Label
                  htmlFor="difficulty"
                  className="flex items-center gap-2 text-sm"
                >
                  <GraduationCap className="w-3 h-3" />
                  Difficulty Level
                </Label>
                <Select
                  value={preferences.difficulty}
                  onValueChange={(
                    value: "beginner" | "intermediate" | "advanced" | "expert",
                  ) => setPreferences({ ...preferences, difficulty: value })}
                >
                  <SelectTrigger
                    id="difficulty"
                    data-testid="select-difficulty"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="beginner">Beginner</SelectItem>
                    <SelectItem value="intermediate">Intermediate</SelectItem>
                    <SelectItem value="advanced">Advanced</SelectItem>
                    <SelectItem value="expert">Expert Chef</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Creativity Slider */}
              <div className="space-y-2">
                <Label
                  htmlFor="creativity"
                  className="flex items-center gap-2 text-sm"
                >
                  <Sparkles className="w-3 h-3" />
                  Creativity: {getCreativityLabel(preferences.creativity)} (
                  {preferences.creativity})
                </Label>
                <Slider
                  id="creativity"
                  min={1}
                  max={10}
                  step={1}
                  value={[preferences.creativity]}
                  onValueChange={(value) =>
                    setPreferences({ ...preferences, creativity: value[0] })
                  }
                  className="w-full"
                  data-testid="slider-creativity"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Traditional</span>
                  <span>Balanced</span>
                  <span>Experimental</span>
                </div>
              </div>

              {/* Cuisine Type */}
              <div className="space-y-2">
                <Label htmlFor="cuisine" className="text-sm">
                  Cuisine Preference
                </Label>
                <Select
                  value={preferences.cuisineType || "any"}
                  onValueChange={(value) =>
                    setPreferences({
                      ...preferences,
                      cuisineType: value === "any" ? undefined : value,
                    })
                  }
                >
                  <SelectTrigger id="cuisine" data-testid="select-cuisine">
                    <SelectValue placeholder="Any cuisine" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any Cuisine</SelectItem>
                    <SelectItem value="italian">Italian</SelectItem>
                    <SelectItem value="asian">Asian</SelectItem>
                    <SelectItem value="mexican">Mexican</SelectItem>
                    <SelectItem value="american">American</SelectItem>
                    <SelectItem value="french">French</SelectItem>
                    <SelectItem value="mediterranean">Mediterranean</SelectItem>
                    <SelectItem value="indian">Indian</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Custom Generate Button */}
              <Button
                onClick={handleCustomGenerate}
                disabled={isGenerating}
                data-testid="button-custom-generate"
                className="w-full"
              >
                {generateRecipeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <ChefHat className="w-4 h-4 mr-2" />
                    Generate Custom Recipe
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
