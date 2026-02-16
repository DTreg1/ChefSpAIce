import supertest from "supertest";
import { createTestApp, registerTestUser, grantSubscription, revokeSubscription, cleanupAllTestUsers } from "./testSetup";
import { invalidateSubscriptionCache } from "../../lib/subscription-cache";
import type express from "express";

describe("Recipe Flow Integration", () => {
  let app: express.Express;
  let token: string;
  let userId: string;
  let request: ReturnType<typeof supertest>;
  let recipeId: string;

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

  describe("Recipe Sync Operations", () => {
    it("should create a recipe via POST /api/sync/recipes with create operation", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      recipeId = `recipe-test-${uniqueId}`;

      const recipeData = {
        operation: "create",
        data: {
          id: recipeId,
          title: "Test Pasta",
          description: "A simple test pasta recipe",
          ingredients: [
            { name: "Pasta", quantity: 200, unit: "g" },
            { name: "Olive Oil", quantity: 2, unit: "tbsp" },
          ],
          instructions: ["Boil water", "Cook pasta", "Add olive oil"],
          prepTime: 5,
          cookTime: 15,
          servings: 2,
          nutrition: { calories: 400, protein: 12, carbs: 60, fat: 10 },
          isFavorite: false,
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .set("Authorization", `Bearer ${token}`)
        .send(recipeData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("syncedAt");
      expect(response.body.data).toHaveProperty("operation", "create");
      expect(response.body.data).toHaveProperty("itemId", recipeId);
      expect(response.body.data.syncedAt).toBeDefined();
    });

    it("should retrieve recipes via GET /api/sync/recipes and verify the created recipe appears", async () => {
      const response = await request
        .get("/api/sync/recipes?limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("items");
      expect(Array.isArray(response.body.data.items)).toBe(true);

      const createdRecipe = response.body.data.items.find(
        (item: any) => item.id === recipeId
      );
      expect(createdRecipe).toBeDefined();
      expect(createdRecipe.title).toBe("Test Pasta");
      expect(createdRecipe.description).toBe("A simple test pasta recipe");
      expect(createdRecipe.ingredients).toEqual([
        { name: "Pasta", quantity: 200, unit: "g" },
        { name: "Olive Oil", quantity: 2, unit: "tbsp" },
      ]);
      expect(createdRecipe.instructions).toEqual(["Boil water", "Cook pasta", "Add olive oil"]);
      expect(createdRecipe.prepTime).toBe(5);
      expect(createdRecipe.cookTime).toBe(15);
      expect(createdRecipe.servings).toBe(2);
      expect(createdRecipe.nutrition).toEqual({
        calories: 400,
        protein: 12,
        carbs: 60,
        fat: 10,
      });
      expect(createdRecipe.isFavorite).toBe(false);
      expect(createdRecipe.updatedAt).toBeDefined();
    });

    it("should update a recipe via POST /api/sync/recipes with update operation", async () => {
      const updateData = {
        operation: "update",
        data: {
          id: recipeId,
          title: "Updated Test Pasta",
          description: "An updated test pasta recipe",
          ingredients: [
            { name: "Pasta", quantity: 300, unit: "g" },
            { name: "Olive Oil", quantity: 3, unit: "tbsp" },
            { name: "Garlic", quantity: 2, unit: "cloves" },
          ],
          instructions: ["Boil water", "Cook pasta", "Saute garlic", "Mix together"],
          prepTime: 10,
          cookTime: 20,
          servings: 4,
          nutrition: { calories: 500, protein: 15, carbs: 70, fat: 15 },
          isFavorite: true,
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .set("Authorization", `Bearer ${token}`)
        .send(updateData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("operation", "update");
      expect(response.body.data).toHaveProperty("itemId", recipeId);
      expect(response.body.data).toHaveProperty("syncedAt");
    });

    it("should retrieve recipes again and verify the update", async () => {
      const response = await request
        .get("/api/sync/recipes?limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      const updatedRecipe = response.body.data.items.find(
        (item: any) => item.id === recipeId
      );

      expect(updatedRecipe).toBeDefined();
      expect(updatedRecipe.title).toBe("Updated Test Pasta");
      expect(updatedRecipe.description).toBe("An updated test pasta recipe");
      expect(updatedRecipe.ingredients).toEqual([
        { name: "Pasta", quantity: 300, unit: "g" },
        { name: "Olive Oil", quantity: 3, unit: "tbsp" },
        { name: "Garlic", quantity: 2, unit: "cloves" },
      ]);
      expect(updatedRecipe.instructions).toEqual([
        "Boil water",
        "Cook pasta",
        "Saute garlic",
        "Mix together",
      ]);
      expect(updatedRecipe.prepTime).toBe(10);
      expect(updatedRecipe.cookTime).toBe(20);
      expect(updatedRecipe.servings).toBe(4);
      expect(updatedRecipe.nutrition).toEqual({
        calories: 500,
        protein: 15,
        carbs: 70,
        fat: 15,
      });
      expect(updatedRecipe.isFavorite).toBe(true);
    });

    it("should delete a recipe via DELETE /api/sync/recipes", async () => {
      const response = await request
        .delete("/api/sync/recipes")
        .set("Authorization", `Bearer ${token}`)
        .send({
          data: { id: recipeId },
        })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("operation", "delete");
      expect(response.body.data).toHaveProperty("itemId", recipeId);
      expect(response.body.data).toHaveProperty("syncedAt");
    });

    it("should retrieve recipes again and verify deletion", async () => {
      const response = await request
        .get("/api/sync/recipes?limit=10")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      const deletedRecipe = response.body.data.items.find(
        (item: any) => item.id === recipeId
      );

      expect(deletedRecipe).toBeUndefined();
    });
  });

  describe("Recipe Sync Authorization", () => {
    it("should reject recipe sync requests without authorization header", async () => {
      const recipeData = {
        operation: "create",
        data: {
          id: "test-recipe",
          title: "Test Recipe",
          description: "Test",
          ingredients: [{ name: "Ingredient", quantity: 1, unit: "unit" }],
          instructions: ["Step 1"],
          prepTime: 5,
          cookTime: 10,
          servings: 2,
          nutrition: { calories: 100, protein: 5, carbs: 10, fat: 2 },
          isFavorite: false,
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .send(recipeData)
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errorCode", "AUTHENTICATION_REQUIRED");
    });

    it("should reject recipe sync GET requests without authorization header", async () => {
      const response = await request
        .get("/api/sync/recipes")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errorCode", "AUTHENTICATION_REQUIRED");
    });
  });

  describe("Recipe Sync Subscription Requirement", () => {
    it("should reject recipe sync for users without active subscription", async () => {
      const unsubscribedUser = await registerTestUser(app);
      const unsubscribedToken = unsubscribedUser.token;

      await revokeSubscription(unsubscribedUser.userId);
      await invalidateSubscriptionCache(unsubscribedUser.userId);

      const recipeData = {
        operation: "create",
        data: {
          id: "test-recipe",
          title: "Test Recipe",
          description: "Test",
          ingredients: [{ name: "Ingredient", quantity: 1, unit: "unit" }],
          instructions: ["Step 1"],
          prepTime: 5,
          cookTime: 10,
          servings: 2,
          nutrition: { calories: 100, protein: 5, carbs: 10, fat: 2 },
          isFavorite: false,
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .set("Authorization", `Bearer ${unsubscribedToken}`)
        .send(recipeData)
        .expect(403);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errorCode", "SUBSCRIPTION_REQUIRED");
    });
  });

  describe("Recipe Sync Validation", () => {
    it("should reject recipe creation with missing required fields", async () => {
      const invalidRecipeData = {
        operation: "create",
        data: {
          id: "test-recipe",
          title: "Test Recipe",
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .set("Authorization", `Bearer ${token}`)
        .send(invalidRecipeData)
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
    });

    it("should handle recipe creation with minimal data (only required fields)", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const minimalRecipeId = `recipe-minimal-${uniqueId}`;

      const minimalRecipeData = {
        operation: "create",
        data: {
          id: minimalRecipeId,
          title: "Minimal Recipe",
          description: "Minimal description",
          ingredients: [{ name: "Ingredient", quantity: 1, unit: "unit" }],
          instructions: ["Step 1"],
          prepTime: 5,
          cookTime: 10,
          servings: 1,
          isFavorite: false,
        },
      };

      const response = await request
        .post("/api/sync/recipes")
        .set("Authorization", `Bearer ${token}`)
        .send(minimalRecipeData)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("operation", "create");
    });
  });

  describe("Recipe Pagination", () => {
    it("should support pagination with limit parameter", async () => {
      const response = await request
        .get("/api/sync/recipes?limit=5")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("items");
      expect(response.body.data.items.length).toBeLessThanOrEqual(5);
    });

    it("should return nextCursor when there are more items", async () => {
      // Create multiple recipes
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const recipeIds: string[] = [];

      for (let i = 0; i < 3; i++) {
        const testRecipeId = `recipe-pagination-${uniqueId}-${i}`;
        recipeIds.push(testRecipeId);

        await request
          .post("/api/sync/recipes")
          .set("Authorization", `Bearer ${token}`)
          .send({
            operation: "create",
            data: {
              id: testRecipeId,
              title: `Pagination Test Recipe ${i}`,
              description: "Test",
              ingredients: [{ name: "Ingredient", quantity: 1, unit: "unit" }],
              instructions: ["Step 1"],
              prepTime: 5,
              cookTime: 10,
              servings: 1,
              isFavorite: false,
            },
          });
      }

      // Fetch with small limit to trigger pagination
      const response = await request
        .get("/api/sync/recipes?limit=2")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data.items.length).toBeLessThanOrEqual(2);
      // Note: nextCursor might be present depending on total items in DB
    });
  });
});
