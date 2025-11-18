# Storage Migration Plan - Step-by-Step Guide

## Overview
This document contains step-by-step prompts to complete the migration from monolithic `server/storage.ts` (16,714 lines) to a domain-driven storage architecture that matches the schema structure (19 domains).

**Current Status:**
- ✅ Schema migration complete (19 domain files)
- ⚠️ Storage migration incomplete (7/19 domains, 3 disabled)
- 🔴 1,458 TypeScript errors due to schema/storage mismatch

**Goal:** Complete storage migration, fix all TypeScript errors, ensure production readiness.

---

## Phase 1: Assessment & Planning

### Prompt 1: Domain Mapping Analysis
```
Analyze server/storage.ts and create a domain mapping report showing which methods belong to which domain (inventory, user-auth, recipes, chat, analytics, feedback, notifications, etc.). Group the 16k lines by domain and show me the breakdown.
```

**Expected Output:** Report showing method counts per domain, identifying what needs to be migrated where.

---

## Phase 2: Complete Existing Domain Files (Fix What's Started)

### Prompt 2: Fix Analytics Storage
```
Fix and re-enable the analytics.storage.ts domain file. Update it to work with the new schema structure from shared/schema/analytics.ts. Ensure all TypeScript errors in this file are resolved.
```

**What This Does:** Updates analytics.storage.ts to use correct column names and types from the new schema.

### Prompt 3: Fix Feedback Storage
```
Fix and re-enable the feedback.storage.ts domain file. Update it to work with the new schema structure from shared/schema/. Ensure all TypeScript errors are resolved.
```

**What This Does:** Updates feedback.storage.ts to match the new schema structure.

### Prompt 4: Fix Notification Storage
```
Fix and re-enable the notification.storage.ts domain file. Update it to work with the new schema structure from shared/schema/notifications.ts. Ensure all TypeScript errors are resolved.
```

**What This Does:** Updates notification.storage.ts to match notifications schema.

### Prompt 5: Re-enable Fixed Domains
```
Update server/storage/index.ts to re-enable the three fixed domain storage modules (analytics, feedback, notifications) in the mergeStorageModules call.
```

**What This Does:** Uncomments the disabled domains in the storage facade.

---

## Phase 3: Create Missing Domain Storage Files

### Prompt 6: Create Food Storage
```
Create server/storage/domains/food.storage.ts covering all food inventory and nutrition methods from the monolithic storage.ts. Use shared/schema/food.ts as the schema source.
```

**What This Creates:** FoodStorage class with methods for food items, nutrition data, etc.

### Prompt 7: Create AI/ML Storage
```
Create server/storage/domains/ai-ml.storage.ts covering all AI/ML feature methods (drafting, summarization, transcription, extraction, sentiment, etc.) from storage.ts. Use the appropriate schema files.
```

**What This Creates:** AIMLStorage class with methods for all AI/ML features.

### Prompt 8: Create System Storage
```
Create server/storage/domains/system.storage.ts covering system monitoring, activity logs, and log retention methods from storage.ts. Use shared/schema/system.ts.
```

**What This Creates:** SystemStorage class with activity logs, monitoring, etc.

### Prompt 9: Create Support Storage
```
Create server/storage/domains/support.storage.ts covering support tickets and help desk methods from storage.ts. Use shared/schema/support.ts.
```

**What This Creates:** SupportStorage class with ticket management methods.

### Prompt 10: Create Billing Storage
```
Create server/storage/domains/billing.storage.ts covering billing and donation methods from storage.ts. Use shared/schema/billing.ts.
```

**What This Creates:** BillingStorage class with payment and donation methods.

### Prompt 11: Create Experiments Storage
```
Create server/storage/domains/experiments.storage.ts covering A/B testing and cohort methods from storage.ts. Use shared/schema/experiments.ts.
```

**What This Creates:** ExperimentsStorage class with A/B testing and cohort methods.

### Prompt 12: Create Security Storage
```
Create server/storage/domains/security.storage.ts covering moderation, fraud detection, and security methods from storage.ts. Use shared/schema/security.ts.
```

**What This Creates:** SecurityStorage class with moderation and fraud detection.

### Prompt 13: Create Scheduling Storage
```
Create server/storage/domains/scheduling.storage.ts covering meeting and appointment scheduling methods from storage.ts. Use shared/schema/scheduling.ts.
```

**What This Creates:** SchedulingStorage class with meeting scheduling methods.

### Prompt 14: Create Pricing Storage
```
Create server/storage/domains/pricing.storage.ts covering dynamic pricing methods from storage.ts. Use shared/schema/pricing.ts.
```

**What This Creates:** PricingStorage class with dynamic pricing methods.

### Prompt 15: Create Content Storage
```
Create server/storage/domains/content.storage.ts covering content categorization methods from storage.ts. Use shared/schema/content.ts.
```

**What This Creates:** ContentStorage class with content categorization methods.

---

## Phase 4: Update Storage Facade

### Prompt 16: Merge All Domain Modules
```
Update server/storage/index.ts to import and merge ALL domain storage modules (all 17 domains). Ensure proper method mappings for backward compatibility.
```

**What This Does:** Updates the facade to include all domain modules with proper precedence.

---

## Phase 5: Update All Imports

### Prompt 17: Update Router Imports
```
Update all files in server/routers/ to import from the appropriate domain storage modules instead of the monolithic storage. Fix all TypeScript errors in router files.
```

**What This Does:** Changes router imports to use domain storage, fixes type errors.

### Prompt 18: Update Service Imports
```
Update all files in server/services/ to import from the appropriate domain storage modules. Fix all TypeScript errors in service files.
```

**What This Does:** Changes service imports to use domain storage, fixes type errors.

### Prompt 19: Update Client Components
```
Update all client components to use the correct schema types from the new domain structure. Fix all TypeScript errors in client/ files.
```

**What This Does:** Updates frontend to use correct types from new schema structure.

---

## Phase 6: Remove Legacy & Validate

### Prompt 20: Remove Monolithic Storage
```
Delete or archive the monolithic server/storage.ts file. Update server/storage/index.ts to remove the legacyStorage import and only use domain modules.
```

**What This Does:** Removes the 16k line monolith, completes migration.

### Prompt 21: TypeScript Validation
```
Run TypeScript compilation check. Report the error count. If > 0, systematically fix remaining errors by domain until we reach zero.
```

**What This Does:** Validates all TypeScript errors are resolved (target: 0 errors).

### Prompt 22: Production Readiness Testing
```
Fix the runtime activity_logs entity error and test all critical app features (auth, inventory, chat, analytics, notifications). Ensure the app is production-ready.
```

**What This Does:** Fixes runtime errors, validates all features work correctly.

---

## Usage Instructions

1. **Copy Prompt 1** and paste it to the agent
2. Wait for completion confirmation
3. **Copy Prompt 2** and paste it to the agent
4. Continue sequentially through all 22 prompts
5. Each step is independent and testable

## Success Criteria

- ✅ All 17+ domain storage files created
- ✅ Zero TypeScript errors (down from 1,458)
- ✅ No runtime errors
- ✅ All app features tested and working
- ✅ Monolithic storage.ts removed
- ✅ Clean, maintainable domain-driven architecture

## Domain List (17 Total)

1. inventory (existing)
2. user-auth (existing)
3. recipes (existing)
4. chat (existing)
5. analytics (existing, needs fix)
6. feedback (existing, needs fix)
7. notifications (existing, needs fix)
8. food (needs creation)
9. ai-ml (needs creation)
10. system (needs creation)
11. support (needs creation)
12. billing (needs creation)
13. experiments (needs creation)
14. security (needs creation)
15. scheduling (needs creation)
16. pricing (needs creation)
17. content (needs creation)

---

## Estimated Timeline

- Phase 1: 10 minutes
- Phase 2: 30 minutes (fixing 3 domains)
- Phase 3: 2-3 hours (creating 10 new domains)
- Phase 4: 15 minutes (facade update)
- Phase 5: 1-2 hours (updating imports)
- Phase 6: 30 minutes (cleanup & validation)

**Total:** Approximately 4-6 hours of focused work across 22 manageable steps.
