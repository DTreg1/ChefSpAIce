import { Button } from "@/components/ui/button";
import { Plus, ScanLine, ChefHat } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface QuickActionsBarProps {
  onAddFood?: () => void;
  onGenerateRecipe?: () => void;
  onScanBarcode?: () => void;
}

export function QuickActionsBar({
  onAddFood,
  onGenerateRecipe,
  onScanBarcode,
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

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="default"
              onClick={onScanBarcode}
              data-testid="button-quick-scan-barcode"
              className="transition-all-smooth h-9 w-9 p-0 lg:w-auto lg:px-3"
            >
              <ScanLine className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Scan Barcode</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="lg:hidden">
            <p>Scan Barcode</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              onClick={onGenerateRecipe}
              data-testid="button-quick-generate-recipe"
              className="transition-all-smooth h-9 w-9 p-0 lg:w-auto lg:px-3"
            >
              <ChefHat className="h-4 w-4 lg:mr-2" />
              <span className="hidden lg:inline">Generate Recipe</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent className="lg:hidden">
            <p>Generate Recipe</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}
