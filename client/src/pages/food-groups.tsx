import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation, Link } from "wouter";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FoodCard } from "@/components/food-card";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronDown, ChevronRight, Package, Plus } from "lucide-react";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { FoodCardSkeletonGrid } from "@/components/food-card-skeleton";
import { AddFoodDialog } from "@/components/add-food-dialog";
import { RecipeGenerator } from "@/components/recipe-generator";
import type { FoodItem, StorageLocation, Recipe } from "@shared/schema";

export default function FoodGroups() {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [location, setLocation] = useLocation();
  const params = useParams<{ category?: string }>();
  
  // Parse category from URL path parameter - convert from url format (lowercase with dashes) to proper case
  const selectedCategory = params.category ? 
    params.category.split('-').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ') : null;
  
  // Auto-expand selected category when navigating from sidebar
  useEffect(() => {
    if (selectedCategory) {
      setExpandedCategories(new Set([selectedCategory]));
    }
  }, [selectedCategory]);

  const { data: foodItems, isLoading: itemsLoading } = useQuery<FoodItem[]>({
    queryKey: ["/api/food-items"],
  });

  const { data: storageLocations, isLoading: locationsLoading } = useStorageLocations();

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
  
  const handleRecipeGenerated = (recipe: Recipe) => {
    // Navigate to chat to see the recipe
    setLocation("/");
  };

  return (
    <>
      <AddFoodDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <div className="h-full overflow-y-auto bg-muted mobile-scroll">
        <div className="max-w-6xl mx-auto p-4 md:p-6">
          {/* If viewing a specific category, show category filters */}
          {selectedCategory && (
            <div className="mb-6">
              <div className="flex flex-wrap gap-2">
                <Link href="/food-groups">
                  <Badge
                    variant="outline"
                    className="cursor-pointer hover-elevate active-elevate-2"
                    data-testid="badge-category-all"
                  >
                    All Categories
                  </Badge>
                </Link>
                {['Fruits', 'Vegetables', 'Grains', 'Protein', 'Dairy'].map((category) => (
                  <Link key={category} href={`/food-groups/${category.toLowerCase()}`}>
                    <Badge
                      variant={selectedCategory === category ? "default" : "outline"}
                      className="cursor-pointer hover-elevate active-elevate-2"
                      data-testid={`badge-category-${category.toLowerCase()}`}
                    >
                      {category}
                    </Badge>
                  </Link>
                ))}
              </div>
            </div>
          )}
          
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground capitalize mb-2">
                {selectedCategory ? `${selectedCategory}` : 'Food Groups'}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground">
                {selectedCategory 
                  ? `${groupedItems[selectedCategory]?.length || 0} item${groupedItems[selectedCategory]?.length !== 1 ? 's' : ''} in this category`
                  : `Your inventory organized by food categories • ${totalItems} total items`}
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
    </>
  );
}
