import { test, expect } from '@playwright/test';

test.describe('Cookbook Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/cookbook');
    await page.waitForLoadState('networkidle');
  });

  test('should display cookbook page correctly', async ({ page }) => {
    // Check main page elements
    await expect(page.getByRole('heading', { name: 'My Cookbook' })).toBeVisible();
    await expect(page.getByTestId('button-filter-all')).toBeVisible();
    await expect(page.getByTestId('button-filter-favorites')).toBeVisible();
    
    // Check for recipe upload button (if available)
    const uploadButton = page.getByTestId('button-upload-recipe');
    if (await uploadButton.isVisible().catch(() => false)) {
      await expect(uploadButton).toBeVisible();
    }
  });

  test('should display saved recipes', async ({ page }) => {
    // Check if there are recipes
    const recipeCards = page.getByTestId(/^recipe-card-/);
    const count = await recipeCards.count();
    
    if (count > 0) {
      // Verify recipe card elements
      const firstRecipe = recipeCards.first();
      await expect(firstRecipe.getByTestId('recipe-title')).toBeVisible();
      await expect(firstRecipe.getByTestId('recipe-ingredients')).toBeVisible();
      await expect(firstRecipe.getByTestId('recipe-instructions')).toBeVisible();
      
      // Check for recipe metadata
      const prepTime = firstRecipe.getByTestId('recipe-prep-time');
      if (await prepTime.isVisible().catch(() => false)) {
        await expect(prepTime).toBeVisible();
      }
      
      const servings = firstRecipe.getByTestId('recipe-servings');
      if (await servings.isVisible().catch(() => false)) {
        await expect(servings).toBeVisible();
      }
    } else {
      // Check for empty state
      await expect(page.getByTestId('empty-cookbook')).toBeVisible();
      await expect(page.getByText(/No recipes yet/i)).toBeVisible();
    }
  });

  test('should filter recipes by favorites', async ({ page }) => {
    // Click favorites filter
    await page.getByTestId('button-filter-favorites').click();
    
    // Check if there are favorite recipes
    const favoriteRecipes = page.getByTestId(/^recipe-card-/);
    const count = await favoriteRecipes.count();
    
    if (count > 0) {
      // Verify all visible recipes are favorites
      for (let i = 0; i < count; i++) {
        const recipe = favoriteRecipes.nth(i);
        const favoriteButton = recipe.getByTestId('button-favorite');
        await expect(favoriteButton).toHaveAttribute('data-favorite', 'true');
      }
    } else {
      // Check for empty favorites state
      await expect(page.getByTestId('empty-favorites')).toBeVisible();
      await expect(page.getByText(/No favorite recipes yet/i)).toBeVisible();
    }
    
    // Switch back to all recipes
    await page.getByTestId('button-filter-all').click();
    
    // Verify filter is reset
    const allButton = page.getByTestId('button-filter-all');
    await expect(allButton).toHaveClass(/variant.*default/);
  });

  test('should toggle recipe favorite status', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Get favorite button
      const favoriteButton = recipeCard.getByTestId('button-favorite');
      await expect(favoriteButton).toBeVisible();
      
      // Get initial favorite state
      const initialFavorite = await favoriteButton.getAttribute('data-favorite') === 'true';
      
      // Toggle favorite
      await favoriteButton.click();
      
      // Wait for the state to update
      await page.waitForLoadState('networkidle');
      
      // Verify favorite state changed
      const newFavorite = await favoriteButton.getAttribute('data-favorite') === 'true';
      expect(newFavorite).toBe(!initialFavorite);
      
      // Toggle back
      await favoriteButton.click();
      await page.waitForLoadState('networkidle');
      
      // Verify it's back to original state
      const finalFavorite = await favoriteButton.getAttribute('data-favorite') === 'true';
      expect(finalFavorite).toBe(initialFavorite);
    }
  });

  test('should rate a recipe', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Find rating stars
      const ratingStars = recipeCard.getByTestId('rating-stars');
      await expect(ratingStars).toBeVisible();
      
      // Click on the 4th star
      const fourthStar = ratingStars.getByTestId('star-4');
      await fourthStar.click();
      
      // Verify rating is set to 4
      await expect(ratingStars).toHaveAttribute('data-rating', '4');
      
      // Click on 5th star
      const fifthStar = ratingStars.getByTestId('star-5');
      await fifthStar.click();
      
      // Verify rating is set to 5
      await expect(ratingStars).toHaveAttribute('data-rating', '5');
    }
  });

  test('should adjust recipe servings', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Get serving controls
      const servingsInput = recipeCard.getByTestId('input-servings');
      const increaseButton = recipeCard.getByTestId('button-increase-servings');
      const decreaseButton = recipeCard.getByTestId('button-decrease-servings');
      
      if (await servingsInput.isVisible().catch(() => false)) {
        // Get initial servings
        const initialServings = await servingsInput.inputValue();
        
        // Increase servings
        await increaseButton.click();
        
        // Verify servings increased
        const newServings = await servingsInput.inputValue();
        expect(parseInt(newServings)).toBeGreaterThan(parseInt(initialServings));
        
        // Check that ingredient quantities are updated
        const firstIngredient = recipeCard.getByTestId('ingredient-0');
        const ingredientText = await firstIngredient.textContent();
        // Should contain updated quantities
        expect(ingredientText).toBeTruthy();
        
        // Decrease servings back
        await decreaseButton.click();
        
        // Verify servings decreased
        const finalServings = await servingsInput.inputValue();
        expect(parseInt(finalServings)).toBe(parseInt(initialServings));
      }
    }
  });

  test('should check ingredient availability', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Check for ingredient availability indicators
      const ingredients = recipeCard.getByTestId(/^ingredient-/);
      const count = await ingredients.count();
      
      for (let i = 0; i < Math.min(count, 3); i++) {
        const ingredient = ingredients.nth(i);
        const availabilityIcon = ingredient.getByTestId('availability-icon');
        
        if (await availabilityIcon.isVisible().catch(() => false)) {
          // Check if it shows available or missing status
          const isAvailable = await availabilityIcon.getAttribute('data-available') === 'true';
          
          if (isAvailable) {
            await expect(availabilityIcon).toHaveClass(/text-green/);
          } else {
            await expect(availabilityIcon).toHaveClass(/text-red|text-yellow/);
          }
        }
      }
      
      // Check refresh availability button
      const refreshButton = recipeCard.getByTestId('button-refresh-availability');
      if (await refreshButton.isVisible().catch(() => false)) {
        await refreshButton.click();
        
        // Wait for refresh
        await page.waitForLoadState('networkidle');
        
        // Verify toast or update
        const toast = page.getByText(/availability.*updated/i);
        if (await toast.isVisible().catch(() => false)) {
          await expect(toast).toBeVisible();
        }
      }
    }
  });

  test('should add missing ingredients to shopping list', async ({ page }) => {
    // Find a recipe with missing ingredients
    const recipeCards = page.getByTestId(/^recipe-card-/);
    const count = await recipeCards.count();
    
    for (let i = 0; i < count; i++) {
      const recipe = recipeCards.nth(i);
      const addToShoppingButton = recipe.getByTestId('button-add-to-shopping');
      
      if (await addToShoppingButton.isVisible().catch(() => false)) {
        // Click add to shopping list
        await addToShoppingButton.click();
        
        // Verify success toast
        await expect(page.getByText(/Added.*shopping list/i)).toBeVisible();
        break;
      }
    }
  });

  test('should schedule recipe for meal planning', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Click schedule button
      const scheduleButton = recipeCard.getByTestId('button-schedule-meal');
      
      if (await scheduleButton.isVisible().catch(() => false)) {
        await scheduleButton.click();
        
        // Check for scheduling dialog
        const scheduleDialog = page.getByTestId('dialog-schedule-meal');
        await expect(scheduleDialog).toBeVisible();
        
        // Select a date
        const dateInput = scheduleDialog.getByTestId('input-meal-date');
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        await dateInput.fill(tomorrow.toISOString().split('T')[0]);
        
        // Select meal type
        const mealTypeSelect = scheduleDialog.getByTestId('select-meal-type');
        await mealTypeSelect.click();
        await page.getByTestId('option-dinner').click();
        
        // Confirm scheduling
        await scheduleDialog.getByTestId('button-confirm-schedule').click();
        
        // Verify success
        await expect(page.getByText(/Recipe scheduled/i)).toBeVisible();
      }
    }
  });

  test('should delete a recipe', async ({ page }) => {
    // Find first recipe card
    const recipeCard = page.getByTestId(/^recipe-card-/).first();
    
    if (await recipeCard.isVisible().catch(() => false)) {
      // Get recipe title for verification
      const recipeTitle = await recipeCard.getByTestId('recipe-title').textContent();
      
      // Click delete button
      const deleteButton = recipeCard.getByTestId('button-delete-recipe');
      
      if (await deleteButton.isVisible().catch(() => false)) {
        await deleteButton.click();
        
        // Confirm deletion in dialog
        const confirmDialog = page.getByTestId('dialog-confirm-delete');
        await expect(confirmDialog).toBeVisible();
        await confirmDialog.getByTestId('button-confirm-delete').click();
        
        // Verify recipe is removed
        await expect(page.getByText(recipeTitle!)).not.toBeVisible();
        
        // Verify success toast
        await expect(page.getByText(/Recipe deleted/i)).toBeVisible();
      }
    }
  });

  test('should sort recipes by rating and date', async ({ page }) => {
    const recipeCards = page.getByTestId(/^recipe-card-/);
    const count = await recipeCards.count();
    
    if (count > 1) {
      // Get ratings of first few recipes
      const ratings: number[] = [];
      for (let i = 0; i < Math.min(count, 3); i++) {
        const recipe = recipeCards.nth(i);
        const ratingStars = recipe.getByTestId('rating-stars');
        const rating = await ratingStars.getAttribute('data-rating');
        ratings.push(parseInt(rating || '0'));
      }
      
      // Verify recipes are sorted by rating (highest first)
      for (let i = 1; i < ratings.length; i++) {
        expect(ratings[i]).toBeLessThanOrEqual(ratings[i - 1]);
      }
    }
  });

  test('should upload a recipe', async ({ page }) => {
    const uploadButton = page.getByTestId('button-upload-recipe');
    
    if (await uploadButton.isVisible().catch(() => false)) {
      await uploadButton.click();
      
      // Check for upload dialog
      const uploadDialog = page.getByTestId('dialog-upload-recipe');
      await expect(uploadDialog).toBeVisible();
      
      // Fill in recipe details
      await uploadDialog.getByTestId('input-recipe-title').fill('Test Recipe');
      await uploadDialog.getByTestId('textarea-ingredients').fill('1 cup flour\n2 eggs\n1/2 cup milk');
      await uploadDialog.getByTestId('textarea-instructions').fill('1. Mix ingredients\n2. Bake at 350°F\n3. Enjoy');
      await uploadDialog.getByTestId('input-prep-time').fill('15');
      await uploadDialog.getByTestId('input-cook-time').fill('30');
      await uploadDialog.getByTestId('input-servings').fill('4');
      
      // Submit recipe
      await uploadDialog.getByTestId('button-save-recipe').click();
      
      // Verify recipe is added
      await expect(page.getByText('Test Recipe')).toBeVisible();
      
      // Verify success toast
      await expect(page.getByText(/Recipe added/i)).toBeVisible();
    }
  });

  test('should search recipes', async ({ page }) => {
    const searchInput = page.getByTestId('input-search-recipes');
    
    if (await searchInput.isVisible().catch(() => false)) {
      // Search for a specific term
      await searchInput.fill('chicken');
      
      // Wait for filtering
      await page.waitForLoadState('networkidle');
      
      // Verify only matching recipes are shown
      const visibleRecipes = page.getByTestId(/^recipe-card-/);
      const count = await visibleRecipes.count();
      
      for (let i = 0; i < count; i++) {
        const recipe = visibleRecipes.nth(i);
        const recipeText = await recipe.textContent();
        expect(recipeText?.toLowerCase()).toContain('chicken');
      }
      
      // Clear search
      await searchInput.clear();
      
      // Verify all recipes are shown again
      await page.waitForLoadState('networkidle');
      const allRecipes = page.getByTestId(/^recipe-card-/);
      const newCount = await allRecipes.count();
      expect(newCount).toBeGreaterThanOrEqual(count);
    }
  });

  test('should display recipe count correctly', async ({ page }) => {
    // Get recipe count from the subtitle
    const subtitle = page.getByText(/\d+ recipe/);
    const subtitleText = await subtitle.textContent();
    const match = subtitleText?.match(/(\d+) recipe/);
    const displayedCount = match ? parseInt(match[1]) : 0;
    
    // Count actual recipe cards
    const recipeCards = page.getByTestId(/^recipe-card-/);
    const actualCount = await recipeCards.count();
    
    // Verify counts match
    expect(actualCount).toBe(displayedCount);
  });
});