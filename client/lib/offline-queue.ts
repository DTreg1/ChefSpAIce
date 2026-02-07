import AsyncStorage from "@react-native-async-storage/async-storage";
import { logger } from "@/lib/logger";

const STORAGE_KEY = "@chefspaice/mutation_queue";

export interface MutationQueueItem {
  id: string;
  endpoint: string;
  method: string;
  body: unknown | undefined;
  createdAt: string;
  retryCount: number;
}

type MutationQueueListener = (count: number) => void;

class OfflineMutationQueue {
  private listeners: Set<MutationQueueListener> = new Set();

  subscribe(listener: MutationQueueListener): () => void {
    this.listeners.add(listener);
    this.getAll().then((items) => listener(items.length));
    return () => this.listeners.delete(listener);
  }

  private async notifyListeners() {
    const items = await this.getAll();
    const count = items.length;
    this.listeners.forEach((fn) => fn(count));
  }

  async enqueue(item: Omit<MutationQueueItem, "id" | "createdAt" | "retryCount">): Promise<void> {
    const queue = await this.getAll();
    const newItem: MutationQueueItem = {
      ...item,
      id: `mut_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      retryCount: 0,
    };
    queue.push(newItem);
    await this.save(queue);
    logger.log("[OfflineQueue] Enqueued mutation", { endpoint: item.endpoint, method: item.method });
    await this.notifyListeners();
  }

  async dequeue(): Promise<MutationQueueItem | null> {
    const queue = await this.getAll();
    if (queue.length === 0) return null;
    const [item, ...rest] = queue;
    await this.save(rest);
    await this.notifyListeners();
    return item;
  }

  async getAll(): Promise<MutationQueueItem[]> {
    try {
      const data = await AsyncStorage.getItem(STORAGE_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  async remove(id: string): Promise<void> {
    const queue = await this.getAll();
    const filtered = queue.filter((item) => item.id !== id);
    await this.save(filtered);
    await this.notifyListeners();
  }

  async updateRetryCount(id: string, retryCount: number): Promise<void> {
    const queue = await this.getAll();
    const updated = queue.map((item) =>
      item.id === id ? { ...item, retryCount } : item,
    );
    await this.save(updated);
  }

  async clear(): Promise<void> {
    await AsyncStorage.removeItem(STORAGE_KEY);
    await this.notifyListeners();
  }

  async count(): Promise<number> {
    const items = await this.getAll();
    return items.length;
  }

  private async save(queue: MutationQueueItem[]): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  }
}

export const offlineMutationQueue = new OfflineMutationQueue();
