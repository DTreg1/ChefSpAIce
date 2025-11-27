/**
 * Storage Layer Integration Tests - Complete Flow Tests
 * 
 * Tests the complete flow: StorageRoot -> Facade -> Domain -> Database
 * These tests use the actual database and verify data persistence.
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  TestContext, 
  testFactories, 
  generateTestId, 
  generateTestEmail,
  verifyDatabaseConnection,
  assertions,
} from './testUtils';
import { StorageRoot } from '../../StorageRoot';
import { 
  StorageError, 
  StorageNotFoundError,
  StorageConstraintError,
  isStorageError,
} from '../../errors/StorageError';

describe('Storage Layer Integration Tests', () => {
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

  describe('User Flow Tests', () => {
    it('should create and retrieve user through StorageRoot', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        firstName: 'Integration',
        lastName: 'TestUser',
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      assert.ok(createdUser.id, 'User should have an ID');
      assert.strictEqual(createdUser.firstName, 'Integration');
      assert.strictEqual(createdUser.lastName, 'TestUser');
      assert.strictEqual(createdUser.email, userData.email);

      const retrievedUser = await storage.getUserById(createdUser.id);
      assert.ok(retrievedUser, 'User should be retrievable');
      assert.strictEqual(retrievedUser.id, createdUser.id);
      assert.strictEqual(retrievedUser.email, userData.email);
    });

    it('should update user through StorageRoot', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const updatedUser = await storage.updateUser(createdUser.id, {
        firstName: 'UpdatedFirst',
        lastName: 'UpdatedLast',
        householdSize: 5,
      });

      assert.ok(updatedUser, 'Updated user should be returned');
      assert.strictEqual(updatedUser.firstName, 'UpdatedFirst');
      assert.strictEqual(updatedUser.lastName, 'UpdatedLast');
      assert.strictEqual(updatedUser.householdSize, 5);

      const retrievedUser = await storage.getUserById(createdUser.id);
      assert.strictEqual(retrievedUser?.firstName, 'UpdatedFirst');
    });

    it('should delete user through StorageRoot', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);

      await storage.deleteUser(createdUser.id);

      const retrievedUser = await storage.getUserById(createdUser.id);
      assert.strictEqual(retrievedUser, undefined, 'User should not exist after deletion');
    });

    it('should find user by email through StorageRoot', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData = testFactories.user(ctx, { email });
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const foundUser = await storage.getUserByEmail(email);
      assert.ok(foundUser, 'User should be found by email');
      assert.strictEqual(foundUser.id, createdUser.id);
    });

    it('should return undefined for non-existent user', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const result = await storage.getUserById('non-existent-id-12345');
      assert.strictEqual(result, undefined);
    });
  });

  describe('User Preferences Flow Tests', () => {
    it('should update and retrieve user preferences', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const preferences = {
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        allergens: ['peanuts', 'dairy'],
        householdSize: 4,
        cookingSkillLevel: 'advanced',
        preferredUnits: 'metric',
      };

      const updatedUser = await storage.updateUserPreferences(createdUser.id, preferences);
      assert.ok(updatedUser, 'Updated user should be returned');

      const retrievedPrefs = await storage.getUserPreferences(createdUser.id);
      assert.ok(retrievedPrefs, 'Preferences should be retrievable');
      assert.deepStrictEqual(retrievedPrefs.dietaryRestrictions, preferences.dietaryRestrictions);
      assert.deepStrictEqual(retrievedPrefs.allergens, preferences.allergens);
      assert.strictEqual(retrievedPrefs.householdSize, 4);
      assert.strictEqual(retrievedPrefs.cookingSkillLevel, 'advanced');
    });

    it('should mark onboarding complete', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, { hasCompletedOnboarding: false });
      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      assert.strictEqual(createdUser.hasCompletedOnboarding, false);

      await storage.markOnboardingComplete(createdUser.id);

      const updatedUser = await storage.getUserById(createdUser.id);
      assert.strictEqual(updatedUser?.hasCompletedOnboarding, true);
    });
  });

  describe('Session Flow Tests', () => {
    it('should create and retrieve session', async function() {
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
    });

    it('should update session', async function() {
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

      const newExpire = new Date(Date.now() + 172800000);
      const newSess = { ...sessionData.sess, updated: true };

      await storage.updateSession(sessionData.sid, newSess, newExpire);

      const updatedSession = await storage.getSession(sessionData.sid);
      assert.ok(updatedSession, 'Session should be retrievable after update');
    });

    it('should delete session', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const sessionData = testFactories.session();

      await storage.createSession(
        sessionData.sid,
        sessionData.sess,
        sessionData.expire
      );

      await storage.deleteSession(sessionData.sid);

      const retrievedSession = await storage.getSession(sessionData.sid);
      assert.strictEqual(retrievedSession, undefined);
    });
  });

  describe('Recipe Flow Tests', () => {
    it('should create and retrieve recipe through full flow', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, {
        title: 'Integration Test Pasta',
        cuisine: 'italian',
      });

      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      assert.ok(createdRecipe.id, 'Recipe should have an ID');
      assert.strictEqual(createdRecipe.title, 'Integration Test Pasta');
      assert.strictEqual(createdRecipe.cuisine, 'italian');
      assert.strictEqual(createdRecipe.userId, user.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);
      assert.ok(retrievedRecipe, 'Recipe should be retrievable');
      assert.strictEqual(retrievedRecipe.id, createdRecipe.id);
    });

    it('should update recipe', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id);
      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const updatedRecipe = await storage.user.recipes.updateRecipe(user.id, createdRecipe.id, {
        title: 'Updated Recipe Title',
        servings: 8,
      });

      assert.ok(updatedRecipe, 'Updated recipe should be returned');
      assert.strictEqual(updatedRecipe.title, 'Updated Recipe Title');
      assert.strictEqual(updatedRecipe.servings, 8);
    });

    it('should delete recipe', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id);
      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);

      await storage.user.recipes.deleteRecipe(user.id, createdRecipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, createdRecipe.id);
      assert.strictEqual(retrievedRecipe, undefined);
    });

    it('should toggle recipe favorite', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id, { isFavorite: false });
      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      assert.strictEqual(createdRecipe.isFavorite, false);

      const toggledRecipe = await storage.user.recipes.toggleRecipeFavorite(user.id, createdRecipe.id);
      assert.strictEqual(toggledRecipe?.isFavorite, true);

      const toggledAgain = await storage.user.recipes.toggleRecipeFavorite(user.id, createdRecipe.id);
      assert.strictEqual(toggledAgain?.isFavorite, false);
    });

    it('should search recipes by title', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const uniqueTitle = `Unique Integration ${generateTestId()}`;
      const recipeData = testFactories.recipe(user.id, { title: uniqueTitle });
      const createdRecipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(createdRecipe.id);

      const searchResults = await storage.user.recipes.searchRecipes(user.id, 'Unique Integration');
      
      assert.ok(searchResults.length > 0, 'Should find at least one recipe');
      const found = searchResults.find(r => r.id === createdRecipe.id);
      assert.ok(found, 'Created recipe should be in search results');
    });
  });

  describe('Meal Plan Flow Tests', () => {
    it('should create and retrieve meal plan', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id);
      const recipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(recipe.id);

      const today = new Date().toISOString().split('T')[0];
      const mealPlanData = testFactories.mealPlan(user.id, recipe.id, {
        date: today,
        mealType: 'dinner',
      });

      const createdPlan = await storage.user.recipes.createMealPlan(mealPlanData);
      ctx.trackMealPlan(createdPlan.id);

      assert.ok(createdPlan.id, 'Meal plan should have an ID');
      assert.strictEqual(createdPlan.userId, user.id);
      assert.strictEqual(createdPlan.recipeId, recipe.id);
      assert.strictEqual(createdPlan.mealType, 'dinner');

      const retrievedPlan = await storage.user.recipes.getMealPlan(user.id, createdPlan.id);
      assert.ok(retrievedPlan, 'Meal plan should be retrievable');
    });

    it('should get meal plans by date', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const today = new Date().toISOString().split('T')[0];

      const mealPlanData1 = testFactories.mealPlan(user.id, null, {
        date: today,
        mealType: 'breakfast',
      });
      const mealPlanData2 = testFactories.mealPlan(user.id, null, {
        date: today,
        mealType: 'lunch',
      });

      const plan1 = await storage.user.recipes.createMealPlan(mealPlanData1);
      const plan2 = await storage.user.recipes.createMealPlan(mealPlanData2);
      ctx.trackMealPlan(plan1.id);
      ctx.trackMealPlan(plan2.id);

      const plansForDate = await storage.user.recipes.getMealPlansByDate(user.id, today);
      
      assert.ok(plansForDate.length >= 2, 'Should find at least 2 meal plans');
      const foundPlan1 = plansForDate.find(p => p.id === plan1.id);
      const foundPlan2 = plansForDate.find(p => p.id === plan2.id);
      assert.ok(foundPlan1 && foundPlan2, 'Both created plans should be found');
    });

    it('should mark meal plan as completed', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const mealPlanData = testFactories.mealPlan(user.id, null, {
        isCompleted: false,
      });

      const createdPlan = await storage.user.recipes.createMealPlan(mealPlanData);
      ctx.trackMealPlan(createdPlan.id);

      assert.strictEqual(createdPlan.isCompleted, false);

      await storage.user.recipes.markMealPlanCompleted(user.id, createdPlan.id);

      const updatedPlan = await storage.user.recipes.getMealPlan(user.id, createdPlan.id);
      assert.strictEqual(updatedPlan?.isCompleted, true);
    });
  });

  describe('Data Isolation Tests', () => {
    it('should isolate user data between different users', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData1 = testFactories.user(ctx, { firstName: 'User1' });
      const userData2 = testFactories.user(ctx, { firstName: 'User2' });

      const user1 = await storage.createUser(userData1);
      const user2 = await storage.createUser(userData2);
      ctx.trackUser(user1.id);
      ctx.trackUser(user2.id);

      const recipeData1 = testFactories.recipe(user1.id, { title: 'User1 Recipe' });
      const recipeData2 = testFactories.recipe(user2.id, { title: 'User2 Recipe' });

      const recipe1 = await storage.user.recipes.createRecipe(user1.id, recipeData1);
      const recipe2 = await storage.user.recipes.createRecipe(user2.id, recipeData2);
      ctx.trackRecipe(recipe1.id);
      ctx.trackRecipe(recipe2.id);

      const user1Recipes = await storage.user.recipes.getRecipes(user1.id);
      const user2Recipes = await storage.user.recipes.getRecipes(user2.id);

      const user1HasRecipe1 = user1Recipes.some(r => r.id === recipe1.id);
      const user1HasRecipe2 = user1Recipes.some(r => r.id === recipe2.id);
      const user2HasRecipe1 = user2Recipes.some(r => r.id === recipe1.id);
      const user2HasRecipe2 = user2Recipes.some(r => r.id === recipe2.id);

      assert.ok(user1HasRecipe1, 'User1 should have their own recipe');
      assert.ok(!user1HasRecipe2, 'User1 should not have User2 recipe');
      assert.ok(!user2HasRecipe1, 'User2 should not have User1 recipe');
      assert.ok(user2HasRecipe2, 'User2 should have their own recipe');
    });
  });
});

console.log('Storage flow integration tests loaded successfully');
