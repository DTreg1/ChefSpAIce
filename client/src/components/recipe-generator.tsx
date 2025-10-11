import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChefHat } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
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
      return await apiRequest("POST", "/api/recipes/generate", {});
    },
    onSuccess: (recipe: Recipe) => {
      toast({
        title: "Recipe Generated!",
        description: `Check out: ${recipe.title}`,
      });
      onRecipeGenerated?.(recipe);
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
