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
  onScanBarcode 
}: QuickActionsBarProps) {
  return (
    <div className="flex items-center gap-2">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onAddFood}
              data-testid="button-quick-add-food"
              className="transition-all-smooth"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Add Food Item</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onScanBarcode}
              data-testid="button-quick-scan-barcode"
              className="transition-all-smooth"
            >
              <ScanLine className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Scan Barcode</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={onGenerateRecipe}
              data-testid="button-quick-generate-recipe"
              className="transition-all-smooth"
            >
              <ChefHat className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Generate Recipe</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </div>
  );
}