import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NutritionFactsLabel } from "./nutrition-facts-label";
import type { FoodItem, NutritionInfo } from "@shared/schema";

interface NutritionFactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoodItem;
}

export function NutritionFactsDialog({ open, onOpenChange, item }: NutritionFactsDialogProps) {
  let nutrition: NutritionInfo | null = null;
  
  try {
    if (item.nutrition && item.nutrition !== "null") {
      nutrition = JSON.parse(item.nutrition);
    }
  } catch (error) {
    console.error("Failed to parse nutrition data:", error);
  }

  if (!nutrition) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Nutrition Facts</DialogTitle>
        </DialogHeader>
        <div className="flex justify-center py-4">
          <NutritionFactsLabel nutrition={nutrition} foodName={item.name} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
