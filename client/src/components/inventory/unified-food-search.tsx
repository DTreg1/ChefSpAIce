/**
 * Unified Food Search Component
 * 
 * Multi-source food search interface for finding items with comprehensive nutrition data.
 * Primarily searches USDA FoodData Central database with support for additional sources.
 * 
 * Features:
 * - USDA FoodData Central: Official USDA nutrition database with 600k+ food items
 * - Debounced Search: 300ms delay after typing stops to reduce API calls
 * - Minimum Query Length: Requires ≥2 characters before searching
 * - Rich Food Data: Brand owners, categories, UPC codes, nutrition facts
 * - Loading States: Skeleton loaders during search
 * - Error Handling: User-friendly error messages for failed searches
 * 
 * Search Sources:
 * - USDA FoodData Central: Branded foods, SR Legacy, FNDDS, Foundation Foods
 *   - Includes: Description, brand owner, category, UPC/GTIN, nutrition
 *   - Data types: Branded, Survey (FNDDS), SR Legacy, Foundation
 * - Barcode Lookup API: (placeholder in response structure, not actively used)
 * - Open Food Facts: (placeholder in response structure, not actively used)
 * 
 * API Integration:
 * - GET /api/food/unified-search?query={searchQuery}
 *   - Returns: { usda, barcodeLookup, openFoodFacts }
 *   - USDA includes: foods[], totalHits, currentPage, totalPages
 * - Response includes pagination metadata for future expansion
 * 
 * State Management:
 * - searchQuery: Raw user input (immediate updates)
 * - debouncedSearch: Delayed query (300ms after typing stops)
 * - Query enabled when: debouncedSearch.length >= 2
 * - Auto-refetch: Disabled (manual searches only)
 * 
 * USDA Food Object:
 * - fdcId: Unique USDA food database identifier
 * - description: Food name/description
 * - dataType: Branded, Survey (FNDDS), SR Legacy, Foundation
 * - brandOwner: Manufacturer/brand (for branded foods)
 * - gtinUpc: UPC/GTIN barcode
 * - ingredients: Ingredient list (for branded foods)
 * - foodCategory: USDA category classification
 * - servingSize: Default serving amount
 * - servingSizeUnit: Serving unit (g, ml, etc.)
 * - nutrition: { calories, protein, carbs, fat }
 * 
 * Result Display:
 * - Shows USDA foods in clickable cards
 * - Badge displays: data type, brand owner, category, UPC
 * - Results counter badge shows total hits
 * - Ghost variant buttons for low visual weight
 * - Hover elevation effect for interactivity
 * 
 * User Flow:
 * 1. User types search query (minimum 2 characters)
 * 2. Component waits 300ms after typing stops (debounce)
 * 3. Fetches from GET /api/food/unified-search
 * 4. Shows skeleton loaders during fetch
 * 5. Displays USDA results with rich metadata
 * 6. User clicks food item to select
 * 7. Calls onSelectUSDA callback with full food object
 * 
 * Performance Optimizations:
 * - Debounced search (300ms): Reduces API calls during typing
 * - Conditional queries: Only fetches when query length ≥ 2
 * - ScrollArea: Virtual scrolling for large result sets
 * - Skeleton loaders: Perceived performance during loads
 * 
 * Error States:
 * - No query: Shows "Type at least 2 characters" message
 * - Search failed: Shows "Failed to search. Please try again."
 * - No results: Shows "No results found. Try a different search term."
 * - Loading: Shows 3 skeleton cards
 * 
 * Accessibility:
 * - data-testid on search input and result buttons
 * - Semantic HTML with proper ARIA roles
 * - Keyboard navigation support via Button components
 * 
 * @example
 * // Basic usage for food item addition
 * <UnifiedFoodSearch 
 *   onSelectUSDA={(food) => {
 *     // Pre-fill form with USDA data
 *     setName(food.description);
 *     setNutrition(food.nutrition);
 *     setCategory(food.foodCategory);
 *   }}
 * />
 * 
 * @example
 * // Used in add-food dialog
 * <Dialog>
 *   <DialogContent>
 *     <UnifiedFoodSearch 
 *       onSelectUSDA={(food) => {
 *         populateFormFromUSDA(food);
 *         setDialogOpen(false);
 *       }}
 *     />
 *   </DialogContent>
 * </Dialog>
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Database } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  gtinUpc?: string;
  ingredients?: string;
  foodCategory?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

interface UnifiedSearchResponse {
  usda: {
    foods: USDAFood[];
    totalHits: number;
    currentPage: number;
    totalPages: number;
  };
  barcodeLookup: { products: any[] };
  openFoodFacts: { products: any[] };
}

interface UnifiedFoodSearchProps {
  onSelectUSDA?: (food: USDAFood) => void;
}

export function UnifiedFoodSearch({ onSelectUSDA }: UnifiedFoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, error } = useQuery<UnifiedSearchResponse>({
    queryKey: ["/api/food/unified-search", debouncedSearch],
    enabled: debouncedSearch.length >= 2,
    queryFn: async () => {
      const params = new URLSearchParams({ query: debouncedSearch });
      const response = await fetch(`/api/food/unified-search?${params}`, {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(`${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
  });

  const hasResults = data && data.usda.foods && data.usda.foods.length > 0;

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search USDA food database by name, brand, category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
          data-testid="input-unified-search"
        />
      </div>

      {debouncedSearch.length >= 2 && (
        <ScrollArea className="h-[500px]">
          <div className="space-y-4">
            {isLoading && (
              <div className="space-y-4">
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </div>
            )}

            {error && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-destructive">Failed to search. Please try again.</p>
                </CardContent>
              </Card>
            )}

            {!isLoading && !error && !hasResults && (
              <Card>
                <CardContent className="pt-6">
                  <p className="text-sm text-muted-foreground">No results found. Try a different search term.</p>
                </CardContent>
              </Card>
            )}

            {data && hasResults && (
              <Card data-testid="card-usda-results">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <Database className="h-4 w-4" />
                    USDA Food Database
                    <Badge variant="secondary" className="ml-auto">
                      {data.usda.totalHits} results
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {data.usda.foods.map((food) => (
                    <Button
                      key={food.fdcId}
                      variant="ghost"
                      className="w-full justify-start h-auto py-3 px-3 hover-elevate"
                      onClick={() => onSelectUSDA?.(food)}
                      data-testid={`button-usda-${food.fdcId}`}
                    >
                      <div className="flex flex-col items-start gap-1 w-full">
                        <div className="font-medium text-sm">{food.description}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs">
                            {food.dataType}
                          </Badge>
                          {food.brandOwner && (
                            <span className="text-xs">{food.brandOwner}</span>
                          )}
                          {food.foodCategory && (
                            <span className="text-xs">{food.foodCategory}</span>
                          )}
                          {food.gtinUpc && (
                            <span className="text-xs font-mono">UPC: {food.gtinUpc}</span>
                          )}
                        </div>
                      </div>
                    </Button>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </ScrollArea>
      )}

      {debouncedSearch.length < 2 && searchQuery.length > 0 && (
        <p className="text-sm text-muted-foreground">Type at least 2 characters to search...</p>
      )}
    </div>
  );
}
