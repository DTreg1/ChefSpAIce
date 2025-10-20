import { test, expect } from '@playwright/test';

test.describe('Settings & User Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');
  });

  test('should display user profile information', async ({ page }) => {
    // Check profile card is visible
    await expect(page.getByTestId('card-profile')).toBeVisible();
    
    // Verify profile elements
    await expect(page.getByTestId('text-settings-title')).toContainText('Settings');
    await expect(page.getByTestId('text-profile-email')).toBeVisible();
    await expect(page.getByTestId('text-member-id')).toBeVisible();
    await expect(page.getByTestId('text-member-since')).toBeVisible();
    await expect(page.getByTestId('text-household-size')).toBeVisible();
    await expect(page.getByTestId('text-cooking-level')).toBeVisible();
    
    // Check logout button is present
    await expect(page.getByTestId('button-logout')).toBeVisible();
  });

  test('should manage storage areas', async ({ page }) => {
    // Check default storage areas
    const fridgeBadge = page.getByTestId('badge-storage-fridge');
    const freezerBadge = page.getByTestId('badge-storage-freezer');
    const pantryBadge = page.getByTestId('badge-storage-pantry');
    const counterBadge = page.getByTestId('badge-storage-counter');
    
    await expect(fridgeBadge).toBeVisible();
    await expect(freezerBadge).toBeVisible();
    await expect(pantryBadge).toBeVisible();
    await expect(counterBadge).toBeVisible();
    
    // Toggle storage areas
    await fridgeBadge.click();
    await expect(fridgeBadge).toHaveClass(/variant.*outline/);
    
    await fridgeBadge.click();
    await expect(fridgeBadge).not.toHaveClass(/variant.*outline/);
    
    // Add custom storage area
    const customStorageInput = page.getByTestId('input-custom-storage');
    const addButton = page.getByTestId('button-add-custom-storage');
    
    await customStorageInput.fill('Wine Cellar');
    await addButton.click();
    
    // Wait for the custom storage to appear
    await expect(page.getByTestId('badge-storage-wine-cellar')).toBeVisible({ timeout: 10000 });
    
    // Verify it's selected by default
    const wineCellarBadge = page.getByTestId('badge-storage-wine-cellar');
    await expect(wineCellarBadge).not.toHaveClass(/variant.*outline/);
  });

  test('should update household size', async ({ page }) => {
    const householdInput = page.getByTestId('input-household-size');
    
    // Clear and set new value
    await householdInput.clear();
    await householdInput.fill('4');
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
    
    // Reload and verify persistence
    await page.reload();
    await expect(householdInput).toHaveValue('4');
    await expect(page.getByTestId('text-household-size')).toContainText('4 people');
  });

  test('should update cooking skill level', async ({ page }) => {
    const cookingSkillSelect = page.getByTestId('select-cooking-skill');
    
    // Open dropdown and select intermediate
    await cookingSkillSelect.click();
    await page.getByTestId('option-skill-intermediate').click();
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
    
    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId('text-cooking-level')).toContainText('intermediate');
  });

  test('should toggle measurement units', async ({ page }) => {
    const unitsSelect = page.getByTestId('select-units');
    
    // Change to metric
    await unitsSelect.click();
    await page.getByTestId('option-units-metric').click();
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
    
    // Reload and verify persistence
    await page.reload();
    await expect(unitsSelect).toContainText(/metric|Metric/);
  });

  test('should manage dietary restrictions', async ({ page }) => {
    // Toggle dietary restrictions
    await page.getByTestId('badge-dietary-vegetarian').click();
    await page.getByTestId('badge-dietary-gluten-free').click();
    
    // Verify they're selected
    await expect(page.getByTestId('badge-dietary-vegetarian')).not.toHaveClass(/variant.*outline/);
    await expect(page.getByTestId('badge-dietary-gluten-free')).not.toHaveClass(/variant.*outline/);
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
    
    // Reload and verify persistence
    await page.reload();
    await expect(page.getByTestId('badge-dietary-vegetarian')).not.toHaveClass(/variant.*outline/);
    await expect(page.getByTestId('badge-dietary-gluten-free')).not.toHaveClass(/variant.*outline/);
  });

  test('should manage allergens', async ({ page }) => {
    // Toggle allergens
    await page.getByTestId('badge-allergen-peanuts').click();
    await page.getByTestId('badge-allergen-shellfish').click();
    
    // Verify they're selected
    await expect(page.getByTestId('badge-allergen-peanuts')).not.toHaveClass(/variant.*outline/);
    await expect(page.getByTestId('badge-allergen-shellfish')).not.toHaveClass(/variant.*outline/);
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
  });

  test('should add and remove foods to avoid', async ({ page }) => {
    const foodInput = page.getByTestId('input-food-to-avoid');
    const addButton = page.getByTestId('button-add-food-to-avoid');
    
    // Add foods to avoid
    await foodInput.fill('Mushrooms');
    await addButton.click();
    
    await foodInput.fill('Olives');
    await addButton.click();
    
    // Verify foods appear in the list
    await expect(page.getByTestId('badge-avoid-mushrooms')).toBeVisible();
    await expect(page.getByTestId('badge-avoid-olives')).toBeVisible();
    
    // Remove a food
    await page.getByTestId('badge-avoid-mushrooms').getByRole('button', { name: /remove/i }).click();
    await expect(page.getByTestId('badge-avoid-mushrooms')).not.toBeVisible();
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
  });

  test('should update expiration alert days', async ({ page }) => {
    const expirationInput = page.getByTestId('input-expiration-days');
    
    // Clear and set new value
    await expirationInput.clear();
    await expirationInput.fill('7');
    
    // Save preferences
    await page.getByTestId('button-save-preferences').click();
    
    // Verify success toast
    await expect(page.getByText('Your preferences have been saved')).toBeVisible();
    
    // Reload and verify persistence
    await page.reload();
    await expect(expirationInput).toHaveValue('7');
  });

  test('should toggle theme between light and dark mode', async ({ page }) => {
    // Get initial theme
    const htmlElement = page.locator('html');
    const initialTheme = await htmlElement.getAttribute('class');
    const isDarkMode = initialTheme?.includes('dark');
    
    // Click theme toggle
    const themeToggle = page.getByTestId('button-theme-toggle');
    await themeToggle.click();
    
    // Verify theme changed
    await page.waitForTimeout(500); // Allow for theme transition
    const newTheme = await htmlElement.getAttribute('class');
    
    if (isDarkMode) {
      expect(newTheme).not.toContain('dark');
    } else {
      expect(newTheme).toContain('dark');
    }
    
    // Toggle back
    await themeToggle.click();
    await page.waitForTimeout(500);
    const finalTheme = await htmlElement.getAttribute('class');
    
    if (isDarkMode) {
      expect(finalTheme).toContain('dark');
    } else {
      expect(finalTheme).not.toContain('dark');
    }
  });

  test('should prevent adding duplicate custom storage areas', async ({ page }) => {
    const customStorageInput = page.getByTestId('input-custom-storage');
    const addButton = page.getByTestId('button-add-custom-storage');
    
    // Add a custom storage area
    await customStorageInput.fill('Garage');
    await addButton.click();
    
    // Wait for it to appear
    await expect(page.getByTestId('badge-storage-garage')).toBeVisible({ timeout: 10000 });
    
    // Try to add the same area again
    await customStorageInput.fill('Garage');
    await addButton.click();
    
    // Should show error toast
    await expect(page.getByText(/already exists/i)).toBeVisible();
  });

  test('should validate preferences before saving', async ({ page }) => {
    // Deselect all storage areas
    const storageAreas = ['fridge', 'freezer', 'pantry', 'counter'];
    for (const area of storageAreas) {
      const badge = page.getByTestId(`badge-storage-${area}`);
      const classes = await badge.getAttribute('class');
      if (!classes?.includes('outline')) {
        await badge.click();
      }
    }
    
    // Try to save without any storage areas selected
    await page.getByTestId('button-save-preferences').click();
    
    // Should show validation error
    await expect(page.getByText('Please select at least one storage area')).toBeVisible();
  });

  test('should handle logout correctly', async ({ page }) => {
    // Click logout button
    await page.getByTestId('button-logout').click();
    
    // Should redirect to landing page or login
    await page.waitForURL(/\/(landing|login)?$/);
    
    // Verify user is logged out by checking for landing/login elements
    const landingHero = page.getByTestId('landing-hero');
    const loginForm = page.getByTestId('login-form');
    
    // Either landing or login page should be visible
    const isLandingVisible = await landingHero.isVisible().catch(() => false);
    const isLoginVisible = await loginForm.isVisible().catch(() => false);
    
    expect(isLandingVisible || isLoginVisible).toBeTruthy();
  });

  test('should show account reset dialog and handle cancellation', async ({ page }) => {
    // Click reset account button
    await page.getByTestId('button-reset-account').click();
    
    // Verify dialog appears
    await expect(page.getByTestId('dialog-reset-account')).toBeVisible();
    await expect(page.getByText(/This will delete all your data/i)).toBeVisible();
    
    // Cancel reset
    await page.getByTestId('button-cancel-reset').click();
    
    // Dialog should close
    await expect(page.getByTestId('dialog-reset-account')).not.toBeVisible();
    
    // Settings page should still be visible
    await expect(page.getByTestId('card-profile')).toBeVisible();
  });

  test('should handle preference save errors gracefully', async ({ page }) => {
    // Intercept the save request to simulate failure
    await page.route('/api/user/preferences', async route => {
      await route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal server error' })
      });
    });
    
    // Make a change and try to save
    await page.getByTestId('input-household-size').clear();
    await page.getByTestId('input-household-size').fill('5');
    await page.getByTestId('button-save-preferences').click();
    
    // Should show error toast
    await expect(page.getByText(/Failed to save preferences/i)).toBeVisible();
  });
});