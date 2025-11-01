import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import { ChefHat, Clock, Users, Sparkles, GraduationCap, Utensils, ShoppingBasket, ChevronDown, ChevronUp, Zap } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import type { Recipe } from "@shared/schema";
import { cn } from "@/lib/utils";

interface RecipePreferences {
  timeConstraint: "quick" | "moderate" | "elaborate";
  servings: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  creativity: number; // 1-10 scale
  onlyUseOnHand: boolean;
  dietaryRestrictions?: string[];
  cuisineType?: string;
}

// Store preferences in localStorage for persistence
const PREF_KEY = 'recipe-customization-preferences';

function getStoredPreferences(): Partial<RecipePreferences> {
  try {
    const stored = localStorage.getItem(PREF_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch {
    return {};
  }
}

function storePreferences(prefs: RecipePreferences) {
  localStorage.setItem(PREF_KEY, JSON.stringify(prefs));
}

// Smart defaults based on time of day
function getSmartDefaults(): RecipePreferences {
  const hour = new Date().getHours();
  const stored = getStoredPreferences();
  
  let mealType: RecipePreferences['mealType'] = 'dinner';
  let timeConstraint: RecipePreferences['timeConstraint'] = 'moderate';
  
  if (hour >= 5 && hour < 11) {
    mealType = 'breakfast';
    timeConstraint = 'quick';
  } else if (hour >= 11 && hour < 14) {
    mealType = 'lunch';
    timeConstraint = 'quick';
  } else if (hour >= 14 && hour < 17) {
    mealType = 'snack';
    timeConstraint = 'quick';
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
  };
}

interface RecipeCustomizationDialogProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function RecipeCustomizationDialog({ 
  onRecipeGenerated, 
  open: externalOpen, 
  onOpenChange: externalOnOpenChange
}: RecipeCustomizationDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = externalOnOpenChange || setInternalOpen;
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<RecipePreferences>(getSmartDefaults());

  // Quick preset buttons
  const quickPresets = [
    { 
      label: "15-min Quick", 
      icon: Zap,
      apply: () => setPreferences(prev => ({ 
        ...prev, 
        timeConstraint: "quick", 
        difficulty: "beginner" 
      }))
    },
    { 
      label: "Family Dinner", 
      icon: Users,
      apply: () => setPreferences(prev => ({ 
        ...prev, 
        servings: 6, 
        mealType: "dinner",
        difficulty: "intermediate" 
      }))
    },
    { 
      label: "Creative", 
      icon: Sparkles,
      apply: () => setPreferences(prev => ({ 
        ...prev, 
        creativity: 8,
        difficulty: "advanced" 
      }))
    },
  ];

  const generateRecipeMutation = useMutation({
    mutationFn: async (prefs: RecipePreferences) => {
      // Store preferences for next time
      storePreferences(prefs);
      
      const response = await apiRequest("POST", "/api/recipes/generate", prefs);
      return await response.json();
    },
    onSuccess: async (recipe: Recipe) => {
      // First invalidate to get fresh inventory data
      await queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      
      // Fetch the recipe with fresh inventory matching
      const recipesWithMatching = await queryClient.fetchQuery({
        queryKey: ["/api/recipes"],
        staleTime: 0,
      });
      
      // Find the newly generated recipe with updated matching
      const updatedRecipe = (recipesWithMatching as Recipe[])?.find((r: Recipe) => r.id === recipe.id);
      
      toast({
        title: "Recipe Generated!",
        description: `${recipe.title} - Customized to your preferences`,
      });
      
      onRecipeGenerated?.(updatedRecipe || recipe);
      setOpen(false);
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate recipe",
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    generateRecipeMutation.mutate(preferences);
  };

  const getTimeLabel = (value: string) => {
    switch (value) {
      case "quick": return "< 30 min";
      case "moderate": return "30-60 min";
      case "elaborate": return "> 60 min";
      default: return value;
    }
  };

  const getCreativityLabel = (value: number) => {
    if (value <= 3) return "Traditional";
    if (value <= 7) return "Balanced";
    return "Experimental";
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md bg-muted" data-testid="dialog-recipe-customization">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Customize Your Recipe
          </DialogTitle>
          <DialogDescription>
            Quick setup or fine-tune your preferences
          </DialogDescription>
        </DialogHeader>

        {/* Quick Presets */}
        <div className="flex gap-2 pb-2">
          {quickPresets.map((preset) => (
            <Button
              key={preset.label}
              variant="outline"
              size="sm"
              onClick={preset.apply}
              className="flex-1"
              data-testid={`button-preset-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
            >
              <preset.icon className="w-3 h-3 mr-1" />
              <span className="text-xs">{preset.label}</span>
            </Button>
          ))}
        </div>

        <div className="space-y-4 py-2">
          {/* Essential Options - Always Visible */}
          <div className="space-y-4 pb-2 border-b">
            {/* Time Constraint */}
            <div className="space-y-2">
              <Label htmlFor="time" className="flex items-center gap-2 text-sm">
                <Clock className="w-3 h-3" />
                Time Available
              </Label>
              <div className="flex gap-2">
                {(["quick", "moderate", "elaborate"] as const).map((time) => (
                  <Button
                    key={time}
                    variant={preferences.timeConstraint === time ? "default" : "outline"}
                    size="sm"
                    onClick={() => setPreferences({ ...preferences, timeConstraint: time })}
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
              <Label htmlFor="meal-type" className="flex items-center gap-2 text-sm">
                <Utensils className="w-3 h-3" />
                Meal Type
              </Label>
              <div className="flex flex-wrap gap-1">
                {(["breakfast", "lunch", "dinner", "snack", "dessert"] as const).map((meal) => (
                  <Badge
                    key={meal}
                    variant={preferences.mealType === meal ? "default" : "outline"}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => setPreferences({ ...preferences, mealType: meal })}
                    data-testid={`badge-meal-${meal}`}
                  >
                    {meal.charAt(0).toUpperCase() + meal.slice(1)}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Servings */}
            <div className="space-y-2">
              <Label htmlFor="servings" className="flex items-center gap-2 text-sm">
                <Users className="w-3 h-3" />
                Servings: {preferences.servings}
              </Label>
              <Slider
                id="servings"
                min={1}
                max={12}
                step={1}
                value={[preferences.servings]}
                onValueChange={(value) => setPreferences({ ...preferences, servings: value[0] })}
                className="w-full"
                data-testid="slider-servings"
              />
            </div>

            {/* Only Use On Hand */}
            <div className="flex items-center justify-between">
              <Label htmlFor="on-hand" className="flex items-center gap-2 text-sm">
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
          </div>

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="w-full justify-between"
            data-testid="button-toggle-advanced"
          >
            <span>Advanced Options</span>
            {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>

          {/* Advanced Options - Collapsible */}
          {showAdvanced && (
            <div className={cn(
              "space-y-4 pt-2 border-t",
              "animate-in slide-in-from-top-2 duration-200"
            )}>
              {/* Difficulty */}
              <div className="space-y-2">
                <Label htmlFor="difficulty" className="flex items-center gap-2 text-sm">
                  <GraduationCap className="w-3 h-3" />
                  Difficulty Level
                </Label>
                <Select
                  value={preferences.difficulty}
                  onValueChange={(value: "beginner" | "intermediate" | "advanced" | "expert") =>
                    setPreferences({ ...preferences, difficulty: value })
                  }
                >
                  <SelectTrigger id="difficulty" data-testid="select-difficulty">
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
                <Label htmlFor="creativity" className="flex items-center gap-2 text-sm">
                  <Sparkles className="w-3 h-3" />
                  Creativity: {getCreativityLabel(preferences.creativity)} ({preferences.creativity})
                </Label>
                <Slider
                  id="creativity"
                  min={1}
                  max={10}
                  step={1}
                  value={[preferences.creativity]}
                  onValueChange={(value) => setPreferences({ ...preferences, creativity: value[0] })}
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
                    setPreferences({ ...preferences, cuisineType: value === "any" ? undefined : value })
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
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={generateRecipeMutation.isPending}
            data-testid="button-generate"
          >
            {generateRecipeMutation.isPending ? (
              <>Generating...</>
            ) : (
              <>
                <ChefHat className="w-4 h-4 mr-2" />
                Generate Recipe
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}