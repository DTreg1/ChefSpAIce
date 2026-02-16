import AsyncStorage from "@react-native-async-storage/async-storage";

jest.mock("@/lib/query-client", () => ({
  getApiUrl: jest.fn(() => "http://localhost:5000"),
}));
jest.mock("@/lib/logger", () => ({
  logger: { log: jest.fn(), error: jest.fn(), warn: jest.fn() },
}));

import { syncManager } from "@/lib/sync-manager";

describe("SyncManager network detection", () => {
  beforeAll(() => {
    jest.useFakeTimers();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  beforeEach(() => AsyncStorage.clear());

  it("should initially report isOnline: true", async () => {
    const state = await syncManager.getState();
    expect(state.isOnline).toBe(true);
  });

  it("should remain online after fewer than 3 consecutive failures", async () => {
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();

    const state = await syncManager.getState();
    expect(state.isOnline).toBe(true);
  });

  it("should go offline after 3 consecutive failures", async () => {
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();

    const state = await syncManager.getState();
    expect(state.isOnline).toBe(false);
    expect(state.status).toBe("offline");
  });

  it("should come back online after markRequestSuccess", async () => {
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();

    let state = await syncManager.getState();
    expect(state.isOnline).toBe(false);

    syncManager.markRequestSuccess();

    state = await syncManager.getState();
    expect(state.isOnline).toBe(true);
  });

  it("should transition status away from offline after recovery", async () => {
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();
    syncManager.markRequestFailure();

    let state = await syncManager.getState();
    expect(state.status).toBe("offline");

    syncManager.markRequestSuccess();

    state = await syncManager.getState();
    expect(state.isOnline).toBe(true);
    expect(state.status).not.toBe("offline");
  });
});
