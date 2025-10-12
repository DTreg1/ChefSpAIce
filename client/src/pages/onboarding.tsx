import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ChefHat, X, Refrigerator, Snowflake, Pizza, UtensilsCrossed, Plus, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const defaultStorageAreaOptions = [
  { name: "Fridge", icon: Refrigerator },
  { name: "Freezer", icon: Snowflake },
  { name: "Pantry", icon: Pizza },
  { name: "Counter", icon: UtensilsCrossed },
];

const dietaryOptions = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", 
  "Keto", "Paleo", "Low-Carb", "Halal", "Kosher"
];

const allergenOptions = [
  "Peanuts", "Tree Nuts", "Shellfish", "Fish", 
  "Eggs", "Milk", "Soy", "Wheat", "Sesame"
];

const cookingSkillOptions = [
  { value: "beginner", label: "Beginner - I'm just starting out" },
  { value: "intermediate", label: "Intermediate - I know my way around" },
  { value: "advanced", label: "Advanced - I'm quite experienced" },
];

const commonFoodItems = [
  { name: "Salt", storage: "Pantry", quantity: "1", unit: "container", expiration: 730 },
  { name: "Black Pepper", storage: "Pantry", quantity: "1", unit: "container", expiration: 730 },
  { name: "Olive Oil", storage: "Pantry", quantity: "1", unit: "bottle", expiration: 365 },
  { name: "All-Purpose Flour", storage: "Pantry", quantity: "5", unit: "lbs", expiration: 180 },
  { name: "Sugar", storage: "Pantry", quantity: "5", unit: "lbs", expiration: 730 },
  { name: "Rice", storage: "Pantry", quantity: "2", unit: "lbs", expiration: 365 },
  { name: "Pasta", storage: "Pantry", quantity: "1", unit: "lb", expiration: 365 },
  { name: "Canned Tomatoes", storage: "Pantry", quantity: "2", unit: "cans", expiration: 365 },
  { name: "Onions", storage: "Pantry", quantity: "3", unit: "whole", expiration: 30 },
  { name: "Garlic", storage: "Pantry", quantity: "1", unit: "bulb", expiration: 30 },
  { name: "Chicken Broth", storage: "Pantry", quantity: "2", unit: "cans", expiration: 365 },
  { name: "Soy Sauce", storage: "Pantry", quantity: "1", unit: "bottle", expiration: 730 },
  { name: "Milk", storage: "Fridge", quantity: "1", unit: "gallon", expiration: 7 },
  { name: "Eggs", storage: "Fridge", quantity: "12", unit: "count", expiration: 21 },
  { name: "Butter", storage: "Fridge", quantity: "1", unit: "lb", expiration: 60 },
  { name: "Cheddar Cheese", storage: "Fridge", quantity: "8", unit: "oz", expiration: 30 },
  { name: "Carrots", storage: "Fridge", quantity: "1", unit: "lb", expiration: 21 },
  { name: "Bell Peppers", storage: "Fridge", quantity: "2", unit: "whole", expiration: 7 },
  { name: "Lettuce", storage: "Fridge", quantity: "1", unit: "head", expiration: 7 },
  { name: "Yogurt", storage: "Fridge", quantity: "4", unit: "cups", expiration: 14 },
  { name: "Mayonnaise", storage: "Fridge", quantity: "1", unit: "jar", expiration: 90 },
  { name: "Mustard", storage: "Fridge", quantity: "1", unit: "jar", expiration: 180 },
  { name: "Ketchup", storage: "Fridge", quantity: "1", unit: "bottle", expiration: 180 },
  { name: "Frozen Peas", storage: "Freezer", quantity: "1", unit: "bag", expiration: 365 },
  { name: "Frozen Corn", storage: "Freezer", quantity: "1", unit: "bag", expiration: 365 },
  { name: "Chicken Breast", storage: "Freezer", quantity: "2", unit: "lbs", expiration: 180 },
  { name: "Ground Beef", storage: "Freezer", quantity: "1", unit: "lb", expiration: 120 },
  { name: "Frozen Pizza", storage: "Freezer", quantity: "1", unit: "whole", expiration: 180 },
  { name: "Ice Cream", storage: "Freezer", quantity: "1", unit: "pint", expiration: 90 },
];

const preferenceSchema = z.object({
  storageAreasEnabled: z.array(z.string()).min(1, "Please select at least one storage area"),
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
    "Fridge", "Freezer", "Pantry", "Counter"
  ]);
  const [customStorageAreas, setCustomStorageAreas] = useState<string[]>([]);
  const [customStorageInput, setCustomStorageInput] = useState("");
  const [selectedCommonItems, setSelectedCommonItems] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [foodToAvoid, setFoodToAvoid] = useState("");
  const [foodsToAvoidList, setFoodsToAvoidList] = useState<string[]>([]);

  const form = useForm<z.infer<typeof preferenceSchema>>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      storageAreasEnabled: ["Fridge", "Freezer", "Pantry", "Counter"],
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
      // Step 1: Save user preferences
      const preferences = await apiRequest("PUT", "/api/user/preferences", {
        ...data,
        hasCompletedOnboarding: true,
      });

      // Step 2: Create custom storage locations
      for (const customArea of customStorageAreas) {
        await apiRequest("POST", "/api/storage-locations", {
          name: customArea,
          icon: "package",
        });
      }

      // Step 3: Get all storage locations to map names to IDs
      const response = await apiRequest("GET", "/api/storage-locations", null);
      const locations = await response.json() as any[];
      
      const locationMap = new Map(
        locations.map((loc: any) => [loc.name, loc.id])
      );

      // Step 4: Create selected common food items
      for (const itemName of selectedCommonItems) {
        const itemData = commonFoodItems.find(item => item.name === itemName);
        if (!itemData) continue;

        const storageLocationId = locationMap.get(itemData.storage);
        if (!storageLocationId) continue;

        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + itemData.expiration);

        await apiRequest("POST", "/api/food-items", {
          name: itemData.name,
          quantity: itemData.quantity,
          unit: itemData.unit,
          storageLocationId,
          expirationDate: expirationDate.toISOString(),
        });
      }

      return preferences;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      queryClient.invalidateQueries({ queryKey: ["/api/storage-locations"] });
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      window.location.href = "/";
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  const toggleStorageArea = (area: string) => {
    const newSelected = selectedStorageAreas.includes(area)
      ? selectedStorageAreas.filter(s => s !== area)
      : [...selectedStorageAreas, area];
    setSelectedStorageAreas(newSelected);
    form.setValue("storageAreasEnabled", newSelected);
  };

  const addCustomStorageArea = () => {
    const trimmed = customStorageInput.trim();
    if (trimmed && !customStorageAreas.includes(trimmed) && !selectedStorageAreas.includes(trimmed)) {
      const newCustomAreas = [...customStorageAreas, trimmed];
      setCustomStorageAreas(newCustomAreas);
      const newSelected = [...selectedStorageAreas, trimmed];
      setSelectedStorageAreas(newSelected);
      form.setValue("storageAreasEnabled", newSelected);
      setCustomStorageInput("");
    }
  };

  const removeCustomStorageArea = (area: string) => {
    setCustomStorageAreas(customStorageAreas.filter(a => a !== area));
    const newSelected = selectedStorageAreas.filter(s => s !== area);
    setSelectedStorageAreas(newSelected);
    form.setValue("storageAreasEnabled", newSelected);
  };

  const toggleCommonItem = (itemName: string) => {
    const newSelected = selectedCommonItems.includes(itemName)
      ? selectedCommonItems.filter(i => i !== itemName)
      : [...selectedCommonItems, itemName];
    setSelectedCommonItems(newSelected);
  };

  const toggleDietary = (option: string) => {
    const newSelected = selectedDietary.includes(option)
      ? selectedDietary.filter(d => d !== option)
      : [...selectedDietary, option];
    setSelectedDietary(newSelected);
    form.setValue("dietaryRestrictions", newSelected);
  };

  const toggleAllergen = (option: string) => {
    const newSelected = selectedAllergens.includes(option)
      ? selectedAllergens.filter(a => a !== option)
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
    const newList = foodsToAvoidList.filter(f => f !== food);
    setFoodsToAvoidList(newList);
    form.setValue("foodsToAvoid", newList);
  };

  const onSubmit = (data: z.infer<typeof preferenceSchema>) => {
    saveMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 p-4 py-8">
      <div className="max-w-3xl mx-auto">
        <Card data-testid="card-onboarding">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <ChefHat className="w-16 h-16 text-primary" />
            </div>
            <CardTitle className="text-3xl">Welcome to Kitchen Wizard!</CardTitle>
            <CardDescription className="text-base">
              Let's personalize your experience. You can always change these later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-4">
                <FormLabel>Which storage areas do you have? (Pre-selected for you)</FormLabel>
                <FormDescription>
                  These are already selected. Deselect any you don't have, or add your own custom storage areas.
                </FormDescription>
                <div className="flex flex-wrap gap-2">
                  {defaultStorageAreaOptions.map((area) => {
                    const Icon = area.icon;
                    return (
                      <Badge
                        key={area.name}
                        variant={selectedStorageAreas.includes(area.name) ? "default" : "outline"}
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
                      data-testid={`badge-custom-storage-${area.toLowerCase().replace(/\s+/g, '-')}`}
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
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
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
                <FormLabel>Quick-Add Common Items (Optional)</FormLabel>
                <FormDescription>
                  Select items you already have to save time setting up your inventory. You can add more items later.
                </FormDescription>
                
                <div className="space-y-3">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Pantry Staples</h4>
                    <div className="flex flex-wrap gap-2">
                      {commonFoodItems.filter(item => item.storage === "Pantry").map((item) => (
                        <Badge
                          key={item.name}
                          variant={selectedCommonItems.includes(item.name) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => toggleCommonItem(item.name)}
                          data-testid={`badge-common-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {item.name}
                          {selectedCommonItems.includes(item.name) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Refrigerator Items</h4>
                    <div className="flex flex-wrap gap-2">
                      {commonFoodItems.filter(item => item.storage === "Fridge").map((item) => (
                        <Badge
                          key={item.name}
                          variant={selectedCommonItems.includes(item.name) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => toggleCommonItem(item.name)}
                          data-testid={`badge-common-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {item.name}
                          {selectedCommonItems.includes(item.name) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-medium mb-2">Freezer Items</h4>
                    <div className="flex flex-wrap gap-2">
                      {commonFoodItems.filter(item => item.storage === "Freezer").map((item) => (
                        <Badge
                          key={item.name}
                          variant={selectedCommonItems.includes(item.name) ? "default" : "outline"}
                          className="cursor-pointer hover-elevate active-elevate-2"
                          onClick={() => toggleCommonItem(item.name)}
                          data-testid={`badge-common-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
                        >
                          {item.name}
                          {selectedCommonItems.includes(item.name) && (
                            <X className="w-3 h-3 ml-1" />
                          )}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {selectedCommonItems.length > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {selectedCommonItems.length} item{selectedCommonItems.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="householdSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>How many people do you typically cook for?</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          min={1}
                          max={20}
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value))}
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
                      <FormLabel>What's your cooking skill level?</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-cooking-skill">
                            <SelectValue placeholder="Select your skill level" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {cookingSkillOptions.map((skill) => (
                            <SelectItem key={skill.value} value={skill.value} data-testid={`option-skill-${skill.value}`}>
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
              </div>

              <FormField
                control={form.control}
                name="preferredUnits"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preferred measurement units</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-units">
                          <SelectValue placeholder="Select unit system" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="imperial" data-testid="option-units-imperial">Imperial (cups, oz, °F)</SelectItem>
                        <SelectItem value="metric" data-testid="option-units-metric">Metric (ml, g, °C)</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      Your preferred units for recipes and measurements
                    </FormDescription>
                  </FormItem>
                )}
              />

              <div className="space-y-4">
                <FormLabel>Dietary Preferences (Optional)</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {dietaryOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={selectedDietary.includes(option) ? "default" : "outline"}
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
                <FormLabel>Allergens to Avoid (Optional)</FormLabel>
                <div className="flex flex-wrap gap-2">
                  {allergenOptions.map((option) => (
                    <Badge
                      key={option}
                      variant={selectedAllergens.includes(option) ? "destructive" : "outline"}
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
                <FormLabel>Foods to Always Avoid (Optional)</FormLabel>
                <FormDescription>
                  Add any specific foods or ingredients you want to avoid in recipes
                </FormDescription>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g., cilantro, mushrooms"
                    value={foodToAvoid}
                    onChange={(e) => setFoodToAvoid(e.target.value)}
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
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
                        data-testid={`badge-avoid-${food.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {food}
                        <X className="w-3 h-3 ml-1" />
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

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
                        onChange={(e) => field.onChange(parseInt(e.target.value))}
                        data-testid="input-expiration-days"
                      />
                    </FormControl>
                    <FormDescription>
                      Get notified when food items will expire within this many days
                    </FormDescription>
                  </FormItem>
                )}
              />

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
