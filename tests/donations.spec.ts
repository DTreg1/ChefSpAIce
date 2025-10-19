import { test, expect } from '@playwright/test';

test.describe('Donations and Stripe Integration', () => {
  test('should display donation page correctly', async ({ page }) => {
    await page.goto('/donate');
    
    // Check page elements
    await expect(page.getByTestId('donation-header')).toBeVisible();
    await expect(page.getByText('Support ChefSpAIce')).toBeVisible();
    
    // Check donation tiers
    await expect(page.getByTestId('tier-supporter')).toBeVisible();
    await expect(page.getByTestId('tier-contributor')).toBeVisible();
    await expect(page.getByTestId('tier-champion')).toBeVisible();
    
    // Check custom amount option
    await expect(page.getByTestId('input-custom-amount')).toBeVisible();
  });

  test('should select donation tier', async ({ page }) => {
    await page.goto('/donate');
    
    // Select contributor tier ($10)
    await page.getByTestId('tier-contributor').click();
    
    // Tier should be selected
    await expect(page.getByTestId('tier-contributor')).toHaveClass(/selected|active/);
    
    // Amount should be reflected
    await expect(page.getByTestId('selected-amount')).toContainText('$10');
  });

  test('should handle custom donation amount', async ({ page }) => {
    await page.goto('/donate');
    
    // Enter custom amount
    await page.getByTestId('input-custom-amount').fill('25');
    
    // Custom amount should be selected
    await expect(page.getByTestId('selected-amount')).toContainText('$25');
    
    // Predefined tiers should be deselected
    await expect(page.getByTestId('tier-supporter')).not.toHaveClass(/selected|active/);
    await expect(page.getByTestId('tier-contributor')).not.toHaveClass(/selected|active/);
    await expect(page.getByTestId('tier-champion')).not.toHaveClass(/selected|active/);
  });

  test('should validate donation amount', async ({ page }) => {
    await page.goto('/donate');
    
    // Try to enter invalid amount
    await page.getByTestId('input-custom-amount').fill('0');
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Should show error
    await expect(page.getByTestId('error-minimum-amount')).toBeVisible();
    await expect(page.getByText('Minimum donation is $1')).toBeVisible();
    
    // Try very large amount
    await page.getByTestId('input-custom-amount').fill('10000');
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Should show warning
    await expect(page.getByTestId('warning-large-amount')).toBeVisible();
  });

  test('should open Stripe checkout', async ({ page }) => {
    await page.goto('/donate');
    
    // Select a tier
    await page.getByTestId('tier-supporter').click();
    
    // Proceed to payment
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Stripe checkout should load
    await expect(page.locator('iframe[title="Stripe Checkout"]')).toBeVisible({ timeout: 15000 });
    
    // Or if using Stripe Elements
    await expect(page.getByTestId('stripe-payment-element')).toBeVisible({ timeout: 15000 });
  });

  test('should fill Stripe payment form', async ({ page }) => {
    await page.goto('/donate');
    
    // Select amount and proceed
    await page.getByTestId('tier-contributor').click();
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Wait for Stripe elements
    const stripeFrame = page.frameLocator('iframe[title*="Stripe"]').first();
    
    // Fill test card details
    await stripeFrame.getByPlaceholder('Card number').fill('4242 4242 4242 4242');
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/30');
    await stripeFrame.getByPlaceholder('CVC').fill('123');
    await stripeFrame.getByPlaceholder('ZIP').fill('12345');
    
    // Email field (might be outside iframe)
    await page.getByTestId('input-email').fill('test@example.com');
  });

  test('should handle successful donation', async ({ page }) => {
    await page.goto('/donate');
    
    // Complete donation flow
    await page.getByTestId('tier-supporter').click();
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Fill Stripe form (simplified for testing)
    const stripeFrame = page.frameLocator('iframe[title*="Stripe"]').first();
    await stripeFrame.getByPlaceholder('Card number').fill('4242 4242 4242 4242');
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/30');
    await stripeFrame.getByPlaceholder('CVC').fill('123');
    
    // Submit payment
    await page.getByTestId('button-submit-payment').click();
    
    // Should redirect to success page
    await page.waitForURL('**/donate/success', { timeout: 30000 });
    
    // Success page elements
    await expect(page.getByTestId('success-message')).toBeVisible();
    await expect(page.getByText('Thank you for your donation!')).toBeVisible();
    await expect(page.getByTestId('donation-receipt')).toBeVisible();
  });

  test('should handle failed payment', async ({ page }) => {
    await page.goto('/donate');
    
    await page.getByTestId('tier-supporter').click();
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Use declined test card
    const stripeFrame = page.frameLocator('iframe[title*="Stripe"]').first();
    await stripeFrame.getByPlaceholder('Card number').fill('4000 0000 0000 0002');
    await stripeFrame.getByPlaceholder('MM / YY').fill('12/30');
    await stripeFrame.getByPlaceholder('CVC').fill('123');
    
    // Submit payment
    await page.getByTestId('button-submit-payment').click();
    
    // Should show error
    await expect(page.getByTestId('payment-error')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/declined|failed/i)).toBeVisible();
    
    // Should remain on donation page
    expect(page.url()).toContain('/donate');
  });

  test('should show donation history', async ({ page }) => {
    await page.goto('/settings');
    
    // Navigate to donation history
    await page.getByTestId('tab-donation-history').click();
    
    // Should show donation list
    await expect(page.getByTestId('donation-history')).toBeVisible();
    
    // Each donation should show details
    const donationItem = page.getByTestId('donation-item').first();
    if (await donationItem.isVisible()) {
      await expect(donationItem.getByTestId('donation-date')).toBeVisible();
      await expect(donationItem.getByTestId('donation-amount')).toBeVisible();
      await expect(donationItem.getByTestId('donation-status')).toBeVisible();
      await expect(donationItem.getByTestId('button-view-receipt')).toBeVisible();
    }
  });

  test('should handle recurring donations', async ({ page }) => {
    await page.goto('/donate');
    
    // Select tier
    await page.getByTestId('tier-contributor').click();
    
    // Toggle recurring donation
    await page.getByTestId('toggle-recurring').click();
    
    // Should show frequency options
    await expect(page.getByTestId('select-frequency')).toBeVisible();
    
    // Select monthly
    await page.getByTestId('select-frequency').selectOption('monthly');
    
    // Amount should reflect recurring
    await expect(page.getByTestId('selected-amount')).toContainText('$10/month');
    
    // Proceed to payment
    await page.getByTestId('button-proceed-to-payment').click();
    
    // Stripe should show subscription details
    await expect(page.getByText(/subscription|recurring/i)).toBeVisible({ timeout: 15000 });
  });
});