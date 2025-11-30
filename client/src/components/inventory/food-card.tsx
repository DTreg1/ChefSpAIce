/**
 * Food Card Component
 * 
 * Interactive card displaying a single food inventory item with inline editing capabilities.
 * Supports quick quantity adjustments, expiration tracking, storage location changes, and nutrition display.
 * 
 * Features:
 * - Inline Editing: Quantity, expiration date, and storage location editable without opening dialogs
 * - Expiration Tracking: Visual progress bar with color-coded status (expired, expiring soon, fresh)
 * - Quick Adjustments: +/- buttons for rapid quantity changes with optimistic updates
 * - Storage Location Selector: Click-to-change dropdown styled as a badge
 * - Progressive Nutrition: Collapsible nutrition panel (uses progressive disclosure pattern)
 * - Image Display: Shows food image or placeholder icon
 * - Swipe Actions: Mobile-friendly swipe gestures (via useSwipe hook)
 * - Full Edit Dialog: Opens comprehensive edit form for complex changes
 * 
 * Inline Editing Capabilities:
 * - Quantity: Click value to type, or use +/- buttons (min: 0.1)
 * - Expiration Date: Click date to open inline date picker
 * - Storage Location: Click badge to open dropdown selector
 * - All updates: Optimistic UI with automatic rollback on error
 * 
 * Expiration Status:
 * - Expired: Red badge, "Expired" text, 10% progress bar
 * - Expiring Soon (≤3 days): Amber badge, "Xd left" text, 10-30% progress bar
 * - Fresh (>3 days): Green badge, "Xd left" text, 30-100% progress bar
 * - Progress bar: Animated, scales based on days remaining (0-30 day range)
 * 
 * Nutrition Display:
 * - Progressive disclosure: Initially shows calories + serving size
 * - Expandable: Click to reveal protein, carbs, fat, fiber, sugar, sodium
 * - Data sources: USDA data (preferred) or basic nutrition field
 * - Per serving calculation: Displays nutrition per serving size
 * - Visual hierarchy: Icons, color coding, grid layout
 * 
 * Storage Location Badge:
 * - Color coded: Fridge (blue), Freezer (cyan), Pantry (amber), Counter (green)
 * - Interactive: Click to open dropdown with all storage locations
 * - Icon indicator: MapPin icon for visual clarity
 * - Hover effect: Subtle background change on hover
 * 
 * API Integration:
 * - PUT /api/food-items/:id: Update quantity, expiration, or storage location
 *   - Optimistic updates with automatic rollback on error
 *   - Invalidates: /api/food-items, /api/nutrition/stats, /api/nutrition/items
 * - DELETE /api/food-items/:id: Remove item from inventory
 *   - Invalidates: /api/food-items, /api/storage-locations, nutrition queries
 * 
 * State Management:
 * - localQuantity: Tracks quantity for optimistic updates
 * - isEditingQuantity: Controls inline quantity input display
 * - localExpiry: Tracks expiration date for inline editing
 * - isEditingExpiry: Controls inline date picker display
 * - Mutations: updateQuantityMutation, updateExpiryMutation, updateStorageMutation, deleteMutation
 * 
 * Optimistic Updates:
 * - Quantity changes: Immediate UI update, rollback on error
 * - Query cancellation: Prevents race conditions during rapid changes
 * - Context preservation: Stores previous data for rollback
 * - Cache invalidation: Triggers refetch on success
 * 
 * Progressive Disclosure Pattern:
 * - Uses useProgressiveDisclosure hook
 * - Unique ID per item: `food-card-nutrition-${item.id}`
 * - State persisted across renders
 * - Toggle indicator: ChevronUp/ChevronDown icons
 * 
 * Component Actions:
 * - Increase/Decrease Quantity: +/- buttons with optimistic updates
 * - Edit Quantity: Click value to type directly
 * - Edit Expiration: Click date to open inline picker
 * - Change Location: Click badge to select new storage area
 * - Full Edit: Opens EditFoodDialog for comprehensive changes
 * - View Nutrition: Opens NutritionFactsDialog with detailed facts
 * - Delete: Removes item with confirmation toast
 * 
 * Visual Design:
 * - Glass morphism effect: Translucent background with blur
 * - Hover elevation: Subtle lift on hover (hover-elevate)
 * - Active elevation: Press-down effect (active-elevate-2)
 * - Border styling: Subtle border with transparency
 * - Image zoom: Hover effect on food images
 * 
 * Accessibility:
 * - data-testid attributes on all interactive elements
 * - Keyboard navigation: Enter to submit, Escape to cancel
 * - ARIA labels: Implicit through semantic HTML
 * - Focus management: Auto-focus on inline inputs
 * 
 * Performance:
 * - React.memo: Prevents unnecessary re-renders
 * - useMemo: Memoizes nutrition parsing and status calculations
 * - Optimistic updates: Immediate feedback without waiting for server
 * 
 * @example
 * // Basic usage in inventory list
 * <FoodCard 
 *   item={foodItem} 
 *   storageLocationName="Refrigerator" 
 * />
 * 
 * @example
 * // With full data including nutrition
 * <FoodCard 
 *   item={{
 *     id: "123",
 *     name: "Organic Milk",
 *     quantity: "2",
 *     unit: "L",
 *     expirationDate: "2025-11-05",
 *     storageLocationId: "fridge-id",
 *     nutrition: { calories: 150, protein: 8, carbs: 12, fat: 8 }
 *   }}
 *   storageLocationName="Refrigerator"
 * />
 */

import React, { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, Trash2, UtensilsCrossed, Info, Plus, Minus, Calendar, Check, X, MapPin, ChevronDown, ChevronUp, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { EditFoodDialog } from "./edit-food-dialog";
import { NutritionFactsDialog } from "./nutrition-facts-dialog";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { API_ENDPOINTS } from "@/lib/api-endpoints";
import { useToast } from "@/hooks/use-toast";
import { useSwipe } from "@/hooks/use-swipe";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { useProgressiveDisclosure } from "@/hooks/useProgressiveDisclosure";
import type { UserInventory as FoodItem, NutritionInfo } from "@shared/schema";
import { format } from "date-fns";

interface FoodCardProps {
  item: FoodItem;
  storageLocationName: string;
}

export const FoodCard = React.memo(function FoodCard({ item, storageLocationName }: FoodCardProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [nutritionDialogOpen, setNutritionDialogOpen] = useState(false);
  const [localQuantity, setLocalQuantity] = useState<number>(parseFloat(item.quantity) || 0);
  const [isEditingQuantity, setIsEditingQuantity] = useState(false);
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [localExpiry, setLocalExpiry] = useState(item.expirationDate || "");
  const { toast } = useToast();
  const { data: storageLocations } = useStorageLocations();
  const progressiveDisclosure = useProgressiveDisclosure();
  const nutritionId = `food-card-nutrition-${item.id}`;
  const isNutritionExpanded = progressiveDisclosure.isExpanded(nutritionId);
  const toggleNutrition = () => progressiveDisclosure.toggleExpanded(nutritionId);

  // Parse nutrition data
  const nutritionData = useMemo<NutritionInfo | null>(() => {
    try {
      // First check for USDA data
      if ((item).usdaData?.nutrition) {
        return (item).usdaData.nutrition;
      }
      // Fall back to basic nutrition field
      if (item.nutrition && item.nutrition !== "null") {
        return JSON.parse(item.nutrition);
      }
      return null;
    } catch (error) {
      console.error("Failed to parse nutrition data:", error);
      return null;
    }
  }, [item]);

  const getStorageBadgeColor = useMemo(() => {
    const colors: Record<string, string> = {
      refrigerator: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800",
      fridge: "bg-blue-500/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 border-blue-200 dark:border-blue-800", // Keep for backwards compatibility
      freezer: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800",
      pantry: "bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-200 dark:border-amber-800",
      counter: "bg-green-500/10 text-green-600 dark:bg-green-500/20 dark:text-green-400 border-green-200 dark:border-green-800",
    };
    return (location: string) => {
      return colors[location.toLowerCase()] || "bg-gray-500/10 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400 border-gray-200 dark:border-gray-800";
    };
  }, []);

  const getExpiryStatus = useMemo(() => {
    return (date?: string | null) => {
      if (!date) return null;
      const expiry = new Date(date);
      const now = new Date();
      const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (daysUntil < 0) return { color: "bg-red-500", text: "Expired" };
      if (daysUntil <= 3) return { color: "bg-amber-500", text: `${daysUntil}d left` };
      return { color: "bg-green-500", text: `${daysUntil}d left` };
    };
  }, []);

  // Mutation for quick quantity update
  const updateQuantityMutation = useMutation({
    mutationFn: async (newQuantity: number) => {
      return await apiRequest(API_ENDPOINTS.inventory.foodItem(item.id), "PUT", {
        quantity: newQuantity.toString(),
        unit: item.unit,
        storageLocationId: item.storageLocationId,
        expirationDate: item.expirationDate
      });
    },
    onMutate: async (newQuantity: number) => {
      // Optimistic update
      await queryClient.cancelQueries({ queryKey: [API_ENDPOINTS.inventory.foodItems] });
      const previousItems = queryClient.getQueryData([API_ENDPOINTS.inventory.foodItems]);
      
      queryClient.setQueryData([API_ENDPOINTS.inventory.foodItems], (old: any) => {
        if (!old) return old;
        return old.map((i: FoodItem) => 
          i.id === item.id ? { ...i, quantity: newQuantity.toString() } : i
        );
      });
      
      return { previousItems };
    },
    onError: (err, newQuantity, context) => {
      // Rollback on error
      if (context?.previousItems) {
        queryClient.setQueryData([API_ENDPOINTS.inventory.foodItems], context.previousItems);
      }
      setLocalQuantity(parseFloat(item.quantity));
      toast({
        title: "Error",
        description: "Failed to update quantity",
        variant: "destructive",
      });
    },
    onSuccess: (data, newQuantity) => {
      // Successfully updated
      setLocalQuantity(newQuantity);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.foodItems] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.nutrition.data] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.nutrition.tracking] });
    },
  });

  // Mutation for quick expiry update
  const updateExpiryMutation = useMutation({
    mutationFn: async (newExpiry: string) => {
      return await apiRequest(API_ENDPOINTS.inventory.foodItem(item.id), "PUT", {
        quantity: item.quantity,
        unit: item.unit,
        storageLocationId: item.storageLocationId,
        expirationDate: newExpiry
      });
    },
    onSuccess: () => {
      setIsEditingExpiry(false);
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.foodItems] });
      toast({
        title: "Expiration date updated",
        description: "The expiration date has been successfully updated",
      });
    },
    onError: () => {
      setLocalExpiry(item.expirationDate || "");
      toast({
        title: "Error",
        description: "Failed to update expiration date",
        variant: "destructive",
      });
    },
  });

  // Mutation for quick storage location update
  const updateStorageMutation = useMutation({
    mutationFn: async (newStorageId: string) => {
      return await apiRequest(API_ENDPOINTS.inventory.foodItem(item.id), "PUT", {
        quantity: item.quantity,
        unit: item.unit,
        storageLocationId: newStorageId,
        expirationDate: item.expirationDate
      });
    },
    onSuccess: (data, newStorageId) => {
      const newLocation = storageLocations?.find(loc => loc.id === newStorageId);
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.foodItems] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.storageLocations] });
      toast({
        title: "Location updated",
        description: `Moved to ${newLocation?.name || 'new location'}`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update storage location",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(API_ENDPOINTS.inventory.foodItem(item.id), "DELETE");
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.foodItems] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.inventory.storageLocations] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.nutrition.data] });
      void queryClient.invalidateQueries({ queryKey: [API_ENDPOINTS.nutrition.tracking] });
      toast({
        title: "Item deleted",
        description: "Food item removed from inventory",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleQuantityChange = (delta: number) => {
    const currentQuantity = parseFloat(localQuantity.toString()) || 0;
    const newQuantity = Math.max(0.1, currentQuantity + delta);
    setLocalQuantity(newQuantity);
    updateQuantityMutation.mutate(newQuantity);
  };

  const handleQuantityInputChange = (value: string) => {
    const parsed = parseFloat(value);
    if (!isNaN(parsed) && parsed > 0) {
      setLocalQuantity(parsed);
    }
  };

  const handleQuantitySubmit = () => {
    updateQuantityMutation.mutate(localQuantity);
    setIsEditingQuantity(false);
  };

  const handleExpirySubmit = () => {
    if (localExpiry) {
      updateExpiryMutation.mutate(localExpiry);
    }
  };

  const expiryStatus = getExpiryStatus(localExpiry || item.expirationDate);
  const hasNutrition = item.nutrition && item.nutrition !== "null";

  return (
    <>
      <Card 
        className="glass-morph hover-elevate active-elevate-2 card-hover border border-card-border/50 shadow-glass hover:shadow-glass-hover transition-morph" 
        data-testid={`card-food-${item.id}`}
      >
        <CardContent className="p-4">
          <div className="flex gap-3">
            {item.imageUrl ? (
              <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 group">
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  data-testid={`img-food-${item.id}`}
                />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                <UtensilsCrossed className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-medium text-lg text-foreground truncate" data-testid={`text-food-name-${item.id}`}>
                  {item.name}
                </h3>
                {/* Clickable storage location selector styled as a badge */}
                <Select
                  value={item.storageLocationId}
                  onValueChange={(newStorageId) => updateStorageMutation.mutate(newStorageId)}
                  disabled={updateStorageMutation.isPending || !storageLocations}
                >
                  <SelectTrigger 
                    className={cn(
                      "h-auto py-0.5 px-2 text-xs border rounded-full w-auto gap-1",
                      getStorageBadgeColor(storageLocationName),
                      "hover:bg-accent/10 transition-colors cursor-pointer"
                    )}
                    data-testid={`select-storage-${item.id}`}
                  >
                    <MapPin className="w-3 h-3" />
                    <SelectValue>
                      {storageLocationName}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {storageLocations?.map((location) => (
                      <SelectItem key={location.id} value={location.id}>
                        <div className="flex items-center gap-2">
                          <div className={cn("w-2 h-2 rounded-full", 
                            location.name.toLowerCase() === "refrigerator" && "bg-blue-500",
                            location.name.toLowerCase() === "freezer" && "bg-cyan-500",
                            location.name.toLowerCase() === "pantry" && "bg-amber-500",
                            location.name.toLowerCase() === "counter" && "bg-green-500"
                          )} />
                          {location.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Enhanced quantity section with inline editing */}
              <div className="flex items-center gap-2 mb-3">
                
                {/* Inline quantity editing */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-md px-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-primary/10"
                    onClick={() => handleQuantityChange(-1)}
                    disabled={updateQuantityMutation.isPending}
                    data-testid={`button-decrease-${item.id}`}
                  >
                    <Minus className="w-3 h-3" />
                  </Button>
                  
                  {isEditingQuantity ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={localQuantity}
                        onChange={(e) => handleQuantityInputChange(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleQuantitySubmit();
                          if (e.key === 'Escape') {
                            setLocalQuantity(parseFloat(item.quantity) || 0);
                            setIsEditingQuantity(false);
                          }
                        }}
                        className="w-16 h-7 text-sm text-center"
                        autoFocus
                        data-testid={`input-quantity-${item.id}`}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={handleQuantitySubmit}
                      >
                        <Check className="w-3 h-3" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6"
                        onClick={() => {
                          setLocalQuantity(parseFloat(item.quantity) || 0);
                          setIsEditingQuantity(false);
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditingQuantity(true)}
                      className="text-sm font-medium text-foreground hover:bg-muted rounded px-2 py-0.5 transition-colors cursor-pointer"
                      data-testid={`text-quantity-${item.id}`}
                    >
                      {localQuantity} {item.unit}
                    </button>
                  )}
                  
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-primary/10"
                    onClick={() => handleQuantityChange(1)}
                    disabled={updateQuantityMutation.isPending}
                    data-testid={`button-increase-${item.id}`}
                  >
                    <Plus className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Enhanced expiry section with inline editing */}
              {expiryStatus && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground" data-testid={`text-expiry-${item.id}`}>
                      {expiryStatus.text}
                    </span>
                    {isEditingExpiry ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="date"
                          value={localExpiry}
                          onChange={(e) => setLocalExpiry(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleExpirySubmit();
                            if (e.key === 'Escape') {
                              setLocalExpiry(item.expirationDate || "");
                              setIsEditingExpiry(false);
                            }
                          }}
                          className="h-6 text-xs"
                          data-testid={`input-expiry-${item.id}`}
                        />
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={handleExpirySubmit}
                        >
                          <Check className="w-3 h-3" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5"
                          onClick={() => {
                            setLocalExpiry(item.expirationDate || "");
                            setIsEditingExpiry(false);
                          }}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setIsEditingExpiry(true)}
                        className="text-xs text-muted-foreground hover:bg-muted rounded px-2 py-0.5 transition-colors cursor-pointer flex items-center gap-1"
                        data-testid={`button-edit-expiry-${item.id}`}
                      >
                        <Calendar className="w-3 h-3" />
                        {localExpiry ? new Date(localExpiry).toLocaleDateString() : 'Set date'}
                      </button>
                    )}
                  </div>
                  <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all-smooth", expiryStatus.color)}
                      style={{
                        width: (() => {
                          const now = new Date().getTime();
                          const expiry = new Date(localExpiry || item.expirationDate!).getTime();
                          const daysUntil = (expiry - now) / (24 * 60 * 60 * 1000);
                          
                          // For expired items, show 10% width as a minimum visual indicator
                          if (daysUntil < 0) return '10%';
                          
                          // For items expiring within 3 days, scale from 10% to 30%
                          if (daysUntil <= 3) return `${10 + (daysUntil / 3) * 20}%`;
                          
                          // For items expiring within 7 days, scale from 30% to 60%
                          if (daysUntil <= 7) return `${30 + ((daysUntil - 3) / 4) * 30}%`;
                          
                          // For items with more than 7 days, scale from 60% to 100%
                          // Max out at 30 days for full bar
                          return `${Math.min(100, 60 + ((daysUntil - 7) / 23) * 40)}%`;
                        })()
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Progressive Nutrition Display */}
              {nutritionData && (
                <div className="mb-3 bg-muted/30 rounded-lg p-2">
                  <div 
                    className="flex items-center justify-between cursor-pointer"
                    onClick={() => toggleNutrition()}
                    data-testid={`button-toggle-nutrition-${item.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <Flame className="w-4 h-4 text-orange-500" />
                        <span className="font-medium text-sm" data-testid={`text-calories-${item.id}`}>
                          {nutritionData.calories} cal
                        </span>
                      </div>
                      {nutritionData.servingSize && (
                        <span className="text-xs text-muted-foreground">
                          per {nutritionData.servingSize} {nutritionData.servingUnit || ''}
                        </span>
                      )}
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleNutrition();
                      }}
                    >
                      {isNutritionExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </Button>
                  </div>

                  {isNutritionExpanded && (
                    <div className="mt-2 pt-2 border-t border-border/50 grid grid-cols-3 gap-2 text-xs">
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Protein</span>
                        <span className="font-medium" data-testid={`text-protein-${item.id}`}>{nutritionData.protein}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Carbs</span>
                        <span className="font-medium" data-testid={`text-carbs-${item.id}`}>{nutritionData.carbohydrates}g</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-muted-foreground">Fat</span>
                        <span className="font-medium" data-testid={`text-fat-${item.id}`}>{nutritionData.fat}g</span>
                      </div>
                      {nutritionData.fiber !== undefined && (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Fiber</span>
                          <span className="font-medium" data-testid={`text-fiber-${item.id}`}>{nutritionData.fiber}g</span>
                        </div>
                      )}
                      {nutritionData.sugar !== undefined && (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Sugar</span>
                          <span className="font-medium" data-testid={`text-sugar-${item.id}`}>{nutritionData.sugar}g</span>
                        </div>
                      )}
                      {nutritionData.sodium !== undefined && (
                        <div className="flex flex-col">
                          <span className="text-muted-foreground">Sodium</span>
                          <span className="font-medium" data-testid={`text-sodium-${item.id}`}>{nutritionData.sodium}mg</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center gap-1">
                {hasNutrition && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 scale-touch"
                        onClick={() => setNutritionDialogOpen(true)}
                        data-testid={`button-nutrition-${item.id}`}
                      >
                        <Info className="w-3.5 h-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Full nutrition facts</p>
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 scale-touch"
                      onClick={() => setEditDialogOpen(true)}
                      data-testid={`button-edit-${item.id}`}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Edit item</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive hover:text-destructive scale-touch"
                      onClick={() => deleteMutation.mutate()}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${item.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Delete item</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditFoodDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        item={item}
      />
      
      {hasNutrition && (
        <NutritionFactsDialog
          open={nutritionDialogOpen}
          onOpenChange={setNutritionDialogOpen}
          item={item}
        />
      )}
    </>
  );
});