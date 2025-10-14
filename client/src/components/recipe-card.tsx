import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, Users, ChefHat, CheckCircle2, XCircle, Star, AlertCircle, ShoppingCart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { MealPlanningDialog } from "@/components/meal-planning-dialog";
import { ServingAdjuster } from "@/components/serving-adjuster";

interface IngredientMatch {
  ingredientName: string;
  neededQuantity: number;
  neededUnit: string;
  availableQuantity: number;
  availableUnit: string;
  hasEnough: boolean;
  percentageAvailable: number;
  shortage?: {
    quantity: number;
    unit: string;
  };
}

interface RecipeCardProps {
  id?: string;
  title: string;
  prepTime?: string;
  cookTime?: string;
  servings?: number;
  ingredients: string[];
  instructions: string[];
  usedIngredients: string[];
  missingIngredients?: string[];
  ingredientMatches?: IngredientMatch[];
  isFavorite?: boolean;
  rating?: number;
  showControls?: boolean;
}

export function RecipeCard({
  id,
  title,
  prepTime,
  cookTime,
  servings,
  ingredients,
  instructions,
  usedIngredients,
  missingIngredients = [],
  ingredientMatches,
  isFavorite = false,
  rating,
  showControls = false,
}: RecipeCardProps) {
  const { toast } = useToast();
  const [localRating, setLocalRating] = useState(rating || 0);
  const [localFavorite, setLocalFavorite] = useState(isFavorite);
  const [adjustedIngredients, setAdjustedIngredients] = useState(ingredients);
  const [currentServings, setCurrentServings] = useState(servings || 4);

  const updateMutation = useMutation({
    mutationFn: async (updates: { isFavorite?: boolean; rating?: number }) => {
      if (!id) throw new Error("Recipe ID required");
      return await apiRequest("PATCH", `/api/recipes/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes?includeMatching=true"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update recipe",
        variant: "destructive",
      });
    },
  });

  const toggleFavorite = () => {
    const newFavorite = !localFavorite;
    setLocalFavorite(newFavorite);
    updateMutation.mutate({ isFavorite: newFavorite });
  };

  const setRating = (newRating: number) => {
    setLocalRating(newRating);
    updateMutation.mutate({ rating: newRating });
  };

  const handleServingsChange = (newServings: number, adjustedIngs: string[]) => {
    setCurrentServings(newServings);
    setAdjustedIngredients(adjustedIngs);
  };

  return (
    <Card className="glass-morph hover-elevate active-elevate-2 card-hover border-2 border-primary/20 shadow-glass hover:shadow-glass-hover transition-morph" data-testid="card-recipe">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-2xl font-serif font-semibold text-foreground" data-testid="text-recipe-title">
            {title}
          </CardTitle>
          <Badge variant="secondary" className="flex-shrink-0 gap-1" data-testid="badge-ai-generated">
            <ChefHat className="w-3 h-3" />
            AI Generated
          </Badge>
        </div>

        {showControls && id && (
          <div className="flex items-center gap-4 mt-3 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleFavorite}
              data-testid="button-toggle-favorite"
              className={localFavorite ? "border-amber-500 text-amber-600" : ""}
            >
              <Star className={`w-4 h-4 ${localFavorite ? "fill-amber-500" : ""}`} />
            </Button>
            
            <div className="flex gap-1" data-testid="rating-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  className="transition-colors"
                  data-testid={`button-star-${star}`}
                >
                  <Star
                    className={`w-5 h-5 ${
                      star <= localRating
                        ? "fill-amber-500 text-amber-500"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>

            <MealPlanningDialog 
              recipeId={id} 
              recipeTitle={title}
              defaultServings={servings}
            />
          </div>
        )}

        <div className="flex items-center gap-4 mt-3 flex-wrap">
          {prepTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-prep-time">
              <Clock className="w-4 h-4" />
              <span>Prep: {prepTime}</span>
            </div>
          )}
          {cookTime && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-cook-time">
              <Clock className="w-4 h-4" />
              <span>Cook: {cookTime}</span>
            </div>
          )}
          {servings && (
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground" data-testid="text-servings">
              <Users className="w-4 h-4" />
              <span>{servings} servings</span>
            </div>
          )}
          {ingredientMatches && (
            <Badge 
              variant={missingIngredients.length === 0 ? "default" : "destructive"}
              className="gap-1"
              data-testid="badge-missing-ingredients"
            >
              <ShoppingCart className="w-3 h-3" />
              {missingIngredients.length === 0 ? "All ingredients available" : `${missingIngredients.length} missing`}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {servings && (
          <ServingAdjuster
            originalServings={servings}
            ingredients={ingredients}
            onServingsChange={handleServingsChange}
          />
        )}

        <Separator />

        <div>
          <h3 className="font-semibold text-base mb-3 text-foreground">Ingredients</h3>
          <ul className="space-y-2">
            {adjustedIngredients.map((ingredient, idx) => {
              // Use enhanced matching data if available
              if (ingredientMatches && ingredientMatches[idx]) {
                const match = ingredientMatches[idx];
                const getStatusIcon = () => {
                  if (match.hasEnough) {
                    return <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />;
                  } else if (match.percentageAvailable > 50) {
                    return <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />;
                  } else if (match.percentageAvailable > 0) {
                    return <AlertCircle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />;
                  } else {
                    return <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />;
                  }
                };

                const getQuantityText = () => {
                  if (match.hasEnough) {
                    return null;
                  }
                  if (match.shortage) {
                    return (
                      <span className="text-xs text-red-600 ml-2">
                        (need {match.shortage.quantity.toFixed(1)} {match.shortage.unit})
                      </span>
                    );
                  }
                  if (match.percentageAvailable === -1) {
                    return (
                      <span className="text-xs text-orange-600 ml-2">
                        (have {match.availableQuantity} {match.availableUnit})
                      </span>
                    );
                  }
                  return null;
                };

                return (
                  <li
                    key={idx}
                    className="flex items-start gap-2 text-base"
                    data-testid={`text-ingredient-${idx}`}
                  >
                    {getStatusIcon()}
                    <div className="flex-1">
                      <span className={!match.hasEnough ? "text-muted-foreground" : ""}>
                        {ingredient}
                      </span>
                      {getQuantityText()}
                      {match.percentageAvailable > 0 && match.percentageAvailable < 100 && match.percentageAvailable !== -1 && (
                        <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                          <div 
                            className="bg-amber-600 h-1.5 rounded-full transition-all"
                            style={{ width: `${match.percentageAvailable}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </li>
                );
              }
              
              // Fall back to original logic if no matches data
              const isAvailable = usedIngredients.some(used => 
                ingredient.toLowerCase().includes(used.toLowerCase())
              );
              const isMissing = missingIngredients.some(missing => 
                ingredient.toLowerCase().includes(missing.toLowerCase())
              );

              return (
                <li
                  key={idx}
                  className="flex items-start gap-2 text-base"
                  data-testid={`text-ingredient-${idx}`}
                >
                  {isAvailable && (
                    <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                  )}
                  {isMissing && (
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                  )}
                  {!isAvailable && !isMissing && (
                    <span className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span className={isMissing ? "text-muted-foreground line-through" : ""}>
                    {ingredient}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        <Separator />

        <div>
          <h3 className="font-semibold text-base mb-3 text-foreground">Instructions</h3>
          <ol className="space-y-3">
            {instructions.map((instruction, idx) => (
              <li
                key={idx}
                className="flex gap-3 text-base leading-relaxed"
                data-testid={`text-instruction-${idx}`}
              >
                <span className="font-semibold text-primary flex-shrink-0">{idx + 1}.</span>
                <span>{instruction}</span>
              </li>
            ))}
          </ol>
        </div>
      </CardContent>
    </Card>
  );
}
