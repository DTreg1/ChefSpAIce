import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

export interface ShareOptions {
  title?: string;
  text?: string;
  url?: string;
  dialogTitle?: string;
}

class ShareService {
  async canShare(): Promise<boolean> {
    if (Capacitor.isNativePlatform()) {
      return true;
    }
    
    // Check if Web Share API is available
    return 'share' in navigator;
  }

  async shareRecipe(recipe: {
    title: string;
    ingredients: string[];
    instructions: string[];
    url?: string;
  }): Promise<void> {
    const text = this.formatRecipeText(recipe);
    
    await this.share({
      title: `Recipe: ${recipe.title}`,
      text,
      url: recipe.url || window.location.href,
      dialogTitle: 'Share this recipe'
    });
  }

  async shareShoppingList(items: string[]): Promise<void> {
    const text = this.formatShoppingListText(items);
    
    await this.share({
      title: 'My Shopping List',
      text,
      dialogTitle: 'Share shopping list'
    });
  }

  async shareText(text: string, title?: string): Promise<void> {
    await this.share({
      title: title || 'Share from ChefSpAIce',
      text,
      dialogTitle: 'Share'
    });
  }

  private async share(options: ShareOptions): Promise<void> {
    try {
      if (Capacitor.isNativePlatform()) {
        // Use Capacitor Share plugin on native platforms
        await Share.share({
          title: options.title,
          text: options.text,
          url: options.url,
          dialogTitle: options.dialogTitle
        });
      } else if ('share' in navigator) {
        // Use Web Share API on web
        await navigator.share({
          title: options.title,
          text: options.text,
          url: options.url
        });
      } else {
        // Fallback: copy to clipboard
        await this.fallbackToClipboard(options.text || '');
      }
    } catch (error: Error | unknown) {
      // User cancelled or error occurred
      if ((error instanceof Error ? error.message : String(error)) !== 'Share canceled') {
        console.error('Error sharing:', String(error));
        throw error;
      }
    }
  }

  private async fallbackToClipboard(text: string): Promise<void> {
    try {
      await navigator.clipboard.writeText(text);
      // console.log('Content copied to clipboard');
      // You might want to show a toast notification here
    } catch (error) {
      console.error('Failed to copy to clipboard:', String(error));
      throw new Error('Sharing not supported on this device');
    }
  }

  private formatRecipeText(recipe: {
    title: string;
    ingredients: string[];
    instructions: string[];
  }): string {
    let text = `🍳 ${recipe.title}\n\n`;
    
    text += '📝 Ingredients:\n';
    recipe.ingredients.forEach((ing, i) => {
      text += `${i + 1}. ${ing}\n`;
    });
    
    text += '\n👨‍🍳 Instructions:\n';
    recipe.instructions.forEach((inst, i) => {
      text += `${i + 1}. ${inst}\n`;
    });
    
    text += '\n✨ Shared from ChefSpAIce - Your Smart Kitchen Assistant';
    
    return text;
  }

  private formatShoppingListText(items: string[]): string {
    let text = '🛒 Shopping List\n\n';
    
    items.forEach((item, _i) => {
      text += `☐ ${item}\n`;
    });
    
    text += '\n✨ Shared from ChefSpAIce';
    
    return text;
  }
}

// Singleton instance
export const shareService = new ShareService();
