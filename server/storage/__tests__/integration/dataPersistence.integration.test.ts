/**
 * Storage Layer Integration Tests - Data Persistence
 * 
 * Tests data persistence and retrieval:
 * - Data is correctly persisted to database
 * - Data types are preserved
 * - Complex data structures (arrays, JSON) are handled correctly
 * - Timestamps are managed properly
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  TestContext, 
  testFactories, 
  generateTestId,
  generateTestEmail,
  verifyDatabaseConnection,
  delay,
} from './testUtils';
import { StorageRoot } from '../../StorageRoot';

describe('Data Persistence Integration Tests', () => {
  let storage: StorageRoot;
  let ctx: TestContext;
  let dbConnected: boolean;

  before(async () => {
    dbConnected = await verifyDatabaseConnection();
    if (!dbConnected) {
      console.warn('Skipping integration tests: Database not available');
    }
    storage = new StorageRoot();
  });

  beforeEach(() => {
    ctx = new TestContext();
  });

  afterEach(async () => {
    if (dbConnected) {
      await ctx.cleanup();
    }
  });

  describe('Basic Data Persistence', () => {
    it('should persist user data correctly', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        firstName: 'Persistence',
        lastName: 'Test',
        householdSize: 5,
        cookingSkillLevel: 'advanced',
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.firstName, 'Persistence');
      assert.strictEqual(retrievedUser?.lastName, 'Test');
      assert.strictEqual(retrievedUser?.householdSize, 5);
      assert.strictEqual(retrievedUser?.cookingSkillLevel, 'advanced');
      assert.strictEqual(retrievedUser?.email, userData.email);
    });

    it('should persist recipe data correctly', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, {
        title: 'Persistence Test Recipe',
        prepTime: 20,
        cookTime: 45,
        servings: 6,
        difficulty: 'medium',
      });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.strictEqual(retrievedRecipe?.title, 'Persistence Test Recipe');
      assert.strictEqual(Number(retrievedRecipe?.prepTime), 20);
      assert.strictEqual(Number(retrievedRecipe?.cookTime), 45);
      assert.strictEqual(Number(retrievedRecipe?.servings), 6);
      assert.strictEqual(retrievedRecipe?.difficulty, 'medium');
    });

    it('should persist session data correctly', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const sessionData = testFactories.session();
      ctx.trackSession(sessionData.sid);

      await storage.createSession(
        sessionData.sid,
        sessionData.sess,
        sessionData.expire
      );

      const retrievedSession = await storage.getSession(sessionData.sid);

      assert.ok(retrievedSession, 'Session should be retrievable');
      assert.strictEqual(retrievedSession.sid, sessionData.sid);
      assert.ok(retrievedSession.sess, 'Session data should be persisted');
    });
  });

  describe('Array Data Persistence', () => {
    it('should persist dietary restrictions array', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const restrictions = ['vegetarian', 'gluten-free', 'dairy-free'];
      const userData = testFactories.user(ctx, {
        dietaryRestrictions: restrictions,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.deepStrictEqual(retrievedUser?.dietaryRestrictions, restrictions);
    });

    it('should persist allergens array', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const allergens = ['peanuts', 'shellfish', 'eggs'];
      const userData = testFactories.user(ctx, {
        allergens,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.deepStrictEqual(retrievedUser?.allergens, allergens);
    });

    it('should persist recipe ingredients array', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const ingredients = ['flour', 'eggs', 'milk', 'sugar', 'butter'];
      const recipeData = testFactories.recipe(user.id, { ingredients });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.deepStrictEqual(retrievedRecipe?.ingredients, ingredients);
    });

    it('should persist recipe instructions array', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const instructions = [
        'Preheat oven to 350°F',
        'Mix dry ingredients',
        'Add wet ingredients',
        'Bake for 30 minutes',
      ];
      const recipeData = testFactories.recipe(user.id, { instructions });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.deepStrictEqual(retrievedRecipe?.instructions, instructions);
    });

    it('should persist storage areas array', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const storageAreas = ['Fridge', 'Freezer', 'Pantry', 'Spice Rack', 'Counter'];
      const userData = testFactories.user(ctx, {
        storageAreasEnabled: storageAreas,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.deepStrictEqual(retrievedUser?.storageAreasEnabled, storageAreas);
    });
  });

  describe('Boolean Data Persistence', () => {
    it('should persist notification preferences', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        notificationsEnabled: true,
        notifyExpiringFood: true,
        notifyRecipeSuggestions: false,
        notifyMealReminders: true,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.notificationsEnabled, true);
      assert.strictEqual(retrievedUser?.notifyExpiringFood, true);
      assert.strictEqual(retrievedUser?.notifyRecipeSuggestions, false);
      assert.strictEqual(retrievedUser?.notifyMealReminders, true);
    });

    it('should persist recipe favorite status', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, { isFavorite: true });
      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.strictEqual(retrievedRecipe?.isFavorite, true);
    });

    it('should persist admin status', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, { isAdmin: true });
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.isAdmin, true);
    });

    it('should persist onboarding completion status', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, { hasCompletedOnboarding: true });
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.hasCompletedOnboarding, true);
    });
  });

  describe('Numeric Data Persistence', () => {
    it('should persist integer values', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        householdSize: 7,
        expirationAlertDays: 5,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.householdSize, 7);
      assert.strictEqual(retrievedUser?.expirationAlertDays, 5);
    });

    it('should persist recipe numeric values', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, {
        prepTime: 25,
        cookTime: 90,
        servings: 12,
        rating: 4,
      });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.strictEqual(Number(retrievedRecipe?.prepTime), 25);
      assert.strictEqual(Number(retrievedRecipe?.cookTime), 90);
      assert.strictEqual(Number(retrievedRecipe?.servings), 12);
    });
  });

  describe('Null Value Handling', () => {
    it('should handle null optional fields', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        profileImageUrl: null,
        primaryProviderId: null,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.profileImageUrl, null);
      assert.strictEqual(retrievedUser?.primaryProviderId, null);
    });

    it('should handle null recipe fields', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, {
        rating: null,
        imageUrl: null,
      });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);

      assert.strictEqual(retrievedRecipe?.rating, null);
      assert.strictEqual(retrievedRecipe?.imageUrl, null);
    });
  });

  describe('Timestamp Management', () => {
    it('should set createdAt on creation', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const beforeCreate = new Date();
      await delay(10);

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      await delay(10);
      const afterCreate = new Date();

      const retrievedUser = await storage.getUserById(createdUser.id);
      const createdAt = new Date(retrievedUser?.createdAt || 0);

      assert.ok(createdAt >= beforeCreate, 'createdAt should be >= test start time');
      assert.ok(createdAt <= afterCreate, 'createdAt should be <= test end time');
    });

    it('should update updatedAt on update', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const originalUpdatedAt = new Date(createdUser.updatedAt || 0);

      await delay(100);

      await storage.updateUser(createdUser.id, { firstName: 'Updated' });

      const retrievedUser = await storage.getUserById(createdUser.id);
      const newUpdatedAt = new Date(retrievedUser?.updatedAt || 0);

      assert.ok(newUpdatedAt > originalUpdatedAt, 'updatedAt should be newer after update');
    });
  });

  describe('Data Update Persistence', () => {
    it('should persist partial updates', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        firstName: 'Original',
        lastName: 'Name',
        householdSize: 2,
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      await storage.updateUser(createdUser.id, {
        firstName: 'Updated',
      });

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.strictEqual(retrievedUser?.firstName, 'Updated');
      assert.strictEqual(retrievedUser?.lastName, 'Name');
      assert.strictEqual(retrievedUser?.householdSize, 2);
    });

    it('should persist array updates', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        allergens: ['peanuts'],
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      await storage.updateUser(createdUser.id, {
        allergens: ['peanuts', 'shellfish', 'dairy'],
      });

      const retrievedUser = await storage.getUserById(createdUser.id);

      assert.deepStrictEqual(
        retrievedUser?.allergens, 
        ['peanuts', 'shellfish', 'dairy']
      );
    });
  });

  describe('Query Result Consistency', () => {
    it('should return consistent data across multiple queries', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const query1 = await storage.getUserById(createdUser.id);
      const query2 = await storage.getUserById(createdUser.id);
      const query3 = await storage.getUserByEmail(userData.email);

      assert.deepStrictEqual(query1, query2);
      assert.deepStrictEqual(query1?.id, query3?.id);
      assert.deepStrictEqual(query1?.email, query3?.email);
    });
  });
});

console.log('Data persistence integration tests loaded successfully');
