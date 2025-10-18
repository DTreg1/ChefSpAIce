import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { EmptyState } from "@/components/empty-state";
import { FoodCard } from "@/components/food-card";
import { FoodCardSkeletonGrid } from "@/components/food-card-skeleton";
import { AddFoodDialog } from "@/components/add-food-dialog";
import { RecipeGenerator } from "@/components/recipe-generator";
import { ExpirationAlert } from "@/components/expiration-alert";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Plus } from "lucide-react";
import type { FoodItem, StorageLocation, Recipe } from "@shared/schema";

export default function Storage() {
  const [, params] = useRoute("/storage/:location");
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const { toast } = useToast();
  const location = params?.location || "all";

  const { data: storageLocations, error: locationsError, isLoading: locationsLoading } = useQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
  });

  const { data: allItems, error: itemsError, isLoading: itemsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  // Display error notifications
  useEffect(() => {
    if (locationsError) {
      toast({
        title: "Error loading storage locations",
        description: "Failed to load your storage locations. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [locationsError, toast]);

  useEffect(() => {
    if (itemsError) {
      toast({
        title: "Error loading items",
        description: "Failed to load your inventory items. Please try refreshing the page.",
        variant: "destructive",
      });
    }
  }, [itemsError, toast]);

  const currentLocation = storageLocations?.find(
    (loc) => loc.name.toLowerCase() === location.toLowerCase()
  );

  const items = location === "all" 
    ? allItems 
    : allItems?.filter((item) => item.storageLocationId === currentLocation?.id);

  const handleRecipeGenerated = (recipe: Recipe) => {
    // Navigate to chat to see the recipe
    setLocation("/");
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-muted mobile-scroll">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="mb-6">
            <ExpirationAlert />
          </div>

          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground capitalize mb-2">
                {location === "all" ? "All Items" : location}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {items?.length || 0} item{items?.length !== 1 ? "s" : ""} in this location
              </p>
            </div>
            <div className="flex gap-2">
              <RecipeGenerator onRecipeGenerated={handleRecipeGenerated} />
              <Button 
                onClick={() => setAddDialogOpen(true)} 
                className="touch-target"
                data-testid="button-add-item-page"
              >
                <Plus className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Add Item</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </div>
          </div>

          {itemsLoading || locationsLoading ? (
            <FoodCardSkeletonGrid count={6} />
          ) : !items || items.length === 0 ? (
            <EmptyState type="inventory" onAction={() => setAddDialogOpen(true)} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {items.map((item) => {
                const itemLocation = storageLocations?.find(
                  (loc) => loc.id === item.storageLocationId
                );
                return (
                  <FoodCard
                    key={item.id}
                    item={item}
                    storageLocationName={itemLocation?.name || "Unknown"}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AddFoodDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}
