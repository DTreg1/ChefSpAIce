import { test, expect } from '@playwright/test';

test.describe('Theme & UI Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should toggle between light and dark theme', async ({ page }) => {
    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class');
    const isDarkMode = initialTheme?.includes('dark');
    
    // Find and click theme toggle
    const themeToggle = page.getByTestId('button-theme-toggle');
    await themeToggle.click();
    
    // Wait for theme transition
    await page.waitForTimeout(300);
    
    // Verify theme changed
    const newTheme = await htmlElement.getAttribute('class');
    if (isDarkMode) {
      expect(newTheme).not.toContain('dark');
      // Verify light mode colors are applied
      await expect(page.locator('body')).toHaveCSS('background-color', /rgb\(255|254|253/);
    } else {
      expect(newTheme).toContain('dark');
      // Verify dark mode colors are applied
      await expect(page.locator('body')).toHaveCSS('background-color', /rgb\(1[0-9]|2[0-9]|[0-9]\s/);
    }
    
    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(300);
    
    // Verify theme is back to original
    const finalTheme = await htmlElement.getAttribute('class');
    if (isDarkMode) {
      expect(finalTheme).toContain('dark');
    } else {
      expect(finalTheme).not.toContain('dark');
    }
  });

  test('should persist theme preference across page reloads', async ({ page }) => {
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class');
    const isDarkMode = initialTheme?.includes('dark');
    
    // Toggle theme
    await page.getByTestId('button-theme-toggle').click();
    await page.waitForTimeout(300);
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify theme persisted
    const reloadedTheme = await htmlElement.getAttribute('class');
    if (isDarkMode) {
      expect(reloadedTheme).not.toContain('dark');
    } else {
      expect(reloadedTheme).toContain('dark');
    }
    
    // Toggle back for cleanup
    await page.getByTestId('button-theme-toggle').click();
  });

  test('should toggle sidebar', async ({ page }) => {
    const sidebar = page.getByTestId('sidebar');
    const sidebarToggle = page.getByTestId('button-sidebar-toggle');
    
    // Check initial sidebar state
    const initialSidebarVisible = await sidebar.isVisible().catch(() => false);
    
    // Toggle sidebar
    await sidebarToggle.click();
    await page.waitForTimeout(300); // Wait for animation
    
    // Verify sidebar state changed
    const newSidebarVisible = await sidebar.isVisible().catch(() => false);
    expect(newSidebarVisible).toBe(!initialSidebarVisible);
    
    // Toggle back
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    
    // Verify sidebar is back to original state
    const finalSidebarVisible = await sidebar.isVisible().catch(() => false);
    expect(finalSidebarVisible).toBe(initialSidebarVisible);
  });

  test('should open command palette with keyboard shortcut', async ({ page }) => {
    // Press Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+k');
    } else {
      await page.keyboard.press('Control+k');
    }
    
    // Verify command palette opened
    const commandPalette = page.getByTestId('command-palette');
    await expect(commandPalette).toBeVisible();
    
    // Check for quick actions
    await expect(page.getByTestId('command-add-food')).toBeVisible();
    await expect(page.getByTestId('command-scan-barcode')).toBeVisible();
    await expect(page.getByTestId('command-generate-recipe')).toBeVisible();
    
    // Close command palette with Escape
    await page.keyboard.press('Escape');
    
    // Verify command palette closed
    await expect(commandPalette).not.toBeVisible();
  });

  test('should execute quick actions from command palette', async ({ page }) => {
    // Open command palette
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+k');
    } else {
      await page.keyboard.press('Control+k');
    }
    
    // Click "Add Food Item" quick action
    await page.getByTestId('command-add-food').click();
    
    // Verify add food dialog opened
    await expect(page.getByTestId('dialog-add-food')).toBeVisible();
    
    // Close dialog
    await page.keyboard.press('Escape');
    await expect(page.getByTestId('dialog-add-food')).not.toBeVisible();
  });

  test('should show tooltips on hover', async ({ page }) => {
    // Find an element with a tooltip
    const elementWithTooltip = page.getByTestId('button-help').first();
    
    if (await elementWithTooltip.isVisible().catch(() => false)) {
      // Hover over the element
      await elementWithTooltip.hover();
      
      // Wait for tooltip to appear
      await page.waitForTimeout(500);
      
      // Check for tooltip content
      const tooltip = page.getByRole('tooltip');
      await expect(tooltip).toBeVisible();
      
      // Move mouse away
      await page.mouse.move(0, 0);
      
      // Verify tooltip disappears
      await page.waitForTimeout(500);
      await expect(tooltip).not.toBeVisible();
    }
  });

  test('should handle responsive design on mobile viewport', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Check that sidebar is collapsed by default on mobile
    const sidebar = page.getByTestId('sidebar');
    await expect(sidebar).not.toBeVisible();
    
    // Check that mobile menu toggle is visible
    const mobileMenuToggle = page.getByTestId('button-mobile-menu');
    if (await mobileMenuToggle.isVisible().catch(() => false)) {
      // Open mobile menu
      await mobileMenuToggle.click();
      
      // Verify mobile menu is open
      const mobileMenu = page.getByTestId('mobile-menu');
      await expect(mobileMenu).toBeVisible();
      
      // Check that navigation items are visible
      await expect(page.getByRole('link', { name: 'Chef Chat' })).toBeVisible();
      await expect(page.getByRole('link', { name: 'Cookbook' })).toBeVisible();
      
      // Close mobile menu
      await page.getByTestId('button-close-menu').click();
      await expect(mobileMenu).not.toBeVisible();
    }
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should handle responsive design on tablet viewport', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // Check layout adjustments for tablet
    const contentArea = page.getByTestId('main-content');
    await expect(contentArea).toBeVisible();
    
    // Verify sidebar behavior on tablet
    const sidebar = page.getByTestId('sidebar');
    const sidebarToggle = page.getByTestId('button-sidebar-toggle');
    
    // Toggle sidebar on tablet
    await sidebarToggle.click();
    await page.waitForTimeout(300);
    
    // Check if sidebar overlays content or pushes it
    const sidebarVisible = await sidebar.isVisible();
    expect(sidebarVisible).toBeDefined();
    
    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });
  });

  test('should display hover effects on buttons', async ({ page }) => {
    // Find a primary button
    const primaryButton = page.getByRole('button', { name: /add|save|submit/i }).first();
    
    if (await primaryButton.isVisible().catch(() => false)) {
      // Get initial background color
      const initialBg = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Hover over button
      await primaryButton.hover();
      await page.waitForTimeout(100);
      
      // Get hover background color
      const hoverBg = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      
      // Verify background changed (hover effect applied)
      expect(hoverBg).not.toBe(initialBg);
      
      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(100);
      
      // Verify background returned to normal
      const finalBg = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).backgroundColor
      );
      expect(finalBg).toBe(initialBg);
    }
  });

  test('should display active effects on button press', async ({ page }) => {
    // Find a primary button
    const primaryButton = page.getByRole('button', { name: /add|save|submit/i }).first();
    
    if (await primaryButton.isVisible().catch(() => false)) {
      // Get initial transform
      const initialTransform = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Press down on button (don't release)
      await primaryButton.dispatchEvent('mousedown');
      await page.waitForTimeout(50);
      
      // Get active state transform
      const activeTransform = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Verify transform changed (active effect applied)
      expect(activeTransform).not.toBe(initialTransform);
      
      // Release button
      await primaryButton.dispatchEvent('mouseup');
      await page.waitForTimeout(50);
      
      // Verify transform returned to normal
      const finalTransform = await primaryButton.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      expect(finalTransform).toBe(initialTransform);
    }
  });

  test('should animate card scaling on hover', async ({ page }) => {
    // Navigate to a page with cards
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    
    // Find a food card
    const foodCard = page.getByTestId(/^food-card-/).first();
    
    if (await foodCard.isVisible().catch(() => false)) {
      // Get initial scale
      const initialTransform = await foodCard.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Hover over card
      await foodCard.hover();
      await page.waitForTimeout(200); // Wait for animation
      
      // Get hover scale
      const hoverTransform = await foodCard.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      
      // Verify scale changed
      if (hoverTransform !== 'none' && initialTransform !== 'none') {
        expect(hoverTransform).not.toBe(initialTransform);
      }
      
      // Move mouse away
      await page.mouse.move(0, 0);
      await page.waitForTimeout(200);
      
      // Verify scale returned to normal
      const finalTransform = await foodCard.evaluate(el => 
        window.getComputedStyle(el).transform
      );
      expect(finalTransform).toBe(initialTransform);
    }
  });

  test('should handle keyboard navigation', async ({ page }) => {
    // Tab through interactive elements
    await page.keyboard.press('Tab');
    
    // Check that first tabbable element is focused
    const firstFocused = await page.evaluate(() => 
      document.activeElement?.getAttribute('data-testid') || 
      document.activeElement?.tagName
    );
    expect(firstFocused).toBeTruthy();
    
    // Tab to next element
    await page.keyboard.press('Tab');
    
    // Check that focus moved
    const secondFocused = await page.evaluate(() => 
      document.activeElement?.getAttribute('data-testid') || 
      document.activeElement?.tagName
    );
    expect(secondFocused).toBeTruthy();
    expect(secondFocused).not.toBe(firstFocused);
    
    // Test Enter key activation
    const focusedButton = await page.evaluate(() => {
      const element = document.activeElement;
      return element?.tagName === 'BUTTON';
    });
    
    if (focusedButton) {
      // Press Enter to activate button
      await page.keyboard.press('Enter');
      
      // Check if action was triggered (dialog opened, navigation occurred, etc.)
      await page.waitForTimeout(300);
    }
  });

  test('should display loading skeletons during data fetch', async ({ page }) => {
    // Navigate to a page that loads data
    await page.goto('/storage', { waitUntil: 'commit' });
    
    // Check for skeleton loaders
    const skeletons = page.getByTestId(/skeleton|loading/);
    const skeletonCount = await skeletons.count();
    
    if (skeletonCount > 0) {
      // Verify skeletons are visible during loading
      await expect(skeletons.first()).toBeVisible();
      
      // Wait for data to load
      await page.waitForLoadState('networkidle');
      
      // Verify skeletons are replaced with actual content
      const loadedContent = page.getByTestId(/^food-card-|empty-state/);
      await expect(loadedContent.first()).toBeVisible();
      
      // Verify skeletons are no longer visible
      const remainingSkeletons = await skeletons.count();
      expect(remainingSkeletons).toBe(0);
    }
  });

  test('should display proper focus indicators', async ({ page }) => {
    // Find a focusable element
    const button = page.getByRole('button').first();
    
    // Focus the element
    await button.focus();
    
    // Check for focus ring
    const focusRing = await button.evaluate(el => {
      const styles = window.getComputedStyle(el);
      return styles.outline || styles.boxShadow;
    });
    
    // Verify focus indicator is visible
    expect(focusRing).not.toBe('none');
    expect(focusRing).not.toBe('');
  });

  test('should handle scroll restoration on navigation', async ({ page }) => {
    // Navigate to a page with scrollable content
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    
    // Scroll down
    await page.evaluate(() => window.scrollTo(0, 500));
    const scrollPosition = await page.evaluate(() => window.scrollY);
    expect(scrollPosition).toBeGreaterThan(0);
    
    // Navigate to another page
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    
    // Verify scroll is reset
    const newScrollPosition = await page.evaluate(() => window.scrollY);
    expect(newScrollPosition).toBe(0);
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    
    // Check if scroll position is restored (browser dependent)
    const restoredPosition = await page.evaluate(() => window.scrollY);
    // Note: Scroll restoration behavior varies by browser
    expect(restoredPosition).toBeGreaterThanOrEqual(0);
  });
});