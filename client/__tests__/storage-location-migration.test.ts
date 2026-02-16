import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:5000"),
}));
jest.mock("@/lib/sync-manager", () => ({
  syncManager: {
    queueChange: jest.fn(),
    isOnline: jest.fn(() => true),
    getStatus: jest.fn(() => ({ pending: 0 })),
    syncPreferences: jest.fn(),
    syncUserProfile: jest.fn(),
    clearQueue: jest.fn(),
  },
}));
jest.mock("@/lib/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { storage, FoodItem } from "@/lib/storage";

function makeFoodItem(overrides: Partial<FoodItem> = {}): FoodItem {
  return {
    id: `item_${Date.now()}_${Math.random().toString(36).substr(2)}`,
    name: "Test Item",
    quantity: 1,
    unit: "each",
    storageLocation: "fridge",
    purchaseDate: new Date().toISOString(),
    expirationDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    category: "produce",
    ...overrides,
  };
}

describe("Storage location migration", () => {
  beforeEach(() => AsyncStorage.clear());

  it("adds a custom location and retrieves it", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    const locations = await storage.getCustomStorageLocations();
    expect(locations).toHaveLength(1);
    expect(locations[0].key).toBe("garage");
  });

  it("does not duplicate a location with the same key", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage 2", icon: "warehouse" });

    const locations = await storage.getCustomStorageLocations();
    expect(locations).toHaveLength(1);
  });

  it("migrates items to pantry by default when removing a location", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    const items = [
      makeFoodItem({ id: "i1", storageLocation: "garage" }),
      makeFoodItem({ id: "i2", storageLocation: "garage" }),
      makeFoodItem({ id: "i3", storageLocation: "garage" }),
    ];
    await storage.setInventory(items);

    const result = await storage.removeCustomStorageLocation("garage");

    expect(result.migratedCount).toBe(3);

    const inventory = await storage.getInventory();
    for (const item of inventory) {
      expect(item.storageLocation).toBe("pantry");
    }
  });

  it("migrates items to a custom target location", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    const items = [
      makeFoodItem({ id: "m1", storageLocation: "garage" }),
      makeFoodItem({ id: "m2", storageLocation: "garage" }),
    ];
    await storage.setInventory(items);

    const result = await storage.removeCustomStorageLocation("garage", "freezer");

    expect(result.migratedCount).toBe(2);

    const inventory = await storage.getInventory();
    for (const item of inventory) {
      expect(item.storageLocation).toBe("freezer");
    }
  });

  it("does not migrate soft-deleted items", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    const items = [
      makeFoodItem({ id: "d1", storageLocation: "garage" }),
      makeFoodItem({ id: "d2", storageLocation: "garage", deletedAt: new Date().toISOString() }),
      makeFoodItem({ id: "d3", storageLocation: "garage" }),
    ];
    await storage.setInventory(items);

    const result = await storage.removeCustomStorageLocation("garage");

    expect(result.migratedCount).toBe(2);
  });

  it("returns migratedCount 0 when no items are in the removed location", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    await storage.setInventory([
      makeFoodItem({ id: "o1", storageLocation: "fridge" }),
    ]);

    const result = await storage.removeCustomStorageLocation("garage");
    expect(result.migratedCount).toBe(0);
  });

  it("getAllStorageLocations includes defaults and custom locations", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });

    const all = await storage.getAllStorageLocations();
    const keys = all.map((l) => l.key);

    expect(keys).toContain("fridge");
    expect(keys).toContain("freezer");
    expect(keys).toContain("pantry");
    expect(keys).toContain("counter");
    expect(keys).toContain("garage");
  });

  it("removed custom location no longer appears in getAllStorageLocations", async () => {
    await storage.addCustomStorageLocation({ key: "garage", label: "Garage", icon: "warehouse" });
    await storage.removeCustomStorageLocation("garage");

    const all = await storage.getAllStorageLocations();
    const keys = all.map((l) => l.key);

    expect(keys).toContain("fridge");
    expect(keys).toContain("freezer");
    expect(keys).toContain("pantry");
    expect(keys).toContain("counter");
    expect(keys).not.toContain("garage");
  });
});
