import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Edit, Trash2, UtensilsCrossed, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditFoodDialog } from "./edit-food-dialog";
import { NutritionFactsDialog } from "./nutrition-facts-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSwipe } from "@/hooks/use-swipe";
import type { FoodItem } from "@shared/schema";

interface FoodCardProps {
  item: FoodItem;
  storageLocationName: string;
}

export function FoodCard({ item, storageLocationName }: FoodCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const { toast } = useToast();

  const getStorageBadgeColor = (location: string) => {
    const colors: Record<string, string> = {
      fridge: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      freezer: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
      pantry: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      counter: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-800",
    };
    return colors[location.toLowerCase()] || "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-800";
  };

  const getExpiryStatus = (date?: string | null) => {
    if (!date) return null;
    const expiry = new Date(date);
    const now = new Date();
    const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) return { color: "bg-red-500", text: "Expired" };
    if (daysUntil <= 3) return { color: "bg-amber-500", text: `${daysUntil}d left` };
    return { color: "bg-green-500", text: `${daysUntil}d left` };
  };

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("DELETE", `/api/food-items/${item.id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/items"] });
      toast({
        title: "Item deleted",
        description: "Food item removed from inventory",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const expiryStatus = getExpiryStatus(item.expirationDate);
  const hasNutrition = item.nutrition && item.nutrition !== "null";

  return (
    <>
      <Card 
        className="hover-elevate active-elevate-2 card-hover border border-card-border shadow-sm hover:shadow-md transition-all-smooth" 
        data-testid={`card-food-${item.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {item.imageUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  data-testid={`img-food-${item.id}`}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-lg text-foreground truncate" data-testid={`text-food-name-${item.id}`}>
                  {item.name}
                </h3>
                <Badge
                  variant="outline"
                  className={cn("text-xs flex-shrink-0 border", getStorageBadgeColor(storageLocationName))}
                  data-testid={`badge-storage-${item.id}`}
                >
                  {storageLocationName}
                </Badge>
              </div>

              <div className="flex items-center gap-3 mb-3">
                {item.fcdId && (
                  <span className="text-xs text-muted-foreground font-mono" data-testid={`text-fcd-${item.id}`}>
                    FCD: {item.fcdId}
                  </span>
                )}
                <span className="text-sm font-medium text-foreground" data-testid={`text-quantity-${item.id}`}>
                  {item.quantity} {item.unit}
                </span>
              </div>

              {expiryStatus && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground" data-testid={`text-expiry-${item.id}`}>
                      {expiryStatus.text}
                    </span>
                    {item.expirationDate && (
                      <span className="text-xs text-muted-foreground">
                        {new Date(item.expirationDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all-smooth", expiryStatus.color)}
                      style={{
                        width: `${Math.max(0, Math.min(100, ((new Date(item.expirationDate!).getTime() - new Date().getTime()) / (7 * 24 * 60 * 60 * 1000)) * 100))}%`
                      }}
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1">
                {hasNutrition && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 scale-touch"
                        onClick={() => setNutritionDialogOpen(true)}
                        data-testid={`button-nutrition-${item.id}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View nutrition facts</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 scale-touch"
                      onClick={() => setEditDialogOpen(true)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit item</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive scale-touch"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete item</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditFoodDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={item}
      />
      
      {hasNutrition && (
        <NutritionFactsDialog
          open={nutritionDialogOpen}
          onOpenChange={setNutritionDialogOpen}
          item={item}
        />
      )}
    </>
  );
}
