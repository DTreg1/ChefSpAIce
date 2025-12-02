# Food Storage - Appliances Implementation

**Priority:** Medium  
**File:** `server/storage/domains/food.storage.ts`  
**Stub Count:** 15 methods

## Current Status

All appliance-related methods return empty arrays or stub objects because the appliance tables don't exist.

## Methods to Implement

### Appliance Library (Admin/System)

| Method                                    | Description                     |
| ----------------------------------------- | ------------------------------- |
| `getAppliances()`                         | Get all appliances from library |
| `getApplianceCategories()`                | Get unique categories           |
| `getApplianceLibrary()`                   | Alias for getAppliances         |
| `getApplianceLibraryByCategory(category)` | Filter library by category      |
| `searchApplianceLibrary(query)`           | Search appliances by name       |
| `createAppliance(appliance)`              | Add to library (admin)          |
| `updateAppliance(id, data)`               | Update library entry (admin)    |
| `deleteAppliance(id)`                     | Remove from library (admin)     |

### User Appliances

| Method                                           | Description             |
| ------------------------------------------------ | ----------------------- |
| `getUserAppliances(userId)`                      | Get user's appliances   |
| `getUserAppliancesByCategory(userId, category)`  | Filter by category      |
| `addUserAppliance(userId, applianceId)`          | Add appliance to user   |
| `updateUserAppliance(userId, applianceId, data)` | Update user's appliance |
| `deleteUserAppliance(userId, applianceId)`       | Remove from user        |

---

## Step 1: Create Schema

Copy and paste this prompt:

```
Add appliance tables to shared/schema/food.ts:

1. applianceLibrary table:
   - id: uuid primary key with defaultRandom()
   - name: text, not null
   - category: text, not null (e.g., 'cooking', 'refrigeration', 'prep', 'small', 'cleaning')
   - description: text, nullable
   - imageUrl: text, nullable
   - defaultSettings: jsonb, nullable - default temperature ranges, modes, etc.
   - features: text array, nullable - e.g., ['convection', 'steam', 'air-fry']
   - createdAt: timestamp, default now()

2. userAppliances table:
   - id: uuid primary key with defaultRandom()
   - userId: text, not null, references users
   - applianceId: text, nullable, references applianceLibrary (null for custom)
   - customName: text, nullable - for custom appliances not in library
   - category: text, not null
   - brand: text, nullable
   - model: text, nullable
   - purchaseDate: date, nullable
   - settings: jsonb, nullable - user's custom settings
   - notes: text, nullable
   - createdAt: timestamp, default now()
   - updatedAt: timestamp, default now()

Create insert schemas and select types for both tables. Export everything. Run npm run db:push after.
```

---

## Step 2: Seed Appliance Library

Copy and paste this prompt:

```
Create a seed file at server/data/appliance-library.ts with common kitchen appliances:

const applianceLibrarySeed = [
  // Cooking
  { name: 'Oven', category: 'cooking', description: 'Standard kitchen oven', features: ['bake', 'broil', 'roast'] },
  { name: 'Stovetop', category: 'cooking', description: 'Gas or electric stovetop', features: ['simmer', 'boil', 'sauté'] },
  { name: 'Microwave', category: 'cooking', description: 'Microwave oven', features: ['reheat', 'defrost'] },
  { name: 'Air Fryer', category: 'cooking', description: 'Hot air cooking appliance', features: ['air-fry', 'roast', 'bake'] },
  { name: 'Slow Cooker', category: 'cooking', description: 'Crock pot for slow cooking', features: ['low', 'high', 'warm'] },
  { name: 'Instant Pot', category: 'cooking', description: 'Multi-function pressure cooker', features: ['pressure-cook', 'slow-cook', 'sauté', 'steam'] },
  { name: 'Toaster Oven', category: 'cooking', description: 'Countertop oven', features: ['toast', 'bake', 'broil'] },
  { name: 'Grill', category: 'cooking', description: 'Indoor or outdoor grill', features: ['grill', 'sear'] },

  // Refrigeration
  { name: 'Refrigerator', category: 'refrigeration', description: 'Main refrigerator', features: ['cool', 'crisper'] },
  { name: 'Freezer', category: 'refrigeration', description: 'Standalone freezer', features: ['freeze', 'deep-freeze'] },

  // Prep
  { name: 'Food Processor', category: 'prep', description: 'Multi-blade food processor', features: ['chop', 'slice', 'shred', 'puree'] },
  { name: 'Blender', category: 'prep', description: 'High-speed blender', features: ['blend', 'puree', 'crush'] },
  { name: 'Stand Mixer', category: 'prep', description: 'Kitchen stand mixer', features: ['mix', 'knead', 'whip'] },
  { name: 'Hand Mixer', category: 'prep', description: 'Electric hand mixer', features: ['mix', 'whip'] },
  { name: 'Immersion Blender', category: 'prep', description: 'Stick blender', features: ['blend', 'puree'] },

  // Small appliances
  { name: 'Coffee Maker', category: 'small', description: 'Drip coffee maker', features: ['brew', 'keep-warm'] },
  { name: 'Espresso Machine', category: 'small', description: 'Espresso and cappuccino maker', features: ['espresso', 'steam'] },
  { name: 'Electric Kettle', category: 'small', description: 'Electric water kettle', features: ['boil', 'temperature-control'] },
  { name: 'Toaster', category: 'small', description: 'Bread toaster', features: ['toast', 'defrost'] },
  { name: 'Waffle Maker', category: 'small', description: 'Electric waffle iron', features: ['waffle'] },
  { name: 'Rice Cooker', category: 'small', description: 'Automatic rice cooker', features: ['cook', 'keep-warm'] },
];

export default applianceLibrarySeed;

Then add a function to seed this data on first run if the library is empty.
```

---

## Step 3: Implement Storage Methods

Copy and paste this prompt:

```
Implement all 15 appliance methods in server/storage/domains/food.storage.ts:

Library methods:
1. getAppliances() - Select all from applianceLibrary ordered by category, name
2. getApplianceCategories() - Select distinct categories from applianceLibrary
3. getApplianceLibrary() - Same as getAppliances()
4. getApplianceLibraryByCategory(category) - Filter applianceLibrary by category
5. searchApplianceLibrary(query) - Use ilike to search name and description
6. createAppliance(appliance) - Insert into applianceLibrary, return created
7. updateAppliance(id, data) - Update applianceLibrary by id, return updated
8. deleteAppliance(id) - Delete from applianceLibrary by id

User methods:
9. getUserAppliances(userId) - Select from userAppliances with LEFT JOIN to applianceLibrary, return combined data
10. getUserAppliancesByCategory(userId, category) - Same as above filtered by category
11. addUserAppliance(userId, applianceId) - Insert into userAppliances with applianceId reference
12. updateUserAppliance(userId, applianceId, data) - Update userAppliances record, set updatedAt
13. deleteUserAppliance(userId, applianceId) - Delete from userAppliances

Import tables from schema. Use proper Drizzle ORM patterns with eq, and, ilike, desc functions.
```

---

## Verification

After implementation, test with:

```
Verify the appliance implementation:
1. Check that appliance library has seed data
2. Users can add appliances from library to their profile
3. Users can add custom appliances
4. Search works correctly
5. Category filtering works
6. TypeScript compiles without errors

Run npm run check to verify types.
```
