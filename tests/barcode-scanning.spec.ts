import { test, expect } from '@playwright/test';

test.describe('Barcode Scanning', () => {
  test('should open barcode scanner dialog', async ({ page }) => {
    await page.goto('/');
    
    // Click scan barcode button
    await page.getByTestId('button-quick-scan-barcode').click();
    
    // Dialog should open
    await expect(page.getByTestId('dialog-barcode-scanner')).toBeVisible();
    
    // Should show camera view or manual entry option
    await expect(page.getByTestId('barcode-camera-view')).toBeVisible();
    await expect(page.getByTestId('button-manual-entry')).toBeVisible();
  });

  test('should handle manual barcode entry', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('button-quick-scan-barcode').click();
    
    // Switch to manual entry
    await page.getByTestId('button-manual-entry').click();
    
    // Enter barcode
    await page.getByTestId('input-barcode').fill('012345678901');
    await page.getByTestId('button-lookup-barcode').click();
    
    // Wait for product lookup
    await expect(page.getByTestId('product-info')).toBeVisible({ timeout: 10000 });
    
    // Should show product details
    await expect(page.getByTestId('product-name')).toBeVisible();
    await expect(page.getByTestId('product-brand')).toBeVisible();
    await expect(page.getByTestId('product-image')).toBeVisible();
    
    // Should have option to add to inventory
    await expect(page.getByTestId('button-add-product')).toBeVisible();
  });

  test('should add scanned product to inventory', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('button-quick-scan-barcode').click();
    
    // Manual entry for testing
    await page.getByTestId('button-manual-entry').click();
    await page.getByTestId('input-barcode').fill('012345678901');
    await page.getByTestId('button-lookup-barcode').click();
    
    // Wait for product
    await expect(page.getByTestId('product-info')).toBeVisible({ timeout: 10000 });
    
    // Get product name
    const productName = await page.getByTestId('product-name').textContent();
    
    // Add to inventory
    await page.getByTestId('button-add-product').click();
    
    // Set quantity and location
    await page.getByTestId('input-product-quantity').fill('2');
    await page.getByTestId('select-storage-location').selectOption('pantry');
    
    // Save
    await page.getByTestId('button-save-product').click();
    
    // Verify success message
    await expect(page.getByText(`${productName} added to inventory`)).toBeVisible();
    
    // Navigate to storage and verify
    await page.goto('/storage/pantry');
    await expect(page.getByText(productName!)).toBeVisible();
  });

  test('should scan appliance barcodes', async ({ page }) => {
    await page.goto('/appliances');
    
    // Click add appliance
    await page.getByTestId('button-add-appliance').click();
    
    // Choose barcode scan option
    await page.getByTestId('button-scan-appliance-barcode').click();
    
    // Manual entry for testing
    await page.getByTestId('button-manual-entry').click();
    await page.getByTestId('input-barcode').fill('987654321098');
    await page.getByTestId('button-lookup-barcode').click();
    
    // Wait for appliance info
    await expect(page.getByTestId('appliance-info')).toBeVisible({ timeout: 10000 });
    
    // Should show appliance details
    await expect(page.getByTestId('appliance-name')).toBeVisible();
    await expect(page.getByTestId('appliance-brand')).toBeVisible();
    await expect(page.getByTestId('appliance-capabilities')).toBeVisible();
    
    // Add appliance
    await page.getByTestId('button-add-appliance-confirm').click();
    
    // Verify appliance added
    const applianceCount = await page.getByTestId('appliance-card').count();
    expect(applianceCount).toBeGreaterThanOrEqual(1);
  });

  test('should handle barcode not found', async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('button-quick-scan-barcode').click();
    
    // Enter invalid barcode
    await page.getByTestId('button-manual-entry').click();
    await page.getByTestId('input-barcode').fill('000000000000');
    await page.getByTestId('button-lookup-barcode').click();
    
    // Should show error message
    await expect(page.getByTestId('barcode-error')).toBeVisible();
    await expect(page.getByText('Product not found')).toBeVisible();
    
    // Should offer manual entry option
    await expect(page.getByTestId('button-manual-add')).toBeVisible();
  });

  test('should show barcode history', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to barcode history
    await page.getByTestId('tab-barcode-history').click();
    
    // Should show recent scans
    await expect(page.getByTestId('barcode-history-list')).toBeVisible();
    
    // Each history item should show details
    const historyItem = page.getByTestId('barcode-history-item').first();
    if (await historyItem.isVisible()) {
      await expect(historyItem.getByTestId('scan-date')).toBeVisible();
      await expect(historyItem.getByTestId('product-name')).toBeVisible();
      await expect(historyItem.getByTestId('barcode-number')).toBeVisible();
    }
  });
});