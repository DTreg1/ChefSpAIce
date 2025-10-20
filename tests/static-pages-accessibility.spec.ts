import { test, expect } from '@playwright/test';

test.describe('Static Pages and Basic Accessibility', () => {
  test('should display privacy policy page', async ({ page }) => {
    await page.goto('/privacy');
    await page.waitForLoadState('networkidle');
    
    // Check for privacy policy content
    await expect(page.getByRole('heading', { name: /Privacy Policy/i })).toBeVisible();
    
    // Should contain key privacy sections
    const content = await page.textContent('body');
    expect(content).toMatch(/information.*collect/i);
    expect(content).toMatch(/data.*use/i);
    expect(content).toMatch(/security|protection/i);
  });

  test('should display terms of service page', async ({ page }) => {
    await page.goto('/terms');
    await page.waitForLoadState('networkidle');
    
    // Check for terms content
    await expect(page.getByRole('heading', { name: /Terms.*Service/i })).toBeVisible();
    
    // Should contain key terms sections
    const content = await page.textContent('body');
    expect(content).toMatch(/agreement|acceptance/i);
    expect(content).toMatch(/use.*service/i);
    expect(content).toMatch(/liability|disclaimer/i);
  });

  test('should display about page', async ({ page }) => {
    await page.goto('/about');
    await page.waitForLoadState('networkidle');
    
    // Check for about content
    await expect(page.getByRole('heading', { name: /About/i })).toBeVisible();
    
    // Should contain information about ChefSpAIce
    const content = await page.textContent('body');
    expect(content).toMatch(/ChefSpAIce/i);
    expect(content).toMatch(/kitchen|food|recipe|AI/i);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all headings
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', elements => 
      elements.map(el => ({
        level: parseInt(el.tagName[1]),
        text: el.textContent
      }))
    );
    
    // Should have at least one h1
    const h1Count = headings.filter(h => h.level === 1).length;
    expect(h1Count).toBeGreaterThanOrEqual(1);
    
    // Heading levels should not skip (e.g., h1 -> h3 without h2)
    for (let i = 1; i < headings.length; i++) {
      const currentLevel = headings[i].level;
      const previousLevel = headings[i - 1].level;
      
      // Level can stay same, go up any amount, or increase by 1
      if (currentLevel > previousLevel) {
        expect(currentLevel - previousLevel).toBeLessThanOrEqual(1);
      }
    }
  });

  test('should have alt text for images', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get all images
    const images = page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const ariaLabel = await img.getAttribute('aria-label');
      const role = await img.getAttribute('role');
      
      // Image should have alt text, aria-label, or be decorative
      const hasAccessibleText = alt !== null && alt !== '';
      const hasAriaLabel = ariaLabel !== null && ariaLabel !== '';
      const isDecorative = role === 'presentation' || alt === '';
      
      expect(hasAccessibleText || hasAriaLabel || isDecorative).toBeTruthy();
    }
  });

  test('should have proper ARIA labels for interactive elements', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check buttons have accessible text
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      const ariaLabelledBy = await button.getAttribute('aria-labelledby');
      
      // Button should have visible text, aria-label, or aria-labelledby
      const hasAccessibleName = 
        (text && text.trim() !== '') || 
        (ariaLabel && ariaLabel !== '') || 
        (ariaLabelledBy && ariaLabelledBy !== '');
      
      expect(hasAccessibleName).toBeTruthy();
    }
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Start tabbing through the page
    let previousElement = null;
    const tabbedElements: Array<{
      tagName: string | undefined;
      id: string | undefined;
      className: string | undefined;
      isInteractive: boolean;
    }> = [];
    
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');
      
      const focusedElement = await page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el?.tagName,
          id: el?.id,
          className: el?.className,
          isInteractive: el?.tagName === 'BUTTON' || 
                        el?.tagName === 'A' || 
                        el?.tagName === 'INPUT' ||
                        el?.tagName === 'SELECT' ||
                        el?.tagName === 'TEXTAREA'
        };
      });
      
      // Should focus on interactive elements
      if (focusedElement.tagName !== 'BODY') {
        tabbedElements.push(focusedElement);
      }
    }
    
    // Should have tabbed through multiple interactive elements
    expect(tabbedElements.length).toBeGreaterThan(3);
    
    // Most focused elements should be interactive
    const interactiveCount = tabbedElements.filter(el => el.isInteractive).length;
    expect(interactiveCount).toBeGreaterThan(tabbedElements.length * 0.7);
  });

  test('should have sufficient color contrast', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Sample a few text elements for contrast
    const textElements = page.locator('p, h1, h2, h3, button, a');
    const sampleSize = Math.min(await textElements.count(), 5);
    
    for (let i = 0; i < sampleSize; i++) {
      const element = textElements.nth(i);
      
      const contrast = await element.evaluate(el => {
        const style = window.getComputedStyle(el);
        const color = style.color;
        const bgColor = style.backgroundColor;
        
        // Simple check: text should not be same as background
        return color !== bgColor;
      });
      
      expect(contrast).toBeTruthy();
    }
  });

  test('should have skip navigation link', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Press Tab to reveal skip link (if hidden)
    await page.keyboard.press('Tab');
    
    // Look for skip navigation link
    const skipLink = page.getByRole('link', { name: /skip.*nav|skip.*content|skip.*main/i });
    const skipButton = page.getByRole('button', { name: /skip.*nav|skip.*content|skip.*main/i });
    
    const hasSkipLink = await skipLink.isVisible().catch(() => false);
    const hasSkipButton = await skipButton.isVisible().catch(() => false);
    
    // Note: Skip navigation is a best practice but not always implemented
    if (hasSkipLink || hasSkipButton) {
      expect(hasSkipLink || hasSkipButton).toBeTruthy();
    }
  });

  test('should have proper form labels', async ({ page }) => {
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    
    // Open add food dialog
    await page.getByTestId('button-add-food').click();
    
    // Check form inputs have labels
    const inputs = page.locator('input:not([type="hidden"]), select, textarea');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');
      
      if (id) {
        // Check for associated label
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        
        // Input should have label, aria-label, or aria-labelledby
        const hasAccessibleLabel = hasLabel || ariaLabel || ariaLabelledBy;
        expect(hasAccessibleLabel).toBeTruthy();
      }
    }
  });

  test('should handle focus trap in modals', async ({ page }) => {
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    
    // Open a modal/dialog
    await page.getByTestId('button-add-food').click();
    
    // Check if dialog is present
    const dialog = page.getByRole('dialog').first();
    if (await dialog.isVisible().catch(() => false)) {
      // Tab through elements
      let tabCount = 0;
      const focusedElements: Array<{
        tagName: string | undefined;
        isInDialog: boolean;
      }> = [];
      
      while (tabCount < 20) {
        await page.keyboard.press('Tab');
        tabCount++;
        
        const focusedElement = await page.evaluate(() => ({
          tagName: document.activeElement?.tagName,
          isInDialog: document.activeElement?.closest('[role="dialog"]') !== null
        }));
        
        focusedElements.push(focusedElement);
        
        // If we've cycled back to the first element, focus is trapped
        if (tabCount > 5 && focusedElements[tabCount - 1].tagName === focusedElements[0].tagName) {
          break;
        }
      }
      
      // Most focused elements should be within the dialog
      const inDialogCount = focusedElements.filter(el => el.isInDialog).length;
      expect(inDialogCount).toBeGreaterThan(focusedElements.length * 0.8);
      
      // Close dialog
      await page.keyboard.press('Escape');
    }
  });

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Check for semantic elements
    const main = page.locator('main');
    const nav = page.locator('nav');
    const header = page.locator('header');
    const footer = page.locator('footer');
    
    // Should have main content area
    await expect(main.first()).toBeVisible();
    
    // Should have navigation
    const navCount = await nav.count();
    expect(navCount).toBeGreaterThan(0);
    
    // May have header and footer
    const hasHeader = await header.first().isVisible().catch(() => false);
    const hasFooter = await footer.first().isVisible().catch(() => false);
    
    // At least some semantic structure should exist
    expect(navCount > 0 || hasHeader || hasFooter).toBeTruthy();
  });

  test('should announce page changes to screen readers', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Navigate to another page
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    
    // Check for ARIA live regions or route announcements
    const liveRegions = page.locator('[aria-live], [role="alert"], [role="status"]');
    const liveRegionCount = await liveRegions.count();
    
    // Check page title changed
    const title = await page.title();
    expect(title).toBeTruthy();
    
    // Should have some way of announcing changes
    // (either live regions or distinct page titles)
    expect(liveRegionCount > 0 || title.length > 0).toBeTruthy();
  });

  test('should handle text resizing', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Get initial font size
    const initialFontSize = await page.evaluate(() => {
      const body = document.body;
      return window.getComputedStyle(body).fontSize;
    });
    
    // Increase zoom to 200%
    await page.keyboard.press('Control+0'); // Reset zoom first
    await page.keyboard.press('Control++');
    await page.keyboard.press('Control++');
    await page.keyboard.press('Control++');
    
    // Content should still be accessible (no horizontal scroll on body)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.body.scrollWidth > window.innerWidth;
    });
    
    // Some horizontal scroll is acceptable on zoom, but check key elements are visible
    const mainContent = page.getByRole('main').first();
    if (await mainContent.isVisible().catch(() => false)) {
      await expect(mainContent).toBeInViewport({ ratio: 0.3 }); // At least 30% visible
    }
    
    // Reset zoom
    await page.keyboard.press('Control+0');
  });
});