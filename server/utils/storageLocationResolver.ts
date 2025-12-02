/**
 * Storage Location Resolver
 *
 * Maps storage location names (e.g., "Fridge", "Pantry", "Freezer") to actual
 * userStorage IDs in the database. Creates default locations if they don't exist.
 */

import { storage } from "../storage/index";
import type { UserStorage } from "@shared/schema";

/**
 * Standard storage location name mappings
 * Maps common variations to canonical names
 */
const LOCATION_NAME_MAPPINGS: Record<string, string> = {
  Fridge: "Refrigerator",
  Refrigerator: "Refrigerator",
  Freezer: "Freezer",
  Pantry: "Pantry",
  Counter: "Counter",
  // Add common variations
  Frig: "Refrigerator",
  Refrig: "Refrigerator",
  Cabinet: "Pantry",
  Cupboard: "Pantry",
  Shelf: "Pantry",
  "Deep Freeze": "Freezer",
  "Chest Freezer": "Freezer",
  Countertop: "Counter",
};

/**
 * Default storage location configurations
 */
const DEFAULT_LOCATIONS = [
  { name: "Refrigerator", icon: "refrigerator", isDefault: true, sortOrder: 1 },
  { name: "Freezer", icon: "snowflake", isDefault: true, sortOrder: 2 },
  { name: "Pantry", icon: "warehouse", isDefault: true, sortOrder: 3 },
  { name: "Counter", icon: "layout-grid", isDefault: true, sortOrder: 4 },
];

/**
 * Cache for user storage locations to avoid repeated DB queries
 * Key: userId, Value: Map of location name to storage ID
 */
const storageLocationCache = new Map<string, Map<string, string>>();

/**
 * Clear cache for a specific user (e.g., after they modify storage locations)
 */
export function clearStorageLocationCache(userId?: string) {
  if (userId) {
    storageLocationCache.delete(userId);
  } else {
    storageLocationCache.clear();
  }
}

/**
 * Get or create default storage locations for a user
 *
 * @param storage - Storage interface
 * @param userId - User ID
 * @returns Map of location names to storage IDs
 */
export async function ensureDefaultStorageLocations(
  storage: typeof import("../storage/index").storage,
  userId: string,
): Promise<Map<string, string>> {
  // Check cache first
  if (storageLocationCache.has(userId)) {
    return storageLocationCache.get(userId)!;
  }

  // Get existing storage locations for user
  const existingLocations = await storage.getStorageLocations(userId);
  const locationMap = new Map<string, string>();

  // Map existing locations
  for (const location of existingLocations) {
    if (location.isActive) {
      locationMap.set(location.name, location.id);
    }
  }

  // Create missing default locations
  const existingNames = new Set(
    existingLocations.map((l: UserStorage) => l.name),
  );
  const locationsToCreate = DEFAULT_LOCATIONS.filter(
    (loc) => !existingNames.has(loc.name),
  );

  for (const locConfig of locationsToCreate) {
    try {
      const newLocation = await storage.createStorageLocation(userId, {
        name: locConfig.name,
        icon: locConfig.icon,
      });
      locationMap.set(newLocation.name, newLocation.id);
    } catch (error) {
      console.error(
        `Failed to create default storage location ${locConfig.name} for user ${userId}:`,
        error,
      );
    }
  }

  // Cache the result
  storageLocationCache.set(userId, locationMap);

  return locationMap;
}

/**
 * Resolve a storage location name to its database ID for a user
 * Creates the location if it doesn't exist (for default locations)
 *
 * @param storage - Storage interface
 * @param userId - User ID
 * @param locationName - Name of the storage location (e.g., "Fridge", "Pantry")
 * @returns Storage location ID or null if not found/created
 */
export async function resolveStorageLocationId(
  storage: typeof import("../storage/index").storage,
  userId: string,
  locationName: string,
): Promise<string | null> {
  // Normalize the location name
  const normalizedName = LOCATION_NAME_MAPPINGS[locationName] || locationName;

  // Ensure default locations exist and get the map
  const locationMap = await ensureDefaultStorageLocations(storage, userId);

  // Return the ID if found
  const storageId = locationMap.get(normalizedName);
  if (storageId) {
    return storageId;
  }

  // If not a default location and not found, try to create it as custom
  if (!DEFAULT_LOCATIONS.find((loc) => loc.name === normalizedName)) {
    try {
      const newLocation = await storage.createStorageLocation(userId, {
        name: normalizedName,
        icon: "package", // Default icon for custom locations
      });

      // Update cache
      locationMap.set(normalizedName, newLocation.id);

      return newLocation.id;
    } catch (error) {
      console.error(
        `Failed to create custom storage location ${normalizedName} for user ${userId}:`,
        error,
      );
      return null;
    }
  }

  // Fallback: return first available location
  if (locationMap.size > 0) {
    console.warn(
      `Could not resolve storage location "${locationName}", using first available location`,
    );
    return locationMap.values().next().value || null;
  }

  console.error(`No storage locations available for user ${userId}`);
  return null;
}

/**
 * Batch resolve multiple storage location names to IDs
 * More efficient than resolving one at a time
 *
 * @param storage - Storage interface
 * @param userId - User ID
 * @param locationNames - Array of location names
 * @returns Map of location names to IDs
 */
export async function batchResolveStorageLocationIds(
  storage: typeof import("../storage/index").storage,
  userId: string,
  locationNames: string[],
): Promise<Map<string, string | null>> {
  // Ensure defaults exist first
  await ensureDefaultStorageLocations(storage, userId);

  const results = new Map<string, string | null>();

  // Resolve each location
  for (const name of locationNames) {
    const id = await resolveStorageLocationId(storage, userId, name);
    results.set(name, id);
  }

  return results;
}

/**
 * Get the default storage location ID for a user
 * Returns the ID of the first default location (usually Refrigerator)
 *
 * @param storage - Storage interface
 * @param userId - User ID
 * @returns Default storage location ID or null
 */
export async function getDefaultStorageLocationId(
  storage: typeof import("../storage/index").storage,
  userId: string,
): Promise<string | null> {
  const locationMap = await ensureDefaultStorageLocations(storage, userId);

  // Try to get Refrigerator first, then any default location
  return (
    locationMap.get("Refrigerator") ||
    locationMap.get("Pantry") ||
    locationMap.values().next().value ||
    null
  );
}
