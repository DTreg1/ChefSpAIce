import { useQuery } from "@tanstack/react-query";
import { RecipeCard } from "@/components/recipe-card";
import { RecipeUpload } from "@/components/recipe-upload";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, BookOpen } from "lucide-react";
import { useState } from "react";
import type { Recipe } from "@shared/schema";
import { PageTransition } from "@/components/page-transition";
import { StaggerContainer, StaggerItem } from "@/components/stagger-children";
import { AnimatedCard } from "@/components/animated-card";
import { CardSkeleton } from "@/components/skeleton-loader";

export default function Cookbook() {
  const [filter, setFilter] = useState<"all" | "favorites">("all");
  
  const { data: recipes, isLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  const filteredRecipes = recipes?.filter(recipe => {
    if (filter === "favorites") {
      return recipe.isFavorite;
    }
    return true;
  }).sort((a, b) => {
    // Sort by rating (highest first), then by date (newest first)
    if (a.rating !== b.rating) {
      return (b.rating || 0) - (a.rating || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const favoriteCount = recipes?.filter(r => r.isFavorite).length || 0;

  return (
    <PageTransition className="h-full overflow-y-auto bg-muted">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">My Cookbook</h1>
                <p className="text-muted-foreground">
                  {filteredRecipes?.length || 0} recipe{filteredRecipes?.length !== 1 ? "s" : ""}
                  {filter === "favorites" && " • Favorites"}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <RecipeUpload />
              <Button
                variant={filter === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("all")}
                data-testid="button-filter-all"
              >
                All Recipes
                {recipes && recipes.length > 0 && (
                  <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                    {recipes.length}
                  </Badge>
                )}
              </Button>
              <Button
                variant={filter === "favorites" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("favorites")}
                data-testid="button-filter-favorites"
              >
                <Star className="w-4 h-4 mr-1" />
                Favorites
                {favoriteCount > 0 && (
                  <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                    {favoriteCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading recipes...</p>
          </div>
        ) : !filteredRecipes || filteredRecipes.length === 0 ? (
          <div className="py-12">
            {filter === "favorites" ? (
              <div className="flex flex-col items-center justify-center p-8" data-testid="empty-favorites">
                <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center mb-6">
                  <Star className="w-12 h-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No favorite recipes yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Star your favorite recipes to see them here
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center p-8" data-testid="empty-cookbook">
                <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                  <BookOpen className="w-12 h-12 text-primary" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No recipes yet</h3>
                <p className="text-muted-foreground text-center max-w-sm">
                  Generate recipes from your ingredients to build your cookbook
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {filteredRecipes.map((recipe: any) => (
              <RecipeCard
                key={recipe.id}
                id={recipe.id}
                title={recipe.title}
                prepTime={recipe.prepTime || undefined}
                cookTime={recipe.cookTime || undefined}
                servings={recipe.servings || undefined}
                ingredients={recipe.ingredients}
                instructions={recipe.instructions}
                usedIngredients={recipe.usedIngredients}
                missingIngredients={recipe.missingIngredients || []}
                ingredientMatches={recipe.ingredientMatches}
                isFavorite={recipe.isFavorite}
                rating={recipe.rating || undefined}
                showControls={true}
              />
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
