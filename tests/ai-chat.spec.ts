import { test, expect } from '@playwright/test';

test.describe('AI Chat and Recipe Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display chat interface correctly', async ({ page }) => {
    // Check chat elements
    await expect(page.getByTestId('chat-container')).toBeVisible();
    await expect(page.getByTestId('chat-input')).toBeVisible();
    await expect(page.getByTestId('button-send-message')).toBeVisible();
    await expect(page.getByTestId('button-quick-add-food')).toBeVisible();
    await expect(page.getByTestId('button-quick-scan-barcode')).toBeVisible();
    await expect(page.getByTestId('button-quick-generate-recipe')).toBeVisible();
  });

  test('should send a chat message and receive response', async ({ page }) => {
    // Type a message
    await page.getByTestId('chat-input').fill('What can I make with chicken and rice?');
    
    // Send the message
    await page.getByTestId('button-send-message').click();
    
    // Verify user message appears
    await expect(page.getByTestId('chat-message-user').last()).toContainText('What can I make with chicken and rice?');
    
    // Wait for AI response (with streaming)
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
    
    // Verify response contains relevant content
    const assistantMessage = await page.getByTestId('chat-message-assistant').last().textContent();
    expect(assistantMessage?.toLowerCase()).toMatch(/chicken|rice|recipe/);
  });

  test('should generate a recipe based on available ingredients', async ({ page }) => {
    // Click generate recipe button
    await page.getByTestId('button-quick-generate-recipe').click();
    
    // Recipe customization dialog should open
    await expect(page.getByTestId('dialog-recipe-customization')).toBeVisible();
    
    // Select preferences
    await page.getByTestId('select-cuisine').selectOption('italian');
    await page.getByTestId('select-difficulty').selectOption('easy');
    await page.getByTestId('input-prep-time').fill('30');
    await page.getByTestId('checkbox-use-expiring').check();
    
    // Generate recipe
    await page.getByTestId('button-generate-recipe').click();
    
    // Wait for recipe to be generated
    await expect(page.getByTestId('recipe-card')).toBeVisible({ timeout: 30000 });
    
    // Verify recipe details
    await expect(page.getByTestId('recipe-title')).toBeVisible();
    await expect(page.getByTestId('recipe-ingredients')).toBeVisible();
    await expect(page.getByTestId('recipe-instructions')).toBeVisible();
    await expect(page.getByTestId('recipe-prep-time')).toBeVisible();
    await expect(page.getByTestId('recipe-servings')).toBeVisible();
  });

  test('should save generated recipe to cookbook', async ({ page }) => {
    // Generate a recipe first
    await page.getByTestId('button-quick-generate-recipe').click();
    await page.getByTestId('button-generate-recipe').click();
    
    // Wait for recipe
    await expect(page.getByTestId('recipe-card')).toBeVisible({ timeout: 30000 });
    
    // Get recipe title
    const recipeTitle = await page.getByTestId('recipe-title').textContent();
    
    // Save recipe
    await page.getByTestId('button-save-recipe').click();
    
    // Verify success message
    await expect(page.getByText('Recipe saved to cookbook')).toBeVisible();
    
    // Navigate to cookbook
    await page.goto('/cookbook');
    
    // Verify recipe appears in cookbook
    await expect(page.getByText(recipeTitle!)).toBeVisible();
  });

  test('should check ingredient availability for recipes', async ({ page }) => {
    // Navigate to cookbook
    await page.goto('/cookbook');
    
    // Click on a recipe card
    await page.getByTestId(/^recipe-card-/).first().click();
    
    // Check availability status
    const availabilityIndicator = page.getByTestId('recipe-availability');
    await expect(availabilityIndicator).toBeVisible();
    
    // Should show available/missing ingredients
    await expect(page.getByTestId('available-ingredients')).toBeVisible();
    
    const missingIngredients = page.getByTestId('missing-ingredients');
    if (await missingIngredients.isVisible()) {
      // If missing ingredients, should show add to shopping list option
      await expect(page.getByTestId('button-add-to-shopping')).toBeVisible();
    }
  });

  test('should handle recipe rating and feedback', async ({ page }) => {
    // Navigate to cookbook
    await page.goto('/cookbook');
    
    // Open a recipe
    await page.getByTestId(/^recipe-card-/).first().click();
    
    // Rate the recipe
    await page.getByTestId('star-rating-4').click();
    
    // Add feedback
    await page.getByTestId('textarea-recipe-feedback').fill('This recipe was delicious and easy to make!');
    await page.getByTestId('button-submit-feedback').click();
    
    // Verify feedback was saved
    await expect(page.getByText('Thank you for your feedback')).toBeVisible();
    
    // Verify rating is displayed
    await expect(page.getByTestId('recipe-rating')).toHaveAttribute('data-rating', '4');
  });

  test('should suggest recipes for expiring ingredients', async ({ page }) => {
    // Send a message asking about expiring items
    await page.getByTestId('chat-input').fill('What can I make with my expiring ingredients?');
    await page.getByTestId('button-send-message').click();
    
    // Wait for response
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
    
    // Should mention expiring items if any exist
    const response = await page.getByTestId('chat-message-assistant').last().textContent();
    
    // If there are expiring items, response should include recipe suggestions
    if (response?.includes('expiring')) {
      expect(response).toMatch(/recipe|make|cook|prepare/i);
    }
  });

  test('should clear chat history', async ({ page }) => {
    // Send a few messages
    await page.getByTestId('chat-input').fill('Hello');
    await page.getByTestId('button-send-message').click();
    
    await page.getByTestId('chat-input').fill('What recipes do you have?');
    await page.getByTestId('button-send-message').click();
    
    // Wait for messages to appear
    await expect(page.getByTestId('chat-message-user')).toHaveCount(2, { timeout: 10000 });
    
    // Clear chat
    await page.getByTestId('button-clear-chat').click();
    await page.getByTestId('button-confirm-clear').click();
    
    // Verify chat is cleared
    await expect(page.getByTestId('empty-chat-message')).toBeVisible();
    await expect(page.getByTestId('chat-message-user')).toHaveCount(0);
    await expect(page.getByTestId('chat-message-assistant')).toHaveCount(0);
  });
});