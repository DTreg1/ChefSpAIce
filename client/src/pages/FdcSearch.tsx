import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Info, Package, Apple, Wheat, Utensils, ChevronRight, Database } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FoodNutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

interface FoodItem {
  fdcId: string;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  score?: number;
}

interface SearchResponse {
  foods: FoodItem[];
  totalHits: number;
  currentPage: number;
  totalPages: number;
  fromCache: boolean;
}

interface FoodDetails {
  fdcId: string;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients?: FoodNutrient[];
  foodNutrients?: any[];
  fromCache?: boolean;
}

export default function FdcSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const { toast } = useToast();

  // Search query
  const { data: searchResults, isLoading: isSearching } = useQuery<SearchResponse>({
    queryKey: ["/api/fdc/search", currentQuery],
    enabled: !!currentQuery,
  });

  // Food details query
  const { data: foodDetails, isLoading: isLoadingDetails } = useQuery<FoodDetails>({
    queryKey: ["/api/fdc/food", selectedFood],
    enabled: !!selectedFood && detailsOpen,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentQuery(searchQuery.trim());
    }
  };

  const handleViewDetails = (fdcId: string) => {
    setSelectedFood(fdcId);
    setDetailsOpen(true);
  };

  const getDataTypeIcon = (dataType: string) => {
    switch (dataType?.toLowerCase()) {
      case "branded":
        return <Package className="w-4 h-4" />;
      case "foundation":
        return <Apple className="w-4 h-4" />;
      case "sr legacy":
        return <Wheat className="w-4 h-4" />;
      default:
        return <Utensils className="w-4 h-4" />;
    }
  };

  const getDataTypeColor = (dataType: string) => {
    switch (dataType?.toLowerCase()) {
      case "branded":
        return "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200";
      case "foundation":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "sr legacy":
        return "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200";
      default:
        return "bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200";
    }
  };

  const importantNutrients = [
    { number: "208", name: "Calories" },
    { number: "203", name: "Protein" },
    { number: "204", name: "Total Fat" },
    { number: "205", name: "Carbohydrates" },
    { number: "291", name: "Fiber" },
    { number: "269", name: "Sugars" },
    { number: "307", name: "Sodium" },
  ];

  const getNutrientValue = (nutrients: FoodNutrient[] | undefined, nutrientNumber: string) => {
    if (!nutrients) return null;
    const nutrient = nutrients.find(n => n.nutrientNumber === nutrientNumber);
    return nutrient ? `${nutrient.value} ${nutrient.unitName}` : "N/A";
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            USDA Food Data Central Search
          </CardTitle>
          <CardDescription>
            Search the USDA FDC database for nutritional information. Data is cached locally to minimize API calls.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="flex gap-2">
            <Input
              type="text"
              placeholder="Search for foods (e.g., 'apple', 'chicken breast', 'coca cola')"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
              data-testid="input-search"
            />
            <Button type="submit" disabled={isSearching} data-testid="button-search">
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
          </form>
        </CardContent>
      </Card>

      {isSearching && (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-6 w-3/4 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {searchResults && !isSearching && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-results-count">
                {searchResults.totalHits} results
              </Badge>
              {searchResults.fromCache && (
                <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20" data-testid="badge-cached">
                  <Database className="w-3 h-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
            <div className="text-sm text-muted-foreground">
              Page {searchResults.currentPage} of {searchResults.totalPages}
            </div>
          </div>

          <div className="space-y-3">
            {searchResults.foods.map((food) => (
              <Card 
                key={food.fdcId} 
                className="hover-elevate cursor-pointer"
                onClick={() => handleViewDetails(food.fdcId)}
                data-testid={`card-food-${food.fdcId}`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1" data-testid={`text-food-name-${food.fdcId}`}>
                        {food.description}
                      </h3>
                      {food.brandOwner && (
                        <p className="text-sm text-muted-foreground mb-2" data-testid={`text-brand-${food.fdcId}`}>
                          {food.brandOwner} {food.brandName && `- ${food.brandName}`}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge className={getDataTypeColor(food.dataType)} data-testid={`badge-type-${food.fdcId}`}>
                          {getDataTypeIcon(food.dataType)}
                          <span className="ml-1">{food.dataType}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          FDC ID: {food.fdcId}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {foodDetails?.description || "Loading..."}
            </DialogTitle>
          </DialogHeader>
          
          {isLoadingDetails && (
            <div className="space-y-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-40 w-full" />
            </div>
          )}

          {foodDetails && !isLoadingDetails && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge className={getDataTypeColor(foodDetails.dataType)}>
                  {getDataTypeIcon(foodDetails.dataType)}
                  <span className="ml-1">{foodDetails.dataType}</span>
                </Badge>
                {foodDetails.fromCache && (
                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20">
                    <Database className="w-3 h-3 mr-1" />
                    Cached
                  </Badge>
                )}
              </div>

              {foodDetails.brandOwner && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Brand</h4>
                  <p className="text-sm">
                    {foodDetails.brandOwner} {foodDetails.brandName && `- ${foodDetails.brandName}`}
                  </p>
                </div>
              )}

              {foodDetails.ingredients && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Ingredients</h4>
                  <p className="text-sm text-muted-foreground">{foodDetails.ingredients}</p>
                </div>
              )}

              {foodDetails.servingSize && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Serving Size</h4>
                  <p className="text-sm">
                    {foodDetails.servingSize} {foodDetails.servingSizeUnit}
                  </p>
                </div>
              )}

              <div>
                <h4 className="font-semibold text-sm mb-2">Nutrition Facts</h4>
                <div className="border rounded-lg p-3 space-y-2">
                  {importantNutrients.map(nutrient => {
                    const value = getNutrientValue(foodDetails.nutrients, nutrient.number);
                    return value ? (
                      <div key={nutrient.number} className="flex justify-between text-sm">
                        <span>{nutrient.name}</span>
                        <span className="font-medium">{value}</span>
                      </div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className="text-xs text-muted-foreground">
                FDC ID: {foodDetails.fdcId}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}