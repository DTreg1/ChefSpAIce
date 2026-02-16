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

import AsyncStorage from "@react-native-async-storage/async-storage";
import { storage, FoodItem } from "@/lib/storage";

const INVENTORY_KEY = "@chefspaice/inventory";

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

async function getRawInventory(): Promise<FoodItem[]> {
  const raw = await AsyncStorage.getItem(INVENTORY_KEY);
  return JSON.parse(raw || "[]");
}

describe("Soft Delete Inventory", () => {
  beforeEach(() => AsyncStorage.clear());

  it("deleted item is excluded from getInventory()", async () => {
    const item = makeFoodItem({ id: "del1" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("del1");

    const inventory = await storage.getInventory();
    expect(inventory.find((i) => i.id === "del1")).toBeUndefined();
  });

  it("deleted item appears in getDeletedInventory()", async () => {
    const item = makeFoodItem({ id: "del2" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("del2");

    const deleted = await storage.getDeletedInventory();
    expect(deleted.find((i) => i.id === "del2")).toBeDefined();
  });

  it("restored item reappears in getInventory()", async () => {
    const item = makeFoodItem({ id: "res1" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("res1");
    await storage.restoreInventoryItem("res1");

    const inventory = await storage.getInventory();
    expect(inventory.find((i) => i.id === "res1")).toBeDefined();
  });

  it("restored item is removed from getDeletedInventory()", async () => {
    const item = makeFoodItem({ id: "res2" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("res2");
    await storage.restoreInventoryItem("res2");

    const deleted = await storage.getDeletedInventory();
    expect(deleted.find((i) => i.id === "res2")).toBeUndefined();
  });

  it("cleanupDeletedInventory purges items deleted more than 30 days ago", async () => {
    const item = makeFoodItem({ id: "old1" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("old1");

    const raw = await getRawInventory();
    const idx = raw.findIndex((i) => i.id === "old1");
    raw[idx].deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(raw));

    await storage.cleanupDeletedInventory();

    const afterCleanup = await getRawInventory();
    expect(afterCleanup.find((i) => i.id === "old1")).toBeUndefined();
  });

  it("cleanupDeletedInventory only purges old items, keeps recent ones", async () => {
    const oldItem = makeFoodItem({ id: "old2" });
    const recentItem = makeFoodItem({ id: "recent2" });
    await storage.addInventoryItem(oldItem);
    await storage.addInventoryItem(recentItem);
    await storage.deleteInventoryItem("old2");
    await storage.deleteInventoryItem("recent2");

    const raw = await getRawInventory();
    const oldIdx = raw.findIndex((i) => i.id === "old2");
    raw[oldIdx].deletedAt = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000).toISOString();
    const recentIdx = raw.findIndex((i) => i.id === "recent2");
    raw[recentIdx].deletedAt = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();
    await AsyncStorage.setItem(INVENTORY_KEY, JSON.stringify(raw));

    const purgedCount = await storage.cleanupDeletedInventory();
    expect(purgedCount).toBe(1);

    const deleted = await storage.getDeletedInventory();
    expect(deleted.find((i) => i.id === "recent2")).toBeDefined();
    expect(deleted.find((i) => i.id === "old2")).toBeUndefined();
  });

  it("deleted item has a valid ISO deletedAt string", async () => {
    const item = makeFoodItem({ id: "iso1" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("iso1");

    const raw = await getRawInventory();
    const deleted = raw.find((i) => i.id === "iso1");
    expect(deleted).toBeDefined();
    expect(deleted!.deletedAt).toBeDefined();
    expect(new Date(deleted!.deletedAt!).toISOString()).toBe(deleted!.deletedAt);
  });

  it("restored item has deletedAt set to null", async () => {
    const item = makeFoodItem({ id: "null1" });
    await storage.addInventoryItem(item);
    await storage.deleteInventoryItem("null1");
    await storage.restoreInventoryItem("null1");

    const raw = await getRawInventory();
    const restored = raw.find((i) => i.id === "null1");
    expect(restored).toBeDefined();
    expect(restored!.deletedAt).toBeNull();
  });
});
