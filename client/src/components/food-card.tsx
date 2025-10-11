import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditFoodDialog } from "./edit-food-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { FoodItem } from "@shared/schema";

interface FoodCardProps {
  item: FoodItem;
  storageLocationName: string;
}

export function FoodCard({ item, storageLocationName }: FoodCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const { toast } = useToast();

  const getStorageBadgeColor = (location: string) => {
    const colors: Record<string, string> = {
      fridge: "bg-blue-100 text-blue-700 border-blue-200",
      freezer: "bg-cyan-100 text-cyan-700 border-cyan-200",
      pantry: "bg-amber-100 text-amber-700 border-amber-200",
      counter: "bg-green-100 text-green-700 border-green-200",
    };
    return colors[location.toLowerCase()] || "bg-gray-100 text-gray-700 border-gray-200";
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

  return (
    <>
      <Card 
        className="hover-elevate border border-card-border shadow-sm" 
        data-testid={`card-food-${item.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                data-testid={`img-food-${item.id}`}
              />
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
                <div className="flex items-center gap-2 mb-3">
                  <div className={cn("w-full h-1 rounded-full", expiryStatus.color)} />
                  <span className="text-xs text-muted-foreground flex-shrink-0" data-testid={`text-expiry-${item.id}`}>
                    {expiryStatus.text}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setEditDialogOpen(true)}
                  data-testid={`button-edit-${item.id}`}
                >
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive hover:text-destructive"
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
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
    </>
  );
}
