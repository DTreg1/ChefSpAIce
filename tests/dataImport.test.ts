/**
 * Data Import Test Suite
 * 
 * Comprehensive tests for USDA FDC and OpenFoodFacts data import,
 * validation, and completion workflows.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  isNutritionDataValid, 
  searchUSDAFoods, 
  getFoodByFdcId,
  mapFDCFoodToUSDAItem
} from '../usda';
import {
  searchOFFByBarcode,
  searchOFFByName,
  getCombinedNutrition,
  enrichWithOFF
} from '../openFoodFacts';
import {
  getFoodDefaults,
  calculateExpirationDate,
  ensureRequiredFields,
  getDataQualityScore,
  assessDataQuality
} from '../foodCategoryDefaults';
import {
  resolveStorageLocationId,
  ensureDefaultStorageLocations,
  getDefaultStorageLocationId
} from '../storageLocationResolver';

// Mock fetch for API calls
global.fetch = vi.fn();

describe('USDA Data Validation', () => {
  describe('isNutritionDataValid', () => {
    it('should reject all-zero macronutrients for regular foods', () => {
      const nutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      expect(isNutritionDataValid(nutrition, 'Chicken Breast')).toBe(false);
      expect(isNutritionDataValid(nutrition, 'Apple')).toBe(false);
    });

    it('should allow all-zero macronutrients for water and seasonings', () => {
      const nutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      expect(isNutritionDataValid(nutrition, 'Water')).toBe(true);
      expect(isNutritionDataValid(nutrition, 'Black Pepper')).toBe(true);
      expect(isNutritionDataValid(nutrition, 'Salt')).toBe(true);
      expect(isNutritionDataValid(nutrition, 'Herbal Tea')).toBe(true);
    });

    it('should reject impossible nutrition data (calories without macros)', () => {
      const nutrition = {
        calories: 100,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      expect(isNutritionDataValid(nutrition, 'Mystery Food')).toBe(false);
    });

    it('should validate food-specific expectations', () => {
      // Meat should have protein
      const chickenNoProtein = {
        calories: 165,
        protein: 0,
        carbs: 0,
        fat: 3.6
      };
      expect(isNutritionDataValid(chickenNoProtein, 'Chicken Breast')).toBe(false);

      // Oil should have fat
      const oilNoFat = {
        calories: 120,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      expect(isNutritionDataValid(oilNoFat, 'Olive Oil')).toBe(false);
    });

    it('should accept valid nutrition data', () => {
      const validChicken = {
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6
      };
      expect(isNutritionDataValid(validChicken, 'Chicken Breast')).toBe(true);

      const validApple = {
        calories: 52,
        protein: 0.3,
        carbs: 14,
        fat: 0.2
      };
      expect(isNutritionDataValid(validApple, 'Apple')).toBe(true);
    });
  });
});

describe('Food Category Defaults', () => {
  describe('getFoodDefaults', () => {
    it('should return dairy defaults for dairy products', () => {
      const defaults = getFoodDefaults('dairy and egg products', 'Milk');
      expect(defaults.storageLocation).toBe('Fridge');
      expect(defaults.estimatedExpirationDays).toBe(14);
    });

    it('should return pantry defaults for grains', () => {
      const defaults = getFoodDefaults('cereal grains and pasta', 'Rice');
      expect(defaults.storageLocation).toBe('Pantry');
      expect(defaults.estimatedExpirationDays).toBe(365);
    });

    it('should match by description patterns', () => {
      const milkDefaults = getFoodDefaults(undefined, 'Whole Milk');
      expect(milkDefaults.unit).toBe('gallon');
      expect(milkDefaults.storageLocation).toBe('Fridge');

      const chickenDefaults = getFoodDefaults(undefined, 'Chicken Thighs');
      expect(chickenDefaults.unit).toBe('lb');
      expect(chickenDefaults.storageLocation).toBe('Fridge');
      expect(chickenDefaults.estimatedExpirationDays).toBe(2);
    });

    it('should provide generic fallback for unknown items', () => {
      const defaults = getFoodDefaults(undefined, 'Mystery Item');
      expect(defaults.quantity).toBe('1');
      expect(defaults.unit).toBe('item');
      expect(defaults.storageLocation).toBe('Pantry');
      expect(defaults.estimatedExpirationDays).toBe(90);
    });
  });

  describe('calculateExpirationDate', () => {
    it('should calculate correct expiration date', () => {
      const today = new Date();
      const daysToAdd = 7;
      const expDate = calculateExpirationDate(daysToAdd);
      
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() + daysToAdd);
      
      expect(expDate).toBe(expectedDate.toISOString().split('T')[0]);
    });
  });

  describe('ensureRequiredFields', () => {
    it('should fill missing required fields with defaults', () => {
      const incompleteItem = {
        name: 'Chicken Breast'
      };
      
      const completed = ensureRequiredFields(incompleteItem, 'poultry products');
      
      expect(completed.name).toBe('Chicken Breast');
      expect(completed.quantity).toBeTruthy();
      expect(completed.unit).toBeTruthy();
      expect(completed.storageLocation).toBe('Fridge'); // Name, not ID
      expect(completed.expirationDate).toBeTruthy();
    });

    it('should not override existing fields', () => {
      const item = {
        name: 'Custom Product',
        quantity: '5',
        unit: 'pieces',
        storageLocation: 'Custom Location'
      };
      
      const completed = ensureRequiredFields(item);
      
      expect(completed.quantity).toBe('5');
      expect(completed.unit).toBe('pieces');
      expect(completed.storageLocation).toBe('Custom Location');
    });
  });
});

describe('Data Quality Assessment', () => {
  describe('getDataQualityScore', () => {
    it('should score complete items highly', () => {
      const completeItem = {
        name: 'Chicken Breast',
        quantity: '2',
        unit: 'lb',
        storageLocationId: 'uuid-123',
        expirationDate: '2024-01-15',
        nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        servingSize: '100',
        fdcId: '171477',
        barcode: '012345678901',
        foodCategory: 'Poultry'
      };
      
      const score = getDataQualityScore(completeItem);
      expect(score).toBeGreaterThan(80);
    });

    it('should score incomplete items lower', () => {
      const incompleteItem = {
        name: 'Unknown Product',
        quantity: '1',
        unit: 'item'
      };
      
      const score = getDataQualityScore(incompleteItem);
      expect(score).toBeLessThan(40);
    });
  });

  describe('assessDataQuality', () => {
    it('should categorize items by quality level', () => {
      const excellentItem = {
        name: 'Premium Chicken',
        quantity: '2',
        unit: 'lb',
        storageLocationId: 'uuid-123',
        nutrition: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
        servingSize: '100',
        fdcId: '171477'
      };
      
      const assessment = assessDataQuality(excellentItem);
      expect(assessment.level).toBe('good');
      expect(assessment.missingFields).toContain('barcode');
    });

    it('should identify missing critical fields', () => {
      const poorItem = {
        name: 'Mystery Item'
      };
      
      const assessment = assessDataQuality(poorItem);
      expect(assessment.level).toBe('poor');
      expect(assessment.missingFields).toContain('nutrition');
      expect(assessment.missingFields).toContain('servingSize');
    });
  });
});

describe('Storage Location Resolution', () => {
  const mockStorage = {
    getStorageLocations: vi.fn(),
    createStorageLocation: vi.fn()
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveStorageLocationId', () => {
    it('should resolve common location names to IDs', async () => {
      mockStorage.getStorageLocations.mockResolvedValue([
        { id: 'uuid-fridge', name: 'Refrigerator', isActive: true },
        { id: 'uuid-pantry', name: 'Pantry', isActive: true }
      ]);
      
      const fridgeId = await resolveStorageLocationId(mockStorage, 'user-123', 'Fridge');
      expect(fridgeId).toBe('uuid-fridge');
      
      const pantryId = await resolveStorageLocationId(mockStorage, 'user-123', 'Pantry');
      expect(pantryId).toBe('uuid-pantry');
    });

    it('should create missing default locations', async () => {
      mockStorage.getStorageLocations.mockResolvedValue([]);
      mockStorage.createStorageLocation.mockResolvedValue({
        id: 'uuid-new-fridge',
        name: 'Refrigerator'
      });
      
      const result = await ensureDefaultStorageLocations(mockStorage, 'user-123');
      
      expect(mockStorage.createStorageLocation).toHaveBeenCalledWith(
        'user-123',
        expect.objectContaining({ name: 'Refrigerator' })
      );
    });

    it('should handle location name variations', async () => {
      mockStorage.getStorageLocations.mockResolvedValue([
        { id: 'uuid-fridge', name: 'Refrigerator', isActive: true }
      ]);
      
      // All these should resolve to Refrigerator
      const variations = ['Fridge', 'Frig', 'Refrig', 'Refrigerator'];
      
      for (const variation of variations) {
        const id = await resolveStorageLocationId(mockStorage, 'user-123', variation);
        expect(id).toBe('uuid-fridge');
      }
    });
  });
});

describe('OpenFoodFacts Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('searchOFFByBarcode', () => {
    it('should extract nutrition from OpenFoodFacts data', async () => {
      const mockResponse = {
        status: 1,
        product: {
          product_name: 'Test Product',
          brands: 'Test Brand',
          nutriments: {
            'energy-kcal_100g': 250,
            proteins_100g: 10,
            carbohydrates_100g: 30,
            fat_100g: 12
          }
        }
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => mockResponse
      });
      
      const result = await searchOFFByBarcode('123456789');
      
      expect(result).toBeTruthy();
      expect(result?.name).toBe('Test Product');
      expect(result?.nutrition?.calories).toBe(250);
      expect(result?.nutrition?.protein).toBe(10);
    });

    it('should handle missing products gracefully', async () => {
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ status: 0 })
      });
      
      const result = await searchOFFByBarcode('999999999');
      expect(result).toBeNull();
    });
  });

  describe('getCombinedNutrition', () => {
    it('should prefer complete USDA data', async () => {
      const usdaNutrition = {
        calories: 165,
        protein: 31,
        carbs: 0,
        fat: 3.6,
        servingSize: '100',
        servingUnit: 'g'
      };
      
      const result = await getCombinedNutrition(usdaNutrition, '123456');
      expect(result).toBe(usdaNutrition);
    });

    it('should fallback to OpenFoodFacts when USDA incomplete', async () => {
      const incompleteUSDA = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        servingSize: '100',
        servingUnit: 'g'
      };
      
      const offNutrition = {
        calories: 250,
        protein: 10,
        carbs: 30,
        fat: 12,
        servingSize: '100',
        servingUnit: 'g'
      };
      
      (global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({
          status: 1,
          product: {
            product_name: 'Test',
            nutriments: {
              'energy-kcal_100g': 250,
              proteins_100g: 10,
              carbohydrates_100g: 30,
              fat_100g: 12
            }
          }
        })
      });
      
      const result = await getCombinedNutrition(incompleteUSDA, '123456');
      expect(result?.calories).toBe(250);
    });
  });
});

describe('End-to-End Data Import Flow', () => {
  it('should handle complete USDA import with defaults', () => {
    const fdcFood = {
      fdcId: 171477,
      description: 'Chicken breast, raw',
      dataType: 'Foundation',
      foodCategory: 'Poultry Products',
      labelNutrients: {
        calories: { value: 165 },
        protein: { value: 31 },
        carbohydrates: { value: 0 },
        fat: { value: 3.6 }
      },
      servingSize: 100,
      servingSizeUnit: 'g'
    };
    
    const mapped = mapFDCFoodToUSDAItem(fdcFood as any);
    
    // Should have basic fields
    expect(mapped.fdcId).toBe(171477);
    expect(mapped.description).toBe('Chicken breast, raw');
    expect(mapped.foodCategory).toBe('Poultry Products');
    
    // Should be enriched with defaults
    expect(mapped.quantity).toBe('1');
    expect(mapped.unit).toBe('lb');
    expect(mapped.storageLocation).toBe('Fridge'); // Name, not ID yet
    expect(mapped.expirationDate).toBeTruthy();
  });

  it('should reject and handle incomplete USDA data', () => {
    const incompleteFDC = {
      fdcId: 999999,
      description: 'Mystery Food',
      dataType: 'Branded',
      labelNutrients: {
        calories: { value: 0 },
        protein: { value: 0 },
        carbohydrates: { value: 0 },
        fat: { value: 0 }
      }
    };
    
    const mapped = mapFDCFoodToUSDAItem(incompleteFDC as any);
    
    // Should still have defaults even with bad nutrition
    expect(mapped.quantity).toBe('1');
    expect(mapped.unit).toBe('item');
    expect(mapped.storageLocation).toBe('Pantry');
    
    // Data quality should be poor
    const assessment = assessDataQuality(mapped);
    expect(assessment.level).toBe('poor');
  });
});