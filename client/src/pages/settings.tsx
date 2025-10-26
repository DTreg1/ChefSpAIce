import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useStorageLocations } from "@/hooks/useStorageLocations";
import { useCachedQuery } from "@/hooks/useCachedQuery";
import { CacheStorage } from "@/lib/cacheStorage";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { X, LogOut, Refrigerator, Snowflake, Pizza, UtensilsCrossed, Activity, AlertTriangle, Plus, Package, Trash2, CreditCard, Calendar, Users, ChefHat, Palette, User2, Settings2, Shield, Database, Bell, BellOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationSettings } from "@/components/notification-settings";
import type { User, StorageLocation } from "@shared/schema";

const storageAreaOptions = [
  { name: "Refrigerator", icon: Refrigerator },
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
  const [customStorageInput, setCustomStorageInput] = useState("");
  const [isAddingStorage, setIsAddingStorage] = useState(false);
  const isAddingStorageRef = useRef(false);
  const pendingStorageNamesRef = useRef<Set<string>>(new Set());
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);
  const [foodToAvoid, setFoodToAvoid] = useState("");
  const [foodsToAvoidList, setFoodsToAvoidList] = useState<string[]>([]);

  const { data: preferences } = useCachedQuery<User>({
    queryKey: ["/api/auth/user"],
  });

  const { data: storageLocations } = useStorageLocations();

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preferences]);

  // Sync selectedStorageAreas when storageLocations change to ensure newly added custom areas are selected
  useEffect(() => {
    if (storageLocations && selectedStorageAreas.length > 0) {
      const availableNames = storageLocations.map(loc => loc.name);
      const validSelected = selectedStorageAreas.filter(name => availableNames.includes(name));
      
      // Only update if there's a difference to avoid infinite loops
      if (validSelected.length !== selectedStorageAreas.length) {
        setSelectedStorageAreas(validSelected);
        form.setValue("storageAreasEnabled", validSelected);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageLocations, selectedStorageAreas]);

  const saveMutation = useMutation({
    mutationFn: async (data: z.infer<typeof preferenceSchema>) => {
      const response = await apiRequest("PUT", "/api/user/preferences", {
        ...data,
        hasCompletedOnboarding: true,
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
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

  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/reset", null);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      toast({
        title: "Account Reset",
        description: "All your data has been cleared. Redirecting to onboarding...",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset account. Please try again.",
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

  const addCustomStorage = async () => {
    if (!customStorageInput.trim() || !storageLocations || isAddingStorageRef.current) {
      return;
    }

    const newStorageName = customStorageInput.trim();
    const newStorageNameLower = newStorageName.toLowerCase();
    
    // Check against both existing storage locations AND pending additions
    const storageNames = storageLocations.map(loc => loc.name.toLowerCase());
    const pendingNames = Array.from(pendingStorageNamesRef.current).map(n => n.toLowerCase());
    
    if (storageNames.includes(newStorageNameLower) || pendingNames.includes(newStorageNameLower)) {
      toast({
        title: "Already Exists",
        description: "This storage area already exists or is being added.",
        variant: "destructive",
      });
      return;
    }

    // Set synchronous guards
    isAddingStorageRef.current = true;
    setIsAddingStorage(true);
    pendingStorageNamesRef.current.add(newStorageName);
    
    try {
      await apiRequest("POST", "/api/storage-locations", {
        name: newStorageName,
        icon: "package",
      });
      
      // Await the refetch to ensure fresh data
      await queryClient.refetchQueries({ queryKey: ["/api/storage-locations"] });
      
      // Use functional updates to avoid clobbering concurrent user edits
      setSelectedStorageAreas(prev => [...prev, newStorageName]);
      form.setValue("storageAreasEnabled", (form.getValues("storageAreasEnabled") || []).concat(newStorageName));
      setCustomStorageInput("");
      
      toast({
        title: "Success",
        description: "Custom storage area added.",
      });
    } catch (error: any) {
      const errorMsg = error?.message?.includes("already exists") || error?.status === 409
        ? "This storage area already exists."
        : "Failed to add custom storage area.";
      
      toast({
        title: "Error",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      isAddingStorageRef.current = false;
      setIsAddingStorage(false);
      pendingStorageNamesRef.current.delete(newStorageName);
    }
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

        <Accordion type="single" collapsible className="space-y-4" defaultValue="profile">
          {/* Profile Section */}
          <AccordionItem value="profile" className="border rounded-lg" data-testid="section-profile">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <User2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Profile</span>
                <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                  {(user as User)?.email || "Guest"}
                </Badge>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="flex flex-col md:flex-row gap-6 pt-4">
                <div className="flex-shrink-0">
                  <Avatar className="w-32 h-32 border-4 border-border rounded-md">
                    <AvatarImage src={(user as User)?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-3xl rounded-md">{getUserInitials()}</AvatarFallback>
                  </Avatar>
                </div>
                
                <div className="flex-1 space-y-4">
                  <div>
                    <h2 className="text-2xl font-bold mb-1" data-testid="text-profile-name">
                      {(user as User)?.firstName && (user as User)?.lastName 
                        ? `${(user as User).firstName} ${(user as User).lastName}`
                        : (user as User)?.email || "User"}
                    </h2>
                    <p className="text-sm text-muted-foreground" data-testid="text-profile-email">
                      {(user as User)?.email}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="flex items-start gap-2">
                      <CreditCard className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Member ID</div>
                        <div className="font-mono text-xs" data-testid="text-member-id">
                          {(user as User)?.id?.slice(0, 8).toUpperCase() || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Member Since</div>
                        <div className="font-medium" data-testid="text-member-since">
                          {(user as User)?.createdAt 
                            ? new Date((user as User).createdAt!).toLocaleDateString('en-US', { 
                                month: 'short', 
                                year: 'numeric' 
                              })
                            : "N/A"}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Users className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Household Size</div>
                        <div className="font-medium" data-testid="text-household-size">
                          {preferences?.householdSize || 2} {(preferences?.householdSize || 2) === 1 ? 'person' : 'people'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <ChefHat className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <div>
                        <div className="text-muted-foreground">Cooking Level</div>
                        <div className="font-medium capitalize" data-testid="text-cooking-level">
                          {preferences?.cookingSkillLevel || "Beginner"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        CacheStorage.clear();
                        window.location.href = "/api/logout";
                      }}
                      data-testid="button-logout"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Log Out
                    </Button>
                  </div>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Preferences Section */}
          <AccordionItem value="preferences" className="border rounded-lg" data-testid="section-preferences">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Settings2 className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">General Preferences</span>
                {(preferences?.householdSize || preferences?.cookingSkillLevel) && (
                  <span className="text-sm text-muted-foreground ml-2">
                    {preferences?.householdSize} people • {preferences?.cookingSkillLevel}
                  </span>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">
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
            </AccordionContent>
          </AccordionItem>

          {/* Dietary & Allergens Section */}
          <AccordionItem value="dietary" className="border rounded-lg" data-testid="section-dietary">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Shield className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Dietary Restrictions & Allergens</span>
                {(selectedDietary.length > 0 || selectedAllergens.length > 0) && (
                  <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                    {selectedDietary.length + selectedAllergens.length} active
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Form {...form}>
                <form className="space-y-6 pt-4">
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

                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-dietary"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Dietary Preferences"}
                  </Button>
                </form>
              </Form>
            </AccordionContent>
          </AccordionItem>

          {/* Storage Areas Section */}
          <AccordionItem value="storage" className="border rounded-lg" data-testid="section-storage">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Database className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Storage Areas</span>
                {selectedStorageAreas.length > 0 && (
                  <Badge variant="secondary" className="ml-2 no-default-hover-elevate no-default-active-elevate">
                    {selectedStorageAreas.length} active
                  </Badge>
                )}
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <Form {...form}>
                <form className="space-y-4 pt-4">
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
                    {storageLocations?.filter(loc => 
                      !storageAreaOptions.some(opt => opt.name === loc.name)
                    ).map((customLoc) => (
                      <Badge
                        key={customLoc.id}
                        variant={selectedStorageAreas.includes(customLoc.name) ? "default" : "outline"}
                        className="cursor-pointer hover-elevate active-elevate-2 gap-1.5"
                        onClick={() => toggleStorageArea(customLoc.name)}
                        data-testid={`badge-storage-${customLoc.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        <Package className="w-3.5 h-3.5" />
                        {customLoc.name}
                        {selectedStorageAreas.includes(customLoc.name) && (
                          <X className="w-3 h-3 ml-0.5" />
                        )}
                      </Badge>
                    ))}
                  </div>
                  
                  <div className="flex gap-2 pt-2">
                    <Input
                      type="text"
                      placeholder="Add custom storage area (e.g., Wine Cellar, Garage)"
                      value={customStorageInput}
                      onChange={(e) => setCustomStorageInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addCustomStorage();
                        }
                      }}
                      data-testid="input-custom-storage"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addCustomStorage}
                      disabled={isAddingStorage}
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

                  <Button
                    type="button"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={saveMutation.isPending}
                    data-testid="button-save-storage"
                  >
                    {saveMutation.isPending ? "Saving..." : "Save Storage Areas"}
                  </Button>
                </form>
              </Form>
            </AccordionContent>
          </AccordionItem>

          {/* Appearance Section */}
          <AccordionItem value="appearance" className="border rounded-lg" data-testid="section-appearance">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Palette className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Appearance</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">Theme</div>
                    <div className="text-sm text-muted-foreground">
                      Toggle between light and dark theme
                    </div>
                  </div>
                  <ThemeToggle />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Notifications Section */}
          <AccordionItem value="notifications" className="border rounded-lg" data-testid="section-notifications">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Bell className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">Notifications</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 pt-4">
                <NotificationSettings />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* API Usage Section */}
          <AccordionItem value="api-usage" className="border rounded-lg" data-testid="section-api-usage">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-muted-foreground" />
                <span className="font-semibold">API Usage Monitoring</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Track your Barcode Lookup API usage and quota
                </p>
                <ApiUsageSection />
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Danger Zone Section */}
          <AccordionItem value="danger-zone" className="border border-destructive/50 rounded-lg" data-testid="section-danger">
            <AccordionTrigger className="px-6 py-4 hover:no-underline text-destructive">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-semibold">Danger Zone</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 pt-4">
                <div className="p-4 border border-destructive/20 rounded-lg bg-destructive/5">
                  <h4 className="font-medium mb-2">Reset Account Data</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    This will permanently delete all your data including food items, recipes, chat history, meal plans, and preferences. You'll be able to start fresh with the onboarding process.
                  </p>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="destructive" 
                        disabled={resetMutation.isPending}
                        data-testid="button-reset-account"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {resetMutation.isPending ? "Resetting..." : "Reset Account"}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete:
                          <ul className="list-disc list-inside mt-2 space-y-1">
                            <li>All your food inventory items</li>
                            <li>All saved recipes</li>
                            <li>All chat conversations</li>
                            <li>All meal plans</li>
                            <li>All custom storage locations</li>
                            <li>All preferences and settings</li>
                          </ul>
                          <p className="mt-3 font-medium">You will be redirected to onboarding to set up your account again.</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel data-testid="button-cancel-reset">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => resetMutation.mutate()}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          data-testid="button-confirm-reset"
                        >
                          Yes, Reset My Account
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>
    </div>
  );
}

interface RateLimits {
  remaining_requests: number;
  allowed_requests: number;
  reset_time: string;
}

interface UsageStats {
  totalCalls: number;
  successfulCalls: number;
  failedCalls: number;
}

interface UsageLog {
  id: string;
  apiName: string;
  endpoint: string;
  queryParams: string;
  statusCode: number;
  success: boolean;
  timestamp: string;
}

function ApiUsageSection() {
  const { toast } = useToast();
  
  const { data: rateLimits, isLoading: limitsLoading } = useQuery<RateLimits>({
    queryKey: ["/api/barcodelookup/rate-limits"],
  });

  const { data: stats, isLoading: statsLoading } = useQuery<UsageStats>({
    queryKey: ["/api/barcodelookup/usage/stats"],
  });

  const { data: logs, isLoading: logsLoading } = useQuery<UsageLog[]>({
    queryKey: ["/api/barcodelookup/usage/logs"],
  });

  if (limitsLoading || statsLoading) {
    return <div className="text-sm text-muted-foreground">Loading usage data...</div>;
  }

  const usagePercentage = rateLimits 
    ? ((rateLimits.allowed_requests - rateLimits.remaining_requests) / rateLimits.allowed_requests) * 100
    : 0;

  const isNearLimit = usagePercentage >= 80;

  return (
    <div className="space-y-4">
      {isNearLimit && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-destructive">API Quota Warning</p>
            <p className="text-sm text-destructive/80">
              You've used {usagePercentage.toFixed(0)}% of your monthly API quota. Consider upgrading your plan or reducing usage.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="p-4 border border-border rounded-lg">
          <div className="text-sm text-muted-foreground">Remaining Requests</div>
          <div className="text-2xl font-semibold mt-1">
            {rateLimits?.remaining_requests || 0}
          </div>
        </div>
        <div className="p-4 border border-border rounded-lg">
          <div className="text-sm text-muted-foreground">Monthly Quota</div>
          <div className="text-2xl font-semibold mt-1">
            {rateLimits?.allowed_requests || 0}
          </div>
        </div>
      </div>

      {stats && (
        <div className="p-4 border border-border rounded-lg space-y-2">
          <div className="text-sm font-medium">Last 30 Days Statistics</div>
          <div className="grid grid-cols-3 gap-4 mt-2">
            <div>
              <div className="text-xs text-muted-foreground">Total Calls</div>
              <div className="text-lg font-semibold">{stats.totalCalls}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Successful</div>
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">{stats.successfulCalls}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Failed</div>
              <div className="text-lg font-semibold text-destructive">{stats.failedCalls}</div>
            </div>
          </div>
        </div>
      )}

      {logs && logs.length > 0 && (
        <div className="space-y-2">
          <div className="text-sm font-medium">Recent API Calls</div>
          <div className="border border-border rounded-lg divide-y divide-border max-h-64 overflow-y-auto">
            {logs.slice(0, 10).map((log) => (
              <div key={log.id} className="p-3 text-sm">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant={log.success ? "default" : "destructive"} className="text-xs">
                      {log.endpoint}
                    </Badge>
                    <span className="text-muted-foreground text-xs">{log.queryParams}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}