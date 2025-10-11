import type { USDAFoodItem, USDASearchResponse } from "@shared/schema";

const USDA_API_BASE = "https://api.nal.usda.gov/fdc/v1";

export async function searchUSDAFoods(query: string, pageSize: number = 10): Promise<USDASearchResponse> {
  // Note: USDA API requires an API key, but for MVP we'll simulate the response
  // In production, you would use: const apiKey = process.env.USDA_API_KEY;
  
  try {
    // Simulated USDA response for MVP
    // In production, you would make actual API call:
    // const response = await fetch(`${USDA_API_BASE}/foods/search?query=${encodeURIComponent(query)}&pageSize=${pageSize}&api_key=${apiKey}`);
    
    const mockFoods: USDAFoodItem[] = [
      {
        fdcId: 171477,
        description: "Chicken, broilers or fryers, breast, meat only, raw",
        dataType: "Survey (FNDDS)",
        foodCategory: "Poultry Products",
      },
      {
        fdcId: 168874,
        description: "Rice, white, long-grain, regular, raw, unenriched",
        dataType: "Survey (FNDDS)",
        foodCategory: "Cereal Grains and Pasta",
      },
      {
        fdcId: 173410,
        description: "Eggs, Grade A, Large, egg whole",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
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
      },
      168874: {
        fdcId: 168874,
        description: "Rice, white, long-grain, regular, raw, unenriched",
        dataType: "Survey (FNDDS)",
        foodCategory: "Cereal Grains and Pasta",
      },
      173410: {
        fdcId: 173410,
        description: "Eggs, Grade A, Large, egg whole",
        dataType: "Survey (FNDDS)",
        foodCategory: "Dairy and Egg Products",
      },
    };

    return mockFoods[fdcId] || null;
  } catch (error) {
    console.error("USDA API error:", error);
    return null;
  }
}
