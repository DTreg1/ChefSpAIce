# Storage Architecture Refactoring Guide

## Current Architecture Overview

ChefSpAIce currently uses a complex domain-driven storage architecture with:
- **17 separate domain storage modules** in `server/storage/domains/`
- **Legacy storage module** for backward compatibility
- **Storage composition utility** (`compose-storage.ts`) that merges all modules
- **Method override system** where domain modules override legacy methods

### Current File Structure
```
server/storage/
├── index.ts                  # Composes all storage modules
├── utils/
│   └── compose-storage.ts    # Composition utility
├── legacy/
│   └── storage.ts            # Legacy monolithic storage (to be removed)
└── domains/
    ├── user.storage.ts       # User/Auth domain
    ├── inventory.storage.ts  # Inventory domain  
    ├── recipes.storage.ts    # Recipes domain
    ├── chat.storage.ts       # Chat domain
    └── ... (13 more domains)
```

## Target Architecture

A single, clean `UserStorage` class that contains all functionality organized into logical sub-modules:

```typescript
class UserStorage {
  // Sub-modules as properties
  food: FoodStorageModule;
  recipes: RecipeStorageModule;
  inventory: InventoryStorageModule;
  chat: ChatStorageModule;
  analytics: AnalyticsStorageModule;
  notifications: NotificationStorageModule;
  ai: AiStorageModule;
  system: SystemStorageModule;
  support: SupportStorageModule;
  billing: BillingStorageModule;
  experiments: ExperimentsStorageModule;
  security: SecurityStorageModule;
  scheduling: SchedulingStorageModule;
  pricing: PricingStorageModule;
  content: ContentStorageModule;
  feedback: FeedbackStorageModule;
  
  constructor(db: Database) {
    // Initialize all sub-modules
    this.food = new FoodStorageModule(db);
    this.recipes = new RecipeStorageModule(db);
    // ... etc
  }
}
```

## Refactoring Prompts

Copy these prompts into a new chat session to perform the refactoring:

---

### Prompt 1: Initial Assessment and Planning

```markdown
I need to refactor the ChefSpAIce storage architecture. Currently it uses 17 separate domain modules composed together with a legacy storage module.

Please:
1. Analyze the current storage structure in server/storage/
2. List all 17 domain modules and their key methods
3. Create a refactoring plan to consolidate into a single UserStorage class with sub-modules
4. Identify any potential issues or dependencies

Current structure:
- server/storage/index.ts uses mergeStorageModules() 
- server/storage/domains/ contains 17 domain modules
- server/storage/legacy/ contains legacy storage
- Routers import like: import { inventoryStorage, userStorage, recipesStorage } from "../storage/index"
```

---

### Prompt 2: Create the New UserStorage Class

```markdown
Create a new unified UserStorage class at server/storage/UserStorage.ts that:

1. Contains all storage functionality in organized sub-modules
2. Each sub-module should be a class property (this.food, this.recipes, etc.)
3. Initialize all sub-modules in the constructor
4. Maintain all existing method signatures
5. Use the existing database connection

Structure should be:
- UserStorage class with sub-module properties
- Each sub-module handles its domain (food, recipes, inventory, etc.)
- All database queries remain unchanged
- Full TypeScript type safety

Include these 17 domains as sub-modules:
user, food, inventory, recipes, chat, analytics, notifications, ai, system, support, billing, experiments, security, scheduling, pricing, content, feedback
```

---

### Prompt 3: Migrate All Domain Methods

```markdown
Migrate all methods from the 17 domain modules into the new UserStorage sub-modules:

For each domain in server/storage/domains/:
1. Copy all methods to the corresponding sub-module in UserStorage
2. Preserve all method signatures and implementations
3. Maintain database queries exactly as they are
4. Keep all TypeScript types

Domains to migrate:
- user.storage.ts → UserStorage.user
- inventory.storage.ts → UserStorage.inventory
- food.storage.ts → UserStorage.food
- recipes.storage.ts → UserStorage.recipes
- chat.storage.ts → UserStorage.chat
- analytics.storage.ts → UserStorage.analytics
- notifications.storage.ts → UserStorage.notifications
- ai-ml.storage.ts → UserStorage.ai
- system.storage.ts → UserStorage.system
- support.storage.ts → UserStorage.support
- billing.storage.ts → UserStorage.billing
- experiments.storage.ts → UserStorage.experiments
- security.storage.ts → UserStorage.security
- scheduling.storage.ts → UserStorage.scheduling
- pricing.storage.ts → UserStorage.pricing
- content.storage.ts → UserStorage.content
- feedback.storage.ts → UserStorage.feedback
```

---

### Prompt 4: Update Storage Index

```markdown
Update server/storage/index.ts to:

1. Remove all imports of domain modules
2. Remove the compose-storage utility import
3. Remove the legacy storage import
4. Import and instantiate the new UserStorage class
5. Export a single 'storage' instance

New structure should be:
```typescript
import { UserStorage } from './UserStorage';
import { db } from '../db';

export const storage = new UserStorage(db);
```

Ensure backward compatibility by also exporting domain aliases if needed temporarily.
```

---

### Prompt 5: Update All Router Imports

```markdown
Update all router files in server/routers/ to use the new storage structure:

Change FROM:
```typescript
import { inventoryStorage, userStorage, recipesStorage } from "../storage/index";
// Usage:
inventoryStorage.getFoodItems()
userStorage.getUserById()
recipesStorage.createRecipe()
```

Change TO:
```typescript
import { storage } from "../storage/index";
// Usage:
storage.inventory.getFoodItems()
storage.user.getUserById()
storage.recipes.createRecipe()
```

Update all routers including:
- All 40+ router files in server/routers/
- All service files that import storage
- Any other files that reference storage modules
```

---

### Prompt 6: Remove Legacy Code and Clean Up

```markdown
Complete the refactoring by removing all legacy code:

1. Delete server/storage/legacy/ directory completely
2. Delete server/storage/utils/compose-storage.ts
3. Delete all individual domain files in server/storage/domains/
4. Remove any unused imports or types
5. Update any remaining references

Verify:
- Application still runs without errors
- All endpoints work correctly
- No TypeScript errors
- No references to old storage modules remain
```

---

### Prompt 7: Final Verification and Testing

```markdown
Perform final verification of the refactoring:

1. Run TypeScript compilation: npx tsc --noEmit
2. Start the application and check for errors
3. Test critical endpoints:
   - GET /api/health
   - Authentication endpoints
   - Food inventory endpoints
   - Recipe endpoints
4. Verify all storage methods are accessible via the new structure
5. Check that no legacy code remains

Fix any issues found and ensure the application is fully functional.
```

---

## Implementation Checklist

Use this checklist to track progress:

- [ ] Analyze current storage structure
- [ ] Create new UserStorage class
- [ ] Migrate all domain methods
- [ ] Update storage/index.ts
- [ ] Update all router imports
- [ ] Update all service imports
- [ ] Remove legacy storage directory
- [ ] Remove compose-storage utility
- [ ] Remove old domain files
- [ ] Fix TypeScript errors
- [ ] Test application functionality
- [ ] Update documentation

## Key Considerations

1. **Maintain Functionality**: All existing methods must continue working
2. **Preserve Types**: TypeScript types must remain intact
3. **Database Queries**: Don't modify any database queries
4. **Error Handling**: Keep all error handling logic
5. **Testing**: Test thoroughly after each major change

## Benefits of New Architecture

- **Simplicity**: One class instead of 17+ modules
- **Organization**: Clear sub-module structure
- **No Composition**: No complex merging logic
- **No Legacy Code**: Clean, modern codebase
- **Better IntelliSense**: IDE can better understand the structure
- **Easier Maintenance**: All storage logic in one place

## Notes for Implementation

- Start with creating the UserStorage class structure
- Migrate one domain at a time to avoid confusion
- Test frequently to catch issues early
- Keep the old code until the new structure is fully working
- Use Git commits after each successful migration step