import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { NutritionFactsLabel } from "./nutrition-facts-label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Package2, Info } from "lucide-react";
import type { FoodItem, NutritionInfo } from "@shared/schema";

interface NutritionFactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoodItem;
}

export function NutritionFactsDialog({ open, onOpenChange, item }: NutritionFactsDialogProps) {
  let nutrition: NutritionInfo | null = null;
  let ingredients: string | null = null;
  let brand: string | null = null;
  let foodCategory: string | null = null;
  let dataType: string | null = null;
  
  // First, check if we have rich USDA data
  if ((item as any).usdaData) {
    const usdaData = (item as any).usdaData;
    
    // Extract additional information from USDA data
    ingredients = usdaData.ingredients || null;
    brand = usdaData.brandOwner || null;
    foodCategory = usdaData.foodCategory || null;
    dataType = usdaData.dataType || null;
    
    // Use nutrition from USDA data if available
    if (usdaData.nutrition) {
      nutrition = usdaData.nutrition;
    }
  }
  
  // Fall back to basic nutrition field if no USDA data
  if (!nutrition) {
    try {
      if (item.nutrition && item.nutrition !== "null") {
        nutrition = JSON.parse(item.nutrition);
      }
    } catch (error) {
      console.error("Failed to parse nutrition data:", error);
    }
  }

  if (!nutrition) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="liquid-glass-modal max-w-2xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Nutrition Facts</DialogTitle>
          <DialogDescription>
            Detailed nutritional information for {item.name}
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="h-[calc(90vh-120px)]">
          <div className="space-y-6 p-1">
            {/* Brand and Category Info */}
            {(brand || foodCategory || dataType) && (
              <div className="flex flex-wrap gap-2">
                {brand && (
                  <Badge variant="outline">
                    <Package2 className="w-3 h-3 mr-1" />
                    {brand}
                  </Badge>
                )}
                {foodCategory && (
                  <Badge variant="secondary">
                    {foodCategory}
                  </Badge>
                )}
                {dataType && (
                  <Badge variant="outline" className="text-xs">
                    <Info className="w-3 h-3 mr-1" />
                    {dataType} Data
                  </Badge>
                )}
              </div>
            )}
            
            {/* Nutrition Label */}
            <div className="flex justify-center">
              <NutritionFactsLabel nutrition={nutrition} foodName={item.name} />
            </div>
            
            {/* Ingredients List */}
            {ingredients && (
              <div className="space-y-2 border-t border-border pt-4">
                <h3 className="font-semibold text-sm">Ingredients</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {ingredients}
                </p>
              </div>
            )}
            
            {/* Additional Information */}
            <div className="space-y-2 border-t border-border pt-4 text-xs text-muted-foreground">
              <p>* Percent Daily Values are based on a 2,000 calorie diet.</p>
              {item.fcdId && (
                <p>USDA FoodData Central ID: {item.fcdId}</p>
              )}
            </div>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
