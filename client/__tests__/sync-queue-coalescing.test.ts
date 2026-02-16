jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:5000"),
}));
jest.mock("@/lib/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { syncManager } from "@/lib/sync-manager";

const SYNC_QUEUE_KEY = "@chefspaice/sync_queue";

async function getQueue() {
  const raw = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
  return JSON.parse(raw || "[]");
}

describe("Sync Queue Coalescing", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    AsyncStorage.clear();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it("queues a single create operation", async () => {
    await syncManager.queueChange("inventory", "create", { id: "item1", name: "Apples" });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("create");
    expect(queue[0].dataType).toBe("inventory");
    expect((queue[0].data as { id: string }).id).toBe("item1");
  });

  it("coalesces update-after-create: keeps create operation with updated data", async () => {
    await syncManager.queueChange("inventory", "create", { id: "item1", name: "Apples" });
    await syncManager.queueChange("inventory", "update", { id: "item1", name: "Green Apples", quantity: 5 });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("create");
    expect((queue[0].data as { name: string }).name).toBe("Green Apples");
    expect((queue[0].data as { quantity: number }).quantity).toBe(5);
  });

  it("coalesces delete-after-create: delete always wins", async () => {
    await syncManager.queueChange("inventory", "create", { id: "item1", name: "Apples" });
    await syncManager.queueChange("inventory", "delete", { id: "item1" });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("delete");
  });

  it("does not coalesce items with different IDs", async () => {
    await syncManager.queueChange("inventory", "create", { id: "item1", name: "Apples" });
    await syncManager.queueChange("inventory", "create", { id: "item2", name: "Bananas" });

    const queue = await getQueue();
    expect(queue).toHaveLength(2);
  });

  it("coalesces update-after-update: keeps latest data", async () => {
    await syncManager.queueChange("inventory", "update", { id: "item1", name: "Apples", quantity: 3 });
    await syncManager.queueChange("inventory", "update", { id: "item1", name: "Apples", quantity: 10 });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("update");
    expect((queue[0].data as { quantity: number }).quantity).toBe(10);
  });

  it("delete wins over create then update sequence", async () => {
    await syncManager.queueChange("inventory", "create", { id: "item1", name: "Apples" });
    await syncManager.queueChange("inventory", "update", { id: "item1", name: "Green Apples" });
    await syncManager.queueChange("inventory", "delete", { id: "item1" });

    const queue = await getQueue();
    expect(queue).toHaveLength(1);
    expect(queue[0].operation).toBe("delete");
  });
});
