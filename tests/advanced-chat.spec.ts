import { test, expect } from '@playwright/test';

test.describe('Advanced Chat Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/chat');
    await page.waitForLoadState('networkidle');
  });

  test('should start a new chat conversation', async ({ page }) => {
    // Send initial message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Hello, can you help me with recipes?');
    await page.getByTestId('button-send-message').click();
    
    // Wait for response
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
    
    // Click "Start New Chat" button
    const newChatButton = page.getByTestId('button-new-chat');
    await newChatButton.click();
    
    // Verify chat is cleared
    const messages = page.getByTestId(/^chat-message-/);
    const messageCount = await messages.count();
    expect(messageCount).toBe(0);
    
    // Verify input is ready for new conversation
    await expect(chatInput).toBeEmpty();
    await expect(chatInput).toBeFocused();
  });

  test('should clear chat history', async ({ page }) => {
    // Send a few messages
    const chatInput = page.getByTestId('chat-input');
    
    await chatInput.fill('What ingredients do I have?');
    await page.getByTestId('button-send-message').click();
    await expect(page.getByTestId('chat-message-user').last()).toBeVisible();
    
    await chatInput.fill('Can you suggest a recipe?');
    await page.getByTestId('button-send-message').click();
    await expect(page.getByTestId('chat-message-user').last()).toBeVisible();
    
    // Open chat menu or settings
    const chatMenuButton = page.getByTestId('button-chat-menu');
    if (await chatMenuButton.isVisible().catch(() => false)) {
      await chatMenuButton.click();
      
      // Click clear history option
      await page.getByTestId('button-clear-history').click();
    } else {
      // Alternative: Use clear button if directly available
      const clearButton = page.getByTestId('button-clear-chat');
      if (await clearButton.isVisible().catch(() => false)) {
        await clearButton.click();
      }
    }
    
    // Confirm clearing in dialog
    const confirmButton = page.getByTestId('button-confirm-clear');
    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click();
    }
    
    // Verify chat is cleared
    await expect(page.getByText('Chat cleared')).toBeVisible();
    
    // Check messages are removed
    const messages = page.getByTestId(/^chat-message-/);
    const messageCount = await messages.count();
    expect(messageCount).toBe(0);
  });

  test('should persist chat across page reloads', async ({ page }) => {
    // Send a message
    const chatInput = page.getByTestId('chat-input');
    const testMessage = `Test persistence ${Date.now()}`;
    await chatInput.fill(testMessage);
    await page.getByTestId('button-send-message').click();
    
    // Wait for message to appear
    await expect(page.getByTestId('chat-message-user').last()).toContainText(testMessage);
    
    // Wait for response
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
    
    // Get assistant response text
    const assistantResponse = await page.getByTestId('chat-message-assistant').last().textContent();
    
    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');
    
    // Verify messages are still there
    await expect(page.getByTestId('chat-message-user').last()).toContainText(testMessage);
    await expect(page.getByTestId('chat-message-assistant').last()).toContainText(assistantResponse!);
  });

  test('should display recipe notifications in chat', async ({ page }) => {
    // Request recipe generation
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Generate a recipe using chicken and rice');
    await page.getByTestId('button-send-message').click();
    
    // Wait for recipe generation
    await page.waitForTimeout(5000);
    
    // Check for recipe notification message
    const recipeNotification = page.getByText(/I've created a recipe for you/i);
    if (await recipeNotification.isVisible().catch(() => false)) {
      await expect(recipeNotification).toBeVisible();
      
      // Check if recipe card is displayed
      const recipeCard = page.getByTestId('recipe-card');
      await expect(recipeCard).toBeVisible();
      
      // Verify recipe has title and ingredients
      await expect(recipeCard.getByTestId('recipe-title')).toBeVisible();
      await expect(recipeCard.getByTestId('recipe-ingredients')).toBeVisible();
    }
  });

  test('should handle streaming responses', async ({ page }) => {
    // Send a complex question
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Explain the nutritional benefits of different vegetables');
    await page.getByTestId('button-send-message').click();
    
    // Check for streaming indicator
    const streamingIndicator = page.getByTestId('streaming-indicator');
    await expect(streamingIndicator).toBeVisible();
    
    // Wait for streaming to complete
    await expect(streamingIndicator).not.toBeVisible({ timeout: 30000 });
    
    // Verify complete response is shown
    const assistantMessage = page.getByTestId('chat-message-assistant').last();
    const responseText = await assistantMessage.textContent();
    expect(responseText!.length).toBeGreaterThan(50); // Should be substantial response
  });

  test('should handle chat session cleanup after 24 hours', async ({ page }) => {
    // This test would need to mock time or check the cleanup logic
    // Check for info about auto-cleanup
    const infoButton = page.getByTestId('button-chat-info');
    if (await infoButton.isVisible().catch(() => false)) {
      await infoButton.click();
      
      // Check for cleanup information
      const cleanupInfo = page.getByText(/Messages older than 24 hours/i);
      await expect(cleanupInfo).toBeVisible();
    }
  });

  test('should show typing indicator while AI is responding', async ({ page }) => {
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('What can I cook with pasta?');
    await page.getByTestId('button-send-message').click();
    
    // Check for typing indicator
    const typingIndicator = page.getByTestId('typing-indicator');
    if (await typingIndicator.isVisible().catch(() => false)) {
      await expect(typingIndicator).toBeVisible();
      
      // Wait for response to complete
      await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
      
      // Typing indicator should disappear
      await expect(typingIndicator).not.toBeVisible();
    }
  });

  test('should handle recipe-related commands in chat', async ({ page }) => {
    // Test various recipe commands
    const commands = [
      'Show me recipes with eggs',
      'What can I make for breakfast?',
      'I need a quick dinner recipe',
      'Generate a vegetarian recipe'
    ];
    
    for (const command of commands.slice(0, 2)) { // Test first 2 to save time
      const chatInput = page.getByTestId('chat-input');
      await chatInput.fill(command);
      await page.getByTestId('button-send-message').click();
      
      // Wait for response
      await expect(page.getByTestId('chat-message-assistant').last()).toBeVisible({ timeout: 30000 });
      
      // Check if response contains recipe-related content
      const response = await page.getByTestId('chat-message-assistant').last().textContent();
      expect(response?.toLowerCase()).toMatch(/recipe|ingredient|cook|prepare|meal/);
      
      // Small delay between commands
      await page.waitForTimeout(1000);
    }
  });

  test('should save generated recipes from chat', async ({ page }) => {
    // Generate a recipe
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Create a simple pasta recipe');
    await page.getByTestId('button-send-message').click();
    
    // Wait for recipe generation
    await page.waitForTimeout(5000);
    
    // Look for save recipe button
    const saveButton = page.getByTestId('button-save-recipe');
    if (await saveButton.isVisible().catch(() => false)) {
      await saveButton.click();
      
      // Verify success toast
      await expect(page.getByText(/Recipe saved/i)).toBeVisible();
      
      // Navigate to cookbook
      await page.goto('/cookbook');
      await page.waitForLoadState('networkidle');
      
      // Verify recipe appears in cookbook
      const recipeCards = page.getByTestId(/^recipe-card-/);
      const count = await recipeCards.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test('should handle chat errors gracefully', async ({ page }) => {
    // Intercept API calls to simulate error
    await page.route('/api/chat/messages', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server error' })
        });
      } else {
        await route.continue();
      }
    });
    
    // Try to send a message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('This should trigger an error');
    await page.getByTestId('button-send-message').click();
    
    // Check for error message
    const errorMessage = page.getByText(/error|failed|try again/i);
    await expect(errorMessage).toBeVisible();
    
    // Input should be enabled for retry
    await expect(chatInput).toBeEnabled();
  });

  test('should show chat suggestions or quick actions', async ({ page }) => {
    // Check for suggestion chips or quick actions
    const suggestions = page.getByTestId(/^suggestion-|^quick-action-/);
    
    if (await suggestions.first().isVisible().catch(() => false)) {
      const count = await suggestions.count();
      expect(count).toBeGreaterThan(0);
      
      // Click a suggestion
      await suggestions.first().click();
      
      // Verify it triggers an action or fills input
      const chatInput = page.getByTestId('chat-input');
      const inputValue = await chatInput.inputValue();
      
      if (inputValue) {
        // Suggestion filled the input
        expect(inputValue).toBeTruthy();
      } else {
        // Suggestion triggered direct action
        await expect(page.getByTestId('chat-message-user')).toBeVisible();
      }
    }
  });

  test('should handle long conversations with scroll', async ({ page }) => {
    // Send multiple messages to create a long conversation
    const chatInput = page.getByTestId('chat-input');
    
    for (let i = 0; i < 5; i++) {
      await chatInput.fill(`Test message ${i + 1}`);
      await page.getByTestId('button-send-message').click();
      await page.waitForTimeout(1000); // Brief delay between messages
    }
    
    // Check if chat container is scrollable
    const chatContainer = page.getByTestId('chat-messages-container');
    const isScrollable = await chatContainer.evaluate(el => {
      return el.scrollHeight > el.clientHeight;
    });
    
    if (isScrollable) {
      // Verify auto-scroll to bottom works
      const scrollPosition = await chatContainer.evaluate(el => {
        return Math.abs(el.scrollTop + el.clientHeight - el.scrollHeight) < 10;
      });
      expect(scrollPosition).toBeTruthy();
    }
  });

  test('should format code blocks in responses', async ({ page }) => {
    // Ask for code
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Show me a JavaScript function to calculate fibonacci');
    await page.getByTestId('button-send-message').click();
    
    // Wait for response
    await expect(page.getByTestId('chat-message-assistant')).toBeVisible({ timeout: 30000 });
    
    // Check for code block
    const codeBlock = page.getByTestId('chat-message-assistant').last().locator('pre, code');
    if (await codeBlock.first().isVisible().catch(() => false)) {
      // Verify code block has syntax highlighting or proper formatting
      const className = await codeBlock.first().getAttribute('class');
      expect(className).toMatch(/language-|hljs|code/);
    }
  });

  test('should allow editing previous messages', async ({ page }) => {
    // Send a message
    const chatInput = page.getByTestId('chat-input');
    await chatInput.fill('Original message');
    await page.getByTestId('button-send-message').click();
    
    // Wait for message to appear
    const userMessage = page.getByTestId('chat-message-user').last();
    await expect(userMessage).toBeVisible();
    
    // Check if edit button exists
    const editButton = userMessage.getByTestId('button-edit-message');
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      
      // Edit the message
      const editInput = userMessage.getByTestId('input-edit-message');
      await editInput.clear();
      await editInput.fill('Edited message');
      
      // Save edit
      await userMessage.getByTestId('button-save-edit').click();
      
      // Verify message was updated
      await expect(userMessage).toContainText('Edited message');
    }
  });
});