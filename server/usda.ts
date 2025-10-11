import type { USDAFoodItem, USDASearchResponse, NutritionInfo } from "@shared/schema";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

// Mock nutritional data per 100g serving
const mockNutritionData: Record<number, NutritionInfo> = {
  171477: { // Chicken breast, raw
    calories: 120,
    protein: 22.5,
    carbs: 0,
    fat: 2.6,
    fiber: 0,
    sugar: 0,
    sodium: 63,
    servingSize: "100",
    servingUnit: "g"
  },
  168874: { // Rice, white, raw
    calories: 365,
    protein: 7.1,
    carbs: 79.3,
    fat: 0.6,
    fiber: 1.3,
    sugar: 0.1,
    sodium: 1,
    servingSize: "100",
    servingUnit: "g"
  },
  173410: { // Eggs, whole
    calories: 143,
    protein: 12.6,
    carbs: 0.7,
    fat: 9.5,
    fiber: 0,
    sugar: 0.4,
    sodium: 124,
    servingSize: "100",
    servingUnit: "g"
  },
  173424: { // Milk, whole
    calories: 61,
    protein: 3.2,
    carbs: 4.8,
    fat: 3.3,
    fiber: 0,
    sugar: 5.1,
    sodium: 43,
    servingSize: "100",
    servingUnit: "ml"
  },
  170148: { // Bread, white
    calories: 266,
    protein: 8.8,
    carbs: 49.4,
    fat: 3.3,
    fiber: 2.4,
    sugar: 5.2,
    sodium: 477,
    servingSize: "100",
    servingUnit: "g"
  },
  169179: { // Tomato, raw
    calories: 18,
    protein: 0.9,
    carbs: 3.9,
    fat: 0.2,
    fiber: 1.2,
    sugar: 2.6,
    sodium: 5,
    servingSize: "100",
    servingUnit: "g"
  },
  169967: { // Broccoli, raw
    calories: 34,
    protein: 2.8,
    carbs: 6.6,
    fat: 0.4,
    fiber: 2.6,
    sugar: 1.7,
    sodium: 33,
    servingSize: "100",
    servingUnit: "g"
  },
  174841: { // Banana
    calories: 89,
    protein: 1.1,
    carbs: 22.8,
    fat: 0.3,
    fiber: 2.6,
    sugar: 12.2,
    sodium: 1,
    servingSize: "100",
    servingUnit: "g"
  }
};

export async function searchUSDAFoods(query: string, pageSize: number = 10): Promise<USDASearchResponse> {
  // Note: USDA API requires an API key, but for MVP we'll simulate the response
  // In production, you would use: const apiKey = process.env.USDA_API_KEY;
  
  try {
    // Simulated USDA response for MVP with nutritional data
    const mockFoods: USDAFoodItem[] = [
      {
        fdcId: 171477,
        description: "Chicken, broilers or fryers, breast, meat only, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Poultry Products",
        nutrition: mockNutritionData[171477],
      },
      {
        fdcId: 168874,
        description: "Rice, white, long-grain, regular, raw, unenriched",
        dataType: "Survey (FNDDS)",
        foodCategory: "Cereal Grains and Pasta",
        nutrition: mockNutritionData[168874],
      },
      {
        fdcId: 173410,
        description: "Eggs, Grade A, Large, egg whole",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
        nutrition: mockNutritionData[173410],
      },
      {
        fdcId: 173424,
        description: "Milk, whole, 3.25% milkfat",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
        nutrition: mockNutritionData[173424],
      },
      {
        fdcId: 170148,
        description: "Bread, white, commercially prepared",
        dataType: "Survey (FNDDS)",
        foodCategory: "Baked Products",
        nutrition: mockNutritionData[170148],
      },
      {
        fdcId: 169179,
        description: "Tomatoes, red, ripe, raw, year round average",
        dataType: "Survey (FNDDS)",
        foodCategory: "Vegetables and Vegetable Products",
        nutrition: mockNutritionData[169179],
      },
      {
        fdcId: 169967,
        description: "Broccoli, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Vegetables and Vegetable Products",
        nutrition: mockNutritionData[169967],
      },
      {
        fdcId: 174841,
        description: "Bananas, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Fruits and Fruit Juices",
        nutrition: mockNutritionData[174841],
      },
    ].filter(food => 
      food.description.toLowerCase().includes(query.toLowerCase())
    );

    return {
      foods: mockFoods,
      totalHits: mockFoods.length,
      currentPage: 1,
      totalPages: 1,
    };
  } catch (error) {
    console.error("USDA API error:", error);
    throw new Error("Failed to search USDA database");
  }
}

export async function getFoodByFdcId(fdcId: number): Promise<USDAFoodItem | null> {
  try {
    // Simulated USDA response for MVP
    const mockFoods: Record<number, USDAFoodItem> = {
      171477: {
        fdcId: 171477,
        description: "Chicken, broilers or fryers, breast, meat only, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Poultry Products",
        nutrition: mockNutritionData[171477],
      },
      168874: {
        fdcId: 168874,
        description: "Rice, white, long-grain, regular, raw, unenriched",
        dataType: "Survey (FNDDS)",
        foodCategory: "Cereal Grains and Pasta",
        nutrition: mockNutritionData[168874],
      },
      173410: {
        fdcId: 173410,
        description: "Eggs, Grade A, Large, egg whole",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
        nutrition: mockNutritionData[173410],
      },
      173424: {
        fdcId: 173424,
        description: "Milk, whole, 3.25% milkfat",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
        nutrition: mockNutritionData[173424],
      },
      170148: {
        fdcId: 170148,
        description: "Bread, white, commercially prepared",
        dataType: "Survey (FNDDS)",
        foodCategory: "Baked Products",
        nutrition: mockNutritionData[170148],
      },
      169179: {
        fdcId: 169179,
        description: "Tomatoes, red, ripe, raw, year round average",
        dataType: "Survey (FNDDS)",
        foodCategory: "Vegetables and Vegetable Products",
        nutrition: mockNutritionData[169179],
      },
      169967: {
        fdcId: 169967,
        description: "Broccoli, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Vegetables and Vegetable Products",
        nutrition: mockNutritionData[169967],
      },
      174841: {
        fdcId: 174841,
        description: "Bananas, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Fruits and Fruit Juices",
        nutrition: mockNutritionData[174841],
      },
    };

    return mockFoods[fdcId] || null;
  } catch (error) {
    console.error("USDA API error:", error);
    return null;
  }
}
