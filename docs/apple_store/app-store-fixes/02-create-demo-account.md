# Fix 5: Create Demo Account for App Review

## Problem
Apple's App Review team needs access to test the app. If the app requires login, you must provide demo credentials in the App Review Notes. Without this, reviewers cannot test the app and may reject it.

## Goal
Create a stable demo account with pre-populated data that Apple reviewers can use to test all app features.

---

## Step-by-Step Instructions

### Step 1: Create Demo User in Database

```
Create a dedicated demo user that will persist across deployments.

In server/scripts/create-demo-user.ts, create a script that:
1. Creates a user with known credentials
2. Sets up sample inventory data
3. Adds sample recipes
4. Configures user preferences
5. Adds sample meal plans

Run with: npx ts-node server/scripts/create-demo-user.ts
```

### Step 2: Define Demo Account Credentials

```
Use these credentials (or customize):

Email: demo@chefspaice.com
Password: ChefSpAIce2024!

These will be provided to Apple in App Review Notes.
Note: Use a strong password since this is public information.
```

### Step 3: Pre-Populate Demo Data

```
The demo account should have realistic sample data:

Inventory Items (10-15 items):
- Fresh vegetables (expiring soon)
- Pantry staples
- Dairy products
- Proteins

Recipes (5-10 recipes):
- Mix of quick and complex recipes
- Various cuisines
- Some with images, some without

Meal Plans:
- Current week with some meals planned
- Mix of breakfast, lunch, dinner

Storage Areas:
- Refrigerator
- Freezer
- Pantry
- Counter
```

### Step 4: Add Pro Subscription to Demo Account

```
The demo account should have an active Pro subscription so reviewers can test all features:

1. Create a subscription record in the database
2. Set tier to 'pro'
3. Set expiration date far in the future
4. Mark as 'demo' or 'complimentary' status

This ensures reviewers see the full app experience.
```

### Step 5: Create Database Seed Script

```
Create server/scripts/seed-demo-data.ts that:

1. Checks if demo user exists
2. Creates demo user if not exists
3. Clears existing demo data
4. Populates fresh sample data
5. Logs success/failure

This script can be run before each app submission to ensure fresh data.
```

### Step 6: Update App Review Notes in App Store Connect

```
In App Store Connect, when submitting the app:

1. Go to your app > App Information
2. Find "App Review Information" section
3. In "Sign-in Information" enter:
   - Username: demo@chefspaice.com
   - Password: ChefSpAIce2024!
4. In "Notes" add additional context:

"Demo account is pre-populated with sample inventory, recipes, and meal plans. 
The account has Pro subscription enabled to test all features.

Key features to test:
- Scan a barcode to add inventory item
- Generate AI recipe from ingredients
- Create a meal plan
- View expiring items notifications
- Access all settings

The app also supports Sign in with Apple for new account creation."
```

### Step 7: Protect Demo Account from Deletion

```
In the delete account endpoint, add protection for the demo account:

if (user.email === 'demo@chefspaice.com') {
  return res.status(403).json({ 
    error: 'Demo account cannot be deleted' 
  });
}

This prevents accidental deletion of the review account.
```

### Step 8: Add Demo Account Reset Endpoint (Optional)

```
Create an admin endpoint to reset demo data:

POST /api/admin/reset-demo-account

This can be used to refresh demo data before each submission.
Protect with admin API key.
```

---

## Code Snippets

### Create Demo User Script (seed-demo-data.ts)

```typescript
import { db } from "../db";
import { users, userSyncData, subscriptions } from "@shared/schema";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "demo@chefspaice.com";
const DEMO_PASSWORD = "ChefSpAIce2024!";

async function seedDemoAccount() {
  console.log("Setting up demo account...");
  
  // Check if demo user exists
  const existing = await db.query.users.findFirst({
    where: eq(users.email, DEMO_EMAIL),
  });
  
  let userId: string;
  
  if (existing) {
    console.log("Demo user exists, updating...");
    userId = existing.id;
  } else {
    console.log("Creating demo user...");
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, 12);
    
    const [newUser] = await db.insert(users).values({
      email: DEMO_EMAIL,
      password: hashedPassword,
      displayName: "Demo User",
      createdAt: new Date(),
    }).returning();
    
    userId = newUser.id;
  }
  
  // Create Pro subscription
  await db.insert(subscriptions).values({
    userId,
    tier: "pro",
    status: "active",
    provider: "demo",
    expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    createdAt: new Date(),
  }).onConflictDoUpdate({
    target: subscriptions.userId,
    set: {
      tier: "pro",
      status: "active",
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
  });
  
  // Create sample sync data
  const sampleData = {
    inventory: [
      {
        id: "demo-1",
        name: "Chicken Breast",
        quantity: 2,
        unit: "lbs",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Protein",
      },
      {
        id: "demo-2", 
        name: "Broccoli",
        quantity: 1,
        unit: "head",
        storageArea: "refrigerator",
        expirationDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
        category: "Vegetable",
      },
      {
        id: "demo-3",
        name: "Rice",
        quantity: 5,
        unit: "lbs",
        storageArea: "pantry",
        category: "Grain",
      },
      // Add more items...
    ],
    recipes: [
      {
        id: "recipe-1",
        title: "Chicken Stir Fry",
        description: "Quick and healthy weeknight dinner",
        prepTime: 15,
        cookTime: 20,
        servings: 4,
        ingredients: ["Chicken breast", "Broccoli", "Soy sauce", "Garlic"],
        instructions: ["Cut chicken into strips", "Stir fry vegetables", "Add sauce"],
      },
      // Add more recipes...
    ],
    preferences: {
      cuisinePreferences: ["Italian", "Asian", "Mediterranean"],
      dietaryRestrictions: [],
      notificationEnabled: true,
    },
  };
  
  await db.insert(userSyncData).values({
    id: userId,
    data: JSON.stringify(sampleData),
    lastSyncedAt: new Date(),
  }).onConflictDoUpdate({
    target: userSyncData.id,
    set: {
      data: JSON.stringify(sampleData),
      lastSyncedAt: new Date(),
    },
  });
  
  console.log("Demo account setup complete!");
  console.log(`Email: ${DEMO_EMAIL}`);
  console.log(`Password: ${DEMO_PASSWORD}`);
}

seedDemoAccount()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Error setting up demo account:", error);
    process.exit(1);
  });
```

### Protect Demo Account (auth.router.ts)

```typescript
router.delete("/delete-account", requireAuth, async (req, res) => {
  const userId = req.user.id;
  
  // Protect demo account
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });
  
  if (user?.email === "demo@chefspaice.com") {
    return res.status(403).json({
      error: "Demo account cannot be deleted",
    });
  }
  
  // Continue with deletion...
});
```

---

## App Review Notes Template

Copy this into App Store Connect:

```
DEMO ACCOUNT CREDENTIALS
========================
Email: demo@chefspaice.com
Password: ChefSpAIce2024!

TESTING INSTRUCTIONS
====================
1. Login with demo credentials above
2. The account has sample inventory, recipes, and meal plans pre-loaded
3. Pro subscription is active - all features are accessible

KEY FEATURES TO TEST
====================
- Home: View dashboard with expiring items and suggestions
- Inventory: Add, edit, delete food items
- Scan: Use camera to scan barcodes or take photos of food
- Recipes: Browse recipes, generate AI recipes from inventory
- Meal Plan: Create and manage weekly meal plans
- Settings: Adjust preferences, view account info

NOTES
=====
- The app also supports Sign in with Apple for creating new accounts
- Push notifications require device permission
- AI recipe generation requires internet connection
- Barcode scanning requires camera permission

For any questions, contact: support@chefspaice.com
```

---

## Verification Checklist

- [ ] Demo user created with email: demo@chefspaice.com
- [ ] Strong password set (min 12 chars, mixed case, numbers, symbols)
- [ ] Sample inventory data added (10+ items)
- [ ] Sample recipes added (5+ recipes)
- [ ] Sample meal plan created
- [ ] Pro subscription activated
- [ ] Demo account protected from deletion
- [ ] Seed script can be re-run to refresh data
- [ ] Tested login with demo credentials
- [ ] App Review Notes updated in App Store Connect
- [ ] Contact email provided in review notes
