// Referenced from blueprint:javascript_log_in_with_replit - Added user operations and user-scoped data
import { 
  type User,
  type UpsertUser,
  type UserPreferences,
  type InsertUserPreferences,
  type StorageLocation, 
  type InsertStorageLocation,
  type Appliance,
  type InsertAppliance,
  type ApplianceCategory,
  type InsertApplianceCategory,
  type BarcodeProduct,
  type InsertBarcodeProduct,
  type FoodItem,
  type InsertFoodItem,
  type ChatMessage,
  type InsertChatMessage,
  type Recipe,
  type InsertRecipe,
  type ExpirationNotification,
  type InsertExpirationNotification,
  type MealPlan,
  type InsertMealPlan,
  type ApiUsageLog,
  type InsertApiUsageLog,
  type FdcCache,
  type InsertFdcCache,
  type FdcSearchCache,
  type InsertFdcSearchCache,
  type ShoppingListItem,
  type InsertShoppingListItem,
  type Feedback,
  type InsertFeedback,
  type FeedbackUpvote,
  type InsertFeedbackUpvote,
  type FeedbackResponse,
  type InsertFeedbackResponse,
  type FeedbackAnalytics,
  type Donation,
  type InsertDonation,
  type PushToken,
  type InsertPushToken,
  type WebVital,
  type InsertWebVital,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type InsertOrderItem,
  type CartItem,
  type InsertCartItem,
  users,
  userPreferences,
  pushTokens,
  storageLocations,
  appliances,
  applianceCategories,
  barcodeProducts,
  foodItems,
  chatMessages,
  recipes,
  expirationNotifications,
  mealPlans,
  apiUsageLogs,
  fdcCache,
  fdcSearchCache,
  shoppingListItems,
  feedback,
  feedbackUpvotes,
  feedbackResponses,
  donations,
  webVitals,
  products,
  orders,
  orderItems,
  cartItems
} from "@shared/schema";
import { db } from "./db";
import { eq, sql, and } from "drizzle-orm";
import { matchIngredientWithInventory, type IngredientMatch } from "./utils/unitConverter";

export interface IStorage {
  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;
  
  // User Preferences
  getUserPreferences(userId: string): Promise<UserPreferences | undefined>;
  upsertUserPreferences(preferences: InsertUserPreferences & { userId: string }): Promise<UserPreferences>;
  
  // Push Tokens (user-scoped)
  getPushTokens(userId: string): Promise<PushToken[]>;
  upsertPushToken(userId: string, token: Omit<InsertPushToken, 'userId'>): Promise<PushToken>;
  deletePushToken(userId: string, token: string): Promise<void>;
  
  // Storage Locations (user-scoped)
  getStorageLocations(userId: string): Promise<StorageLocation[]>;
  getStorageLocation(userId: string, id: string): Promise<StorageLocation | undefined>;
  createStorageLocation(userId: string, location: Omit<InsertStorageLocation, 'userId'>): Promise<StorageLocation>;

  // Appliances (user-scoped)
  getAppliances(userId: string): Promise<Appliance[]>;
  getAppliance(userId: string, id: string): Promise<Appliance | undefined>;
  createAppliance(userId: string, appliance: Omit<InsertAppliance, 'userId'>): Promise<Appliance>;
  updateAppliance(userId: string, id: string, appliance: Partial<Omit<InsertAppliance, 'userId'>>): Promise<Appliance>;
  deleteAppliance(userId: string, id: string): Promise<void>;
  getAppliancesByCategory(userId: string, categoryId: string): Promise<Appliance[]>;
  getAppliancesByCapability(userId: string, capability: string): Promise<Appliance[]>;
  
  // Appliance Categories
  getApplianceCategories(): Promise<ApplianceCategory[]>;
  getApplianceCategory(id: string): Promise<ApplianceCategory | undefined>;
  createApplianceCategory(category: InsertApplianceCategory): Promise<ApplianceCategory>;
  updateApplianceCategory(id: string, category: Partial<InsertApplianceCategory>): Promise<ApplianceCategory>;
  deleteApplianceCategory(id: string): Promise<void>;
  
  // Barcode Products
  getBarcodeProduct(barcodeNumber: string): Promise<BarcodeProduct | undefined>;
  createBarcodeProduct(product: InsertBarcodeProduct): Promise<BarcodeProduct>;
  updateBarcodeProduct(barcodeNumber: string, product: Partial<InsertBarcodeProduct>): Promise<BarcodeProduct>;
  searchBarcodeProducts(query: string): Promise<BarcodeProduct[]>;

  // Food Items (user-scoped)
  getFoodItems(userId: string, storageLocationId?: string): Promise<FoodItem[]>;
  getFoodItemsPaginated(userId: string, page?: number, limit?: number, storageLocationId?: string, sortBy?: 'name' | 'expirationDate' | 'addedAt'): Promise<{ items: FoodItem[], total: number, page: number, totalPages: number }>;
  getFoodItem(userId: string, id: string): Promise<FoodItem | undefined>;
  createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem>;
  updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem>;
  deleteFoodItem(userId: string, id: string): Promise<void>;
  getFoodCategories(userId: string): Promise<string[]>;

  // Chat Messages (user-scoped)
  getChatMessages(userId: string): Promise<ChatMessage[]>;
  getChatMessagesPaginated(userId: string, page?: number, limit?: number): Promise<{ messages: ChatMessage[], total: number, page: number, totalPages: number }>;
  createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage>;

  // Recipes (user-scoped)
  getRecipes(userId: string): Promise<Recipe[]>;
  getRecipesPaginated(userId: string, page?: number, limit?: number): Promise<{ recipes: Recipe[], total: number, page: number, totalPages: number }>;
  getRecipe(userId: string, id: string): Promise<Recipe | undefined>;
  createRecipe(userId: string, recipe: Omit<InsertRecipe, 'userId'>): Promise<Recipe>;
  updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe>;
  getRecipesWithInventoryMatching(userId: string): Promise<Array<Recipe & { ingredientMatches: any[] }>>;

  // Expiration Notifications (user-scoped)
  getExpirationNotifications(userId: string): Promise<ExpirationNotification[]>;
  createExpirationNotification(userId: string, notification: Omit<InsertExpirationNotification, 'userId'>): Promise<ExpirationNotification>;
  dismissNotification(userId: string, id: string): Promise<void>;
  getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]>;

  // Meal Plans (user-scoped)
  getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]>;
  getMealPlan(userId: string, id: string): Promise<MealPlan | undefined>;
  createMealPlan(userId: string, plan: Omit<InsertMealPlan, 'userId'>): Promise<MealPlan>;
  updateMealPlan(userId: string, id: string, updates: Partial<Omit<InsertMealPlan, 'userId'>>): Promise<MealPlan>;
  deleteMealPlan(userId: string, id: string): Promise<void>;

  // API Usage Logs (user-scoped)
  logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>): Promise<ApiUsageLog>;
  getApiUsageLogs(userId: string, apiName?: string, limit?: number): Promise<ApiUsageLog[]>;
  getApiUsageStats(userId: string, apiName: string, days?: number): Promise<{ totalCalls: number; successfulCalls: number; failedCalls: number }>;
  
  // FDC Cache Methods
  getCachedFood(fdcId: string): Promise<FdcCache | undefined>;
  cacheFood(food: InsertFdcCache): Promise<FdcCache>;
  updateFoodLastAccessed(fdcId: string): Promise<void>;
  getCachedSearchResults(query: string, dataType?: string, pageNumber?: number): Promise<FdcSearchCache | undefined>;
  cacheSearchResults(search: InsertFdcSearchCache): Promise<FdcSearchCache>;
  clearOldCache(daysOld: number): Promise<void>;
  
  // Shopping List Items (user-scoped)
  getShoppingListItems(userId: string): Promise<ShoppingListItem[]>;
  createShoppingListItem(userId: string, item: Omit<InsertShoppingListItem, 'userId'>): Promise<ShoppingListItem>;
  updateShoppingListItem(userId: string, id: string, updates: Partial<Omit<InsertShoppingListItem, 'userId'>>): Promise<ShoppingListItem>;
  deleteShoppingListItem(userId: string, id: string): Promise<void>;
  clearCheckedShoppingListItems(userId: string): Promise<void>;
  addMissingIngredientsToShoppingList(userId: string, recipeId: string, ingredients: string[]): Promise<ShoppingListItem[]>;
  
  // Account Management
  resetUserData(userId: string): Promise<void>;

  // Feedback System
  createFeedback(userId: string, feedbackData: Omit<InsertFeedback, 'userId'>): Promise<Feedback>;
  getFeedback(userId: string, id: string): Promise<Feedback | undefined>;
  getUserFeedback(userId: string, limit?: number): Promise<Feedback[]>;
  getAllFeedback(limit?: number, offset?: number, status?: string): Promise<{ items: Feedback[], total: number }>;
  getCommunityFeedback(type?: string, sortBy?: 'upvotes' | 'recent', limit?: number): Promise<Array<Feedback & { userUpvoted: boolean }>>;
  getCommunityFeedbackForUser(userId: string, type?: string, sortBy?: 'upvotes' | 'recent', limit?: number): Promise<Array<Feedback & { userUpvoted: boolean }>>;
  updateFeedbackStatus(id: string, status: string, estimatedTurnaround?: string, resolvedAt?: Date): Promise<Feedback>;
  addFeedbackResponse(feedbackId: string, response: Omit<InsertFeedbackResponse, 'feedbackId'>): Promise<FeedbackResponse>;
  getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]>;
  getFeedbackAnalytics(userId?: string, days?: number): Promise<FeedbackAnalytics>;
  getFeedbackByContext(contextId: string, contextType: string): Promise<Feedback[]>;
  
  // Feedback Upvotes
  upvoteFeedback(userId: string, feedbackId: string): Promise<void>;
  removeUpvote(userId: string, feedbackId: string): Promise<void>;
  hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean>;
  getFeedbackUpvoteCount(feedbackId: string): Promise<number>;

  // Donation System (from blueprint:javascript_stripe)
  createDonation(donation: Omit<InsertDonation, 'id' | 'createdAt' | 'completedAt'>): Promise<Donation>;
  updateDonation(stripePaymentIntentId: string, updates: Partial<Donation>): Promise<Donation>;
  getDonation(id: string): Promise<Donation | undefined>;
  getDonationByPaymentIntent(stripePaymentIntentId: string): Promise<Donation | undefined>;
  getDonations(limit?: number, offset?: number): Promise<{ donations: Donation[], total: number }>;
  getUserDonations(userId: string, limit?: number): Promise<Donation[]>;
  getTotalDonations(): Promise<{ totalAmount: number, donationCount: number }>;

  // Product Management
  getProducts(activeOnly?: boolean): Promise<Product[]>;
  getProduct(id: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;

  // Order Management
  createOrder(order: InsertOrder): Promise<Order>;
  getOrder(id: string): Promise<Order | undefined>;
  getOrderByPaymentIntent(stripePaymentIntentId: string): Promise<Order | undefined>;
  updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order>;
  getUserOrders(userId: string, limit?: number): Promise<Order[]>;
  getOrderWithItems(id: string): Promise<(Order & { items: OrderItem[] }) | undefined>;

  // Order Items
  createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]>;
  getOrderItems(orderId: string): Promise<OrderItem[]>;

  // Shopping Cart
  getCartItems(userId: string): Promise<(CartItem & { product: Product })[]>;
  addToCart(userId: string, productId: string, quantity: number): Promise<CartItem>;
  updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem>;
  removeFromCart(userId: string, productId: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Web Vitals Analytics
  recordWebVital(vital: Omit<InsertWebVital, 'id' | 'createdAt'>): Promise<WebVital>;
  getWebVitals(limit?: number, offset?: number): Promise<{ vitals: WebVital[], total: number }>;
  getWebVitalsByMetric(metricName: string, limit?: number): Promise<WebVital[]>;
  getWebVitalsStats(metricName?: string, days?: number): Promise<{
    average: number;
    p75: number;
    p95: number;
    count: number;
    goodCount: number;
    needsImprovementCount: number;
    poorCount: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  private userInitialized = new Set<string>();
  private initializationPromises = new Map<string, Promise<void>>();
  private initializationLock = new Map<string, boolean>(); // Mutex for atomic operations

  private async ensureDefaultDataForUser(userId: string) {
    // Fast path: already initialized
    if (this.userInitialized.has(userId)) return;
    
    // Atomic check-and-set operation
    let shouldInitialize = false;
    let existingPromise: Promise<void> | undefined;
    
    // Synchronously check and claim initialization if needed
    if (this.initializationLock.get(userId)) {
      // Another initialization is in progress, wait for it
      existingPromise = this.initializationPromises.get(userId);
    } else {
      // Check if we need to initialize
      existingPromise = this.initializationPromises.get(userId);
      if (!existingPromise && !this.userInitialized.has(userId)) {
        // Claim the lock atomically
        this.initializationLock.set(userId, true);
        shouldInitialize = true;
      }
    }
    
    // Wait for existing initialization if present
    if (existingPromise) {
      await existingPromise;
      return;
    }
    
    // Perform initialization if we claimed the lock
    if (shouldInitialize) {
      const initPromise = (async () => {
        try {
          // Double-check in case of extreme race conditions
          if (this.userInitialized.has(userId)) {
            return;
          }
          
          // Check if user has storage locations
          const existingLocations = await db.select().from(storageLocations).where(eq(storageLocations.userId, userId));
          
          if (existingLocations.length === 0) {
            // Initialize default storage locations for this user
            const defaultLocations = [
              { userId, name: "Fridge", icon: "refrigerator" },
              { userId, name: "Freezer", icon: "snowflake" },
              { userId, name: "Pantry", icon: "pizza" },
              { userId, name: "Counter", icon: "utensils-crossed" },
            ];

            await db.insert(storageLocations).values(defaultLocations);

            // Initialize default appliances for this user
            const defaultAppliances = [
              { userId, name: "Oven", type: "cooking" },
              { userId, name: "Stove", type: "cooking" },
              { userId, name: "Microwave", type: "cooking" },
              { userId, name: "Air Fryer", type: "cooking" },
            ];

            await db.insert(appliances).values(defaultAppliances);
          }
          
          // Mark as initialized only on success
          this.userInitialized.add(userId);
        } catch (error) {
          console.error(`Failed to initialize default data for user ${userId}:`, error);
          // Re-throw to inform callers of failure
          throw error;
        } finally {
          // Clean up the promise and lock
          this.initializationPromises.delete(userId);
          this.initializationLock.delete(userId);
        }
      })();
      
      // Store the promise before starting async work
      this.initializationPromises.set(userId, initPromise);
      
      await initPromise;
    }
  }

  // User operations - REQUIRED for Replit Auth (from blueprint:javascript_log_in_with_replit)
  async getUser(id: string): Promise<User | undefined> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, id));
      return user;
    } catch (error) {
      console.error(`Error getting user ${id}:`, error);
      throw new Error('Failed to retrieve user');
    }
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    try {
      // First check if a user with this email already exists
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, userData.email!));

      if (existingUser) {
        // Update the existing user (keep the same ID to avoid foreign key issues)
        const [updatedUser] = await db
          .update(users)
          .set({
            firstName: userData.firstName,
            lastName: userData.lastName,
            profileImage: userData.profileImage,
            updatedAt: new Date(),
          })
          .where(eq(users.id, existingUser.id))
          .returning();
        return updatedUser;
      }

      // No existing user, insert new one
      const [user] = await db
        .insert(users)
        .values(userData)
        .onConflictDoUpdate({
          target: users.id,
          set: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            email: userData.email,
            profileImage: userData.profileImage,
            updatedAt: new Date(),
          },
        })
        .returning();
      return user;
    } catch (error: any) {
      console.error('Error upserting user:', error);
      throw new Error('Failed to save user');
    }
  }

  // User Preferences
  async getUserPreferences(userId: string): Promise<UserPreferences | undefined> {
    try {
      const [preferences] = await db.select().from(userPreferences).where(eq(userPreferences.userId, userId));
      return preferences;
    } catch (error) {
      console.error(`Error getting user preferences for ${userId}:`, error);
      throw new Error('Failed to retrieve user preferences');
    }
  }

  async upsertUserPreferences(preferencesData: InsertUserPreferences & { userId: string }): Promise<UserPreferences> {
    try {
      const [preferences] = await db
        .insert(userPreferences)
        .values(preferencesData)
        .onConflictDoUpdate({
          target: userPreferences.userId,
          set: {
            ...preferencesData,
            updatedAt: new Date(),
          },
        })
        .returning();
      return preferences;
    } catch (error) {
      console.error('Error upserting user preferences:', error);
      throw new Error('Failed to save user preferences');
    }
  }

  async getPushTokens(userId: string): Promise<PushToken[]> {
    try {
      return await db.select().from(pushTokens).where(eq(pushTokens.userId, userId));
    } catch (error) {
      console.error('Error getting push tokens:', error);
      throw new Error('Failed to get push tokens');
    }
  }

  async upsertPushToken(userId: string, tokenData: Omit<InsertPushToken, 'userId'>): Promise<PushToken> {
    try {
      const [token] = await db
        .insert(pushTokens)
        .values({ ...tokenData, userId })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            platform: tokenData.platform,
            deviceInfo: tokenData.deviceInfo,
            updatedAt: new Date(),
          },
        })
        .returning();
      return token;
    } catch (error) {
      console.error('Error upserting push token:', error);
      throw new Error('Failed to save push token');
    }
  }

  async deletePushToken(userId: string, token: string): Promise<void> {
    try {
      await db.delete(pushTokens).where(and(eq(pushTokens.userId, userId), eq(pushTokens.token, token)));
    } catch (error) {
      console.error('Error deleting push token:', error);
      throw new Error('Failed to delete push token');
    }
  }

  // Storage Locations
  async getStorageLocations(userId: string): Promise<StorageLocation[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      // Optimized query: get locations with counts in a single query using LEFT JOIN and GROUP BY
      const locationsWithCounts = await db
        .select({
          id: storageLocations.id,
          userId: storageLocations.userId,
          name: storageLocations.name,
          icon: storageLocations.icon,
          itemCount: sql<number>`COALESCE(COUNT(${foodItems.id})::int, 0)`.as('itemCount'),
        })
        .from(storageLocations)
        .leftJoin(
          foodItems,
          and(
            eq(foodItems.storageLocationId, storageLocations.id),
            eq(foodItems.userId, userId)
          )
        )
        .where(eq(storageLocations.userId, userId))
        .groupBy(storageLocations.id, storageLocations.userId, storageLocations.name, storageLocations.icon);
      
      return locationsWithCounts;
    } catch (error) {
      console.error(`Error getting storage locations for user ${userId}:`, error);
      throw new Error('Failed to retrieve storage locations');
    }
  }

  async getStorageLocation(userId: string, id: string): Promise<StorageLocation | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [location] = await db.select().from(storageLocations).where(
        and(eq(storageLocations.id, id), eq(storageLocations.userId, userId))
      );
      return location || undefined;
    } catch (error) {
      console.error(`Error getting storage location ${id}:`, error);
      throw new Error('Failed to retrieve storage location');
    }
  }

  async createStorageLocation(userId: string, location: Omit<InsertStorageLocation, 'userId'>): Promise<StorageLocation> {
    try {
      const [newLocation] = await db
        .insert(storageLocations)
        .values({ ...location, userId })
        .returning();
      return newLocation;
    } catch (error) {
      console.error('Error creating storage location:', error);
      throw new Error('Failed to create storage location');
    }
  }


  // Appliances
  async getAppliances(userId: string): Promise<Appliance[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      return db.select().from(appliances).where(eq(appliances.userId, userId));
    } catch (error) {
      console.error(`Error getting appliances for user ${userId}:`, error);
      throw new Error('Failed to retrieve appliances');
    }
  }

  async createAppliance(userId: string, appliance: Omit<InsertAppliance, 'userId'>): Promise<Appliance> {
    try {
      const [newAppliance] = await db
        .insert(appliances)
        .values({ ...appliance, userId })
        .returning();
      return newAppliance;
    } catch (error) {
      console.error('Error creating appliance:', error);
      throw new Error('Failed to create appliance');
    }
  }

  async getAppliance(userId: string, id: string): Promise<Appliance | undefined> {
    try {
      const [appliance] = await db.select().from(appliances).where(
        and(eq(appliances.id, id), eq(appliances.userId, userId))
      );
      return appliance || undefined;
    } catch (error) {
      console.error(`Error getting appliance ${id}:`, error);
      throw new Error('Failed to retrieve appliance');
    }
  }

  async updateAppliance(userId: string, id: string, appliance: Partial<Omit<InsertAppliance, 'userId'>>): Promise<Appliance> {
    try {
      const [updatedAppliance] = await db
        .update(appliances)
        .set({ ...appliance, updatedAt: new Date() })
        .where(and(eq(appliances.id, id), eq(appliances.userId, userId)))
        .returning();
      return updatedAppliance;
    } catch (error) {
      console.error(`Error updating appliance ${id}:`, error);
      throw new Error('Failed to update appliance');
    }
  }

  async deleteAppliance(userId: string, id: string): Promise<void> {
    try {
      await db.delete(appliances).where(and(eq(appliances.id, id), eq(appliances.userId, userId)));
    } catch (error) {
      console.error(`Error deleting appliance ${id}:`, error);
      throw new Error('Failed to delete appliance');
    }
  }

  async getAppliancesByCategory(userId: string, categoryId: string): Promise<Appliance[]> {
    try {
      return db.select().from(appliances).where(
        and(eq(appliances.userId, userId), eq(appliances.categoryId, categoryId))
      );
    } catch (error) {
      console.error(`Error getting appliances by category for user ${userId}:`, error);
      throw new Error('Failed to retrieve appliances by category');
    }
  }

  async getAppliancesByCapability(userId: string, capability: string): Promise<Appliance[]> {
    try {
      const results = await db.select().from(appliances).where(
        and(eq(appliances.userId, userId))
      );
      
      // Filter appliances that have the specified capability
      return results.filter(appliance => {
        const capabilities = appliance.customCapabilities || [];
        return capabilities.includes(capability);
      });
    } catch (error) {
      console.error(`Error getting appliances by capability for user ${userId}:`, error);
      throw new Error('Failed to retrieve appliances by capability');
    }
  }

  // Appliance Categories
  async getApplianceCategories(): Promise<ApplianceCategory[]> {
    try {
      return db.select().from(applianceCategories).orderBy(applianceCategories.sortOrder);
    } catch (error) {
      console.error('Error getting appliance categories:', error);
      throw new Error('Failed to retrieve appliance categories');
    }
  }

  async getApplianceCategory(id: string): Promise<ApplianceCategory | undefined> {
    try {
      const [category] = await db.select().from(applianceCategories).where(eq(applianceCategories.id, id));
      return category || undefined;
    } catch (error) {
      console.error(`Error getting appliance category ${id}:`, error);
      throw new Error('Failed to retrieve appliance category');
    }
  }

  async createApplianceCategory(category: InsertApplianceCategory): Promise<ApplianceCategory> {
    try {
      const [newCategory] = await db.insert(applianceCategories).values(category).returning();
      return newCategory;
    } catch (error) {
      console.error('Error creating appliance category:', error);
      throw new Error('Failed to create appliance category');
    }
  }

  async updateApplianceCategory(id: string, category: Partial<InsertApplianceCategory>): Promise<ApplianceCategory> {
    try {
      const [updatedCategory] = await db
        .update(applianceCategories)
        .set(category)
        .where(eq(applianceCategories.id, id))
        .returning();
      return updatedCategory;
    } catch (error) {
      console.error(`Error updating appliance category ${id}:`, error);
      throw new Error('Failed to update appliance category');
    }
  }

  async deleteApplianceCategory(id: string): Promise<void> {
    try {
      await db.delete(applianceCategories).where(eq(applianceCategories.id, id));
    } catch (error) {
      console.error(`Error deleting appliance category ${id}:`, error);
      throw new Error('Failed to delete appliance category');
    }
  }

  // Barcode Products
  async getBarcodeProduct(barcodeNumber: string): Promise<BarcodeProduct | undefined> {
    try {
      const [product] = await db.select().from(barcodeProducts).where(eq(barcodeProducts.barcodeNumber, barcodeNumber));
      return product || undefined;
    } catch (error) {
      console.error(`Error getting barcode product ${barcodeNumber}:`, error);
      throw new Error('Failed to retrieve barcode product');
    }
  }

  async createBarcodeProduct(product: InsertBarcodeProduct): Promise<BarcodeProduct> {
    try {
      const [newProduct] = await db
        .insert(barcodeProducts)
        .values(product)
        .returning();
      return newProduct;
    } catch (error) {
      console.error('Error creating barcode product:', error);
      throw new Error('Failed to create barcode product');
    }
  }

  async updateBarcodeProduct(barcodeNumber: string, product: Partial<InsertBarcodeProduct>): Promise<BarcodeProduct> {
    try {
      const updateData = {
        ...product,
        lastUpdate: new Date()
      };
      const [updatedProduct] = await db
        .update(barcodeProducts)
        .set(updateData)
        .where(eq(barcodeProducts.barcodeNumber, barcodeNumber))
        .returning();
      return updatedProduct;
    } catch (error) {
      console.error(`Error updating barcode product ${barcodeNumber}:`, error);
      throw new Error('Failed to update barcode product');
    }
  }

  async searchBarcodeProducts(query: string): Promise<BarcodeProduct[]> {
    try {
      const searchPattern = `%${query}%`;
      return db.select().from(barcodeProducts)
        .where(sql`
          ${barcodeProducts.title} ILIKE ${searchPattern}
          OR ${barcodeProducts.brand} ILIKE ${searchPattern}
          OR ${barcodeProducts.manufacturer} ILIKE ${searchPattern}
          OR ${barcodeProducts.model} ILIKE ${searchPattern}
        `);
    } catch (error) {
      console.error(`Error searching barcode products for query ${query}:`, error);
      throw new Error('Failed to search barcode products');
    }
  }

  // Food Items
  async getFoodItems(userId: string, storageLocationId?: string): Promise<FoodItem[]> {
    try {
      if (storageLocationId) {
        return db.select().from(foodItems).where(
          and(eq(foodItems.storageLocationId, storageLocationId), eq(foodItems.userId, userId))
        );
      }
      return db.select().from(foodItems).where(eq(foodItems.userId, userId));
    } catch (error) {
      console.error(`Error getting food items for user ${userId}:`, error);
      throw new Error('Failed to retrieve food items');
    }
  }

  async getFoodItemsPaginated(
    userId: string, 
    page: number = 1, 
    limit: number = 30, 
    storageLocationId?: string,
    sortBy: 'name' | 'expirationDate' | 'addedAt' = 'expirationDate'
  ): Promise<{ items: FoodItem[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Build where clause
      const whereConditions = [eq(foodItems.userId, userId)];
      if (storageLocationId && storageLocationId !== "all") {
        whereConditions.push(eq(foodItems.storageLocationId, storageLocationId));
      }
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(foodItems)
        .where(and(...whereConditions));
      
      const total = Number(countResult?.count || 0);
      
      // Determine sort order
      const orderClause = sortBy === 'name' 
        ? foodItems.name
        : sortBy === 'addedAt'
        ? sql`${foodItems.addedAt} DESC`
        : foodItems.expirationDate;
      
      // Get paginated items
      const items = await db.select().from(foodItems)
        .where(and(...whereConditions))
        .orderBy(orderClause)
        .limit(limit)
        .offset(offset);
      
      return {
        items,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated food items for user ${userId}:`, error);
      throw new Error('Failed to retrieve food items');
    }
  }

  async getFoodItem(userId: string, id: string): Promise<FoodItem | undefined> {
    try {
      const [item] = await db.select().from(foodItems).where(
        and(eq(foodItems.id, id), eq(foodItems.userId, userId))
      );
      return item || undefined;
    } catch (error) {
      console.error(`Error getting food item ${id}:`, error);
      throw new Error('Failed to retrieve food item');
    }
  }

  async createFoodItem(userId: string, item: Omit<InsertFoodItem, 'userId'>): Promise<FoodItem> {
    try {
      const [newItem] = await db
        .insert(foodItems)
        .values({ ...item, userId })
        .returning();
      return newItem;
    } catch (error) {
      console.error('Error creating food item:', error);
      throw new Error('Failed to create food item');
    }
  }

  async updateFoodItem(userId: string, id: string, item: Partial<Omit<InsertFoodItem, 'userId'>>): Promise<FoodItem> {
    try {
      const [updated] = await db
        .update(foodItems)
        .set(item)
        .where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Food item not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating food item ${id}:`, error);
      throw new Error('Failed to update food item');
    }
  }

  async deleteFoodItem(userId: string, id: string): Promise<void> {
    try {
      await db.delete(foodItems).where(and(eq(foodItems.id, id), eq(foodItems.userId, userId)));
    } catch (error) {
      console.error(`Error deleting food item ${id}:`, error);
      throw new Error('Failed to delete food item');
    }
  }

  async getFoodCategories(userId: string): Promise<string[]> {
    try {
      const results = await db.execute<{ food_category: string }>(
        sql`SELECT DISTINCT food_category 
            FROM food_items 
            WHERE user_id = ${userId} 
              AND food_category IS NOT NULL 
            ORDER BY food_category`
      );
      
      return results.rows.map(r => r.food_category);
    } catch (error) {
      console.error(`Error getting food categories for user ${userId}:`, error);
      throw new Error('Failed to retrieve food categories');
    }
  }

  // Chat Messages
  async getChatMessages(userId: string): Promise<ChatMessage[]> {
    try {
      return db.select().from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(chatMessages.timestamp);
    } catch (error) {
      console.error(`Error getting chat messages for user ${userId}:`, error);
      throw new Error('Failed to retrieve chat messages');
    }
  }

  async getChatMessagesPaginated(userId: string, page: number = 1, limit: number = 50): Promise<{ messages: ChatMessage[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(chatMessages)
        .where(eq(chatMessages.userId, userId));
      
      const total = Number(countResult?.count || 0);
      
      // Get paginated messages
      const messages = await db.select().from(chatMessages)
        .where(eq(chatMessages.userId, userId))
        .orderBy(sql`${chatMessages.timestamp} DESC`)
        .limit(limit)
        .offset(offset);
      
      return {
        messages,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated chat messages for user ${userId}:`, error);
      throw new Error('Failed to retrieve chat messages');
    }
  }

  async createChatMessage(userId: string, message: Omit<InsertChatMessage, 'userId'>): Promise<ChatMessage> {
    try {
      const [newMessage] = await db
        .insert(chatMessages)
        .values({ ...message, userId })
        .returning();
      return newMessage;
    } catch (error) {
      console.error('Error creating chat message:', error);
      throw new Error('Failed to create chat message');
    }
  }

  async clearChatMessages(userId: string): Promise<void> {
    try {
      await db.delete(chatMessages).where(eq(chatMessages.userId, userId));
    } catch (error) {
      console.error(`Error clearing chat messages for user ${userId}:`, error);
      throw new Error('Failed to clear chat messages');
    }
  }

  async deleteOldChatMessages(userId: string, hoursOld: number = 24): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setHours(cutoffDate.getHours() - hoursOld);
      
      const result = await db.delete(chatMessages)
        .where(
          and(
            eq(chatMessages.userId, userId),
            sql`${chatMessages.timestamp} < ${cutoffDate}`
          )
        )
        .returning();
      
      return result.length;
    } catch (error) {
      console.error(`Error deleting old chat messages for user ${userId}:`, error);
      throw new Error('Failed to delete old chat messages');
    }
  }

  // Recipes
  async getRecipes(userId: string): Promise<Recipe[]> {
    try {
      return db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(sql`${recipes.createdAt} DESC`);
    } catch (error) {
      console.error(`Error getting recipes for user ${userId}:`, error);
      throw new Error('Failed to retrieve recipes');
    }
  }

  async getRecipesPaginated(userId: string, page: number = 1, limit: number = 20): Promise<{ recipes: Recipe[], total: number, page: number, totalPages: number }> {
    try {
      const offset = (page - 1) * limit;
      
      // Get total count
      const [countResult] = await db.select({ count: sql<number>`count(*)` })
        .from(recipes)
        .where(eq(recipes.userId, userId));
      
      const total = Number(countResult?.count || 0);
      
      // Get paginated recipes
      const paginatedRecipes = await db.select().from(recipes)
        .where(eq(recipes.userId, userId))
        .orderBy(sql`${recipes.createdAt} DESC`)
        .limit(limit)
        .offset(offset);
      
      return {
        recipes: paginatedRecipes,
        total,
        page,
        totalPages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error getting paginated recipes for user ${userId}:`, error);
      throw new Error('Failed to retrieve recipes');
    }
  }

  async getRecipe(userId: string, id: string): Promise<Recipe | undefined> {
    try {
      const [recipe] = await db.select().from(recipes).where(
        and(eq(recipes.id, id), eq(recipes.userId, userId))
      );
      return recipe || undefined;
    } catch (error) {
      console.error(`Error getting recipe ${id}:`, error);
      throw new Error('Failed to retrieve recipe');
    }
  }

  async createRecipe(userId: string, recipe: Omit<InsertRecipe, 'userId'>): Promise<Recipe> {
    try {
      const [newRecipe] = await db
        .insert(recipes)
        .values({ ...recipe, userId })
        .returning();
      return newRecipe;
    } catch (error) {
      console.error('Error creating recipe:', error);
      throw new Error('Failed to create recipe');
    }
  }

  async updateRecipe(userId: string, id: string, updates: Partial<Recipe>): Promise<Recipe> {
    try {
      const [updated] = await db
        .update(recipes)
        .set(updates)
        .where(and(eq(recipes.id, id), eq(recipes.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Recipe not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating recipe ${id}:`, error);
      throw new Error('Failed to update recipe');
    }
  }

  async getRecipesWithInventoryMatching(userId: string): Promise<Array<Recipe & { ingredientMatches: IngredientMatch[] }>> {
    try {
      // Fetch all recipes for the user
      const userRecipes = await this.getRecipes(userId);
      
      // Fetch current inventory
      const inventory = await this.getFoodItems(userId);
      
      // Enrich each recipe with real-time inventory matching
      return userRecipes.map(recipe => {
        const ingredientMatches: IngredientMatch[] = recipe.ingredients.map(ingredient => {
          return matchIngredientWithInventory(ingredient, inventory);
        });

        // Update the usedIngredients and missingIngredients based on current inventory
        const usedIngredients = ingredientMatches
          .filter(match => match.hasEnough)
          .map(match => match.ingredientName);
        
        const missingIngredients = ingredientMatches
          .filter(match => !match.hasEnough)
          .map(match => match.ingredientName);

        return {
          ...recipe,
          usedIngredients, // Update with current inventory state
          missingIngredients, // Update with current inventory state
          ingredientMatches, // Add detailed match information
        };
      });
    } catch (error) {
      console.error(`Error getting recipes with inventory matching for user ${userId}:`, error);
      throw new Error('Failed to retrieve recipes with inventory matching');
    }
  }

  // Expiration Notifications
  async getExpirationNotifications(userId: string): Promise<ExpirationNotification[]> {
    try {
      return db.select()
        .from(expirationNotifications)
        .where(and(
          eq(expirationNotifications.userId, userId),
          eq(expirationNotifications.dismissed, false)
        ))
        .orderBy(expirationNotifications.daysUntilExpiry);
    } catch (error) {
      console.error(`Error getting expiration notifications for user ${userId}:`, error);
      throw new Error('Failed to retrieve expiration notifications');
    }
  }

  async createExpirationNotification(userId: string, notification: Omit<InsertExpirationNotification, 'userId'>): Promise<ExpirationNotification> {
    try {
      const [newNotification] = await db
        .insert(expirationNotifications)
        .values({ ...notification, userId })
        .returning();
      return newNotification;
    } catch (error) {
      console.error('Error creating expiration notification:', error);
      throw new Error('Failed to create expiration notification');
    }
  }

  async dismissNotification(userId: string, id: string): Promise<void> {
    try {
      await db
        .update(expirationNotifications)
        .set({ dismissed: true })
        .where(and(eq(expirationNotifications.id, id), eq(expirationNotifications.userId, userId)));
    } catch (error) {
      console.error(`Error dismissing notification ${id}:`, error);
      throw new Error('Failed to dismiss notification');
    }
  }

  async getExpiringItems(userId: string, daysThreshold: number): Promise<FoodItem[]> {
    try {
      // Optimized: use SQL to filter items expiring within threshold instead of fetching all items
      const now = new Date();
      const maxExpiryDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);
      
      const expiringItems = await db
        .select()
        .from(foodItems)
        .where(
          and(
            eq(foodItems.userId, userId),
            sql`${foodItems.expirationDate} IS NOT NULL`,
            sql`${foodItems.expirationDate} >= ${now.toISOString()}`,
            sql`${foodItems.expirationDate} <= ${maxExpiryDate.toISOString()}`
          )
        );
      
      return expiringItems;
    } catch (error) {
      console.error(`Error getting expiring items for user ${userId}:`, error);
      throw new Error('Failed to retrieve expiring items');
    }
  }

  // Meal Plans
  async getMealPlans(userId: string, startDate?: string, endDate?: string): Promise<MealPlan[]> {
    try {
      await this.ensureDefaultDataForUser(userId);
      
      const plans = await db.select().from(mealPlans).where(eq(mealPlans.userId, userId));
      
      // Filter by date range if provided
      if (startDate || endDate) {
        return plans.filter(plan => {
          if (startDate && endDate) {
            return plan.date >= startDate && plan.date <= endDate;
          } else if (startDate) {
            return plan.date >= startDate;
          } else if (endDate) {
            return plan.date <= endDate;
          }
          return true;
        });
      }
      
      return plans;
    } catch (error) {
      console.error(`Error getting meal plans for user ${userId}:`, error);
      throw new Error('Failed to retrieve meal plans');
    }
  }

  async getMealPlan(userId: string, id: string): Promise<MealPlan | undefined> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [plan] = await db.select().from(mealPlans).where(
        and(eq(mealPlans.id, id), eq(mealPlans.userId, userId))
      );
      return plan || undefined;
    } catch (error) {
      console.error(`Error getting meal plan ${id}:`, error);
      throw new Error('Failed to retrieve meal plan');
    }
  }

  async createMealPlan(userId: string, plan: Omit<InsertMealPlan, 'userId'>): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [newPlan] = await db.insert(mealPlans).values({ ...plan, userId }).returning();
      return newPlan;
    } catch (error) {
      console.error('Error creating meal plan:', error);
      throw new Error('Failed to create meal plan');
    }
  }

  async updateMealPlan(userId: string, id: string, updates: Partial<Omit<InsertMealPlan, 'userId'>>): Promise<MealPlan> {
    try {
      await this.ensureDefaultDataForUser(userId);
      const [updated] = await db.update(mealPlans)
        .set(updates)
        .where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)))
        .returning();
      
      if (!updated) {
        throw new Error("Meal plan not found");
      }
      
      return updated;
    } catch (error) {
      console.error(`Error updating meal plan ${id}:`, error);
      throw new Error('Failed to update meal plan');
    }
  }

  async deleteMealPlan(userId: string, id: string): Promise<void> {
    try {
      await this.ensureDefaultDataForUser(userId);
      await db.delete(mealPlans).where(and(eq(mealPlans.id, id), eq(mealPlans.userId, userId)));
    } catch (error) {
      console.error(`Error deleting meal plan ${id}:`, error);
      throw new Error('Failed to delete meal plan');
    }
  }

  async logApiUsage(userId: string, log: Omit<InsertApiUsageLog, 'userId'>): Promise<ApiUsageLog> {
    try {
      const [newLog] = await db.insert(apiUsageLogs).values({ ...log, userId }).returning();
      return newLog;
    } catch (error) {
      console.error('Error logging API usage:', error);
      throw new Error('Failed to log API usage');
    }
  }

  async getApiUsageLogs(userId: string, apiName?: string, limit: number = 100): Promise<ApiUsageLog[]> {
    try {
      const conditions = apiName 
        ? and(eq(apiUsageLogs.userId, userId), eq(apiUsageLogs.apiName, apiName))
        : eq(apiUsageLogs.userId, userId);
      
      const logs = await db.select().from(apiUsageLogs)
        .where(conditions)
        .orderBy(sql`${apiUsageLogs.timestamp} DESC`)
        .limit(limit);
      return logs;
    } catch (error) {
      console.error(`Error getting API usage logs for user ${userId}:`, error);
      throw new Error('Failed to retrieve API usage logs');
    }
  }

  async getApiUsageStats(userId: string, apiName: string, days: number = 30): Promise<{ totalCalls: number; successfulCalls: number; failedCalls: number }> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const logs = await db.select().from(apiUsageLogs).where(
        and(
          eq(apiUsageLogs.userId, userId),
          eq(apiUsageLogs.apiName, apiName),
          sql`${apiUsageLogs.timestamp} >= ${cutoffDate.toISOString()}`
        )
      );
      
      const totalCalls = logs.length;
      const successfulCalls = logs.filter(log => log.success).length;
      const failedCalls = totalCalls - successfulCalls;
      
      return { totalCalls, successfulCalls, failedCalls };
    } catch (error) {
      console.error(`Error getting API usage stats for user ${userId}:`, error);
      throw new Error('Failed to retrieve API usage stats');
    }
  }

  // FDC Cache Methods
  async getCachedFood(fdcId: string): Promise<FdcCache | undefined> {
    try {
      const [cached] = await db.select().from(fdcCache).where(eq(fdcCache.fdcId, fdcId));
      return cached;
    } catch (error) {
      console.error(`Error getting cached food ${fdcId}:`, error);
      throw new Error('Failed to retrieve cached food');
    }
  }

  async cacheFood(food: InsertFdcCache): Promise<FdcCache> {
    try {
      const foodToInsert = {
        fdcId: food.fdcId,
        description: food.description,
        dataType: food.dataType,
        brandOwner: food.brandOwner,
        brandName: food.brandName,
        ingredients: food.ingredients,
        servingSize: food.servingSize,
        servingSizeUnit: food.servingSizeUnit,
        nutrients: food.nutrients as Array<{
          nutrientId: number;
          nutrientName: string;
          nutrientNumber: string;
          unitName: string;
          value: number;
        }> | null | undefined,
        fullData: food.fullData
      };
      
      const [cachedFood] = await db
        .insert(fdcCache)
        .values(foodToInsert)
        .onConflictDoUpdate({
          target: fdcCache.fdcId,
          set: {
            ...foodToInsert,
            lastAccessed: new Date(),
          },
        })
        .returning();
      return cachedFood;
    } catch (error) {
      console.error('Error caching food:', error);
      throw new Error('Failed to cache food');
    }
  }

  async updateFoodLastAccessed(fdcId: string): Promise<void> {
    try {
      await db
        .update(fdcCache)
        .set({ lastAccessed: new Date() })
        .where(eq(fdcCache.fdcId, fdcId));
    } catch (error) {
      console.error(`Error updating last accessed for ${fdcId}:`, error);
      // Don't throw - this is not critical
    }
  }

  async getCachedSearchResults(query: string, dataType?: string, pageNumber: number = 1, isComplexSearch: boolean = false): Promise<FdcSearchCache | undefined> {
    try {
      const conditions = [
        eq(fdcSearchCache.query, query.toLowerCase()),
        eq(fdcSearchCache.pageNumber, pageNumber)
      ];
      
      if (dataType) {
        conditions.push(eq(fdcSearchCache.dataType, dataType));
      }
      
      const [cached] = await db
        .select()
        .from(fdcSearchCache)
        .where(and(...conditions))
        .orderBy(sql`${fdcSearchCache.cachedAt} DESC`)
        .limit(1);
      
      // Use shorter TTL for complex searches (2 hours), longer for simple searches (24 hours)
      if (cached) {
        const cacheAge = Date.now() - new Date(cached.cachedAt).getTime();
        const ttlMs = isComplexSearch 
          ? 2 * 60 * 60 * 1000  // 2 hours for complex searches with filters
          : 24 * 60 * 60 * 1000; // 24 hours for simple searches
        
        if (cacheAge < ttlMs) {
          return cached;
        }
      }
      
      return undefined;
    } catch (error) {
      console.error('Error getting cached search results:', error);
      return undefined;
    }
  }

  async cacheSearchResults(search: InsertFdcSearchCache): Promise<FdcSearchCache> {
    try {
      const searchToInsert = {
        query: search.query.toLowerCase(),
        dataType: search.dataType,
        pageNumber: search.pageNumber,
        pageSize: search.pageSize,
        totalHits: search.totalHits,
        results: search.results as Array<{
          fdcId: string;
          description: string;
          dataType: string;
          brandOwner?: string;
          brandName?: string;
          score?: number;
        }> | null | undefined
      };
      
      const [cachedSearch] = await db
        .insert(fdcSearchCache)
        .values(searchToInsert)
        .returning();
      return cachedSearch;
    } catch (error) {
      console.error('Error caching search results:', error);
      throw new Error('Failed to cache search results');
    }
  }

  async clearOldCache(daysOld: number = 30): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);
      
      // Clear old search cache
      await db
        .delete(fdcSearchCache)
        .where(sql`${fdcSearchCache.cachedAt} < ${cutoffDate.toISOString()}`);
      
      // Clear old food cache that hasn't been accessed recently
      await db
        .delete(fdcCache)
        .where(sql`${fdcCache.lastAccessed} < ${cutoffDate.toISOString()}`);
    } catch (error) {
      console.error('Error clearing old cache:', error);
      // Don't throw - cache cleanup is not critical
    }
  }

  // Shopping List Methods
  async getShoppingListItems(userId: string): Promise<ShoppingListItem[]> {
    await this.ensureDefaultDataForUser(userId);
    const items = await db
      .select()
      .from(shoppingListItems)
      .where(eq(shoppingListItems.userId, userId))
      .orderBy(shoppingListItems.createdAt);
    return items;
  }

  async createShoppingListItem(userId: string, item: Omit<InsertShoppingListItem, 'userId'>): Promise<ShoppingListItem> {
    await this.ensureDefaultDataForUser(userId);
    const [newItem] = await db
      .insert(shoppingListItems)
      .values({ ...item, userId })
      .returning();
    return newItem;
  }

  async updateShoppingListItem(userId: string, id: string, updates: Partial<Omit<InsertShoppingListItem, 'userId'>>): Promise<ShoppingListItem> {
    const [updated] = await db
      .update(shoppingListItems)
      .set(updates)
      .where(and(
        eq(shoppingListItems.id, id),
        eq(shoppingListItems.userId, userId)
      ))
      .returning();
    
    if (!updated) {
      throw new Error('Shopping list item not found');
    }
    return updated;
  }

  async deleteShoppingListItem(userId: string, id: string): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(and(
        eq(shoppingListItems.id, id),
        eq(shoppingListItems.userId, userId)
      ));
  }

  async clearCheckedShoppingListItems(userId: string): Promise<void> {
    await db
      .delete(shoppingListItems)
      .where(and(
        eq(shoppingListItems.userId, userId),
        eq(shoppingListItems.isChecked, true)
      ));
  }

  async addMissingIngredientsToShoppingList(userId: string, recipeId: string, ingredients: string[]): Promise<ShoppingListItem[]> {
    await this.ensureDefaultDataForUser(userId);
    
    // Parse each ingredient to extract quantity and unit if possible
    const items = ingredients.map(ingredient => {
      // Simple parsing - could be enhanced
      const match = ingredient.match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)?\s+(.+)$/);
      if (match) {
        return {
          ingredient: match[3],
          quantity: match[1],
          unit: match[2] || '',
          recipeId,
          isChecked: false,
          userId
        };
      }
      return {
        ingredient,
        quantity: null,
        unit: null,
        recipeId,
        isChecked: false,
        userId
      };
    });

    const newItems = await db
      .insert(shoppingListItems)
      .values(items)
      .returning();
    
    return newItems;
  }

  async resetUserData(userId: string): Promise<void> {
    try {
      // Use a transaction to ensure all deletions complete or all rollback
      await db.transaction(async (tx) => {
        // Delete all user data in order (respecting foreign key constraints)
        await tx.delete(shoppingListItems).where(eq(shoppingListItems.userId, userId));
        await tx.delete(mealPlans).where(eq(mealPlans.userId, userId));
        await tx.delete(expirationNotifications).where(eq(expirationNotifications.userId, userId));
        await tx.delete(foodItems).where(eq(foodItems.userId, userId));
        await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
        await tx.delete(recipes).where(eq(recipes.userId, userId));
        await tx.delete(appliances).where(eq(appliances.userId, userId));
        await tx.delete(apiUsageLogs).where(eq(apiUsageLogs.userId, userId));
        await tx.delete(feedback).where(eq(feedback.userId, userId));
        
        // Delete custom storage locations (keep default ones for re-initialization)
        await tx.delete(storageLocations).where(eq(storageLocations.userId, userId));
        
        // Reset user preferences to defaults
        await tx.delete(userPreferences).where(eq(userPreferences.userId, userId));
      });
      
      // Clear the initialization flag so default data will be recreated
      // This is done outside the transaction since it's an in-memory operation
      this.userInitialized.delete(userId);
      
      console.log(`Successfully reset all data for user ${userId}`);
    } catch (error) {
      console.error(`Error resetting user data for ${userId}:`, error);
      throw new Error('Failed to reset user data - transaction rolled back');
    }
  }

  // Feedback System Implementation
  async createFeedback(userId: string, feedbackData: Omit<InsertFeedback, 'userId'>): Promise<Feedback> {
    try {
      const [newFeedback] = await db
        .insert(feedback)
        .values({ ...feedbackData, userId })
        .returning();
      return newFeedback;
    } catch (error) {
      console.error('Error creating feedback:', error);
      throw new Error('Failed to create feedback');
    }
  }

  async getFeedback(userId: string, id: string): Promise<Feedback | undefined> {
    try {
      const [result] = await db
        .select()
        .from(feedback)
        .where(and(eq(feedback.id, id), eq(feedback.userId, userId)));
      return result;
    } catch (error) {
      console.error('Error getting feedback:', error);
      throw new Error('Failed to get feedback');
    }
  }

  async getUserFeedback(userId: string, limit: number = 50): Promise<Feedback[]> {
    try {
      const results = await db
        .select()
        .from(feedback)
        .where(eq(feedback.userId, userId))
        .orderBy(sql`${feedback.createdAt} DESC`)
        .limit(limit);
      return results;
    } catch (error) {
      console.error('Error getting user feedback:', error);
      throw new Error('Failed to get user feedback');
    }
  }

  async getAllFeedback(limit: number = 50, offset: number = 0, status?: string): Promise<{ items: Feedback[], total: number }> {
    try {
      const whereCondition = status ? eq(feedback.status, status) : undefined;
      
      const countQuery = db
        .select({ count: sql<number>`count(*)` })
        .from(feedback);
      
      const dataQuery = db
        .select()
        .from(feedback);
      
      const [{ count }] = whereCondition 
        ? await countQuery.where(whereCondition)
        : await countQuery;
      
      const items = whereCondition
        ? await dataQuery.where(whereCondition).orderBy(sql`${feedback.createdAt} DESC`).limit(limit).offset(offset)
        : await dataQuery.orderBy(sql`${feedback.createdAt} DESC`).limit(limit).offset(offset);
      
      return { items, total: count };
    } catch (error) {
      console.error('Error getting all feedback:', error);
      throw new Error('Failed to get all feedback');
    }
  }

  async updateFeedbackStatus(id: string, status: string, estimatedTurnaround?: string, resolvedAt?: Date): Promise<Feedback> {
    try {
      const updateData: any = { status };
      if (estimatedTurnaround !== undefined) {
        updateData.estimatedTurnaround = estimatedTurnaround;
      }
      if (resolvedAt) {
        updateData.resolvedAt = resolvedAt;
      }
      
      const [updated] = await db
        .update(feedback)
        .set(updateData)
        .where(eq(feedback.id, id))
        .returning();
      
      if (!updated) {
        throw new Error('Feedback not found');
      }
      
      return updated;
    } catch (error) {
      console.error('Error updating feedback status:', error);
      throw new Error('Failed to update feedback status');
    }
  }

  async addFeedbackResponse(feedbackId: string, response: Omit<InsertFeedbackResponse, 'feedbackId'>): Promise<FeedbackResponse> {
    try {
      const [newResponse] = await db
        .insert(feedbackResponses)
        .values({ ...response, feedbackId })
        .returning();
      return newResponse;
    } catch (error) {
      console.error('Error adding feedback response:', error);
      throw new Error('Failed to add feedback response');
    }
  }

  async getFeedbackResponses(feedbackId: string): Promise<FeedbackResponse[]> {
    try {
      const responses = await db
        .select()
        .from(feedbackResponses)
        .where(eq(feedbackResponses.feedbackId, feedbackId))
        .orderBy(sql`${feedbackResponses.createdAt} ASC`);
      return responses;
    } catch (error) {
      console.error('Error getting feedback responses:', error);
      throw new Error('Failed to get feedback responses');
    }
  }

  async getFeedbackAnalytics(userId?: string, days: number = 30): Promise<FeedbackAnalytics> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const allFeedback = userId
        ? await db
            .select()
            .from(feedback)
            .where(and(
              eq(feedback.userId, userId),
              sql`${feedback.createdAt} >= ${startDate}`
            ))
        : await db
            .select()
            .from(feedback)
            .where(sql`${feedback.createdAt} >= ${startDate}`);
      
      // Calculate analytics
      const totalFeedback = allFeedback.length;
      const ratings = allFeedback.filter(f => f.rating !== null).map(f => f.rating!);
      const averageRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
      
      const sentimentDistribution = {
        positive: allFeedback.filter(f => f.sentiment === 'positive').length,
        negative: allFeedback.filter(f => f.sentiment === 'negative').length,
        neutral: allFeedback.filter(f => f.sentiment === 'neutral').length,
      };
      
      const typeDistribution: Record<string, number> = {};
      const priorityDistribution: Record<string, number> = {};
      
      allFeedback.forEach(f => {
        typeDistribution[f.type] = (typeDistribution[f.type] || 0) + 1;
        if (f.priority) {
          priorityDistribution[f.priority] = (priorityDistribution[f.priority] || 0) + 1;
        }
      });
      
      // Calculate daily trends
      const dailyTrends = new Map<string, { count: number; sentiments: number[] }>();
      allFeedback.forEach(f => {
        const date = new Date(f.createdAt).toISOString().split('T')[0];
        if (!dailyTrends.has(date)) {
          dailyTrends.set(date, { count: 0, sentiments: [] });
        }
        const dayData = dailyTrends.get(date)!;
        dayData.count++;
        if (f.sentiment) {
          dayData.sentiments.push(f.sentiment === 'positive' ? 1 : f.sentiment === 'negative' ? -1 : 0);
        }
      });
      
      const recentTrends = Array.from(dailyTrends.entries())
        .map(([date, data]) => ({
          date,
          count: data.count,
          averageSentiment: data.sentiments.length > 0 
            ? data.sentiments.reduce((a, b) => a + b, 0) / data.sentiments.length 
            : 0
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
      
      // Calculate top issues
      const categoryMap = new Map<string, { count: number; priority: string }>();
      allFeedback.forEach(f => {
        if (f.category && f.priority) {
          const key = f.category;
          if (!categoryMap.has(key)) {
            categoryMap.set(key, { count: 0, priority: f.priority });
          }
          const cat = categoryMap.get(key)!;
          cat.count++;
          // Update to highest priority
          const priorities = ['low', 'medium', 'high', 'critical'];
          if (priorities.indexOf(f.priority) > priorities.indexOf(cat.priority)) {
            cat.priority = f.priority;
          }
        }
      });
      
      const topIssues = Array.from(categoryMap.entries())
        .map(([category, data]) => ({
          category,
          count: data.count,
          priority: data.priority
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      
      return {
        totalFeedback,
        averageRating,
        sentimentDistribution,
        typeDistribution,
        priorityDistribution,
        recentTrends,
        topIssues
      };
    } catch (error) {
      console.error('Error getting feedback analytics:', error);
      throw new Error('Failed to get feedback analytics');
    }
  }

  async getFeedbackByContext(contextId: string, contextType: string): Promise<Feedback[]> {
    try {
      const results = await db
        .select()
        .from(feedback)
        .where(and(
          eq(feedback.contextId, contextId),
          eq(feedback.contextType, contextType)
        ))
        .orderBy(sql`${feedback.createdAt} DESC`);
      return results;
    } catch (error) {
      console.error('Error getting feedback by context:', error);
      throw new Error('Failed to get feedback by context');
    }
  }

  async getCommunityFeedback(type?: string, sortBy: 'upvotes' | 'recent' = 'recent', limit: number = 50): Promise<Array<Feedback & { userUpvoted: boolean }>> {
    try {
      const whereCondition = type ? eq(feedback.type, type) : undefined;
      const orderByClause = sortBy === 'upvotes' 
        ? sql`${feedback.upvoteCount} DESC, ${feedback.createdAt} DESC`
        : sql`${feedback.createdAt} DESC`;

      const results = whereCondition
        ? await db.select().from(feedback).where(whereCondition).orderBy(orderByClause).limit(limit)
        : await db.select().from(feedback).orderBy(orderByClause).limit(limit);

      return results.map(item => ({ ...item, userUpvoted: false }));
    } catch (error) {
      console.error('Error getting community feedback:', error);
      throw new Error('Failed to get community feedback');
    }
  }

  async getCommunityFeedbackForUser(userId: string, type?: string, sortBy: 'upvotes' | 'recent' = 'recent', limit: number = 50): Promise<Array<Feedback & { userUpvoted: boolean }>> {
    try {
      const whereCondition = type ? eq(feedback.type, type) : undefined;
      const orderByClause = sortBy === 'upvotes' 
        ? sql`${feedback.upvoteCount} DESC, ${feedback.createdAt} DESC`
        : sql`${feedback.createdAt} DESC`;

      const results = whereCondition
        ? await db.select().from(feedback).where(whereCondition).orderBy(orderByClause).limit(limit)
        : await db.select().from(feedback).orderBy(orderByClause).limit(limit);

      const feedbackIds = results.map(f => f.id);
      const userUpvotes = feedbackIds.length > 0 
        ? await db.select().from(feedbackUpvotes).where(
            and(
              eq(feedbackUpvotes.userId, userId),
              sql`${feedbackUpvotes.feedbackId} IN ${feedbackIds}`
            )
          )
        : [];

      const upvotedIds = new Set(userUpvotes.map(u => u.feedbackId));

      return results.map(item => ({
        ...item,
        userUpvoted: upvotedIds.has(item.id)
      }));
    } catch (error) {
      console.error('Error getting community feedback for user:', error);
      throw new Error('Failed to get community feedback');
    }
  }

  async upvoteFeedback(userId: string, feedbackId: string): Promise<void> {
    try {
      const existing = await db
        .select()
        .from(feedbackUpvotes)
        .where(and(
          eq(feedbackUpvotes.userId, userId),
          eq(feedbackUpvotes.feedbackId, feedbackId)
        ));

      if (existing.length > 0) {
        return;
      }

      await db.insert(feedbackUpvotes).values({ userId, feedbackId });
      
      await db
        .update(feedback)
        .set({ upvoteCount: sql`${feedback.upvoteCount} + 1` })
        .where(eq(feedback.id, feedbackId));
    } catch (error) {
      console.error('Error upvoting feedback:', error);
      throw new Error('Failed to upvote feedback');
    }
  }

  async removeUpvote(userId: string, feedbackId: string): Promise<void> {
    try {
      const deleted = await db
        .delete(feedbackUpvotes)
        .where(and(
          eq(feedbackUpvotes.userId, userId),
          eq(feedbackUpvotes.feedbackId, feedbackId)
        ))
        .returning();

      if (deleted.length > 0) {
        await db
          .update(feedback)
          .set({ upvoteCount: sql`GREATEST(${feedback.upvoteCount} - 1, 0)` })
          .where(eq(feedback.id, feedbackId));
      }
    } catch (error) {
      console.error('Error removing upvote:', error);
      throw new Error('Failed to remove upvote');
    }
  }

  async hasUserUpvoted(userId: string, feedbackId: string): Promise<boolean> {
    try {
      const [result] = await db
        .select()
        .from(feedbackUpvotes)
        .where(and(
          eq(feedbackUpvotes.userId, userId),
          eq(feedbackUpvotes.feedbackId, feedbackId)
        ));
      return !!result;
    } catch (error) {
      console.error('Error checking upvote status:', error);
      return false;
    }
  }

  async getFeedbackUpvoteCount(feedbackId: string): Promise<number> {
    try {
      const [result] = await db
        .select({ upvoteCount: feedback.upvoteCount })
        .from(feedback)
        .where(eq(feedback.id, feedbackId));
      return result?.upvoteCount || 0;
    } catch (error) {
      console.error('Error getting upvote count:', error);
      return 0;
    }
  }

  // Donation System Implementation (from blueprint:javascript_stripe)
  async createDonation(donation: Omit<InsertDonation, 'id' | 'createdAt' | 'completedAt'>): Promise<Donation> {
    try {
      const [newDonation] = await db
        .insert(donations)
        .values(donation)
        .returning();
      return newDonation;
    } catch (error) {
      console.error('Error creating donation:', error);
      throw new Error('Failed to create donation');
    }
  }

  async updateDonation(stripePaymentIntentId: string, updates: Partial<Donation>): Promise<Donation> {
    try {
      const [updated] = await db
        .update(donations)
        .set({
          ...updates,
          completedAt: updates.status === 'succeeded' ? new Date() : undefined
        })
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId))
        .returning();
      
      if (!updated) {
        throw new Error('Donation not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating donation:', error);
      throw new Error('Failed to update donation');
    }
  }

  async getDonation(id: string): Promise<Donation | undefined> {
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.id, id));
      return donation;
    } catch (error) {
      console.error('Error getting donation:', error);
      throw new Error('Failed to get donation');
    }
  }

  async getDonationByPaymentIntent(stripePaymentIntentId: string): Promise<Donation | undefined> {
    try {
      const [donation] = await db
        .select()
        .from(donations)
        .where(eq(donations.stripePaymentIntentId, stripePaymentIntentId));
      return donation;
    } catch (error) {
      console.error('Error getting donation by payment intent:', error);
      throw new Error('Failed to get donation');
    }
  }

  async getDonations(limit: number = 50, offset: number = 0): Promise<{ donations: Donation[], total: number }> {
    try {
      const [donationResults, totalResult] = await Promise.all([
        db
          .select()
          .from(donations)
          .orderBy(sql`${donations.createdAt} DESC`)
          .limit(limit)
          .offset(offset),
        db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(donations)
      ]);

      return {
        donations: donationResults,
        total: totalResult[0]?.count || 0
      };
    } catch (error) {
      console.error('Error getting donations:', error);
      throw new Error('Failed to get donations');
    }
  }

  async getUserDonations(userId: string, limit: number = 10): Promise<Donation[]> {
    try {
      const results = await db
        .select()
        .from(donations)
        .where(eq(donations.userId, userId))
        .orderBy(sql`${donations.createdAt} DESC`)
        .limit(limit);
      return results;
    } catch (error) {
      console.error('Error getting user donations:', error);
      throw new Error('Failed to get user donations');
    }
  }

  async getTotalDonations(): Promise<{ totalAmount: number, donationCount: number }> {
    try {
      const result = await db
        .select({
          totalAmount: sql<number>`COALESCE(SUM(amount), 0)::int`,
          donationCount: sql<number>`COUNT(*)::int`
        })
        .from(donations)
        .where(eq(donations.status, 'succeeded'));
      
      return result[0] || { totalAmount: 0, donationCount: 0 };
    } catch (error) {
      console.error('Error getting total donations:', error);
      throw new Error('Failed to get total donations');
    }
  }

  // Product Management Implementation
  async getProducts(activeOnly: boolean = true): Promise<Product[]> {
    try {
      const query = activeOnly 
        ? db.select().from(products).where(eq(products.isActive, true))
        : db.select().from(products);
      
      return await query;
    } catch (error) {
      console.error('Error getting products:', error);
      throw new Error('Failed to get products');
    }
  }

  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const [product] = await db.select().from(products).where(eq(products.id, id));
      return product;
    } catch (error) {
      console.error('Error getting product:', error);
      throw new Error('Failed to get product');
    }
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    try {
      const [newProduct] = await db.insert(products).values(product).returning();
      return newProduct;
    } catch (error) {
      console.error('Error creating product:', error);
      throw new Error('Failed to create product');
    }
  }

  async updateProduct(id: string, updates: Partial<InsertProduct>): Promise<Product> {
    try {
      const [updated] = await db
        .update(products)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(products.id, id))
        .returning();
      
      if (!updated) {
        throw new Error('Product not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating product:', error);
      throw new Error('Failed to update product');
    }
  }

  async deleteProduct(id: string): Promise<void> {
    try {
      await db.delete(products).where(eq(products.id, id));
    } catch (error) {
      console.error('Error deleting product:', error);
      throw new Error('Failed to delete product');
    }
  }

  // Order Management Implementation  
  async createOrder(order: InsertOrder): Promise<Order> {
    try {
      const [newOrder] = await db.insert(orders).values(order).returning();
      return newOrder;
    } catch (error) {
      console.error('Error creating order:', error);
      throw new Error('Failed to create order');
    }
  }

  async getOrder(id: string): Promise<Order | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      return order;
    } catch (error) {
      console.error('Error getting order:', error);
      throw new Error('Failed to get order');
    }
  }

  async getOrderByPaymentIntent(stripePaymentIntentId: string): Promise<Order | undefined> {
    try {
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.stripePaymentIntentId, stripePaymentIntentId));
      return order;
    } catch (error) {
      console.error('Error getting order by payment intent:', error);
      throw new Error('Failed to get order');
    }
  }

  async updateOrder(id: string, updates: Partial<InsertOrder>): Promise<Order> {
    try {
      const [updated] = await db
        .update(orders)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(orders.id, id))
        .returning();
      
      if (!updated) {
        throw new Error('Order not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating order:', error);
      throw new Error('Failed to update order');
    }
  }

  async getUserOrders(userId: string, limit: number = 50): Promise<Order[]> {
    try {
      return await db
        .select()
        .from(orders)
        .where(eq(orders.userId, userId))
        .orderBy(sql`${orders.createdAt} DESC`)
        .limit(limit);
    } catch (error) {
      console.error('Error getting user orders:', error);
      throw new Error('Failed to get user orders');
    }
  }

  async getOrderWithItems(id: string): Promise<(Order & { items: OrderItem[] }) | undefined> {
    try {
      const [order] = await db.select().from(orders).where(eq(orders.id, id));
      if (!order) return undefined;

      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, id));

      return { ...order, items };
    } catch (error) {
      console.error('Error getting order with items:', error);
      throw new Error('Failed to get order with items');
    }
  }

  // Order Items Implementation
  async createOrderItems(items: InsertOrderItem[]): Promise<OrderItem[]> {
    try {
      return await db.insert(orderItems).values(items).returning();
    } catch (error) {
      console.error('Error creating order items:', error);
      throw new Error('Failed to create order items');
    }
  }

  async getOrderItems(orderId: string): Promise<OrderItem[]> {
    try {
      return await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, orderId));
    } catch (error) {
      console.error('Error getting order items:', error);
      throw new Error('Failed to get order items');
    }
  }

  // Shopping Cart Implementation
  async getCartItems(userId: string): Promise<(CartItem & { product: Product })[]> {
    try {
      const items = await db
        .select({
          id: cartItems.id,
          userId: cartItems.userId,
          productId: cartItems.productId,
          quantity: cartItems.quantity,
          createdAt: cartItems.createdAt,
          updatedAt: cartItems.updatedAt,
          product: products,
        })
        .from(cartItems)
        .innerJoin(products, eq(cartItems.productId, products.id))
        .where(eq(cartItems.userId, userId));
      
      return items;
    } catch (error) {
      console.error('Error getting cart items:', error);
      throw new Error('Failed to get cart items');
    }
  }

  async addToCart(userId: string, productId: string, quantity: number): Promise<CartItem> {
    try {
      const [item] = await db
        .insert(cartItems)
        .values({ userId, productId, quantity })
        .onConflictDoUpdate({
          target: [cartItems.userId, cartItems.productId],
          set: {
            quantity: sql`${cartItems.quantity} + ${quantity}`,
            updatedAt: new Date(),
          },
        })
        .returning();
      
      return item;
    } catch (error) {
      console.error('Error adding to cart:', error);
      throw new Error('Failed to add to cart');
    }
  }

  async updateCartItem(userId: string, productId: string, quantity: number): Promise<CartItem> {
    try {
      const [updated] = await db
        .update(cartItems)
        .set({ quantity, updatedAt: new Date() })
        .where(and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        ))
        .returning();
      
      if (!updated) {
        throw new Error('Cart item not found');
      }
      return updated;
    } catch (error) {
      console.error('Error updating cart item:', error);
      throw new Error('Failed to update cart item');
    }
  }

  async removeFromCart(userId: string, productId: string): Promise<void> {
    try {
      await db
        .delete(cartItems)
        .where(and(
          eq(cartItems.userId, userId),
          eq(cartItems.productId, productId)
        ));
    } catch (error) {
      console.error('Error removing from cart:', error);
      throw new Error('Failed to remove from cart');
    }
  }

  async clearCart(userId: string): Promise<void> {
    try {
      await db.delete(cartItems).where(eq(cartItems.userId, userId));
    } catch (error) {
      console.error('Error clearing cart:', error);
      throw new Error('Failed to clear cart');
    }
  }

  async recordWebVital(vital: Omit<InsertWebVital, 'id' | 'createdAt'>): Promise<WebVital> {
    try {
      const [newVital] = await db.insert(webVitals).values(vital).returning();
      return newVital;
    } catch (error) {
      console.error('Error recording web vital:', error);
      throw new Error('Failed to record web vital');
    }
  }

  async getWebVitals(limit: number = 100, offset: number = 0): Promise<{ vitals: WebVital[], total: number }> {
    try {
      const vitals = await db
        .select()
        .from(webVitals)
        .orderBy(sql`${webVitals.createdAt} DESC`)
        .limit(limit)
        .offset(offset);

      const [{ count }] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(webVitals);

      return { vitals, total: count };
    } catch (error) {
      console.error('Error getting web vitals:', error);
      throw new Error('Failed to get web vitals');
    }
  }

  async getWebVitalsByMetric(metricName: string, limit: number = 100): Promise<WebVital[]> {
    try {
      return await db
        .select()
        .from(webVitals)
        .where(eq(webVitals.name, metricName))
        .orderBy(sql`${webVitals.createdAt} DESC`)
        .limit(limit);
    } catch (error) {
      console.error('Error getting web vitals by metric:', error);
      throw new Error('Failed to get web vitals by metric');
    }
  }

  async getWebVitalsStats(metricName?: string, days: number = 7): Promise<{
    average: number;
    p75: number;
    p95: number;
    count: number;
    goodCount: number;
    needsImprovementCount: number;
    poorCount: number;
  }> {
    try {
      const dateThreshold = new Date();
      dateThreshold.setDate(dateThreshold.getDate() - days);

      const whereClause = metricName
        ? and(
            eq(webVitals.name, metricName),
            sql`${webVitals.createdAt} >= ${dateThreshold.toISOString()}`
          )
        : sql`${webVitals.createdAt} >= ${dateThreshold.toISOString()}`;

      const stats = await db
        .select({
          average: sql<number>`AVG(${webVitals.value})::numeric`,
          p75: sql<number>`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY ${webVitals.value})::numeric`,
          p95: sql<number>`PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY ${webVitals.value})::numeric`,
          count: sql<number>`COUNT(*)::int`,
          goodCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'good')::int`,
          needsImprovementCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'needs-improvement')::int`,
          poorCount: sql<number>`COUNT(*) FILTER (WHERE ${webVitals.rating} = 'poor')::int`,
        })
        .from(webVitals)
        .where(whereClause);

      return stats[0] || {
        average: 0,
        p75: 0,
        p95: 0,
        count: 0,
        goodCount: 0,
        needsImprovementCount: 0,
        poorCount: 0,
      };
    } catch (error) {
      console.error('Error getting web vitals stats:', error);
      throw new Error('Failed to get web vitals stats');
    }
  }
}

export const storage = new DatabaseStorage();
