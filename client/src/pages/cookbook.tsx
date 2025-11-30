import { useQuery } from "@tanstack/react-query";
import { RecipeCard, RecipeUpload } from "@/components/recipes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, BookOpen, Utensils } from "lucide-react";
import { useState, useMemo } from "react";
import type { Recipe, UserAppliance } from "@shared/schema";
import { PageTransition, StaggerContainer, StaggerItem } from "@/components/layout";
import { AnimatedCard } from "@/components/cards";
import { BasicCardSkeleton } from "@/components/loaders";

export default function Cookbook() {
  const [filter, setFilter] = useState<"all" | "favorites" | "available_equipment">("all");
  
  const { data: recipes, isLoading: recipesLoading } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  const { data: userEquipmentResponse, isLoading: equipmentLoading } = useQuery({
    queryKey: ["/api/appliances/user"],
  });

  // Get the names of equipment the user owns
  const userEquipmentNames = useMemo(() => {
    const equipment = userEquipmentResponse as any;
    return equipment?.data?.map((eq: any) => eq.applianceName?.toLowerCase()) || [];
  }, [userEquipmentResponse]);

  const filteredRecipes = recipes?.filter(recipe => {
    if (filter === "favorites") {
      return recipe.isFavorite;
    }
    if (filter === "available_equipment") {
      // Show only recipes where all needed equipment is available
      if (!recipe.neededEquipment || recipe.neededEquipment.length === 0) {
        return true; // Recipe doesn't need any equipment
      }
      return recipe.neededEquipment.every(equipment => 
        userEquipmentNames.includes(equipment.toLowerCase())
      );
    }
    return true;
  }).sort((a, b) => {
    // Sort by rating (highest first), then by date (newest first)
    if (a.rating !== b.rating) {
      return (b.rating || 0) - (a.rating || 0);
    }
    const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return dateB - dateA;
  });

  const favoriteCount = recipes?.filter(r => r.isFavorite).length || 0;
  const availableEquipmentCount = recipes?.filter(recipe => {
    if (!recipe.neededEquipment || recipe.neededEquipment.length === 0) return true;
    return recipe.neededEquipment.every(equipment => 
      userEquipmentNames.includes(equipment.toLowerCase())
    );
  }).length || 0;

  const isLoading = recipesLoading || equipmentLoading;

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

            <div className="flex gap-2 flex-wrap">
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
              <Button
                variant={filter === "available_equipment" ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter("available_equipment")}
                data-testid="button-filter-equipment"
              >
                <Utensils className="w-4 h-4 mr-1" />
                Can Make
                {availableEquipmentCount > 0 && (
                  <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                    {availableEquipmentCount}
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
                neededEquipment={recipe.neededEquipment || []}
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
