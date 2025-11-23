import type { StorageLocation } from "@shared/schema";
import { useCachedQuery } from "./useCachedQuery";
import { API_ENDPOINTS } from "@/lib/api-endpoints";

export function useStorageLocations() {
  return useCachedQuery<StorageLocation[]>({
    queryKey: [API_ENDPOINTS.inventory.storageLocations],
  });
}
