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
import { X, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User, UserPreferences } from "@shared/schema";

const dietaryOptions = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free", 
  "Keto", "Paleo", "Low-Carb", "Halal", "Kosher"
];

const allergenOptions = [
  "Peanuts", "Tree Nuts", "Shellfish", "Fish", 
  "Eggs", "Milk", "Soy", "Wheat", "Sesame"
];

const preferenceSchema = z.object({
  dietaryRestrictions: z.array(z.string()).optional(),
  allergens: z.array(z.string()).optional(),
  expirationAlertDays: z.number().int().min(1).max(14),
});

export default function Settings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDietary, setSelectedDietary] = useState<string[]>([]);
  const [selectedAllergens, setSelectedAllergens] = useState<string[]>([]);

  const { data: preferences } = useQuery<UserPreferences>({
    queryKey: ["/api/user/preferences"],
  });

  const form = useForm<z.infer<typeof preferenceSchema>>({
    resolver: zodResolver(preferenceSchema),
    defaultValues: {
      dietaryRestrictions: [] as string[],
      allergens: [] as string[],
      expirationAlertDays: 3,
    },
  });

  useEffect(() => {
    if (preferences) {
      const dietary = preferences.dietaryRestrictions || [];
      const allergens = preferences.allergens || [];
      setSelectedDietary(dietary);
      setSelectedAllergens(allergens);
      form.reset({
        dietaryRestrictions: dietary,
        allergens: allergens,
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
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
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
