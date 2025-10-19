import { test, expect } from '@playwright/test';

test.describe('Authentication and Onboarding', () => {
  test('should display landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Check for landing page elements
    await expect(page.getByTestId('landing-hero')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'ChefSpAIce' })).toBeVisible();
    await expect(page.getByText('Your AI-Powered Kitchen Assistant')).toBeVisible();
    await expect(page.getByTestId('button-get-started')).toBeVisible();
  });

  test('should redirect to onboarding after authentication', async ({ page }) => {
    // Mock authentication state
    await page.goto('/');
    
    // Click get started button
    await page.getByTestId('button-get-started').click();
    
    // Should redirect to auth and then onboarding
    await page.waitForURL('**/onboarding', { timeout: 10000 });
    
    // Verify onboarding page elements
    await expect(page.getByText('Welcome to ChefSpAIce!')).toBeVisible();
    await expect(page.getByTestId('button-onboarding-continue')).toBeVisible();
  });

  test('should complete onboarding flow', async ({ page }) => {
    await page.goto('/onboarding');
    
    // Step 1: Welcome
    await expect(page.getByText('Welcome to ChefSpAIce!')).toBeVisible();
    await page.getByTestId('button-onboarding-continue').click();
    
    // Step 2: Dietary preferences
    await expect(page.getByText('Dietary Preferences')).toBeVisible();
    await page.getByTestId('checkbox-vegetarian').click();
    await page.getByTestId('checkbox-gluten-free').click();
    await page.getByTestId('button-onboarding-continue').click();
    
    // Step 3: Allergies
    await expect(page.getByText('Food Allergies')).toBeVisible();
    await page.getByTestId('checkbox-peanuts').click();
    await page.getByTestId('checkbox-shellfish').click();
    await page.getByTestId('button-onboarding-continue').click();
    
    // Step 4: Initial inventory
    await expect(page.getByText('Add Your First Items')).toBeVisible();
    
    // Add a few sample items
    await page.getByTestId('input-food-name').fill('Milk');
    await page.getByTestId('input-food-quantity').fill('1');
    await page.getByTestId('select-food-unit').selectOption('gallon');
    await page.getByTestId('button-add-item').click();
    
    await page.getByTestId('input-food-name').fill('Eggs');
    await page.getByTestId('input-food-quantity').fill('12');
    await page.getByTestId('select-food-unit').selectOption('count');
    await page.getByTestId('button-add-item').click();
    
    // Complete onboarding
    await page.getByTestId('button-onboarding-finish').click();
    
    // Should redirect to main chat page
    await page.waitForURL('**/');
    await expect(page.getByTestId('chat-input')).toBeVisible();
  });

  test('should show sidebar for authenticated users', async ({ page }) => {
    // Assume authenticated
    await page.goto('/');
    
    // Check sidebar elements
    await expect(page.getByTestId('button-sidebar-toggle')).toBeVisible();
    
    // Open sidebar
    await page.getByTestId('button-sidebar-toggle').click();
    
    // Verify sidebar navigation items
    await expect(page.getByRole('link', { name: 'Chef Chat' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Cookbook' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Meal Planner' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Shopping List' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Nutrition' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Appliances' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeVisible();
  });

  test('should handle logout correctly', async ({ page }) => {
    await page.goto('/settings');
    
    // Find and click logout button
    await page.getByTestId('button-logout').click();
    
    // Confirm logout in dialog
    await page.getByTestId('button-confirm-logout').click();
    
    // Should redirect to landing page
    await page.waitForURL('**/');
    await expect(page.getByTestId('landing-hero')).toBeVisible();
  });
});