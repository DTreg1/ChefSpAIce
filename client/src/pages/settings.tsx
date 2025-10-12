import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, LogOut, Refrigerator, Snowflake, Pizza, UtensilsCrossed } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, UserPreferences } from "@shared/schema";

const storageAreaOptions = [
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

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedStorageAreas, setSelectedStorageAreas] = useState<string[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [foodToAvoid, setFoodToAvoid] = useState("");
  const [foodsToAvoidList, setFoodsToAvoidList] = useState<string[]>([]);

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  const form = useForm<z.infer<typeof preferenceSchema>>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      storageAreasEnabled: [],
      householdSize: 2,
      cookingSkillLevel: "beginner",
      preferredUnits: "imperial",
      dietaryRestrictions: [] as string[],
      allergens: [] as string[],
      foodsToAvoid: [] as string[],
      expirationAlertDays: 3,
    },
  });

  useEffect(() => {
    if (preferences) {
      const storageAreas = preferences.storageAreasEnabled || [];
      const dietary = preferences.dietaryRestrictions || [];
      const allergens = preferences.allergens || [];
      const foodsToAvoid = preferences.foodsToAvoid || [];
      setSelectedStorageAreas(storageAreas);
      setSelectedDietary(dietary);
      setSelectedAllergens(allergens);
      setFoodsToAvoidList(foodsToAvoid);
      form.reset({
        storageAreasEnabled: storageAreas,
        householdSize: preferences.householdSize || 2,
        cookingSkillLevel: (preferences.cookingSkillLevel as "beginner" | "intermediate" | "advanced") || "beginner",
        preferredUnits: (preferences.preferredUnits as "metric" | "imperial") || "imperial",
        dietaryRestrictions: dietary,
        allergens: allergens,
        foodsToAvoid: foodsToAvoid,
        expirationAlertDays: preferences.expirationAlertDays || 3,
      });
    }
  }, [preferences, form]);

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferenceSchema>) => {
      const response = await fetch("/api/user/preferences", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          hasCompletedOnboarding: true,
        }),
      });
      if (!response.ok) throw new Error("Failed to save preferences");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/preferences"] });
      toast({
        title: "Success",
        description: "Your preferences have been saved.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
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

  const getUserInitials = () => {
    if (!user) return "U";
    const typedUser = user as User;
    const firstName = typedUser.firstName || "";
    const lastName = typedUser.lastName || "";
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (firstName) return firstName[0].toUpperCase();
    if (typedUser.email) return typedUser.email[0].toUpperCase();
    return "U";
  };

  return (
    <div className="h-full overflow-auto">
      <div className="container max-w-4xl mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-8" data-testid="text-settings-title">Settings</h1>

        <Card className="mb-6" data-testid="card-profile">
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your account information</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Avatar className="w-16 h-16">
                <AvatarImage src={(user as User)?.profileImageUrl || undefined} />
                <AvatarFallback>{getUserInitials()}</AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium" data-testid="text-profile-name">
                  {(user as User)?.firstName && (user as User)?.lastName 
                    ? `${(user as User).firstName} ${(user as User).lastName}`
                    : (user as User)?.email || "User"}
                </p>
                <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                  {(user as User)?.email}
                </p>
              </div>
            </div>
            <Separator />
            <Button
              variant="outline"
              onClick={() => window.location.href = "/api/logout"}
              data-testid="button-logout"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Log Out
            </Button>
          </CardContent>
        </Card>

        <Card data-testid="card-preferences">
          <CardHeader>
            <CardTitle>Preferences</CardTitle>
            <CardDescription>Customize your Kitchen Wizard experience</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="space-y-4">
                  <FormLabel>Storage Areas</FormLabel>
                  <FormDescription>
                    Select the storage areas you have available
                  </FormDescription>
                  <div className="flex flex-wrap gap-2">
                    {storageAreaOptions.map((area) => {
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
                  </div>
                  {form.formState.errors.storageAreasEnabled && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.storageAreasEnabled.message}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="householdSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Household Size</FormLabel>
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
                          Number of people you typically cook for
                        </FormDescription>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cookingSkillLevel"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cooking Skill Level</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
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
                          Recipe complexity will be tailored to your level
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
                      <FormLabel>Preferred Measurement Units</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  <FormLabel>Dietary Preferences</FormLabel>
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
                  <FormLabel>Allergens to Avoid</FormLabel>
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
                  <FormLabel>Foods to Always Avoid</FormLabel>
                  <FormDescription>
                    Add specific foods or ingredients you want to avoid in recipes
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
                  disabled={saveMutation.isPending}
                  data-testid="button-save-preferences"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Preferences"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
