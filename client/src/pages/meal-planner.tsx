import { useState, useMemo, useRef, useCallback, useEffect, startTransition } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Calendar1,
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { MealPlan, Recipe, InsertMealPlan } from "@shared/schema";

type MealType = "breakfast" | "lunch" | "dinner" | "snack";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack"];

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

type ViewMode = "day" | "week";

export default function MealPlanner() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth < 768 ? "day" : "week";
    }
    return "week";
  });
  const [currentDate, setCurrentDate] = useState(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today;
  });
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
  
  // Modal state for adding meals
  const [isAddMealOpen, setIsAddMealOpen] = useState(false);
  const [selectedMealSlot, setSelectedMealSlot] = useState<{
    date: string;
    mealType: MealType;
  } | null>(null);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>("");
  const [servings, setServings] = useState<number>(1);

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

  const startDate =
    viewMode === "day"
      ? currentDate.toLocaleDateString("en-CA")
      : weekDates[0].toLocaleDateString("en-CA");
  const endDate =
    viewMode === "day"
      ? currentDate.toLocaleDateString("en-CA")
      : weekDates[6].toLocaleDateString("en-CA");

  // Fetch meal plans for the current view
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
  
  // Create meal plan mutation
  const createMealPlanMutation = useMutation({
    mutationFn: async (mealPlan: Omit<InsertMealPlan, "userId">) => {
      return await apiRequest("POST", "/api/meal-plans", mealPlan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/meal-plans"] });
      setIsAddMealOpen(false);
      setSelectedRecipeId("");
      setServings(1);
      toast({
        title: "Meal added",
        description: "Meal has been added to your plan",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add meal. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Handler for opening the add meal modal
  const openAddMealModal = (date: Date, mealType: MealType) => {
    const dateStr = date.toLocaleDateString("en-CA");
    startTransition(() => {
      setSelectedMealSlot({ date: dateStr, mealType });
      setIsAddMealOpen(true);
    });
  };
  
  // Handler for adding a meal
  const handleAddMeal = () => {
    if (!selectedMealSlot || !selectedRecipeId) return;
    
    createMealPlanMutation.mutate({
      date: selectedMealSlot.date,
      mealType: selectedMealSlot.mealType,
      recipeId: selectedRecipeId,
      servings,
    });
  };

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
    setCurrentDate(today);
    const day = today.getDay();
    const diff = today.getDate() - day;
    const weekStart = new Date(today);
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);
    setCurrentWeekStart(weekStart);
  };

  // Day view navigation
  const goToPreviousDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 1);
    newDate.setHours(0, 0, 0, 0);
    setCurrentDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 1);
    newDate.setHours(0, 0, 0, 0);
    setCurrentDate(newDate);
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

  const dayMonthYear = currentDate.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Responsive view handling
  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth < 768;
      if (isMobile && viewMode === "week") {
        setViewMode("day");
      } else if (!isMobile && viewMode === "day") {
        setViewMode("week");
      }
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [viewMode]);

  // Swipe gesture handling for Day view
  const touchStartX = useRef<number>(0);
  const touchEndX = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchEndX.current = e.touches[0].clientX;
  }, []);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    const swipeThreshold = 50;
    // Use changedTouches for touchEnd, fallback to touchEndX or touchStartX
    const finalX = e.changedTouches[0]?.clientX ?? touchEndX.current ?? touchStartX.current;
    const swipeDistance = touchStartX.current - finalX;

    if (Math.abs(swipeDistance) > swipeThreshold) {
      if (swipeDistance > 0) {
        // Swiped left - go to next day
        goToNextDay();
      } else {
        // Swiped right - go to previous day
        goToPreviousDay();
      }
    }

    // Reset touch refs
    touchStartX.current = 0;
    touchEndX.current = 0;
  }, [goToNextDay, goToPreviousDay]);

  return (
    <div className="h-full overflow-y-auto bg-muted">
      <div className="max-w-4xl mx-auto p-6">
        <div className="mb-6">
          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Calendar1 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">
                  Meal Planner
                </h1>
                <p className="text-muted-foreground mt-1">
                  Plan your meals {viewMode === "day" ? "for the day" : "for the week"}
                </p>
              </div>
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
            </div>
          </div>

          {/* View Switcher */}
          <div className="flex items-center justify-between gap-4 mb-4">
            <div className="inline-flex rounded-md border border-border bg-card p-1">
              <Button
                variant={viewMode === "day" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("day")}
                data-testid="button-view-day"
                className="px-4"
              >
                Day
              </Button>
              <Button
                variant={viewMode === "week" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("week")}
                data-testid="button-view-week"
                className="px-4"
              >
                Week
              </Button>
            </div>

            {/* Navigation */}
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={viewMode === "day" ? goToPreviousDay : goToPreviousWeek}
                data-testid={viewMode === "day" ? "button-prev-day" : "button-prev-week"}
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <div
                className="text-sm font-medium min-w-[150px] text-center"
                data-testid="text-date-display"
              >
                {viewMode === "day" ? dayMonthYear : monthYear}
              </div>
              <Button
                variant="outline"
                size="icon"
                onClick={viewMode === "day" ? goToNextDay : goToNextWeek}
                data-testid={viewMode === "day" ? "button-next-day" : "button-next-week"}
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Calendar Grid */}
          <Card className="flex-1 overflow-hidden">
            <CardContent className="p-0 h-full">
              {mealPlansLoading ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="text-muted-foreground">
                    Loading meal plans...
                  </div>
                </div>
              ) : viewMode === "day" ? (
                <div
                  className="p-4 space-y-4"
                  onTouchStart={handleTouchStart}
                  onTouchMove={handleTouchMove}
                  onTouchEnd={handleTouchEnd}
                >
                  {MEAL_TYPES.map((mealType) => {
                    const mealPlan = getMealPlan(currentDate, mealType);
                    const recipe = getRecipe(mealPlan);

                    return (
                      <div key={mealType} data-testid={`day-meal-${mealType}`}>
                        <h3 className="text-sm font-semibold mb-2 text-muted-foreground">
                          {MEAL_TYPE_LABELS[mealType]}
                        </h3>
                        {recipe && mealPlan ? (
                          <Card className="hover-elevate cursor-pointer">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between gap-3">
                                <CardTitle className="text-base font-medium">
                                  {recipe.title}
                                </CardTitle>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteMealPlanMutation.mutate(mealPlan.id);
                                  }}
                                  data-testid={`button-remove-${mealPlan.id}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </div>
                            </CardHeader>
                            <CardContent className="pt-0">
                              <div className="text-sm text-muted-foreground">
                                {mealPlan.servings}{" "}
                                {mealPlan.servings === 1 ? "serving" : "servings"}
                              </div>
                            </CardContent>
                          </Card>
                        ) : (
                          <button
                            className="w-full p-6 flex items-center justify-center hover-elevate rounded-md border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors"
                            onClick={() => openAddMealModal(currentDate, mealType)}
                            data-testid={`button-add-meal-${mealType}`}
                          >
                            <span className="text-sm text-muted-foreground">
                              + Add meal
                            </span>
                          </button>
                        )}
                      </div>
                    );
                  })}
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
                                    onClick={() => openAddMealModal(date, mealType)}
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
      
      {/* Add Meal Modal */}
      <Dialog open={isAddMealOpen} onOpenChange={setIsAddMealOpen}>
        <DialogContent className="max-w-md" data-testid="modal-add-meal">
          <DialogHeader>
            <DialogTitle>Add Meal</DialogTitle>
            <DialogDescription>
              Choose a recipe from your cookbook to schedule for{" "}
              {selectedMealSlot && (
                <>
                  {MEAL_TYPE_LABELS[selectedMealSlot.mealType]} on{" "}
                  {new Date(selectedMealSlot.date + "T12:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                  })}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="recipe">Recipe</Label>
              <Select
                value={selectedRecipeId}
                onValueChange={setSelectedRecipeId}
              >
                <SelectTrigger id="recipe" data-testid="select-recipe">
                  <SelectValue placeholder="Select a recipe" />
                </SelectTrigger>
                <SelectContent>
                  {recipes.length === 0 ? (
                    <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                      No recipes available. Create recipes in the cookbook first.
                    </div>
                  ) : (
                    recipes.map((recipe) => (
                      <SelectItem key={recipe.id} value={recipe.id}>
                        {recipe.title}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="servings">Servings</Label>
              <Input
                id="servings"
                type="number"
                min="1"
                value={servings}
                onChange={(e) => setServings(Math.max(1, parseInt(e.target.value) || 1))}
                data-testid="input-servings"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsAddMealOpen(false)}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddMeal}
              disabled={!selectedRecipeId || createMealPlanMutation.isPending}
              data-testid="button-confirm-add"
            >
              {createMealPlanMutation.isPending ? "Adding..." : "Add Meal"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
