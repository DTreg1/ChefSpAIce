/**
 * Storage Layer Integration Tests - Transaction Behavior
 * 
 * Tests transaction behavior and atomicity:
 * - Multi-step operations
 * - Cascading operations
 * - Atomic updates
 * - Consistent reads
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
import { db } from '../../../db';
import { userRecipes, mealPlans } from '../../../../shared/schema';
import { eq } from 'drizzle-orm';

describe('Transaction Behavior Integration Tests', () => {
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

  describe('Atomic Operations', () => {
    it('should atomically create user with all fields', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx, {
        dietaryRestrictions: ['vegetarian', 'gluten-free'],
        allergens: ['peanuts'],
        storageAreasEnabled: ['Fridge', 'Pantry', 'Freezer'],
        householdSize: 4,
        cookingSkillLevel: 'intermediate',
      });

      const createdUser = await storage.createUser(userData);
      ctx.trackUser(createdUser.id);

      const retrieved = await storage.getUserById(createdUser.id);

      assert.ok(retrieved, 'User should be retrievable');
      assert.deepStrictEqual(retrieved.dietaryRestrictions, userData.dietaryRestrictions);
      assert.deepStrictEqual(retrieved.allergens, userData.allergens);
      assert.deepStrictEqual(retrieved.storageAreasEnabled, userData.storageAreasEnabled);
    });

    it('should atomically update multiple fields', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      await storage.updateUser(user.id, {
        firstName: 'Updated1',
        lastName: 'Updated2',
        householdSize: 10,
        cookingSkillLevel: 'advanced',
        preferredUnits: 'metric',
      });

      const retrieved = await storage.getUserById(user.id);

      assert.strictEqual(retrieved?.firstName, 'Updated1');
      assert.strictEqual(retrieved?.lastName, 'Updated2');
      assert.strictEqual(retrieved?.householdSize, 10);
      assert.strictEqual(retrieved?.cookingSkillLevel, 'advanced');
      assert.strictEqual(retrieved?.preferredUnits, 'metric');
    });

    it('should atomically create recipe with all components', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const ingredients = ['flour', 'eggs', 'milk', 'sugar', 'butter', 'vanilla'];
      const instructions = [
        'Mix dry ingredients',
        'Add wet ingredients',
        'Whisk until smooth',
        'Pour into pan',
        'Bake at 350°F',
      ];

      const recipeData = testFactories.recipe(user.id, {
        ingredients,
        instructions,
        prepTime: 15,
        cookTime: 30,
        servings: 8,
      });

      const recipe = await storage.user.recipes.createRecipe(user.id, recipeData);
      ctx.trackRecipe(recipe.id);

      const retrieved = await storage.user.recipes.getRecipe(user.id, recipe.id);

      assert.deepStrictEqual(retrieved?.ingredients, ingredients);
      assert.deepStrictEqual(retrieved?.instructions, instructions);
      assert.strictEqual(retrieved?.prepTime, 15);
      assert.strictEqual(retrieved?.cookTime, 30);
      assert.strictEqual(retrieved?.servings, 8);
    });
  });

  describe('Multi-Step Operations', () => {
    it('should handle user creation and recipe creation in sequence', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipe1Data = testFactories.recipe(user.id, { title: 'Recipe 1' });
      const recipe2Data = testFactories.recipe(user.id, { title: 'Recipe 2' });
      const recipe3Data = testFactories.recipe(user.id, { title: 'Recipe 3' });

      const recipe1 = await storage.user.recipes.createRecipe(user.id, recipe1Data);
      const recipe2 = await storage.user.recipes.createRecipe(user.id, recipe2Data);
      const recipe3 = await storage.user.recipes.createRecipe(user.id, recipe3Data);
      ctx.trackRecipe(recipe1.id);
      ctx.trackRecipe(recipe2.id);
      ctx.trackRecipe(recipe3.id);

      const allRecipes = await storage.user.recipes.getRecipes(user.id);
      
      const foundRecipes = allRecipes.filter(r => 
        [recipe1.id, recipe2.id, recipe3.id].includes(r.id)
      );
      
      assert.strictEqual(foundRecipes.length, 3);
    });

    it('should handle recipe creation and meal plan creation in sequence', async function() {
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
      const planData1 = testFactories.mealPlan(user.id, recipe.id, { 
        date: today, 
        mealType: 'breakfast' 
      });
      const planData2 = testFactories.mealPlan(user.id, recipe.id, { 
        date: today, 
        mealType: 'lunch' 
      });
      const planData3 = testFactories.mealPlan(user.id, recipe.id, { 
        date: today, 
        mealType: 'dinner' 
      });

      const plan1 = await storage.user.recipes.createMealPlan(planData1);
      const plan2 = await storage.user.recipes.createMealPlan(planData2);
      const plan3 = await storage.user.recipes.createMealPlan(planData3);
      ctx.trackMealPlan(plan1.id);
      ctx.trackMealPlan(plan2.id);
      ctx.trackMealPlan(plan3.id);

      const plansForDay = await storage.user.recipes.getMealPlansByDate(user.id, today);
      const foundPlans = plansForDay.filter(p => 
        [plan1.id, plan2.id, plan3.id].includes(p.id)
      );

      assert.strictEqual(foundPlans.length, 3);
      
      const mealTypes = foundPlans.map(p => p.mealType).sort();
      assert.deepStrictEqual(mealTypes, ['breakfast', 'dinner', 'lunch']);
    });
  });

  describe('Cascading Behavior', () => {
    it('should maintain referential integrity in meal plans', async function() {
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

      const planData = testFactories.mealPlan(user.id, recipe.id);
      const plan = await storage.user.recipes.createMealPlan(planData);
      ctx.trackMealPlan(plan.id);

      const retrievedPlan = await storage.user.recipes.getMealPlan(user.id, plan.id);
      assert.strictEqual(retrievedPlan?.recipeId, recipe.id);

      const retrievedRecipe = await storage.user.recipes.getRecipe(user.id, recipe.id);
      assert.ok(retrievedRecipe, 'Recipe should still exist');
    });

    it('should handle orphaned meal plans correctly', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const planData = testFactories.mealPlan(user.id, null, {
        mealType: 'snack',
      });
      const plan = await storage.user.recipes.createMealPlan(planData);
      ctx.trackMealPlan(plan.id);

      const retrievedPlan = await storage.user.recipes.getMealPlan(user.id, plan.id);
      
      assert.ok(retrievedPlan, 'Plan without recipe should exist');
      assert.strictEqual(retrievedPlan.recipeId, null);
      assert.strictEqual(retrievedPlan.mealType, 'snack');
    });
  });

  describe('Concurrent-Like Operations', () => {
    it('should handle multiple rapid updates', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      await Promise.all([
        storage.updateUser(user.id, { firstName: 'Update1' }),
        storage.updateUser(user.id, { lastName: 'Update2' }),
        storage.updateUser(user.id, { householdSize: 5 }),
      ]);

      const retrieved = await storage.getUserById(user.id);

      assert.ok(retrieved);
      assert.strictEqual(retrieved.householdSize, 5);
    });

    it('should handle multiple rapid recipe creations', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const createRecipes = Array.from({ length: 5 }, (_, i) => {
        const recipeData = testFactories.recipe(user.id, { title: `Rapid Recipe ${i}` });
        return storage.user.recipes.createRecipe(user.id, recipeData);
      });

      const recipes = await Promise.all(createRecipes);
      recipes.forEach(r => ctx.trackRecipe(r.id));

      const allRecipes = await storage.user.recipes.getRecipes(user.id);
      const rapidRecipes = allRecipes.filter(r => r.title.startsWith('Rapid Recipe'));

      assert.strictEqual(rapidRecipes.length, 5);
    });
  });

  describe('Isolation Testing', () => {
    it('should isolate user operations completely', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData1 = testFactories.user(ctx, { firstName: 'User1' });
      const userData2 = testFactories.user(ctx, { firstName: 'User2' });

      const [user1, user2] = await Promise.all([
        storage.createUser(userData1),
        storage.createUser(userData2),
      ]);
      ctx.trackUser(user1.id);
      ctx.trackUser(user2.id);

      const recipeData1 = testFactories.recipe(user1.id, { title: 'User1 Private Recipe' });
      const recipeData2 = testFactories.recipe(user2.id, { title: 'User2 Private Recipe' });

      const [recipe1, recipe2] = await Promise.all([
        storage.user.recipes.createRecipe(user1.id, recipeData1),
        storage.user.recipes.createRecipe(user2.id, recipeData2),
      ]);
      ctx.trackRecipe(recipe1.id);
      ctx.trackRecipe(recipe2.id);

      await storage.updateUser(user1.id, { householdSize: 10 });

      const [user1Retrieved, user2Retrieved] = await Promise.all([
        storage.getUserById(user1.id),
        storage.getUserById(user2.id),
      ]);

      assert.strictEqual(user1Retrieved?.householdSize, 10);
      assert.strictEqual(user2Retrieved?.householdSize, 2);
    });

    it('should not leak data between users during concurrent reads', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData1 = testFactories.user(ctx);
      const userData2 = testFactories.user(ctx);

      const user1 = await storage.createUser(userData1);
      const user2 = await storage.createUser(userData2);
      ctx.trackUser(user1.id);
      ctx.trackUser(user2.id);

      const user1Recipes = Array.from({ length: 3 }, (_, i) => 
        testFactories.recipe(user1.id, { title: `User1Recipe${i}` })
      );
      const user2Recipes = Array.from({ length: 3 }, (_, i) => 
        testFactories.recipe(user2.id, { title: `User2Recipe${i}` })
      );

      for (const data of user1Recipes) {
        const r = await storage.user.recipes.createRecipe(user1.id, data);
        ctx.trackRecipe(r.id);
      }
      for (const data of user2Recipes) {
        const r = await storage.user.recipes.createRecipe(user2.id, data);
        ctx.trackRecipe(r.id);
      }

      const [retrieved1, retrieved2] = await Promise.all([
        storage.user.recipes.getRecipes(user1.id),
        storage.user.recipes.getRecipes(user2.id),
      ]);

      const user1Titles = retrieved1.filter(r => r.title.startsWith('User1Recipe'));
      const user2Titles = retrieved2.filter(r => r.title.startsWith('User2Recipe'));
      const user1HasUser2 = retrieved1.some(r => r.title.startsWith('User2Recipe'));
      const user2HasUser1 = retrieved2.some(r => r.title.startsWith('User1Recipe'));

      assert.strictEqual(user1Titles.length, 3);
      assert.strictEqual(user2Titles.length, 3);
      assert.ok(!user1HasUser2, 'User1 should not see User2 recipes');
      assert.ok(!user2HasUser1, 'User2 should not see User1 recipes');
    });
  });

  describe('Consistent Read After Write', () => {
    it('should read updated data immediately after write', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      for (let i = 1; i <= 5; i++) {
        await storage.updateUser(user.id, { householdSize: i });
        const retrieved = await storage.getUserById(user.id);
        assert.strictEqual(retrieved?.householdSize, i, `Iteration ${i} should show householdSize=${i}`);
      }
    });

    it('should read created recipe immediately after creation', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      for (let i = 1; i <= 3; i++) {
        const recipeData = testFactories.recipe(user.id, { title: `Sequential Recipe ${i}` });
        const created = await storage.user.recipes.createRecipe(user.id, recipeData);
        ctx.trackRecipe(created.id);

        const retrieved = await storage.user.recipes.getRecipe(user.id, created.id);
        assert.ok(retrieved, `Recipe ${i} should be immediately retrievable`);
        assert.strictEqual(retrieved.title, `Sequential Recipe ${i}`);
      }
    });
  });

  describe('Deletion Consistency', () => {
    it('should not find deleted recipes', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const recipeData = testFactories.recipe(user.id);
      const recipe = await storage.user.recipes.createRecipe(user.id, recipeData);

      const beforeDelete = await storage.user.recipes.getRecipe(user.id, recipe.id);
      assert.ok(beforeDelete, 'Recipe should exist before deletion');

      await storage.user.recipes.deleteRecipe(user.id, recipe.id);

      const afterDelete = await storage.user.recipes.getRecipe(user.id, recipe.id);
      assert.strictEqual(afterDelete, undefined, 'Recipe should not exist after deletion');

      const allRecipes = await storage.user.recipes.getRecipes(user.id);
      const found = allRecipes.find(r => r.id === recipe.id);
      assert.strictEqual(found, undefined, 'Deleted recipe should not appear in list');
    });

    it('should not find deleted sessions', async function() {
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

      const beforeDelete = await storage.getSession(sessionData.sid);
      assert.ok(beforeDelete, 'Session should exist before deletion');

      await storage.deleteSession(sessionData.sid);

      const afterDelete = await storage.getSession(sessionData.sid);
      assert.strictEqual(afterDelete, undefined, 'Session should not exist after deletion');
    });
  });
});

console.log('Transaction behavior integration tests loaded successfully');
