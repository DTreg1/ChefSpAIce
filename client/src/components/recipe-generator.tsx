import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, FoodItem } from "@shared/schema";

interface RecipeGeneratorProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
}

export function RecipeGenerator({ onRecipeGenerated }: RecipeGeneratorProps) {
  const { toast } = useToast();

  const { data: foodItems } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const generateRecipeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recipes/generate", {});
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
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recipe",
        variant: "destructive",
      });
    },
  });

  const hasItems = (foodItems?.length || 0) > 0;

  return (
    <Button
      onClick={() => generateRecipeMutation.mutate()}
      disabled={!hasItems || generateRecipeMutation.isPending}
      data-testid="button-generate-recipe"
      size="default"
    >
      <ChefHat className="w-4 h-4 mr-2" />
      {generateRecipeMutation.isPending ? "Generating..." : "Generate Recipe"}
    </Button>
  );
}
