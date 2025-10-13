import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Apple, Flame, Beef, Wheat, Droplet } from "lucide-react";
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
  locationName: string;
  nutrition: NutritionInfo;
};

export default function Nutrition() {
  const { data: stats, isLoading: statsLoading } = useQuery<NutritionStats>({
    queryKey: ["/api/nutrition/stats"],
  });

  const { data: items, isLoading: itemsLoading } = useQuery<NutritionItem[]>({
    queryKey: ["/api/nutrition/items"],
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

            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Macronutrient Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {macroData.map((macro) => {
                    const percentage = totalMacros > 0 ? (macro.value / totalMacros) * 100 : 0;
                    return (
                      <div key={macro.name} data-testid={`macro-bar-${macro.name.toLowerCase()}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${macro.color}`} />
                            <span className="text-sm font-medium">{macro.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {macro.value}g ({Math.round(percentage)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${macro.color}`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Items with Nutrition Data</CardTitle>
                <p className="text-sm text-muted-foreground">
                  {stats?.itemsWithNutrition || 0} of {stats?.totalItems || 0} items have nutritional information
                </p>
              </CardHeader>
              <CardContent>
                {itemsLoading ? (
                  <p className="text-muted-foreground text-center py-4">Loading items...</p>
                ) : !items || items.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No items with nutrition data</p>
                ) : (
                  <div className="space-y-3">
                    {items.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-3 border border-border rounded-lg hover-elevate"
                        data-testid={`nutrition-item-${item.id}`}
                      >
                        <div className="flex-1">
                          <div className="font-medium">{item.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {item.quantity} {item.unit || ""} • {item.locationName}
                          </div>
                        </div>
                        <div className="flex gap-2 flex-wrap justify-end">
                          <Badge variant="secondary">
                            <Flame className="w-3 h-3 mr-1" />
                            {Math.round(item.nutrition.calories * (parseFloat(item.quantity) || 1) / 100)} kcal
                          </Badge>
                          <Badge variant="outline">
                            P: {Math.round(item.nutrition.protein * (parseFloat(item.quantity) || 1) / 100 * 10) / 10}g
                          </Badge>
                          <Badge variant="outline">
                            C: {Math.round(item.nutrition.carbs * (parseFloat(item.quantity) || 1) / 100 * 10) / 10}g
                          </Badge>
                          <Badge variant="outline">
                            F: {Math.round(item.nutrition.fat * (parseFloat(item.quantity) || 1) / 100 * 10) / 10}g
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
