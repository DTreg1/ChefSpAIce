jest.mock("@/lib/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { offlineMutationQueue } from "@/lib/offline-queue";

describe("OfflineMutationQueue", () => {
  beforeEach(() => AsyncStorage.clear());

  it("enqueue increases count to 1", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/items", method: "POST", body: { name: "Apple" } });
    const count = await offlineMutationQueue.count();
    expect(count).toBe(1);
  });

  it("dequeue returns item with correct fields and auto-generated properties", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/items", method: "POST", body: { name: "Apple" } });
    const item = await offlineMutationQueue.dequeue();

    expect(item).not.toBeNull();
    expect(item!.endpoint).toBe("/api/items");
    expect(item!.method).toBe("POST");
    expect(item!.body).toEqual({ name: "Apple" });
    expect(item!.id).toBeDefined();
    expect(item!.createdAt).toBeDefined();
    expect(item!.retryCount).toBe(0);
  });

  it("dequeue from empty queue returns null", async () => {
    const item = await offlineMutationQueue.dequeue();
    expect(item).toBeNull();
  });

  it("dequeue returns items in FIFO order", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/a", method: "POST", body: null });
    await offlineMutationQueue.enqueue({ endpoint: "/api/b", method: "PUT", body: null });
    await offlineMutationQueue.enqueue({ endpoint: "/api/c", method: "DELETE", body: undefined });

    const first = await offlineMutationQueue.dequeue();
    const second = await offlineMutationQueue.dequeue();
    const third = await offlineMutationQueue.dequeue();

    expect(first!.endpoint).toBe("/api/a");
    expect(second!.endpoint).toBe("/api/b");
    expect(third!.endpoint).toBe("/api/c");
  });

  it("remove deletes a specific item by id", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/first", method: "POST", body: null });
    await offlineMutationQueue.enqueue({ endpoint: "/api/second", method: "POST", body: null });

    const all = await offlineMutationQueue.getAll();
    const firstId = all[0].id;
    await offlineMutationQueue.remove(firstId);

    const remaining = await offlineMutationQueue.getAll();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].endpoint).toBe("/api/second");
  });

  it("updateRetryCount updates the retry count for an item", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/retry", method: "POST", body: null });

    const all = await offlineMutationQueue.getAll();
    const itemId = all[0].id;
    await offlineMutationQueue.updateRetryCount(itemId, 3);

    const updated = await offlineMutationQueue.getAll();
    expect(updated[0].retryCount).toBe(3);
  });

  it("clear empties the queue", async () => {
    await offlineMutationQueue.enqueue({ endpoint: "/api/a", method: "POST", body: null });
    await offlineMutationQueue.enqueue({ endpoint: "/api/b", method: "POST", body: null });
    await offlineMutationQueue.clear();

    const count = await offlineMutationQueue.count();
    expect(count).toBe(0);
  });

  it("subscribe listener is called with count after enqueue", async () => {
    const listener = jest.fn();
    offlineMutationQueue.subscribe(listener);

    await new Promise((r) => setTimeout(r, 0));
    listener.mockClear();

    await offlineMutationQueue.enqueue({ endpoint: "/api/sub", method: "POST", body: null });

    await new Promise((r) => setTimeout(r, 0));
    expect(listener).toHaveBeenCalledWith(1);
  });

  it("unsubscribe prevents listener from being called on subsequent enqueues", async () => {
    const listener = jest.fn();
    const unsubscribe = offlineMutationQueue.subscribe(listener);

    await new Promise((r) => setTimeout(r, 0));
    listener.mockClear();

    unsubscribe();

    await offlineMutationQueue.enqueue({ endpoint: "/api/unsub", method: "POST", body: null });
    await new Promise((r) => setTimeout(r, 0));

    expect(listener).not.toHaveBeenCalled();
  });
});
