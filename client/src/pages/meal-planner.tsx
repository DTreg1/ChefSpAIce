import { useState, useMemo, useRef, useCallback, useEffect } from "react";
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
  Settings2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ProgressiveSection } from "@/components/progressive-section";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MealPlan, Recipe } from "@shared/schema";

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
  const [generatingShoppingList, setGeneratingShoppingList] = useState(false);

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

  // Generate shopping list from meal plans
  const generateShoppingList = async () => {
    if (generatingShoppingList) return;
    
    setGeneratingShoppingList(true);
    
    // Calculate the date range to use
    const rangeStartDate = weekDates[0].toLocaleDateString("en-CA");
    const rangeEndDate = weekDates[6].toLocaleDateString("en-CA");
    
    // Show initial toast
    const { dismiss } = toast({
      title: "Generating Shopping List",
      description: "Starting to process meal plans...",
      duration: Infinity, // Keep it open
    });
    
    try {
      const response = await fetch("/api/shopping-list/generate-from-meal-plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          startDate: rangeStartDate, 
          endDate: rangeEndDate 
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate shopping list");
      }
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) {
        throw new Error("Response body is not readable");
      }
      
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              
              if (data.error) {
                dismiss();
                toast({
                  title: "Error",
                  description: data.message || "Failed to generate shopping list",
                  variant: "destructive",
                });
                setGeneratingShoppingList(false);
                return;
              }
              
              // Update progress toast
              dismiss();
              const progressToast = toast({
                title: "Generating Shopping List",
                description: data.message,
                duration: data.progress === 100 ? 5000 : Infinity,
              });
              
              if (data.progress === 100) {
                // Complete - invalidate queries and navigate
                await queryClient.invalidateQueries({ 
                  queryKey: ["/api/shopping-list/items"] 
                });
                
                // Show completion toast
                setTimeout(() => {
                  progressToast.dismiss();
                  toast({
                    title: "✅ Shopping List Generated!",
                    description: `Added ${data.data?.itemsAdded || 0} items to your shopping list`,
                    duration: 5000,
                  });
                }, 1000);
                
                // Navigate to shopping list after a short delay
                setTimeout(() => {
                  window.location.href = "/shopping-list";
                }, 2000);
              }
            } catch (e) {
              console.error("Failed to parse SSE data:", e);
            }
          }
        }
      }
    } catch (error) {
      dismiss();
      console.error("Error generating shopping list:", error);
      toast({
        title: "Error",
        description: "Failed to generate shopping list. Please try again.",
        variant: "destructive",
      });
    } finally {
      setGeneratingShoppingList(false);
    }
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
                              <div className="text-sm text-muted-foreground mb-2">
                                {mealPlan.servings}{" "}
                                {mealPlan.servings === 1 ? "serving" : "servings"}
                              </div>
                              <ProgressiveSection
                                id={`meal-serving-${mealPlan.id}`}
                                title="Customize Servings"
                                defaultExpanded={false}
                                className="mt-2"
                                size="sm"
                                showLabel={false}
                                icon="settings"
                                testId={`progressive-servings-${mealPlan.id}`}
                              >
                                <div className="space-y-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`servings-${mealPlan.id}`} className="text-xs">
                                      Servings:
                                    </Label>
                                    <Input
                                      id={`servings-${mealPlan.id}`}
                                      type="number"
                                      min="1"
                                      max="10"
                                      defaultValue={mealPlan.servings}
                                      className="w-20 h-8 text-sm"
                                      data-testid={`input-servings-${mealPlan.id}`}
                                    />
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toast({
                                          title: "Coming soon",
                                          description: "Serving adjustment will be implemented soon",
                                        });
                                      }}
                                      data-testid={`button-update-servings-${mealPlan.id}`}
                                    >
                                      Update
                                    </Button>
                                  </div>
                                </div>
                              </ProgressiveSection>
                            </CardContent>
                          </Card>
                        ) : (
                          <button
                            className="w-full p-6 flex items-center justify-center hover-elevate rounded-md border-2 border-dashed border-border/50 hover:border-primary/50 transition-colors"
                            onClick={() => {
                              toast({
                                title: "Recipe scheduling",
                                description:
                                  "Schedule recipes from the cookbook page. This feature will be enhanced soon!",
                              });
                            }}
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
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div data-testid="text-meals-planned">
                {mealPlans.length} {mealPlans.length === 1 ? "meal" : "meals"}{" "}
                planned this week
              </div>
              <Button
                variant="outline"
                onClick={() => generateShoppingList()}
                disabled={generatingShoppingList || mealPlans.length === 0}
                data-testid="button-generate-shopping-list"
              >
                {generatingShoppingList ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Generating...
                  </>
                ) : (
                  "Generate Shopping List"
                )}
              </Button>
            </div>
            
            <ProgressiveSection
              id="meal-planner-bulk-actions"
              title="Bulk Actions"
              summary="Advanced planning options and batch operations"
              defaultExpanded={false}
              icon="settings"
              testId="progressive-bulk-actions"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "Batch meal duplication feature will be added",
                    });
                  }}
                  data-testid="button-duplicate-week"
                  className="justify-start"
                >
                  <Calendar1 className="w-4 h-4 mr-2" />
                  Duplicate This Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "Clear all meals for the week",
                    });
                  }}
                  data-testid="button-clear-week"
                  className="justify-start"
                >
                  <X className="w-4 h-4 mr-2" />
                  Clear Week
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "Export meal plan as PDF or calendar file",
                    });
                  }}
                  data-testid="button-export-plan"
                  className="justify-start"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Export Plan
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Coming soon",
                      description: "Auto-generate meal plan based on preferences",
                    });
                  }}
                  data-testid="button-auto-plan"
                  className="justify-start"
                >
                  <Settings2 className="w-4 h-4 mr-2" />
                  Auto-Plan Meals
                </Button>
              </div>
            </ProgressiveSection>
          </div>
        </div>
      </div>
    </div>
  );
}
