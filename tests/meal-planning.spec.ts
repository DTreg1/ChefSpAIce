import { test, expect } from '@playwright/test';

test.describe('Meal Planning and Shopping List', () => {
  test('should display meal planner calendar', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // Check calendar elements
    await expect(page.getByTestId('meal-calendar')).toBeVisible();
    await expect(page.getByTestId('week-navigation')).toBeVisible();
    
    // Check days of the week
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (const day of days) {
      await expect(page.getByTestId(`day-${day.toLowerCase()}`)).toBeVisible();
    }
    
    // Check meal slots
    await expect(page.getByTestId('meal-slot-breakfast')).toBeVisible();
    await expect(page.getByTestId('meal-slot-lunch')).toBeVisible();
    await expect(page.getByTestId('meal-slot-dinner')).toBeVisible();
  });

  test('should add a meal to the planner', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // Click on Monday breakfast slot
    await page.getByTestId('slot-monday-breakfast').click();
    
    // Add meal dialog should open
    await expect(page.getByTestId('dialog-add-meal')).toBeVisible();
    
    // Search for a recipe
    await page.getByTestId('input-search-recipe').fill('chicken');
    await page.keyboard.press('Enter');
    
    // Select first recipe from results
    await page.getByTestId('recipe-option').first().click();
    
    // Set serving size
    await page.getByTestId('input-servings').fill('4');
    
    // Save meal
    await page.getByTestId('button-save-meal').click();
    
    // Verify meal appears in calendar
    await expect(page.getByTestId('slot-monday-breakfast')).toContainText('chicken');
    await expect(page.getByTestId('slot-monday-breakfast')).toContainText('4 servings');
  });

  test('should move meals between slots', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // Drag a meal from Monday breakfast to Tuesday lunch
    const source = page.getByTestId('slot-monday-breakfast');
    const target = page.getByTestId('slot-tuesday-lunch');
    
    await source.dragTo(target);
    
    // Verify meal moved
    await expect(target).toContainText('chicken');
    await expect(source).not.toContainText('chicken');
  });

  test('should generate shopping list from meal plan', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // Add a few meals first
    await page.getByTestId('slot-monday-dinner').click();
    await page.getByTestId('recipe-option').first().click();
    await page.getByTestId('button-save-meal').click();
    
    await page.getByTestId('slot-wednesday-lunch').click();
    await page.getByTestId('recipe-option').first().click();
    await page.getByTestId('button-save-meal').click();
    
    // Generate shopping list
    await page.getByTestId('button-generate-shopping-list').click();
    
    // Should redirect to shopping list page
    await page.waitForURL('**/shopping-list');
    
    // Verify shopping list is generated
    await expect(page.getByTestId('shopping-list-container')).toBeVisible();
    const itemCount = await page.getByTestId('shopping-item').count();
    expect(itemCount).toBeGreaterThanOrEqual(1);
  });

  test('should organize shopping list by category', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // Check for category sections
    const categories = ['Produce', 'Dairy', 'Meat', 'Pantry', 'Frozen'];
    
    for (const category of categories) {
      const section = page.getByTestId(`category-${category.toLowerCase()}`);
      if (await section.isVisible()) {
        // Each category should have items
        const items = section.getByTestId('shopping-item');
        expect(await items.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should check off items from shopping list', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // Get first shopping item
    const firstItem = page.getByTestId('shopping-item').first();
    const itemText = await firstItem.textContent();
    
    // Check off the item
    await firstItem.getByTestId('checkbox-item').check();
    
    // Item should be marked as checked
    await expect(firstItem).toHaveClass(/checked|completed/);
    
    // Uncheck the item
    await firstItem.getByTestId('checkbox-item').uncheck();
    
    // Item should not be checked
    await expect(firstItem).not.toHaveClass(/checked|completed/);
  });

  test('should add custom items to shopping list', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // Click add item button
    await page.getByTestId('button-add-shopping-item').click();
    
    // Add custom item
    await page.getByTestId('input-item-name').fill('Paper Towels');
    await page.getByTestId('input-item-quantity').fill('2');
    await page.getByTestId('select-item-unit').selectOption('rolls');
    await page.getByTestId('button-save-item').click();
    
    // Verify item appears in list
    await expect(page.getByText('Paper Towels')).toBeVisible();
    await expect(page.getByText('2 rolls')).toBeVisible();
  });

  test('should export shopping list', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('button-export-list').click();
    
    // Choose export format
    await page.getByTestId('option-export-pdf').click();
    
    // Verify download started
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('shopping-list');
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should sync shopping list with inventory after shopping', async ({ page }) => {
    await page.goto('/shopping-list');
    
    // Mark all items as purchased
    await page.getByTestId('button-mark-all-purchased').click();
    
    // Confirm purchase
    await page.getByTestId('button-confirm-purchase').click();
    
    // Should show option to add to inventory
    await expect(page.getByTestId('dialog-add-to-inventory')).toBeVisible();
    
    // Add all items to inventory
    await page.getByTestId('button-add-all-to-inventory').click();
    
    // Should show success message
    await expect(page.getByText('Items added to inventory')).toBeVisible();
    
    // Shopping list should be cleared
    await expect(page.getByTestId('empty-shopping-list')).toBeVisible();
  });

  test('should show recipe details from meal planner', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // Click on a planned meal
    await page.getByTestId('planned-meal').first().click();
    
    // Recipe details dialog should open
    await expect(page.getByTestId('dialog-recipe-details')).toBeVisible();
    
    // Should show recipe information
    await expect(page.getByTestId('recipe-title')).toBeVisible();
    await expect(page.getByTestId('recipe-ingredients')).toBeVisible();
    await expect(page.getByTestId('recipe-instructions')).toBeVisible();
    await expect(page.getByTestId('recipe-nutrition')).toBeVisible();
    
    // Should have options to edit or remove from planner
    await expect(page.getByTestId('button-edit-meal')).toBeVisible();
    await expect(page.getByTestId('button-remove-meal')).toBeVisible();
  });
});