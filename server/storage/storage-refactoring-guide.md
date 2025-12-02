# Storage Layer Refactoring Guide

> **Historical Reference Document**
>
> This document provides step-by-step prompts for storage layer improvements. The storage layer has undergone significant refactoring, including Sprint 3 changes with ML service activation and storage integration.
>
> **Status Summary:**
>
> - Phase 1 (Audit): Complete - see STORAGE_AUDIT_REPORT.md for current interface/implementation alignment
> - Phase 2 (StorageRoot): Addressed - legacy methods cleaned up
> - Phase 3 (Export Patterns): Addressed - consistent singleton exports
> - Phase 4+ (Remaining): Review for current applicability
>
> Use as a reference for understanding architectural patterns.

This document provides step-by-step prompts to fix the identified issues in the storage layer.

---

## Phase 1: Audit and Document Current State

### Step 1.1: Audit StorageRoot Dead Methods

```
Audit the StorageRoot.ts file and identify all methods that reference functions or properties that no longer exist on the underlying facades or domain modules. For each dead method found:

1. List the method name and its current implementation
2. Identify what facade/domain it's trying to call
3. Check if the target method exists in the actual domain storage file
4. Mark as "dead" (target doesn't exist), "renamed" (exists with different name), or "moved" (exists in different location)

Output a markdown table with columns: Method Name | Target Path | Status | Notes
```

### Step 1.2: Audit Export Pattern Inconsistencies

```
Audit all files in server/storage/domains/ and identify the export patterns used. For each domain storage file:

1. Check if it exports a class, a singleton instance, or both
2. Note how it's imported in the facades (server/storage/facades/)
3. Identify any mismatches where a facade expects a different export pattern

Create a table with columns: File | Exports Class | Exports Singleton | Facade Import Pattern | Consistent (Y/N)
```

### Step 1.3: Audit Interface-Implementation Mismatches

```
Compare each interface in server/storage/interfaces/ with its corresponding implementation in server/storage/domains/. For each pair:

1. List methods in the interface that don't exist in the implementation
2. List methods in the implementation that aren't in the interface
3. Identify signature mismatches (parameter types, return types, use of 'any')
4. Note any methods using 'any' that should have proper types

Output findings grouped by domain, with specific line numbers and method signatures.
```

---

## Phase 2: Fix StorageRoot Legacy Methods

### Step 2.1: Remove Dead Methods from StorageRoot

```
In server/storage/StorageRoot.ts, remove all methods identified as "dead" in the audit (methods that call non-existent functions on facades/domains).

Before removing each method:
1. Search the codebase for any callers using grep
2. If callers exist, note them for later migration
3. If no callers exist, safely remove the method

After removal, run TypeScript compilation to verify no new errors are introduced.
```

### Step 2.2: Fix Renamed/Moved Method References

```
For methods in StorageRoot.ts identified as "renamed" or "moved":

1. Update the method implementation to call the correct target
2. Keep the original method name for backward compatibility OR
3. If no external callers exist, rename/remove the StorageRoot method

Ensure all method calls resolve to actual implementations in the domain storage files.
```

### Step 2.3: Migrate Callers to New API Structure

```
Search the codebase for all usages of StorageRoot legacy methods that were removed or modified. For each caller:

1. Identify the file and line number
2. Determine the correct new API call (via facade or direct domain access)
3. Update the caller to use the new pattern
4. Add proper TypeScript typing to the call

Verify each migration by running the affected code path.
```

---

## Phase 3: Standardize Export Patterns

### Step 3.1: Choose and Document Export Standard

```
Establish a standard export pattern for all domain storage modules. The recommended pattern is:

- Export a CLASS for domain storage (allows dependency injection and testing)
- Create and export a singleton INSTANCE only if needed for convenience
- Facades should instantiate their own instances OR use the shared singleton consistently

Document this decision in a comment at the top of each domain storage file.
```

### Step 3.2: Refactor Domain Storage Exports

```
For each file in server/storage/domains/, refactor to follow the standard export pattern:

1. Ensure the class is the primary export: `export class DomainStorage { ... }`
2. If a singleton is needed, export it separately: `export const domainStorage = new DomainStorage()`
3. Remove any duplicate exports or conflicting patterns
4. Update the barrel export in server/storage/domains/index.ts (if it exists)

Apply this consistently to all domain storage files:
- user.storage.ts
- recipes.storage.ts
- inventory.storage.ts
- food.storage.ts
- chat.storage.ts
- notification.storage.ts
- billing.storage.ts
- analytics.storage.ts
- ai-ml.storage.ts
- system.storage.ts
- security.storage.ts
- scheduling.storage.ts
- pricing.storage.ts
- support.storage.ts
- feedback.storage.ts
- experiments.storage.ts
- content.storage.ts
```

### Step 3.3: Update Facades to Use Consistent Pattern

```
Update all facade files in server/storage/facades/ to use the standardized export pattern:

For UserStorage.ts, AdminStorage.ts, and PlatformStorage.ts:

1. Import domain storages consistently (either classes or singletons, not mixed)
2. If using classes, instantiate them in the facade constructor
3. If using singletons, import the singleton instances directly
4. Remove any conditional logic that handles both patterns
5. Ensure all method calls on domain storages resolve correctly

Test each facade by calling its methods and verifying they reach the domain implementations.
```

---

## Phase 4: Regenerate and Align Interfaces

### Step 4.1: Generate Interfaces from Implementations

```
For each domain storage implementation in server/storage/domains/, generate an updated interface that matches the actual implementation:

1. Extract all public methods from the class
2. Create proper TypeScript signatures with correct parameter and return types
3. Replace all 'any' types with specific types from shared/schema.ts
4. Include JSDoc comments describing each method's purpose
5. Save to the corresponding file in server/storage/interfaces/

Start with these priority files:
- IUserStorage.ts (from user.storage.ts)
- IRecipesStorage.ts (from recipes.storage.ts)
- IInventoryStorage.ts (from inventory.storage.ts)
- IFoodStorage.ts (from food.storage.ts)
```

### Step 4.2: Update IStorage Aggregate Interface

```
Regenerate the main IStorage interface in server/storage/interfaces/IStorage.ts to properly aggregate all domain interfaces:

1. Import all individual domain interfaces
2. Compose them into IStorage using intersection types or interface extension
3. Ensure IStorage accurately reflects what StorageRoot provides
4. Remove references to interfaces that no longer exist
5. Add references to new interfaces that were added

The structure should be:
export interface IStorage extends
  IUserStorage,
  IRecipesStorage,
  IInventoryStorage,
  // ... all other domain interfaces
  { }
```

### Step 4.3: Remove 'any' Types from Storage Layer

```
Search for all uses of 'any' in the storage layer and replace with proper types:

Files to check:
- server/storage/StorageRoot.ts
- server/storage/facades/*.ts
- server/storage/domains/*.ts
- server/storage/interfaces/*.ts

For each 'any' found:
1. Determine the correct type from context or schema
2. Import the type from shared/schema.ts if needed
3. Replace 'any' with the specific type
4. If the type is truly unknown, use 'unknown' and add type guards

Run TypeScript strict mode compilation to verify type safety.
```

---

## Phase 5: Standardize Error Handling

### Step 5.1: Create Storage Error Types

```
Create a standardized error handling pattern for the storage layer:

1. Create server/storage/errors/StorageError.ts with custom error classes:
   - StorageError (base class)
   - StorageNotFoundError
   - StorageValidationError
   - StorageConnectionError
   - StorageConstraintError

2. Each error should include:
   - Descriptive message
   - Error code (for programmatic handling)
   - Original error (for debugging)
   - Context (domain, operation, entity ID)
```

### Step 5.2: Apply Consistent Error Handling to Domain Storage

```
Update each domain storage file to use the standardized error handling:

1. Import the StorageError classes
2. Wrap database operations in try-catch blocks
3. Throw appropriate StorageError subclasses instead of generic Error
4. Include context in error messages (operation name, entity ID, etc.)
5. Log errors consistently before rethrowing
6. Never swallow errors silently - always log or rethrow

Apply this pattern to all domain storage files, starting with the most critical:
- user.storage.ts
- recipes.storage.ts
- inventory.storage.ts
- billing.storage.ts
```

### Step 5.3: Propagate Errors Consistently Through Facades

```
Ensure facades properly propagate errors from domain storage:

1. Facades should NOT catch and swallow storage errors
2. Facades may add context to errors before rethrowing
3. Facades should NOT transform error types (let StorageErrors bubble up)
4. Consider adding a facade-level error boundary for logging

Update UserStorage.ts, AdminStorage.ts, and PlatformStorage.ts to follow this pattern.
```

---

## Phase 6: Testing and Validation

### Step 6.1: Create Storage Layer Tests

```
Create unit tests for the refactored storage layer:

1. Test each domain storage class methods individually
2. Mock the database connection for unit tests
3. Test error handling scenarios (not found, validation, connection errors)
4. Test that facades correctly delegate to domain storage
5. Test that StorageRoot correctly exposes the API

Save tests to server/storage/__tests__/ directory.
```

### Step 6.2: Integration Testing

```
Create integration tests that verify the storage layer works end-to-end:

1. Use a test database (or in-memory alternative)
2. Test complete flows through StorageRoot -> Facade -> Domain -> Database
3. Verify data is correctly persisted and retrieved
4. Test transactions and rollback behavior
5. Verify error propagation from database to API layer
```

### Step 6.3: Final Validation

```
Perform final validation of the refactored storage layer:

1. Run full TypeScript compilation with strict mode
2. Verify no 'any' types remain in storage layer
3. Verify all interfaces match implementations
4. Run all storage tests and fix any failures
5. Test the application end-to-end to verify no regressions
6. Update documentation to reflect new structure
```

---

## Quick Reference: Common Patterns

### Correct Domain Storage Export Pattern

```typescript
// server/storage/domains/example.storage.ts

import { db } from "@/db";
import type { InsertExample, Example } from "@shared/schema";
import { StorageError, StorageNotFoundError } from "../errors/StorageError";

export class ExampleStorage {
  async create(data: InsertExample): Promise<Example> {
    try {
      const [result] = await db.insert(examples).values(data).returning();
      return result;
    } catch (error) {
      throw new StorageError("Failed to create example", { cause: error });
    }
  }

  async getById(id: number): Promise<Example> {
    const result = await db.query.examples.findFirst({
      where: eq(examples.id, id),
    });
    if (!result) {
      throw new StorageNotFoundError(`Example with id ${id} not found`);
    }
    return result;
  }
}

// Optional singleton for convenience
export const exampleStorage = new ExampleStorage();
```

### Correct Facade Pattern

```typescript
// server/storage/facades/UserStorage.ts

import { UserDomainStorage } from "../domains/user.storage";
import { RecipesDomainStorage } from "../domains/recipes.storage";

export class UserStorage {
  public readonly users: UserDomainStorage;
  public readonly recipes: RecipesDomainStorage;

  constructor() {
    this.users = new UserDomainStorage();
    this.recipes = new RecipesDomainStorage();
  }
}

export const userStorage = new UserStorage();
```

### Correct Interface Pattern

```typescript
// server/storage/interfaces/IExampleStorage.ts

import type { InsertExample, Example } from "@shared/schema";

export interface IExampleStorage {
  create(data: InsertExample): Promise<Example>;
  getById(id: number): Promise<Example>;
  update(id: number, data: Partial<InsertExample>): Promise<Example>;
  delete(id: number): Promise<void>;
  list(options?: { limit?: number; offset?: number }): Promise<Example[]>;
}
```

---

## Execution Order

1. Complete Phase 1 (Audit) before making any changes
2. Phase 2 and Phase 3 can be done in parallel
3. Phase 4 depends on Phase 2 and 3 being complete
4. Phase 5 can be done after Phase 4
5. Phase 6 should be done continuously and at the end

Estimated effort: 2-4 hours for a senior developer familiar with the codebase.
