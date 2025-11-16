/**
 * @file server/storage/utils/compose-storage.ts
 * @description Helper function to compose storage modules with conflict detection
 */

/**
 * Composes multiple storage modules into a single facade with conflict detection
 * 
 * @param base - The base/legacy storage module (lowest precedence)
 * @param modules - Domain storage modules in order of precedence (later modules override earlier)
 * @returns Composed storage facade with all methods
 */
export function composeStorageModules<T extends Record<string, any>>(
  base: T,
  ...modules: Record<string, any>[]
): T {
  // Track conflicts in development for debugging
  const conflicts = new Map<string, string[]>();
  const result: any = {};
  
  // Helper to add properties (both functions and non-functions) and track conflicts
  const addMethods = (source: any, sourceName: string) => {
    for (const key in source) {
      const value = source[key];
      
      if (typeof value === 'function') {
        // Track conflicts for functions
        if (result[key] && typeof result[key] === 'function') {
          if (!conflicts.has(key)) {
            conflicts.set(key, []);
          }
          conflicts.get(key)!.push(sourceName);
        }
        // Bind function to preserve context
        result[key] = value.bind ? value.bind(source) : value;
      } else if (value !== undefined) {
        // Preserve non-function properties (constants, objects, etc.)
        // Only override if the new value is different from undefined
        result[key] = value;
      }
    }
  };
  
  // Add base/legacy methods first (lowest precedence)
  addMethods(base, 'legacy');
  
  // Add domain module methods (override legacy)
  modules.forEach((module, index) => {
    const moduleName = module.constructor?.name || `module${index}`;
    addMethods(module, moduleName);
  });
  
  // Log conflicts in development
  if (process.env.NODE_ENV === 'development' && conflicts.size > 0) {
    console.log('[Storage Composition] Method override summary:');
    conflicts.forEach((sources, method) => {
      // Only show if there's an actual override (more than just legacy)
      if (sources.length > 0 && sources[0] !== 'legacy') {
        console.log(`  - ${method}: overridden by ${sources[sources.length - 1]}`);
      }
    });
  }
  
  return result as T;
}

/**
 * Type-safe storage module merger that preserves all method types
 * 
 * @example
 * const storage = mergeStorageModules(
 *   legacyStorage,
 *   inventoryStorage,
 *   userAuthStorage,
 *   recipesStorage
 * );
 */
export function mergeStorageModules<
  T1 extends Record<string, any>,
  T2 extends Record<string, any> = {},
  T3 extends Record<string, any> = {},
  T4 extends Record<string, any> = {},
  T5 extends Record<string, any> = {},
  T6 extends Record<string, any> = {},
  T7 extends Record<string, any> = {},
  T8 extends Record<string, any> = {}
>(
  base: T1,
  m1?: T2,
  m2?: T3,
  m3?: T4,
  m4?: T5,
  m5?: T6,
  m6?: T7,
  m7?: T8
): T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 {
  const modules = [m1, m2, m3, m4, m5, m6, m7]
    .filter(Boolean) as Record<string, any>[];
  
  return composeStorageModules(base, ...modules);
}

/**
 * Validates that required methods exist in the composed storage
 * Useful for runtime validation during migration
 */
export function validateStorageInterface(
  storage: any,
  requiredMethods: string[]
): { valid: boolean; missing: string[] } {
  const missing = requiredMethods.filter(method => 
    typeof storage[method] !== 'function'
  );
  
  return {
    valid: missing.length === 0,
    missing
  };
}