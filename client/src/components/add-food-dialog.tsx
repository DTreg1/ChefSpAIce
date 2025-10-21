import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useDebouncedCallback } from "@/lib/debounce";
import { useToast } from "@/hooks/use-toast";
import { UnifiedFoodSearch } from "@/components/unified-food-search";
import type {
  StorageLocation,
  USDASearchResponse,
  InsertFoodItem,
} from "@shared/schema";
import type { UploadResult } from "@uppy/core";

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Helper function to suggest shelf life based on food category
function getSuggestedShelfLife(category?: string, dataType?: string): number {
  if (!category) return 7; // Default 7 days for unknown items

  const cat = category.toLowerCase();

  // Fresh produce
  if (
    cat.includes("fruit") ||
    cat.includes("vegetable") ||
    cat.includes("produce")
  ) {
    return 7;
  }

  // Dairy products
  if (
    cat.includes("dairy") ||
    cat.includes("milk") ||
    cat.includes("cheese") ||
    cat.includes("yogurt")
  ) {
    return 10;
  }

  // Meat and poultry
  if (
    cat.includes("meat") ||
    cat.includes("poultry") ||
    cat.includes("beef") ||
    cat.includes("pork") ||
    cat.includes("chicken") ||
    cat.includes("fish") ||
    cat.includes("seafood")
  ) {
    return 3;
  }

  // Bread and bakery
  if (
    cat.includes("bread") ||
    cat.includes("bakery") ||
    cat.includes("baked")
  ) {
    return 5;
  }

  // Eggs
  if (cat.includes("egg")) {
    return 21;
  }

  // Frozen foods
  if (cat.includes("frozen")) {
    return 90; // 3 months
  }

  // Canned/packaged goods
  if (
    cat.includes("canned") ||
    cat.includes("packaged") ||
    cat.includes("snack") ||
    cat.includes("cereal") ||
    cat.includes("grain") ||
    cat.includes("pasta")
  ) {
    return 180; // 6 months
  }

  // Condiments and sauces
  if (
    cat.includes("sauce") ||
    cat.includes("condiment") ||
    cat.includes("dressing")
  ) {
    return 60; // 2 months
  }

  // Default for unknown categories
  return 14;
}

// Helper function to suggest storage location based on food category and description
function getSuggestedStorageLocation(
  category?: string,
  description?: string,
  storageLocations?: StorageLocation[],
): string | null {
  if (!storageLocations || storageLocations.length === 0) return null;

  // Combine category and description for more accurate detection
  const searchText = `${category || ""} ${description || ""}`.toLowerCase();

  // Frozen foods → Freezer (check both category and description)
  if (searchText.includes("frozen")) {
    return (
      storageLocations.find((loc) => loc.name.toLowerCase() === "freezer")
        ?.id || null
    );
  }

  // Fresh items that need refrigeration → Fridge
  if (
    searchText.includes("dairy") ||
    searchText.includes("milk") ||
    searchText.includes("cheese") ||
    searchText.includes("yogurt") ||
    searchText.includes("meat") ||
    searchText.includes("poultry") ||
    searchText.includes("beef") ||
    searchText.includes("pork") ||
    searchText.includes("chicken") ||
    searchText.includes("fish") ||
    searchText.includes("seafood") ||
    searchText.includes("egg") ||
    searchText.includes("fruit") ||
    searchText.includes("vegetable") ||
    searchText.includes("produce")
  ) {
    return (
      storageLocations.find((loc) => loc.name.toLowerCase() === "refridgerator")
        ?.id || null
    );
  }

  // Shelf-stable items → Pantry
  if (
    searchText.includes("canned") ||
    searchText.includes("packaged") ||
    searchText.includes("snack") ||
    searchText.includes("cereal") ||
    searchText.includes("grain") ||
    searchText.includes("pasta") ||
    searchText.includes("sauce") ||
    searchText.includes("condiment") ||
    searchText.includes("dressing")
  ) {
    return (
      storageLocations.find((loc) => loc.name.toLowerCase() === "pantry")?.id ||
      null
    );
  }

  // Bread and bakery → Counter
  if (
    searchText.includes("bread") ||
    searchText.includes("bakery") ||
    searchText.includes("baked")
  ) {
    return (
      storageLocations.find((loc) => loc.name.toLowerCase() === "counter")
        ?.id || null
    );
  }

  // Default to Fridge for unknown categories (safer for food safety)
  return (
    storageLocations.find((loc) => loc.name.toLowerCase() === "refridgerator")
      ?.id || null
  );
}

export function AddFoodDialog({ open, onOpenChange }: AddFoodDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [selectedUpc, setSelectedUpc] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  // Advanced search parameters
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [selectedDataTypes, setSelectedDataTypes] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>("relevance");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [brandOwner, setBrandOwner] = useState("");
  const [debouncedBrandOwner, setDebouncedBrandOwner] = useState("");

  // Image analysis state
  const [imageAnalysis, setImageAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisApplied, setAnalysisApplied] = useState(false);

  const { toast } = useToast();

  const { data: storageLocations } = useStorageLocations();

  // Set default storage location when dialog opens
  useEffect(() => {
    if (
      open &&
      storageLocations &&
      storageLocations.length > 0 &&
      !storageLocationId
    ) {
      // Default to fridge if available, otherwise first location
      const fridgeLocation = storageLocations.find(
        (loc) => loc.name.toLowerCase() === "refridgerator",
      );
      setStorageLocationId(fridgeLocation?.id || storageLocations[0].id);
    }
  }, [open, storageLocations]);

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setDebouncedSearchQuery("");
      setSelectedFood(null);
      setSelectedUpc(null);
      setQuantity("");
      setUnit("");
      setStorageLocationId("");
      setExpirationDate("");
      setImageUrl(null);
      setIsSearching(false);
      setShowAdvancedSearch(false);
      setSelectedDataTypes([]);
      setSortBy("relevance");
      setSortOrder("asc");
      setPageSize(20);
      setCurrentPage(1);
      setBrandOwner("");
      setDebouncedBrandOwner("");
      setImageAnalysis(null);
      setIsAnalyzing(false);
      setAnalysisApplied(false);
    }
  }, [open]);

  // Debounced brand owner search
  const debouncedBrandSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedBrandOwner(value);
    },
    300,
    [],
  );

  // Build query string with all parameters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append("query", debouncedSearchQuery);

    if (selectedDataTypes.length > 0) {
      params.append("dataType", selectedDataTypes.join(","));
    }

    // Don't send sortBy if it's "relevance" (default)
    if (sortBy && sortBy !== "relevance") {
      params.append("sortBy", sortBy);
    }

    if (sortOrder) {
      params.append("sortOrder", sortOrder);
    }

    if (pageSize !== 20) {
      params.append("pageSize", pageSize.toString());
    }

    if (currentPage !== 1) {
      params.append("pageNumber", currentPage.toString());
    }

    if (debouncedBrandOwner) {
      params.append("brandOwner", debouncedBrandOwner);
    }

    return params.toString();
  };

  // Use debounced query for automatic search
  const {
    data: searchResults,
    isFetching: searchLoading,
    refetch: refetchSearch,
  } = useQuery<USDASearchResponse>({
    queryKey: [`/api/usda/search?${buildQueryString()}`],
    enabled: debouncedSearchQuery.length > 0,
  });

  // Debounced search callback - triggers after 300ms of no typing
  const debouncedSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedSearchQuery(value);
      setIsSearching(false);
    },
    300,
    [],
  );

  // Handle input changes with debouncing
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1); // Reset to first page when search changes
    if (value.trim()) {
      setIsSearching(true);
      debouncedSearch(value.trim());
    } else {
      setIsSearching(false);
      setDebouncedSearchQuery("");
    }
  };

  // Handle brand owner change with debouncing
  const handleBrandOwnerChange = (value: string) => {
    setBrandOwner(value);
    setCurrentPage(1); // Reset to first page when brand filter changes
    debouncedBrandSearch(value.trim());
  };

  const addItemMutation = useMutation({
    mutationFn: async (data: InsertFoodItem) => {
      const response = await apiRequest("POST", "/api/food-items", data);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/items"] });
      toast({
        title: "Success",
        description: "Food item added to inventory",
      });
      handleClose();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add food item",
        variant: "destructive",
      });
    },
  });

  // Mutation for analyzing food image
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/food/analyze-image", {
        image: imageBase64,
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        const analysis = data.analysis;
        setImageAnalysis(analysis);

        // Auto-populate form fields with analysis results
        setSearchQuery(analysis.name || "");
        setQuantity(analysis.quantity?.replace(/[^0-9.]/g, "") || "1");
        setUnit(analysis.unit || "serving");

        // Suggest storage location based on category
        if (storageLocations && analysis.category) {
          const suggestedLocation = getSuggestedStorageLocation(
            analysis.category,
            analysis.name,
            storageLocations,
          );
          if (suggestedLocation) {
            setStorageLocationId(suggestedLocation);
          }
        }

        // Suggest expiration date based on category or use default
        if (!expirationDate && analysis.category) {
          const shelfLife = getSuggestedShelfLife(analysis.category);
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + shelfLife);
          setExpirationDate(futureDate.toISOString().split("T")[0]);
        }

        setAnalysisApplied(true);

        toast({
          title: "Image Analyzed",
          description: `Detected: ${analysis.name} (${analysis.confidence}% confidence)`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description:
            "Could not analyze the image. Please enter details manually.",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze the image",
        variant: "destructive",
      });
    },
    onSettled: () => {
      setIsAnalyzing(false);
    },
  });

  const handleClose = () => {
    setSearchQuery("");
    setDebouncedSearchQuery("");
    setSelectedFood(null);
    setSelectedUpc(null);
    setQuantity("");
    setUnit("");
    setStorageLocationId("");
    setExpirationDate("");
    setImageUrl(null);
    setIsSearching(false);
    // Reset advanced search parameters
    setShowAdvancedSearch(false);
    setSelectedDataTypes([]);
    setSortBy("relevance");
    setSortOrder("asc");
    setPageSize(20);
    setCurrentPage(1);
    setBrandOwner("");
    setDebouncedBrandOwner("");
    // Reset image analysis state
    setImageAnalysis(null);
    setIsAnalyzing(false);
    setAnalysisApplied(false);
    onOpenChange(false);
  };

  const handleGetUploadURL = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handleUploadComplete = async (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>,
  ) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      const response = await apiRequest("PUT", "/api/food-images", {
        imageURL: uploadedUrl,
      });
      const data = await response.json();
      setImageUrl(data.objectPath);
      // Reset analysis when new image is uploaded
      setImageAnalysis(null);
      setAnalysisApplied(false);
      toast({
        title: "Image uploaded",
        description:
          "Photo uploaded successfully. You can now analyze it to detect ingredients.",
      });
    }
  };

  const handleAnalyzeImage = async () => {
    if (!imageUrl) {
      toast({
        title: "No image",
        description: "Please upload an image first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);

    // Convert URL to base64 if needed, or send URL directly
    analyzeImageMutation.mutate(imageUrl);
  };

  const handleSearchBarcodeLookup = async () => {
    if (!searchQuery.trim() && !selectedUpc) {
      toast({
        title: "Search required",
        description: "Please select a food item first",
        variant: "destructive",
      });
      return;
    }

    try {
      let response;
      let searchMethod = "";

      // If we have a UPC barcode, use it for direct lookup
      if (selectedUpc) {
        searchMethod = `UPC ${selectedUpc}`;
        response = await apiRequest(
          "GET",
          `/api/barcodelookup/product/${encodeURIComponent(selectedUpc)}`,
          null,
        );
      } else {
        // Check if the search query looks like a barcode (numeric string, 8-14 digits)
        const simplifiedQuery = searchQuery.split(",")[0].trim();
        const isBarcodeFormat = /^\d{8,14}$/.test(simplifiedQuery);

        if (isBarcodeFormat) {
          // Treat as barcode lookup (will have fallback to OpenFoodFacts)
          searchMethod = `barcode ${simplifiedQuery}`;
          response = await apiRequest(
            "GET",
            `/api/barcodelookup/product/${encodeURIComponent(simplifiedQuery)}`,
            null,
          );
        } else {
          // Otherwise fall back to text search with simplified query
          const queryWithBrand = selectedFood?.brandOwner
            ? `${selectedFood.brandOwner} ${simplifiedQuery}`.trim()
            : simplifiedQuery;
          searchMethod = `search "${queryWithBrand}"`;
          response = await apiRequest(
            "GET",
            `/api/barcodelookup/search?query=${encodeURIComponent(queryWithBrand)}`,
            null,
          );
        }
      }

      const data = await response.json();

      // Handle direct product lookup response
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        toast({
          title: "Product image found",
          description: `Found image using ${searchMethod}`,
        });
      }
      // Handle search results response
      else if (
        data.products &&
        data.products.length > 0 &&
        data.products[0].imageUrl
      ) {
        setImageUrl(data.products[0].imageUrl);
        toast({
          title: "Product image found",
          description: `Found image for ${data.products[0].name}`,
        });
      } else {
        toast({
          title: "No image found",
          description: "No product images found. Try uploading your own photo.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Barcode Lookup search error:", error);
      toast({
        title: "Search failed",
        description: "Failed to search for product images. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Handlers for unified search selections
  const handleSelectUSDA = (food: any) => {
    setSelectedFood(food);
    setSelectedUpc(food.gtinUpc || null);
    setSearchQuery(food.description);
    
    if (food.servingSize && food.servingSizeUnit) {
      setQuantity(food.servingSize.toString());
      setUnit(food.servingSizeUnit);
    } else {
      setQuantity("1");
      setUnit("piece");
    }
    
    const suggestedDays = getSuggestedShelfLife(food.foodCategory, food.dataType);
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
    setExpirationDate(suggestedDate.toISOString().split("T")[0]);
    
    const suggestedLocationId = getSuggestedStorageLocation(
      food.foodCategory,
      food.description,
      storageLocations,
    );
    if (suggestedLocationId) {
      setStorageLocationId(suggestedLocationId);
    }
  };

  const handleSelectBarcodeLookup = (product: any) => {
    setSelectedFood({
      description: product.title || "Unknown Product",
      brandOwner: product.brand || product.manufacturer,
      foodCategory: product.category,
      dataType: "Branded"
    });
    setSearchQuery(product.title || "Unknown Product");
    setSelectedUpc(product.barcode_number || null);
    
    if (product.images && product.images[0]) {
      setImageUrl(product.images[0]);
    }
    
    setQuantity("1");
    setUnit("piece");
    
    const suggestedDays = getSuggestedShelfLife(product.category);
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
    setExpirationDate(suggestedDate.toISOString().split("T")[0]);
    
    const suggestedLocationId = getSuggestedStorageLocation(
      product.category,
      product.title,
      storageLocations,
    );
    if (suggestedLocationId) {
      setStorageLocationId(suggestedLocationId);
    }
  };

  const handleSelectOpenFoodFacts = (product: any) => {
    setSelectedFood({
      description: product.product_name || "Unknown Product",
      brandOwner: product.brands,
      foodCategory: product.categories,
      dataType: "Open Food Facts"
    });
    setSearchQuery(product.product_name || "Unknown Product");
    setSelectedUpc(product.code || null);
    
    if (product.image_url) {
      setImageUrl(product.image_url);
    }
    
    // Parse quantity and unit from the quantity string (e.g., "500g", "1L", "12 oz", "6 x 250 g", "6x250g", "6x 250 g")
    if (product.quantity) {
      let quantityStr = product.quantity;
      
      // Detect multi-pack patterns (e.g., "6x250g", "6 x 250g", "6x 250 g")
      if (/\d\s*[x×]\s*\d/i.test(quantityStr)) {
        const parts = quantityStr.split(/\s*[x×]\s*/i);
        quantityStr = parts[parts.length - 1]; // Take the last part (the per-unit size)
      }
      
      // Extract number and unit (e.g., "250 g", "500ml", "12oz")
      const quantityMatch = quantityStr.match(/(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?/);
      if (quantityMatch) {
        setQuantity(quantityMatch[1]);
        
        // Normalize unit abbreviations to match common units in the dialog
        const rawUnit = quantityMatch[2]?.toLowerCase() || "piece";
        const unitMap: Record<string, string> = {
          'g': 'gram',
          'kg': 'kilogram',
          'ml': 'milliliter',
          'l': 'liter',
          'oz': 'ounce',
          'lb': 'pound',
          'mg': 'milligram',
          'fl': 'fluid ounce',
        };
        setUnit(unitMap[rawUnit] || rawUnit);
      } else {
        setQuantity("1");
        setUnit("piece");
      }
    } else {
      setQuantity("1");
      setUnit("piece");
    }
    
    const suggestedDays = getSuggestedShelfLife(product.categories);
    const suggestedDate = new Date();
    suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
    setExpirationDate(suggestedDate.toISOString().split("T")[0]);
    
    const suggestedLocationId = getSuggestedStorageLocation(
      product.categories,
      product.product_name,
      storageLocations,
    );
    if (suggestedLocationId) {
      setStorageLocationId(suggestedLocationId);
    }
  };

  const handleSubmit = () => {
    console.log("handleSubmit called with:", {
      selectedFood,
      searchQuery,
      quantity,
      unit,
      storageLocationId,
      expirationDate,
    });

    // Validate that we have either a selected food or a search query
    if (!selectedFood && !searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please select a food item or enter a name",
        variant: "destructive",
      });
      return;
    }

    // Check all required fields individually for better error reporting
    const missingFields = [];
    if (!quantity) missingFields.push("quantity");
    if (!unit) missingFields.push("unit");
    if (!storageLocationId) missingFields.push("storage location");
    if (!expirationDate) missingFields.push("expiration date");

    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in: ${missingFields.join(", ")}`,
        variant: "destructive",
      });
      console.error("Missing fields:", missingFields);
      return;
    }

    // Log the mutation data for debugging
    const mutationData = {
      name: selectedFood?.description || searchQuery,
      fcdId: selectedFood?.fdcId?.toString() || null,
      quantity,
      unit,
      storageLocationId,
      expirationDate,
      imageUrl: imageUrl,
      nutrition: selectedFood?.nutrition
        ? JSON.stringify(selectedFood.nutrition)
        : null,
      usdaData: selectedFood || null,
      foodCategory: selectedFood?.foodCategory || null,
    };

    console.log("Submitting mutation with data:", mutationData);

    addItemMutation.mutate(mutationData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-muted">
        <DialogHeader>
          <DialogTitle>Add Food Item</DialogTitle>
          <DialogDescription>
            Search across USDA, Barcode Lookup, and Open Food Facts databases for comprehensive food information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <Tabs defaultValue="unified" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="unified" data-testid="tab-unified-search">Unified Search</TabsTrigger>
              <TabsTrigger value="advanced" data-testid="tab-advanced-search">Advanced USDA</TabsTrigger>
            </TabsList>

            <TabsContent value="unified" className="space-y-4">
              <UnifiedFoodSearch
                onSelectUSDA={handleSelectUSDA}
              />
              
              {/* Form fields for unified search */}
              {selectedFood && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="description-unified">Food Description *</Label>
                    <Input
                      id="description-unified"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Food description"
                      data-testid="input-description-unified"
                    />
                  </div>

                  {imageUrl && (
                    <div className="space-y-2">
                      <Label>Product Image</Label>
                      <img 
                        src={imageUrl} 
                        alt={searchQuery}
                        className="w-full max-w-xs rounded-lg border border-border"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quantity-unified">Quantity *</Label>
                      <Input
                        id="quantity-unified"
                        type="text"
                        placeholder="e.g., 2, 1.5"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        data-testid="input-quantity"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="unit-unified">Unit *</Label>
                      <Input
                        id="unit-unified"
                        placeholder="e.g., lbs, kg, cups"
                        value={unit}
                        onChange={(e) => setUnit(e.target.value)}
                        data-testid="input-unit"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label id="storage-location-label-unified">Storage Location *</Label>
                    <ToggleGroup
                      type="single"
                      value={storageLocationId}
                      onValueChange={setStorageLocationId}
                      aria-labelledby="storage-location-label-unified"
                      className="flex flex-wrap gap-2 justify-start"
                    >
                      {storageLocations?.map((location) => (
                        <ToggleGroupItem
                          key={location.id}
                          value={location.id}
                          aria-label={`Select ${location.name}`}
                          className="rounded-full"
                          data-testid={`button-storage-${location.name.toLowerCase()}`}
                        >
                          {location.name}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="expiration-unified">Expiration Date *</Label>
                    <Input
                      id="expiration-unified"
                      type="date"
                      value={expirationDate}
                      onChange={(e) => setExpirationDate(e.target.value)}
                      data-testid="input-expiration"
                    />
                    <p className="text-xs text-muted-foreground">
                      Auto-suggested based on food type. Always verify with the package label.
                    </p>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label>Search USDA Database</Label>
                <div className="space-y-2">
                  <Input
                    placeholder="Search for food items... (searches automatically as you type)"
                    value={searchQuery}
                    onChange={(e) => handleSearchInputChange(e.target.value)}
                    data-testid="input-usda-search"
                  />

                  {(isSearching || searchLoading) && (
                    <div className="text-sm text-muted-foreground">
                      Searching USDA database...
                    </div>
                  )}
                </div>
              </div>

              {searchResults && searchResults.foods.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Search Results</Label>
                <span className="text-sm text-muted-foreground">
                  {searchResults.totalHits} total results
                </span>
              </div>
              <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
                {searchResults.foods.map((food) => (
                  <button
                    key={food.fdcId}
                    onClick={() => {
                      setSelectedFood(food);
                      setSelectedUpc(food.gtinUpc || null);
                      setSearchQuery(food.description);
                      // Auto-fill serving size if available
                      if (food.servingSize && food.servingSizeUnit) {
                        setQuantity(food.servingSize.toString());
                        setUnit(food.servingSizeUnit);
                      } else {
                        // Default to 1 piece/item if no serving info
                        setQuantity("1");
                        setUnit("piece");
                      }
                      // Auto-suggest expiration date based on food category
                      const suggestedDays = getSuggestedShelfLife(
                        food.foodCategory,
                        food.dataType,
                      );
                      const suggestedDate = new Date();
                      suggestedDate.setDate(
                        suggestedDate.getDate() + suggestedDays,
                      );
                      setExpirationDate(
                        suggestedDate.toISOString().split("T")[0],
                      );
                      // Auto-select storage location based on food category and description
                      const suggestedLocationId = getSuggestedStorageLocation(
                        food.foodCategory,
                        food.description,
                        storageLocations,
                      );
                      if (suggestedLocationId) {
                        setStorageLocationId(suggestedLocationId);
                      }
                    }}
                    className={`w-full p-3 text-left hover-elevate border-b border-border last:border-0 ${
                      selectedFood?.fdcId === food.fdcId ? "bg-accent" : ""
                    }`}
                    data-testid={`button-select-food-${food.fdcId}`}
                  >
                    <div className="font-medium">{food.description}</div>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {food.brandOwner && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">
                          {food.brandOwner}
                        </span>
                      )}
                      {food.gtinUpc && (
                        <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded font-mono">
                          UPC: {food.gtinUpc}
                        </span>
                      )}
                      {food.foodCategory && (
                        <span className="text-xs bg-secondary/50 text-secondary-foreground px-2 py-0.5 rounded">
                          {food.foodCategory}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground font-mono">
                        {food.dataType} • ID: {food.fdcId}
                      </span>
                    </div>
                  </button>
                ))}
              </div>

              {/* Pagination Controls */}
              {searchResults.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {currentPage} of {searchResults.totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setCurrentPage((prev) =>
                        Math.min(searchResults.totalPages, prev + 1),
                      )
                    }
                    disabled={currentPage === searchResults.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Display nutrition information if selected food has nutrition data */}
          {selectedFood?.nutrition && (
            <div className="bg-muted/50 border border-border rounded-lg p-4 space-y-2">
              <h4 className="font-medium text-sm">
                Nutrition Information (per {selectedFood.servingSize} {selectedFood.servingSizeUnit})
              </h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Calories:</span>
                  <span className="font-medium">
                    {Math.round(selectedFood.nutrition.calories)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Protein:</span>
                  <span className="font-medium">
                    {selectedFood.nutrition.protein}{selectedFood.servingSizeUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Carbs:</span>
                  <span className="font-medium">
                    {selectedFood.nutrition.carbs}{selectedFood.servingSizeUnit}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fat:</span>
                  <span className="font-medium">
                    {selectedFood.nutrition.fat}{selectedFood.servingSizeUnit}
                  </span>
                </div>
                {selectedFood.nutrition.fiber !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Fiber:</span>
                    <span className="font-medium">
                      {selectedFood.nutrition.fiber}{selectedFood.servingSizeUnit}
                    </span>
                  </div>
                )}
                {selectedFood.nutrition.sugar !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sugar:</span>
                    <span className="font-medium">
                      {selectedFood.nutrition.sugar}{selectedFood.servingSizeUnit}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity *</Label>
              <Input
                id="quantity"
                type="text"
                placeholder="e.g., 2, 1.5"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Unit *</Label>
              <Input
                id="unit"
                placeholder="e.g., lbs, kg, cups"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                data-testid="input-unit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label id="storage-location-label">Storage Location *</Label>
            <ToggleGroup
              type="single"
              value={storageLocationId}
              onValueChange={setStorageLocationId}
              aria-labelledby="storage-location-label"
              className="flex flex-wrap gap-2 justify-start"
            >
              {storageLocations?.map((location) => (
                <ToggleGroupItem
                  key={location.id}
                  value={location.id}
                  aria-label={`Select ${location.name}`}
                  className="rounded-full"
                  data-testid={`button-storage-${location.name.toLowerCase()}`}
                >
                  {location.name}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="expiration">Expiration Date *</Label>
            <Input
              id="expiration"
              type="date"
              value={expirationDate}
              onChange={(e) => setExpirationDate(e.target.value)}
              data-testid="input-expiration"
            />
            <p className="text-xs text-muted-foreground">
              Auto-suggested based on food type. Always verify with the package
              label.
            </p>
          </div>
          </TabsContent>
          </Tabs>
        </div>

        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            className="touch-target"
            onClick={handleClose}
            data-testid="button-cancel"
          >
            Cancel
          </Button>
          <Button
            className="touch-target"
            onClick={handleSubmit}
            disabled={addItemMutation.isPending}
            data-testid="button-submit-food"
          >
            {addItemMutation.isPending ? "Adding..." : "Add Item"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
