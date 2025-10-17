import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { queryClient } from "@/lib/queryClient";
import type { User, UserPreferences, StorageLocation, FoodItem, Recipe } from "@shared/schema";

interface InitialData {
  user: User;
  preferences: UserPreferences;
  storageLocations: StorageLocation[];
  foodItems: FoodItem[];
  recipes: Recipe[];
}

export function useInitialData(enabled = true) {
  const query = useQuery<InitialData>({
    queryKey: ["/api/init"],
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes (gcTime in TanStack Query v5)
    enabled,
    retry: 1, // Only retry once for initial data
    refetchOnWindowFocus: false, // Don't refetch on window focus
  });

  // When we get the batch data, populate individual query caches
  // This allows components using individual queries to work without refetching
  useEffect(() => {
    if (query.data && query.isSuccess) {
      // Populate individual caches with the batch data
      queryClient.setQueryData(["/api/auth/user"], query.data.user);
      queryClient.setQueryData(["/api/user/preferences"], query.data.preferences);
      queryClient.setQueryData(["/api/storage-locations"], query.data.storageLocations);
      queryClient.setQueryData(["/api/food-items"], query.data.foodItems);
      queryClient.setQueryData(["/api/recipes"], query.data.recipes);
    }
  }, [query.data, query.isSuccess]);

  return query;
}