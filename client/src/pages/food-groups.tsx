import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FoodCard } from "@/components/food-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Package } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import type { FoodItem, StorageLocation } from "@shared/schema";

export default function FoodGroups() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [location] = useLocation();
  
  // Parse category from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const selectedCategory = urlParams.get('category');
  
  // Auto-expand selected category when navigating from sidebar
  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategories(new Set([selectedCategory]));
    }
  }, [selectedCategory]);

  const { data: foodItems, isLoading: itemsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const { data: storageLocations, isLoading: locationsLoading } = useQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
  });

  // Group food items by category
  const groupedItems = (foodItems || []).reduce((acc, item) => {
    const category = item.foodCategory || "Uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(item);
    return acc;
  }, {} as Record<string, FoodItem[]>);

  const categories = Object.keys(groupedItems).sort();
  const totalItems = foodItems?.length || 0;
  
  // Filter categories if one is selected from sidebar
  const displayCategories = selectedCategory 
    ? categories.filter(cat => cat === selectedCategory)
    : categories;

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const isLoading = itemsLoading || locationsLoading;

  return (
    <div className="h-full overflow-y-auto mobile-scroll">
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-2">
            {selectedCategory ? `${selectedCategory} Items` : 'Food Groups Dashboard'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {selectedCategory 
              ? `Viewing items in ${selectedCategory} • ${groupedItems[selectedCategory]?.length || 0} items`
              : `Your inventory organized by USDA food categories • ${totalItems} total items`}
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2 mt-2" />
                </CardHeader>
              </Card>
            ))}
          </div>
        ) : displayCategories.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="w-16 h-16 text-muted-foreground mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                No food items yet
              </p>
              <p className="text-sm text-muted-foreground">
                Add items to your inventory to see them organized by category
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {displayCategories.map((category) => {
              const items = groupedItems[category];
              const isExpanded = expandedCategories.has(category);
              const CategoryIcon = getCategoryIcon(category);

              return (
                <Collapsible
                  key={category}
                  open={isExpanded}
                  onOpenChange={() => toggleCategory(category)}
                >
                  <Card>
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover-elevate active-elevate-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {isExpanded ? (
                              <ChevronDown className="w-5 h-5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="w-5 h-5 text-muted-foreground" />
                            )}
                            <CategoryIcon className="w-5 h-5 text-primary" />
                            <div>
                              <CardTitle className="text-lg">{category}</CardTitle>
                              <CardDescription className="mt-1">
                                {items.length} item{items.length !== 1 ? "s" : ""}
                              </CardDescription>
                            </div>
                          </div>
                          <Badge variant="secondary" data-testid={`badge-count-${category.toLowerCase().replace(/\s+/g, '-')}`}>
                            {items.length}
                          </Badge>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                          {items.map((item) => {
                            const location = storageLocations?.find(
                              (loc) => loc.id === item.storageLocationId
                            );
                            return (
                              <FoodCard
                                key={item.id}
                                item={item}
                                storageLocationName={location?.name || "Unknown"}
                              />
                            );
                          })}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Card>
                </Collapsible>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
