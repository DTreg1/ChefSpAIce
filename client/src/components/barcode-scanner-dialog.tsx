/**
 * Barcode Scanner Dialog Component
 * 
 * Camera-based barcode scanning for quick food item addition with USDA enrichment.
 * Uses html5-qrcode library for real-time barcode detection and USDA API for product lookup.
 * 
 * Features:
 * - Live Camera Scanning: Real-time UPC/EAN barcode detection via device camera
 * - USDA Integration: Automatic product lookup and nutrition data enrichment
 * - Smart Defaults: Intelligent expiration date and storage location suggestions
 * - Continuous Scanning: "Save & Add Another" for rapid multi-item entry
 * - Error Recovery: Graceful handling of camera errors and barcode lookup failures
 * - Three-State UI: Scanning → Confirming → Error (with transitions)
 * 
 * Scanner States:
 * - scanning: Active camera view with real-time barcode detection
 * - confirming: Product found, showing details and edit form
 * - error: Scan failed or product not found, with retry option
 * 
 * Workflow:
 * 1. Dialog opens → Start camera scanning (100ms delay for DOM readiness)
 * 2. User positions barcode in camera view
 * 3. html5-qrcode detects barcode → Triggers handleScan
 * 4. Camera stops → USDA lookup via GET /api/fdc/search?query={barcode}
 * 5. Product found → State: confirming (shows product details + form)
 * 6. User confirms/edits → POST /api/food-items (add to inventory)
 * 7. Success → "Save & Exit" (closes) or "Save & Add Another" (restart scan)
 * 
 * USDA Barcode Lookup:
 * - GET /api/fdc/search?query={barcode}&pageSize=1
 * - Searches by: UPC, GTIN, or other barcode formats
 * - Returns: USDAFoodItem with description, brandOwner, nutrition, category
 * - Branded foods preferred: Most likely to have barcodes in USDA database
 * 
 * Smart Default Logic:
 * - Storage Location: Prefers "Fridge/Refrigerator" > first available location
 * - Expiration Date: Calculated based on food type keywords
 *   - Frozen items: +90 days
 *   - Fresh produce: +7 days
 *   - Dairy (milk, yogurt, cheese): +14 days
 *   - Meat (chicken, beef, pork): +3 days
 *   - Canned/packaged: +365 days
 *   - Default: +21 days
 * - Quantity: Defaults to "1"
 * - Unit: Defaults to "item"
 * 
 * Camera Integration:
 * - Uses html5-qrcode library (via useBarcodeScanner hook)
 * - Target element: <div id="barcode-scanner-video" />
 * - Starts: On dialog open (100ms delay)
 * - Stops: On scan success, dialog close, or error
 * - Permissions: Requests camera access on first use
 * 
 * Form Fields (Confirming State):
 * - Product Name: Auto-filled from USDA (description)
 * - Brand Owner: Displayed if available
 * - Quantity: Editable number input (default: 1)
 * - Unit: Dropdown selector (item, g, kg, oz, lb, ml, l)
 * - Storage Location: Dropdown with all user storage locations
 * - Expiration Date: Date picker with smart default
 * 
 * Actions:
 * - Cancel: Return to scanning state (clears scanned data)
 * - Save & Add Another: Add item + restart scanning (continuous mode)
 * - Save & Exit: Add item + close dialog
 * - Try Again: Restart scanning after error
 * - Close: Exit dialog (from error state)
 * 
 * API Integration:
 * - GET /api/fdc/search: USDA barcode lookup
 *   - Query param: barcode string
 *   - Returns: { foods: USDAFoodItem[] }
 * - POST /api/food-items: Add scanned item to inventory
 *   - Payload: { name, quantity, unit, storageLocationId, expirationDate, category, barcode, nutrition }
 *   - Invalidates: /api/food-items, /api/storage-locations
 * 
 * State Management:
 * - scannerState: "scanning" | "confirming" | "error"
 * - scannedBarcode: Detected barcode string
 * - scannedFood: USDAFoodItem from lookup
 * - quantity, unit, selectedLocation, expirationDate: Form fields
 * - isSearching: Loading state during USDA lookup
 * 
 * Error Handling:
 * - Camera permission denied: Shows error state with friendly message
 * - Barcode not found in USDA: Error state with manual search suggestion
 * - Network errors: Error state with retry option
 * - Invalid form data: Disabled save buttons until valid
 * 
 * Continuous Scanning Mode:
 * - "Save & Add Another" button: addFoodMutation.mutate(true)
 * - On success: Resets form, clears scanned data, returns to scanning state
 * - Enables rapid multi-item entry without closing dialog
 * - Persists storage location preference between scans
 * 
 * Dialog Lifecycle:
 * - On open: Start camera (if scanning state)
 * - On close: Stop camera, reset all state
 * - State reset: scannerState="scanning", clear all form fields
 * - Auto-cleanup: useEffect cleanup on unmount
 * 
 * Visual Feedback:
 * - Scanning: Live camera feed with loading overlay during lookup
 * - Confirming: Success alert with product name + brand
 * - Error: Destructive alert with error message
 * - Loading: Loader2 spinner with "Looking up barcode..." text
 * 
 * Accessibility:
 * - data-testid on all inputs and buttons
 * - Semantic HTML with proper labels
 * - Keyboard navigation support
 * - Screen reader friendly alerts
 * 
 * @example
 * // Basic usage
 * const [scannerOpen, setScannerOpen] = useState(false);
 * 
 * <Button onClick={() => setScannerOpen(true)}>Scan Barcode</Button>
 * <BarcodeScannerDialog 
 *   open={scannerOpen} 
 *   onOpenChange={setScannerOpen} 
 * />
 * 
 * @example
 * // Quick action integration
 * <QuickActions>
 *   <QuickAction 
 *     label="Scan Barcode" 
 *     onClick={() => setScannerOpen(true)} 
 *   />
 * </QuickActions>
 * <BarcodeScannerDialog 
 *   open={scannerOpen} 
 *   onOpenChange={setScannerOpen} 
 * />
 */

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
import { ScanLine, CheckCircle, XCircle, Plus, Save, Loader2 } from "lucide-react";
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

  // Get default storage location (prefer Fridge, otherwise first available)
  const getDefaultLocation = () => {
    if (!storageLocations || storageLocations.length === 0) return "";
    
    // Try to find "Fridge" as most common default
    const fridge = storageLocations.find(loc => 
      loc.name.toLowerCase().includes('fridge') || loc.name.toLowerCase().includes('refrigerator')
    );
    
    if (fridge) return fridge.id;
    
    // Otherwise return first location
    return storageLocations[0]?.id || "";
  };

  // Handle barcode scan
  const handleScan = async (barcode: string) => {
    // console.log("Barcode scanned:", barcode);
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
      <DialogContent className="max-w-md bg-muted">
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
                        {location.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiration">Expiration Date</Label>
                <Input
                  id="expiration"
                  type="date"
                  value={expirationDate}
                  onChange={(e) => setExpirationDate(e.target.value)}
                  data-testid="input-expiration"
                />
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
