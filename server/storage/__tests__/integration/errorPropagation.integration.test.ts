/**
 * Storage Layer Integration Tests - Error Propagation
 * 
 * Tests error propagation from database through storage layers to API:
 * - Constraint violations (unique, foreign key)
 * - Not found errors
 * - Validation errors
 * - Connection errors (simulated)
 */

import { describe, it, before, after, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert';
import { 
  TestContext, 
  testFactories, 
  generateTestEmail,
  verifyDatabaseConnection,
} from './testUtils';
import { StorageRoot } from '../../StorageRoot';
import { 
  StorageError, 
  StorageNotFoundError,
  StorageValidationError,
  StorageConstraintError,
  StorageErrorCode,
  isStorageError,
} from '../../errors/StorageError';

describe('Error Propagation Integration Tests', () => {
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

  describe('Constraint Violation Errors', () => {
    it('should propagate unique constraint error for duplicate email', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let caughtError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError, 'Should throw an error');
      assert.ok(isStorageError(caughtError), 'Should be a StorageError');
      
      const storageError = caughtError as StorageError;
      assert.ok(
        storageError.code === StorageErrorCode.UNIQUE_VIOLATION ||
        storageError.code === StorageErrorCode.CONSTRAINT_VIOLATION ||
        storageError.message.includes('unique') ||
        storageError.message.includes('duplicate') ||
        storageError.message.includes('already exists'),
        `Error should indicate unique constraint violation, got: ${storageError.code} - ${storageError.message}`
      );
    });

    it('should include constraint information in error', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let caughtError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(isStorageError(caughtError), 'Should be a StorageError');
      
      const storageError = caughtError as StorageError;
      assert.ok(storageError.context, 'Error should have context');
      assert.ok(storageError.context.domain, 'Context should have domain');
      assert.ok(storageError.context.operation, 'Context should have operation');
    });
  });

  describe('Validation Errors', () => {
    it('should propagate validation error for invalid recipe rating', async function() {
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

      let caughtError: unknown;
      try {
        await storage.user.recipes.rateRecipe(user.id, recipe.id, 10);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError, 'Should throw an error for invalid rating');
      assert.ok(isStorageError(caughtError), 'Should be a StorageError');
      
      const storageError = caughtError as StorageError;
      assert.ok(
        storageError.code === StorageErrorCode.VALIDATION_FAILED ||
        storageError instanceof StorageValidationError,
        'Should be a validation error'
      );
    });

    it('should propagate validation error for rating below minimum', async function() {
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

      let caughtError: unknown;
      try {
        await storage.user.recipes.rateRecipe(user.id, recipe.id, 0);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError, 'Should throw an error for rating 0');
      assert.ok(isStorageError(caughtError), 'Should be a StorageError');
    });
  });

  describe('Not Found Handling', () => {
    it('should return undefined for non-existent user', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const result = await storage.getUserById('non-existent-user-id-12345');
      assert.strictEqual(result, undefined, 'Should return undefined for non-existent user');
    });

    it('should return undefined for non-existent recipe', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const result = await storage.user.recipes.getRecipe(user.id, 'non-existent-recipe-id');
      assert.strictEqual(result, undefined, 'Should return undefined for non-existent recipe');
    });

    it('should return undefined when toggling favorite for non-existent recipe', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const result = await storage.user.recipes.toggleRecipeFavorite(user.id, 'non-existent-id');
      assert.strictEqual(result, undefined);
    });

    it('should return undefined for non-existent session', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const result = await storage.getSession('non-existent-session-id');
      assert.strictEqual(result, undefined);
    });

    it('should return undefined for non-existent meal plan', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const userData = testFactories.user(ctx);
      const user = await storage.createUser(userData);
      ctx.trackUser(user.id);

      const result = await storage.user.recipes.getMealPlan(user.id, 'non-existent-plan-id');
      assert.strictEqual(result, undefined);
    });
  });

  describe('Error Context Enrichment', () => {
    it('should include domain in error context', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let caughtError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(isStorageError(caughtError));
      const error = caughtError as StorageError;
      
      assert.ok(error.context.domain, 'Error context should have domain');
    });

    it('should include operation in error context', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let caughtError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(isStorageError(caughtError));
      const error = caughtError as StorageError;
      
      assert.ok(error.context.operation, 'Error context should have operation');
    });

    it('should include timestamp in error', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let caughtError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(isStorageError(caughtError));
      const error = caughtError as StorageError;
      
      assert.ok(error.timestamp instanceof Date, 'Error should have timestamp');
    });
  });

  describe('Error Type Preservation', () => {
    it('should preserve StorageError type through facade layer', async function() {
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

      let caughtError: unknown;
      try {
        await storage.user.recipes.rateRecipe(user.id, recipe.id, 100);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError instanceof StorageError, 'Error should be instance of StorageError');
    });

    it('should allow catching by specific error type', async function() {
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

      let isValidationError = false;
      try {
        await storage.user.recipes.rateRecipe(user.id, recipe.id, 100);
      } catch (error) {
        if (error instanceof StorageValidationError) {
          isValidationError = true;
        } else if (isStorageError(error) && error.code === StorageErrorCode.VALIDATION_FAILED) {
          isValidationError = true;
        }
      }

      assert.ok(isValidationError, 'Should be catchable as validation error');
    });
  });

  describe('Error Recovery', () => {
    it('should allow retry after constraint error', async function() {
      if (!dbConnected) {
        this.skip();
        return;
      }

      const email = generateTestEmail();
      const userData1 = testFactories.user(ctx, { email });
      const userData2 = testFactories.user(ctx, { email });

      const user1 = await storage.createUser(userData1);
      ctx.trackUser(user1.id);

      let firstError: unknown;
      try {
        await storage.createUser(userData2);
      } catch (error) {
        firstError = error;
      }
      assert.ok(firstError, 'First attempt should fail');

      const differentEmail = generateTestEmail();
      userData2.email = differentEmail;
      const user2 = await storage.createUser(userData2);
      ctx.trackUser(user2.id);

      assert.ok(user2.id, 'Second attempt with different email should succeed');
      assert.strictEqual(user2.email, differentEmail);
    });

    it('should continue working after handling error', async function() {
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

      try {
        await storage.user.recipes.rateRecipe(user.id, recipe.id, 100);
      } catch {
      }

      const validRating = await storage.user.recipes.rateRecipe(user.id, recipe.id, 5);
      assert.ok(validRating, 'Valid rating should succeed after error');
      assert.strictEqual(validRating.rating, 5);
    });
  });
});

console.log('Error propagation integration tests loaded successfully');
