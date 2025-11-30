import { useLocation } from "wouter";
import { Loader2 } from "lucide-react";
import {
  NutritionSkeleton,
  MealPlannerSkeleton,
  RecipeListSkeleton,
  ShoppingListSkeleton,
  StorageSkeleton,
  GridSkeleton,
  CardSkeleton
} from "./skeletons";

export function RouteLoading() {
  const [location] = useLocation();

  // Show specific skeleton based on the route
  if (location.includes("/nutrition")) {
    return <div className="p-6"><NutritionSkeleton /></div>;
  }
  
  if (location.includes("/meal-planner")) {
    return <div className="p-6"><MealPlannerSkeleton /></div>;
  }
  
  if (location.includes("/cookbook")) {
    return <div className="p-6"><RecipeListSkeleton /></div>;
  }
  
  if (location.includes("/shopping-list")) {
    return <div className="p-6"><ShoppingListSkeleton /></div>;
  }
  
  if (location.includes("/storage")) {
    return <div className="p-6"><StorageSkeleton /></div>;
  }
  
  if (location.includes("/food-groups") || location.includes("/appliances")) {
    return <div className="p-6"><GridSkeleton /></div>;
  }

  // Default loading spinner for other routes
  return (
    <div className="flex items-center justify-center min-h-[400px] w-full">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}