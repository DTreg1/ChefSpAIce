// API endpoint to seed initial cooking terms data
// This endpoint should be called once to populate the database with initial cooking terms

import { Request, Response } from "express";
import { initialCookingTerms } from "./seed-cooking-terms";
import type { IStorage } from "./storage";

export async function seedCookingTerms(storage: IStorage) {
  try {
    // Check if any cooking terms already exist
    const existingTerms = await storage.getCookingTerms();
    
    if (existingTerms && existingTerms.length > 0) {
      return {
        success: false,
        message: "Cooking terms already exist in the database",
        count: existingTerms.length
      };
    }

    // Insert all cooking terms
    const results = await Promise.all(
      initialCookingTerms.map(term => storage.createCookingTerm(term))
    );

    return {
      success: true,
      message: "Successfully seeded cooking terms",
      count: results.length
    };
  } catch (error) {
    console.error("Error seeding cooking terms:", error);
    return {
      success: false,
      message: "Failed to seed cooking terms",
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

export function createSeedEndpoint(storage: IStorage) {
  return async (req: Request, res: Response) => {
    const result = await seedCookingTerms(storage);
    
    if (result.success) {
      res.json(result);
    } else {
      res.status(400).json(result);
    }
  };
}