# Sizzle App Manual Testing Guide

---

## Test 1: App Loading & Navigation

```
1. Open browser to http://localhost:8081
2. Wait for app to fully load
3. Verify bottom tab bar appears with 4 icons
4. Tap "Inventory" tab
5. Tap "Recipes" tab
6. Tap "Meal Plan" tab
7. Tap "Settings" tab
```

---

## Test 2: Add Food Item

```
1. Tap "Inventory" tab
2. Tap the "+" or "Add" button
3. Enter food name: Test Apple
4. Enter quantity: 3
5. Select unit: pieces
6. Set expiration date: 5 days from today
7. Tap Save button
8. Verify item appears in inventory list
```

---

## Test 3: Edit Food Item

```
1. Tap "Inventory" tab
2. Tap on an existing food item
3. Change quantity to: 5
4. Tap Save button
5. Verify updated quantity in list
```

---

## Test 4: Delete Food Item

```
1. Tap "Inventory" tab
2. Find "Test Apple" item
3. Swipe left on the item OR tap delete icon
4. Confirm deletion if prompted
5. Verify item is removed from list
```

---

## Test 5: Generate Recipe

```
1. Tap "Recipes" tab
2. Tap "Generate Recipe" or "+" button
3. Enter ingredients: chicken, rice, vegetables
4. Tap Generate button
5. Wait for AI to generate recipe
6. Verify recipe title and instructions appear
```

---

## Test 6: View Recipe Details

```
1. Tap "Recipes" tab
2. Tap on any recipe in the list
3. Scroll through recipe details
4. Verify ingredients list is visible
5. Verify cooking instructions are visible
6. Tap any highlighted cooking term for definition
```

---

## Test 7: Meal Planning

```
1. Tap "Meal Plan" tab
2. Tap on today's date
3. Tap "+" to add a meal
4. Select a recipe from the list
5. Tap Save or Add button
6. Verify recipe appears on the calendar
```

---

## Test 8: Shopping List

```
1. Open drawer menu (hamburger icon) or find Shopping List
2. Tap "+" to add item
3. Enter: Milk
4. Tap Add button
5. Tap "+" again
6. Enter: Bread
7. Tap Add button
8. Tap checkbox next to "Milk" to mark purchased
9. Swipe left on "Bread" to delete
```

---

## Test 9: Barcode Scanning (Mobile Only)

```
1. Open app in Expo Go on phone
2. Tap "Inventory" tab
3. Tap "+" to add item
4. Tap barcode scanner icon
5. Allow camera permission if prompted
6. Point camera at food product barcode
7. Verify product info auto-fills
```

---

## Test 10: Voice Commands (Mobile Only)

```
1. Open app in Expo Go on phone
2. Tap microphone button
3. Allow microphone permission if prompted
4. Say: Add 2 apples to my inventory
5. Verify command is processed
6. Tap microphone button again
7. Say: What can I cook with chicken
8. Verify recipe suggestions appear
```

### Voice Commands to Try

```
Add 2 apples to my inventory
```

```
Add milk to fridge
```

```
What can I cook with chicken
```

```
Generate a recipe with pasta and tomatoes
```

```
Show my inventory
```

```
What expires soon
```

```
Suggest me a recipe
```

---

## Test 11: Expiration Tracking

```
1. Tap "Inventory" tab
2. Tap "+" to add item
3. Enter name: Yogurt
4. Set expiration: today
5. Save item
6. Verify red/urgent indicator appears
7. Add another item: Cheese
8. Set expiration: 3 days from now
9. Save item
10. Verify orange/warning indicator appears
```

---

## Test 12: Storage Suggestions

```
1. Tap "Inventory" tab
2. Tap "+" to add item
3. Enter name: Bananas
4. Observe storage location suggestion
5. Verify "Pantry" is suggested
6. Add another item: Milk
7. Verify "Refrigerator" is suggested
```

---

## Test 13: Settings

```
1. Tap "Settings" tab
2. Toggle dark/light mode switch
3. Verify theme changes immediately
4. Toggle notification preferences
5. Navigate away and return to Settings
6. Verify settings persisted
```

---

## Test 14: Waste Reduction Tips

```
1. Tap "Inventory" tab
2. Look for waste reduction tips section
3. Verify AI-generated tips are displayed
4. Tap on a tip for more details
5. Verify tips are relevant to inventory items
```

---

## Test 15: Offline Mode

```
1. Load the app completely
2. Turn on airplane mode
3. Tap through different tabs
4. View existing recipes
5. View inventory list
6. Verify no crash occurs
7. Turn off airplane mode
8. Verify data syncs
```

---

## Test 16: Error Handling

```
1. Tap "+" to add item
2. Leave name field empty
3. Tap Save button
4. Verify validation error message appears
5. Enter name: Test
6. Enter quantity: -5
7. Tap Save button
8. Verify error for invalid quantity
```

---

## API Tests (Terminal)

### Get Inventory

```bash
curl http://localhost:5000/api/inventory
```

### Add Inventory Item

```bash
curl -X POST http://localhost:5000/api/inventory \
  -H "Content-Type: application/json" \
  -d '{"name": "Test Apple", "quantity": 3, "unit": "pieces", "expirationDate": "2025-01-01"}'
```

### Generate Recipe

```bash
curl -X POST http://localhost:5000/api/recipes/generate \
  -H "Content-Type: application/json" \
  -d '{"ingredients": ["chicken", "rice", "vegetables"]}'
```

### Get Waste Reduction Tips

```bash
curl -X POST http://localhost:5000/api/suggestions/waste-reduction \
  -H "Content-Type: application/json" \
  -d '{"inventory": []}'
```

### Get Recipes

```bash
curl http://localhost:5000/api/recipes
```

### Get Meal Plan

```bash
curl http://localhost:5000/api/meal-plan
```

### Get Shopping List

```bash
curl http://localhost:5000/api/shopping-list
```

---

## Completion Checklist

| # | Test | Pass |
|---|------|------|
| 1 | App Loading & Navigation | |
| 2 | Add Food Item | |
| 3 | Edit Food Item | |
| 4 | Delete Food Item | |
| 5 | Generate Recipe | |
| 6 | View Recipe Details | |
| 7 | Meal Planning | |
| 8 | Shopping List | |
| 9 | Barcode Scanning | |
| 10 | Voice Commands | |
| 11 | Expiration Tracking | |
| 12 | Storage Suggestions | |
| 13 | Settings | |
| 14 | Waste Reduction Tips | |
| 15 | Offline Mode | |
| 16 | Error Handling | |
