import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useVirtualizer } from "@tanstack/react-virtual";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { EmptyState } from "@/components/empty-state";
import { FoodCard } from "@/components/food-card";
import { FoodCardSkeletonGrid } from "@/components/food-card-skeleton";
import { AddFoodDialog } from "@/components/add-food-dialog";
import { RecipeGenerator } from "@/components/recipe-generator";
import { ExpirationAlert } from "@/components/expiration-alert";
import { ProgressiveSection } from "@/components/progressive-section";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, X, Trash2, Package, Calendar, CheckSquare, Square, Check } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import type { UserInventory as FoodItem, StorageLocation, Recipe } from "@shared/schema";

// Virtual scrolling component for large food grids with multi-select support
interface VirtualizedFoodGridProps {
  items: FoodItem[];
  storageLocations: StorageLocation[];
  scrollContainerRef: React.RefObject<HTMLDivElement>;
  isSelectionMode: boolean;
  selectedItems: Set<string>;
  onItemSelect: (id: string) => void;
}

const VirtualizedFoodGrid = React.memo(function VirtualizedFoodGrid({ 
  items, 
  storageLocations, 
  scrollContainerRef,
  isSelectionMode,
  selectedItems,
  onItemSelect 
}: VirtualizedFoodGridProps) {
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
      className="h-[600px] overflow-auto"
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
                    <div key={item.id} className="relative">
                      {isSelectionMode && (
                        <div className="absolute top-2 left-2 z-10">
                          <button
                            onClick={() => onItemSelect(item.id)}
                            className="w-6 h-6 rounded border-2 border-primary bg-background hover:bg-primary/10 flex items-center justify-center transition-colors"
                            data-testid={`checkbox-select-${item.id}`}
                          >
                            {selectedItems.has(item.id) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </button>
                        </div>
                      )}
                      <FoodCard
                        item={item}
                        storageLocationName={itemLocation?.name || "Unknown"}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default function Storage() {
  const [, params] = useRoute("/storage/:location");
  const [, setLocation] = useLocation();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [bulkStorageLocation, setBulkStorageLocation] = useState<string>("");
  const [bulkExpirationDays, setBulkExpirationDays] = useState<number>(7);
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

  let items = location === "all" 
    ? allItems 
    : allItems?.filter((item) => item.storageLocationId === currentLocation?.id);
  
  // Apply category filter if selected
  if (selectedCategory && items) {
    items = items.filter((item) => item.foodCategory === selectedCategory);
  }

  const handleRecipeGenerated = (recipe: Recipe) => {
    // Navigate to chat to see the recipe
    setLocation("/");
  };

  const handleItemSelect = (id: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (!items) return;
    if (selectedItems.size === items.length) {
      setSelectedItems(new Set());
    } else {
      setSelectedItems(new Set(items.map(item => item.id)));
    }
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
    setIsSelectionMode(false);
  };

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      const promises = ids.map(id => 
        apiRequest("DELETE", `/api/food-items/${id}`, null)
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/stats"] });
      toast({
        title: "Items deleted",
        description: `Successfully deleted ${selectedItems.size} items`,
      });
      clearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete some items",
        variant: "destructive",
      });
    },
  });

  // Bulk move mutation
  const bulkMoveMutation = useMutation({
    mutationFn: async ({ ids, locationId }: { ids: string[], locationId: string }) => {
      const promises = ids.map(id => 
        apiRequest("PATCH", `/api/food-items/${id}`, { storageLocationId: locationId })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      toast({
        title: "Items moved",
        description: `Successfully moved ${selectedItems.size} items`,
      });
      clearSelection();
      setBulkStorageLocation("");
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to move some items",
        variant: "destructive",
      });
    },
  });

  // Bulk update expiration mutation
  const bulkUpdateExpirationMutation = useMutation({
    mutationFn: async ({ ids, date }: { ids: string[], date: string }) => {
      const promises = ids.map(id => 
        apiRequest("PATCH", `/api/food-items/${id}`, { expirationDate: date })
      );
      return await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Expiration dates updated",
        description: `Successfully updated ${selectedItems.size} items`,
      });
      clearSelection();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update some items",
        variant: "destructive",
      });
    },
  });

  const handleBulkDelete = () => {
    if (selectedItems.size === 0) return;
    if (confirm(`Are you sure you want to delete ${selectedItems.size} item(s)?`)) {
      bulkDeleteMutation.mutate(Array.from(selectedItems));
    }
  };

  const handleBulkMove = () => {
    if (!bulkStorageLocation || selectedItems.size === 0) return;
    bulkMoveMutation.mutate({ 
      ids: Array.from(selectedItems), 
      locationId: bulkStorageLocation 
    });
  };

  const handleBulkUpdateExpiration = () => {
    if (selectedItems.size === 0) return;
    const newDate = format(addDays(new Date(), bulkExpirationDays), 'yyyy-MM-dd');
    bulkUpdateExpirationMutation.mutate({ 
      ids: Array.from(selectedItems), 
      date: newDate 
    });
  };

  return (
    <>
      <div className="h-full overflow-y-auto bg-muted mobile-scroll">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          <div className="mb-6">
            <ExpirationAlert />
          </div>

          {/* Bulk actions toolbar */}
          {isSelectionMode && selectedItems.size > 0 && (
            <div className="mb-6 p-4 bg-card rounded-lg border border-border">
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSelectAll}
                    data-testid="button-select-all"
                  >
                    {selectedItems.size === items?.length ? <Square className="w-4 h-4" /> : <CheckSquare className="w-4 h-4" />}
                    {selectedItems.size === items?.length ? "Deselect All" : "Select All"}
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {selectedItems.size} selected
                  </span>
                </div>
                
                <div className="flex flex-wrap gap-2 flex-1">
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    data-testid="button-bulk-delete"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </Button>
                  
                  <div className="flex gap-2 items-center">
                    <Select value={bulkStorageLocation} onValueChange={setBulkStorageLocation}>
                      <SelectTrigger className="w-[140px] h-8" data-testid="select-bulk-storage">
                        <SelectValue placeholder="Move to..." />
                      </SelectTrigger>
                      <SelectContent>
                        {storageLocations?.map((loc) => (
                          <SelectItem key={loc.id} value={loc.id}>
                            {loc.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkMove}
                      disabled={!bulkStorageLocation || bulkMoveMutation.isPending}
                      data-testid="button-bulk-move"
                    >
                      <Package className="w-4 h-4 mr-2" />
                      Move
                    </Button>
                  </div>
                  
                  <div className="flex gap-2 items-center">
                    <input
                      type="number"
                      value={bulkExpirationDays}
                      onChange={(e) => setBulkExpirationDays(parseInt(e.target.value) || 7)}
                      className="w-16 h-8 px-2 border rounded text-sm"
                      min="1"
                      data-testid="input-bulk-expiry-days"
                    />
                    <span className="text-sm text-muted-foreground">days</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleBulkUpdateExpiration}
                      disabled={bulkUpdateExpirationMutation.isPending}
                      data-testid="button-bulk-expiry"
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Set Expiry
                    </Button>
                  </div>
                </div>
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearSelection}
                  data-testid="button-cancel-selection"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          {categories && categories.length > 0 && (
            <div className="mb-6">
              <ProgressiveSection
                id="storage-filters"
                title="Advanced Filters"
                summary={selectedCategory ? `Filtered by: ${selectedCategory}` : "USDA categories and more"}
                defaultExpanded={false}
                size="sm"
                className="mb-0"
                testId="progressive-storage-filters"
              >
                <div className="pt-2">
                  <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Filter by Category</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      key="all"
                      variant={!selectedCategory ? "default" : "outline"}
                      className="cursor-pointer hover-elevate active-elevate-2"
                      onClick={() => setSelectedCategory(null)}
                      data-testid="badge-category-all"
                    >
                      All
                    </Badge>
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant={selectedCategory === category ? "default" : "outline"}
                        className="cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => setSelectedCategory(category)}
                        data-testid={`badge-category-${category.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {category}
                      </Badge>
                    ))}
                  </div>
                </div>
              </ProgressiveSection>
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
              {items && items.length > 0 && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsSelectionMode(!isSelectionMode);
                    if (isSelectionMode) {
                      clearSelection();
                    }
                  }}
                  data-testid="button-toggle-selection-mode"
                >
                  {isSelectionMode ? (
                    <>
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <CheckSquare className="w-4 h-4 mr-2" />
                      Select
                    </>
                  )}
                </Button>
              )}
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

          <div className="flex flex-wrap gap-2 mb-6">
            <Badge
              key="all"
              variant={location === "all" ? "default" : "outline"}
              className="cursor-pointer hover-elevate active-elevate-2"
              onClick={() => setLocation("/storage/all")}
              data-testid="badge-location-all"
            >
              All
            </Badge>
            {storageLocations?.map((loc) => (
              <Badge
                key={loc.id}
                variant={location.toLowerCase() === loc.name.toLowerCase() ? "default" : "outline"}
                className="cursor-pointer hover-elevate active-elevate-2"
                onClick={() => setLocation(`/storage/${loc.name.toLowerCase()}`)}
                data-testid={`badge-location-${loc.name.toLowerCase()}`}
              >
                {loc.name}
              </Badge>
            ))}
          </div>

          {locationsLoading || itemsLoading ? (
            <FoodCardSkeletonGrid />
          ) : !items || items.length === 0 ? (
            <EmptyState
              type="inventory"
              onAction={() => setAddDialogOpen(true)}
            />
          ) : (
            <VirtualizedFoodGrid 
              items={items} 
              storageLocations={storageLocations || []} 
              scrollContainerRef={scrollContainerRef}
              isSelectionMode={isSelectionMode}
              selectedItems={selectedItems}
              onItemSelect={handleItemSelect}
            />
          )}
        </div>
      </div>

      <AddFoodDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </>
  );
}