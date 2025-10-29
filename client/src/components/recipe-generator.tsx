import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChefHat, AlertTriangle, Package } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Recipe, UserInventory as FoodItem } from "@shared/schema";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface RecipeGeneratorProps {
  onRecipeGenerated?: (recipe: Recipe) => void;
}

export function RecipeGenerator({ onRecipeGenerated }: RecipeGeneratorProps) {
  const { toast } = useToast();

  const { data: foodItems } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  // Calculate expiring items count
  const expiringCount = foodItems?.filter((item) => {
    if (!item.expirationDate) return false;
    const daysUntilExpiration = Math.floor(
      (new Date(item.expirationDate).getTime() - new Date().getTime()) / 
      (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiration <= 3;
  }).length || 0;

  const generateRecipeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/recipes/generate", {});
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
        description: `${recipe.title} - Created using your available ingredients${expiringCount > 0 ? ', prioritizing expiring items' : ''}`,
      });
      
      onRecipeGenerated?.(updatedRecipe || recipe);
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Error",
        description: error.message || "Failed to generate recipe",
        variant: "destructive",
      });
    },
  });

  const hasItems = (foodItems?.length || 0) > 0;

  const buttonContent = (
    <>
      <ChefHat className="w-4 h-4 mr-2" />
      {generateRecipeMutation.isPending 
        ? "Analyzing inventory..." 
        : expiringCount > 0 
          ? `Generate Recipe (${expiringCount} expiring)`
          : "Generate Recipe"}
    </>
  );

  const tooltipContent = hasItems
    ? expiringCount > 0
      ? `Generate a recipe prioritizing ${expiringCount} expiring item${expiringCount === 1 ? '' : 's'}`
      : `Generate a recipe using your ${foodItems?.length} available ingredient${foodItems?.length === 1 ? '' : 's'}`
    : "Add ingredients to your inventory first";

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={() => generateRecipeMutation.mutate()}
            disabled={!hasItems || generateRecipeMutation.isPending}
            data-testid="button-generate-recipe"
            size="default"
            variant={expiringCount > 0 ? "default" : "default"}
            className={expiringCount > 0 ? "relative" : ""}
          >
            {expiringCount > 0 && (
              <AlertTriangle className="absolute -top-1 -right-1 w-3 h-3 text-destructive animate-pulse" />
            )}
            {buttonContent}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Package className="w-3 h-3" />
            <span>{tooltipContent}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
