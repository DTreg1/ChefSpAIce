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
import { Search, Upload, ImageOff, ChevronDown, ChevronUp, Filter, Loader2, ScanEye, Calendar as CalendarIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useDebouncedCallback } from "@/lib/debounce";
import { useToast } from "@/hooks/use-toast";
import { getUserErrorMessage } from "@/lib/errorUtils";
import { ObjectUploader } from "./ObjectUploader";
import { BarcodeRateLimitInfo } from "./barcode-rate-limit-info";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { StorageLocation, USDASearchResponse, InsertFoodItem } from "@shared/schema";
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
  if (cat.includes('fruit') || cat.includes('vegetable') || cat.includes('produce')) {
    return 7;
  }
  
  // Dairy products
  if (cat.includes('dairy') || cat.includes('milk') || cat.includes('cheese') || cat.includes('yogurt')) {
    return 10;
  }
  
  // Meat and poultry
  if (cat.includes('meat') || cat.includes('poultry') || cat.includes('beef') || 
      cat.includes('pork') || cat.includes('chicken') || cat.includes('fish') || cat.includes('seafood')) {
    return 3;
  }
  
  // Bread and bakery
  if (cat.includes('bread') || cat.includes('bakery') || cat.includes('baked')) {
    return 5;
  }
  
  // Eggs
  if (cat.includes('egg')) {
    return 21;
  }
  
  // Frozen foods
  if (cat.includes('frozen')) {
    return 90; // 3 months
  }
  
  // Canned/packaged goods
  if (cat.includes('canned') || cat.includes('packaged') || cat.includes('snack') || 
      cat.includes('cereal') || cat.includes('grain') || cat.includes('pasta')) {
    return 180; // 6 months
  }
  
  // Condiments and sauces
  if (cat.includes('sauce') || cat.includes('condiment') || cat.includes('dressing')) {
    return 60; // 2 months
  }
  
  // Default for unknown categories
  return 14;
}

// Helper function to suggest storage location based on food category and description
function getSuggestedStorageLocation(category?: string, description?: string, storageLocations?: StorageLocation[]): string | null {
  if (!storageLocations || storageLocations.length === 0) return null;
  
  // Combine category and description for more accurate detection
  const searchText = `${category || ''} ${description || ''}`.toLowerCase();
  
  // Frozen foods → Freezer (check both category and description)
  if (searchText.includes('frozen')) {
    return storageLocations.find(loc => loc.name.toLowerCase() === 'freezer')?.id || null;
  }
  
  // Fresh items that need refrigeration → Fridge
  if (searchText.includes('dairy') || searchText.includes('milk') || searchText.includes('cheese') || searchText.includes('yogurt') ||
      searchText.includes('meat') || searchText.includes('poultry') || searchText.includes('beef') || searchText.includes('pork') || 
      searchText.includes('chicken') || searchText.includes('fish') || searchText.includes('seafood') ||
      searchText.includes('egg') || searchText.includes('fruit') || searchText.includes('vegetable') || searchText.includes('produce')) {
    return storageLocations.find(loc => loc.name.toLowerCase() === 'fridge')?.id || null;
  }
  
  // Shelf-stable items → Pantry
  if (searchText.includes('canned') || searchText.includes('packaged') || searchText.includes('snack') || 
      searchText.includes('cereal') || searchText.includes('grain') || searchText.includes('pasta') ||
      searchText.includes('sauce') || searchText.includes('condiment') || searchText.includes('dressing')) {
    return storageLocations.find(loc => loc.name.toLowerCase() === 'pantry')?.id || null;
  }
  
  // Bread and bakery → Counter
  if (searchText.includes('bread') || searchText.includes('bakery') || searchText.includes('baked')) {
    return storageLocations.find(loc => loc.name.toLowerCase() === 'counter')?.id || null;
  }
  
  // Default to Fridge for unknown categories (safer for food safety)
  return storageLocations.find(loc => loc.name.toLowerCase() === 'fridge')?.id || null;
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
  const [imageSource, setImageSource] = useState<"branded" | "upload" | "none">("none");
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

  // Debounced brand owner search
  const debouncedBrandSearch = useDebouncedCallback(
    (value: string) => {
      setDebouncedBrandOwner(value);
    },
    300,
    []
  );
  
  // Build query string with all parameters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    params.append('query', debouncedSearchQuery);
    
    if (selectedDataTypes.length > 0) {
      params.append('dataType', selectedDataTypes.join(','));
    }
    
    // Don't send sortBy if it's "relevance" (default)
    if (sortBy && sortBy !== "relevance") {
      params.append('sortBy', sortBy);
    }
    
    if (sortOrder) {
      params.append('sortOrder', sortOrder);
    }
    
    if (pageSize !== 20) {
      params.append('pageSize', pageSize.toString());
    }
    
    if (currentPage !== 1) {
      params.append('pageNumber', currentPage.toString());
    }
    
    if (debouncedBrandOwner) {
      params.append('brandOwner', debouncedBrandOwner);
    }
    
    return params.toString();
  };
  
  // Use debounced query for automatic search
  const { data: searchResults, isFetching: searchLoading, refetch: refetchSearch } = useQuery<USDASearchResponse>({
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
    []
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
    onError: (error) => {
      toast({
        title: "Error",
        description: getUserErrorMessage(error),
        variant: "destructive",
      });
    },
  });

  // Mutation for analyzing food image
  const analyzeImageMutation = useMutation({
    mutationFn: async (imageBase64: string) => {
      const response = await apiRequest("POST", "/api/food/analyze-image", {
        image: imageBase64
      });
      return await response.json();
    },
    onSuccess: (data) => {
      if (data.success && data.analysis) {
        const analysis = data.analysis;
        setImageAnalysis(analysis);
        
        // Auto-populate form fields with analysis results
        setSearchQuery(analysis.name || "");
        setQuantity(analysis.quantity?.replace(/[^0-9.]/g, '') || "1");
        setUnit(analysis.unit || "serving");
        
        // Suggest storage location based on category
        if (storageLocations && analysis.category) {
          const suggestedLocation = getSuggestedStorageLocation(analysis.category, analysis.name, storageLocations);
          if (suggestedLocation) {
            setStorageLocationId(suggestedLocation);
          }
        }
        
        // Suggest expiration date based on category or use default
        if (!expirationDate && analysis.category) {
          const shelfLife = getSuggestedShelfLife(analysis.category);
          const futureDate = new Date();
          futureDate.setDate(futureDate.getDate() + shelfLife);
          setExpirationDate(futureDate.toISOString().split('T')[0]);
        }
        
        setAnalysisApplied(true);
        
        toast({
          title: "Image Analyzed",
          description: `Detected: ${analysis.name} (${analysis.confidence}% confidence)`,
        });
      } else {
        toast({
          title: "Analysis Failed",
          description: "Could not analyze the image. Please enter details manually.",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      toast({
        title: "Analysis Error",
        description: getUserErrorMessage(error),
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
    setImageSource("none");
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

  const handleUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      // Validate result structure
      if (!result || !result.successful || !Array.isArray(result.successful)) {
        console.error("Invalid upload result structure:", result);
        toast({
          title: "Upload Error",
          description: "Upload completed but response was invalid. Please try again.",
          variant: "destructive",
        });
        return;
      }

      if (result.successful.length === 0) {
        // Check if there were failed uploads
        if (result.failed && result.failed.length > 0) {
          const failedItem = result.failed[0];
          // The error might be stored in different ways depending on the upload library
          const errorMessage = (() => {
            if (!failedItem) return "Upload failed for unknown reason";
            
            // Check if error is a string
            if (typeof failedItem.error === 'string') {
              return failedItem.error;
            }
            
            // Check if error is an object with message property
            if (failedItem.error && typeof failedItem.error === 'object' && 'message' in failedItem.error) {
              return (failedItem.error as any).message;
            }
            
            // Check for response or meta property that might contain error info
            if ((failedItem as any).response?.error) {
              return (failedItem as any).response.error;
            }
            
            return "Upload failed for unknown reason";
          })();
          toast({
            title: "Upload Failed",
            description: errorMessage,
            variant: "destructive",
          });
        } else {
          toast({
            title: "Upload Failed",
            description: "No files were uploaded successfully. Please try again.",
            variant: "destructive",
          });
        }
        return;
      }

      // Safely access the first successful upload
      const firstSuccess = result.successful[0];
      if (!firstSuccess || !firstSuccess.uploadURL) {
        console.error("Missing uploadURL in successful upload:", firstSuccess);
        toast({
          title: "Upload Error",
          description: "Upload completed but no URL was returned. Please try again.",
          variant: "destructive",
        });
        return;
      }

      const uploadedUrl = firstSuccess.uploadURL;
      const response = await apiRequest("PUT", "/api/food-images", { imageURL: uploadedUrl });
      const data = await response.json();
      
      if (!data || !data.objectPath) {
        throw new Error("Invalid response from food-images API");
      }
      
      setImageUrl(data.objectPath);
      setImageSource("upload");
      // Reset analysis when new image is uploaded
      setImageAnalysis(null);
      setAnalysisApplied(false);
      toast({
        title: "Image uploaded",
        description: "Photo uploaded successfully. You can now analyze it to detect ingredients.",
      });
    } catch (error: any) {
      console.error("Error handling upload completion:", error);
      toast({
        title: "Upload Error",
        description: error.message || "Failed to process uploaded image. Please try again.",
        variant: "destructive",
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
        response = await apiRequest("GET", `/api/barcodelookup/product/${encodeURIComponent(selectedUpc)}`, null);
      } else {
        // Otherwise fall back to text search with simplified query
        const simplifiedQuery = selectedFood?.brandOwner 
          ? `${selectedFood.brandOwner} ${searchQuery.split(',')[0].trim()}`.trim()
          : searchQuery.split(',')[0].trim();
        searchMethod = `search "${simplifiedQuery}"`;
        response = await apiRequest("GET", `/api/barcodelookup/search?query=${encodeURIComponent(simplifiedQuery)}`, null);
      }
      
      const data = await response.json();
      
      // Handle direct product lookup response
      if (data.imageUrl) {
        setImageUrl(data.imageUrl);
        setImageSource("branded");
        toast({
          title: "Product image found",
          description: `Found image using ${searchMethod}`,
        });
      } 
      // Handle search results response
      else if (data.products && data.products.length > 0 && data.products[0].imageUrl) {
        setImageUrl(data.products[0].imageUrl);
        setImageSource("branded");
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

  const handleSubmit = () => {
    console.log("handleSubmit called with:", {
      selectedFood,
      searchQuery,
      quantity,
      unit,
      storageLocationId,
      expirationDate
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
    if (!quantity) missingFields.push("quantity (e.g., 2, 1.5)");
    if (!unit) missingFields.push("unit (e.g., pieces, cups, lbs)");
    if (!storageLocationId) missingFields.push("storage location (select where you'll store this item)");
    if (!expirationDate) missingFields.push("expiration date (YYYY-MM-DD format)");

    if (missingFields.length > 0) {
      toast({
        title: "Please complete all required fields",
        description: `Missing: ${missingFields.join(", ")}`,
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
      nutrition: selectedFood?.nutrition ? JSON.stringify(selectedFood.nutrition) : null,
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
            We utilize the USDA database to provide accurate nutritional information.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label>Search USDA Database</Label>
            <div className="space-y-2">
              <Input
                placeholder="Search for food items... (searches automatically as you type)"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                data-testid="input-usda-search"
              />
              
              {/* Advanced Search Options */}
              <Collapsible open={showAdvancedSearch} onOpenChange={setShowAdvancedSearch}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between">
                    <span className="flex items-center gap-2">
                      <Filter className="w-4 h-4" />
                      Advanced Search Options
                    </span>
                    {showAdvancedSearch ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-4 pt-4 px-1">
                  {/* Data Type Filter */}
                  <div className="space-y-2">
                    <Label className="text-sm">Data Types</Label>
                    <div className="flex flex-wrap gap-2">
                      {['Branded', 'Foundation', 'Survey (FNDDS)', 'SR Legacy'].map((type) => (
                        <Badge
                          key={type}
                          variant={selectedDataTypes.includes(type) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate"
                          onClick={() => {
                            setSelectedDataTypes(prev => 
                              prev.includes(type)
                                ? prev.filter(t => t !== type)
                                : [...prev, type]
                            );
                            setCurrentPage(1);
                          }}
                        >
                          {type}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  
                  {/* Brand Owner Filter */}
                  <div className="space-y-2">
                    <Label htmlFor="brand-owner" className="text-sm">Brand Owner</Label>
                    <Input
                      id="brand-owner"
                      placeholder="Filter by brand (e.g., Nestle, Kellogg's)"
                      value={brandOwner}
                      onChange={(e) => handleBrandOwnerChange(e.target.value)}
                      className="text-sm"
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    {/* Sort By */}
                    <div className="space-y-2">
                      <Label className="text-sm">Sort By</Label>
                      <Select value={sortBy || "relevance"} onValueChange={(value) => { setSortBy(value === "relevance" ? "" : value); setCurrentPage(1); }}>
                        <SelectTrigger className="text-sm">
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="relevance">Relevance</SelectItem>
                          <SelectItem value="lowercaseDescription.keyword">Description</SelectItem>
                          <SelectItem value="dataType.keyword">Data Type</SelectItem>
                          <SelectItem value="fdcId">FDC ID</SelectItem>
                          <SelectItem value="publishedDate">Published Date</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    {/* Sort Order */}
                    <div className="space-y-2">
                      <Label className="text-sm">Order</Label>
                      <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => { setSortOrder(value); setCurrentPage(1); }}>
                        <SelectTrigger className="text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="asc">Ascending</SelectItem>
                          <SelectItem value="desc">Descending</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  
                  {/* Results per page */}
                  <div className="space-y-2">
                    <Label className="text-sm">Results per page</Label>
                    <Select value={pageSize.toString()} onValueChange={(value) => { setPageSize(Number(value)); setCurrentPage(1); }}>
                      <SelectTrigger className="text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="20">20</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Clear Filters Button */}
                  {(selectedDataTypes.length > 0 || brandOwner || (sortBy && sortBy !== "relevance")) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedDataTypes([]);
                        setSortBy("relevance");
                        setSortOrder("asc");
                        setBrandOwner("");
                        setDebouncedBrandOwner("");
                        setPageSize(20);
                        setCurrentPage(1);
                      }}
                      className="w-full"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CollapsibleContent>
              </Collapsible>
              
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
                      const suggestedDays = getSuggestedShelfLife(food.foodCategory, food.dataType);
                      const suggestedDate = new Date();
                      suggestedDate.setDate(suggestedDate.getDate() + suggestedDays);
                      setExpirationDate(suggestedDate.toISOString().split('T')[0]);
                      // Auto-select storage location based on food category and description
                      const suggestedLocationId = getSuggestedStorageLocation(food.foodCategory, food.description, storageLocations);
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
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
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
                    onClick={() => setCurrentPage(prev => Math.min(searchResults.totalPages, prev + 1))}
                    disabled={currentPage === searchResults.totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
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
            <div className="relative">
              <Input
                id="expiration"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="pr-10"
                data-testid="input-expiration"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]}). Auto-suggested based on food type.
            </p>
          </div>

          <div className="space-y-3">
            <Label>Food Image (Optional)</Label>
            <Tabs value={imageSource} onValueChange={(value) => setImageSource(value as any)} className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="none" data-testid="tab-no-image">
                  <ImageOff className="w-4 h-4 mr-2" />
                  No Image
                </TabsTrigger>
                <TabsTrigger value="branded" data-testid="tab-search-image">
                  <Search className="w-4 h-4 mr-2" />
                  Find Product
                </TabsTrigger>
                <TabsTrigger value="upload" data-testid="tab-upload-image">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </TabsTrigger>
              </TabsList>

              <TabsContent value="none" className="text-sm text-muted-foreground">
                No image will be added to this item
              </TabsContent>

              <TabsContent value="branded" className="space-y-3">
                <BarcodeRateLimitInfo />
                <p className="text-sm text-muted-foreground">
                  {selectedUpc 
                    ? `Will search using UPC barcode: ${selectedUpc}` 
                    : "Search for branded product images from Barcode Lookup database"}
                </p>
                <Button
                  type="button"
                  onClick={handleSearchBarcodeLookup}
                  variant="outline"
                  className="w-full"
                  data-testid="button-search-product-image"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {selectedUpc ? "Find Product by UPC" : "Search for Product Image"}
                </Button>
                {imageUrl && imageSource === "branded" && (
                  <div className="mt-2 p-2 border border-border rounded-lg">
                    <img src={imageUrl} alt="Product" className="w-full h-32 object-contain" />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="upload" className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Take or upload a photo of your leftover meal to automatically detect ingredients
                </p>
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={handleGetUploadURL}
                  onComplete={handleUploadComplete}
                  buttonClassName="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Photo
                </ObjectUploader>
                {imageUrl && imageSource === "upload" && (
                  <div className="space-y-3">
                    <div className="mt-2 p-2 border border-border rounded-lg">
                      <img src={imageUrl} alt="Uploaded" className="w-full h-32 object-contain" />
                    </div>
                    
                    {!analysisApplied && (
                      <Button
                        type="button"
                        onClick={handleAnalyzeImage}
                        disabled={isAnalyzing}
                        variant="outline"
                        className="w-full"
                        data-testid="button-analyze-image"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Analyzing Image...
                          </>
                        ) : (
                          <>
                            <ScanEye className="w-4 h-4 mr-2" />
                            Analyze for Ingredients
                          </>
                        )}
                      </Button>
                    )}
                    
                    {imageAnalysis && (
                      <Alert className="bg-muted/50">
                        <ScanEye className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <div className="font-medium">
                              Detected: {imageAnalysis.name} 
                              {imageAnalysis.confidence && (
                                <span className="text-muted-foreground ml-2">
                                  ({imageAnalysis.confidence}% confidence)
                                </span>
                              )}
                            </div>
                            
                            {imageAnalysis.ingredients && imageAnalysis.ingredients.length > 0 && (
                              <div className="space-y-1">
                                <p className="text-sm font-medium">Visible ingredients:</p>
                                <ul className="text-xs text-muted-foreground list-disc list-inside">
                                  {imageAnalysis.ingredients.map((ing: any, idx: number) => (
                                    <li key={idx}>{ing.name} - {ing.quantity} {ing.unit}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            
                            {imageAnalysis.calories !== undefined && (
                              <div className="text-xs space-y-1">
                                <p className="font-medium">Estimated nutrition:</p>
                                <div className="grid grid-cols-2 gap-x-4 text-muted-foreground">
                                  <span>Calories: {imageAnalysis.calories}</span>
                                  <span>Protein: {imageAnalysis.protein}g</span>
                                  <span>Carbs: {imageAnalysis.carbs}g</span>
                                  <span>Fat: {imageAnalysis.fat}g</span>
                                </div>
                              </div>
                            )}
                            
                            <p className="text-xs text-muted-foreground italic">
                              Form fields have been pre-filled. Please review and adjust as needed.
                            </p>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" className="touch-target" onClick={handleClose} data-testid="button-cancel">
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
