import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Package, Database, Globe } from "lucide-react";
import { useDebounce } from "@/hooks/use-debounce";

interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
}

interface BarcodeLookupProduct {
  barcode_number?: string;
  title?: string;
  brand?: string;
  category?: string;
  manufacturer?: string;
  description?: string;
  images?: string[];
}

interface OpenFoodFactsProduct {
  code?: string;
  product_name?: string;
  brands?: string;
  categories?: string;
  quantity?: string;
  image_url?: string;
}

interface UnifiedSearchResults {
  usda: {
    foods: USDAFood[];
    totalHits: number;
  };
  barcodeLookup: {
    products: BarcodeLookupProduct[];
  };
  openFoodFacts: {
    products: OpenFoodFactsProduct[];
  };
}

interface UnifiedFoodSearchProps {
  onSelectUSDA?: (food: USDAFood) => void;
  onSelectBarcodeLookup?: (product: BarcodeLookupProduct) => void;
  onSelectOpenFoodFacts?: (product: OpenFoodFactsProduct) => void;
}

export function UnifiedFoodSearch({ 
  onSelectUSDA, 
  onSelectBarcodeLookup, 
  onSelectOpenFoodFacts 
}: UnifiedFoodSearchProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  const { data, isLoading, error } = useQuery<UnifiedSearchResults>({
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

  const hasResults = data && (
    (data.usda.foods && data.usda.foods.length > 0) ||
    (data.barcodeLookup.products && data.barcodeLookup.products.length > 0) ||
    (data.openFoodFacts.products && data.openFoodFacts.products.length > 0)
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search for food by name, brand, ingredient, store..."
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

            {data && (
              <>
                {data.usda.foods && data.usda.foods.length > 0 && (
                  <Card data-testid="card-usda-results">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Database className="h-4 w-4" />
                        USDA Database
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
                            </div>
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {data.barcodeLookup.products && data.barcodeLookup.products.length > 0 && (
                  <Card data-testid="card-barcode-results">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Package className="h-4 w-4" />
                        Barcode Lookup
                        <Badge variant="secondary" className="ml-auto">
                          {data.barcodeLookup.products.length} results
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {data.barcodeLookup.products.map((product, index) => (
                        <Button
                          key={product.barcode_number || index}
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-3 hover-elevate"
                          onClick={() => onSelectBarcodeLookup?.(product)}
                          data-testid={`button-barcode-${product.barcode_number || index}`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            {product.images && product.images[0] && (
                              <img 
                                src={product.images[0]} 
                                alt={product.title}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex flex-col items-start gap-1 flex-1">
                              <div className="font-medium text-sm">{product.title}</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {product.brand && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.brand}
                                  </Badge>
                                )}
                                {product.category && (
                                  <span className="text-xs">{product.category}</span>
                                )}
                                {product.barcode_number && (
                                  <span className="text-xs">UPC: {product.barcode_number}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {data.openFoodFacts.products && data.openFoodFacts.products.length > 0 && (
                  <Card data-testid="card-openfoodfacts-results">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-base">
                        <Globe className="h-4 w-4" />
                        Open Food Facts
                        <Badge variant="secondary" className="ml-auto">
                          {data.openFoodFacts.products.length} results
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {data.openFoodFacts.products.map((product, index) => (
                        <Button
                          key={product.code || index}
                          variant="ghost"
                          className="w-full justify-start h-auto py-3 px-3 hover-elevate"
                          onClick={() => onSelectOpenFoodFacts?.(product)}
                          data-testid={`button-openfoodfacts-${product.code || index}`}
                        >
                          <div className="flex items-start gap-3 w-full">
                            {product.image_url && (
                              <img 
                                src={product.image_url} 
                                alt={product.product_name}
                                className="w-12 h-12 object-cover rounded"
                              />
                            )}
                            <div className="flex flex-col items-start gap-1 flex-1">
                              <div className="font-medium text-sm">{product.product_name}</div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {product.brands && (
                                  <Badge variant="outline" className="text-xs">
                                    {product.brands}
                                  </Badge>
                                )}
                                {product.quantity && (
                                  <span className="text-xs">{product.quantity}</span>
                                )}
                                {product.code && (
                                  <span className="text-xs">Barcode: {product.code}</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
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
