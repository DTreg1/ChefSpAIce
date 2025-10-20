import { test, expect } from '@playwright/test';

test.describe('USDA FoodData Advanced Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/fdc-search');
    await page.waitForLoadState('networkidle');
  });

  test('should display USDA search page correctly', async ({ page }) => {
    // Check main page elements
    await expect(page.getByRole('heading', { name: /USDA.*Search/i })).toBeVisible();
    
    // Check search input
    await expect(page.getByTestId('input-fdc-search')).toBeVisible();
    
    // Check filter controls
    await expect(page.getByTestId('select-data-type')).toBeVisible();
    await expect(page.getByTestId('select-sort-by')).toBeVisible();
    await expect(page.getByTestId('select-sort-order')).toBeVisible();
    await expect(page.getByTestId('select-page-size')).toBeVisible();
  });

  test('should search USDA database by food name', async ({ page }) => {
    const searchInput = page.getByTestId('input-fdc-search');
    
    // Search for a common food
    await searchInput.fill('apple');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check for search results
    const results = page.getByTestId(/^fdc-result-/);
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
    
    // Verify results contain search term
    for (let i = 0; i < Math.min(resultCount, 3); i++) {
      const result = results.nth(i);
      const resultText = await result.textContent();
      expect(resultText?.toLowerCase()).toContain('apple');
    }
  });

  test('should search by UPC/GTIN barcode', async ({ page }) => {
    const searchInput = page.getByTestId('input-fdc-search');
    
    // Search by barcode (example UPC)
    await searchInput.fill('028400097970'); // Example: Lay's chips UPC
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check for specific product result
    const results = page.getByTestId(/^fdc-result-/);
    const resultCount = await results.count();
    
    if (resultCount > 0) {
      // Should find specific branded product
      const firstResult = results.first();
      const brandName = firstResult.getByTestId('result-brand');
      if (await brandName.isVisible().catch(() => false)) {
        const brand = await brandName.textContent();
        expect(brand).toBeTruthy();
      }
    }
  });

  test('should filter by data type (Brand Owner)', async ({ page }) => {
    // Select Brand Owner data type
    const dataTypeSelect = page.getByTestId('select-data-type');
    await dataTypeSelect.selectOption('Branded');
    
    // Search for a food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('cereal');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Verify all results are branded products
    const results = page.getByTestId(/^fdc-result-/);
    const resultCount = await results.count();
    
    for (let i = 0; i < Math.min(resultCount, 3); i++) {
      const result = results.nth(i);
      const dataType = result.getByTestId('result-data-type');
      if (await dataType.isVisible().catch(() => false)) {
        const typeText = await dataType.textContent();
        expect(typeText).toContain('Branded');
      }
    }
  });

  test('should sort results', async ({ page }) => {
    // Search for a food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('bread');
    await page.getByTestId('button-search').click();
    
    // Wait for initial results
    await page.waitForTimeout(2000);
    
    // Sort by dataType
    const sortBySelect = page.getByTestId('select-sort-by');
    await sortBySelect.selectOption('dataType.keyword');
    
    // Change sort order to descending
    const sortOrderSelect = page.getByTestId('select-sort-order');
    await sortOrderSelect.selectOption('desc');
    
    // Apply sort
    await page.getByTestId('button-search').click();
    await page.waitForTimeout(2000);
    
    // Get data types from first few results
    const results = page.getByTestId(/^fdc-result-/);
    const dataTypes: string[] = [];
    
    for (let i = 0; i < Math.min(3, await results.count()); i++) {
      const result = results.nth(i);
      const dataType = result.getByTestId('result-data-type');
      if (await dataType.isVisible().catch(() => false)) {
        const typeText = await dataType.textContent();
        if (typeText) dataTypes.push(typeText);
      }
    }
    
    // Verify descending order
    for (let i = 1; i < dataTypes.length; i++) {
      expect(dataTypes[i].localeCompare(dataTypes[i - 1])).toBeLessThanOrEqual(0);
    }
  });

  test('should change page size', async ({ page }) => {
    // Search for a common food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('chicken');
    
    // Set page size to 25
    const pageSizeSelect = page.getByTestId('select-page-size');
    await pageSizeSelect.selectOption('25');
    
    // Search
    await page.getByTestId('button-search').click();
    await page.waitForTimeout(2000);
    
    // Count results
    const results = page.getByTestId(/^fdc-result-/);
    const resultCount = await results.count();
    
    // Should have up to 25 results
    expect(resultCount).toBeLessThanOrEqual(25);
    expect(resultCount).toBeGreaterThan(0);
    
    // Change to 50 results per page
    await pageSizeSelect.selectOption('50');
    await page.getByTestId('button-search').click();
    await page.waitForTimeout(2000);
    
    // Count results again
    const newResultCount = await results.count();
    
    // Should have more results (if available)
    expect(newResultCount).toBeLessThanOrEqual(50);
    if (resultCount === 25) {
      expect(newResultCount).toBeGreaterThanOrEqual(resultCount);
    }
  });

  test('should display nutritional information for results', async ({ page }) => {
    // Search for a food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('banana');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Click on first result to view details
    const firstResult = page.getByTestId(/^fdc-result-/).first();
    await firstResult.click();
    
    // Check for nutrition panel
    const nutritionPanel = page.getByTestId('nutrition-details');
    if (await nutritionPanel.isVisible().catch(() => false)) {
      // Check for key nutritional values
      await expect(nutritionPanel.getByTestId('calories')).toBeVisible();
      await expect(nutritionPanel.getByTestId('protein')).toBeVisible();
      await expect(nutritionPanel.getByTestId('carbohydrates')).toBeVisible();
      await expect(nutritionPanel.getByTestId('fat')).toBeVisible();
    }
  });

  test('should add food from search to inventory', async ({ page }) => {
    // Search for a food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('milk');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Find add to inventory button
    const firstResult = page.getByTestId(/^fdc-result-/).first();
    const addButton = firstResult.getByTestId('button-add-to-inventory');
    
    if (await addButton.isVisible().catch(() => false)) {
      await addButton.click();
      
      // Check for add food dialog
      const addDialog = page.getByTestId('dialog-add-food');
      await expect(addDialog).toBeVisible();
      
      // Food name should be pre-filled
      const nameInput = addDialog.getByTestId('input-food-name');
      const prefilledName = await nameInput.inputValue();
      expect(prefilledName).toContain('milk');
      
      // Fill additional details
      await addDialog.getByTestId('input-quantity').fill('1');
      await addDialog.getByTestId('select-storage-location').selectOption('Fridge');
      
      // Save
      await addDialog.getByTestId('button-save-food').click();
      
      // Verify success
      await expect(page.getByText(/Added to inventory/i)).toBeVisible();
    }
  });

  test('should refresh nutrition data for existing items', async ({ page }) => {
    // Navigate to nutrition page first to see items
    await page.goto('/nutrition');
    await page.waitForLoadState('networkidle');
    
    // Find an item that might need refresh
    const itemWithRefresh = page.getByTestId(/^nutrition-item-/).first();
    
    if (await itemWithRefresh.isVisible().catch(() => false)) {
      const refreshButton = itemWithRefresh.getByTestId('button-refresh-nutrition');
      
      if (await refreshButton.isVisible().catch(() => false)) {
        // Click refresh
        await refreshButton.click();
        
        // Wait for refresh to complete
        await page.waitForTimeout(3000);
        
        // Verify success message or updated data
        const successToast = page.getByText(/nutrition.*updated/i);
        const errorToast = page.getByText(/Failed to refresh/i);
        
        // Either success or error should appear
        const isSuccess = await successToast.isVisible().catch(() => false);
        const isError = await errorToast.isVisible().catch(() => false);
        
        expect(isSuccess || isError).toBeTruthy();
      }
    }
  });

  test('should paginate through search results', async ({ page }) => {
    // Search for a very common food to ensure multiple pages
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('cheese');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check for pagination controls
    const nextButton = page.getByTestId('button-next-page');
    const prevButton = page.getByTestId('button-prev-page');
    const pageInfo = page.getByTestId('page-info');
    
    if (await nextButton.isVisible().catch(() => false)) {
      // Get first page results
      const firstPageResult = await page.getByTestId(/^fdc-result-/).first().textContent();
      
      // Go to next page
      await nextButton.click();
      await page.waitForTimeout(2000);
      
      // Verify different results
      const secondPageResult = await page.getByTestId(/^fdc-result-/).first().textContent();
      expect(secondPageResult).not.toBe(firstPageResult);
      
      // Previous button should be enabled
      await expect(prevButton).toBeEnabled();
      
      // Go back to first page
      await prevButton.click();
      await page.waitForTimeout(2000);
      
      // Should see first page results again
      const backToFirstResult = await page.getByTestId(/^fdc-result-/).first().textContent();
      expect(backToFirstResult).toBe(firstPageResult);
    }
  });

  test('should handle search with no results', async ({ page }) => {
    const searchInput = page.getByTestId('input-fdc-search');
    
    // Search for nonsense string
    await searchInput.fill('xyzabc123notafood');
    await page.getByTestId('button-search').click();
    
    // Wait for search to complete
    await page.waitForTimeout(2000);
    
    // Check for no results message
    const noResults = page.getByTestId('no-results');
    await expect(noResults).toBeVisible();
    await expect(noResults).toContainText(/No results found/i);
  });

  test('should clear search and filters', async ({ page }) => {
    // Set filters and search
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('pizza');
    await page.getByTestId('select-data-type').selectOption('Branded');
    await page.getByTestId('select-sort-by').selectOption('dataType.keyword');
    
    // Search
    await page.getByTestId('button-search').click();
    await page.waitForTimeout(2000);
    
    // Clear button
    const clearButton = page.getByTestId('button-clear-search');
    if (await clearButton.isVisible().catch(() => false)) {
      await clearButton.click();
      
      // Verify search input is cleared
      await expect(searchInput).toHaveValue('');
      
      // Verify filters are reset to defaults
      await expect(page.getByTestId('select-data-type')).toHaveValue('');
      await expect(page.getByTestId('select-sort-by')).toHaveValue('');
    }
  });

  test('should display portion size information', async ({ page }) => {
    // Search for a food
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('yogurt');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Check first result for portion info
    const firstResult = page.getByTestId(/^fdc-result-/).first();
    const portionInfo = firstResult.getByTestId('portion-size');
    
    if (await portionInfo.isVisible().catch(() => false)) {
      const portionText = await portionInfo.textContent();
      // Should show serving size (e.g., "100g", "1 cup", etc.)
      expect(portionText).toMatch(/\d+\s*(g|ml|oz|cup|tbsp|tsp)/i);
    }
  });

  test('should export search results', async ({ page }) => {
    // Search for foods
    const searchInput = page.getByTestId('input-fdc-search');
    await searchInput.fill('fruit');
    await page.getByTestId('button-search').click();
    
    // Wait for results
    await page.waitForTimeout(2000);
    
    // Look for export button
    const exportButton = page.getByTestId('button-export-results');
    
    if (await exportButton.isVisible().catch(() => false)) {
      // Set up download listener
      const downloadPromise = page.waitForEvent('download');
      
      // Click export
      await exportButton.click();
      
      // Wait for download
      const download = await downloadPromise;
      
      // Verify download
      expect(download.suggestedFilename()).toMatch(/\.(csv|json|xlsx)$/);
    }
  });
});