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

A three-tier storage architecture with distinct facades that properly separate concerns:

```typescript
// User-scoped storage for user-specific data
class UserStorage {
  user: UserModule;
  food: FoodModule;
  recipes: RecipeModule;
  inventory: InventoryModule;
  chat: ChatModule;
  notifications: NotificationModule;
  scheduling: SchedulingModule;
  
  constructor(db: Database) {
    this.user = new UserModule(db);
    this.food = new FoodModule(db);
    // ... etc
  }
}

// Administrative storage for system management
class AdminStorage {
  billing: BillingModule;
  security: SecurityModule;
  pricing: PricingModule;
  experiments: ExperimentsModule;
  support: SupportModule;
  
  constructor(db: Database) {
    this.billing = new BillingModule(db);
    this.security = new SecurityModule(db);
    // ... etc
  }
}

// Platform-wide storage for cross-cutting concerns
class PlatformStorage {
  analytics: AnalyticsModule;
  ai: AiModule;
  system: SystemModule;
  content: ContentModule;
  feedback: FeedbackModule;
  
  constructor(db: Database) {
    this.analytics = new AnalyticsModule(db);
    this.ai = new AiModule(db);
    // ... etc
  }
}

// Root storage facade that composes all three tiers
class StorageRoot {
  user: UserStorage;
  admin: AdminStorage;
  platform: PlatformStorage;
  
  constructor(db: Database) {
    this.user = new UserStorage(db);
    this.admin = new AdminStorage(db);
    this.platform = new PlatformStorage(db);
  }
}
```

### Domain Mapping

| Current Domain | Target Facade | Rationale |
|---------------|---------------|-----------|
| user.storage.ts | UserStorage | User authentication & profile management |
| food.storage.ts | UserStorage | User's food items and preferences |
| inventory.storage.ts | UserStorage | User's inventory management |
| recipes.storage.ts | UserStorage | User's recipe collection |
| chat.storage.ts | UserStorage | User's chat conversations |
| notifications.storage.ts | UserStorage | User-specific notifications |
| scheduling.storage.ts | UserStorage | User's meal planning & scheduling |
| billing.storage.ts | AdminStorage | Cross-user billing & payments |
| security.storage.ts | AdminStorage | System-wide security settings |
| pricing.storage.ts | AdminStorage | Product pricing configuration |
| experiments.storage.ts | AdminStorage | A/B testing & feature flags |
| support.storage.ts | AdminStorage | Support tickets & admin tools |
| analytics.storage.ts | PlatformStorage | Cross-user analytics & metrics |
| ai-ml.storage.ts | PlatformStorage | AI/ML model management |
| system.storage.ts | PlatformStorage | System configuration & health |
| content.storage.ts | PlatformStorage | Shared content & resources |
| feedback.storage.ts | PlatformStorage | User feedback & ratings |

## Refactoring Prompts

Copy these prompts into a new chat session to perform the refactoring:

---

### Prompt 1: Initial Assessment and Planning

```markdown
I need to refactor the ChefSpAIce storage architecture. Currently it uses 17 separate domain modules composed together with a legacy storage module.

Please:
1. Analyze the current storage structure in server/storage/
2. List all 17 domain modules and their key methods
3. Create a refactoring plan to consolidate into a three-tier architecture (UserStorage, AdminStorage, PlatformStorage)
4. Identify any potential issues or dependencies

Current structure:
- server/storage/index.ts uses mergeStorageModules() 
- server/storage/domains/ contains 17 domain modules
- server/storage/legacy/ contains legacy storage
- Routers import like: import { inventoryStorage, userStorage, recipesStorage } from "../storage/index"

Target architecture should separate concerns:
- UserStorage: user-specific data (food, recipes, inventory, etc.)
- AdminStorage: administrative functions (billing, security, pricing, etc.)
- PlatformStorage: cross-cutting concerns (analytics, ai, system, etc.)
```

---

### Prompt 2: Create the Three Storage Facades

```markdown
Create three new storage facade classes that properly separate concerns:

1. **server/storage/facades/UserStorage.ts**:
   - Contains user-specific storage modules
   - Modules: user, food, recipes, inventory, chat, notifications, scheduling
   - Each module as a class property (this.food, this.recipes, etc.)

2. **server/storage/facades/AdminStorage.ts**:
   - Contains administrative storage modules
   - Modules: billing, security, pricing, experiments, support
   - Each module as a class property (this.billing, this.security, etc.)

3. **server/storage/facades/PlatformStorage.ts**:
   - Contains platform-wide storage modules
   - Modules: analytics, ai, system, content, feedback
   - Each module as a class property (this.analytics, this.ai, etc.)

4. **server/storage/StorageRoot.ts**:
   - Root facade that composes all three storage tiers
   - Properties: user (UserStorage), admin (AdminStorage), platform (PlatformStorage)
   - Single point of access for all storage operations

Requirements:
- Maintain all existing method signatures
- Use the existing database connection
- Full TypeScript type safety
- All database queries remain unchanged
```

---

### Prompt 3: Migrate Domain Methods to Appropriate Facades

```markdown
Migrate all methods from the 17 domain modules into the appropriate storage facades:

**UserStorage modules** (server/storage/facades/UserStorage.ts):
- user.storage.ts → UserStorage.user
- food.storage.ts → UserStorage.food
- recipes.storage.ts → UserStorage.recipes
- inventory.storage.ts → UserStorage.inventory
- chat.storage.ts → UserStorage.chat
- notifications.storage.ts → UserStorage.notifications
- scheduling.storage.ts → UserStorage.scheduling

**AdminStorage modules** (server/storage/facades/AdminStorage.ts):
- billing.storage.ts → AdminStorage.billing
- security.storage.ts → AdminStorage.security
- pricing.storage.ts → AdminStorage.pricing
- experiments.storage.ts → AdminStorage.experiments
- support.storage.ts → AdminStorage.support

**PlatformStorage modules** (server/storage/facades/PlatformStorage.ts):
- analytics.storage.ts → PlatformStorage.analytics
- ai-ml.storage.ts → PlatformStorage.ai
- system.storage.ts → PlatformStorage.system
- content.storage.ts → PlatformStorage.content
- feedback.storage.ts → PlatformStorage.feedback

For each domain:
1. Copy all methods to the corresponding sub-module
2. Preserve all method signatures and implementations
3. Maintain database queries exactly as they are
4. Keep all TypeScript types
```

---

### Prompt 4: Update Storage Index

```markdown
Update server/storage/index.ts to:

1. Remove all imports of domain modules
2. Remove the compose-storage utility import
3. Remove the legacy storage import
4. Import and instantiate the new StorageRoot class
5. Export the storage facade

New structure should be:
```typescript
import { StorageRoot } from './StorageRoot';
import { db } from '../db';

// Create the root storage instance
export const storage = new StorageRoot(db);

// Export backward compatibility aliases (temporary, for migration)
export const userStorage = storage.user.user;
export const foodStorage = storage.user.food;
export const recipesStorage = storage.user.recipes;
export const inventoryStorage = storage.user.inventory;
export const chatStorage = storage.user.chat;
export const notificationsStorage = storage.user.notifications;
export const schedulingStorage = storage.user.scheduling;

export const billingStorage = storage.admin.billing;
export const securityStorage = storage.admin.security;
export const pricingStorage = storage.admin.pricing;
export const experimentsStorage = storage.admin.experiments;
export const supportStorage = storage.admin.support;

export const analyticsStorage = storage.platform.analytics;
export const aiStorage = storage.platform.ai;
export const systemStorage = storage.platform.system;
export const contentStorage = storage.platform.content;
export const feedbackStorage = storage.platform.feedback;
```
```

---

### Prompt 5: Update Router Imports (Phase 1 - Backward Compatible)

```markdown
First phase: Keep existing imports working while adding new structure.

The storage/index.ts already exports backward compatibility aliases, so existing router imports will continue to work:
```typescript
// Existing imports will still work
import { inventoryStorage, userStorage, recipesStorage } from "../storage/index";
```

But we can also start using the new structure:
```typescript
import { storage } from "../storage/index";
// Usage:
storage.user.inventory.getFoodItems()
storage.user.user.getUserById()
storage.user.recipes.createRecipe()
storage.admin.billing.getBillingInfo()
storage.platform.analytics.trackEvent()
```

Test that both import styles work correctly before proceeding to phase 2.
```

---

### Prompt 6: Update Router Imports (Phase 2 - Migration)

```markdown
Second phase: Migrate all routers to use the new three-tier structure.

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
storage.user.inventory.getFoodItems()
storage.user.user.getUserById()
storage.user.recipes.createRecipe()
```

Examples for each tier:
- User tier: `storage.user.food.getFoodItems()`
- Admin tier: `storage.admin.billing.processPayment()`
- Platform tier: `storage.platform.analytics.logEvent()`

Update all routers including:
- All 40+ router files in server/routers/
- All service files that import storage
- Any other files that reference storage modules
```

---

### Prompt 7: Remove Legacy Code and Clean Up

```markdown
Complete the refactoring by removing all legacy code:

1. Delete server/storage/legacy/ directory completely
2. Delete server/storage/utils/compose-storage.ts
3. Delete all individual domain files in server/storage/domains/
4. Remove backward compatibility aliases from server/storage/index.ts
5. Remove any unused imports or types

Verify:
- Application still runs without errors
- All endpoints work correctly
- No TypeScript errors
- No references to old storage modules remain
- All routers use the new storage.user.*, storage.admin.*, storage.platform.* structure
```

---

### Prompt 8: Final Verification and Testing

```markdown
Perform final verification of the refactoring:

1. Run TypeScript compilation: npx tsc --noEmit
2. Start the application and check for errors
3. Test critical endpoints from each tier:
   
   **User tier endpoints:**
   - GET /api/health
   - Authentication endpoints
   - Food inventory endpoints
   - Recipe endpoints
   - Chat endpoints
   
   **Admin tier endpoints:**
   - Billing management endpoints
   - Security settings endpoints
   - Pricing configuration endpoints
   
   **Platform tier endpoints:**
   - Analytics tracking endpoints
   - AI/ML endpoints
   - System status endpoints

4. Verify storage access patterns:
   - User data accessed via storage.user.*
   - Admin functions via storage.admin.*
   - Platform features via storage.platform.*

5. Check that no legacy code remains

Fix any issues found and ensure the application is fully functional.
```

---

## Implementation Checklist

Use this checklist to track progress:

- [ ] Analyze current storage structure
- [ ] Create three storage facade classes (UserStorage, AdminStorage, PlatformStorage)
- [ ] Create StorageRoot class to compose the three facades
- [ ] Migrate user domain methods to UserStorage
- [ ] Migrate admin domain methods to AdminStorage
- [ ] Migrate platform domain methods to PlatformStorage
- [ ] Update storage/index.ts with StorageRoot
- [ ] Add backward compatibility aliases (temporary)
- [ ] Test with backward compatible imports
- [ ] Update all router imports to new structure
- [ ] Update all service imports to new structure
- [ ] Remove backward compatibility aliases
- [ ] Remove legacy storage directory
- [ ] Remove compose-storage utility
- [ ] Remove old domain files
- [ ] Fix TypeScript errors
- [ ] Test all three tiers thoroughly
- [ ] Update documentation

## Key Considerations

1. **Maintain Functionality**: All existing methods must continue working
2. **Preserve Types**: TypeScript types must remain intact
3. **Database Queries**: Don't modify any database queries
4. **Error Handling**: Keep all error handling logic
5. **Testing**: Test thoroughly after each major change
6. **Separation of Concerns**: Ensure proper boundaries between User, Admin, and Platform tiers
7. **Access Control**: Consider adding tier-based access control in the future

## Benefits of New Three-Tier Architecture

- **Proper Separation**: Clear distinction between user, admin, and platform concerns
- **Security**: Better foundation for role-based access control
- **Scalability**: Each tier can be optimized/scaled independently
- **Maintainability**: Related functionality grouped together
- **No Composition**: No complex merging logic
- **No Legacy Code**: Clean, modern codebase
- **Better IntelliSense**: IDE can better understand the structure
- **Clear Responsibilities**: Obvious where each piece of functionality belongs

## Mixed Domain Handling

For domains that have both user and admin aspects:

1. **Analytics**: Split into user analytics (user's own data) vs. platform analytics (cross-user metrics)
2. **Feedback**: User can create feedback (UserStorage) but admins view/manage all feedback (PlatformStorage)
3. **Support**: Users create tickets (UserStorage) but admins manage them (AdminStorage)

Consider creating separate methods or access patterns for these mixed concerns.

## Notes for Implementation

- Start with creating the three facade class structures
- Create StorageRoot to compose all facades
- Migrate domains to appropriate facades based on the mapping table
- Use backward compatibility aliases for gradual migration
- Test frequently to catch issues early
- Keep the old code until the new structure is fully working
- Use Git commits after each successful migration step
- Consider future enhancements like middleware for access control