import type { StorageLocation } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";

export function useStorageLocations() {
  return useCachedQuery<StorageLocation[]>({
    queryKey: ["/api/storage-locations"],
  });
}
