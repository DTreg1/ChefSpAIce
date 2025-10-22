import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { useDebouncedCallback } from "@/lib/debounce";
import { useBarcodeScanner } from "@/hooks/useBarcodescanner";
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
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { getCategoryIcon } from "@/lib/categoryIcons";
import { format, addDays } from "date-fns";
import { SuccessAnimation } from "@/components/success-animation";
import {
  Search,
  ScanLine,
  X,
  Plus,
  Calendar,
  MapPin,
  Apple,
  Wheat,
  Milk,
  Beef,
  Fish,
  Candy,
  Coffee,
  Pizza,
  Salad,
  ChevronRight,
  Clock,
  TrendingUp,
  Package,
  AlertCircle,
  Camera,
  CameraOff,
  Loader2,
} from "lucide-react";
import type {
  FoodItem as FoodItemType,
  StorageLocation,
  USDAFoodItem,
  InsertFoodItem,
} from "@shared/schema";

interface UnifiedAddFoodProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Food categories for quick browsing
const FOOD_CATEGORIES = [
  { id: "fruits", label: "Fruits", icon: Apple, query: "fruits" },
  { id: "vegetables", label: "Vegetables", icon: Salad, query: "vegetables" },
  { id: "grains", label: "Grains", icon: Wheat, query: "bread grains cereal" },
  { id: "dairy", label: "Dairy", icon: Milk, query: "dairy milk cheese" },
  { id: "meat", label: "Meat", icon: Beef, query: "meat beef chicken pork" },
  { id: "seafood", label: "Seafood", icon: Fish, query: "fish seafood" },
  { id: "snacks", label: "Snacks", icon: Candy, query: "snacks chips" },
  { id: "beverages", label: "Beverages", icon: Coffee, query: "beverages drinks" },
  { id: "prepared", label: "Prepared", icon: Pizza, query: "prepared meals" },
];

// Helper to detect if input is a barcode (numeric and 8-13 digits)
function isBarcode(input: string): boolean {
  const cleaned = input.trim();
  return /^\d{8,13}$/.test(cleaned);
}

// Helper to suggest shelf life based on food category
function getSuggestedShelfLife(category?: string, dataType?: string): number {
  if (!category) return 7; // Default 7 days
  
  const cat = category.toLowerCase();
  
  if (cat.includes("fruit") || cat.includes("vegetable") || cat.includes("produce")) {
    return 7;
  }
  if (cat.includes("dairy") || cat.includes("milk") || cat.includes("cheese") || cat.includes("yogurt")) {
    return 10;
  }
  if (cat.includes("meat") || cat.includes("poultry") || cat.includes("beef") || 
      cat.includes("pork") || cat.includes("chicken") || cat.includes("fish") || cat.includes("seafood")) {
    return 3;
  }
  if (cat.includes("bread") || cat.includes("bakery") || cat.includes("baked")) {
    return 5;
  }
  if (cat.includes("egg")) {
    return 21;
  }
  if (cat.includes("frozen")) {
    return 90; // 3 months
  }
  if (cat.includes("canned") || cat.includes("packaged") || cat.includes("snack") || 
      cat.includes("cereal") || cat.includes("grain")) {
    return 180; // 6 months
  }
  
  return 7;
}

export function UnifiedAddFood({ open, onOpenChange }: UnifiedAddFoodProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<USDAFoodItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("item");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [showScanner, setShowScanner] = useState(false);
  const [scannerError, setScannerError] = useState<string | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<USDAFoodItem[]>([]);
  const [recentItems, setRecentItems] = useState<FoodItemType[]>([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<"search" | "scan" | "browse">("search");
  
  const { toast } = useToast();
  const { data: storageLocations } = useStorageLocations();
  
  // Get default storage location
  const getDefaultLocation = useCallback(() => {
    if (!storageLocations || storageLocations.length === 0) return "";
    
    const fridge = storageLocations.find(loc => 
      loc.name.toLowerCase().includes('fridge') || loc.name.toLowerCase().includes('refrigerator')
    );
    
    if (fridge) return fridge.id;
    return storageLocations[0]?.id || "";
  }, [storageLocations]);
  
  // Set default location when locations load
  useEffect(() => {
    if (storageLocations && !selectedLocation) {
      setSelectedLocation(getDefaultLocation());
    }
  }, [storageLocations, selectedLocation, getDefaultLocation]);
  
  // Fetch recent items
  const { data: inventoryData } = useQuery({
    queryKey: ['/api/food-items'],
    enabled: open,
  });
  
  useEffect(() => {
    if (inventoryData && Array.isArray(inventoryData)) {
      const sorted = [...inventoryData]
        .sort((a: FoodItemType, b: FoodItemType) => 
          new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime()
        )
        .slice(0, 5);
      setRecentItems(sorted);
    }
  }, [inventoryData]);
  
  // Search function (handles both text and barcode)
  const performSearch = useDebouncedCallback(async (query: string) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      let endpoint: string;
      let params: URLSearchParams;
      
      if (isBarcode(query)) {
        // Barcode search
        endpoint = `/api/food/barcode/${query}`;
        params = new URLSearchParams();
      } else {
        // Text search
        endpoint = `/api/usda/search`;
        params = new URLSearchParams({
          query,
          pageSize: '20',
          dataType: 'Branded',
        });
      }
      
      const response = await fetch(`${endpoint}?${params}`, {
        credentials: "include",
      });
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (isBarcode(query)) {
        // Handle barcode response
        if (data.usda) {
          setSearchResults([data.usda]);
        } else {
          setSearchResults([]);
          toast({
            title: "Product not found",
            description: "No product found with this barcode. Try searching by name instead.",
            variant: "default",
          });
        }
      } else {
        // Handle text search response
        setSearchResults(data.foods || []);
      }
    } catch (error: any) {
      console.error("Search error:", error);
      toast({
        title: "Search failed",
        description: error.message || "Failed to search. Please try again.",
        variant: "destructive",
      });
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  }, 300);
  
  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    performSearch(value);
  };
  
  // Handle category click
  const handleCategoryClick = (query: string) => {
    setActiveTab("search");
    setSearchQuery(query);
    performSearch(query);
  };
  
  // Barcode scanner handlers
  const handleScan = useCallback(async (barcode: string) => {
    console.log("Scanned barcode:", barcode);
    setShowScanner(false);
    setActiveTab("search");
    setSearchQuery(barcode);
    performSearch(barcode);
  }, [performSearch]);
  
  const handleScanError = useCallback((error: string) => {
    setScannerError(error);
    toast({
      title: "Scanner error",
      description: error,
      variant: "destructive",
    });
  }, [toast]);
  
  const { startScanning, stopScanning } = useBarcodeScanner({
    onScan: handleScan,
    onError: handleScanError,
  });
  
  // Start/stop scanner based on state
  useEffect(() => {
    if (showScanner && activeTab === "scan") {
      startScanning("unified-barcode-reader");
    } else {
      stopScanning();
    }
    
    return () => {
      stopScanning();
    };
  }, [showScanner, activeTab, startScanning, stopScanning]);
  
  // Handle food selection
  const handleSelectFood = (food: USDAFoodItem) => {
    setSelectedFood(food);
    
    // Auto-set expiration date based on category
    const shelfLife = getSuggestedShelfLife(food.foodCategory, food.dataType);
    const suggestedDate = format(addDays(new Date(), shelfLife), "yyyy-MM-dd");
    setExpirationDate(suggestedDate);
  };
  
  // Add food mutation
  const addFoodMutation = useMutation({
    mutationFn: async (data: InsertFoodItem) => {
      const response = await apiRequest("POST", "/api/food-items", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      setShowSuccess(true);
      
      setTimeout(() => {
        setShowSuccess(false);
        resetForm();
        onOpenChange(false);
      }, 1500);
      
      toast({
        title: "Food added",
        description: `${selectedFood?.description} has been added to your inventory.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to add food",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handle form submission
  const handleSubmit = () => {
    if (!selectedFood || !selectedLocation) {
      toast({
        title: "Missing information",
        description: "Please select a food item and storage location.",
        variant: "destructive",
      });
      return;
    }
    
    const foodItem: InsertFoodItem = {
      name: selectedFood.description,
      quantity: quantity,
      unit,
      storageLocationId: selectedLocation,
      expirationDate: expirationDate || format(addDays(new Date(), 7), "yyyy-MM-dd"),
      fcdId: selectedFood.fdcId.toString(),
      usdaData: selectedFood,
      foodCategory: selectedFood.foodCategory,
    };
    
    addFoodMutation.mutate(foodItem);
  };
  
  // Reset form
  const resetForm = () => {
    setSearchQuery("");
    setSelectedFood(null);
    setQuantity("1");
    setUnit("item");
    setExpirationDate("");
    setSearchResults([]);
    setShowScanner(false);
    setScannerError(null);
    setActiveTab("search");
  };
  
  // Handle dialog close
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      stopScanning();
      resetForm();
    }
    onOpenChange(newOpen);
  };
  
  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-muted">
        <DialogHeader>
          <DialogTitle>Add Food to Inventory</DialogTitle>
          <DialogDescription>
            Search by name, scan a barcode, or browse categories to add food items
          </DialogDescription>
        </DialogHeader>
        
        {showSuccess ? (
          <div className="flex-1 flex items-center justify-center py-8">
            <SuccessAnimation />
          </div>
        ) : selectedFood ? (
          // Food selected - show add form
          <div className="flex-1 overflow-y-auto space-y-4 py-4">
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold">{selectedFood.description}</h3>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedFood.brandOwner && (
                          <span className="text-sm text-muted-foreground">{selectedFood.brandOwner}</span>
                        )}
                        {selectedFood.foodCategory && (
                          <Badge variant="secondary">{selectedFood.foodCategory}</Badge>
                        )}
                        {selectedFood.gtinUpc && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {selectedFood.gtinUpc}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedFood(null)}
                      data-testid="button-change-selection"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            
            
            <div className="space-y-2">
              <Label htmlFor="location">Storage Location</Label>
              <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                <SelectTrigger id="location" data-testid="select-location">
                  <SelectValue placeholder="Select location" />
                </SelectTrigger>
                <SelectContent>
                  {storageLocations?.map((location) => (
                    <SelectItem key={location.id} value={location.id}>
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {location.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="expiration">Expiration Date</Label>
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-muted-foreground" />
                <Input
                  id="expiration"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  min={format(new Date(), "yyyy-MM-dd")}
                  data-testid="input-expiration"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                Auto-suggested based on food type. Verify with package label.
              </p>
            </div>
            
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setSelectedFood(null)}
                className="flex-1"
                data-testid="button-back"
              >
                Back to Search
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={addFoodMutation.isPending}
                className="flex-1"
                data-testid="button-add-to-inventory"
              >
                {addFoodMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Inventory
                  </>
                )}
              </Button>
            </div>
          </div>
        ) : (
          // Search interface
          <div className="flex-1 overflow-hidden flex flex-col">
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="search">
                  <Search className="h-4 w-4 mr-2" />
                  Search
                </TabsTrigger>
                <TabsTrigger value="scan">
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="search" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name, brand, or enter barcode..."
                      value={searchQuery}
                      onChange={(e) => handleSearchChange(e.target.value)}
                      className="pl-10 pr-10"
                      data-testid="input-unified-search"
                      autoFocus
                    />
                    {searchQuery && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-1 top-1/2 transform -translate-y-1/2 h-7 w-7"
                        onClick={() => {
                          setSearchQuery("");
                          setSearchResults([]);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  
                  {isBarcode(searchQuery) && (
                    <Alert>
                      <ScanLine className="h-4 w-4" />
                      <AlertDescription>
                        Searching for barcode: {searchQuery}
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
                <ScrollArea className="flex-1 mt-4">
                  <div className="space-y-4 pr-4">
                    {isSearching && (
                      <div className="space-y-2">
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </div>
                    )}
                    
                    {!isSearching && searchResults.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="text-sm font-medium text-muted-foreground">Search Results</h3>
                        {searchResults.map((food) => (
                          <Card
                            key={food.fdcId}
                            className="cursor-pointer hover-elevate transition-all"
                            onClick={() => handleSelectFood(food)}
                            data-testid={`card-food-${food.fdcId}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{food.description}</p>
                                  <div className="flex flex-wrap items-center gap-2 mt-1">
                                    {food.brandOwner && (
                                      <span className="text-xs text-muted-foreground truncate">
                                        {food.brandOwner}
                                      </span>
                                    )}
                                    {food.foodCategory && (
                                      <Badge variant="secondary" className="text-xs">
                                        {food.foodCategory}
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {!isSearching && searchQuery && searchResults.length === 0 && (
                      <Card>
                        <CardContent className="py-8 text-center">
                          <AlertCircle className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            No results found for "{searchQuery}"
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Try a different search term or scan a barcode
                          </p>
                        </CardContent>
                      </Card>
                    )}
                    
                    {!searchQuery && recentItems.length > 0 && (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          Recently Added
                        </div>
                        {recentItems.map((item) => (
                          <Card
                            key={item.id}
                            className="cursor-pointer hover-elevate transition-all"
                            onClick={() => {
                              if (item.usdaData) {
                                handleSelectFood(item.usdaData as USDAFoodItem);
                              }
                            }}
                            data-testid={`card-recent-${item.id}`}
                          >
                            <CardContent className="p-3">
                              <div className="flex items-center justify-between">
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm truncate">{item.name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    {item.quantity} {item.unit}
                                  </p>
                                </div>
                                <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                    
                    {!searchQuery && recentItems.length === 0 && (
                      <div className="text-center py-8">
                        <Search className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          Start typing to search for food items
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Or try scanning a barcode or browsing categories
                        </p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="scan" className="flex-1 overflow-hidden flex flex-col mt-4">
                <div className="flex-1 flex flex-col items-center justify-center">
                  {!showScanner ? (
                    <div className="text-center space-y-4">
                      <Camera className="h-16 w-16 mx-auto text-muted-foreground" />
                      <div className="space-y-2">
                        <h3 className="font-semibold">Scan Barcode</h3>
                        <p className="text-sm text-muted-foreground max-w-sm">
                          Use your camera to scan product barcodes for quick addition
                        </p>
                      </div>
                      <Button
                        onClick={() => setShowScanner(true)}
                        size="lg"
                        data-testid="button-start-scanner"
                      >
                        <Camera className="mr-2 h-4 w-4" />
                        Start Camera
                      </Button>
                    </div>
                  ) : (
                    <div className="w-full max-w-md space-y-4">
                      <div
                        id="unified-barcode-reader"
                        className="w-full bg-black rounded-lg overflow-hidden"
                        style={{ minHeight: "300px" }}
                      />
                      
                      {scannerError && (
                        <Alert variant="destructive">
                          <AlertCircle className="h-4 w-4" />
                          <AlertDescription>{scannerError}</AlertDescription>
                        </Alert>
                      )}
                      
                      <div className="text-center space-y-2">
                        <p className="text-sm text-muted-foreground">
                          Position barcode within the frame
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowScanner(false);
                            setScannerError(null);
                          }}
                          data-testid="button-stop-scanner"
                        >
                          <CameraOff className="mr-2 h-4 w-4" />
                          Stop Camera
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>
              
              <TabsContent value="browse" className="flex-1 overflow-hidden flex flex-col mt-4">
                <ScrollArea className="flex-1">
                  <div className="grid grid-cols-3 gap-3 pr-4">
                    {FOOD_CATEGORIES.map((category) => {
                      const Icon = category.icon;
                      return (
                        <Card
                          key={category.id}
                          className="cursor-pointer hover-elevate transition-all"
                          onClick={() => handleCategoryClick(category.query)}
                          data-testid={`card-category-${category.id}`}
                        >
                          <CardContent className="p-4 text-center">
                            <Icon className="h-8 w-8 mx-auto mb-2 text-primary" />
                            <p className="text-sm font-medium">{category.label}</p>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                      <TrendingUp className="h-4 w-4" />
                      Popular Searches
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {["Milk", "Bread", "Eggs", "Chicken", "Rice", "Pasta", "Tomatoes", "Cheese"].map((term) => (
                        <Badge
                          key={term}
                          variant="secondary"
                          className="cursor-pointer hover-elevate"
                          onClick={() => handleCategoryClick(term.toLowerCase())}
                          data-testid={`badge-popular-${term.toLowerCase()}`}
                        >
                          {term}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}