import { test, expect } from '@playwright/test';

test.describe('Nutrition Features', () => {
  test('should display nutrition dashboard', async ({ page }) => {
    await page.goto('/nutrition');
    
    // Check main elements
    await expect(page.getByTestId('nutrition-dashboard')).toBeVisible();
    await expect(page.getByTestId('daily-summary')).toBeVisible();
    await expect(page.getByTestId('macro-breakdown')).toBeVisible();
    await expect(page.getByTestId('micro-nutrients')).toBeVisible();
  });

  test('should show nutritional facts for food items', async ({ page }) => {
    await page.goto('/storage/refrigerator');
    
    // Click on a food item
    await page.getByTestId(/^food-card-/).first().click();
    
    // View nutrition info
    await page.getByTestId('button-view-nutrition').click();
    
    // Nutrition facts label should be visible
    await expect(page.getByTestId('nutrition-facts-label')).toBeVisible();
    
    // Check for standard nutrition elements
    await expect(page.getByTestId('calories')).toBeVisible();
    await expect(page.getByTestId('total-fat')).toBeVisible();
    await expect(page.getByTestId('protein')).toBeVisible();
    await expect(page.getByTestId('carbohydrates')).toBeVisible();
    await expect(page.getByTestId('fiber')).toBeVisible();
    await expect(page.getByTestId('sugar')).toBeVisible();
    await expect(page.getByTestId('sodium')).toBeVisible();
  });

  test('should search USDA FoodData Central', async ({ page }) => {
    await page.goto('/fdc-search');
    
    // Search for a food
    await page.getByTestId('input-fdc-search').fill('apple');
    await page.getByTestId('button-search-fdc').click();
    
    // Wait for results
    await expect(page.getByTestId('fdc-results')).toBeVisible({ timeout: 15000 });
    
    // Should show search results
    const resultCount = await page.getByTestId('fdc-result-item').count();
    expect(resultCount).toBeGreaterThanOrEqual(1);
    
    // Each result should have details
    const firstResult = page.getByTestId('fdc-result-item').first();
    await expect(firstResult.getByTestId('food-description')).toBeVisible();
    await expect(firstResult.getByTestId('food-category')).toBeVisible();
    await expect(firstResult.getByTestId('button-view-details')).toBeVisible();
  });

  test('should add USDA food to inventory', async ({ page }) => {
    await page.goto('/fdc-search');
    
    // Search and select a food
    await page.getByTestId('input-fdc-search').fill('banana');
    await page.getByTestId('button-search-fdc').click();
    await expect(page.getByTestId('fdc-results')).toBeVisible({ timeout: 15000 });
    
    // Add first result to inventory
    await page.getByTestId('button-add-to-inventory').first().click();
    
    // Should open add food dialog with pre-filled data
    await expect(page.getByTestId('dialog-add-food')).toBeVisible();
    await expect(page.getByTestId('input-food-name')).toHaveValue(/banana/i);
    
    // Set quantity and location
    await page.getByTestId('input-food-quantity').fill('6');
    await page.getByTestId('select-food-unit').selectOption('count');
    await page.getByTestId('select-storage-location').selectOption('counter');
    
    // Save
    await page.getByTestId('button-save-food').click();
    
    // Verify success
    await expect(page.getByText('Added to inventory')).toBeVisible();
  });

  test('should display aggregated nutrition for meal plan', async ({ page }) => {
    await page.goto('/meal-planner');
    
    // View nutrition summary for the week
    await page.getByTestId('button-view-week-nutrition').click();
    
    // Should show nutrition breakdown
    await expect(page.getByTestId('weekly-nutrition-summary')).toBeVisible();
    
    // Daily averages
    await expect(page.getByTestId('avg-calories')).toBeVisible();
    await expect(page.getByTestId('avg-protein')).toBeVisible();
    await expect(page.getByTestId('avg-carbs')).toBeVisible();
    await expect(page.getByTestId('avg-fat')).toBeVisible();
    
    // Nutritional goals comparison
    await expect(page.getByTestId('nutrition-goals')).toBeVisible();
    await expect(page.getByTestId('goals-progress')).toBeVisible();
  });

  test('should toggle between metric and imperial units', async ({ page }) => {
    await page.goto('/nutrition');
    
    // Default should be one unit system
    const initialUnit = await page.getByTestId('unit-display').textContent();
    
    // Toggle units
    await page.getByTestId('button-toggle-units').click();
    
    // Units should change
    const newUnit = await page.getByTestId('unit-display').textContent();
    expect(newUnit).not.toBe(initialUnit);
    
    // Values should be converted
    const weight = page.getByTestId('weight-value').first();
    if (await weight.isVisible()) {
      const weightText = await weight.textContent();
      if (initialUnit?.includes('g')) {
        expect(weightText).toMatch(/oz|lb/);
      } else {
        expect(weightText).toMatch(/g|kg/);
      }
    }
  });

  test('should set and track nutritional goals', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to nutrition goals
    await page.getByTestId('tab-nutrition-goals').click();
    
    // Set daily goals
    await page.getByTestId('input-goal-calories').fill('2000');
    await page.getByTestId('input-goal-protein').fill('50');
    await page.getByTestId('input-goal-carbs').fill('300');
    await page.getByTestId('input-goal-fat').fill('65');
    await page.getByTestId('input-goal-fiber').fill('25');
    
    // Save goals
    await page.getByTestId('button-save-goals').click();
    
    // Verify saved
    await expect(page.getByText('Goals updated')).toBeVisible();
    
    // Navigate to nutrition dashboard
    await page.goto('/nutrition');
    
    // Goals should be reflected in progress tracking
    await expect(page.getByTestId('goal-calories')).toContainText('2000');
    await expect(page.getByTestId('progress-bar-calories')).toBeVisible();
  });

  test('should show nutrition trends over time', async ({ page }) => {
    await page.goto('/nutrition');
    
    // View trends
    await page.getByTestId('tab-trends').click();
    
    // Should show charts
    await expect(page.getByTestId('chart-calories-trend')).toBeVisible();
    await expect(page.getByTestId('chart-macros-trend')).toBeVisible();
    
    // Time range selector
    await expect(page.getByTestId('select-time-range')).toBeVisible();
    
    // Change time range
    await page.getByTestId('select-time-range').selectOption('month');
    
    // Charts should update
    await expect(page.getByTestId('chart-calories-trend')).toHaveAttribute('data-range', 'month');
  });

  test('should export nutrition report', async ({ page }) => {
    await page.goto('/nutrition');
    
    // Click export
    const downloadPromise = page.waitForEvent('download');
    await page.getByTestId('button-export-nutrition').click();
    
    // Select format and date range
    await page.getByTestId('select-export-format').selectOption('csv');
    await page.getByTestId('input-date-from').fill('2024-01-01');
    await page.getByTestId('input-date-to').fill('2024-01-31');
    
    // Export
    await page.getByTestId('button-confirm-export').click();
    
    // Verify download
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toContain('nutrition');
    expect(download.suggestedFilename()).toContain('.csv');
  });
});