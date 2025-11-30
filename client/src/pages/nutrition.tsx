import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Apple, Flame, Beef, Wheat, Droplet, RefreshCw, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ProgressiveSection } from "@/components/layout";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { NutritionInfo } from "@shared/schema";

type NutritionStats = {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  itemsWithNutrition: number;
  totalItems: number;
  categoryBreakdown: Record<string, { calories: number; count: number }>;
};

type NutritionItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  weightInGrams: number;
  locationName: string;
  nutrition: NutritionInfo;
};

type MissingNutritionItem = {
  id: string;
  name: string;
  quantity: string;
  unit: string | null;
  fdcId?: string | null;
  locationName: string;
};

export default function Nutrition() {
  const { toast } = useToast();
  
  const { data: stats, isLoading: statsLoading } = useQuery<NutritionStats>({
    queryKey: ["/api/nutrition/stats"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<NutritionItem[]>({
    queryKey: ["/api/nutrition/items"],
  });

  const { data: missingItems, isLoading: missingLoading } = useQuery<MissingNutritionItem[]>({
    queryKey: ["/api/nutrition/items/missing"],
  });

  const refreshNutritionMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/food-items/${itemId}/refresh-nutrition`, "POST", {});
    },
    onSuccess: (data, itemId) => {
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/stats"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/nutrition/items/missing"] });
      queryClient.invalidateQueries({ queryKey: ["/api/food-items"] });
      toast({
        title: "Nutrition data refreshed",
        description: "Successfully updated nutrition information",
      });
    },
    onError: (error: Error | unknown) => {
      toast({
        title: "Failed to refresh nutrition",
        description: error instanceof Error ? error.message : "Could not fetch nutrition data for this item",
        variant: "destructive",
      });
    },
  });

  const macroData = [
    {
      name: "Protein",
      value: stats?.totalProtein || 0,
      color: "bg-red-500",
      icon: Beef,
    },
    {
      name: "Carbs",
      value: stats?.totalCarbs || 0,
      color: "bg-yellow-500",
      icon: Wheat,
    },
    {
      name: "Fat",
      value: stats?.totalFat || 0,
      color: "bg-blue-500",
      icon: Droplet,
    },
  ];

  const totalMacros = (stats?.totalProtein || 0) + (stats?.totalCarbs || 0) + (stats?.totalFat || 0);

  return (
    <div className="h-full overflow-y-auto bg-muted">
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Apple className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Nutrition Dashboard</h1>
              <p className="text-muted-foreground">
                Track nutritional content of your inventory
              </p>
            </div>
          </div>
        </div>

        {statsLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading nutrition data...</p>
          </div>
        ) : stats?.itemsWithNutrition === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Apple className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-foreground mb-2">No nutritional data yet</h3>
              <p className="text-muted-foreground">
                Add food items from the USDA database to track nutrition
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <Card data-testid="card-total-calories">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Total Calories
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-calories">
                    {stats?.totalCalories || 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    kcal in inventory
                  </p>
                </CardContent>
              </Card>

              {macroData.map((macro) => (
                <Card key={macro.name} data-testid={`card-${macro.name.toLowerCase()}`}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <macro.icon className="w-4 h-4" />
                      {macro.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold" data-testid={`text-${macro.name.toLowerCase()}`}>
                      {macro.value}g
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {totalMacros > 0 ? `${Math.round((macro.value / totalMacros) * 100)}%` : "0%"} of macros
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <ProgressiveSection
              id="nutrition-macro-distribution"
              title="Macronutrient Distribution"
              summary="Detailed breakdown of protein, carbs, and fat"
              defaultExpanded={false}
              className="mb-6"
              testId="progressive-macro-distribution"
            >
                <div className="space-y-4">
                  <div className="flex items-center w-full h-8 rounded-lg overflow-hidden" data-testid="macro-stacked-bar">
                    {macroData.map((macro, index) => {
                      const percentage = totalMacros > 0 ? (macro.value / totalMacros) * 100 : 0;
                      return percentage > 0 ? (
                        <div
                          key={macro.name}
                          className={`h-full ${macro.color} flex items-center justify-center transition-all`}
                          style={{ width: `${percentage}%` }}
                          data-testid={`macro-segment-${macro.name.toLowerCase()}`}
                        >
                          {percentage > 10 && (
                            <span className="text-xs font-medium text-white px-1">
                              {Math.round(percentage)}%
                            </span>
                          )}
                        </div>
                      ) : null;
                    })}
                  </div>
                  
                  <div className="flex flex-wrap gap-4 pt-2">
                    {macroData.map((macro) => {
                      const percentage = totalMacros > 0 ? (macro.value / totalMacros) * 100 : 0;
                      return (
                        <div key={macro.name} className="flex items-center gap-2" data-testid={`macro-legend-${macro.name.toLowerCase()}`}>
                          <div className={`w-3 h-3 rounded-full ${macro.color}`} />
                          <span className="text-sm font-medium">{macro.name}</span>
                          <span className="text-sm text-muted-foreground">
                            {macro.value}g ({Math.round(percentage)}%)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
            </ProgressiveSection>

            <ProgressiveSection
              id="nutrition-items-detailed"
              title="Items with Nutrition Data"
              summary={`${stats?.itemsWithNutrition || 0} of ${stats?.totalItems || 0} items have nutritional information`}
              defaultExpanded={false}
              className="mb-6"
              testId="progressive-nutrition-items"
            >
                {itemsLoading ? (
                  <p className="text-muted-foreground text-center py-4">Loading items...</p>
                ) : !items || items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No items with nutrition data</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => {
                      const servingSize = parseFloat(item.nutrition?.servingSize || "100") || 100;
                      const multiplier = item.weightInGrams / servingSize;
                      const protein = (item.nutrition?.protein || 0) * multiplier;
                      const carbs = (item.nutrition?.carbohydrates || 0) * multiplier;
                      const fat = (item.nutrition?.fat || 0) * multiplier;
                      const itemTotalMacros = protein + carbs + fat;
                      
                      return (
                        <div
                          key={item.id}
                          className="p-3 border border-border rounded-lg hover-elevate"
                          data-testid={`nutrition-item-${item.id}`}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit || ""} • {item.locationName}
                              </div>
                            </div>
                            <Badge variant="secondary">
                              <Flame className="w-3 h-3 mr-1" />
                              {Math.round((item.nutrition?.calories || 0) * multiplier)} kcal
                            </Badge>
                          </div>
                          
                          {itemTotalMacros > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center w-full h-6 rounded overflow-hidden" data-testid={`item-macro-bar-${item.id}`}>
                                {protein > 0 && (
                                  <div
                                    className="h-full bg-red-500 flex items-center justify-center"
                                    style={{ width: `${(protein / itemTotalMacros) * 100}%` }}
                                  >
                                    {(protein / itemTotalMacros) * 100 > 15 && (
                                      <span className="text-xs font-medium text-white px-1">
                                        P: {Math.round(protein * 10) / 10}g
                                      </span>
                                    )}
                                  </div>
                                )}
                                {carbs > 0 && (
                                  <div
                                    className="h-full bg-yellow-500 flex items-center justify-center"
                                    style={{ width: `${(carbs / itemTotalMacros) * 100}%` }}
                                  >
                                    {(carbs / itemTotalMacros) * 100 > 15 && (
                                      <span className="text-xs font-medium text-white px-1">
                                        C: {Math.round(carbs * 10) / 10}g
                                      </span>
                                    )}
                                  </div>
                                )}
                                {fat > 0 && (
                                  <div
                                    className="h-full bg-blue-500 flex items-center justify-center"
                                    style={{ width: `${(fat / itemTotalMacros) * 100}%` }}
                                  >
                                    {(fat / itemTotalMacros) * 100 > 15 && (
                                      <span className="text-xs font-medium text-white px-1">
                                        F: {Math.round(fat * 10) / 10}g
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex gap-3 text-xs text-muted-foreground">
                                <span>P: {Math.round(protein * 10) / 10}g</span>
                                <span>C: {Math.round(carbs * 10) / 10}g</span>
                                <span>F: {Math.round(fat * 10) / 10}g</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
            </ProgressiveSection>

            {missingItems && missingItems.length > 0 && (
              <ProgressiveSection
                id="nutrition-missing-items"
                title="⚠️ Items Missing Nutrition Data"
                summary={`${missingItems.length} item${missingItems.length !== 1 ? 's' : ''} need nutrition information`}
                defaultExpanded={false}
                className="mb-6"
                testId="progressive-missing-items"
              >
                  {missingLoading ? (
                    <p className="text-muted-foreground text-center py-4">Loading...</p>
                  ) : (
                    <>
                      <Alert className="mb-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          Click "Refresh Nutrition" to automatically fetch nutritional data from the USDA database.
                        </AlertDescription>
                      </Alert>
                      <div className="space-y-3">
                        {missingItems.map((item) => (
                          <div
                            key={item.id}
                            className="p-3 border border-border rounded-lg flex items-center justify-between"
                            data-testid={`missing-nutrition-item-${item.id}`}
                          >
                            <div className="flex-1">
                              <div className="font-medium">{item.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {item.quantity} {item.unit || ""} • {item.locationName}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => refreshNutritionMutation.mutate(item.id)}
                              disabled={refreshNutritionMutation.isPending}
                              data-testid={`button-refresh-${item.id}`}
                            >
                              <RefreshCw className={`w-4 h-4 mr-2 ${refreshNutritionMutation.isPending ? 'animate-spin' : ''}`} />
                              Refresh Nutrition
                            </Button>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
              </ProgressiveSection>
            )}
          </>
        )}
      </div>
    </div>
  );
}
