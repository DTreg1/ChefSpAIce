// Referenced from blueprint:javascript_log_in_with_replit - Added authentication and user-scoped routes
import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { openai } from "./openai";
import { searchUSDAFoods, getFoodByFdcId, isNutritionDataValid } from "./usda";
import { searchBarcodeLookup, getBarcodeLookupProduct, extractImageUrl, getBarcodeLookupRateLimits, checkRateLimitBeforeCall } from "./barcodelookup";
import { getEnrichedOnboardingItem } from "./onboarding-usda";
import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { ApiError } from "./apiError";
import { batchedApiLogger } from "./batchedApiLogger";
import { cleanupOldMessagesForUser } from "./chatCleanup";
import { z } from "zod";
import { 
  insertFoodItemSchema, 
  insertChatMessageSchema,
  insertRecipeSchema,
  insertApplianceSchema,
  insertMealPlanSchema,
  insertUserPreferencesSchema,
  insertStorageLocationSchema
} from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware (from blueprint:javascript_log_in_with_replit)
  await setupAuth(app);

  // Auth routes (from blueprint:javascript_log_in_with_replit)
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ error: "Failed to fetch user" });
    }
  });

  // User Preferences
  app.get('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const preferences = await storage.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Error fetching preferences:", error);
      res.status(500).json({ error: "Failed to fetch preferences" });
    }
  });

  app.put('/api/user/preferences', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertUserPreferencesSchema.parse(req.body);
      const preferences = await storage.upsertUserPreferences({ ...validated, userId });
      res.json(preferences);
    } catch (error) {
      console.error("Error updating preferences:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  app.post('/api/user/reset', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.resetUserData(userId);
      res.json({ success: true, message: "Account data reset successfully" });
    } catch (error) {
      console.error("Error resetting user data:", error);
      res.status(500).json({ error: "Failed to reset account data" });
    }
  });

  // Storage Locations (user-scoped)
  app.get("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const locations = await storage.getStorageLocations(userId);
      res.json(locations);
    } catch (error) {
      console.error("Error fetching storage locations:", error);
      res.status(500).json({ error: "Failed to fetch storage locations" });
    }
  });

  app.post("/api/storage-locations", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertStorageLocationSchema.parse(req.body);
      const location = await storage.createStorageLocation(userId, validated);
      res.json(location);
    } catch (error) {
      console.error("Error creating storage location:", error);
      res.status(400).json({ error: "Invalid storage location data" });
    }
  });

  // Food Items (user-scoped)
  app.get("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { storageLocationId } = req.query;
      const items = await storage.getFoodItems(userId, storageLocationId as string | undefined);
      res.json(items);
    } catch (error) {
      console.error("Error fetching food items:", error);
      res.status(500).json({ error: "Failed to fetch food items" });
    }
  });

  app.post("/api/food-items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertFoodItemSchema.parse(req.body);
      
      let nutrition = validated.nutrition;
      let usdaData = validated.usdaData;
      
      // Always validate nutrition if provided
      let needsFreshNutrition = !nutrition;
      
      if (nutrition) {
        try {
          const parsedNutrition = JSON.parse(nutrition);
          if (!isNutritionDataValid(parsedNutrition, validated.name)) {
            console.log(`Invalid nutrition detected for "${validated.name}"`);
            // If we have an FDC ID, try to fetch fresh data
            if (validated.fcdId) {
              console.log(`Will fetch fresh data from USDA`);
              needsFreshNutrition = true;
            } else {
              // No FDC ID, can't fetch fresh data - reject invalid nutrition
              console.log(`No FDC ID available, clearing invalid nutrition`);
              nutrition = null;
              usdaData = null;
            }
          }
        } catch (e) {
          console.error("Error parsing/validating nutrition:", e);
          // If we have an FDC ID, try to fetch fresh data
          if (validated.fcdId) {
            needsFreshNutrition = true;
          } else {
            // No FDC ID, clear malformed nutrition
            nutrition = null;
            usdaData = null;
          }
        }
      }
      
      // If we have an FDC ID and need fresh nutrition, fetch full details
      if (validated.fcdId && needsFreshNutrition) {
        console.log(`Fetching full USDA details for FDC ID ${validated.fcdId} during item creation`);
        const foodDetails = await getFoodByFdcId(parseInt(validated.fcdId));
        if (foodDetails && foodDetails.nutrition) {
          console.log(`Found valid nutrition data for FDC ID ${validated.fcdId}`);
          nutrition = JSON.stringify(foodDetails.nutrition);
          usdaData = JSON.stringify(foodDetails);
        } else {
          // If we couldn't get valid nutrition, clear any invalid nutrition
          console.log(`Could not fetch valid nutrition for FDC ID ${validated.fcdId}, storing without nutrition`);
          nutrition = null;
          usdaData = null;
        }
      }
      
      // Calculate weightInGrams from quantity and USDA serving size
      let weightInGrams: number | null = null;
      if (nutrition) {
        try {
          const nutritionData = JSON.parse(nutrition);
          const quantity = parseFloat(validated.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;
        } catch (e) {
          console.error("Error calculating weight:", e);
        }
      }
      
      const item = await storage.createFoodItem(userId, {
        ...validated,
        nutrition,
        usdaData,
        weightInGrams,
      });
      res.json(item);
    } catch (error) {
      console.error("Error creating food item:", error);
      res.status(400).json({ error: "Invalid food item data" });
    }
  });

  app.put("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updateSchema = insertFoodItemSchema.partial().required({
        quantity: true,
        unit: true,
        storageLocationId: true,
        expirationDate: true,
      });
      const validated = updateSchema.parse(req.body);
      
      // Recalculate weightInGrams if quantity or nutrition changes
      let weightInGrams: number | null | undefined = undefined;
      if (validated.quantity && validated.nutrition) {
        try {
          const nutritionData = JSON.parse(validated.nutrition);
          const quantity = parseFloat(validated.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;
        } catch (e) {
          console.error("Error calculating weight:", e);
        }
      }
      
      const updateData = weightInGrams !== undefined ? { ...validated, weightInGrams } : validated;
      const item = await storage.updateFoodItem(userId, id, updateData);
      res.json(item);
    } catch (error) {
      console.error("Error updating food item:", error);
      res.status(400).json({ error: "Failed to update food item" });
    }
  });

  app.delete("/api/food-items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteFoodItem(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting food item:", error);
      res.status(500).json({ error: "Failed to delete food item" });
    }
  });

  app.post("/api/food-items/:id/refresh-nutrition", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      
      // Get the current food item
      const items = await storage.getFoodItems(userId);
      const item = items.find(i => i.id === id);
      
      if (!item) {
        return res.status(404).json({ error: "Food item not found" });
      }

      let usdaData = null;
      let nutrition = null;

      // Try to fetch fresh USDA data
      if (item.fcdId) {
        // If we have an FDC ID, try to fetch by ID first
        console.log(`Refreshing nutrition for "${item.name}" using FDC ID: ${item.fcdId}`);
        usdaData = await getFoodByFdcId(parseInt(item.fcdId));
        
        if (usdaData && usdaData.nutrition) {
          nutrition = JSON.stringify(usdaData.nutrition);
        }
      }
      
      // If no FDC ID or fetch failed, try searching by name
      if (!nutrition) {
        console.log(`Searching USDA for "${item.name}" to refresh nutrition data`);
        const searchResults = await searchUSDAFoods(item.name);
        
        if (searchResults.foods && searchResults.foods.length > 0) {
          // Try multiple search results until we find one with valid nutrition
          for (const searchResult of searchResults.foods) {
            try {
              console.log(`Trying FDC ID: ${searchResult.fdcId} for "${item.name}"`);
              
              // Fetch full details for this search result
              const foodDetails = await getFoodByFdcId(searchResult.fdcId);
              
              if (foodDetails && foodDetails.nutrition) {
                console.log(`Found valid nutrition data using FDC ID: ${searchResult.fdcId} for "${item.name}"`);
                usdaData = foodDetails;
                nutrition = JSON.stringify(foodDetails.nutrition);
                
                // Update FDC ID if we found a better match
                if (foodDetails.fdcId) {
                  await storage.updateFoodItem(userId, id, {
                    fcdId: foodDetails.fdcId.toString(),
                  });
                }
                break; // Found valid nutrition, stop searching
              } else {
                console.log(`Skipping FDC ID: ${searchResult.fdcId} - nutrition data invalid or missing`);
              }
            } catch (err) {
              console.error(`Error fetching details for FDC ID ${searchResult.fdcId}:`, err);
              // Continue to next result
            }
          }
        }
      }

      if (nutrition) {
        // Recalculate weight based on new nutrition data
        let weightInGrams: number | null = null;
        try {
          const nutritionData = JSON.parse(nutrition);
          const quantity = parseFloat(item.quantity) || 1;
          const servingSize = parseFloat(nutritionData.servingSize) || 100;
          weightInGrams = quantity * servingSize;
        } catch (e) {
          console.error("Error calculating weight:", e);
        }

        // Update the item with new nutrition data
        const updatedItem = await storage.updateFoodItem(userId, id, {
          nutrition,
          weightInGrams: weightInGrams || undefined,
          usdaData: usdaData ? JSON.stringify(usdaData) : undefined,
        });
        
        res.json({ success: true, item: updatedItem });
      } else {
        res.status(404).json({ error: "No nutrition data found for this item" });
      }
    } catch (error) {
      console.error("Error refreshing nutrition data:", error);
      res.status(500).json({ error: "Failed to refresh nutrition data" });
    }
  });

  app.get("/api/food-categories", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const categories = await storage.getFoodCategories(userId);
      res.json(categories);
    } catch (error) {
      console.error("Error fetching food categories:", error);
      res.status(500).json({ error: "Failed to fetch food categories" });
    }
  });

  // Appliances (user-scoped)
  app.get("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const appliances = await storage.getAppliances(userId);
      res.json(appliances);
    } catch (error) {
      console.error("Error fetching appliances:", error);
      res.status(500).json({ error: "Failed to fetch appliances" });
    }
  });

  app.post("/api/appliances", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertApplianceSchema.parse(req.body);
      const appliance = await storage.createAppliance(userId, validated);
      res.json(appliance);
    } catch (error) {
      console.error("Error creating appliance:", error);
      res.status(400).json({ error: "Invalid appliance data" });
    }
  });

  app.delete("/api/appliances/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteAppliance(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting appliance:", error);
      res.status(500).json({ error: "Failed to delete appliance" });
    }
  });

  // FDC Food Search with Cache (public)
  app.get("/api/fdc/search", async (req, res) => {
    try {
      const { query, pageSize, pageNumber, dataType, sortBy, sortOrder, brandOwner } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 25;
      const page = pageNumber ? parseInt(pageNumber as string) : 1;
      
      // Parse dataType - can be comma-separated string or array
      let dataTypes: string[] = [];
      if (dataType) {
        if (Array.isArray(dataType)) {
          dataTypes = dataType as string[];
        } else if (typeof dataType === 'string') {
          dataTypes = dataType.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      
      // Parse brandOwner - Express automatically handles multiple params as array
      let brandOwners: string[] = [];
      if (brandOwner) {
        if (Array.isArray(brandOwner)) {
          brandOwners = brandOwner as string[];
        } else if (typeof brandOwner === 'string') {
          brandOwners = [brandOwner];
        }
      }
      
      const sort = sortBy as string | undefined;
      const order = sortOrder as string | undefined;

      // Only cache the simplest searches (query + page) to avoid stale results with filters
      // Advanced filters (dataType, sort, brand) bypass cache completely
      const hasAnyFilters = !!(sort || brandOwners.length > 0 || dataTypes.length > 0 || size !== 25);
      
      // Use shorter TTL for complex searches, longer TTL for simple searches
      const cachedResults = await storage.getCachedSearchResults(query, undefined, page, hasAnyFilters);
      if (cachedResults && 
          cachedResults.results &&
          cachedResults.pageSize === size) {
        console.log(`FDC search cache hit for query: ${query} (complex: ${hasAnyFilters})`);
        return res.json({
            foods: cachedResults.results,
            totalHits: cachedResults.totalHits,
            currentPage: page,
            totalPages: Math.ceil((cachedResults.totalHits || 0) / size),
            fromCache: true
          });
      }

      // If not in cache, call FDC API
      console.log(`FDC search calling API for query: ${query}`);
      
      // Build API URL
      const apiKey = process.env.FDC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "FDC API key not configured" });
      }

      const searchUrl = new URL('https://api.nal.usda.gov/fdc/v1/foods/search');
      searchUrl.searchParams.append('api_key', apiKey);
      searchUrl.searchParams.append('query', query);
      searchUrl.searchParams.append('pageSize', size.toString());
      searchUrl.searchParams.append('pageNumber', page.toString());
      
      // Add each dataType as a separate parameter for FDC API array handling
      if (dataTypes.length > 0) {
        dataTypes.forEach(type => {
          searchUrl.searchParams.append('dataType', type);
        });
      }
      
      if (sort) {
        searchUrl.searchParams.append('sortBy', sort);
      }
      
      if (order) {
        searchUrl.searchParams.append('sortOrder', order);
      }
      
      // Add each brandOwner as a separate parameter for FDC API array handling
      if (brandOwners.length > 0) {
        brandOwners.forEach(brand => {
          searchUrl.searchParams.append('brandOwner', brand);
        });
      }

      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`FDC API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Cache the search results (only for simple searches)
      const resultsToCache = data.foods?.map((food: any) => ({
        fdcId: food.fdcId.toString(),
        description: food.description || food.lowercaseDescription,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        score: food.score
      })) || [];

      // Cache all searches, but complex searches will have shorter TTL (2 hours vs 24 hours)
      // This is handled by the getCachedSearchResults method which checks isComplexSearch
      await storage.cacheSearchResults({
        query,
        dataType: null,
        pageNumber: page,
        pageSize: size,
        totalHits: data.totalHits || 0,
        results: resultsToCache
      });

      // Cache individual food items for faster detail lookups
      for (const food of (data.foods || [])) {
        const nutrients = food.foodNutrients?.map((n: any) => ({
          nutrientId: n.nutrientId,
          nutrientName: n.nutrientName,
          nutrientNumber: n.nutrientNumber,
          unitName: n.unitName,
          value: n.value
        })) || [];

        await storage.cacheFood({
          fdcId: food.fdcId.toString(),
          description: food.description || food.lowercaseDescription,
          dataType: food.dataType,
          brandOwner: food.brandOwner,
          brandName: food.brandName,
          ingredients: food.ingredients,
          servingSize: food.servingSize,
          servingSizeUnit: food.servingSizeUnit,
          nutrients,
          fullData: food
        });
      }

      res.json({
        foods: resultsToCache,
        totalHits: data.totalHits || 0,
        currentPage: page,
        totalPages: Math.ceil((data.totalHits || 0) / size),
        fromCache: false
      });
    } catch (error: any) {
      console.error("FDC search error:", error);
      res.status(500).json({ error: "Failed to search FDC database" });
    }
  });

  // FDC Food Details with Cache (public)
  app.get("/api/fdc/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;
      
      // Check cache first
      const cachedFood = await storage.getCachedFood(fdcId);
      if (cachedFood) {
        console.log(`FDC food cache hit for fdcId: ${fdcId}`);
        await storage.updateFoodLastAccessed(fdcId);
        return res.json({
          ...(cachedFood.fullData || {}),
          fromCache: true
        });
      }

      // If not in cache, call FDC API
      console.log(`FDC food cache miss for fdcId: ${fdcId}, calling API`);
      
      const apiKey = process.env.FDC_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "FDC API key not configured" });
      }

      const foodUrl = `https://api.nal.usda.gov/fdc/v1/food/${fdcId}?api_key=${apiKey}`;
      const response = await fetch(foodUrl);
      
      if (!response.ok) {
        if (response.status === 404) {
          return res.status(404).json({ error: "Food not found" });
        }
        throw new Error(`FDC API error: ${response.statusText}`);
      }

      const food = await response.json();
      
      // Cache the food item
      const nutrients = food.foodNutrients?.map((n: any) => ({
        nutrientId: n.nutrient?.id || n.nutrientId,
        nutrientName: n.nutrient?.name || n.nutrientName,
        nutrientNumber: n.nutrient?.number || n.nutrientNumber,
        unitName: n.nutrient?.unitName || n.unitName,
        value: n.amount || n.value || 0
      })) || [];

      await storage.cacheFood({
        fdcId: fdcId,
        description: food.description || food.lowercaseDescription,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients,
        fullData: food
      });

      res.json({
        ...food,
        fromCache: false
      });
    } catch (error: any) {
      console.error("FDC food details error:", error);
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Clear old cache entries (admin endpoint - could be scheduled)
  app.post("/api/fdc/cache/clear", async (req, res) => {
    try {
      const { daysOld = 30 } = req.body;
      await storage.clearOldCache(daysOld);
      res.json({ success: true, message: `Cleared cache entries older than ${daysOld} days` });
    } catch (error) {
      console.error("Error clearing cache:", error);
      res.status(500).json({ error: "Failed to clear cache" });
    }
  });

  // USDA Food Search (public) - Enhanced with all FDC search parameters
  app.get("/api/usda/search", async (req, res) => {
    try {
      const { query, pageSize, pageNumber, dataType, sortBy, sortOrder, brandOwner } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      const size = pageSize ? parseInt(pageSize as string) : 20;
      const page = pageNumber ? parseInt(pageNumber as string) : 1;
      
      // Parse dataType - can be comma-separated string or array
      let dataTypes: string[] = [];
      if (dataType) {
        if (Array.isArray(dataType)) {
          dataTypes = dataType as string[];
        } else if (typeof dataType === 'string') {
          dataTypes = dataType.split(',').map(t => t.trim()).filter(Boolean);
        }
      }
      
      // Parse brandOwner - can be comma-separated string or array
      let brandOwners: string[] = [];
      if (brandOwner) {
        if (Array.isArray(brandOwner)) {
          brandOwners = brandOwner as string[];
        } else if (typeof brandOwner === 'string') {
          brandOwners = brandOwner.split(',').map(b => b.trim()).filter(Boolean);
        }
      }

      const results = await searchUSDAFoods({
        query,
        pageSize: size,
        pageNumber: page,
        dataType: dataTypes.length > 0 ? dataTypes : undefined,
        sortBy: sortBy as any,
        sortOrder: sortOrder as any,
        brandOwner: brandOwners.length > 0 ? brandOwners : undefined
      });
      res.json(results);
    } catch (error: any) {
      console.error("USDA search error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to search USDA database" });
    }
  });

  app.get("/api/usda/food/:fdcId", async (req, res) => {
    try {
      const { fdcId } = req.params;
      const food = await getFoodByFdcId(Number(fdcId));
      if (!food) {
        return res.status(404).json({ error: "Food not found" });
      }
      res.json(food);
    } catch (error: any) {
      console.error("USDA food details error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch food details" });
    }
  });

  // Onboarding - Get enriched USDA data for common items (public - used during onboarding)
  app.get("/api/onboarding/enriched-item/:itemName", async (req: any, res) => {
    try {
      const { itemName } = req.params;
      const enrichedItem = await getEnrichedOnboardingItem(decodeURIComponent(itemName));
      
      if (!enrichedItem) {
        return res.status(404).json({ error: "Item not found in onboarding list" });
      }
      
      res.json(enrichedItem);
    } catch (error: any) {
      console.error("Error fetching enriched onboarding item:", error);
      res.status(500).json({ error: "Failed to fetch enriched item data" });
    }
  });

  // Barcode Lookup - Product Images (public)
  app.get("/api/barcodelookup/search", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { query } = req.query;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    
    try {
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Query parameter is required" });
      }

      // Check rate limits before making API call
      await checkRateLimitBeforeCall();

      apiCallMade = true;
      const results = await searchBarcodeLookup(query);
      
      const products = results.products.map(product => ({
        code: product.barcode_number || '',
        name: product.title || 'Unknown Product',
        brand: product.brand || '',
        imageUrl: extractImageUrl(product),
        description: product.description
      }));

      res.json({ products, count: products.length });
    } catch (error: any) {
      console.error("Barcode Lookup search error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to search Barcode Lookup" });
    } finally {
      // Use batched logging for better performance
      if (userId && apiCallMade) {
        try {
          await batchedApiLogger.logApiUsage(userId, {
            apiName: 'barcode_lookup',
            endpoint: 'search',
            queryParams: `query=${query}`,
            statusCode,
            success
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get("/api/barcodelookup/product/:barcode", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    const { barcode } = req.params;
    let apiCallMade = false;
    let statusCode = 200;
    let success = true;
    
    try {
      // Check rate limits before making API call
      await checkRateLimitBeforeCall();
      
      apiCallMade = true;
      const product = await getBarcodeLookupProduct(barcode);
      
      if (!product) {
        statusCode = 404;
        success = false;
        return res.status(404).json({ error: "Product not found" });
      }

      res.json({
        code: product.barcode_number || '',
        name: product.title || 'Unknown Product',
        brand: product.brand || '',
        imageUrl: extractImageUrl(product),
        description: product.description
      });
    } catch (error: any) {
      console.error("Barcode Lookup product error:", error);
      if (error instanceof ApiError) {
        statusCode = error.statusCode;
        success = false;
        return res.status(error.statusCode).json({ error: error.message });
      }
      statusCode = 500;
      success = false;
      res.status(500).json({ error: "Failed to fetch product details" });
    } finally {
      // Use batched logging for better performance
      if (userId && apiCallMade) {
        try {
          await batchedApiLogger.logApiUsage(userId, {
            apiName: 'barcode_lookup',
            endpoint: 'product',
            queryParams: `barcode=${barcode}`,
            statusCode,
            success
          });
        } catch (logError) {
          console.error("Failed to log API usage:", logError);
        }
      }
    }
  });

  app.get("/api/barcodelookup/rate-limits", isAuthenticated, async (req, res) => {
    try {
      const limits = await getBarcodeLookupRateLimits();
      res.json(limits);
    } catch (error: any) {
      console.error("Barcode Lookup rate limits error:", error);
      if (error instanceof ApiError) {
        return res.status(error.statusCode).json({ error: error.message });
      }
      res.status(500).json({ error: "Failed to fetch rate limits" });
    }
  });

  app.get("/api/barcodelookup/usage/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { days } = req.query;
      const daysParam = days ? parseInt(days as string) : 30;
      
      const stats = await storage.getApiUsageStats(userId, 'barcode_lookup', daysParam);
      res.json(stats);
    } catch (error) {
      console.error("Error fetching API usage stats:", error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.get("/api/barcodelookup/usage/logs", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { limit } = req.query;
      const limitParam = limit ? parseInt(limit as string) : 50;
      
      const logs = await storage.getApiUsageLogs(userId, 'barcode_lookup', limitParam);
      res.json(logs);
    } catch (error) {
      console.error("Error fetching API usage logs:", error);
      res.status(500).json({ error: "Failed to fetch usage logs" });
    }
  });

  // Object Storage - Image Uploads (referenced from blueprint:javascript_object_storage)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    const objectStorageService = new ObjectStorageService();
    try {
      const objectFile = await objectStorageService.getObjectEntityFile(req.path);
      objectStorageService.downloadObject(objectFile, res);
    } catch (error) {
      console.error("Error serving object:", error);
      if (error instanceof ObjectNotFoundError) {
        return res.sendStatus(404);
      }
      return res.sendStatus(500);
    }
  });

  app.post("/api/objects/upload", isAuthenticated, async (_req, res) => {
    try {
      const objectStorageService = new ObjectStorageService();
      const uploadURL = await objectStorageService.getObjectEntityUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  app.put("/api/food-images", isAuthenticated, async (req, res) => {
    if (!req.body.imageURL) {
      return res.status(400).json({ error: "imageURL is required" });
    }

    try {
      const objectStorageService = new ObjectStorageService();
      const objectPath = objectStorageService.normalizeObjectEntityPath(req.body.imageURL);
      res.status(200).json({ objectPath });
    } catch (error) {
      console.error("Error setting food image:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Chat Messages (user-scoped) - Now with pagination support
  app.get("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      
      // Trigger automatic cleanup of old messages (runs in background)
      cleanupOldMessagesForUser(userId).catch(err => 
        console.error('Background cleanup error:', err)
      );
      
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100 per page
      
      // If pagination params are provided, use paginated method
      if (req.query.page || req.query.limit) {
        const result = await storage.getChatMessagesPaginated(userId, page, limit);
        res.json(result);
      } else {
        // Fallback to non-paginated for backward compatibility
        const messages = await storage.getChatMessages(userId);
        res.json(messages);
      }
    } catch (error) {
      console.error("Error fetching chat messages:", error);
      res.status(500).json({ error: "Failed to fetch chat messages" });
    }
  });

  // Create a single chat message
  app.post("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const messageData = {
        role: req.body.role,
        content: req.body.content,
        metadata: req.body.metadata || null
      };
      const message = await storage.createChatMessage(userId, messageData);
      res.json(message);
    } catch (error) {
      console.error("Error creating chat message:", error);
      res.status(400).json({ error: "Invalid chat message data" });
    }
  });

  // Clear all chat messages for a user
  app.delete("/api/chat/messages", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearChatMessages(userId);
      res.json({ success: true, message: "Chat history cleared" });
    } catch (error) {
      console.error("Error clearing chat messages:", error);
      res.status(500).json({ error: "Failed to clear chat history" });
    }
  });

  // Delete old chat messages (older than specified hours)
  app.post("/api/chat/messages/cleanup", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { hoursOld = 24 } = req.body;
      const deleted = await storage.deleteOldChatMessages(userId, hoursOld);
      res.json({ success: true, deletedCount: deleted, message: `Deleted messages older than ${hoursOld} hours` });
    } catch (error) {
      console.error("Error cleaning up chat messages:", error);
      res.status(500).json({ error: "Failed to cleanup chat messages" });
    }
  });

  // Define schema for chat message validation
  const chatMessageRequestSchema = z.object({
    message: z.string()
      .min(1, "Message cannot be empty")
      .max(10000, "Message is too long (max 10,000 characters)")
      .trim()
  });

  app.post("/api/chat", isAuthenticated, async (req: any, res) => {
    const abortController = new AbortController();
    
    req.on('close', () => {
      abortController.abort();
    });

    try {
      const userId = req.user.claims.sub;
      
      // Validate request body using Zod
      const validation = chatMessageRequestSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          error: "Invalid message format",
          details: validation.error.issues 
        });
      }
      
      const { message } = validation.data;

      // Save user message
      await storage.createChatMessage(userId, {
        role: "user",
        content: message,
        metadata: null,
      });

      // Get current inventory and appliances for context
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);
      const storageLocations = await storage.getStorageLocations(userId);

      // Optimize inventory context for large inventories
      // Prioritize: 1) expiring items, 2) recently added items
      const now = new Date();
      const prioritizedItems = foodItems
        .map(item => {
          const daysToExpiry = item.expirationDate 
            ? Math.ceil((new Date(item.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
            : Infinity;
          return { ...item, daysToExpiry };
        })
        .sort((a, b) => {
          // Sort by expiring soon first, then by most recently created
          if (a.daysToExpiry !== b.daysToExpiry) {
            return a.daysToExpiry - b.daysToExpiry;
          }
          return 0;
        })
        .slice(0, 100); // Limit to top 100 items to prevent excessive context size

      const inventoryContext = prioritizedItems.map(item => {
        const location = storageLocations.find(loc => loc.id === item.storageLocationId);
        const expiryNote = item.expirationDate && item.daysToExpiry < 7 
          ? ` (expires in ${item.daysToExpiry} days)` 
          : '';
        return `${item.name} (${item.quantity} ${item.unit || ''}) in ${location?.name || 'unknown'}${expiryNote}`;
      }).join(', ');

      const totalItemCount = foodItems.length;
      const contextNote = totalItemCount > 100 
        ? ` [Showing ${prioritizedItems.length} of ${totalItemCount} items - prioritizing expiring and recent items]` 
        : '';

      const appliancesContext = appliances.map(a => a.name).join(', ');

      const systemPrompt = `You are an AI Chef assistant. You help users manage their food inventory and suggest recipes.

Current inventory: ${inventoryContext || 'No items in inventory'}${contextNote}
Available appliances: ${appliancesContext || 'No appliances registered'}

Your tasks:
1. Answer cooking and recipe questions
2. Help users add, update, or remove food items from their inventory
3. Suggest recipes based on available ingredients
4. Provide cooking tips and guidance

When the user asks to add items, respond with the details and suggest saving them to inventory.
When asked for recipes, consider the available inventory and appliances.`;

      // Stream response from OpenAI
      let stream;
      try {
        stream = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: message }
          ],
          stream: true,
          max_completion_tokens: 8192,
        });
      } catch (openaiError: any) {
        console.error("OpenAI API error:", {
          message: openaiError.message,
          status: openaiError.status,
          code: openaiError.code,
          type: openaiError.type,
          requestId: openaiError.headers?.['x-request-id'],
        });
        
        const errorMessage = openaiError.status === 429 
          ? "Rate limit exceeded. Please try again in a moment."
          : openaiError.status === 401 || openaiError.status === 403
          ? "Authentication failed with OpenAI API."
          : openaiError.message || "Failed to connect to AI service.";
        
        return res.status(openaiError.status || 500).json({ 
          error: errorMessage,
          details: openaiError.code,
        });
      }

      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let fullResponse = '';
      let streamCompleted = false;

      try {
        for await (const chunk of stream) {
          if (abortController.signal.aborted) {
            console.log("Stream aborted by client disconnect");
            break;
          }
          
          const content = chunk.choices[0]?.delta?.content || '';
          if (content) {
            fullResponse += content;
            try {
              res.write(`data: ${JSON.stringify({ content })}\n\n`);
            } catch (writeError) {
              console.error("Error writing to stream:", writeError);
              break;
            }
          }
        }

        streamCompleted = true;

        // Save AI response only if stream completed successfully and client is still connected
        if (fullResponse && !abortController.signal.aborted) {
          await storage.createChatMessage(userId, {
            role: "assistant",
            content: fullResponse,
            metadata: null,
          });
        }

        // Only write and end response if client is still connected and response is writable
        if (!abortController.signal.aborted && !res.writableEnded) {
          try {
            res.write('data: [DONE]\n\n');
            res.end();
          } catch (finalWriteError) {
            console.error("Error in final write to stream:", finalWriteError);
          }
        } else if (!res.writableEnded) {
          res.end();
        }
      } catch (streamError: any) {
        console.error("Streaming error:", {
          message: streamError.message,
          code: streamError.code,
          aborted: abortController.signal.aborted,
        });
        
        if (!res.writableEnded) {
          const errorData = {
            error: abortController.signal.aborted 
              ? "Stream cancelled" 
              : "Stream interrupted unexpectedly. Please try again.",
            type: streamError.code || 'stream_error',
          };
          res.write(`data: ${JSON.stringify(errorData)}\n\n`);
          res.end();
        }
      }
    } catch (error: any) {
      console.error("Chat error:", {
        message: error.message,
        stack: error.stack,
        userId: req.user?.claims?.sub,
      });
      
      if (!res.headersSent) {
        res.status(500).json({ 
          error: "Failed to process chat message",
          details: error.message,
        });
      } else {
        res.end();
      }
    }
  });

  // Recipe Generation (user-scoped)
  app.post("/api/recipes/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const appliances = await storage.getAppliances(userId);

      // Extract customization preferences if provided
      const {
        timeConstraint = "moderate",
        servings = 4,
        difficulty = "intermediate",
        mealType = "dinner",
        creativity = 5,
        onlyUseOnHand = true
      } = req.body;

      // Only require inventory if onlyUseOnHand is true
      if (onlyUseOnHand && foodItems.length === 0) {
        return res.status(400).json({ error: "No ingredients in inventory. Turn off 'Only use ingredients on hand' to generate recipes without inventory." });
      }

      // Sort items by expiration date to prioritize expiring items
      const now = new Date();
      const sortedItems = foodItems.sort((a, b) => {
        // Items without expiration dates go to the end
        if (!a.expirationDate && !b.expirationDate) return 0;
        if (!a.expirationDate) return 1;
        if (!b.expirationDate) return -1;
        
        // Sort by expiration date (earliest first)
        return new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime();
      });

      // Categorize ingredients by urgency
      const expiringIngredients: any[] = [];
      const freshIngredients: any[] = [];
      const stableIngredients: any[] = [];

      sortedItems.forEach(item => {
        const daysUntilExpiration = item.expirationDate 
          ? Math.floor((new Date(item.expirationDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
          : null;

        const ingredientInfo = {
          name: item.name,
          quantity: item.quantity,
          unit: item.unit || '',
          expiresIn: daysUntilExpiration
        };

        if (daysUntilExpiration !== null && daysUntilExpiration <= 3) {
          expiringIngredients.push(ingredientInfo);
        } else if (daysUntilExpiration !== null && daysUntilExpiration <= 7) {
          freshIngredients.push(ingredientInfo);
        } else {
          stableIngredients.push(ingredientInfo);
        }
      });

      // Create detailed ingredient lists for the prompt
      const formatIngredientList = (items: any[]) => items.map(item => {
        const expiryNote = item.expiresIn !== null 
          ? item.expiresIn <= 0 
            ? " [EXPIRES TODAY]" 
            : item.expiresIn === 1 
              ? " [EXPIRES TOMORROW]"
              : ` [expires in ${item.expiresIn} days]`
          : "";
        return `${item.name} (${item.quantity} ${item.unit})${expiryNote}`;
      }).join(', ');

      const urgentIngredientsList = formatIngredientList(expiringIngredients);
      const freshIngredientsList = formatIngredientList(freshIngredients);
      const stableIngredientsList = formatIngredientList(stableIngredients);

      const appliancesList = appliances.map(a => a.name).join(', ');

      // Map time constraint to actual time ranges
      const timeMap = {
        "quick": "under 30 minutes total",
        "moderate": "30-60 minutes total",
        "elaborate": "over 60 minutes total"
      };

      // Map creativity to style guidance
      const creativityGuidance = creativity <= 3 ? "traditional and familiar" :
        creativity <= 7 ? "balanced mix of familiar with some creative elements" :
        "experimental and innovative with unique flavor combinations";

      const onlyUseOnHandInstructions = onlyUseOnHand
        ? `4. ONLY use ingredients from the available list above. Do NOT suggest any ingredients that are not listed.
5. If you need basic seasonings (salt, pepper, oil), you may include them ONLY if absolutely necessary.`
        : `4. You MAY suggest additional ingredients that would enhance the recipe, even if they're not in the available list.
5. Clearly distinguish between ingredients that are available vs. those that need to be purchased.`;

      const prompt = foodItems.length > 0 
        ? `You are an intelligent kitchen assistant that creates recipes based on available ingredients, prioritizing items that are expiring soon to minimize food waste.

AVAILABLE INGREDIENTS:
${expiringIngredients.length > 0 ? `
⚠️ URGENT - USE FIRST (expiring within 3 days):
${urgentIngredientsList}` : ''}
${freshIngredients.length > 0 ? `
Fresh ingredients (expiring within 7 days):
${freshIngredientsList}` : ''}
${stableIngredients.length > 0 ? `
Stable ingredients:
${stableIngredientsList}` : ''}

Available cooking appliances: ${appliancesList}`
        : `You are an intelligent kitchen assistant that creates recipes. The user has no ingredients in their inventory, so you'll need to suggest a complete recipe with all necessary ingredients.

Available cooking appliances: ${appliancesList}`;

      const recipeInstructions = foodItems.length > 0 
        ? `CRITICAL INSTRUCTIONS:
1. PRIORITIZE using ingredients marked as "URGENT" or expiring soon
2. Try to use AS MANY expiring ingredients as possible while still creating a delicious meal
3. You don't need to use ALL ingredients, but focus on those expiring first
${onlyUseOnHandInstructions}
6. Adjust quantities to match the requested number of servings (${servings})
7. Ensure total time fits within ${timeMap[timeConstraint as keyof typeof timeMap]}`
        : `INSTRUCTIONS:
1. Create a complete recipe with all necessary ingredients
2. All ingredients will be listed as "missing" since the user has no inventory
${onlyUseOnHandInstructions}
4. Adjust quantities to match the requested number of servings (${servings})
5. Ensure total time fits within ${timeMap[timeConstraint as keyof typeof timeMap]}`;

      const fullPrompt = `${prompt}

Recipe Requirements:
- Meal Type: ${mealType}
- Servings: ${servings} servings
- Time Constraint: ${timeMap[timeConstraint as keyof typeof timeMap]}
- Difficulty Level: ${difficulty}
- Style: ${creativityGuidance}
- Ingredient Restriction: ${onlyUseOnHand ? 'ONLY use ingredients on hand' : 'Can suggest additional ingredients'}

${recipeInstructions}

Respond ONLY with a valid JSON object in this exact format:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes", 
  "servings": ${servings},
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2"],
  "usedIngredients": ["ingredient from inventory"],
  "missingIngredients": ["ingredient not in inventory"]
}`;

      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: fullPrompt }],
          response_format: { type: "json_object" },
          max_completion_tokens: 1500,
        });
      } catch (openAIError: any) {
        console.error("OpenAI API error:", openAIError);
        if (openAIError.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }
        if (openAIError.status === 401 || openAIError.status === 403) {
          return res.status(503).json({ error: "AI service configuration error. Please contact support." });
        }
        return res.status(500).json({ error: "AI service temporarily unavailable" });
      }

      const recipeData = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      const recipe = await storage.createRecipe(userId, {
        title: recipeData.title,
        prepTime: recipeData.prepTime,
        cookTime: recipeData.cookTime,
        servings: recipeData.servings,
        ingredients: recipeData.ingredients,
        instructions: recipeData.instructions,
        usedIngredients: recipeData.usedIngredients,
        missingIngredients: recipeData.missingIngredients || [],
      });

      res.json(recipe);
    } catch (error) {
      console.error("Recipe generation error:", error);
      res.status(500).json({ error: "Failed to generate recipe" });
    }
  });

  app.get("/api/recipes", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50); // Max 50 per page
      const includeMatching = req.query.includeMatching === 'true';
      
      // If requesting inventory matching, use enriched method
      if (includeMatching) {
        const recipesWithMatching = await storage.getRecipesWithInventoryMatching(userId);
        res.json(recipesWithMatching);
      } else if (req.query.page || req.query.limit) {
        // If pagination params are provided, use paginated method
        const result = await storage.getRecipesPaginated(userId, page, limit);
        res.json(result);
      } else {
        // Fallback to non-paginated for backward compatibility
        const recipes = await storage.getRecipes(userId);
        res.json(recipes);
      }
    } catch (error) {
      console.error("Error fetching recipes:", error);
      res.status(500).json({ error: "Failed to fetch recipes" });
    }
  });

  app.patch("/api/recipes/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const recipe = await storage.updateRecipe(userId, id, req.body);
      res.json(recipe);
    } catch (error) {
      console.error("Error updating recipe:", error);
      res.status(400).json({ error: "Failed to update recipe" });
    }
  });

  // Process recipe from image upload
  app.post("/api/recipes/from-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { image } = req.body; // Base64 encoded image or image URL
      
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Create the prompt for recipe extraction
      const extractionPrompt = `You are a recipe extraction expert. Analyze this image of a recipe and extract all the information.
      
Return ONLY a valid JSON object with the following structure:
{
  "title": "Recipe name",
  "prepTime": "X minutes",
  "cookTime": "X minutes",
  "servings": number,
  "ingredients": ["ingredient 1 with quantity", "ingredient 2 with quantity"],
  "instructions": ["step 1", "step 2", "step 3"],
  "usedIngredients": [],
  "missingIngredients": []
}

Important:
- Extract ALL ingredients with their exact quantities
- Break down instructions into clear, numbered steps
- If prep time or cook time is not visible, estimate based on recipe complexity
- If servings is not specified, estimate based on ingredient quantities
- Leave usedIngredients and missingIngredients as empty arrays
- Ensure the JSON is properly formatted and parseable`;

      // Prepare the message with image
      const imageContent = image.startsWith('http') 
        ? { type: "image_url" as const, image_url: { url: image } }
        : { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image}` } };

      // Call OpenAI with vision capabilities
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: extractionPrompt },
                imageContent
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 8192,
        });
      } catch (openAIError: any) {
        console.error("OpenAI Vision API error:", openAIError);
        if (openAIError.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }
        if (openAIError.status === 401 || openAIError.status === 403) {
          return res.status(503).json({ error: "AI service configuration error. Please contact support." });
        }
        return res.status(500).json({ error: "Failed to process image with AI service" });
      }

      const extractedData = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      // Validate the extracted data
      if (!extractedData.title || !extractedData.ingredients || !extractedData.instructions) {
        throw new Error("Could not extract complete recipe information from the image");
      }

      // Create the recipe in the database
      const recipe = await storage.createRecipe(userId, {
        title: extractedData.title,
        prepTime: extractedData.prepTime || "Unknown",
        cookTime: extractedData.cookTime || "Unknown",
        servings: extractedData.servings || 4,
        ingredients: extractedData.ingredients || [],
        instructions: extractedData.instructions || [],
        usedIngredients: extractedData.usedIngredients || [],
        missingIngredients: extractedData.missingIngredients || [],
      });

      res.json(recipe);
    } catch (error: any) {
      console.error("Recipe image processing error:", error);
      res.status(500).json({ 
        error: "Failed to extract recipe from image",
        details: error.message || "Unknown error occurred"
      });
    }
  });

  // Analyze food item from image (for leftovers)
  app.post("/api/food/analyze-image", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { image } = req.body; // Base64 encoded image or image URL
      
      if (!image) {
        return res.status(400).json({ error: "No image provided" });
      }

      // Create the prompt for food analysis
      const analysisPrompt = `You are a food analysis expert. Analyze this image of a leftover meal or food item and extract nutritional information.
      
Return ONLY a valid JSON object with the following structure:
{
  "name": "Name of the dish or food item",
  "quantity": "Estimated portion size (e.g., '1 cup', '200g', '1 serving', '1 plate')",
  "unit": "The unit from quantity (e.g., 'cup', 'g', 'serving', 'plate')",
  "category": "Category (produce, dairy, meat, grains, leftovers, prepared_meal, etc.)",
  "ingredients": [
    {
      "name": "Ingredient name",
      "quantity": "Estimated amount",
      "unit": "Unit (g, oz, cup, tbsp, etc.)"
    }
  ],
  "calories": number (estimated total calories),
  "protein": number (estimated grams of protein),
  "carbs": number (estimated grams of carbohydrates),
  "fat": number (estimated grams of fat),
  "confidence": number (0-100, how confident you are in the analysis)
}

Important:
- Identify the main dish/food item and give it a descriptive name
- Estimate realistic portion sizes based on visual cues (plates, utensils, containers)
- Break down visible ingredients with approximate quantities
- Provide nutritional estimates based on typical recipes and portion sizes
- Use confidence score to indicate certainty (100 = very clear image and common dish, 50 = unclear or unusual)
- For complex dishes, list main visible ingredients
- Consider cooking methods (fried, grilled, steamed) when estimating nutrition
- If it's clearly a leftover meal, categorize as "leftovers" or "prepared_meal"`;

      // Prepare the message with image
      const imageContent = image.startsWith('http') 
        ? { type: "image_url" as const, image_url: { url: image } }
        : { type: "image_url" as const, image_url: { url: `data:image/jpeg;base64,${image}` } };

      // Call OpenAI with vision capabilities
      let completion;
      try {
        completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "user",
              content: [
                { type: "text", text: analysisPrompt },
                imageContent
              ]
            }
          ],
          response_format: { type: "json_object" },
          max_completion_tokens: 8192,
        });
      } catch (openAIError: any) {
        console.error("OpenAI Vision API error:", openAIError);
        if (openAIError.status === 429) {
          return res.status(429).json({ error: "Rate limit exceeded. Please try again later." });
        }
        if (openAIError.status === 401 || openAIError.status === 403) {
          return res.status(503).json({ error: "AI service configuration error. Please contact support." });
        }
        return res.status(500).json({ error: "Failed to process image with AI service" });
      }

      const analysisData = JSON.parse(completion.choices[0]?.message?.content || "{}");
      
      // Validate the analyzed data
      if (!analysisData.name || analysisData.confidence === undefined) {
        throw new Error("Could not analyze food item from the image");
      }

      // Return the analysis (don't save to database yet, let frontend handle that)
      res.json({
        success: true,
        analysis: analysisData
      });
    } catch (error: any) {
      console.error("Food image analysis error:", error);
      res.status(500).json({ 
        error: "Failed to analyze food from image",
        details: error.message || "Unknown error occurred"
      });
    }
  });

  // Expiration Notifications (user-scoped)
  app.get("/api/notifications/expiration", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const notifications = await storage.getExpirationNotifications(userId);
      
      const now = new Date();
      const validNotifications = notifications
        .map(notification => {
          const expiry = new Date(notification.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...notification, daysUntilExpiry: daysUntil };
        })
        .filter(notification => notification.daysUntilExpiry >= 0);
      
      res.json(validNotifications);
    } catch (error) {
      console.error("Error fetching expiration notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });

  app.post("/api/notifications/expiration/check", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expiringItems = await storage.getExpiringItems(userId, 3);
      const now = new Date();
      
      const existingNotifications = await storage.getExpirationNotifications(userId);
      
      const existingItemIds = new Set(expiringItems.map(item => item.id));
      for (const notification of existingNotifications) {
        const expiry = new Date(notification.expirationDate);
        const isExpired = expiry.getTime() < now.getTime();
        const itemNoLongerExists = !existingItemIds.has(notification.foodItemId);
        
        if (isExpired || itemNoLongerExists) {
          await storage.dismissNotification(userId, notification.id);
        }
      }
      
      const existingNotificationItemIds = new Set(existingNotifications.map(n => n.foodItemId));
      
      for (const item of expiringItems) {
        if (!existingNotificationItemIds.has(item.id) && item.expirationDate) {
          const expiry = new Date(item.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysUntil >= 0) {
            await storage.createExpirationNotification(userId, {
              foodItemId: item.id,
              foodItemName: item.name,
              expirationDate: item.expirationDate,
              daysUntilExpiry: daysUntil,
              dismissed: false,
            });
          }
        }
      }
      
      const notifications = await storage.getExpirationNotifications(userId);
      const validNotifications = notifications
        .map(notification => {
          const expiry = new Date(notification.expirationDate);
          const daysUntil = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          return { ...notification, daysUntilExpiry: daysUntil };
        })
        .filter(notification => notification.daysUntilExpiry >= 0);
      
      res.json({ notifications: validNotifications, count: validNotifications.length });
    } catch (error) {
      console.error("Notification check error:", error);
      res.status(500).json({ error: "Failed to check for expiring items" });
    }
  });

  app.post("/api/notifications/:id/dismiss", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.dismissNotification(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error dismissing notification:", error);
      res.status(500).json({ error: "Failed to dismiss notification" });
    }
  });

  // Nutrition Statistics (user-scoped)
  app.get("/api/nutrition/stats", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let itemsWithNutrition = 0;
      
      const categoryBreakdown: Record<string, { calories: number; count: number }> = {};
      
      foodItems.forEach(item => {
        if (item.nutrition && item.weightInGrams) {
          try {
            const nutrition = JSON.parse(item.nutrition);
            const servingSize = parseFloat(nutrition.servingSize) || 100;
            // Multiplier is weightInGrams / servingSize
            const multiplier = item.weightInGrams / servingSize;
            
            totalCalories += nutrition.calories * multiplier;
            totalProtein += nutrition.protein * multiplier;
            totalCarbs += nutrition.carbs * multiplier;
            totalFat += nutrition.fat * multiplier;
            itemsWithNutrition++;
            
            const locationId = item.storageLocationId;
            if (!categoryBreakdown[locationId]) {
              categoryBreakdown[locationId] = { calories: 0, count: 0 };
            }
            categoryBreakdown[locationId].calories += nutrition.calories * multiplier;
            categoryBreakdown[locationId].count++;
          } catch (e) {
            // Skip items with invalid nutrition data
          }
        }
      });
      
      res.json({
        totalCalories: Math.round(totalCalories),
        totalProtein: Math.round(totalProtein * 10) / 10,
        totalCarbs: Math.round(totalCarbs * 10) / 10,
        totalFat: Math.round(totalFat * 10) / 10,
        itemsWithNutrition,
        totalItems: foodItems.length,
        categoryBreakdown,
      });
    } catch (error) {
      console.error("Error fetching nutrition stats:", error);
      res.status(500).json({ error: "Failed to fetch nutrition stats" });
    }
  });

  app.get("/api/nutrition/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const locations = await storage.getStorageLocations(userId);
      
      const itemsWithNutrition = foodItems
        .filter(item => item.nutrition && item.weightInGrams)
        .map(item => {
          const location = locations.find(loc => loc.id === item.storageLocationId);
          let nutrition = null;
          try {
            nutrition = JSON.parse(item.nutrition!);
          } catch (e) {
            // Skip invalid nutrition
          }
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            weightInGrams: item.weightInGrams,
            locationName: location?.name || "Unknown",
            nutrition,
          };
        })
        .filter(item => item.nutrition !== null);
      
      res.json(itemsWithNutrition);
    } catch (error) {
      console.error("Error fetching nutrition items:", error);
      res.status(500).json({ error: "Failed to fetch nutrition items" });
    }
  });

  app.get("/api/nutrition/items/missing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const foodItems = await storage.getFoodItems(userId);
      const locations = await storage.getStorageLocations(userId);
      
      const itemsWithoutNutrition = foodItems
        .filter(item => !item.nutrition || !item.weightInGrams)
        .map(item => {
          const location = locations.find(loc => loc.id === item.storageLocationId);
          return {
            id: item.id,
            name: item.name,
            quantity: item.quantity,
            unit: item.unit,
            fcdId: item.fcdId,
            locationName: location?.name || "Unknown",
          };
        });
      
      res.json(itemsWithoutNutrition);
    } catch (error) {
      console.error("Error fetching items missing nutrition:", error);
      res.status(500).json({ error: "Failed to fetch items missing nutrition" });
    }
  });

  // Waste reduction suggestions (user-scoped)
  app.get("/api/suggestions/waste-reduction", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const expiringItems = await storage.getExpiringItems(userId, 5);
      
      if (expiringItems.length === 0) {
        return res.json({ suggestions: [] });
      }

      const ingredientsList = expiringItems.map(item => 
        `${item.name} (${item.quantity} ${item.unit || ''}, expires in ${
          Math.ceil((new Date(item.expirationDate!).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        } days)`
      ).join(', ');

      const appliances = await storage.getAppliances(userId);
      const appliancesList = appliances.map(a => a.name).join(', ');

      const prompt = `Generate waste reduction suggestions for these food items that are expiring soon: ${ingredientsList}.
Available appliances: ${appliancesList}.

Provide 2-3 practical suggestions to use these ingredients before they expire. Be concise and actionable.

Respond ONLY with a valid JSON object:
{
  "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"]
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        max_completion_tokens: 8192,
      });

      const data = JSON.parse(completion.choices[0].message.content || '{"suggestions":[]}');
      res.json(data);
    } catch (error) {
      console.error("Waste reduction error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // Meal Plans (user-scoped)
  app.get("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { startDate, endDate } = req.query;
      const plans = await storage.getMealPlans(
        userId,
        startDate as string | undefined,
        endDate as string | undefined
      );
      res.json(plans);
    } catch (error) {
      console.error("Error fetching meal plans:", error);
      res.status(500).json({ error: "Failed to fetch meal plans" });
    }
  });

  app.post("/api/meal-plans", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const validated = insertMealPlanSchema.parse(req.body);
      const plan = await storage.createMealPlan(userId, validated);
      res.json(plan);
    } catch (error) {
      console.error("Error creating meal plan:", error);
      res.status(400).json({ error: "Invalid meal plan data" });
    }
  });

  app.put("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const validated = insertMealPlanSchema.partial().parse(req.body);
      const plan = await storage.updateMealPlan(userId, id, validated);
      res.json(plan);
    } catch (error) {
      console.error("Error updating meal plan:", error);
      res.status(400).json({ error: "Failed to update meal plan" });
    }
  });

  app.delete("/api/meal-plans/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteMealPlan(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting meal plan:", error);
      res.status(500).json({ error: "Failed to delete meal plan" });
    }
  });

  // Shopping list generation (user-scoped)
  app.post("/api/shopping-list/generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeIds } = req.body;

      if (!recipeIds || !Array.isArray(recipeIds) || recipeIds.length === 0) {
        return res.status(400).json({ error: "Recipe IDs are required" });
      }

      const recipes = await Promise.all(
        recipeIds.map((id: string) => storage.getRecipe(userId, id))
      );

      const validRecipes = recipes.filter(r => r !== undefined);
      if (validRecipes.length === 0) {
        return res.status(404).json({ error: "No valid recipes found" });
      }

      const allMissingIngredients = validRecipes.flatMap(r => r!.missingIngredients || []);
      const uniqueIngredients = Array.from(new Set(allMissingIngredients));

      res.json({ items: uniqueIngredients });
    } catch (error) {
      console.error("Shopping list error:", error);
      res.status(500).json({ error: "Failed to generate shopping list" });
    }
  });

  // Shopping List Item endpoints
  app.get("/api/shopping-list/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const items = await storage.getShoppingListItems(userId);
      res.json(items);
    } catch (error) {
      console.error("Error fetching shopping list items:", error);
      res.status(500).json({ error: "Failed to fetch shopping list items" });
    }
  });

  app.post("/api/shopping-list/items", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const newItem = await storage.createShoppingListItem(userId, req.body);
      res.json(newItem);
    } catch (error) {
      console.error("Error creating shopping list item:", error);
      res.status(500).json({ error: "Failed to create shopping list item" });
    }
  });

  app.post("/api/shopping-list/add-missing", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { recipeId, ingredients } = req.body;

      if (!recipeId || !ingredients || !Array.isArray(ingredients)) {
        return res.status(400).json({ error: "Recipe ID and ingredients array are required" });
      }

      const newItems = await storage.addMissingIngredientsToShoppingList(userId, recipeId, ingredients);
      res.json(newItems);
    } catch (error) {
      console.error("Error adding missing ingredients:", error);
      res.status(500).json({ error: "Failed to add missing ingredients to shopping list" });
    }
  });

  app.patch("/api/shopping-list/items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      const updated = await storage.updateShoppingListItem(userId, id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Error updating shopping list item:", error);
      res.status(500).json({ error: "Failed to update shopping list item" });
    }
  });

  app.delete("/api/shopping-list/items/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const { id } = req.params;
      await storage.deleteShoppingListItem(userId, id);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting shopping list item:", error);
      res.status(500).json({ error: "Failed to delete shopping list item" });
    }
  });

  app.delete("/api/shopping-list/clear-checked", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      await storage.clearCheckedShoppingListItems(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error clearing checked items:", error);
      res.status(500).json({ error: "Failed to clear checked items" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
