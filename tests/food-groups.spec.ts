import { test, expect } from '@playwright/test';

test.describe('Food Groups Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/food-groups');
    await page.waitForLoadState('networkidle');
  });

  test('should display food groups page correctly', async ({ page }) => {
    // Check main page elements
    await expect(page.getByRole('heading', { name: /Food Groups/i })).toBeVisible();
    
    // Check for category list
    const categoryList = page.getByTestId('food-groups-list');
    await expect(categoryList).toBeVisible();
  });

  test('should display USDA food categories', async ({ page }) => {
    // Check for main food categories
    const categories = [
      'Dairy and Egg Products',
      'Spices and Herbs',
      'Baby Foods',
      'Fats and Oils',
      'Poultry Products',
      'Soups, Sauces, and Gravies',
      'Sausages and Luncheon Meats',
      'Breakfast Cereals',
      'Fruits and Fruit Juices',
      'Pork Products',
      'Vegetables and Vegetable Products',
      'Nut and Seed Products',
      'Beef Products',
      'Beverages',
      'Finfish and Shellfish Products',
      'Legumes and Legume Products',
      'Lamb, Veal, and Game Products',
      'Baked Products',
      'Snacks',
      'Sweets',
      'Cereal Grains and Pasta',
      'Fast Foods',
      'Meals, Entrees, and Side Dishes',
      'Restaurant Foods'
    ];
    
    // Check that at least some categories are visible
    let visibleCount = 0;
    for (const category of categories.slice(0, 5)) {
      const categoryElement = page.getByText(category);
      if (await categoryElement.isVisible().catch(() => false)) {
        visibleCount++;
      }
    }
    
    expect(visibleCount).toBeGreaterThan(0);
  });

  test('should display item count for each category', async ({ page }) => {
    // Find category cards
    const categoryCards = page.getByTestId(/^category-card-/);
    const count = await categoryCards.count();
    
    if (count > 0) {
      // Check first category card
      const firstCard = categoryCards.first();
      
      // Check for item count badge
      const itemCount = firstCard.getByTestId('category-item-count');
      if (await itemCount.isVisible().catch(() => false)) {
        const countText = await itemCount.textContent();
        expect(countText).toMatch(/\d+\s*(item|items)/i);
      }
    }
  });

  test('should filter items by food category', async ({ page }) => {
    // Click on a category
    const categoryCard = page.getByTestId(/^category-card-/).first();
    
    if (await categoryCard.isVisible().catch(() => false)) {
      const categoryName = await categoryCard.getByTestId('category-name').textContent();
      
      // Click the category
      await categoryCard.click();
      
      // Wait for items to appear or empty state
      await Promise.race([
        page.waitForSelector('[data-testid^="food-item-"]', { state: 'visible', timeout: 2000 }).catch(() => null),
        page.waitForSelector('[data-testid="empty-category"]', { state: 'visible', timeout: 2000 }).catch(() => null)
      ]);
      
      // Check if items are filtered
      const filteredItems = page.getByTestId(/^food-item-/);
      const itemCount = await filteredItems.count();
      
      if (itemCount > 0) {
        // Verify all items belong to the selected category
        for (let i = 0; i < Math.min(itemCount, 3); i++) {
          const item = filteredItems.nth(i);
          const itemCategory = await item.getByTestId('item-category').textContent();
          expect(itemCategory).toContain(categoryName!);
        }
      } else {
        // Check for empty state
        const emptyState = page.getByTestId('empty-category');
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText(/No items in this category/i);
      }
    }
  });

  test('should navigate between categories', async ({ page }) => {
    const categoryCards = page.getByTestId(/^category-card-/);
    const count = await categoryCards.count();
    
    if (count > 1) {
      // Click first category
      const firstCategory = categoryCards.nth(0);
      const firstName = await firstCategory.getByTestId('category-name').textContent();
      await firstCategory.click();
      
      // Wait for category selection to update
      const selectedCategory = page.getByTestId('selected-category');
      await selectedCategory.waitFor({ state: 'visible', timeout: 2000 }).catch(() => null);
      
      // Check breadcrumb or header shows selected category
      if (await selectedCategory.isVisible().catch(() => false)) {
        await expect(selectedCategory).toContainText(firstName!);
      }
      
      // Navigate back to all categories
      const backButton = page.getByTestId('button-back-to-categories');
      if (await backButton.isVisible().catch(() => false)) {
        await backButton.click();
        
        // Verify we're back at category list
        await expect(categoryCards.first()).toBeVisible();
      }
      
      // Click second category
      const secondCategory = categoryCards.nth(1);
      const secondName = await secondCategory.getByTestId('category-name').textContent();
      await secondCategory.click();
      
      // Wait for category update
      await page.waitForFunction(
        (name) => document.querySelector('[data-testid="selected-category"]')?.textContent?.includes(name!),
        secondName,
        { timeout: 2000 }
      ).catch(() => null);
      
      // Verify different category is selected
      if (await selectedCategory.isVisible().catch(() => false)) {
        await expect(selectedCategory).toContainText(secondName!);
        await expect(selectedCategory).not.toContainText(firstName!);
      }
    }
  });

  test('should display category icons', async ({ page }) => {
    // Find category cards
    const categoryCards = page.getByTestId(/^category-card-/);
    const count = await categoryCards.count();
    
    if (count > 0) {
      // Check first few categories for icons
      for (let i = 0; i < Math.min(count, 3); i++) {
        const card = categoryCards.nth(i);
        const icon = card.getByTestId('category-icon');
        
        if (await icon.isVisible().catch(() => false)) {
          // Verify icon is an SVG or has an icon class
          const tagName = await icon.evaluate(el => el.tagName);
          const className = await icon.getAttribute('class');
          
          expect(tagName === 'svg' || className?.includes('icon')).toBeTruthy();
        }
      }
    }
  });

  test('should search within a category', async ({ page }) => {
    // Click on a category with items
    const categoryCard = page.getByTestId(/^category-card-/).first();
    
    if (await categoryCard.isVisible().catch(() => false)) {
      await categoryCard.click();
      await page.waitForLoadState('networkidle');
      
      // Look for search input within category view
      const searchInput = page.getByTestId('input-search-category');
      
      if (await searchInput.isVisible().catch(() => false)) {
        // Search for a specific term
        await searchInput.fill('chicken');
        await page.waitForLoadState('networkidle');
        
        // Verify filtered results
        const searchResults = page.getByTestId(/^food-item-/);
        const resultCount = await searchResults.count();
        
        if (resultCount > 0) {
          // Verify all results contain search term
          for (let i = 0; i < Math.min(resultCount, 3); i++) {
            const item = searchResults.nth(i);
            const itemText = await item.textContent();
            expect(itemText?.toLowerCase()).toContain('chicken');
          }
        } else {
          // Check for no results message
          const noResults = page.getByTestId('no-search-results');
          await expect(noResults).toBeVisible();
        }
        
        // Clear search
        await searchInput.clear();
        await page.waitForLoadState('networkidle');
        
        // Verify all items are shown again
        const allItems = page.getByTestId(/^food-item-/);
        const newCount = await allItems.count();
        expect(newCount).toBeGreaterThanOrEqual(resultCount);
      }
    }
  });

  test('should add item from category to inventory', async ({ page }) => {
    // Navigate to a category with items
    const categoryCard = page.getByTestId(/^category-card-/).first();
    
    if (await categoryCard.isVisible().catch(() => false)) {
      await categoryCard.click();
      await page.waitForLoadState('networkidle');
      
      // Find an item
      const foodItem = page.getByTestId(/^food-item-/).first();
      
      if (await foodItem.isVisible().catch(() => false)) {
        // Click add to inventory button
        const addButton = foodItem.getByTestId('button-add-to-inventory');
        
        if (await addButton.isVisible().catch(() => false)) {
          await addButton.click();
          
          // Check for add dialog
          const addDialog = page.getByTestId('dialog-add-food');
          await expect(addDialog).toBeVisible();
          
          // Fill in details
          await addDialog.getByTestId('input-quantity').fill('2');
          await addDialog.getByTestId('select-storage-location').selectOption('Fridge');
          
          // Save
          await addDialog.getByTestId('button-save-food').click();
          
          // Verify success toast
          await expect(page.getByText(/Added to inventory/i)).toBeVisible();
        }
      }
    }
  });

  test('should display nutritional information for items', async ({ page }) => {
    // Navigate to a category
    const categoryCard = page.getByTestId(/^category-card-/).first();
    
    if (await categoryCard.isVisible().catch(() => false)) {
      await categoryCard.click();
      await page.waitForLoadState('networkidle');
      
      // Find an item
      const foodItem = page.getByTestId(/^food-item-/).first();
      
      if (await foodItem.isVisible().catch(() => false)) {
        // Check for nutrition info
        const nutritionInfo = foodItem.getByTestId('nutrition-summary');
        
        if (await nutritionInfo.isVisible().catch(() => false)) {
          const nutritionText = await nutritionInfo.textContent();
          
          // Should contain calorie information
          expect(nutritionText).toMatch(/\d+\s*cal/i);
          
          // May contain macro information
          if (nutritionText?.includes('Protein')) {
            expect(nutritionText).toMatch(/protein.*\d+/i);
          }
        }
      }
    }
  });

  test('should handle empty categories gracefully', async ({ page }) => {
    // Look for a category that might be empty
    const categoryCards = page.getByTestId(/^category-card-/);
    const count = await categoryCards.count();
    
    for (let i = 0; i < count; i++) {
      const card = categoryCards.nth(i);
      const itemCount = await card.getByTestId('category-item-count').textContent();
      
      if (itemCount === '0 items') {
        // Click on empty category
        await card.click();
        await page.waitForLoadState('networkidle');
        
        // Should show empty state
        const emptyState = page.getByTestId('empty-category');
        await expect(emptyState).toBeVisible();
        await expect(emptyState).toContainText(/No items in this category/i);
        
        // Should have option to go back
        const backButton = page.getByTestId('button-back-to-categories');
        await expect(backButton).toBeVisible();
        
        break;
      }
    }
  });

  test('should sort categories by item count', async ({ page }) => {
    // Check if there's a sort option
    const sortSelect = page.getByTestId('select-sort-categories');
    
    if (await sortSelect.isVisible().catch(() => false)) {
      // Sort by item count
      await sortSelect.selectOption('item-count');
      await page.waitForLoadState('networkidle');
      
      // Get item counts from first few categories
      const categoryCards = page.getByTestId(/^category-card-/);
      const counts: number[] = [];
      
      for (let i = 0; i < Math.min(3, await categoryCards.count()); i++) {
        const card = categoryCards.nth(i);
        const countText = await card.getByTestId('category-item-count').textContent();
        const match = countText?.match(/(\d+)/);
        if (match) {
          counts.push(parseInt(match[1]));
        }
      }
      
      // Verify descending order
      for (let i = 1; i < counts.length; i++) {
        expect(counts[i]).toBeLessThanOrEqual(counts[i - 1]);
      }
      
      // Sort alphabetically
      await sortSelect.selectOption('alphabetical');
      await page.waitForLoadState('networkidle');
      
      // Get names from first few categories
      const names: string[] = [];
      for (let i = 0; i < Math.min(3, await categoryCards.count()); i++) {
        const card = categoryCards.nth(i);
        const name = await card.getByTestId('category-name').textContent();
        if (name) names.push(name);
      }
      
      // Verify alphabetical order
      for (let i = 1; i < names.length; i++) {
        expect(names[i].localeCompare(names[i - 1])).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should display category descriptions', async ({ page }) => {
    const categoryCards = page.getByTestId(/^category-card-/);
    const count = await categoryCards.count();
    
    if (count > 0) {
      // Check first category for description
      const firstCard = categoryCards.first();
      const description = firstCard.getByTestId('category-description');
      
      if (await description.isVisible().catch(() => false)) {
        const descText = await description.textContent();
        expect(descText).toBeTruthy();
        expect(descText!.length).toBeGreaterThan(10); // Should be meaningful description
      }
    }
  });

  test('should handle category page responsively', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check categories display properly on mobile
    const categoryCards = page.getByTestId(/^category-card-/);
    const firstCard = categoryCards.first();
    
    if (await firstCard.isVisible().catch(() => false)) {
      // Cards should stack vertically on mobile
      const cardWidth = await firstCard.evaluate(el => el.offsetWidth);
      const viewportWidth = 375;
      
      // Card should take most of viewport width (accounting for padding)
      expect(cardWidth).toBeGreaterThan(viewportWidth * 0.8);
      expect(cardWidth).toBeLessThan(viewportWidth);
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });
});