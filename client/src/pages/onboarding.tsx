import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  ChefHat,
  X,
  Refrigerator,
  Snowflake,
  Pizza,
  UtensilsCrossed,
  Plus,
  Package,
  Loader2,
  Home,
  Package2,
  Utensils,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ApplianceLibrary } from "@shared/schema";

const defaultStorageAreaOptions = [
  { name: "Refrigerator", icon: Refrigerator },
  { name: "Freezer", icon: Snowflake },
  { name: "Pantry", icon: Pizza },
  { name: "Counter", icon: UtensilsCrossed },
];

const dietaryOptions = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Keto",
  "Paleo",
  "Low-Carb",
  "Halal",
  "Kosher",
];

const allergenOptions = [
  "Peanuts",
  "Tree Nuts",
  "Shellfish",
  "Fish",
  "Eggs",
  "Milk",
  "Soy",
  "Wheat",
  "Sesame",
];

const cookingSkillOptions = [
  { value: "beginner", label: "Beginner - I'm just starting out" },
  { value: "intermediate", label: "Intermediate - I know my way around" },
  { value: "advanced", label: "Advanced - I'm quite experienced" },
];

// Interface for common items from API
interface CommonItem {
  displayName: string;
  fcdId: string;
  description: string;
  storage: string;
  quantity: string;
  unit: string;
  expirationDays: number;
  category: string;
}

// Interface for the API response
interface CommonItemsResponse {
  categories: Record<string, CommonItem[]>;
}

const preferenceSchema = z.object({
  storageAreasEnabled: z
    .array(z.string())
    .min(1, "Please select at least one storage area"),
  householdSize: z.number().int().min(1).max(20),
  cookingSkillLevel: z.enum(["beginner", "intermediate", "advanced"]),
  preferredUnits: z.enum(["metric", "imperial"]),
  dietaryRestrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  foodsToAvoid: z.array(z.string()).optional(),
  expirationAlertDays: z.number().int().min(1).max(14),
});

export default function Onboarding() {
  const { toast } = useToast();
  const [selectedStorageAreas, setSelectedStorageAreas] = useState<string[]>([
    "Refrigerator",
    "Freezer",
    "Pantry",
    "Counter",
  ]);
  const [customStorageAreas, setCustomStorageAreas] = useState<string[]>([]);
  const [customStorageInput, setCustomStorageInput] = useState("");
  const [selectedCommonItems, setSelectedCommonItems] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [foodToAvoid, setFoodToAvoid] = useState("");
  const [foodsToAvoidList, setFoodsToAvoidList] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  // Fetch common items from API
  const { data: commonItemsData, isLoading: itemsLoading } =
    useQuery<CommonItemsResponse>({
      queryKey: ["/api/onboarding/common-items"],
    });

  // Fetch common equipment from API
  const { data: commonEquipment, isLoading: equipmentLoading } =
    useQuery<ApplianceLibrary[]>({
      queryKey: ["/api/appliance-library/common"],
    });

  // Set all items as selected by default when data loads
  useEffect(() => {
    if (commonItemsData?.categories) {
      const allItems: string[] = [];
      Object.values(commonItemsData.categories).forEach((items) => {
        items.forEach((item) => {
          allItems.push(item.displayName);
        });
      });
      setSelectedCommonItems(allItems);
    }
  }, [commonItemsData]);

  const form = useForm<z.infer<typeof preferenceSchema>>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      storageAreasEnabled: ["Refrigerator", "Freezer", "Pantry", "Counter"],
      householdSize: 2,
      cookingSkillLevel: "beginner",
      preferredUnits: "imperial",
      dietaryRestrictions: [] as string[],
      allergens: [] as string[],
      foodsToAvoid: [] as string[],
      expirationAlertDays: 3,
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferenceSchema>) => {
      // Single POST request to complete onboarding
      const response = await apiRequest("POST", "/api/auth/onboarding/complete", {
        preferences: data,
        customStorageAreas: customStorageAreas,
        selectedCommonItems: selectedCommonItems,
        selectedEquipment: selectedEquipment,
      });

      const result = await response.json();
      return {
        successCount: result.foodItemsCreated,
        failedItems: result.failedItems,
        createdStorageLocations: result.createdStorageLocations,
        equipmentAdded: result.equipmentAdded,
      };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });

      // Show feedback about food item creation
      if (data.failedItems.length > 0) {
        toast({
          title: "Setup Complete with Warnings",
          description: `${data.successCount} items added successfully. ${data.failedItems.length} items failed: ${data.failedItems.join(", ")}. You can add them manually later.`,
          variant: "default",
        });
      } else if (data.successCount > 0) {
        toast({
          title: "Setup Complete!",
          description: `Successfully added ${data.successCount} items to your kitchen.`,
        });
      }

      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description:
          error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleStorageArea = (area: string) => {
    const newSelected = selectedStorageAreas.includes(area)
      ? selectedStorageAreas.filter((s) => s !== area)
      : [...selectedStorageAreas, area];
    setSelectedStorageAreas(newSelected);
    form.setValue("storageAreasEnabled", newSelected);
  };

  const addCustomStorageArea = () => {
    const trimmed = customStorageInput.trim();
    if (
      trimmed &&
      !customStorageAreas.includes(trimmed) &&
      !selectedStorageAreas.includes(trimmed)
    ) {
      const newCustomAreas = [...customStorageAreas, trimmed];
      setCustomStorageAreas(newCustomAreas);
      const newSelected = [...selectedStorageAreas, trimmed];
      setSelectedStorageAreas(newSelected);
      form.setValue("storageAreasEnabled", newSelected);
      setCustomStorageInput("");
    }
  };

  const removeCustomStorageArea = (area: string) => {
    setCustomStorageAreas(customStorageAreas.filter((a) => a !== area));
    const newSelected = selectedStorageAreas.filter((s) => s !== area);
    setSelectedStorageAreas(newSelected);
    form.setValue("storageAreasEnabled", newSelected);
  };

  const toggleCommonItem = (itemName: string) => {
    const newSelected = selectedCommonItems.includes(itemName)
      ? selectedCommonItems.filter((i) => i !== itemName)
      : [...selectedCommonItems, itemName];
    setSelectedCommonItems(newSelected);
  };

  const toggleEquipment = (equipmentId: string) => {
    const newSelected = selectedEquipment.includes(equipmentId)
      ? selectedEquipment.filter((e) => e !== equipmentId)
      : [...selectedEquipment, equipmentId];
    setSelectedEquipment(newSelected);
  };

  const toggleDietary = (option: string) => {
    const newSelected = selectedDietary.includes(option)
      ? selectedDietary.filter((d) => d !== option)
      : [...selectedDietary, option];
    setSelectedDietary(newSelected);
    form.setValue("dietaryRestrictions", newSelected);
  };

  const toggleAllergen = (option: string) => {
    const newSelected = selectedAllergens.includes(option)
      ? selectedAllergens.filter((a) => a !== option)
      : [...selectedAllergens, option];
    setSelectedAllergens(newSelected);
    form.setValue("allergens", newSelected);
  };

  const addFoodToAvoid = () => {
    if (foodToAvoid.trim() && !foodsToAvoidList.includes(foodToAvoid.trim())) {
      const newList = [...foodsToAvoidList, foodToAvoid.trim()];
      setFoodsToAvoidList(newList);
      form.setValue("foodsToAvoid", newList);
      setFoodToAvoid("");
    }
  };

  const removeFoodToAvoid = (food: string) => {
    const newList = foodsToAvoidList.filter((f) => f !== food);
    setFoodsToAvoidList(newList);
    form.setValue("foodsToAvoid", newList);
  };

  const onSubmit = (data: z.infer<typeof preferenceSchema>) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-black/80 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Card data-testid="card-onboarding" animate={false}>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ChefHat className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Welcome to ChefSpAIce!</CardTitle>
            <CardDescription className="text-base">
              Let's personalize your experience. You can always change these
              later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="space-y-6"
              >
                <div className="space-y-4">
                  <FormLabel>We'll start by adding storage areas</FormLabel>
                  <FormDescription>
                    Deselect any you don't have, or add your own custom names.
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {defaultStorageAreaOptions.map((area) => {
                      const Icon = area.icon;
                      return (
                        <Badge
                          key={area.name}
                          variant={
                            selectedStorageAreas.includes(area.name)
                              ? "default"
                              : "outline"
                          }
                          className="cursor-pointer hover-elevate active-elevate-2 gap-1.5"
                          onClick={() => toggleStorageArea(area.name)}
                          data-testid={`badge-storage-${area.name.toLowerCase()}`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {area.name}
                          {selectedStorageAreas.includes(area.name) && (
                            <X className="w-3 h-3 ml-0.5" />
                          )}
                        </Badge>
                      );
                    })}
                    {customStorageAreas.map((area) => (
                      <Badge
                        key={area}
                        variant="default"
                        className="cursor-pointer hover-elevate active-elevate-2 gap-1.5"
                        onClick={() => removeCustomStorageArea(area)}
                        data-testid={`badge-custom-storage-${area.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        {area}
                        <X className="w-3 h-3 ml-0.5" />
                      </Badge>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="Add custom storage (e.g., Wine Cellar, Garage Fridge)"
                      value={customStorageInput}
                      onChange={(e) => setCustomStorageInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addCustomStorageArea();
                        }
                      }}
                      data-testid="input-custom-storage"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomStorageArea}
                      data-testid="button-add-custom-storage"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                  {form.formState.errors.storageAreasEnabled && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.storageAreasEnabled.message}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <FormLabel>Select Your Kitchen Equipment</FormLabel>
                  <FormDescription>
                    Select the appliances, cookware, and utensils you have available. This helps us suggest recipes tailored to your kitchen.
                  </FormDescription>
                  {equipmentLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : commonEquipment && commonEquipment.length > 0 ? (
                    <div className="space-y-3">
                      {/* Group equipment by category */}
                      {["appliance", "cookware", "bakeware", "utensil"].map((category) => {
                        const categoryItems = commonEquipment.filter(
                          (item) => item.category === category
                        );
                        if (categoryItems.length === 0) return null;
                        
                        const categoryIcons: Record<string, any> = {
                          appliance: Home,
                          cookware: Package2,
                          bakeware: ChefHat,
                          utensil: Utensils,
                        };
                        const CategoryIcon = categoryIcons[category] || Package;
                        
                        return (
                          <div key={category}>
                            <div className="flex items-center gap-2 mb-2">
                              <CategoryIcon className="w-4 h-4 text-muted-foreground" />
                              <h4 className="text-sm font-medium capitalize">
                                {category === "appliance" ? "Appliances" : 
                                 category === "cookware" ? "Cookware" :
                                 category === "bakeware" ? "Bakeware" : "Utensils"}
                              </h4>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {categoryItems.map((item) => (
                                <Badge
                                  key={item.id}
                                  variant={
                                    selectedEquipment.includes(item.id)
                                      ? "default"
                                      : "outline"
                                  }
                                  className="cursor-pointer hover-elevate active-elevate-2"
                                  onClick={() => toggleEquipment(item.id)}
                                  data-testid={`badge-equipment-${item.name.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {item.name}
                                  {selectedEquipment.includes(item.id) && (
                                    <X className="w-3 h-3 ml-1" />
                                  )}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No equipment available
                    </div>
                  )}
                  {selectedEquipment.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedEquipment.length} item{selectedEquipment.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  <FormLabel>Set Up Your Kitchen Inventory</FormLabel>
                  <FormDescription>
                    We've pre-selected common items. Deselect anything you don't
                    have. You can always add more items later.
                  </FormDescription>

                  {itemsLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin" />
                    </div>
                  ) : commonItemsData?.categories ? (
                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {Object.entries(commonItemsData.categories).map(
                        ([category, items]) => (
                          <div key={category}>
                            <h4 className="text-sm font-medium mb-2">
                              {category}
                            </h4>
                            <div className="flex flex-wrap gap-2">
                              {items.map((item) => (
                                <Badge
                                  key={item.displayName}
                                  variant={
                                    selectedCommonItems.includes(
                                      item.displayName,
                                    )
                                      ? "default"
                                      : "outline"
                                  }
                                  className="cursor-pointer hover-elevate active-elevate-2"
                                  onClick={() =>
                                    toggleCommonItem(item.displayName)
                                  }
                                  data-testid={`badge-common-${item.displayName.toLowerCase().replace(/\s+/g, "-")}`}
                                >
                                  {item.displayName}
                                  {selectedCommonItems.includes(
                                    item.displayName,
                                  ) && <X className="w-3 h-3 ml-1" />}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        ),
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      No items available
                    </div>
                  )}

                  {selectedCommonItems.length > 0 && (
                    <p className="text-sm text-muted-foreground mt-2">
                      {selectedCommonItems.length} item
                      {selectedCommonItems.length !== 1 ? "s" : ""} selected
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <FormField
                    control={form.control}
                    name="householdSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cooking for?</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={20}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                            data-testid="input-household-size"
                          />
                        </FormControl>
                        <FormDescription>
                          This helps us suggest appropriate serving sizes
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cookingSkillLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cooking skill level?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-cooking-skill">
                              <SelectValue placeholder="Select your skill level" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {cookingSkillOptions.map((skill) => (
                              <SelectItem
                                key={skill.value}
                                value={skill.value}
                                data-testid={`option-skill-${skill.value}`}
                              >
                                {skill.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          We'll tailor recipe complexity to your level
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="preferredUnits"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Preferred units</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          defaultValue={field.value}
                        >
                          <FormControl>
                            <SelectTrigger data-testid="select-units">
                              <SelectValue placeholder="Select unit system" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem
                              value="imperial"
                              data-testid="option-units-imperial"
                            >
                              Imperial (cups, oz, °F)
                            </SelectItem>
                            <SelectItem
                              value="metric"
                              data-testid="option-units-metric"
                            >
                              Metric (ml, g, °C)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <FormDescription>
                          Your preferred units for recipes and measurements
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="expirationAlertDays"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expiration Alert Days</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min={1}
                            max={14}
                            {...field}
                            onChange={(e) =>
                              field.onChange(parseInt(e.target.value))
                            }
                            data-testid="input-expiration-days"
                          />
                        </FormControl>
                        <FormDescription>
                          Get notified when food items will expire within this
                          many days
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>

                <div className="space-y-4">
                  <FormLabel>Dietary Preferences</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {dietaryOptions.map((option) => (
                      <Badge
                        key={option}
                        variant={
                          selectedDietary.includes(option)
                            ? "default"
                            : "outline"
                        }
                        className="cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => toggleDietary(option)}
                        data-testid={`badge-dietary-${option.toLowerCase()}`}
                      >
                        {option}
                        {selectedDietary.includes(option) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <FormLabel>Allergens to Avoid</FormLabel>
                  <div className="flex flex-wrap gap-2">
                    {allergenOptions.map((option) => (
                      <Badge
                        key={option}
                        variant={
                          selectedAllergens.includes(option)
                            ? "destructive"
                            : "outline"
                        }
                        className="cursor-pointer hover-elevate active-elevate-2"
                        onClick={() => toggleAllergen(option)}
                        data-testid={`badge-allergen-${option.toLowerCase()}`}
                      >
                        {option}
                        {selectedAllergens.includes(option) && (
                          <X className="w-3 h-3 ml-1" />
                        )}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="space-y-4">
                  <FormLabel>Foods to Always Avoid</FormLabel>
                  <FormDescription>
                    Add any specific foods or ingredients you want to avoid in
                    recipes
                  </FormDescription>
                  <div className="flex gap-2">
                    <Input
                      type="text"
                      placeholder="e.g., cilantro, mushrooms"
                      value={foodToAvoid}
                      onChange={(e) => setFoodToAvoid(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addFoodToAvoid();
                        }
                      }}
                      data-testid="input-food-to-avoid"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addFoodToAvoid}
                      data-testid="button-add-food-to-avoid"
                    >
                      Add
                    </Button>
                  </div>
                  {foodsToAvoidList.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {foodsToAvoidList.map((food) => (
                        <Badge
                          key={food}
                          variant="secondary"
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => removeFoodToAvoid(food)}
                          data-testid={`badge-avoid-${food.toLowerCase().replace(/\s+/g, "-")}`}
                        >
                          {food}
                          <X className="w-3 h-3 ml-1" />
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={saveMutation.isPending}
                  data-testid="button-complete-onboarding"
                >
                  {saveMutation.isPending ? "Setting up..." : "Complete Setup"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
