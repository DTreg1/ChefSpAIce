/**
 * Storage Error Tests
 * 
 * Tests for the storage error classes and error handling utilities.
 * Covers:
 * - StorageError base class
 * - StorageNotFoundError
 * - StorageValidationError
 * - StorageConnectionError
 * - StorageConstraintError
 * - wrapDatabaseError utility
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConnectionError,
  StorageConstraintError,
  StorageErrorCode,
  isStorageError,
  wrapDatabaseError,
  type StorageErrorContext,
} from '../errors/StorageError';

describe('StorageError', () => {
  const baseContext: StorageErrorContext = {
    domain: 'test',
    operation: 'testOperation',
    entityId: 'test-id',
    entityType: 'TestEntity',
  };

  describe('StorageError base class', () => {
    it('should create error with message, code, and context', () => {
      const error = new StorageError(
        'Test error message',
        StorageErrorCode.UNKNOWN,
        baseContext
      );

      assert.strictEqual(error.message, 'Test error message');
      assert.strictEqual(error.code, StorageErrorCode.UNKNOWN);
      assert.strictEqual(error.name, 'StorageError');
      assert.deepStrictEqual(error.context, baseContext);
      assert.ok(error.timestamp instanceof Date);
    });

    it('should include original error when provided', () => {
      const originalError = new Error('Original error');
      const error = new StorageError(
        'Wrapped error',
        StorageErrorCode.UNKNOWN,
        baseContext,
        originalError
      );

      assert.strictEqual(error.originalError, originalError);
    });

    it('should generate JSON representation', () => {
      const error = new StorageError(
        'Test error',
        StorageErrorCode.UNKNOWN,
        baseContext
      );

      const json = error.toJSON();
      assert.strictEqual(json.name, 'StorageError');
      assert.strictEqual(json.message, 'Test error');
      assert.strictEqual(json.code, StorageErrorCode.UNKNOWN);
      assert.deepStrictEqual(json.context, baseContext);
      assert.ok(typeof json.timestamp === 'string');
    });

    it('should generate user-friendly message', () => {
      const error = new StorageError(
        'Database failed',
        StorageErrorCode.UNKNOWN,
        baseContext
      );

      const userMessage = error.toUserMessage();
      assert.ok(userMessage.includes('testOperation'));
      assert.ok(userMessage.includes('test'));
      assert.ok(userMessage.includes('test-id'));
    });
  });

  describe('StorageNotFoundError', () => {
    it('should create not found error with correct code', () => {
      const error = new StorageNotFoundError(
        'Entity not found',
        baseContext
      );

      assert.strictEqual(error.code, StorageErrorCode.NOT_FOUND);
      assert.strictEqual(error.name, 'StorageNotFoundError');
    });

    it('should be instance of StorageError', () => {
      const error = new StorageNotFoundError('Not found', baseContext);
      assert.ok(error instanceof StorageError);
    });
  });

  describe('StorageValidationError', () => {
    it('should create validation error with invalid fields', () => {
      const invalidFields = ['email', 'password'];
      const error = new StorageValidationError(
        'Validation failed',
        baseContext,
        invalidFields
      );

      assert.strictEqual(error.code, StorageErrorCode.VALIDATION_FAILED);
      assert.strictEqual(error.name, 'StorageValidationError');
      assert.deepStrictEqual(error.invalidFields, invalidFields);
    });

    it('should include invalid fields in JSON representation', () => {
      const invalidFields = ['email'];
      const error = new StorageValidationError(
        'Invalid email',
        baseContext,
        invalidFields
      );

      const json = error.toJSON();
      assert.deepStrictEqual(json.invalidFields, invalidFields);
    });

    it('should default to empty array for invalid fields', () => {
      const error = new StorageValidationError(
        'Validation failed',
        baseContext
      );

      assert.deepStrictEqual(error.invalidFields, []);
    });
  });

  describe('StorageConnectionError', () => {
    it('should create connection error with retryable flag', () => {
      const error = new StorageConnectionError(
        'Connection refused',
        baseContext,
        undefined,
        true
      );

      assert.strictEqual(error.code, StorageErrorCode.CONNECTION_ERROR);
      assert.strictEqual(error.name, 'StorageConnectionError');
      assert.strictEqual(error.isRetryable, true);
    });

    it('should default isRetryable to true', () => {
      const error = new StorageConnectionError(
        'Connection lost',
        baseContext
      );

      assert.strictEqual(error.isRetryable, true);
    });

    it('should include isRetryable in JSON representation', () => {
      const error = new StorageConnectionError(
        'Timeout',
        baseContext,
        undefined,
        false
      );

      const json = error.toJSON();
      assert.strictEqual(json.isRetryable, false);
    });
  });

  describe('StorageConstraintError', () => {
    it('should create unique constraint error', () => {
      const error = new StorageConstraintError(
        'Duplicate entry',
        baseContext,
        'unique',
        'users_email_unique'
      );

      assert.strictEqual(error.code, StorageErrorCode.UNIQUE_VIOLATION);
      assert.strictEqual(error.constraintType, 'unique');
      assert.strictEqual(error.constraintName, 'users_email_unique');
    });

    it('should create foreign key constraint error', () => {
      const error = new StorageConstraintError(
        'Referenced record not found',
        baseContext,
        'foreign_key'
      );

      assert.strictEqual(error.code, StorageErrorCode.FOREIGN_KEY_VIOLATION);
      assert.strictEqual(error.constraintType, 'foreign_key');
    });

    it('should create not null constraint error', () => {
      const error = new StorageConstraintError(
        'Required field missing',
        baseContext,
        'not_null'
      );

      assert.strictEqual(error.code, StorageErrorCode.NULL_VIOLATION);
    });

    it('should create check constraint error', () => {
      const error = new StorageConstraintError(
        'Invalid value',
        baseContext,
        'check'
      );

      assert.strictEqual(error.code, StorageErrorCode.CHECK_VIOLATION);
    });

    it('should include constraint info in JSON representation', () => {
      const error = new StorageConstraintError(
        'Constraint violated',
        baseContext,
        'unique',
        'test_constraint'
      );

      const json = error.toJSON();
      assert.strictEqual(json.constraintType, 'unique');
      assert.strictEqual(json.constraintName, 'test_constraint');
    });
  });

  describe('isStorageError helper', () => {
    it('should return true for StorageError instances', () => {
      const error = new StorageError('Test', StorageErrorCode.UNKNOWN, baseContext);
      assert.strictEqual(isStorageError(error), true);
    });

    it('should return true for StorageError subclasses', () => {
      assert.strictEqual(isStorageError(new StorageNotFoundError('Not found', baseContext)), true);
      assert.strictEqual(isStorageError(new StorageValidationError('Invalid', baseContext)), true);
      assert.strictEqual(isStorageError(new StorageConnectionError('Failed', baseContext)), true);
      assert.strictEqual(isStorageError(new StorageConstraintError('Violated', baseContext)), true);
    });

    it('should return false for regular errors', () => {
      assert.strictEqual(isStorageError(new Error('Regular error')), false);
    });

    it('should return false for non-error values', () => {
      assert.strictEqual(isStorageError('string'), false);
      assert.strictEqual(isStorageError(null), false);
      assert.strictEqual(isStorageError(undefined), false);
      assert.strictEqual(isStorageError({}), false);
    });
  });

  describe('wrapDatabaseError helper', () => {
    const context: StorageErrorContext = {
      domain: 'test',
      operation: 'testOp',
    };

    it('should wrap connection errors', () => {
      const originalError = new Error('ECONNREFUSED');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConnectionError);
      assert.strictEqual(wrapped.code, StorageErrorCode.CONNECTION_ERROR);
    });

    it('should wrap connection timeout errors', () => {
      const originalError = new Error('connection timeout');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConnectionError);
    });

    it('should wrap unique constraint violations', () => {
      const originalError = new Error('unique constraint violated');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConstraintError);
      assert.strictEqual(wrapped.code, StorageErrorCode.UNIQUE_VIOLATION);
    });

    it('should wrap duplicate key errors', () => {
      const originalError = new Error('duplicate key value');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConstraintError);
      assert.strictEqual((wrapped as StorageConstraintError).constraintType, 'unique');
    });

    it('should wrap foreign key violations', () => {
      const originalError = new Error('violates foreign key constraint');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConstraintError);
      assert.strictEqual(wrapped.code, StorageErrorCode.FOREIGN_KEY_VIOLATION);
    });

    it('should wrap null constraint violations', () => {
      const originalError = new Error('null constraint violation');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConstraintError);
      assert.strictEqual(wrapped.code, StorageErrorCode.NULL_VIOLATION);
    });

    it('should wrap check constraint violations', () => {
      const originalError = new Error('check constraint failed');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageConstraintError);
      assert.strictEqual(wrapped.code, StorageErrorCode.CHECK_VIOLATION);
    });

    it('should wrap unknown errors as generic StorageError', () => {
      const originalError = new Error('Some unknown error');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.ok(wrapped instanceof StorageError);
      assert.strictEqual(wrapped.code, StorageErrorCode.UNKNOWN);
    });

    it('should preserve original error', () => {
      const originalError = new Error('Original message');
      const wrapped = wrapDatabaseError(originalError, context);

      assert.strictEqual(wrapped.originalError, originalError);
    });

    it('should handle non-Error objects', () => {
      const wrapped = wrapDatabaseError('string error', context);

      assert.ok(wrapped instanceof StorageError);
      assert.ok(wrapped.originalError instanceof Error);
    });
  });
});

console.log('Storage Error tests loaded successfully');
