/**
 * Storage Error Classes
 * 
 * Standardized error handling pattern for the storage layer.
 * These errors provide consistent error handling across all storage domains
 * with rich context for debugging and programmatic error handling.
 * 
 * Error Hierarchy:
 * - StorageError (base class)
 *   - StorageNotFoundError (entity not found)
 *   - StorageValidationError (data validation failed)
 *   - StorageConnectionError (database connection issues)
 *   - StorageConstraintError (constraint violations)
 * 
 * @module server/storage/errors/StorageError
 */

/**
 * Error codes for programmatic handling
 */
export enum StorageErrorCode {
  UNKNOWN = 'STORAGE_UNKNOWN',
  NOT_FOUND = 'STORAGE_NOT_FOUND',
  VALIDATION_FAILED = 'STORAGE_VALIDATION_FAILED',
  CONNECTION_ERROR = 'STORAGE_CONNECTION_ERROR',
  CONSTRAINT_VIOLATION = 'STORAGE_CONSTRAINT_VIOLATION',
  UNIQUE_VIOLATION = 'STORAGE_UNIQUE_VIOLATION',
  FOREIGN_KEY_VIOLATION = 'STORAGE_FOREIGN_KEY_VIOLATION',
  NULL_VIOLATION = 'STORAGE_NULL_VIOLATION',
  CHECK_VIOLATION = 'STORAGE_CHECK_VIOLATION',
}

/**
 * Context information for storage errors
 */
export interface StorageErrorContext {
  domain: string;
  operation: string;
  entityId?: string | number;
  entityType?: string;
  additionalInfo?: Record<string, unknown>;
}

/**
 * Base class for all storage errors
 * 
 * Provides consistent error structure with:
 * - Descriptive message
 * - Error code for programmatic handling
 * - Original error for debugging
 * - Context for tracing (domain, operation, entity ID)
 * 
 * @example
 * throw new StorageError(
 *   'Failed to execute query',
 *   StorageErrorCode.UNKNOWN,
 *   { domain: 'user', operation: 'getById', entityId: 123 },
 *   originalError
 * );
 */
export class StorageError extends Error {
  public readonly code: StorageErrorCode;
  public readonly context: StorageErrorContext;
  public readonly originalError?: Error;
  public readonly timestamp: Date;

  constructor(
    message: string,
    code: StorageErrorCode = StorageErrorCode.UNKNOWN,
    context: StorageErrorContext,
    originalError?: Error
  ) {
    super(message);
    this.name = 'StorageError';
    this.code = code;
    this.context = context;
    this.originalError = originalError;
    this.timestamp = new Date();

    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Returns a detailed error representation for logging
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack,
      originalError: this.originalError ? {
        name: this.originalError.name,
        message: this.originalError.message,
        stack: this.originalError.stack,
      } : undefined,
    };
  }

  /**
   * Returns a user-friendly error message
   */
  toUserMessage(): string {
    return `${this.context.operation} failed for ${this.context.domain}${
      this.context.entityId ? ` (ID: ${this.context.entityId})` : ''
    }: ${this.message}`;
  }
}

/**
 * Error thrown when a requested entity is not found
 * 
 * @example
 * const user = await db.query.users.findFirst({ where: eq(users.id, id) });
 * if (!user) {
 *   throw new StorageNotFoundError(
 *     `User with ID ${id} not found`,
 *     { domain: 'user', operation: 'getById', entityId: id, entityType: 'User' }
 *   );
 * }
 */
export class StorageNotFoundError extends StorageError {
  constructor(
    message: string,
    context: StorageErrorContext,
    originalError?: Error
  ) {
    super(message, StorageErrorCode.NOT_FOUND, context, originalError);
    this.name = 'StorageNotFoundError';
  }
}

/**
 * Error thrown when data validation fails at the storage layer
 * 
 * @example
 * if (!email || !email.includes('@')) {
 *   throw new StorageValidationError(
 *     'Invalid email format',
 *     { domain: 'user', operation: 'create', entityType: 'User' },
 *     ['email'],
 *     undefined
 *   );
 * }
 */
export class StorageValidationError extends StorageError {
  public readonly invalidFields: string[];

  constructor(
    message: string,
    context: StorageErrorContext,
    invalidFields: string[] = [],
    originalError?: Error
  ) {
    super(message, StorageErrorCode.VALIDATION_FAILED, context, originalError);
    this.name = 'StorageValidationError';
    this.invalidFields = invalidFields;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      invalidFields: this.invalidFields,
    };
  }
}

/**
 * Error thrown when database connection fails
 * 
 * @example
 * try {
 *   await db.execute(sql`SELECT 1`);
 * } catch (error) {
 *   throw new StorageConnectionError(
 *     'Unable to connect to database',
 *     { domain: 'system', operation: 'healthCheck' },
 *     error instanceof Error ? error : undefined
 *   );
 * }
 */
export class StorageConnectionError extends StorageError {
  public readonly isRetryable: boolean;

  constructor(
    message: string,
    context: StorageErrorContext,
    originalError?: Error,
    isRetryable: boolean = true
  ) {
    super(message, StorageErrorCode.CONNECTION_ERROR, context, originalError);
    this.name = 'StorageConnectionError';
    this.isRetryable = isRetryable;
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      isRetryable: this.isRetryable,
    };
  }
}

/**
 * Constraint violation types for more specific handling
 */
export type ConstraintType = 'unique' | 'foreign_key' | 'check' | 'not_null' | 'unknown';

/**
 * Error thrown when a database constraint is violated
 * 
 * Handles:
 * - Unique constraint violations (duplicate entries)
 * - Foreign key violations (invalid references)
 * - Check constraint violations (invalid values)
 * - Not null violations (missing required fields)
 * 
 * @example
 * try {
 *   await db.insert(users).values({ email: 'existing@email.com' });
 * } catch (error) {
 *   throw new StorageConstraintError(
 *     'A user with this email already exists',
 *     { domain: 'user', operation: 'create', entityType: 'User' },
 *     'unique',
 *     'users_email_unique',
 *     error instanceof Error ? error : undefined
 *   );
 * }
 */
export class StorageConstraintError extends StorageError {
  public readonly constraintType: ConstraintType;
  public readonly constraintName?: string;

  constructor(
    message: string,
    context: StorageErrorContext,
    constraintType: ConstraintType = 'unknown',
    constraintName?: string,
    originalError?: Error
  ) {
    const code = StorageConstraintError.getErrorCode(constraintType);
    super(message, code, context, originalError);
    this.name = 'StorageConstraintError';
    this.constraintType = constraintType;
    this.constraintName = constraintName;
  }

  private static getErrorCode(constraintType: ConstraintType): StorageErrorCode {
    switch (constraintType) {
      case 'unique':
        return StorageErrorCode.UNIQUE_VIOLATION;
      case 'foreign_key':
        return StorageErrorCode.FOREIGN_KEY_VIOLATION;
      case 'not_null':
        return StorageErrorCode.NULL_VIOLATION;
      case 'check':
        return StorageErrorCode.CHECK_VIOLATION;
      default:
        return StorageErrorCode.CONSTRAINT_VIOLATION;
    }
  }

  override toJSON(): Record<string, unknown> {
    return {
      ...super.toJSON(),
      constraintType: this.constraintType,
      constraintName: this.constraintName,
    };
  }
}

/**
 * Helper function to determine if an error is a storage error
 */
export function isStorageError(error: unknown): error is StorageError {
  return error instanceof StorageError;
}

/**
 * Helper function to wrap database errors into appropriate StorageError types
 * 
 * @param error - The original error from the database
 * @param context - Context information for the error
 * @returns A StorageError instance
 * 
 * @example
 * try {
 *   await db.insert(users).values(userData);
 * } catch (error) {
 *   throw wrapDatabaseError(error, { domain: 'user', operation: 'create' });
 * }
 */
export function wrapDatabaseError(
  error: unknown,
  context: StorageErrorContext
): StorageError {
  const originalError = error instanceof Error ? error : new Error(String(error));
  const message = originalError.message;

  if (message.includes('ECONNREFUSED') || message.includes('connection')) {
    return new StorageConnectionError(
      'Database connection failed',
      context,
      originalError,
      true
    );
  }

  if (message.includes('unique') || message.includes('duplicate')) {
    return new StorageConstraintError(
      'Duplicate entry found',
      context,
      'unique',
      undefined,
      originalError
    );
  }

  if (message.includes('foreign key') || message.includes('violates foreign key')) {
    return new StorageConstraintError(
      'Referenced record does not exist',
      context,
      'foreign_key',
      undefined,
      originalError
    );
  }

  if (message.includes('null') && message.includes('constraint')) {
    return new StorageConstraintError(
      'Required field is missing',
      context,
      'not_null',
      undefined,
      originalError
    );
  }

  if (message.includes('check constraint')) {
    return new StorageConstraintError(
      'Value violates check constraint',
      context,
      'check',
      undefined,
      originalError
    );
  }

  return new StorageError(
    message || 'An unexpected storage error occurred',
    StorageErrorCode.UNKNOWN,
    context,
    originalError
  );
}
