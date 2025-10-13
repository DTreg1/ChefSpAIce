import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
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
import { Search, Upload, ImageOff } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import { BarcodeRateLimitInfo } from "./barcode-rate-limit-info";
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
  const [selectedFood, setSelectedFood] = useState<any>(null);
  const [selectedUpc, setSelectedUpc] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageSource, setImageSource] = useState<"branded" | "upload" | "none">("none");
  const { toast } = useToast();

  const { data: storageLocations } = useQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
  });

  const { data: searchResults, refetch: searchUSDA } = useQuery<USDASearchResponse>({
    queryKey: [`/api/usda/search?query=${encodeURIComponent(searchQuery)}`],
    enabled: false,
  });

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

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchUSDA();
    }
  };

  const handleClose = () => {
    setSearchQuery("");
    setSelectedFood(null);
    setSelectedUpc(null);
    setQuantity("");
    setUnit("");
    setStorageLocationId("");
    setExpirationDate("");
    setImageUrl(null);
    setImageSource("none");
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
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      const response = await apiRequest("PUT", "/api/food-images", { imageURL: uploadedUrl });
      const data = await response.json();
      setImageUrl(data.objectPath);
      setImageSource("upload");
      toast({
        title: "Image uploaded",
        description: "Photo uploaded successfully",
      });
    }
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
    if (!selectedFood && !searchQuery.trim()) {
      toast({
        title: "Error",
        description: "Please select a food item",
        variant: "destructive",
      });
      return;
    }

    if (!quantity || !unit || !storageLocationId || !expirationDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate({
      name: selectedFood?.description || searchQuery,
      fcdId: selectedFood?.fdcId?.toString() || null,
      quantity,
      unit,
      storageLocationId,
      expirationDate,
      imageUrl: imageUrl,
      nutrition: selectedFood?.nutrition ? JSON.stringify(selectedFood.nutrition) : null,
      usdaData: selectedFood || null, // Save complete USDA response data
      foodCategory: selectedFood?.foodCategory || null, // Save food category for filtering
    });
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
            <div className="flex gap-2">
              <Input
                placeholder="Search for food items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                data-testid="input-usda-search"
              />
              <Button onClick={handleSearch} data-testid="button-usda-search">
                <Search className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {searchResults && searchResults.foods.length > 0 && (
            <div className="space-y-2">
              <Label>Search Results</Label>
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
              Auto-suggested based on food type. Always verify with the package label.
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
                  Take or upload a photo of your food item
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
                  <div className="mt-2 p-2 border border-border rounded-lg">
                    <img src={imageUrl} alt="Uploaded" className="w-full h-32 object-contain" />
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
