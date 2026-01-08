/**
 * =============================================================================
 * STORAGE INTERFACE
 * =============================================================================
 * 
 * This file defines the storage interface abstraction for user operations.
 * 
 * NOTE: This file is kept for potential future use cases such as:
 * - Unit testing with mock storage implementations
 * - Switching between different storage backends
 * - Local development without database connection
 * 
 * Currently, the application uses direct Drizzle ORM queries in routes
 * for PostgreSQL database operations. See server/db.ts for the database
 * connection and shared/schema.ts for the data models.
 * 
 * @module server/storage
 */

import { type User, type InsertUser } from "@shared/schema";

/**
 * Storage interface for user operations.
 * Implementations must provide these core user management methods.
 */
export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
}
