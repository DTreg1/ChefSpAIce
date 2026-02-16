import supertest from "supertest";
import { createTestApp, registerTestUser, grantSubscription, cleanupAllTestUsers } from "./testSetup";
import type express from "express";

describe("Sync Flow Integration", () => {
  let app: express.Express;
  let token: string;
  let userId: string;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await createTestApp();
    request = supertest(app);
    const testUser = await registerTestUser(app);
    token = testUser.token;
    userId = testUser.userId;
    await grantSubscription(userId);
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
  });

  describe("Inventory Sync CRUD Operations", () => {
    describe("POST /api/sync/inventory (create operation)", () => {
      it("should create a new inventory item", async () => {
        const response = await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: "test-item-1",
              name: "Milk",
              quantity: 2,
              unit: "gallons",
              storageLocation: "fridge",
              category: "dairy",
              nutrition: { calories: 150, protein: 8, carbs: 12, fat: 8 },
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("operation", "create");
        expect(response.body.data).toHaveProperty("itemId", "test-item-1");
        expect(response.body.data).toHaveProperty("syncedAt");
        expect(typeof response.body.data.syncedAt).toBe("string");
      });

      it("should reject create without authorization", async () => {
        const response = await request
          .post("/api/sync/inventory")
          .send({
            operation: "create",
            data: {
              id: "test-item-2",
              name: "Cheese",
              quantity: 1,
              unit: "lb",
              storageLocation: "fridge",
              category: "dairy",
              nutrition: { calories: 400, protein: 25, carbs: 1, fat: 33 },
            },
          })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error");
      });

      it("should create item with minimal required fields", async () => {
        const response = await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: "test-item-minimal",
              name: "Butter",
              quantity: 1,
              unit: "stick",
              storageLocation: "pantry",
              category: "dairy",
              nutrition: { calories: 100, protein: 0, carbs: 0, fat: 11 },
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.operation).toBe("create");
      });
    });

    describe("GET /api/sync/inventory (pagination)", () => {
      beforeAll(async () => {
        // Create 3 items for pagination testing
        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: "pagination-item-1",
              name: "Apple",
              quantity: 5,
              unit: "count",
              storageLocation: "counter",
              category: "produce",
              nutrition: { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
            },
          });

        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: "pagination-item-2",
              name: "Banana",
              quantity: 3,
              unit: "count",
              storageLocation: "counter",
              category: "produce",
              nutrition: { calories: 105, protein: 1.3, carbs: 27, fat: 0.3 },
            },
          });

        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: "pagination-item-3",
              name: "Orange",
              quantity: 4,
              unit: "count",
              storageLocation: "counter",
              category: "produce",
              nutrition: { calories: 62, protein: 1.2, carbs: 15.4, fat: 0.3 },
            },
          });
      });

      it("should get paginated inventory list with default limit", async () => {
        const response = await request
          .get("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("items");
        expect(Array.isArray(response.body.data.items)).toBe(true);
        expect(response.body.data.items.length).toBeGreaterThan(0);

        // Check item structure
        if (response.body.data.items.length > 0) {
          const item = response.body.data.items[0];
          expect(item).toHaveProperty("id");
          expect(item).toHaveProperty("name");
          expect(item).toHaveProperty("quantity");
          expect(item).toHaveProperty("unit");
          expect(item).toHaveProperty("storageLocation");
          expect(item).toHaveProperty("category");
          expect(item).toHaveProperty("nutrition");
          expect(item).toHaveProperty("updatedAt");
        }
      });

      it("should respect limit parameter and return nextCursor when more items exist", async () => {
        const response = await request
          .get("/api/sync/inventory?limit=2")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items.length).toBeLessThanOrEqual(2);

        // If we have at least 3 items, nextCursor should be present
        if (response.body.data.items.length === 2) {
          expect(response.body.data).toHaveProperty("nextCursor");
          expect(typeof response.body.data.nextCursor).toBe("string");
        }
      });

      it("should retrieve remaining items using cursor pagination", async () => {
        // Get first page with limit=2
        const firstPageResponse = await request
          .get("/api/sync/inventory?limit=2")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(firstPageResponse.body.data.items.length).toBeLessThanOrEqual(2);

        if (firstPageResponse.body.data.nextCursor) {
          const cursor = firstPageResponse.body.data.nextCursor;

          // Get second page using cursor
          const secondPageResponse = await request
            .get(`/api/sync/inventory?limit=2&cursor=${encodeURIComponent(cursor)}`)
            .set("Authorization", `Bearer ${token}`)
            .expect(200);

          expect(secondPageResponse.body.success).toBe(true);
          expect(Array.isArray(secondPageResponse.body.data.items)).toBe(true);
          expect(secondPageResponse.body.data.items.length).toBeGreaterThan(0);

          // Verify we got different items
          const firstPageIds = new Set(firstPageResponse.body.data.items.map((item: any) => item.id));
          const secondPageIds = new Set(secondPageResponse.body.data.items.map((item: any) => item.id));

          // There should be no overlap between first and second page
          const overlap = [...firstPageIds].filter((id) => secondPageIds.has(id));
          expect(overlap.length).toBe(0);
        }
      });

      it("should reject pagination without authorization", async () => {
        const response = await request
          .get("/api/sync/inventory?limit=10")
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error");
      });

      it("should handle custom limit parameter", async () => {
        const response = await request
          .get("/api/sync/inventory?limit=5")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.items.length).toBeLessThanOrEqual(5);
      });
    });

    describe("PUT /api/sync/inventory (update with conflict resolution)", () => {
      it("should update an existing inventory item successfully", async () => {
        const itemId = "update-test-item";

        // Create item first
        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: itemId,
              name: "Original Name",
              quantity: 5,
              unit: "liters",
              storageLocation: "fridge",
              category: "beverage",
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            },
          });

        // Wait briefly for server timestamp
        await new Promise((resolve) => setTimeout(resolve, 10));

        // Update with current timestamp
        const response = await request
          .put("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: {
              id: itemId,
              name: "Updated Name",
              quantity: 3,
              unit: "liters",
              storageLocation: "counter",
              category: "beverage",
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
              updatedAt: new Date().toISOString(),
            },
          })
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("operation", "update");
        expect(response.body.data).toHaveProperty("itemId", itemId);
        expect(response.body.data).toHaveProperty("syncedAt");
      });

      it("should skip update with stale timestamp and return serverVersion", async () => {
        const itemId = "stale-update-item";
        const staleTimestamp = new Date(Date.now() - 60000).toISOString(); // 60 seconds ago

        // Create item first
        const createResponse = await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: itemId,
              name: "Original Item",
              quantity: 10,
              unit: "count",
              storageLocation: "pantry",
              category: "snacks",
              nutrition: { calories: 200, protein: 5, carbs: 30, fat: 8 },
            },
          });

        expect(createResponse.body.success).toBe(true);

        // Wait for server to set its timestamp
        await new Promise((resolve) => setTimeout(resolve, 50));

        // Try to update with an even older timestamp
        const updateResponse = await request
          .put("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: {
              id: itemId,
              name: "Attempting Stale Update",
              quantity: 5,
              unit: "count",
              storageLocation: "pantry",
              category: "snacks",
              nutrition: { calories: 200, protein: 5, carbs: 30, fat: 8 },
              updatedAt: staleTimestamp,
            },
          })
          .expect(200);

        expect(updateResponse.body).toHaveProperty("success", true);
        expect(updateResponse.body.data).toHaveProperty("operation", "skipped");
        expect(updateResponse.body.data).toHaveProperty("reason", "stale_update");
        expect(updateResponse.body.data).toHaveProperty("itemId", itemId);
        expect(updateResponse.body.data).toHaveProperty("serverVersion");

        // Verify serverVersion contains the original data
        const serverVersion = updateResponse.body.data.serverVersion;
        expect(serverVersion).toHaveProperty("id", itemId);
        expect(serverVersion).toHaveProperty("name", "Original Item");
        expect(serverVersion).toHaveProperty("quantity", 10);
        expect(serverVersion).toHaveProperty("updatedAt");
      });

      it("should reject update without authorization", async () => {
        const response = await request
          .put("/api/sync/inventory")
          .send({
            data: {
              id: "any-item",
              name: "Unauthorized Update",
              quantity: 1,
              unit: "unit",
              storageLocation: "location",
              category: "category",
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            },
          })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error");
      });

      it("should create item if not exists during update", async () => {
        const itemId = "new-via-update";

        const response = await request
          .put("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: {
              id: itemId,
              name: "Created via Update",
              quantity: 2,
              unit: "pieces",
              storageLocation: "shelf",
              category: "misc",
              nutrition: { calories: 50, protein: 1, carbs: 10, fat: 1 },
              updatedAt: new Date().toISOString(),
            },
          })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.operation).toBe("update");

        // Verify item was created
        const getResponse = await request
          .get("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        const createdItem = getResponse.body.data.items.find((item: any) => item.id === itemId);
        expect(createdItem).toBeDefined();
        expect(createdItem.name).toBe("Created via Update");
      });
    });

    describe("DELETE /api/sync/inventory", () => {
      it("should delete an existing inventory item", async () => {
        const itemId = "delete-test-item";

        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: itemId,
              name: "Item to Delete",
              quantity: 1,
              unit: "unit",
              storageLocation: "temp",
              category: "temp",
              nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            },
          });

        const deleteResponse = await request
          .delete("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: { id: itemId },
          })
          .expect(200);

        expect(deleteResponse.body).toHaveProperty("success", true);
        expect(deleteResponse.body.data).toHaveProperty("operation", "delete");
        expect(deleteResponse.body.data).toHaveProperty("itemId", itemId);
        expect(deleteResponse.body.data).toHaveProperty("syncedAt");

        const getResponse = await request
          .get("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        const deletedItem = getResponse.body.data.items.find((item: any) => item.id === itemId);
        expect(deletedItem).toBeUndefined();
      });

      it("should handle delete of non-existent item gracefully", async () => {
        const response = await request
          .delete("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            data: { id: "non-existent-item-12345" },
          })
          .expect(200);

        expect(response.body).toHaveProperty("success", true);
        expect(response.body.data).toHaveProperty("operation", "delete");
      });

      it("should reject delete without authorization", async () => {
        const response = await request
          .delete("/api/sync/inventory")
          .send({
            data: { id: "any-item" },
          })
          .expect(401);

        expect(response.body).toHaveProperty("success", false);
        expect(response.body).toHaveProperty("error");
      });
    });
  });

  describe("Complete Sync Flow", () => {
    it("should complete full CRUD cycle: create -> read -> update -> delete", async () => {
      const itemId = "full-cycle-item";

      // Step 1: Create
      const createResponse = await request
        .post("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          operation: "create",
          data: {
            id: itemId,
            name: "Tomato",
            quantity: 6,
            unit: "count",
            storageLocation: "counter",
            category: "produce",
            nutrition: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
          },
        })
        .expect(200);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.operation).toBe("create");

      // Step 2: Read
      const readResponse = await request
        .get("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(readResponse.body.success).toBe(true);
      const createdItem = readResponse.body.data.items.find((item: any) => item.id === itemId);
      expect(createdItem).toBeDefined();
      expect(createdItem.name).toBe("Tomato");
      expect(createdItem.quantity).toBe(6);

      // Step 3: Update
      await new Promise((resolve) => setTimeout(resolve, 50));

      const updateResponse = await request
        .put("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          data: {
            id: itemId,
            name: "Ripe Tomato",
            quantity: 4,
            unit: "count",
            storageLocation: "counter",
            category: "produce",
            nutrition: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
            updatedAt: new Date().toISOString(),
          },
        })
        .expect(200);

      expect(updateResponse.body.success).toBe(true);
      expect(updateResponse.body.data.operation).toBe("update");

      // Verify update
      const readAfterUpdateResponse = await request
        .get("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const updatedItem = readAfterUpdateResponse.body.data.items.find(
        (item: any) => item.id === itemId
      );
      expect(updatedItem.name).toBe("Ripe Tomato");
      expect(updatedItem.quantity).toBe(4);

      // Step 4: Delete
      const deleteResponse = await request
        .delete("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .send({
          data: { id: itemId },
        })
        .expect(200);

      expect(deleteResponse.body.success).toBe(true);
      expect(deleteResponse.body.data.operation).toBe("delete");

      // Verify deletion
      const readAfterDeleteResponse = await request
        .get("/api/sync/inventory")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      const deletedItem = readAfterDeleteResponse.body.data.items.find((item: any) => item.id === itemId);
      expect(deletedItem).toBeUndefined();
    });

    it("should handle multiple items with correct pagination", async () => {
      const baseId = `multi-item-${Date.now()}`;

      // Create 5 items
      const itemIds: string[] = [];
      for (let i = 1; i <= 5; i++) {
        const itemId = `${baseId}-${i}`;
        itemIds.push(itemId);

        await request
          .post("/api/sync/inventory")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: itemId,
              name: `Item ${i}`,
              quantity: i,
              unit: "unit",
              storageLocation: "storage",
              category: "category",
              nutrition: { calories: 100 * i, protein: i, carbs: i * 2, fat: i * 0.5 },
            },
          });
      }

      // Get all items with limit=3
      const page1Response = await request
        .get("/api/sync/inventory?limit=3")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(page1Response.body.data.items.length).toBeLessThanOrEqual(3);

      // Verify all created items appear in pagination
      const allItems: string[] = [];
      let hasMore = !!page1Response.body.data.nextCursor;
      let cursor = page1Response.body.data.nextCursor;

      allItems.push(...page1Response.body.data.items.map((item: any) => item.id));

      while (hasMore && cursor) {
        const pageResponse = await request
          .get(`/api/sync/inventory?limit=3&cursor=${encodeURIComponent(cursor)}`)
          .set("Authorization", `Bearer ${token}`)
          .expect(200);

        allItems.push(...pageResponse.body.data.items.map((item: any) => item.id));
        hasMore = !!pageResponse.body.data.nextCursor;
        cursor = pageResponse.body.data.nextCursor;
      }

      // All created items should be in the results
      for (const itemId of itemIds) {
        expect(allItems).toContain(itemId);
      }
    });
  });
});
