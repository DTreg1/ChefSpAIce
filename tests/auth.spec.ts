import { test, expect } from '@playwright/test';

test.describe('Authentication and Onboarding', () => {
  test('should display landing page for unauthenticated users', async ({ page }) => {
    await page.goto('/');
    
    // Check for landing page elements - the auth UI with ChefSpAIce branding
    await expect(page.getByRole('heading', { name: 'ChefSpAIce' })).toBeVisible();
    await expect(page.getByText('Your AI-powered kitchen assistant')).toBeVisible();
    
    // Check for auth tabs
    await expect(page.getByTestId('tab-signup')).toBeVisible();
    await expect(page.getByTestId('tab-login')).toBeVisible();
    
    // Check for sign up options
    await expect(page.getByTestId('button-signup-email')).toBeVisible();
  });

  test('should show email registration form when clicking email signup', async ({ page }) => {
    await page.goto('/');
    
    // Click on the email signup button
    await page.getByTestId('button-signup-email').click();
    
    // Verify email registration form appears
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
    await expect(page.getByTestId('button-email-register')).toBeVisible();
  });

  test('should show email login form when switching to login tab', async ({ page }) => {
    await page.goto('/');
    
    // Click on the login tab
    await page.getByTestId('tab-login').click();
    
    // Click on email login button
    await page.getByTestId('button-login-email').click();
    
    // Verify login form appears
    await expect(page.getByTestId('input-email-login')).toBeVisible();
    await expect(page.getByTestId('input-password-login')).toBeVisible();
    await expect(page.getByTestId('button-email-login')).toBeVisible();
  });

  test('should validate email registration form', async ({ page }) => {
    await page.goto('/');
    
    // Click on the email signup button
    await page.getByTestId('button-signup-email').click();
    
    // Try to register without filling in required fields
    await page.getByTestId('button-email-register').click();
    
    // Should show error message
    await expect(page.getByText('Email and password are required')).toBeVisible();
  });

  test('should validate password length on registration', async ({ page }) => {
    await page.goto('/');
    
    // Click on the email signup button
    await page.getByTestId('button-signup-email').click();
    
    // Fill in email and short password
    await page.getByTestId('input-email').fill('test@example.com');
    await page.getByTestId('input-password').fill('short');
    
    // Try to register
    await page.getByTestId('button-email-register').click();
    
    // Should show password length error
    await expect(page.getByText('Password must be at least 8 characters')).toBeVisible();
  });

  test('should display features on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check for feature cards
    await expect(page.getByTestId('feature-0')).toBeVisible();
    await expect(page.getByText('Smart inventory tracking')).toBeVisible();
    await expect(page.getByText('AI-powered recipe suggestions')).toBeVisible();
    await expect(page.getByText('Reduce food waste')).toBeVisible();
  });

  test('should display stats on landing page', async ({ page }) => {
    await page.goto('/');
    
    // Check for stats cards
    await expect(page.getByTestId('stat-0')).toBeVisible();
    await expect(page.getByText('Less food waste')).toBeVisible();
    await expect(page.getByText('Active users')).toBeVisible();
  });

  test('should show back button on email form', async ({ page }) => {
    await page.goto('/');
    
    // Click on the email signup button
    await page.getByTestId('button-signup-email').click();
    
    // Verify back button exists
    await expect(page.getByTestId('button-back-from-email')).toBeVisible();
    
    // Click back button
    await page.getByTestId('button-back-from-email').click();
    
    // Should return to provider list
    await expect(page.getByTestId('button-signup-email')).toBeVisible();
  });
});
