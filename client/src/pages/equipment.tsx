import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Search, ChefHat, Utensils, Package2, Home, Check, Plus, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { ApplianceLibrary, UserAppliance } from "@shared/schema";

const CATEGORIES = [
  { value: "appliance", label: "Appliances", icon: Home },
  { value: "cookware", label: "Cookware", icon: Package2 },
  { value: "bakeware", label: "Bakeware", icon: ChefHat },
  { value: "utensil", label: "Utensils", icon: Utensils },
];

export default function Equipment() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState("appliance");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch appliance library
  const { data: library, isLoading: libraryLoading } = useQuery({
    queryKey: ["/api/appliance-library", selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("category", selectedCategory);
      return fetch(`/api/appliance-library?${params}`).then(res => res.json()) as Promise<ApplianceLibrary[]>;
    },
  });

  // Fetch user's current appliances
  const { data: userAppliances, isLoading: userAppliancesLoading } = useQuery<UserAppliance[]>({
    queryKey: ["/api/user-appliances"],
  });

  // Initialize selected items from user's current appliances
  useEffect(() => {
    if (userAppliances) {
      const userApplianceIds = new Set(
        userAppliances
          .map((ua: UserAppliance) => ua.applianceLibraryId)
          .filter((id): id is string => id !== null)
      );
      setSelectedItems(userApplianceIds);
    }
  }, [userAppliances]);

  // Batch update mutation
  const batchUpdateMutation = useMutation({
    mutationFn: async (data: { add: string[]; remove: string[] }) => {
      return apiRequest("POST", "/api/user-appliances/batch", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user-appliances"] });
      queryClient.invalidateQueries({ queryKey: ["/api/recipes"] });
      toast({
        title: "Success",
        description: "Your equipment has been updated",
      });
      setHasChanges(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update equipment. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle item selection
  const handleItemToggle = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
    setHasChanges(true);
  };

  // Save changes
  const handleSaveChanges = () => {
    const userApplianceIds = new Set(
      userAppliances
        ?.map((ua: UserAppliance) => ua.applianceLibraryId)
        .filter((id): id is string => id !== null) || []
    );
    
    const toAdd: string[] = [];
    const toRemove: string[] = [];
    
    // Find items to add
    selectedItems.forEach(id => {
      if (!userApplianceIds.has(id)) {
        toAdd.push(id);
      }
    });
    
    // Find items to remove
    userApplianceIds.forEach(id => {
      if (!selectedItems.has(id)) {
        // We need to find the actual user appliance ID to remove
        const userAppliance = userAppliances?.find((ua: UserAppliance) => ua.applianceLibraryId === id);
        if (userAppliance) {
          toRemove.push(userAppliance.id);
        }
      }
    });
    
    if (toAdd.length > 0 || toRemove.length > 0) {
      batchUpdateMutation.mutate({ add: toAdd, remove: toRemove });
    }
  };

  // Filter library items based on search
  const filteredLibrary = library?.filter(item => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      item.name.toLowerCase().includes(query) ||
      item.description?.toLowerCase().includes(query) ||
      item.subcategory?.toLowerCase().includes(query)
    );
  });

  // Group items by subcategory
  const groupedItems = filteredLibrary?.reduce((acc, item) => {
    const subcategory = item.subcategory || "Other";
    if (!acc[subcategory]) {
      acc[subcategory] = [];
    }
    acc[subcategory].push(item);
    return acc;
  }, {} as Record<string, ApplianceLibrary[]>);

  const isLoading = libraryLoading || userAppliancesLoading;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-6xl mx-auto">
        <CardHeader>
          <CardTitle className="text-2xl" data-testid="text-equipment-title">
            My Kitchen Equipment
          </CardTitle>
          <CardDescription>
            Select the appliances, cookware, bakeware, and utensils you have available. This helps us suggest recipes tailored to your kitchen.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search Bar */}
          <div className="relative mb-6">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search equipment..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8"
              data-testid="input-search-equipment"
            />
          </div>

          {/* Category Tabs */}
          <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
            <TabsList className="grid w-full grid-cols-4">
              {CATEGORIES.map(category => {
                const Icon = category.icon;
                return (
                  <TabsTrigger 
                    key={category.value} 
                    value={category.value}
                    data-testid={`tab-${category.value}`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {category.label}
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {CATEGORIES.map(category => (
              <TabsContent key={category.value} value={category.value}>
                <ScrollArea className="h-[500px] pr-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">Loading equipment...</p>
                    </div>
                  ) : !groupedItems || Object.keys(groupedItems).length === 0 ? (
                    <div className="flex items-center justify-center h-40">
                      <p className="text-muted-foreground">
                        {searchQuery ? "No equipment found matching your search." : "No equipment available in this category."}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {Object.entries(groupedItems).map(([subcategory, items]) => (
                        <div key={subcategory}>
                          <h3 className="font-semibold text-sm text-muted-foreground mb-3">
                            {subcategory}
                          </h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {items.map(item => (
                              <div
                                key={item.id}
                                className="flex items-start space-x-3 p-3 rounded-lg border hover-elevate cursor-pointer"
                                onClick={() => handleItemToggle(item.id)}
                                data-testid={`equipment-item-${item.id}`}
                              >
                                <Checkbox
                                  checked={selectedItems.has(item.id)}
                                  onCheckedChange={() => handleItemToggle(item.id)}
                                  onClick={(e) => e.stopPropagation()}
                                  data-testid={`checkbox-${item.id}`}
                                />
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium text-sm">{item.name}</p>
                                    {item.isCommon && (
                                      <Badge variant="secondary" className="text-xs">Common</Badge>
                                    )}
                                  </div>
                                  {item.description && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {item.description}
                                    </p>
                                  )}
                                  {item.sizeOrCapacity && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Size: {item.sizeOrCapacity}
                                    </p>
                                  )}
                                  {item.material && (
                                    <p className="text-xs text-muted-foreground">
                                      Material: {item.material}
                                    </p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
            ))}
          </Tabs>

          {/* Action Buttons */}
          <div className="flex items-center justify-between mt-6 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              {selectedItems.size} items selected
              {hasChanges && (
                <Badge variant="secondary" className="ml-2">Unsaved changes</Badge>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/")}
                data-testid="button-cancel"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveChanges}
                disabled={!hasChanges || batchUpdateMutation.isPending}
                data-testid="button-save"
              >
                {batchUpdateMutation.isPending ? (
                  <>Saving...</>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}