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
import { Search } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StorageLocation, USDASearchResponse, InsertFoodItem } from "@shared/schema";

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
      return await apiRequest("POST", "/api/food-items", data);
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
    onOpenChange(false);
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

    if (!quantity || !storageLocationId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    addItemMutation.mutate({
      name: selectedFood?.description || searchQuery,
      fcdId: selectedFood?.fdcId?.toString(),
      quantity,
      unit,
      storageLocationId,
      expirationDate: expirationDate || null,
      imageUrl: null,
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
              <Label htmlFor="unit">Unit</Label>
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
