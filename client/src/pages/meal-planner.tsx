import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Calendar1,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MealPlan, Recipe } from "@shared/schema";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export default function MealPlanner() {
  const { toast } = useToast();
  const [currentWeekStart, setCurrentWeekStart] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = today.getDate() - day; // Sunday as start of week
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    return weekStart;
  });

  // Calculate week dates
  const weekDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(currentWeekStart);
      date.setDate(currentWeekStart.getDate() + i);
      date.setHours(0, 0, 0, 0);
      dates.push(date);
    }
    return dates;
  }, [currentWeekStart]);

  const startDate = weekDates[0].toLocaleDateString("en-CA"); // YYYY-MM-DD format, timezone-safe
  const endDate = weekDates[6].toLocaleDateString("en-CA");

  // Fetch meal plans for the week
  const { data: mealPlans = [], isLoading: mealPlansLoading } = useQuery<
    MealPlan[]
  >({
    queryKey: ["/api/meal-plans", { startDate, endDate }],
    queryFn: async () => {
      const response = await fetch(
        `/api/meal-plans?startDate=${startDate}&endDate=${endDate}`,
      );
      if (!response.ok) throw new Error("Failed to fetch meal plans");
      return response.json();
    },
  });

  // Fetch all recipes
  const { data: recipes = [] } = useQuery<Recipe[]>({
    queryKey: ["/api/recipes"],
  });

  // Delete meal plan mutation
  const deleteMealPlanMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/meal-plans/${id}`, null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      toast({
        title: "Meal removed",
        description: "Meal plan removed from calendar",
      });
    },
  });

  // Navigation
  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    newDate.setHours(0, 0, 0, 0);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    newDate.setHours(0, 0, 0, 0);
    setCurrentWeekStart(newDate);
  };

  const goToToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const day = today.getDay();
    const diff = today.getDate() - day;
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    setCurrentWeekStart(weekStart);
  };

  // Get meal plan for specific date and meal type
  const getMealPlan = (date: Date, mealType: MealType) => {
    const dateStr = date.toLocaleDateString("en-CA"); // YYYY-MM-DD format, timezone-safe
    return mealPlans.find(
      (plan) => plan.date === dateStr && plan.mealType === mealType,
    );
  };

  // Get recipe for meal plan
  const getRecipe = (mealPlan: MealPlan | undefined) => {
    if (!mealPlan) return null;
    return recipes.find((r) => r.id === mealPlan.recipeId);
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();
    const dayName = date.toLocaleDateString("en-US", { weekday: "short" });
    const monthDay = date.getDate();

    return { dayName, monthDay, isToday };
  };

  const monthYear = weekDates[0].toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar1 className="w-6 h-6 text-primary" />
              </div>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Meal Planner
              </h1>
              <p className="text-muted-foreground mt-1">
                Plan your meals for the week
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                data-testid="button-today"
              >
                <CalendarIcon className="w-4 h-4 mr-2" />
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={goToPreviousWeek}
                data-testid="button-prev-week"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div
                className="text-sm font-medium min-w-[150px] text-center"
                data-testid="text-month-year"
              >
                {monthYear}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={goToNextWeek}
                data-testid="button-next-week"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              {mealPlansLoading ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-muted-foreground">
                    Loading meal plans...
                  </div>
                </div>
              ) : (
                <div className="h-full overflow-auto">
                  <table className="w-full border-collapse">
                    <thead className="bg-muted/30 sticky top-0 z-10">
                      <tr>
                        <th className="border-r border-border p-3 text-left w-32">
                          <span className="text-sm font-semibold">
                            Meal Type
                          </span>
                        </th>
                        {weekDates.map((date, i) => {
                          const { dayName, monthDay, isToday } =
                            formatDate(date);
                          return (
                            <th
                              key={i}
                              className="border-r border-border p-3 text-center min-w-[140px]"
                            >
                              <div className="flex flex-col items-center">
                                <span className="text-xs text-muted-foreground">
                                  {dayName}
                                </span>
                                <span
                                  className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}
                                >
                                  {monthDay}
                                </span>
                                {isToday && (
                                  <Badge
                                    variant="default"
                                    className="mt-1 text-xs"
                                  >
                                    Today
                                  </Badge>
                                )}
                              </div>
                            </th>
                          );
                        })}
                      </tr>
                    </thead>
                    <tbody>
                      {MEAL_TYPES.map((mealType) => (
                        <tr key={mealType} className="border-t border-border">
                          <td className="border-r border-border p-3 bg-muted/10 font-medium text-sm">
                            {MEAL_TYPE_LABELS[mealType]}
                          </td>
                          {weekDates.map((date, i) => {
                            const mealPlan = getMealPlan(date, mealType);
                            const recipe = getRecipe(mealPlan);

                            return (
                              <td
                                key={i}
                                className="border-r border-border p-2 align-top h-28"
                                data-testid={`cell-${mealType}-${i}`}
                              >
                                {recipe && mealPlan ? (
                                  <div className="relative h-full">
                                    <Card className="h-full hover-elevate cursor-pointer">
                                      <CardHeader className="p-3 pb-2">
                                        <div className="flex items-start justify-between gap-2">
                                          <CardTitle className="text-sm font-medium line-clamp-2">
                                            {recipe.title}
                                          </CardTitle>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 flex-shrink-0"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteMealPlanMutation.mutate(
                                                mealPlan.id,
                                              );
                                            }}
                                            data-testid={`button-remove-${mealPlan.id}`}
                                          >
                                            <X className="w-3 h-3" />
                                          </Button>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="p-3 pt-0">
                                        <div className="text-xs text-muted-foreground">
                                          {mealPlan.servings}{" "}
                                          {mealPlan.servings === 1
                                            ? "serving"
                                            : "servings"}
                                        </div>
                                      </CardContent>
                                    </Card>
                                  </div>
                                ) : (
                                  <button
                                    className="h-full w-full flex items-center justify-center hover-elevate rounded-md border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors"
                                    onClick={() => {
                                      toast({
                                        title: "Recipe scheduling",
                                        description:
                                          "Schedule recipes from the cookbook page. This feature will be enhanced soon!",
                                      });
                                    }}
                                    data-testid={`button-add-meal-${mealType}-${i}`}
                                  >
                                    <span className="text-xs text-muted-foreground">
                                      + Add meal
                                    </span>
                                  </button>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Summary */}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div data-testid="text-meals-planned">
              {mealPlans.length} {mealPlans.length === 1 ? "meal" : "meals"}{" "}
              planned this week
            </div>
            <Button
              variant="outline"
              onClick={() => {
                // TODO: Navigate to shopping list
                toast({
                  title: "Coming soon",
                  description: "Shopping list feature will be implemented next",
                });
              }}
              data-testid="button-view-shopping-list"
            >
              View Shopping List
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
