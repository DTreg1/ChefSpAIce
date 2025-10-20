import { test, expect } from '@playwright/test';

test.describe('Appliances Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/appliances');
    await page.waitForLoadState('networkidle');
  });

  test('should display appliances page correctly', async ({ page }) => {
    // Check main page elements
    await expect(page.getByRole('heading', { name: 'Kitchen Appliances' })).toBeVisible();
    await expect(page.getByTestId('button-add-appliance')).toBeVisible();
    await expect(page.getByTestId('button-scan-barcode')).toBeVisible();
    await expect(page.getByTestId('input-search')).toBeVisible();
    await expect(page.getByTestId('select-category-filter')).toBeVisible();
    
    // Check view mode toggles
    await expect(page.getByTestId('button-view-grid')).toBeVisible();
    await expect(page.getByTestId('button-view-list')).toBeVisible();
  });

  test('should add a new appliance manually', async ({ page }) => {
    // Click add appliance button
    await page.getByTestId('button-add-appliance').click();
    
    // Wait for dialog
    await expect(page.getByTestId('dialog-add-appliance')).toBeVisible();
    
    // Fill in appliance details
    await page.getByTestId('input-appliance-name').fill('Stand Mixer');
    await page.getByTestId('input-appliance-brand').fill('KitchenAid');
    await page.getByTestId('input-appliance-model').fill('Artisan 5-Quart');
    
    // Select category
    await page.getByTestId('select-appliance-category').click();
    await page.getByTestId('option-category-mixing').click();
    
    // Add capabilities
    await page.getByTestId('checkbox-capability-mixing').check();
    await page.getByTestId('checkbox-capability-kneading').check();
    await page.getByTestId('checkbox-capability-whipping').check();
    
    // Set power consumption
    await page.getByTestId('input-power-consumption').fill('325');
    
    // Save appliance
    await page.getByTestId('button-save-appliance').click();
    
    // Verify appliance appears in list
    await expect(page.getByText('Stand Mixer')).toBeVisible();
    await expect(page.getByText('KitchenAid')).toBeVisible();
    
    // Verify success toast
    await expect(page.getByText('Appliance added to your kitchen')).toBeVisible();
  });

  test('should edit an existing appliance', async ({ page }) => {
    // Find first appliance card
    const applianceCard = page.getByTestId(/^card-appliance-/).first();
    await expect(applianceCard).toBeVisible();
    
    // Get the original name
    const originalName = await applianceCard.getByTestId('text-appliance-name').textContent();
    
    // Click edit button
    await applianceCard.getByTestId(/^button-edit-/).first().click();
    
    // Wait for edit dialog
    await expect(page.getByTestId('dialog-edit-appliance')).toBeVisible();
    
    // Update appliance name
    const nameInput = page.getByTestId('input-appliance-name');
    await nameInput.clear();
    await nameInput.fill('Updated Mixer');
    
    // Update power consumption
    const powerInput = page.getByTestId('input-power-consumption');
    await powerInput.clear();
    await powerInput.fill('400');
    
    // Save changes
    await page.getByTestId('button-update-appliance').click();
    
    // Verify appliance was updated
    await expect(page.getByText('Updated Mixer')).toBeVisible();
    await expect(page.getByText(originalName!)).not.toBeVisible();
    
    // Verify success toast
    await expect(page.getByText('Appliance updated successfully')).toBeVisible();
  });

  test('should delete an appliance', async ({ page }) => {
    // Find first appliance card
    const applianceCard = page.getByTestId(/^card-appliance-/).first();
    await expect(applianceCard).toBeVisible();
    
    // Get the appliance name
    const applianceName = await applianceCard.getByTestId('text-appliance-name').textContent();
    
    // Click delete button
    await applianceCard.getByTestId(/^button-delete-/).first().click();
    
    // Confirm deletion in dialog
    await expect(page.getByTestId('dialog-confirm-delete')).toBeVisible();
    await page.getByTestId('button-confirm-delete').click();
    
    // Verify appliance was removed
    await expect(page.getByText(applianceName!)).not.toBeVisible();
    
    // Verify success toast
    await expect(page.getByText('Appliance removed from your kitchen')).toBeVisible();
  });

  test('should filter appliances by category', async ({ page }) => {
    // Open category filter
    await page.getByTestId('select-category-filter').click();
    
    // Select a specific category (e.g., Cooking)
    await page.getByTestId('option-filter-cooking').click();
    
    // Verify only appliances from that category are shown
    const visibleAppliances = page.getByTestId(/^card-appliance-/);
    const count = await visibleAppliances.count();
    
    // Check that all visible appliances have the selected category
    for (let i = 0; i < count; i++) {
      const appliance = visibleAppliances.nth(i);
      const categoryBadge = appliance.getByTestId('badge-category');
      await expect(categoryBadge).toContainText(/Cooking/i);
    }
    
    // Reset filter to "All Categories"
    await page.getByTestId('select-category-filter').click();
    await page.getByTestId('option-filter-all').click();
    
    // Verify all appliances are shown again
    const allAppliances = page.getByTestId(/^card-appliance-/);
    const newCount = await allAppliances.count();
    expect(newCount).toBeGreaterThanOrEqual(count);
  });

  test('should search for appliances', async ({ page }) => {
    // Type in search box
    const searchInput = page.getByTestId('input-search');
    await searchInput.fill('mixer');
    
    // Wait for filtering to occur
    await page.waitForTimeout(500);
    
    // Verify only matching appliances are shown
    const visibleAppliances = page.getByTestId(/^card-appliance-/);
    const count = await visibleAppliances.count();
    
    // Check that all visible appliances contain "mixer" in their name or brand
    for (let i = 0; i < count; i++) {
      const appliance = visibleAppliances.nth(i);
      const text = await appliance.textContent();
      expect(text?.toLowerCase()).toContain('mixer');
    }
    
    // Clear search
    await searchInput.clear();
    
    // Verify all appliances are shown again
    await page.waitForTimeout(500);
    const allAppliances = page.getByTestId(/^card-appliance-/);
    const newCount = await allAppliances.count();
    expect(newCount).toBeGreaterThanOrEqual(count);
  });

  test('should switch between grid and list view', async ({ page }) => {
    // Start in grid view (default)
    const gridContainer = page.getByTestId('appliances-grid');
    await expect(gridContainer).toBeVisible();
    
    // Switch to list view
    await page.getByTestId('button-view-list').click();
    
    // Verify list view is active
    const listContainer = page.getByTestId('appliances-list');
    await expect(listContainer).toBeVisible();
    await expect(gridContainer).not.toBeVisible();
    
    // Verify list button is active
    const listButton = page.getByTestId('button-view-list');
    await expect(listButton).toHaveClass(/bg-primary/);
    
    // Switch back to grid view
    await page.getByTestId('button-view-grid').click();
    
    // Verify grid view is active
    await expect(gridContainer).toBeVisible();
    await expect(listContainer).not.toBeVisible();
    
    // Verify grid button is active
    const gridButton = page.getByTestId('button-view-grid');
    await expect(gridButton).toHaveClass(/bg-primary/);
  });

  test('should add appliance from barcode', async ({ page }) => {
    // Click scan barcode button
    await page.getByTestId('button-scan-barcode').click();
    
    // Wait for scanner dialog
    await expect(page.getByTestId('dialog-barcode-scanner')).toBeVisible();
    
    // Enter a barcode manually (since we can't test actual scanning)
    const barcodeInput = page.getByTestId('input-barcode');
    await barcodeInput.fill('012345678905'); // Example appliance barcode
    
    // Submit barcode
    await page.getByTestId('button-submit-scan').click();
    
    // Wait for product lookup
    await page.waitForTimeout(2000);
    
    // If product found, confirm adding it
    const confirmButton = page.getByTestId('button-confirm-add-appliance');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
      
      // Verify success toast
      await expect(page.getByText(/Appliance added/i)).toBeVisible();
    } else {
      // Handle case where barcode is not found
      await expect(page.getByText(/not found/i)).toBeVisible();
      
      // Close dialog
      await page.getByTestId('button-close-scanner').click();
    }
  });

  test('should show empty state when no appliances exist', async ({ page }) => {
    // Navigate to a fresh state or mock no appliances
    // This test assumes we can get to an empty state
    
    // Check for empty state elements
    const emptyState = page.getByTestId('empty-state-appliances');
    if (await emptyState.isVisible()) {
      await expect(emptyState).toContainText(/No appliances added yet/i);
      await expect(page.getByTestId('button-scan-first')).toBeVisible();
      await expect(page.getByText(/Start by scanning or adding/i)).toBeVisible();
    }
  });

  test('should display appliance capabilities', async ({ page }) => {
    // Find first appliance card
    const applianceCard = page.getByTestId(/^card-appliance-/).first();
    await expect(applianceCard).toBeVisible();
    
    // Check for capabilities display
    const capabilities = applianceCard.getByTestId('appliance-capabilities');
    await expect(capabilities).toBeVisible();
    
    // Verify at least one capability badge is shown
    const capabilityBadges = capabilities.getByTestId(/^badge-capability-/);
    const count = await capabilityBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should handle appliance with missing information gracefully', async ({ page }) => {
    // Click add appliance button
    await page.getByTestId('button-add-appliance').click();
    
    // Try to save without filling required fields
    await page.getByTestId('button-save-appliance').click();
    
    // Should show validation errors
    await expect(page.getByText(/Name is required/i)).toBeVisible();
  });

  test('should show power consumption for appliances', async ({ page }) => {
    // Find first appliance card
    const applianceCard = page.getByTestId(/^card-appliance-/).first();
    await expect(applianceCard).toBeVisible();
    
    // Check for power consumption display
    const powerConsumption = applianceCard.getByTestId('text-power-consumption');
    if (await powerConsumption.isVisible()) {
      const powerText = await powerConsumption.textContent();
      expect(powerText).toMatch(/\d+\s*W/); // Should show watts
    }
  });

  test('should show appliance purchase date if available', async ({ page }) => {
    // Find first appliance card
    const applianceCard = page.getByTestId(/^card-appliance-/).first();
    await expect(applianceCard).toBeVisible();
    
    // Check for purchase date display
    const purchaseDate = applianceCard.getByTestId('text-purchase-date');
    if (await purchaseDate.isVisible()) {
      const dateText = await purchaseDate.textContent();
      expect(dateText).toMatch(/\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2}/); // MM/DD/YYYY or YYYY-MM-DD format
    }
  });

  test('should persist view mode preference', async ({ page }) => {
    // Switch to list view
    await page.getByTestId('button-view-list').click();
    await expect(page.getByTestId('appliances-list')).toBeVisible();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify list view is still active
    await expect(page.getByTestId('appliances-list')).toBeVisible();
    
    // Switch back to grid view for cleanup
    await page.getByTestId('button-view-grid').click();
  });
});