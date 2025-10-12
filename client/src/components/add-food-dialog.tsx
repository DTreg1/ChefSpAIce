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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Upload, ImageOff } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ObjectUploader } from "./ObjectUploader";
import type { StorageLocation, USDASearchResponse, InsertFoodItem } from "@shared/schema";
import type { UploadResult } from "@uppy/core";

interface AddFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddFoodDialog({ open, onOpenChange }: AddFoodDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<any>(null);
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

  const handleSearchOpenFoodFacts = async () => {
    if (!searchQuery.trim()) {
      toast({
        title: "Search required",
        description: "Please enter a food item name to search",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const response = await apiRequest("GET", `/api/openfoodfacts/search?query=${encodeURIComponent(searchQuery)}&pageSize=5`, null);
      const data = await response.json();
      if (data.products && data.products.length > 0 && data.products[0].imageUrl) {
        setImageUrl(data.products[0].imageUrl);
        setImageSource("branded");
        toast({
          title: "Product image found",
          description: `Found image for ${data.products[0].name}`,
        });
      } else {
        toast({
          title: "No image found",
          description: "No product images found for this search",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Open Food Facts search error:", error);
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
      fcdId: selectedFood?.fdcId?.toString() || "N/A",
      quantity,
      unit,
      storageLocationId,
      expirationDate,
      imageUrl: imageUrl,
      nutrition: selectedFood?.nutrition ? JSON.stringify(selectedFood.nutrition) : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add Food Item</DialogTitle>
          <DialogDescription>
            Search the USDA database or enter a custom item
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
                      setSearchQuery(food.description);
                    }}
                    className={`w-full p-3 text-left hover-elevate border-b border-border last:border-0 ${
                      selectedFood?.fdcId === food.fdcId ? "bg-accent" : ""
                    }`}
                    data-testid={`button-select-food-${food.fdcId}`}
                  >
                    <div className="font-medium">{food.description}</div>
                    <div className="text-xs text-muted-foreground font-mono">
                      FDC ID: {food.fdcId}
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
            <Label htmlFor="storage">Storage Location *</Label>
            <Select value={storageLocationId} onValueChange={setStorageLocationId}>
              <SelectTrigger data-testid="select-storage-location">
                <SelectValue placeholder="Select storage location" />
              </SelectTrigger>
              <SelectContent>
                {storageLocations?.map((location) => (
                  <SelectItem key={location.id} value={location.id}>
                    {location.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

              <TabsContent value="branded" className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  Search for branded product images from Open Food Facts database
                </p>
                <Button
                  type="button"
                  onClick={handleSearchOpenFoodFacts}
                  variant="outline"
                  className="w-full"
                  data-testid="button-search-product-image"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Search for Product Image
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
          <Button variant="outline" onClick={handleClose} data-testid="button-cancel">
            Cancel
          </Button>
          <Button
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
