import type { StorageLocationWithCount } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";

export function useStorageLocations() {
  return useCachedQuery<StorageLocationWithCount[]>({
    queryKey: ["/api/storage-locations"],
    cacheKey: "cache:storage:locations",
  });
}
