import { useState, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar as CalendarIcon } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { StorageLocation, FoodItem } from "@shared/schema";

interface EditFoodDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FoodItem | null;
}

export function EditFoodDialog({ open, onOpenChange, item }: EditFoodDialogProps) {
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [storageLocationId, setStorageLocationId] = useState("");
  const [expirationDate, setExpirationDate] = useState("");
  const { toast } = useToast();

  const { data: storageLocations } = useStorageLocations();

  useEffect(() => {
    if (item) {
      setQuantity(item.quantity);
      setUnit(item.unit || "");
      setStorageLocationId(item.storageLocationId);
      setExpirationDate(item.expirationDate || "");
    }
  }, [item]);

  const updateItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest("PUT", `/api/food-items/${item?.id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/items"] });
      toast({
        title: "Success",
        description: "Food item updated",
      });
      onOpenChange(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update food item",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = () => {
    if (!quantity || !unit || !storageLocationId || !expirationDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    updateItemMutation.mutate({
      quantity,
      unit,
      storageLocationId,
      expirationDate,
      // Include nutrition to ensure weightInGrams is recalculated when quantity changes
      nutrition: item?.nutrition || null,
    });
  };

  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-muted">
        <DialogHeader>
          <DialogTitle>Edit {item.name}</DialogTitle>
          <DialogDescription>
            Update quantity, storage location, or expiration date
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-quantity">Quantity *</Label>
              <Input
                id="edit-quantity"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                data-testid="input-edit-quantity"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-unit">Unit *</Label>
              <Input
                id="edit-unit"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                data-testid="input-edit-unit"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-storage">Storage Location *</Label>
            <Select value={storageLocationId} onValueChange={setStorageLocationId}>
              <SelectTrigger data-testid="select-edit-storage">
                <SelectValue />
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
            <Label htmlFor="edit-expiration">Expiration Date *</Label>
            <div className="relative">
              <Input
                id="edit-expiration"
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                placeholder="YYYY-MM-DD"
                className="pr-10"
                data-testid="input-edit-expiration"
              />
              <CalendarIcon className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
            <p className="text-xs text-muted-foreground">
              Format: YYYY-MM-DD (e.g., {new Date().toISOString().split('T')[0]})
            </p>
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)} data-testid="button-cancel-edit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={updateItemMutation.isPending}
            data-testid="button-submit-edit"
          >
            {updateItemMutation.isPending ? "Updating..." : "Update"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
