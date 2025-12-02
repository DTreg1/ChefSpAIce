/**
 * Storage Errors Module
 *
 * Re-exports all storage error classes and utilities for convenient importing.
 *
 * @example
 * import {
 *   StorageError,
 *   StorageNotFoundError,
 *   StorageValidationError,
 *   StorageConnectionError,
 *   StorageConstraintError,
 *   StorageErrorCode,
 *   wrapDatabaseError,
 *   isStorageError,
 * } from '../errors';
 *
 * @module server/storage/errors
 */

export {
  StorageError,
  StorageNotFoundError,
  StorageValidationError,
  StorageConnectionError,
  StorageConstraintError,
  StorageErrorCode,
  wrapDatabaseError,
  isStorageError,
  type StorageErrorContext,
  type ConstraintType,
} from "./StorageError";
