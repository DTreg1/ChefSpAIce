import { db } from "../db";
import { sql } from "drizzle-orm";

/**
 * Batch query utility for optimizing database operations
 * Reduces roundtrips and improves performance
 */

export class BatchQueryBuilder {
  private queries: Array<{
    query: any;
    params?: any[];
  }> = [];

  /**
   * Add a query to the batch
   */
  add(query: any, params?: any[]) {
    this.queries.push({ query, params });
    return this;
  }

  /**
   * Execute all queries in a single transaction
   */
  async execute() {
    if (this.queries.length === 0) return [];

    return await db.transaction(async () => {
      const results = [];
      for (const { query, params } of this.queries) {
        const result = await (params ? query(...params) : query);
        results.push(result);
      }
      return results;
    });
  }

  /**
   * Clear the batch
   */
  clear() {
    this.queries = [];
    return this;
  }
}

/**
 * Batch insert with chunking for large datasets
 */
export async function batchInsert<T>(
  table: any,
  items: T[],
  chunkSize: number = 100
): Promise<any[]> {
  if (items.length === 0) return [];

  const results = [];
  
  // Process in chunks to avoid query size limits
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResult = await db.insert(table).values(chunk).returning();
    results.push(...(Array.isArray(chunkResult) ? chunkResult : [chunkResult]));
  }

  return results;
}

/**
 * Batch update with optimized IN clause
 */
export async function batchUpdate<T extends { id: string | number }>(
  table: any,
  updates: T[],
  updateFields: string[]
): Promise<void> {
  if (updates.length === 0) return;

  // Group updates by common values to minimize queries
  const updateGroups = new Map<string, T[]>();
  
  updates.forEach((item) => {
    const key = updateFields.map(field => (item)[field]).join('|');
    if (!updateGroups.has(key)) {
      updateGroups.set(key, []);
    }
    updateGroups.get(key)!.push(item);
  });

  // Execute batch updates for each group
  await db.transaction(async (tx) => {
    const entries = Array.from(updateGroups.entries());
    for (const [, items] of entries) {
      const ids = items.map(item => item.id);
      const updateData: any = {};
      updateFields.forEach(field => {
        updateData[field] = (items[0])[field];
      });
      
      await tx.update(table)
        .set(updateData)
        .where(sql`id = ANY(${ids})`);
    }
  });
}

/**
 * Parallel query executor for independent queries
 * 
 * IMPORTANT: Due to how Drizzle ORM works, queries start executing immediately
 * when they're created, NOT when passed to Promise.all. This means the queries
 * are already running in parallel before this function is called.
 * 
 * Example of current behavior:
 * ```
 * const queries = [
 *   db.select().from(table1), // Starts executing immediately
 *   db.select().from(table2), // Starts executing immediately  
 * ];
 * const results = await parallelQueries(queries); // Just waits for completion
 * ```
 * 
 * The function still provides value by:
 * 1. Waiting for all queries to complete
 * 2. Returning results in the same order as input
 * 3. Failing fast if any query fails
 * 
 * For true deferred execution, wrap queries in functions:
 * ```
 * const results = await Promise.all([
 *   () => db.select().from(table1),
 *   () => db.select().from(table2)
 * ].map(fn => fn()));
 * ```
 */
export async function parallelQueries<T extends readonly any[]>(
  queries: T
): Promise<{ [K in keyof T]: Awaited<T[K]> }> {
  // Queries are already executing at this point due to Drizzle's eager execution
  // Promise.all just waits for them to complete and aggregates results
  return await Promise.all(queries);
}

/**
 * Cache wrapper for expensive queries with TTL
 */
export class QueryCache<T> {
  private cache = new Map<string, { data: T; expires: number }>();
  
  constructor(private ttlMs: number = 60000) {} // Default 1 minute

  async get(key: string, queryFn: () => Promise<T>): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();
    
    if (cached && cached.expires > now) {
      return cached.data;
    }

    const data = await queryFn();
    this.cache.set(key, { data, expires: now + this.ttlMs });
    
    // Clean up expired entries
    const entries = Array.from(this.cache.entries());
    for (const [k, v] of entries) {
      if (v.expires <= now) {
        this.cache.delete(k);
      }
    }

    return data;
  }

  clear(key?: string) {
    if (key) {
      this.cache.delete(key);
    } else {
      this.cache.clear();
    }
  }
}

/**
 * Optimized count query with estimation for large tables
 */
export async function getEstimatedCount(
  tableName: string,
  condition?: any
): Promise<number> {
  // For large tables, use PostgreSQL's estimate
  if (!condition) {
    const result = await db.execute(
      sql`SELECT reltuples::bigint AS estimate 
          FROM pg_class 
          WHERE relname = ${tableName}`
    );
    
    const rows = result.rows;
    const estimate = rows[0]?.estimate;
    if (estimate && estimate > 10000) {
      return estimate;
    }
  }

  // Fall back to exact count for small tables or with conditions
  // This requires passing the actual table object, not just the name
  // For now, return 0 as this would need refactoring to accept table objects
  return 0;
}