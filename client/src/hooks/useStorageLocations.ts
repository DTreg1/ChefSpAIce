import type { StorageLocationWithCount } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";
import { useAuth } from "./useAuth";

export function useStorageLocations() {
  const { isLoading, isAuthenticated } = useAuth();
  
  return useCachedQuery<StorageLocationWithCount[]>({
    queryKey: ["/api/storage-locations"],
    cacheKey: "cache:storage:locations",
    // Only fetch when auth check is complete and user is authenticated
    enabled: !isLoading && isAuthenticated,
  });
}
