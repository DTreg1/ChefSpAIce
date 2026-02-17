# ChefSpAIce Comprehensive Testing Guide

This document contains detailed test cases for every feature in ChefSpAIce, organized by category. Each section includes copyable prompts you can paste into the AI agent to run automated tests.

---

## Table of Contents

1. [Authentication & Session Management](#1-authentication--session-management)
2. [Onboarding Flow](#2-onboarding-flow)
3. [Subscription System](#3-subscription-system)
4. [Inventory Management](#4-inventory-management)
5. [Recipe Features](#5-recipe-features)
6. [AI Chat Assistant](#6-ai-chat-assistant)
7. [Scanning Features](#7-scanning-features)
8. [Cookware Management](#8-cookware-management)
9. [Shopping List](#9-shopping-list)
10. [Meal Planning](#10-meal-planning)
11. [Profile & Settings](#11-profile--settings)
12. [Offline & Sync](#12-offline--sync)
13. [Notifications](#13-notifications)
14. [Full Regression Suite](#14-full-regression-suite)

---

## 1. Authentication & Session Management

### 1.1 New User Registration

**Prompt:**
```
Test the user registration flow:
1. Navigate to the app (/)
2. Click "Get Started" or navigate to signup
3. Enter a unique email (test_${nanoid(6)}@test.com), username (user_${nanoid(6)}), and password (TestPass123!)
4. Submit the registration form
5. Verify successful account creation
6. Verify the user is redirected to onboarding or main app
7. Verify a 7-day Pro trial is automatically activated
```

### 1.2 User Login

**Prompt:**
```
Test user login functionality:
1. Create a new test account first
2. Log out of the account
3. Navigate to the login screen
4. Enter the credentials
5. Submit the login form
6. Verify successful login
7. Verify the user sees the main app interface
8. Verify session persists after page refresh (web)
```

### 1.3 Session Persistence

**Prompt:**
```
Test session persistence:
1. Log in with a test account
2. Refresh the page (web) or restart the app (mobile)
3. Verify the user remains logged in
4. Verify the auth token is properly restored
5. Navigate to Profile and verify user data loads correctly
```

### 1.4 Logout

**Prompt:**
```
Test logout functionality:
1. Log in with a test account
2. Navigate to Profile screen
3. Click the logout button
4. Verify the user is redirected to Landing (web) or Auth (mobile)
5. Verify protected routes are no longer accessible
6. Refresh the page and verify the user stays logged out
```

---

## 2. Onboarding Flow

### 2.1 Complete Onboarding (New User)

**Prompt:**
```
Test the complete onboarding flow for a new user:
1. Create a new account (test_${nanoid(6)}@test.com)
2. Verify onboarding screen appears after signup
3. Complete each onboarding step:
   - Step 1: Welcome/intro
   - Step 2: Set dietary preferences
   - Step 3: Define storage areas (pantry, fridge, freezer)
   - Step 4: Select starter foods
   - Step 5: Choose kitchen equipment/cookware
   - Step 6: Final confirmation
4. Verify onboarding completion is saved
5. Verify user is redirected to main app
6. Verify starter items appear in inventory
```

### 2.2 Cookware Selection During Onboarding

**Prompt:**
```
Test cookware selection during onboarding:
1. Start a new account and reach the cookware selection step
2. Verify cookware categories are displayed
3. Select multiple cookware items
4. Verify selection count is shown
5. Complete onboarding
6. Navigate to Cookware screen
7. Verify selected cookware items are saved
```

### 2.3 Skip/Resume Onboarding

**Prompt:**
```
Test onboarding skip and resume:
1. Create new account and start onboarding
2. Close the app/refresh page mid-onboarding
3. Reopen the app
4. Verify onboarding resumes from where user left off
5. Complete remaining steps
6. Verify full completion
```

---

## 3. Subscription System

### 3.1 Trial Status Display

**Prompt:**
```
Test trial status for new users:
1. Create a new test account
2. Complete onboarding
3. Navigate to Profile > Subscription
4. Verify:
   - Current plan shows "Pro"
   - Status shows "Trial" with days remaining (7 days)
   - "Subscribe to Keep Pro" card is visible
   - "Manage Subscription" is NOT visible
   - Usage shows "Unlimited" for pantry, AI recipes, cookware
5. Navigate to Inventory
6. Verify no item limit warnings
```

### 3.2 Basic Tier Limits

**Prompt:**
```
Test Basic tier limitations (requires expired trial or Basic subscription):
1. Log in with a Basic tier user account
2. Navigate to Subscription screen
3. Verify:
   - Plan shows "Basic"
   - Limits show: 25 pantry items, 5 AI recipes/month, 5 cookware
4. Navigate to Inventory
5. Add items until approaching limit
6. Verify warning appears near limit
7. Verify add functionality is disabled at limit
8. Navigate to Cookware
9. Verify 5-item limit is enforced
10. Navigate to Scan Hub
11. Verify Recipe Scanning shows upgrade prompt
12. Verify Bulk Scanning shows upgrade prompt
```

### 3.3 Pro Tier Features

**Prompt:**
```
Test Pro tier features:
1. Log in with a Pro tier user (trial or paid)
2. Navigate to Subscription screen
3. Verify unlimited usage shown
4. Navigate to Inventory
5. Verify no limits on adding items
6. Navigate to Scan Hub
7. Verify Recipe Scanning is available (no upgrade prompt)
8. Verify Bulk Scanning is available
9. Navigate to Cookware
10. Verify no limit on cookware items
11. Access AI Chat
12. Verify Live AI Kitchen Assistant is available
```

### 3.4 Stripe Checkout Flow

**Prompt:**
```
Test Stripe checkout for subscription upgrade:
1. Create a new trial user account
2. Navigate to Profile > Subscription
3. Click "Subscribe to Pro" button
4. Verify loading state appears on button
5. Verify redirect to Stripe checkout page (checkout.stripe.com)
6. [Note: Test mode won't complete actual payment]
7. Verify checkout page shows correct plan/price
```

### 3.5 Subscription Management

**Prompt:**
```
Test subscription management for paid subscribers:
1. Log in with a paid Pro subscriber account
2. Navigate to Profile > Subscription
3. Verify "Manage Subscription" button is visible
4. Click "Manage Subscription"
5. Verify redirect to Stripe customer portal
6. Verify portal shows current subscription details
```

### 3.6 Feature Comparison Table

**Prompt:**
```
Test the feature comparison table on Subscription screen:
1. Navigate to Profile > Subscription
2. Scroll to Feature Comparison section
3. Verify table shows:
   - Pantry Items: 25 vs Unlimited
   - AI Recipes: 5/month vs Unlimited
   - Cookware Items: 5 vs Unlimited
   - Recipe Scanning: X vs Check
   - Bulk Scanning: X vs Check
   - Live AI Kitchen Assistant: X vs Check
   - Custom Storage Areas: X vs Check
   - Weekly Meal Prepping: X vs Check
```

---

## 4. Inventory Management

### 4.1 Add Item Manually

**Prompt:**
```
Test adding a food item manually:
1. Navigate to Inventory screen
2. Tap the + button
3. Search for a food item (e.g., "Apple")
4. Select an item from search results
5. Set quantity and unit
6. Set storage location (Pantry/Fridge/Freezer)
7. Optionally set expiration date
8. Save the item
9. Verify item appears in inventory list
10. Verify item shows correct details (name, quantity, location, expiration)
```

### 4.2 Edit Item

**Prompt:**
```
Test editing an existing inventory item:
1. Navigate to Inventory with at least one item
2. Tap on an item to open details
3. Tap edit button
4. Modify quantity
5. Modify storage location
6. Modify expiration date
7. Save changes
8. Verify changes are reflected in the list
```

### 4.3 Delete Item

**Prompt:**
```
Test deleting an inventory item:
1. Navigate to Inventory with at least one item
2. Swipe left on an item (or use delete action)
3. Confirm deletion
4. Verify item is removed from list
5. Verify item count updates correctly
```

### 4.4 Search and Filter

**Prompt:**
```
Test inventory search and filtering:
1. Navigate to Inventory with multiple items
2. Use the search bar to search by item name
3. Verify only matching items appear
4. Clear search
5. Filter by food group (Fruits, Vegetables, Dairy, etc.)
6. Verify only items in selected group appear
7. Apply multiple filters
8. Verify "X of Y items" counter is accurate
9. Use "Clear filters" button
10. Verify all items are shown again
```

### 4.5 Expiration Status

**Prompt:**
```
Test expiration status display:
1. Add items with various expiration dates:
   - One expired (past date)
   - One expiring soon (within 3 days)
   - One fresh (2+ weeks out)
2. Navigate to Inventory
3. Verify expired items show red/warning indicator
4. Verify expiring soon items show orange/caution indicator
5. Verify fresh items show green/normal indicator
6. Verify sorting by expiration works correctly
```

### 4.6 Storage Location Grouping

**Prompt:**
```
Test grouping items by storage location:
1. Add items to different storage locations (Pantry, Fridge, Freezer)
2. Navigate to Inventory
3. Verify items are grouped by storage location
4. Verify section headers show location name and item count
5. Verify collapsing/expanding sections works
```

### 4.7 Nutrition Information

**Prompt:**
```
Test nutrition information display:
1. Add a food item with nutrition data available
2. Navigate to Inventory
3. Tap on the item
4. Expand nutrition section
5. Verify nutrition facts are displayed (calories, protein, carbs, fat)
6. Verify serving size is shown
```

---

## 5. Recipe Features

### 5.1 Generate Recipe from Inventory

**Prompt:**
```
Test AI recipe generation from inventory:
1. Ensure inventory has 5+ items
2. Navigate to Recipes tab
3. Tap "Generate Recipe" or AI recipe button
4. Select "Use my inventory" option
5. Wait for AI generation
6. Verify recipe is generated with:
   - Title
   - Ingredients (from inventory)
   - Step-by-step instructions
   - Prep/cook time
7. Verify ingredients match inventory items
```

### 5.2 Generate Recipe with Custom Ingredients

**Prompt:**
```
Test recipe generation with custom ingredients:
1. Navigate to Recipes tab
2. Tap "Generate Recipe"
3. Enter custom ingredients (e.g., "chicken, rice, broccoli")
4. Optionally set cuisine type or dietary restrictions
5. Generate recipe
6. Verify recipe uses specified ingredients
7. Verify recipe respects dietary restrictions if set
```

### 5.3 Save Recipe

**Prompt:**
```
Test saving a generated recipe:
1. Generate a new recipe
2. Tap "Save Recipe" button
3. Verify recipe is saved to "My Recipes"
4. Navigate to Recipes tab
5. Verify saved recipe appears in the list
6. Tap on saved recipe
7. Verify all details are preserved
```

### 5.4 Recipe Detail View

**Prompt:**
```
Test recipe detail screen:
1. Navigate to Recipes tab
2. Select a saved recipe
3. Verify display includes:
   - Recipe title and image (if available)
   - Ingredients list with quantities
   - Step-by-step instructions
   - Prep time and cook time
   - Servings
4. Verify "Add to Shopping List" button works
5. Verify "Cook This" or similar action is available
```

### 5.5 Export Recipe

**Prompt:**
```
Test recipe export functionality:
1. Open a saved recipe
2. Tap export/share button
3. Verify export options (PDF, share)
4. Export as PDF
5. Verify PDF is generated with recipe content
```

### 5.6 AI Recipe Limit (Basic Tier)

**Prompt:**
```
Test AI recipe limit for Basic tier:
1. Log in with Basic tier user
2. Navigate to Recipes
3. Check current AI recipe usage (X of 5)
4. Generate recipes until limit is reached
5. Verify limit counter updates each time
6. Verify upgrade prompt appears at limit
7. Verify generation is blocked after limit
```

---

## 6. AI Chat Assistant

### 6.1 Open Chat Modal

**Prompt:**
```
Test opening the AI chat assistant:
1. Log in to the app
2. Tap the floating chat button (bottom right)
3. Verify chat modal opens
4. Verify chat history is shown (or empty state for new chat)
5. Verify text input is available
6. Verify send button is visible
```

### 6.2 Basic Chat Interaction

**Prompt:**
```
Test basic chat with AI assistant:
1. Open the chat modal
2. Type a message: "What can I make with chicken and rice?"
3. Send the message
4. Verify loading indicator appears
5. Verify AI response is received
6. Verify response is relevant to the question
7. Send a follow-up message
8. Verify conversation context is maintained
```

### 6.3 AI Function Calling

**Prompt:**
```
Test AI assistant actions:
1. Open chat modal
2. Ask: "Add milk to my shopping list"
3. Verify AI confirms the action
4. Navigate to Shopping List
5. Verify milk was added
6. Return to chat
7. Ask: "Generate a pasta recipe"
8. Verify AI generates a recipe
```

### 6.4 Voice Input

**Prompt:**
```
Test voice input in chat:
1. Open chat modal
2. Tap the microphone button
3. [Requires permission] Allow microphone access
4. Speak a question
5. Verify speech is transcribed to text
6. Verify message is sent
7. Verify AI responds
```

### 6.5 Feedback/Bug Report via Chat

**Prompt:**
```
Test submitting feedback via chat:
1. Open chat modal
2. Type: "I want to report a bug"
3. Verify AI acknowledges and asks for details
4. Provide bug description
5. Verify feedback is submitted
6. Verify confirmation message
```

---

## 7. Scanning Features

### 7.1 Barcode Scanning

**Prompt:**
```
Test barcode scanning:
1. Navigate to Scan Hub or tap scan button
2. Select "Barcode" scanning option
3. [Requires permission] Allow camera access
4. Point camera at a food product barcode
5. Verify barcode is detected
6. Verify product information is looked up
7. Verify product details are displayed (name, nutrition)
8. Add product to inventory
9. Verify product appears in inventory
```

### 7.2 Nutrition Label Scanning

**Prompt:**
```
Test nutrition label scanning:
1. Navigate to Scan Hub
2. Select "Nutrition Label" option
3. [Requires permission] Allow camera access
4. Capture a nutrition label
5. Verify OCR processes the image
6. Verify nutrition data is extracted
7. Review and confirm extracted data
8. Save to inventory
```

### 7.3 Recipe Scanning (Pro Only)

**Prompt:**
```
Test recipe scanning:
1. Ensure user has Pro tier (trial or paid)
2. Navigate to Scan Hub
3. Select "Recipe Scanning" option
4. Capture a physical recipe (from book or paper)
5. Verify recipe is digitized
6. Verify ingredients and steps are extracted
7. Save recipe to collection
```

### 7.4 Bulk Scanning (Pro Only)

**Prompt:**
```
Test bulk scanning:
1. Ensure user has Pro tier
2. Navigate to Scan Hub
3. Select "Bulk Scanning" option
4. Scan multiple items in sequence
5. Verify each item is queued
6. Review all scanned items
7. Add all to inventory at once
8. Verify all items appear in inventory
```

### 7.5 Food Camera (AI Identification)

**Prompt:**
```
Test AI food identification:
1. Navigate to Scan Hub
2. Select "Food Camera" or AI identification option
3. Take photo of a food item
4. Verify AI processes the image
5. Verify food is identified with confidence score
6. Confirm or correct the identification
7. Add to inventory
```

### 7.6 Scanning Pro Feature Gating (Basic Tier)

**Prompt:**
```
Test Pro feature gating for scanning:
1. Log in with Basic tier user
2. Navigate to Scan Hub
3. Try to access Recipe Scanning
4. Verify upgrade prompt/modal appears
5. Try to access Bulk Scanning
6. Verify upgrade prompt appears
7. Verify clicking upgrade leads to Subscription screen
```

---

## 8. Cookware Management

### 8.1 View Cookware

**Prompt:**
```
Test viewing cookware collection:
1. Navigate to Cookware screen (via Profile or navigation)
2. Verify cookware categories are displayed
3. Verify selected items are highlighted
4. Verify item count is shown
5. Check different categories (pots, pans, appliances, etc.)
```

### 8.2 Add Cookware

**Prompt:**
```
Test adding cookware:
1. Navigate to Cookware screen
2. Tap an unselected cookware item
3. Verify item is added to collection
4. Verify count updates
5. Verify visual indication of selection
```

### 8.3 Remove Cookware

**Prompt:**
```
Test removing cookware:
1. Navigate to Cookware with items selected
2. Tap a selected cookware item
3. Verify item is removed
4. Verify count decreases
5. Verify visual indication updates
```

### 8.4 Cookware Limit (Basic Tier)

**Prompt:**
```
Test cookware limit for Basic tier:
1. Log in with Basic tier user
2. Navigate to Cookware screen
3. Add items until reaching 5
4. Verify limit warning appears
5. Try to add a 6th item
6. Verify action is blocked
7. Verify upgrade prompt appears
```

---

## 9. Shopping List

### 9.1 View Shopping List

**Prompt:**
```
Test viewing shopping list:
1. Navigate to Shopping List screen
2. Verify list displays existing items
3. Verify items show name and quantity
4. Verify checked/unchecked status is visible
```

### 9.2 Add Item to List

**Prompt:**
```
Test adding item to shopping list:
1. Navigate to Shopping List
2. Tap add button or input field
3. Enter item name (e.g., "Eggs")
4. Set quantity if available
5. Add item
6. Verify item appears in list
```

### 9.3 Check Off Items

**Prompt:**
```
Test checking off items:
1. Navigate to Shopping List with items
2. Tap an item to check it off
3. Verify visual indication (strikethrough, checkmark)
4. Tap again to uncheck
5. Verify status toggles correctly
```

### 9.4 Delete Items

**Prompt:**
```
Test deleting shopping list items:
1. Navigate to Shopping List with items
2. Delete an item (swipe or delete button)
3. Verify item is removed
4. Verify list updates correctly
```

### 9.5 Add Recipe Ingredients to List

**Prompt:**
```
Test adding recipe ingredients to shopping list:
1. Open a saved recipe
2. Tap "Add to Shopping List" or similar
3. Select which ingredients to add
4. Confirm addition
5. Navigate to Shopping List
6. Verify recipe ingredients appear
```

---

## 10. Meal Planning

### 10.1 View Meal Plan

**Prompt:**
```
Test viewing meal plan:
1. Navigate to Meals tab
2. Verify weekly view is displayed
3. Verify days of the week are shown
4. Verify meal slots (breakfast, lunch, dinner) are visible
```

### 10.2 Add Meal to Plan

**Prompt:**
```
Test adding a meal to the plan:
1. Navigate to Meal Plan
2. Tap on an empty meal slot
3. Select a saved recipe
4. Confirm addition
5. Verify recipe appears in the slot
```

### 10.3 Remove Meal from Plan

**Prompt:**
```
Test removing a meal from plan:
1. Navigate to Meal Plan with scheduled meals
2. Tap on a scheduled meal
3. Select remove/delete option
4. Verify meal is removed from slot
```

### 10.4 Weekly Meal Prep (Pro Only)

**Prompt:**
```
Test weekly meal prep feature (Pro tier):
1. Ensure user has Pro tier
2. Navigate to Meal Plan
3. Access "Weekly Meal Prep" feature
4. Verify meal prep suggestions are generated
5. Verify shopping list can be generated from plan
```

---

## 11. Profile & Settings

### 11.1 View Profile

**Prompt:**
```
Test viewing profile:
1. Navigate to Profile tab
2. Verify user info is displayed (name, email, avatar)
3. Verify subscription status is shown
4. Verify settings options are visible
```

### 11.2 Edit Profile

**Prompt:**
```
Test editing profile:
1. Navigate to Profile
2. Tap edit profile button
3. Update display name
4. Update profile picture (if supported)
5. Save changes
6. Verify changes are reflected
```

### 11.3 Theme Toggle

**Prompt:**
```
Test dark/light mode toggle:
1. Navigate to Profile or Settings
2. Find theme toggle
3. Switch to dark mode
4. Verify app UI updates to dark theme
5. Switch to light mode
6. Verify app UI updates to light theme
7. Refresh page/restart app
8. Verify theme preference persists
```

### 11.4 Notification Settings

**Prompt:**
```
Test notification settings:
1. Navigate to Profile > Settings
2. Find notification preferences
3. Toggle expiration notifications on/off
4. Verify setting is saved
5. Refresh and verify setting persists
```

### 11.5 Data Export

**Prompt:**
```
Test data export functionality:
1. Navigate to Profile or Settings
2. Find export data option
3. Export inventory as CSV
4. Verify CSV file is generated
5. Verify CSV contains inventory data
6. Export recipes if available
```

### 11.6 Reset Onboarding

**Prompt:**
```
Test reset onboarding (if available):
1. Navigate to Profile > Settings
2. Find "Reset Onboarding" or similar option
3. Trigger reset
4. Verify onboarding flow restarts on next app open
```

---

## 12. Offline & Sync

### 12.1 Offline Mode Indicator

**Prompt:**
```
Test offline mode indicator:
1. Disconnect from internet
2. Open the app
3. Verify offline banner/indicator appears
4. Verify app is still usable with cached data
5. Reconnect to internet
6. Verify online status is restored
7. Verify any pending changes sync
```

### 12.2 Offline Data Access

**Prompt:**
```
Test offline data access:
1. While online, add several inventory items
2. Disconnect from internet
3. Navigate through the app
4. Verify inventory items are still visible
5. Verify saved recipes are accessible
6. Try to add a new item offline
7. Verify item is saved locally
```

### 12.3 Sync After Reconnection

**Prompt:**
```
Test sync after reconnection:
1. Go offline
2. Make changes (add item, edit item, etc.)
3. Reconnect to internet
4. Verify sync occurs
5. Log out and log back in
6. Verify all changes are persisted on server
```

---

## 13. Notifications

### 13.1 Expiration Notifications

**Prompt:**
```
Test expiration notifications:
1. Add an item with expiration date set to tomorrow
2. Ensure notifications are enabled
3. [Time-based test] Wait for scheduled notification time
4. Verify notification is received about expiring item
```

### 13.2 Notification Permissions

**Prompt:**
```
Test notification permission handling:
1. On a fresh install/account
2. Navigate to settings where notifications are configured
3. Verify permission prompt appears
4. Grant permission
5. Verify notifications are enabled
```

---

## 14. Full Regression Suite

### 14.1 Complete User Journey (New User)

**Prompt:**
```
Run a complete new user journey test:

1. [New Context] Create a new browser context

2. [Browser] Navigate to the app (/)

3. [Browser] Create a new account:
   - Email: test_${nanoid(8)}@chefspaice.test
   - Username: chef_${nanoid(6)}
   - Password: ChefTest123!

4. [Browser] Complete full onboarding:
   - Set dietary preferences
   - Configure storage areas
   - Select 5 starter foods
   - Choose 3 cookware items
   - Complete onboarding

5. [Verify] Post-onboarding state:
   - Main app is displayed
   - Inventory shows starter items
   - Pro trial is active (7 days)
   - Bottom navigation is visible

6. [Browser] Test Inventory features:
   - Search for an item
   - Add a new item manually
   - Edit an existing item
   - Delete an item

7. [Browser] Test Recipe generation:
   - Navigate to Recipes
   - Generate an AI recipe from inventory
   - Save the recipe

8. [Browser] Test AI Chat:
   - Open chat modal
   - Ask a cooking question
   - Verify AI responds

9. [Browser] Test Scan Hub:
   - Navigate to Scan Hub
   - Verify all scan options are available (Pro trial)

10. [Browser] Test Shopping List:
    - Navigate to Shopping List
    - Add an item
    - Check off an item

11. [Browser] Test Subscription:
    - Navigate to Profile > Subscription
    - Verify trial status (Pro - 7 days)
    - Verify "Subscribe to Pro" button

12. [Browser] Test Profile:
    - Navigate to Profile
    - Toggle theme
    - Verify theme change

13. [Verify] Final state:
    - All features accessible during Pro trial
    - No errors in console
    - Data persists after navigation
```

### 14.2 Basic Tier Restrictions Test

**Prompt:**
```
Test Basic tier restrictions comprehensively:

1. [Setup] Use or create a Basic tier user account

2. [Browser] Navigate to Subscription screen
3. [Verify] Plan shows "Basic" with limits:
   - 25 pantry items
   - 5 AI recipes/month
   - 5 cookware items

4. [Browser] Navigate to Inventory
5. [Verify] Usage counter shows X/25
6. [Browser] If near limit, add items until limit reached
7. [Verify] Cannot add beyond 25 items
8. [Verify] Upgrade prompt appears

9. [Browser] Navigate to Cookware
10. [Verify] Shows X/5 limit
11. [Browser] If at limit, verify cannot add more
12. [Verify] Upgrade prompt appears

13. [Browser] Navigate to Recipes
14. [Verify] AI recipe usage shows X/5
15. [Browser] Generate recipes until limit
16. [Verify] Cannot generate beyond 5/month
17. [Verify] Upgrade prompt appears

18. [Browser] Navigate to Scan Hub
19. [Verify] Recipe Scanning shows upgrade prompt
20. [Verify] Bulk Scanning shows upgrade prompt
21. [Verify] Other scan options work (barcode, food camera)

22. [Browser] Test upgrade flow:
    - Click any upgrade prompt
    - Verify redirect to Subscription screen or Stripe
```

### 14.3 Critical Path Smoke Test

**Prompt:**
```
Run a quick critical path smoke test covering essential features:

1. [New Context] Create a new browser context

2. [Browser] Navigate to app and sign up/sign in

3. [Verify] App loads without errors

4. [Browser] Navigate to Inventory
5. [Verify] Inventory screen loads
6. [Browser] Add one item
7. [Verify] Item appears in list

8. [Browser] Navigate to Recipes
9. [Verify] Recipes screen loads

10. [Browser] Navigate to Shopping List
11. [Verify] Shopping list screen loads

12. [Browser] Navigate to Profile
13. [Verify] Profile loads with user info

14. [Browser] Navigate to Subscription
15. [Verify] Subscription status is displayed

16. [Browser] Open AI Chat
17. [Verify] Chat modal opens

18. [Verify] No console errors during navigation
```

---

## Usage Tips

1. **For automated testing**: Copy the prompts exactly as written. The AI agent will execute them using Playwright.

2. **For manual testing**: Use the prompts as checklists and test each step manually.

3. **Create test accounts**: Always use unique test accounts with the `${nanoid()}` pattern to avoid conflicts.

4. **Test both tiers**: Many features behave differently for Basic vs Pro users. Test both scenarios.

5. **Check error states**: Try invalid inputs, network disconnection, and edge cases.

6. **Mobile vs Web**: Some features may differ between web and mobile. Test on both platforms when possible.

---

## Quick Commands

**Run full regression:**
```
Test the entire ChefSpAIce application end-to-end. Create a new test account, complete onboarding, test all major features (inventory, recipes, AI chat, scanning, shopping list, meal planning, profile, subscription), verify tier limits work correctly, and confirm no console errors. Provide a summary of all tests passed and any issues found.
```

**Test subscription system only:**
```
Test the complete subscription system: trial activation on signup, trial status display, feature limits for Basic tier, Stripe checkout flow, subscription management for paid users, and upgrade prompts throughout the app.
```

**Test inventory only:**
```
Test all inventory management features: add items manually, edit items, delete items, search and filter, expiration status display, storage location grouping, nutrition information, and tier limits on item count.
```

**Test AI features only:**
```
Test all AI-powered features: recipe generation from inventory, recipe generation with custom ingredients, AI chat assistant, voice input, AI food identification camera, and AI recipe limits for Basic tier.
```
