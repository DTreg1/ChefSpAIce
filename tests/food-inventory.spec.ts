import { test, expect } from '@playwright/test';

test.describe('Food Inventory Management', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to storage page
    await page.goto('/storage/refrigerator');
  });

  test('should display storage locations', async ({ page }) => {
    // Check storage location tabs/buttons
    await expect(page.getByTestId('storage-tab-refrigerator')).toBeVisible();
    await expect(page.getByTestId('storage-tab-freezer')).toBeVisible();
    await expect(page.getByTestId('storage-tab-pantry')).toBeVisible();
    await expect(page.getByTestId('storage-tab-counter')).toBeVisible();
  });

  test('should add a new food item', async ({ page }) => {
    // Open add food dialog
    await page.getByTestId('button-add-food').click();
    
    // Fill in food item details
    await page.getByTestId('input-food-name').fill('Chicken Breast');
    await page.getByTestId('input-food-quantity').fill('2');
    await page.getByTestId('select-food-unit').selectOption('pounds');
    await page.getByTestId('select-storage-location').selectOption('refrigerator');
    
    // Set expiration date (7 days from now)
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 7);
    await page.getByTestId('input-expiration-date').fill(futureDate.toISOString().split('T')[0]);
    
    // Select food category
    await page.getByTestId('select-food-category').selectOption('Poultry Products');
    
    // Save the item
    await page.getByTestId('button-save-food').click();
    
    // Verify item appears in the list
    await expect(page.getByText('Chicken Breast')).toBeVisible();
    await expect(page.getByText('2 pounds')).toBeVisible();
    await expect(page.getByTestId('expiration-indicator')).toBeVisible();
  });

  test('should edit an existing food item', async ({ page }) => {
    // Assume there's at least one food item
    // Click on the first food card
    await page.getByTestId(/^food-card-/).first().click();
    
    // Click edit button
    await page.getByTestId('button-edit-food').click();
    
    // Update quantity
    await page.getByTestId('input-food-quantity').fill('3');
    
    // Save changes
    await page.getByTestId('button-save-food').click();
    
    // Verify the update
    await expect(page.getByText('3 pounds')).toBeVisible();
  });

  test('should delete a food item', async ({ page }) => {
    // Get the first food item's name
    const foodCard = page.getByTestId(/^food-card-/).first();
    const foodName = await foodCard.getByTestId('food-name').textContent();
    
    // Click on the food card
    await foodCard.click();
    
    // Click delete button
    await page.getByTestId('button-delete-food').click();
    
    // Confirm deletion
    await page.getByTestId('button-confirm-delete').click();
    
    // Verify item is removed
    await expect(page.getByText(foodName!)).not.toBeVisible();
  });

  test('should show expiration alerts', async ({ page }) => {
    // Navigate to home/chat page where alerts are shown
    await page.goto('/');
    
    // Check if expiration alert component is visible
    const expirationAlert = page.getByTestId('expiration-alert');
    
    if (await expirationAlert.isVisible()) {
      // Verify alert content
      await expect(expirationAlert).toContainText('expiring soon');
      
      // Click on the alert to see details
      await expirationAlert.click();
      
      // Should show expiring items dialog
      await expect(page.getByTestId('dialog-expiring-items')).toBeVisible();
      await expect(page.getByTestId('expiring-items-list')).toBeVisible();
    }
  });

  test('should filter items by storage location', async ({ page }) => {
    // Click on freezer tab
    await page.getByTestId('storage-tab-freezer').click();
    await page.waitForURL('**/storage/freezer');
    
    // Verify URL changed
    expect(page.url()).toContain('/storage/freezer');
    
    // Verify only freezer items are shown
    const storageTitle = await page.getByTestId('storage-location-title').textContent();
    expect(storageTitle).toContain('Freezer');
  });

  test('should filter items by food group', async ({ page }) => {
    // Navigate to food groups page
    await page.goto('/food-groups');
    
    // Click on a specific food group
    await page.getByTestId('food-group-dairy').click();
    
    // Verify URL changed
    await page.waitForURL('**/food-groups/Dairy*');
    
    // Verify only dairy items are shown
    const categoryTitle = await page.getByTestId('food-group-title').textContent();
    expect(categoryTitle).toContain('Dairy');
  });

  test('should search for food items', async ({ page }) => {
    // Use the search input in the header or food page
    await page.getByTestId('input-search-food').fill('milk');
    await page.keyboard.press('Enter');
    
    // Verify search results
    const results = page.getByTestId(/^food-card-/);
    const count = await results.count();
    
    // All visible items should contain "milk" in their name
    for (let i = 0; i < count; i++) {
      const foodName = await results.nth(i).getByTestId('food-name').textContent();
      expect(foodName?.toLowerCase()).toContain('milk');
    }
  });

  test('should bulk add items from shopping receipt', async ({ page }) => {
    // Open bulk add dialog
    await page.getByTestId('button-bulk-add').click();
    
    // Paste receipt text
    const receiptText = `
      Milk 1 gallon
      Eggs 12 count
      Bread 1 loaf
      Chicken 2 lbs
      Apples 6 count
    `;
    await page.getByTestId('textarea-receipt').fill(receiptText);
    
    // Process receipt
    await page.getByTestId('button-process-receipt').click();
    
    // Verify parsed items
    await expect(page.getByText('Milk (1 gallon)')).toBeVisible();
    await expect(page.getByText('Eggs (12 count)')).toBeVisible();
    await expect(page.getByText('Bread (1 loaf)')).toBeVisible();
    await expect(page.getByText('Chicken (2 lbs)')).toBeVisible();
    await expect(page.getByText('Apples (6 count)')).toBeVisible();
    
    // Confirm bulk add
    await page.getByTestId('button-confirm-bulk-add').click();
    
    // Verify items were added
    await expect(page.getByText('5 items added successfully')).toBeVisible();
  });
});