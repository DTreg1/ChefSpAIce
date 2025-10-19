// Expanded onboarding items with categories for better organization
export interface OnboardingItem {
  displayName: string;
  upc?: string;  // Optional UPC barcode (when available)
  fdcId?: string;  // Optional FDC ID for USDA database lookups
  description: string;
  storage: string;
  quantity: string;
  unit: string;
  expirationDays: number;
  category: string;
}

export const expandedOnboardingItems: OnboardingItem[] = [
  // Pantry - Grains & Carbs
  { displayName: "All-Purpose Flour", upc: "016000502406", fdcId: "168896", description: "Wheat flour, white, all-purpose, enriched, bleached", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "White Rice", fdcId: "169756", description: "Rice, white, long-grain, regular, enriched, cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Brown Rice", fdcId: "168878", description: "Rice, brown, long-grain, cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "Pasta", upc: "076808533316", fdcId: "168940", description: "Pasta, cooked, enriched", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Quinoa", fdcId: "168917", description: "Quinoa, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Oats", upc: "030000010204", fdcId: "173904", description: "Cereals, oats, regular and quick, not cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Bread Flour", fdcId: "168897", description: "Wheat flour, white, bread, enriched", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "Couscous", fdcId: "169701", description: "Couscous, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Barley", fdcId: "170283", description: "Barley, pearled, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },

  // Pantry - Oils & Vinegars  
  { displayName: "Olive Oil", upc: "041618000185", fdcId: "171413", description: "Oil, olive, salad or cooking", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "Vegetable Oil", fdcId: "171025", description: "Oil, vegetable, soybean, refined", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "Coconut Oil", fdcId: "171412", description: "Oil, coconut", storage: "Pantry", quantity: "1", unit: "jar", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Sesame Oil", fdcId: "171016", description: "Oil, sesame, salad or cooking", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "White Vinegar", fdcId: "169217", description: "Vinegar, distilled", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Apple Cider Vinegar", fdcId: "173797", description: "Vinegar, cider", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Balsamic Vinegar", fdcId: "173891", description: "Vinegar, balsamic", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Rice Vinegar", fdcId: "168918", description: "Vinegar, rice", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },

  // Pantry - Spices & Seasonings
  { displayName: "Salt", fdcId: "173410", description: "Salt, table", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Black Pepper", fdcId: "170931", description: "Spices, pepper, black", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Garlic Powder", fdcId: "171325", description: "Spices, garlic powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Onion Powder", fdcId: "171324", description: "Spices, onion powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Paprika", fdcId: "171329", description: "Spices, paprika", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cumin", fdcId: "171321", description: "Spices, cumin seed", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Oregano", fdcId: "171328", description: "Spices, oregano, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Basil", fdcId: "171318", description: "Spices, basil, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Thyme", fdcId: "171333", description: "Spices, thyme, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cinnamon", fdcId: "171320", description: "Spices, cinnamon, ground", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Chili Powder", fdcId: "171319", description: "Spices, chili powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cayenne Pepper", fdcId: "170933", description: "Spices, pepper, red or cayenne", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },

  // Pantry - Baking Essentials
  { displayName: "Sugar", fdcId: "169655", description: "Sugars, granulated", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Brown Sugar", fdcId: "169656", description: "Sugars, brown", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Baking Essentials" },
  { displayName: "Powdered Sugar", fdcId: "169658", description: "Sugars, powdered", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Honey", fdcId: "169640", description: "Honey", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Vanilla Extract", fdcId: "170922", description: "Vanilla extract", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Baking Soda", fdcId: "173778", description: "Leavening agents, baking soda", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Baking Powder", fdcId: "172315", description: "Leavening agents, baking powder, double-acting", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 365, category: "Baking Essentials" },
  { displayName: "Cocoa Powder", fdcId: "169593", description: "Cocoa, dry powder, unsweetened", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Chocolate Chips", fdcId: "167568", description: "Chocolate, dark, 45-59% cacao solids", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Baking Essentials" },

  // Pantry - Canned Goods
  { displayName: "Canned Tomatoes", fdcId: "170457", description: "Tomatoes, red, ripe, canned, whole, regular pack", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Tomato Paste", fdcId: "169067", description: "Tomato products, canned, paste", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Tomato Sauce", fdcId: "174890", description: "Tomato products, canned, sauce", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Black Beans", fdcId: "173735", description: "Beans, black, mature seeds, cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Chickpeas", fdcId: "173757", description: "Chickpeas (garbanzo beans), cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Kidney Beans", fdcId: "175186", description: "Beans, kidney, red, mature seeds, cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Corn", fdcId: "169239", description: "Corn, sweet, yellow, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Green Beans", fdcId: "169961", description: "Beans, snap, green, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Tuna", fdcId: "175159", description: "Fish, tuna, light, canned in water", storage: "Pantry", quantity: "4", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Coconut Milk", fdcId: "170170", description: "Nuts, coconut milk, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },

  // Pantry - Sauces & Condiments
  { displayName: "Soy Sauce", fdcId: "174275", description: "Soy sauce made from soy and wheat (shoyu)", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Condiments & Sauces" },
  { displayName: "Hot Sauce", fdcId: "171974", description: "Sauce, ready-to-serve, pepper or hot", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Condiments & Sauces" },
  { displayName: "Worcestershire Sauce", fdcId: "174046", description: "Sauce, worcestershire", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Condiments & Sauces" },
  { displayName: "Fish Sauce", fdcId: "173847", description: "Fish sauce", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Condiments & Sauces" },

  // Pantry - Nuts & Seeds
  { displayName: "Peanut Butter", fdcId: "172470", description: "Peanut butter, smooth style", storage: "Pantry", quantity: "1", unit: "jar", expirationDays: 180, category: "Nuts & Seeds" },
  { displayName: "Almonds", fdcId: "170567", description: "Nuts, almonds", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Nuts & Seeds" },
  { displayName: "Walnuts", fdcId: "170187", description: "Nuts, walnuts, english", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 180, category: "Nuts & Seeds" },
  { displayName: "Cashews", fdcId: "170569", description: "Nuts, cashew nuts, raw", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Nuts & Seeds" },
  { displayName: "Crackers", fdcId: "168827", description: "Crackers, saltines", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 180, category: "Snacks & Sweets" },
  { displayName: "Granola Bars", fdcId: "168165", description: "Snacks, granola bars", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 180, category: "Snacks & Sweets" },

  // Pantry - Fresh Produce
  { displayName: "Onions", fdcId: "170000", description: "Onions, raw", storage: "Pantry", quantity: "3", unit: "whole", expirationDays: 30, category: "Vegetables" },
  { displayName: "Garlic", fdcId: "169228", description: "Garlic, raw", storage: "Pantry", quantity: "1", unit: "bulb", expirationDays: 30, category: "Vegetables" },
  { displayName: "Potatoes", fdcId: "170026", description: "Potatoes, flesh and skin, raw", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 21, category: "Vegetables" },
  { displayName: "Sweet Potatoes", fdcId: "170071", description: "Sweet potato, raw", storage: "Pantry", quantity: "3", unit: "whole", expirationDays: 14, category: "Vegetables" },
  { displayName: "Bananas", fdcId: "173944", description: "Bananas, raw", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 5, category: "Fruits" },
  { displayName: "Apples", fdcId: "171688", description: "Apples, raw, with skin", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 7, category: "Fruits" },
  { displayName: "Oranges", fdcId: "169097", description: "Oranges, raw, all commercial varieties", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 14, category: "Fruits" },
  { displayName: "Lemons", fdcId: "169098", description: "Lemons, raw, without peel", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 21, category: "Fruits" },
  { displayName: "Limes", fdcId: "169099", description: "Limes, raw", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 21, category: "Fruits" },
  { displayName: "Avocados", fdcId: "171705", description: "Avocados, raw, all commercial varieties", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 3, category: "Fruits" },
  { displayName: "Tomatoes", fdcId: "170457", description: "Tomatoes, red, ripe, raw", storage: "Counter", quantity: "4", unit: "whole", expirationDays: 5, category: "Vegetables" },

  // Pantry - Broths & Soups
  { displayName: "Chicken Broth", fdcId: "174179", description: "Soup, chicken broth, canned, condensed", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Prepared Foods" },
  { displayName: "Vegetable Broth", fdcId: "173876", description: "Soup, vegetable broth", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Prepared Foods" },
  { displayName: "Beef Broth", fdcId: "173859", description: "Soup, beef broth or bouillon", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Prepared Foods" },

  // Fridge - Dairy Products
  { displayName: "Whole Milk", upc: "746776", description: "Milk, whole, 3.25% milkfat", storage: "Fridge", quantity: "1", unit: "gallon", expirationDays: 7, category: "Dairy & Eggs" },
  { displayName: "2% Milk", upc: "746777", description: "Milk, reduced fat, fluid, 2% milkfat", storage: "Fridge", quantity: "1", unit: "gallon", expirationDays: 7, category: "Dairy & Eggs" },
  { displayName: "Heavy Cream", fdcId: "170859", description: "Cream, fluid, heavy whipping", storage: "Fridge", quantity: "1", unit: "pint", expirationDays: 7, category: "Dairy & Eggs" },
  { displayName: "Half and Half", fdcId: "172310", description: "Cream, fluid, half and half", storage: "Fridge", quantity: "1", unit: "pint", expirationDays: 7, category: "Dairy & Eggs" },
  { displayName: "Sour Cream", fdcId: "173419", description: "Sour cream, reduced fat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 21, category: "Dairy & Eggs" },
  { displayName: "Greek Yogurt", fdcId: "173433", description: "Yogurt, Greek, plain, nonfat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Dairy & Eggs" },
  { displayName: "Plain Yogurt", fdcId: "170903", description: "Yogurt, plain, whole milk", storage: "Fridge", quantity: "4", unit: "cups", expirationDays: 14, category: "Dairy & Eggs" },
  { displayName: "Cottage Cheese", fdcId: "173418", description: "Cheese, cottage, lowfat, 2% milkfat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Dairy & Eggs" },
  { displayName: "Cream Cheese", fdcId: "173431", description: "Cheese, cream", storage: "Fridge", quantity: "1", unit: "package", expirationDays: 30, category: "Dairy & Eggs" },
  { displayName: "Butter", fdcId: "173430", description: "Butter, with salt", storage: "Fridge", quantity: "1", unit: "lb", expirationDays: 60, category: "Dairy & Eggs" },

  // Fridge - Cheese
  { displayName: "Cheddar Cheese", fdcId: "173414", description: "Cheese, cheddar", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 30, category: "Dairy & Eggs" },
  { displayName: "Mozzarella Cheese", fdcId: "170901", description: "Cheese, mozzarella, whole milk", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 21, category: "Dairy & Eggs" },
  { displayName: "Parmesan Cheese", fdcId: "171250", description: "Cheese, parmesan, grated", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 60, category: "Dairy & Eggs" },
  { displayName: "Swiss Cheese", fdcId: "173423", description: "Cheese, swiss", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 30, category: "Dairy & Eggs" },
  { displayName: "Feta Cheese", fdcId: "173420", description: "Cheese, feta", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Dairy & Eggs" },

  // Fridge - Eggs
  { displayName: "Large Eggs", fdcId: "173424", description: "Egg, whole, raw, fresh", storage: "Fridge", quantity: "12", unit: "count", expirationDays: 21, category: "Dairy & Eggs" },
  { displayName: "Egg Whites", fdcId: "172183", description: "Egg, white, raw, fresh", storage: "Fridge", quantity: "1", unit: "carton", expirationDays: 14, category: "Dairy & Eggs" },

  // Fridge - Vegetables
  { displayName: "Carrots", fdcId: "170393", description: "Carrots, raw", storage: "Fridge", quantity: "1", unit: "lb", expirationDays: 21, category: "Vegetables" },
  { displayName: "Celery", fdcId: "169988", description: "Celery, raw", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 14, category: "Vegetables" },
  { displayName: "Bell Peppers", fdcId: "170108", description: "Peppers, sweet, red, raw", storage: "Fridge", quantity: "2", unit: "whole", expirationDays: 7, category: "Vegetables" },
  { displayName: "Lettuce", fdcId: "169247", description: "Lettuce, cos or romaine, raw", storage: "Fridge", quantity: "1", unit: "head", expirationDays: 7, category: "Vegetables" },
  { displayName: "Spinach", fdcId: "170469", description: "Spinach, raw", storage: "Fridge", quantity: "1", unit: "bag", expirationDays: 5, category: "Vegetables" },
  { displayName: "Broccoli", fdcId: "170379", description: "Broccoli, raw", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 7, category: "Vegetables" },
  { displayName: "Cauliflower", fdcId: "169986", description: "Cauliflower, raw", storage: "Fridge", quantity: "1", unit: "head", expirationDays: 7, category: "Vegetables" },
  { displayName: "Cucumbers", fdcId: "169225", description: "Cucumber, with peel, raw", storage: "Fridge", quantity: "2", unit: "whole", expirationDays: 7, category: "Vegetables" },
  { displayName: "Mushrooms", fdcId: "169251", description: "Mushrooms, white, raw", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 5, category: "Vegetables" },
  { displayName: "Green Onions", fdcId: "170000", description: "Onions, spring or scallions", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 7, category: "Vegetables" },

  // Fridge - Condiments
  { displayName: "Mayonnaise", fdcId: "173482", description: "Mayonnaise, regular", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 90, category: "Condiments & Sauces" },
  { displayName: "Mustard", fdcId: "170932", description: "Mustard, prepared, yellow", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 180, category: "Condiments & Sauces" },
  { displayName: "Ketchup", fdcId: "173893", description: "Catsup", storage: "Fridge", quantity: "1", unit: "bottle", expirationDays: 180, category: "Condiments & Sauces" },
  { displayName: "Salsa", fdcId: "171978", description: "Salsa, ready-to-serve", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 30, category: "Condiments & Sauces" },
  { displayName: "Pickles", fdcId: "169266", description: "Pickles, cucumber, dill", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 365, category: "Condiments & Sauces" },
  { displayName: "Olives", fdcId: "169095", description: "Olives, ripe, canned", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 365, category: "Condiments & Sauces" },

  // Freezer - Frozen Vegetables
  { displayName: "Frozen Peas", fdcId: "170420", description: "Peas, green, frozen, cooked", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Foods" },
  { displayName: "Frozen Corn", fdcId: "169999", description: "Corn, sweet, yellow, frozen, kernels cut off cob", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Foods" },
  { displayName: "Frozen Broccoli", fdcId: "168571", description: "Broccoli, frozen, chopped, cooked", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Foods" },
  { displayName: "Frozen Mixed Vegetables", fdcId: "169915", description: "Vegetables, mixed, frozen", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Foods" },
  { displayName: "Frozen Green Beans", fdcId: "169893", description: "Beans, snap, green, frozen", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Foods" },
  { displayName: "Frozen Spinach", fdcId: "170451", description: "Spinach, frozen, chopped or leaf", storage: "Freezer", quantity: "1", unit: "package", expirationDays: 365, category: "Frozen Foods" },

  // Freezer - Meat & Poultry
  { displayName: "Chicken Breast", fdcId: "171077", description: "Chicken, broilers or fryers, breast, meat only, raw", storage: "Freezer", quantity: "2", unit: "lbs", expirationDays: 180, category: "Proteins" },
  { displayName: "Chicken Thighs", fdcId: "174608", description: "Chicken, broilers or fryers, thigh, meat only, raw", storage: "Freezer", quantity: "2", unit: "lbs", expirationDays: 180, category: "Proteins" },
  { displayName: "Ground Beef", fdcId: "174032", description: "Beef, ground, 85% lean meat / 15% fat, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 120, category: "Proteins" },
  { displayName: "Ground Turkey", fdcId: "171079", description: "Turkey, all classes, ground, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 120, category: "Proteins" },
  { displayName: "Pork Chops", fdcId: "167892", description: "Pork, fresh, loin, center loin (chops)", storage: "Freezer", quantity: "4", unit: "pieces", expirationDays: 120, category: "Proteins" },
  { displayName: "Bacon", fdcId: "168277", description: "Pork, cured, bacon, cooked", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 30, category: "Proteins" },
  { displayName: "Italian Sausage", fdcId: "171631", description: "Sausage, Italian, pork, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 60, category: "Proteins" },

  // Freezer - Seafood
  { displayName: "Salmon", fdcId: "173691", description: "Fish, salmon, Atlantic, wild, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Proteins" },
  { displayName: "Shrimp", fdcId: "175180", description: "Crustaceans, shrimp, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Proteins" },
  { displayName: "Tilapia", fdcId: "175177", description: "Fish, tilapia, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Proteins" },

  // Freezer - Frozen Meals
  { displayName: "Frozen Pizza", fdcId: "173292", description: "Pizza, cheese topping, frozen", storage: "Freezer", quantity: "1", unit: "whole", expirationDays: 180, category: "Frozen Foods" },
  { displayName: "Frozen Lasagna", fdcId: "167540", description: "Lasagna, cheese, frozen, prepared", storage: "Freezer", quantity: "1", unit: "package", expirationDays: 180, category: "Frozen Foods" },

  // Freezer - Desserts
  { displayName: "Vanilla Ice Cream", fdcId: "170481", description: "Ice creams, vanilla", storage: "Freezer", quantity: "1", unit: "pint", expirationDays: 90, category: "Snacks & Sweets" },
  { displayName: "Frozen Berries", fdcId: "167629", description: "Blueberries, frozen, unsweetened", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Snacks & Sweets" },
];

// Helper function to get items grouped by category
export function getItemsByCategory(): Record<string, OnboardingItem[]> {
  const categories: Record<string, OnboardingItem[]> = {};
  
  for (const item of expandedOnboardingItems) {
    if (!categories[item.category]) {
      categories[item.category] = [];
    }
    categories[item.category].push(item);
  }
  
  return categories;
}

// Helper function to get all unique categories
export function getCategories(): string[] {
  return Array.from(new Set(expandedOnboardingItems.map(item => item.category)));
}

// Helper function to get an item by name
export function getItemByName(name: string): OnboardingItem | undefined {
  return expandedOnboardingItems.find(item => 
    item.displayName.toLowerCase() === name.toLowerCase()
  );
}