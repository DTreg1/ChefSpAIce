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
jest.mock("@/lib/recipe-image", () => ({
  deleteRecipeImage: jest.fn(() => Promise.resolve()),
}));
jest.mock("expo-file-system/legacy", () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: false })),
  EncodingType: { Base64: "base64" },
  readAsStringAsync: jest.fn(() => Promise.resolve("")),
}));

import { storage, Recipe } from "@/lib/storage";

function makeRecipe(overrides: Partial<Recipe> = {}): Recipe {
  return {
    id: `recipe_${Date.now()}_${Math.random().toString(36).substr(2)}`,
    title: "Test Recipe",
    description: "A test recipe",
    ingredients: [{ name: "flour", quantity: 2, unit: "cups" }],
    instructions: ["Mix ingredients", "Bake"],
    prepTime: 10,
    cookTime: 20,
    servings: 4,
    isFavorite: false,
    isAIGenerated: false,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("Recipe image storage", () => {
  beforeEach(() => AsyncStorage.clear());

  it("setRecipeImage stores data and getRecipeImage retrieves it", async () => {
    const success = await storage.setRecipeImage("r1", "data:image/png;base64,abc123");
    expect(success).toBe(true);

    const result = await storage.getRecipeImage("r1");
    expect(result).toBe("data:image/png;base64,abc123");
  });

  it("getRecipeImage returns null for non-existent recipe", async () => {
    const result = await storage.getRecipeImage("nonexistent");
    expect(result).toBeNull();
  });

  it("deleteRecipeImage removes the image", async () => {
    await storage.setRecipeImage("r2", "data:image/png;base64,xyz");
    await storage.deleteRecipeImage("r2");

    const result = await storage.getRecipeImage("r2");
    expect(result).toBeNull();
  });

  it("addRecipe with data:image stores image separately and sets stored: reference", async () => {
    const imageData = "data:image/png;base64," + "A".repeat(200);
    const recipe = makeRecipe({ id: "img_recipe_1", imageUri: imageData });

    await storage.addRecipe(recipe);

    const rawRecipes = await storage.getRawRecipes();
    const stored = rawRecipes.find((r) => r.id === "img_recipe_1");
    expect(stored).toBeDefined();
    expect(stored!.imageUri).toBe("stored:img_recipe_1");
  });

  it("getRecipes resolves stored: reference back to actual image data", async () => {
    const imageData = "data:image/png;base64," + "B".repeat(200);
    const recipe = makeRecipe({ id: "img_recipe_2", imageUri: imageData });

    await storage.addRecipe(recipe);

    const resolved = await storage.getRecipes();
    const found = resolved.find((r) => r.id === "img_recipe_2");
    expect(found).toBeDefined();
    expect(found!.imageUri).toBe(imageData);
  });

  it("falls back to cloudImageUri when local image is deleted", async () => {
    const imageData = "data:image/png;base64," + "C".repeat(200);
    const recipe = makeRecipe({
      id: "img_recipe_3",
      imageUri: imageData,
      cloudImageUri: "https://cdn.example.com/recipe3.jpg",
    });

    await storage.addRecipe(recipe);
    await storage.deleteRecipeImage("img_recipe_3");

    const resolved = await storage.getRecipes();
    const found = resolved.find((r) => r.id === "img_recipe_3");
    expect(found).toBeDefined();
    expect(found!.imageUri).toBe("https://cdn.example.com/recipe3.jpg");
  });

  it("sets imageUri to undefined when no local image and no cloudImageUri", async () => {
    const imageData = "data:image/png;base64," + "D".repeat(200);
    const recipe = makeRecipe({ id: "img_recipe_4", imageUri: imageData });

    await storage.addRecipe(recipe);
    await storage.deleteRecipeImage("img_recipe_4");

    const resolved = await storage.getRecipes();
    const found = resolved.find((r) => r.id === "img_recipe_4");
    expect(found).toBeDefined();
    expect(found!.imageUri).toBeUndefined();
  });

  it("deleteRecipe also removes the stored image data", async () => {
    const imageData = "data:image/png;base64," + "E".repeat(200);
    const recipe = makeRecipe({ id: "img_recipe_5", imageUri: imageData });

    await storage.addRecipe(recipe);

    const imageBefore = await storage.getRecipeImage("img_recipe_5");
    expect(imageBefore).toBe(imageData);

    await storage.deleteRecipe("img_recipe_5");

    const imageAfter = await storage.getRecipeImage("img_recipe_5");
    expect(imageAfter).toBeNull();

    const recipes = await storage.getRawRecipes();
    expect(recipes.find((r) => r.id === "img_recipe_5")).toBeUndefined();
  });
});
