import { Button } from "@/components/ui/button";
import { Plus, ChefHat } from "lucide-react";
import { SmartRecipeGenerator } from "@/components/smart-recipe-generator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionsBarProps {
  onAddFood?: () => void;
  onGenerateRecipe?: () => void;
  onSmartRecipeGenerated?: (recipe: any) => void;
}

export function QuickActionsBar({
  onAddFood,
  onGenerateRecipe,
  onSmartRecipeGenerated,
}: QuickActionsBarProps) {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              onClick={onAddFood}
              data-testid="button-quick-add-food"
              className="transition-all-smooth h-9 w-9 p-0 lg:w-auto lg:px-3"
            >
              <Plus className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Add Food</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="lg:hidden">
            <p>Add Food Item</p>
          </TooltipContent>
        </Tooltip>

        <SmartRecipeGenerator 
          variant="quick" 
          onRecipeGenerated={onSmartRecipeGenerated}
        />

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              onClick={onGenerateRecipe}
              data-testid="button-quick-generate-recipe"
              className="transition-all-smooth h-9 w-9 p-0 lg:w-auto lg:px-3"
            >
              <ChefHat className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Custom Recipe</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="lg:hidden">
            <p>Generate Custom Recipe</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}