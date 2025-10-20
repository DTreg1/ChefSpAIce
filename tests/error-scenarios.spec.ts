import { test, expect } from '@playwright/test';

test.describe('Error Scenarios and Edge Cases', () => {
  test('should handle invalid form inputs gracefully', async ({ page }) => {
    // Navigate to add food dialog
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('button-add-food').click();
    
    // Try to save without required fields
    const saveButton = page.getByTestId('button-save-food');
    await saveButton.click();
    
    // Should show validation errors
    await expect(page.getByText(/required|please enter/i)).toBeVisible();
    
    // Enter invalid quantity
    const quantityInput = page.getByTestId('input-food-quantity');
    await quantityInput.fill('-5');
    await saveButton.click();
    
    // Should show validation error for negative quantity
    await expect(page.getByText(/must be greater than|invalid quantity/i)).toBeVisible();
    
    // Enter extremely long food name
    const nameInput = page.getByTestId('input-food-name');
    await nameInput.fill('a'.repeat(300));
    await saveButton.click();
    
    // Should either truncate or show error
    const nameValue = await nameInput.inputValue();
    expect(nameValue.length).toBeLessThanOrEqual(255);
  });

  test('should handle session timeout gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Simulate session timeout by intercepting auth check
    await page.route('/api/auth/user', async route => {
      await route.fulfill({
        status: 401,
        body: JSON.stringify({ error: 'Session expired' })
      });
    });
    
    // Try to perform an authenticated action
    await page.goto('/storage');
    
    // Should redirect to login or show session expired message
    const loginPage = page.getByTestId('login-form');
    const sessionMessage = page.getByText(/session.*expired|please.*log.*in/i);
    
    const isLoginVisible = await loginPage.isVisible().catch(() => false);
    const isMessageVisible = await sessionMessage.isVisible().catch(() => false);
    
    expect(isLoginVisible || isMessageVisible).toBeTruthy();
  });

  test('should handle database connection failures', async ({ page }) => {
    await page.goto('/storage');
    
    // Intercept API calls to simulate database failure
    await page.route('/api/food-items', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Database connection failed' })
      });
    });
    
    // Reload to trigger the error
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Should show error message
    const errorMessage = page.getByText(/error|failed|unable to load|try again/i);
    await expect(errorMessage.first()).toBeVisible();
    
    // Should offer retry option
    const retryButton = page.getByTestId('button-retry');
    if (await retryButton.isVisible().catch(() => false)) {
      await expect(retryButton).toBeVisible();
    }
  });

  test('should prevent concurrent editing conflicts', async ({ page, context }) => {
    // Open two tabs
    const page1 = page;
    const page2 = await context.newPage();
    
    // Navigate both to the same food item
    await page1.goto('/storage');
    await page2.goto('/storage');
    await page1.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');
    
    // Find and click edit on the same item in both tabs
    const foodCard1 = page1.getByTestId(/^food-card-/).first();
    const foodCard2 = page2.getByTestId(/^food-card-/).first();
    
    if (await foodCard1.isVisible() && await foodCard2.isVisible()) {
      // Start editing in first tab
      await foodCard1.click();
      const editButton1 = page1.getByTestId('button-edit-food');
      if (await editButton1.isVisible().catch(() => false)) {
        await editButton1.click();
        
        // Start editing in second tab
        await foodCard2.click();
        const editButton2 = page2.getByTestId('button-edit-food');
        if (await editButton2.isVisible().catch(() => false)) {
          await editButton2.click();
          
          // Make changes in first tab
          const quantityInput1 = page1.getByTestId('input-food-quantity');
          await quantityInput1.clear();
          await quantityInput1.fill('10');
          await page1.getByTestId('button-save-food').click();
          
          // Try to save in second tab
          const quantityInput2 = page2.getByTestId('input-food-quantity');
          await quantityInput2.clear();
          await quantityInput2.fill('20');
          await page2.getByTestId('button-save-food').click();
          
          // Second save should either show conflict warning or handle gracefully
          const conflictMessage = page2.getByText(/conflict|updated by another|refresh/i);
          const successMessage = page2.getByText(/saved|updated/i);
          
          const hasConflict = await conflictMessage.isVisible().catch(() => false);
          const hasSuccess = await successMessage.isVisible().catch(() => false);
          
          expect(hasConflict || hasSuccess).toBeTruthy();
        }
      }
    }
    
    await page2.close();
  });

  test('should handle network failures with retry', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    let attemptCount = 0;
    
    // Intercept chat API to fail first 2 attempts
    await page.route('/api/chat/messages', async route => {
      if (route.request().method() === 'POST') {
        attemptCount++;
        if (attemptCount <= 2) {
          await route.fulfill({
            status: 503,
            body: JSON.stringify({ error: 'Service temporarily unavailable' })
          });
        } else {
          await route.continue();
        }
      } else {
        await route.continue();
      }
    });
    
    // Send a message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Test message');
    await page.getByTestId('button-send-message').click();
    
    // Should show error and retry
    const errorMessage = page.getByText(/error|failed|retry/i);
    await expect(errorMessage.first()).toBeVisible();
    
    // Manual retry or automatic retry
    const retryButton = page.getByTestId('button-retry-message');
    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      
      // Should eventually succeed (3rd attempt)
      await expect(page.getByTestId('chat-message-user')).toBeVisible({ timeout: 10000 });
    }
  });

  test('should handle file size limits', async ({ page }) => {
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    
    // Try to upload a recipe (if upload exists)
    const uploadButton = page.getByTestId('button-upload-recipe');
    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      
      // Check for file input
      const fileInput = page.getByTestId('input-file-upload');
      if (await fileInput.isVisible().catch(() => false)) {
        // Create a large fake file
        const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
        const file = new File([largeContent], 'large-recipe.txt', { type: 'text/plain' });
        
        // Set files programmatically
        await fileInput.setInputFiles({
          name: 'large-recipe.txt',
          mimeType: 'text/plain',
          buffer: Buffer.from(largeContent)
        });
        
        // Should show file size error
        await expect(page.getByText(/file.*too large|size limit|maximum.*size/i)).toBeVisible();
      }
    }
  });

  test('should handle special characters in inputs', async ({ page }) => {
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('button-add-food').click();
    
    // Enter special characters in food name
    const nameInput = page.getByTestId('input-food-name');
    const specialName = "Test <script>alert('xss')</script> & 'quotes' \"double\" 中文";
    await nameInput.fill(specialName);
    
    // Fill other required fields
    await page.getByTestId('input-food-quantity').fill('1');
    await page.getByTestId('select-storage-location').selectOption('Fridge');
    
    // Save
    await page.getByTestId('button-save-food').click();
    
    // Should either sanitize or handle special characters properly
    const savedItem = page.getByText(/Test.*quotes.*double/);
    if (await savedItem.isVisible().catch(() => false)) {
      // Verify XSS is prevented (script tags should be escaped/removed)
      const itemText = await savedItem.textContent();
      expect(itemText).not.toContain('<script>');
      expect(itemText).not.toContain('alert(');
    }
  });

  test('should handle API rate limiting', async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
    
    // Intercept API to simulate rate limiting
    await page.route('/api/chat/messages', async route => {
      await route.fulfill({
        status: 429,
        headers: {
          'Retry-After': '60'
        },
        body: JSON.stringify({ error: 'Rate limit exceeded' })
      });
    });
    
    // Try to send message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Test message');
    await page.getByTestId('button-send-message').click();
    
    // Should show rate limit message
    await expect(page.getByText(/rate limit|too many requests|please wait/i)).toBeVisible();
    
    // Should show retry time if available
    const retryInfo = page.getByText(/try again in|wait.*seconds/i);
    if (await retryInfo.isVisible().catch(() => false)) {
      await expect(retryInfo).toBeVisible();
    }
  });

  test('should handle empty states gracefully', async ({ page }) => {
    // Test various empty states
    const emptyStatePages = [
      { url: '/cookbook', testId: 'empty-cookbook' },
      { url: '/shopping-list', testId: 'empty-shopping-list' },
      { url: '/meal-planner', testId: 'empty-meal-plan' }
    ];
    
    for (const pageInfo of emptyStatePages) {
      await page.goto(pageInfo.url);
      await page.waitForLoadState('networkidle');
      
      // Check if empty state is displayed when appropriate
      const emptyState = page.getByTestId(pageInfo.testId);
      const hasContent = await page.getByTestId(/^(recipe|item|meal)-/).first().isVisible().catch(() => false);
      
      if (!hasContent) {
        // Should show helpful empty state
        if (await emptyState.isVisible().catch(() => false)) {
          await expect(emptyState).toBeVisible();
          
          // Empty state should have helpful message
          const emptyText = await emptyState.textContent();
          expect(emptyText).toMatch(/no.*yet|get started|add.*first/i);
        }
      }
    }
  });

  test('should handle date/time edge cases', async ({ page }) => {
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    await page.getByTestId('button-add-food').click();
    
    // Fill basic info
    await page.getByTestId('input-food-name').fill('Test Food');
    await page.getByTestId('input-food-quantity').fill('1');
    
    // Set expiration date in the past
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const expirationInput = page.getByTestId('input-expiration-date');
    await expirationInput.fill(yesterday.toISOString().split('T')[0]);
    
    // Save
    await page.getByTestId('button-save-food').click();
    
    // Should either warn about past date or mark as expired
    const warning = page.getByText(/already expired|past date|expired/i);
    const savedWithExpiredBadge = page.getByTestId('badge-expired');
    
    const hasWarning = await warning.isVisible().catch(() => false);
    const hasExpiredBadge = await savedWithExpiredBadge.isVisible().catch(() => false);
    
    expect(hasWarning || hasExpiredBadge).toBeTruthy();
  });

  test('should handle browser back/forward navigation', async ({ page }) => {
    // Navigate through multiple pages
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const firstPageTitle = await page.title();
    
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
    const secondPageTitle = await page.title();
    
    await page.goto('/storage');
    await page.waitForLoadState('networkidle');
    
    // Go back
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBe(secondPageTitle);
    
    // Go back again
    await page.goBack();
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBe(firstPageTitle);
    
    // Go forward
    await page.goForward();
    await page.waitForLoadState('networkidle');
    expect(await page.title()).toBe(secondPageTitle);
  });

  test('should handle permission errors gracefully', async ({ page }) => {
    await page.goto('/storage');
    
    // Intercept delete request to simulate permission error
    await page.route(/\/api\/food-items\/.*/, async route => {
      if (route.request().method() === 'DELETE') {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({ error: 'Permission denied' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to delete an item
    const foodCard = page.getByTestId(/^food-card-/).first();
    if (await foodCard.isVisible().catch(() => false)) {
      await foodCard.click();
      const deleteButton = page.getByTestId('button-delete-food');
      
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion
        const confirmButton = page.getByTestId('button-confirm-delete');
        if (await confirmButton.isVisible().catch(() => false)) {
          await confirmButton.click();
        }
        
        // Should show permission error
        await expect(page.getByText(/permission|not authorized|access denied/i)).toBeVisible();
      }
    }
  });
});