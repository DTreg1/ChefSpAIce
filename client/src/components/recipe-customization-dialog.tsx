import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChefHat, Clock, Users, Sparkles, GraduationCap, Utensils, ShoppingBasket } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import type { Recipe } from "@shared/schema";

interface RecipePreferences {
  timeConstraint: "quick" | "moderate" | "elaborate";
  servings: number;
  difficulty: "beginner" | "intermediate" | "advanced" | "expert";
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  creativity: number; // 1-10 scale
  onlyUseOnHand: boolean; // New field
}

interface RecipeCustomizationDialogProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
}

export function RecipeCustomizationDialog({ onRecipeGenerated }: RecipeCustomizationDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const [preferences, setPreferences] = useState<RecipePreferences>({
    timeConstraint: "moderate",
    servings: 4,
    difficulty: "intermediate",
    mealType: "dinner",
    creativity: 5,
    onlyUseOnHand: true, // Default to using only ingredients on hand
  });

  const generateRecipeMutation = useMutation({
    mutationFn: async (prefs: RecipePreferences) => {
      const response = await apiRequest("POST", "/api/recipes/generate", prefs);
      return await response.json();
    },
    onSuccess: async (recipe: Recipe) => {
      // First invalidate to get fresh inventory data
      await queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes?includeMatching=true"] });
      
      // Fetch the recipe with fresh inventory matching
      const recipesWithMatching = await queryClient.fetchQuery({
        queryKey: ["/api/recipes?includeMatching=true"],
        staleTime: 0,
      });
      
      // Find the newly generated recipe with updated matching
      const updatedRecipe = (recipesWithMatching as Recipe[])?.find((r: Recipe) => r.id === recipe.id);
      
      toast({
        title: "Recipe Generated!",
        description: `${recipe.title} - Availability validated`,
      });
      
      onRecipeGenerated?.(updatedRecipe || recipe);
      
      // Final invalidation to update UI
      await queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      setOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recipe",
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
      <DialogTrigger asChild>
        <Button variant="default" data-testid="button-custom-recipe">
          <Sparkles className="w-4 h-4 mr-2" />
          Custom Recipe
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" data-testid="dialog-recipe-customization">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ChefHat className="w-5 h-5 text-primary" />
            Customize Your Recipe
          </DialogTitle>
          <DialogDescription>
            Set your preferences to generate a personalized recipe
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Time Constraint */}
          <div className="space-y-2">
            <Label htmlFor="time" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Time Available
            </Label>
            <Select
              value={preferences.timeConstraint}
              onValueChange={(value: "quick" | "moderate" | "elaborate") =>
                setPreferences({ ...preferences, timeConstraint: value })
              }
            >
              <SelectTrigger id="time" data-testid="select-time-constraint">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="quick">Quick (under 30 min)</SelectItem>
                <SelectItem value="moderate">Moderate (30-60 min)</SelectItem>
                <SelectItem value="elaborate">Elaborate (over 60 min)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Servings */}
          <div className="space-y-2">
            <Label htmlFor="servings" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>1</span>
              <span>6</span>
              <span>12</span>
            </div>
          </div>

          {/* Difficulty */}
          <div className="space-y-2">
            <Label htmlFor="difficulty" className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4" />
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

          {/* Meal Type */}
          <div className="space-y-2">
            <Label htmlFor="meal-type" className="flex items-center gap-2">
              <Utensils className="w-4 h-4" />
              Meal Type
            </Label>
            <Select
              value={preferences.mealType}
              onValueChange={(value: "breakfast" | "lunch" | "dinner" | "snack" | "dessert") =>
                setPreferences({ ...preferences, mealType: value })
              }
            >
              <SelectTrigger id="meal-type" data-testid="select-meal-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
                <SelectItem value="dessert">Dessert</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Only Use Ingredients On Hand Toggle */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="only-on-hand" className="flex items-center gap-2">
                <ShoppingBasket className="w-4 h-4" />
                Only use ingredients on hand
              </Label>
              <Switch
                id="only-on-hand"
                checked={preferences.onlyUseOnHand}
                onCheckedChange={(checked) => 
                  setPreferences({ ...preferences, onlyUseOnHand: checked })
                }
                data-testid="switch-only-on-hand"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {preferences.onlyUseOnHand 
                ? "Recipe will only use ingredients from your inventory"
                : "Recipe may include ingredients you need to buy"}
            </p>
          </div>

          {/* Creativity Scale */}
          <div className="space-y-2">
            <Label htmlFor="creativity" className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Creativity: {getCreativityLabel(preferences.creativity)}
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
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={generateRecipeMutation.isPending}
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