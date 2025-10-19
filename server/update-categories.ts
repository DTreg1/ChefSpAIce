// Script to update categories in onboarding items to use 5 major food groups
import { normalizeCategory } from './category-mapping';

// Map of old categories to new 5 major food groups
const categoryMap: Record<string, string> = {
  'Grains & Carbs': 'Grains',
  'Oils & Vinegars': 'Protein', // Oils are healthy fats
  'Spices & Seasonings': 'Vegetables',
  'Baking Essentials': 'Grains',
  'Canned Goods': 'Various', // Will need item-specific mapping
  'Condiments & Sauces': 'Vegetables',
  'Nuts & Seeds': 'Protein',
  'Vegetables': 'Vegetables',
  'Fruits': 'Fruits',
  'Prepared Foods': 'Vegetables', // Broths
  'Dairy & Eggs': 'Dairy',
  'Proteins': 'Protein',
  'Frozen Foods': 'Various', // Will need item-specific mapping
  'Snacks & Sweets': 'Grains'
};

// Item-specific mappings for Canned Goods
const cannedGoodsMap: Record<string, string> = {
  'Canned Tomatoes': 'Vegetables',
  'Tomato Paste': 'Vegetables',
  'Tomato Sauce': 'Vegetables',
  'Black Beans': 'Protein',
  'Chickpeas': 'Protein',
  'Kidney Beans': 'Protein',
  'Corn': 'Vegetables',
  'Green Beans': 'Vegetables',
  'Tuna': 'Protein',
  'Coconut Milk': 'Dairy'
};

// Item-specific mappings for Frozen Foods
const frozenFoodsMap: Record<string, string> = {
  'Frozen Peas': 'Vegetables',
  'Frozen Corn': 'Vegetables',
  'Frozen Broccoli': 'Vegetables',
  'Frozen Mixed Vegetables': 'Vegetables',
  'Frozen Green Beans': 'Vegetables',
  'Frozen Spinach': 'Vegetables',
  'Chicken Breast': 'Protein',
  'Chicken Thighs': 'Protein',
  'Ground Beef': 'Protein',
  'Ground Turkey': 'Protein',
  'Pork Chops': 'Protein',
  'Bacon': 'Protein',
  'Italian Sausage': 'Protein',
  'Salmon': 'Protein',
  'Shrimp': 'Protein',
  'Tilapia': 'Protein',
  'Frozen Pizza': 'Grains',
  'Frozen Lasagna': 'Grains',
  'Vanilla Ice Cream': 'Dairy',
  'Frozen Berries': 'Fruits'
};

export function getNewCategory(displayName: string, oldCategory: string): string {
  // Check item-specific mappings first
  if (oldCategory === 'Canned Goods' && cannedGoodsMap[displayName]) {
    return cannedGoodsMap[displayName];
  }
  if ((oldCategory === 'Frozen Foods' || oldCategory.includes('Frozen')) && frozenFoodsMap[displayName]) {
    return frozenFoodsMap[displayName];
  }
  
  // Use the general category map
  if (categoryMap[oldCategory] && categoryMap[oldCategory] !== 'Various') {
    return categoryMap[oldCategory];
  }
  
  // Fall back to normalization
  return normalizeCategory(oldCategory);
}