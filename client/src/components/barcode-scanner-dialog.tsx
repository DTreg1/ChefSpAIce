import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScanLine, CheckCircle, XCircle, Plus, Save, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useBarcodeScanner } from "@/hooks/useBarcodescanner";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { format, addDays } from "date-fns";
import type { StorageLocation, USDAFoodItem } from "@shared/schema";

interface BarcodeScannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ScannerState = "scanning" | "confirming" | "error";

export function BarcodeScannerDialog({ open, onOpenChange }: BarcodeScannerDialogProps) {
  const [scannerState, setScannerState] = useState<ScannerState>("scanning");
  const [scannedBarcode, setScannedBarcode] = useState<string>("");
  const [scannedFood, setScannedFood] = useState<USDAFoodItem | null>(null);
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("item");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const { toast } = useToast();

  // Fetch storage locations
  const { data: storageLocations } = useStorageLocations();

  // Get location with most items for default
  const getDefaultLocation = () => {
    if (!storageLocations || storageLocations.length === 0) return "";
    
    // Sort by item count and return the ID of the location with most items
    const sorted = [...storageLocations].sort((a, b) => 
      (b.itemCount || 0) - (a.itemCount || 0)
    );
    
    return sorted[0]?.id || "";
  };

  // Handle barcode scan
  const handleScan = async (barcode: string) => {
    console.log("Barcode scanned:", barcode);
    setScannedBarcode(barcode);
    setIsSearching(true);

    try {
      // Stop the scanner
      await stopScanning();
      
      // Search USDA API by UPC/barcode
      const response = await fetch(`/api/fdc/search?query=${encodeURIComponent(barcode)}&pageSize=1`);
      
      if (!response.ok) {
        throw new Error("Failed to search for barcode");
      }

      const data = await response.json();
      
      if (data.foods && data.foods.length > 0) {
        const food = data.foods[0];
        setScannedFood(food);
        setScannerState("confirming");
        
        // Set default location to one with most items
        const defaultLoc = getDefaultLocation();
        setSelectedLocation(defaultLoc);
        
        // Set default expiration based on food type
        const daysToAdd = getSuggestedExpirationDays(food.dataType, food.description);
        setExpirationDate(format(addDays(new Date(), daysToAdd), "yyyy-MM-dd"));
        
        toast({
          title: "Barcode found",
          description: `Found: ${food.description}`,
        });
      } else {
        setScannerState("error");
        toast({
          title: "Not found",
          description: "No food item found for this barcode. Try searching manually.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error searching barcode:", error);
      setScannerState("error");
      toast({
        title: "Search failed",
        description: "Failed to look up barcode. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleError = (error: string) => {
    setScannerState("error");
    toast({
      title: "Camera error",
      description: error,
      variant: "destructive",
    });
  };

  const { startScanning, stopScanning } = useBarcodeScanner({
    onScan: handleScan,
    onError: handleError,
  });

  // Start scanning when dialog opens
  useEffect(() => {
    if (open && scannerState === "scanning") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        startScanning("barcode-scanner-video");
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [open, scannerState, startScanning]);

  // Add food to inventory mutation
  const addFoodMutation = useMutation({
    mutationFn: async (continueScanning: boolean) => {
      if (!scannedFood) return;

      const foodData = {
        name: scannedFood.description,
        quantity: parseFloat(quantity) || 1,
        unit,
        storageLocationId: selectedLocation,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        category: scannedFood.foodCategory || scannedFood.dataType || null,
        imageUrl: scannedFood.imageUrl || null,
        barcode: scannedBarcode || null,
        nutrition: scannedFood.nutrition || null,
      };

      await apiRequest("POST", "/api/food-items", foodData);
      
      return continueScanning;
    },
    onSuccess: (continueScanning) => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      
      toast({
        title: "Success",
        description: `${scannedFood?.description} added to inventory`,
      });

      if (continueScanning) {
        // Reset for next scan
        setScannedBarcode("");
        setScannedFood(null);
        setQuantity("1");
        setUnit("item");
        setScannerState("scanning");
      } else {
        // Close dialog
        onOpenChange(false);
      }
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to add item to inventory",
        variant: "destructive",
      });
    },
  });

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      stopScanning();
      setScannerState("scanning");
      setScannedBarcode("");
      setScannedFood(null);
      setQuantity("1");
      setUnit("item");
      setSelectedLocation("");
      setExpirationDate("");
      setIsSearching(false);
    }
  }, [open, stopScanning]);

  // Helper to get suggested expiration days
  function getSuggestedExpirationDays(dataType?: string, description?: string): number {
    const desc = description?.toLowerCase() || '';
    
    if (desc.includes('frozen')) return 90;
    if (desc.includes('fresh') || desc.includes('produce')) return 7;
    if (desc.includes('milk') || desc.includes('yogurt') || desc.includes('cheese')) return 14;
    if (desc.includes('meat') || desc.includes('chicken') || desc.includes('beef') || desc.includes('pork')) return 3;
    if (desc.includes('canned') || desc.includes('packaged')) return 365;
    
    return 21;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {scannerState === "scanning" && (
          <>
            <DialogHeader>
              <DialogTitle>Scan Barcode</DialogTitle>
              <DialogDescription>
                Position the barcode within the camera view to scan
              </DialogDescription>
            </DialogHeader>
            
            <div className="relative">
              <div
                id="barcode-scanner-video"
                className="w-full rounded-md overflow-hidden min-h-[300px] bg-black"
                data-testid="barcode-scanner-video"
              />
              {isSearching && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2 text-white">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <p className="text-sm">Looking up barcode...</p>
                  </div>
                </div>
              )}
            </div>

            <p className="text-sm text-muted-foreground text-center">
              <ScanLine className="w-4 h-4 inline mr-1" />
              Scan any UPC or barcode
            </p>
          </>
        )}

        {scannerState === "confirming" && scannedFood && (
          <>
            <DialogHeader>
              <DialogTitle>Is this what you're looking for?</DialogTitle>
              <DialogDescription>
                Confirm the details and add to inventory
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription className="ml-6">
                  <strong>{scannedFood.description}</strong>
                  {scannedFood.brandOwner && (
                    <span className="block text-sm text-muted-foreground">
                      {scannedFood.brandOwner}
                    </span>
                  )}
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    min="0.01"
                    step="0.01"
                    data-testid="input-quantity"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger id="unit" data-testid="select-unit">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="item">item(s)</SelectItem>
                      <SelectItem value="g">grams</SelectItem>
                      <SelectItem value="kg">kilograms</SelectItem>
                      <SelectItem value="oz">ounces</SelectItem>
                      <SelectItem value="lb">pounds</SelectItem>
                      <SelectItem value="ml">milliliters</SelectItem>
                      <SelectItem value="l">liters</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Storage Location</Label>
                <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                  <SelectTrigger id="location" data-testid="select-location">
                    <SelectValue placeholder="Select location" />
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        {location.name} ({location.itemCount || 0} items)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration Date</Label>
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
                  Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
                </p>
              </div>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setScannerState("scanning");
                  setScannedFood(null);
                  setScannedBarcode("");
                }}
                data-testid="button-cancel"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Cancel
              </Button>
              <Button
                variant="secondary"
                onClick={() => addFoodMutation.mutate(true)}
                disabled={!selectedLocation || addFoodMutation.isPending}
                data-testid="button-save-another"
              >
                <Plus className="w-4 h-4 mr-2" />
                Save & Add Another
              </Button>
              <Button
                onClick={() => addFoodMutation.mutate(false)}
                disabled={!selectedLocation || addFoodMutation.isPending}
                data-testid="button-save-exit"
              >
                <Save className="w-4 h-4 mr-2" />
                Save & Exit
              </Button>
            </DialogFooter>
          </>
        )}

        {scannerState === "error" && (
          <>
            <DialogHeader>
              <DialogTitle>Scanner Error</DialogTitle>
              <DialogDescription>
                Unable to scan or find the barcode
              </DialogDescription>
            </DialogHeader>

            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription className="ml-6">
                The barcode could not be found or there was a camera error. 
                Please try again or add the item manually.
              </AlertDescription>
            </Alert>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-close-error"
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setScannerState("scanning");
                  setScannedBarcode("");
                  setScannedFood(null);
                }}
                data-testid="button-try-again"
              >
                Try Again
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
