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
    // Get all properties including prototype methods (for class instances)
    const allKeys = new Set<string>();
    
    // Add own properties
    for (const key in source) {
      allKeys.add(key);
    }
    
    // Add prototype methods (for class instances)
    if (source.constructor && source.constructor.prototype) {
      Object.getOwnPropertyNames(source.constructor.prototype).forEach(key => {
        if (key !== 'constructor') {
          allKeys.add(key);
        }
      });
    }
    
    // Process all discovered keys
    allKeys.forEach(key => {
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
    });
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
 * Supports up to 18 total modules (1 base + 17 domains)
 * 
 * @example
 * const storage = mergeStorageModules(
 *   legacyStorage,
 *   inventoryStorage,
 *   userStorage,
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
  T8 extends Record<string, any> = {},
  T9 extends Record<string, any> = {},
  T10 extends Record<string, any> = {},
  T11 extends Record<string, any> = {},
  T12 extends Record<string, any> = {},
  T13 extends Record<string, any> = {},
  T14 extends Record<string, any> = {},
  T15 extends Record<string, any> = {},
  T16 extends Record<string, any> = {},
  T17 extends Record<string, any> = {},
  T18 extends Record<string, any> = {}
>(
  base: T1,
  m1?: T2,
  m2?: T3,
  m3?: T4,
  m4?: T5,
  m5?: T6,
  m6?: T7,
  m7?: T8,
  m8?: T9,
  m9?: T10,
  m10?: T11,
  m11?: T12,
  m12?: T13,
  m13?: T14,
  m14?: T15,
  m15?: T16,
  m16?: T17,
  m17?: T18
): T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 & T12 & T13 & T14 & T15 & T16 & T17 & T18 {
  const modules = [m1, m2, m3, m4, m5, m6, m7, m8, m9, m10, m11, m12, m13, m14, m15, m16, m17]
    .filter(Boolean) as Record<string, any>[];
  
  return composeStorageModules(base, ...modules) as T1 & T2 & T3 & T4 & T5 & T6 & T7 & T8 & T9 & T10 & T11 & T12 & T13 & T14 & T15 & T16 & T17 & T18;
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