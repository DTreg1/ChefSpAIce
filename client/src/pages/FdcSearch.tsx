import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useDebouncedCallback } from "@/lib/debounce";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  Package,
  Apple,
  Wheat,
  Utensils,
  ChevronRight,
  Database,
  ChevronLeft,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarcodeScanner } from "@/components/BarcodeScanner";

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
  gtinUpc?: string;
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
  gtinUpc?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  nutrients?: FoodNutrient[];
  foodNutrients?: any[];
  fromCache?: boolean;
}

const SORT_OPTIONS = [
  { value: "lowercaseDescription.keyword", label: "Description" },
  { value: "dataType.keyword", label: "Data Type" },
  { value: "fdcId", label: "FDC ID" },
  { value: "publishedDate", label: "Published Date" },
];

const PAGE_SIZES = [25, 50, 100, 200];

export default function FdcSearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentQuery, setCurrentQuery] = useState("");
  const [brandOwners, setBrandOwners] = useState<string[]>([]);
  const [brandInput, setBrandInput] = useState("");
  const [upcCode, setUpcCode] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(25);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedFood, setSelectedFood] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const { toast } = useToast();

  // Debounced search callback - triggers after 400ms of no typing
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setCurrentQuery(value);
      setCurrentPage(1);
      setIsTyping(false);
    },
    400,
    []
  );

  // Handle input changes with debouncing
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setIsTyping(true);
      debouncedSearch(value.trim());
    } else {
      setIsTyping(false);
      setCurrentQuery("");
    }
  };

  const buildQueryParams = () => {
    const params = new URLSearchParams();
    // Include UPC in search query if provided
    const searchTerms = [currentQuery, upcCode].filter(Boolean).join(" ");
    if (searchTerms) params.append("query", searchTerms);
    // Append each brand owner separately to handle brands with commas
    if (brandOwners.length > 0) {
      brandOwners.forEach((brand) => {
        params.append("brandOwner", brand);
      });
    }
    if (sortBy) {
      params.append("sortBy", sortBy);
      params.append("sortOrder", sortOrder);
    }
    params.append("pageSize", pageSize.toString());
    params.append("pageNumber", currentPage.toString());
    return params.toString();
  };

  // Search query
  const { data: searchResults, isLoading: isSearching } =
    useQuery<SearchResponse>({
      queryKey: [`/api/fdc/search?${buildQueryParams()}`],
      enabled: !!currentQuery || !!upcCode,
    });

  // Food details query
  const { data: foodDetails, isLoading: isLoadingDetails } =
    useQuery<FoodDetails>({
      queryKey: ["/api/fdc/food", selectedFood],
      enabled: !!selectedFood && detailsOpen,
    });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setCurrentQuery(searchQuery.trim());
      setCurrentPage(1);
    }
  };

  const handleViewDetails = (fdcId: string) => {
    setSelectedFood(fdcId);
    setDetailsOpen(true);
  };

  const handleAddBrand = () => {
    const trimmedBrand = brandInput.trim();
    if (trimmedBrand && !brandOwners.includes(trimmedBrand)) {
      setBrandOwners((prev) => [...prev, trimmedBrand]);
      setBrandInput("");
      setCurrentPage(1);
    }
  };

  const handleRemoveBrand = (brandToRemove: string) => {
    setBrandOwners((prev) => prev.filter((b) => b !== brandToRemove));
    setCurrentPage(1);
  };

  const handleBrandInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddBrand();
    }
  };

  const handleClearFilters = () => {
    setBrandOwners([]);
    setBrandInput("");
    setUpcCode("");
    setSortBy("");
    setSortOrder("asc");
    setPageSize(25);
    setCurrentPage(1);
  };

  const hasActiveFilters =
    brandOwners.length > 0 || sortBy !== "" || upcCode !== "";

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

  const getNutrientValue = (
    nutrients: FoodNutrient[] | undefined,
    nutrientNumber: string,
  ) => {
    if (!nutrients) return null;
    const nutrient = nutrients.find((n) => n.nutrientNumber === nutrientNumber);
    return nutrient ? `${nutrient.value} ${nutrient.unitName}` : "N/A";
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-6 h-6" />
            USDA Food Data Central
          </CardTitle>
          <CardDescription>
            Search the comprehensive database for nutritional information on any
            food
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Label
            htmlFor="brand-owner"
            className="text-sm font-semibold mb-2 block"
          >
            Search
          </Label>
          <form onSubmit={handleSearch} className="flex flex-col gap-2">
            <div className="flex gap-2">
              <Input
                type="text"
                placeholder="Search for foods (searches automatically as you type)"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                className="flex-1"
              data-testid="input-search"
            />
            <Button
              type="submit"
              disabled={isSearching}
              data-testid="button-search"
            >
              <Search className="w-4 h-4 mr-2" />
              Search
            </Button>
            </div>
            {(isTyping || isSearching) && (
              <div className="text-sm text-muted-foreground">
                Searching FDA database...
              </div>
            )}
          </form>

          <div className="space-y-4">
            {hasActiveFilters && (
              <div className="flex items-center justify-end">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleClearFilters}
                  data-testid="button-clear-filters"
                  className="gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              </div>
            )}
            <div>
              <Label
                htmlFor="brand-owner"
                className="text-sm font-semibold mb-2 block"
              >
                Brand Owners
              </Label>
              <div className="flex gap-2">
                <Input
                  id="brand-owner"
                  type="text"
                  placeholder="e.g., 'General Mills', 'Kraft'"
                  value={brandInput}
                  onChange={(e) => setBrandInput(e.target.value)}
                  onKeyDown={handleBrandInputKeyDown}
                  data-testid="input-brand-owner"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleAddBrand}
                  disabled={!brandInput.trim()}
                  data-testid="button-add-brand"
                >
                  Add
                </Button>
              </div>
              {brandOwners.length > 0 && (
                <div
                  className="flex flex-wrap gap-2 mt-2"
                  data-testid="brand-pills"
                >
                  {brandOwners.map((brand) => (
                    <Badge key={brand} variant="secondary" className="gap-1">
                      {brand}
                      <X
                        className="w-3 h-3 cursor-pointer hover-elevate"
                        onClick={() => handleRemoveBrand(brand)}
                        data-testid={`button-remove-brand-${brand.toLowerCase().replace(/\s+/g, "-")}`}
                      />
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label
                htmlFor="upc-code"
                className="text-sm font-semibold mb-2 block"
              >
                UPC/GTIN Code
              </Label>
              <div className="flex gap-2">
                <Input
                  id="upc-code"
                  type="text"
                  placeholder="e.g., '077034085228'"
                  value={upcCode}
                  onChange={(e) => {
                    setUpcCode(e.target.value);
                    setCurrentPage(1);
                  }}
                  data-testid="input-upc"
                  className="flex-1"
                />
                <BarcodeScanner
                  onScanSuccess={(barcode) => {
                    setUpcCode(barcode);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label
                  htmlFor="sort-by"
                  className="text-sm font-semibold mb-2 block"
                >
                  Sort By
                </Label>
                <Select
                  value={sortBy || "none"}
                  onValueChange={(value) => {
                    setSortBy(value === "none" ? "" : value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="sort-by" data-testid="select-sort-by">
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {SORT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="sort-order"
                  className="text-sm font-semibold mb-2 block"
                >
                  Sort Order
                </Label>
                <Select
                  value={sortOrder}
                  onValueChange={(value: "asc" | "desc") => {
                    setSortOrder(value);
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger
                    id="sort-order"
                    data-testid="select-sort-order"
                    disabled={!sortBy}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label
                  htmlFor="page-size"
                  className="text-sm font-semibold mb-2 block"
                >
                  Results Per Page
                </Label>
                <Select
                  value={pageSize.toString()}
                  onValueChange={(value) => {
                    setPageSize(parseInt(value));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger id="page-size" data-testid="select-page-size">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAGE_SIZES.map((size) => (
                      <SelectItem key={size} value={size.toString()}>
                        {size}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="flex flex-wrap gap-2" data-testid="active-filters">
              {brandOwners.map((brand) => (
                <Badge key={brand} variant="secondary" className="gap-1">
                  Brand: {brand}
                  <X
                    className="w-3 h-3 cursor-pointer hover-elevate"
                    onClick={() => handleRemoveBrand(brand)}
                  />
                </Badge>
              ))}
              {upcCode && (
                <Badge
                  variant="secondary"
                  className="gap-1"
                  data-testid="badge-upc-filter"
                >
                  UPC: {upcCode}
                  <X
                    className="w-3 h-3 cursor-pointer hover-elevate"
                    onClick={() => {
                      setUpcCode("");
                      setCurrentPage(1);
                    }}
                    data-testid="button-remove-upc"
                  />
                </Badge>
              )}
              {sortBy && (
                <Badge variant="secondary" className="gap-1">
                  Sort: {SORT_OPTIONS.find((o) => o.value === sortBy)?.label} (
                  {sortOrder})
                  <X
                    className="w-3 h-3 cursor-pointer hover-elevate"
                    onClick={() => {
                      setSortBy("");
                      setCurrentPage(1);
                    }}
                  />
                </Badge>
              )}
            </div>
          )}
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
          <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" data-testid="badge-results-count">
                {searchResults.totalHits} results
              </Badge>
              {searchResults.fromCache && (
                <Badge
                  variant="outline"
                  className="bg-green-50 dark:bg-green-900/20"
                  data-testid="badge-cached"
                >
                  <Database className="w-3 h-3 mr-1" />
                  Cached
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">
                Page {searchResults.currentPage} of {searchResults.totalPages}
              </span>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  data-testid="button-prev-page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() =>
                    setCurrentPage((p) =>
                      Math.min(searchResults.totalPages, p + 1),
                    )
                  }
                  disabled={currentPage === searchResults.totalPages}
                  data-testid="button-next-page"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
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
                      <h3
                        className="font-semibold text-lg mb-1"
                        data-testid={`text-food-name-${food.fdcId}`}
                      >
                        {food.description}
                      </h3>
                      {food.brandOwner && (
                        <p
                          className="text-sm text-muted-foreground mb-2"
                          data-testid={`text-brand-${food.fdcId}`}
                        >
                          {food.brandOwner}{" "}
                          {food.brandName && `- ${food.brandName}`}
                        </p>
                      )}
                      {food.gtinUpc && (
                        <p
                          className="text-sm text-muted-foreground mb-2"
                          data-testid={`text-upc-${food.fdcId}`}
                        >
                          UPC: {food.gtinUpc}
                        </p>
                      )}
                      <div className="flex items-center gap-2">
                        <Badge
                          className={getDataTypeColor(food.dataType)}
                          data-testid={`badge-type-${food.fdcId}`}
                        >
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
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto bg-muted">
          <DialogHeader>
            <DialogTitle>
              {foodDetails?.description || "Loading..."}
            </DialogTitle>
            <DialogDescription>
              Detailed nutritional information from USDA FoodData Central
            </DialogDescription>
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
                  <Badge
                    variant="outline"
                    className="bg-green-50 dark:bg-green-900/20"
                  >
                    <Database className="w-3 h-3 mr-1" />
                    Cached
                  </Badge>
                )}
              </div>

              {foodDetails.brandOwner && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Brand</h4>
                  <p className="text-sm">
                    {foodDetails.brandOwner}{" "}
                    {foodDetails.brandName && `- ${foodDetails.brandName}`}
                  </p>
                </div>
              )}

              {foodDetails.gtinUpc && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">UPC/GTIN</h4>
                  <p className="text-sm" data-testid="text-upc-details">
                    {foodDetails.gtinUpc}
                  </p>
                </div>
              )}

              {foodDetails.ingredients && (
                <div>
                  <h4 className="font-semibold text-sm mb-1">Ingredients</h4>
                  <p className="text-sm text-muted-foreground">
                    {foodDetails.ingredients}
                  </p>
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
                  {importantNutrients.map((nutrient) => {
                    const value = getNutrientValue(
                      foodDetails.nutrients,
                      nutrient.number,
                    );
                    return value ? (
                      <div
                        key={nutrient.number}
                        className="flex justify-between text-sm"
                      >
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
