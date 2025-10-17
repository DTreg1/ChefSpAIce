import { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { EmptyState } from "@/components/empty-state";
import { FoodCard } from "@/components/food-card";
import { FoodCardSkeletonGrid } from "@/components/food-card-skeleton";
import { AddFoodDialog } from "@/components/add-food-dialog";
import { RecipeGenerator } from "@/components/recipe-generator";
import { ExpirationAlert } from "@/components/expiration-alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Plus, X } from "lucide-react";
import type { FoodItem, StorageLocation, Recipe } from "@shared/schema";

// Virtual scrolling component for large food grids
interface VirtualizedFoodGridProps {
  items: FoodItem[];
  storageLocations: StorageLocation[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
}

function VirtualizedFoodGrid({ items, storageLocations, scrollContainerRef }: VirtualizedFoodGridProps) {
  // Calculate grid columns based on screen size (responsive)
  const getColumns = () => {
    if (typeof window === 'undefined') return 3;
    const width = window.innerWidth;
    if (width < 768) return 1; // mobile
    if (width < 1024) return 2; // tablet
    return 3; // desktop
  };

  const [columns, setColumns] = useState(getColumns());

  // Update columns on resize
  useEffect(() => {
    const handleResize = () => setColumns(getColumns());
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Group items into rows for virtual scrolling
  const rows = useMemo(() => {
    const rowArray: FoodItem[][] = [];
    for (let i = 0; i < items.length; i += columns) {
      rowArray.push(items.slice(i, i + columns));
    }
    return rowArray;
  }, [items, columns]);

  // Initialize virtualizer for rows
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 280, // Estimated height of each card row
    overscan: 2, // Render 2 rows outside of view
  });

  return (
    <div
      ref={scrollContainerRef}
      className="max-h-[calc(100vh-240px)] min-h-[400px] overflow-auto"
      style={{ contain: 'strict' }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const row = rows[virtualRow.index];
          return (
            <div
              key={virtualRow.key}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualRow.size}px`,
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {row.map((item) => {
                  const itemLocation = storageLocations.find(
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
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function Storage() {
  const [, params] = useRoute("/storage/:location");
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const { toast } = useToast();
  const location = params?.location || "all";
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const { data: storageLocations, error: locationsError, isLoading: locationsLoading } = useStorageLocations();

  const { data: allItems, error: itemsError, isLoading: itemsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const { data: categories } = useQuery<string[]>({
    queryKey: ["/api/food-categories"],
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

  // Provide safe default for items
  let items = location === "all" 
    ? (allItems || [])
    : (allItems?.filter((item) => item.storageLocationId === currentLocation?.id) || []);
  
  // Apply category filter if selected
  if (selectedCategory && items.length > 0) {
    items = items.filter((item) => item.foodCategory === selectedCategory);
  }

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

          {categories && categories.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Filter by Category</h3>
              <div className="flex flex-wrap gap-2">
                {categories.map((category) => (
                  <Badge
                    key={category}
                    variant={selectedCategory === category ? "default" : "outline"}
                    className="cursor-pointer hover-elevate active-elevate-2"
                    onClick={() => setSelectedCategory(selectedCategory === category ? null : category)}
                    data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    {category}
                    {selectedCategory === category && (
                      <X className="w-3 h-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
            </div>
          )}

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
          ) : items.length > 50 ? (
            // Use virtual scrolling for large lists (>50 items)
            <VirtualizedFoodGrid 
              items={items} 
              storageLocations={storageLocations || []}
              scrollContainerRef={scrollContainerRef}
            />
          ) : (
            // Regular rendering for smaller lists
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
