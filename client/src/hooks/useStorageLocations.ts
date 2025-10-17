import type { StorageLocation } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";

export function useStorageLocations(enabled = true) {
  return useCachedQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
    cacheKey: "cache:storage:locations",
    enabled,
  });
}
