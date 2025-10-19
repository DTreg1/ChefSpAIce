// Expanded onboarding items with categories for better organization
export interface OnboardingItem {
  displayName: string;
  fcdId: string;
  description: string;
  storage: string;
  quantity: string;
  unit: string;
  expirationDays: number;
  category: string;
}

export const expandedOnboardingItems: OnboardingItem[] = [
  // Pantry - Grains & Carbs
  { displayName: "All-Purpose Flour", fcdId: "168896", description: "Wheat flour, white, all-purpose, enriched, bleached", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "White Rice", fcdId: "169756", description: "Rice, white, long-grain, regular, enriched, cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Brown Rice", fcdId: "168878", description: "Rice, brown, long-grain, cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "Pasta", fcdId: "168940", description: "Pasta, cooked, enriched", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Quinoa", fcdId: "168917", description: "Quinoa, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Oats", fcdId: "173904", description: "Cereals, oats, regular and quick, not cooked", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Bread Flour", fcdId: "168897", description: "Wheat flour, white, bread, enriched", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 180, category: "Grains & Carbs" },
  { displayName: "Couscous", fcdId: "169701", description: "Couscous, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },
  { displayName: "Barley", fcdId: "170283", description: "Barley, pearled, cooked", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 365, category: "Grains & Carbs" },

  // Pantry - Oils & Vinegars
  { displayName: "Olive Oil", fcdId: "171413", description: "Oil, olive, salad or cooking", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "Vegetable Oil", fcdId: "171025", description: "Oil, vegetable, soybean, refined", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "Coconut Oil", fcdId: "171412", description: "Oil, coconut", storage: "Pantry", quantity: "1", unit: "jar", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Sesame Oil", fcdId: "171016", description: "Oil, sesame, salad or cooking", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 365, category: "Oils & Vinegars" },
  { displayName: "White Vinegar", fcdId: "169217", description: "Vinegar, distilled", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Apple Cider Vinegar", fcdId: "173797", description: "Vinegar, cider", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Balsamic Vinegar", fcdId: "173891", description: "Vinegar, balsamic", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },
  { displayName: "Rice Vinegar", fcdId: "168918", description: "Vinegar, rice", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Oils & Vinegars" },

  // Pantry - Spices & Seasonings
  { displayName: "Salt", fcdId: "173410", description: "Salt, table", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Black Pepper", fcdId: "170931", description: "Spices, pepper, black", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Garlic Powder", fcdId: "171325", description: "Spices, garlic powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Onion Powder", fcdId: "171324", description: "Spices, onion powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Paprika", fcdId: "171329", description: "Spices, paprika", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cumin", fcdId: "171321", description: "Spices, cumin seed", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Oregano", fcdId: "171328", description: "Spices, oregano, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Basil", fcdId: "171318", description: "Spices, basil, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Thyme", fcdId: "171333", description: "Spices, thyme, dried", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cinnamon", fcdId: "171320", description: "Spices, cinnamon, ground", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Chili Powder", fcdId: "171319", description: "Spices, chili powder", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },
  { displayName: "Cayenne Pepper", fcdId: "170933", description: "Spices, pepper, red or cayenne", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Spices & Seasonings" },

  // Pantry - Baking Essentials
  { displayName: "Sugar", fcdId: "169655", description: "Sugars, granulated", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Brown Sugar", fcdId: "169656", description: "Sugars, brown", storage: "Pantry", quantity: "2", unit: "lbs", expirationDays: 365, category: "Baking Essentials" },
  { displayName: "Powdered Sugar", fcdId: "169658", description: "Sugars, powdered", storage: "Pantry", quantity: "1", unit: "lb", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Honey", fcdId: "169640", description: "Honey", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Vanilla Extract", fcdId: "170922", description: "Vanilla extract", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Baking Soda", fcdId: "173778", description: "Leavening agents, baking soda", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Baking Powder", fcdId: "172315", description: "Leavening agents, baking powder, double-acting", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 365, category: "Baking Essentials" },
  { displayName: "Cocoa Powder", fcdId: "169593", description: "Cocoa, dry powder, unsweetened", storage: "Pantry", quantity: "1", unit: "container", expirationDays: 730, category: "Baking Essentials" },
  { displayName: "Chocolate Chips", fcdId: "167568", description: "Chocolate, dark, 45-59% cacao solids", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Baking Essentials" },

  // Pantry - Canned Goods
  { displayName: "Canned Tomatoes", fcdId: "170457", description: "Tomatoes, red, ripe, canned, whole, regular pack", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Tomato Paste", fcdId: "169067", description: "Tomato products, canned, paste", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Tomato Sauce", fcdId: "174890", description: "Tomato products, canned, sauce", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },
  { displayName: "Black Beans", fcdId: "173735", description: "Beans, black, mature seeds, cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Chickpeas", fcdId: "173757", description: "Chickpeas (garbanzo beans), cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Kidney Beans", fcdId: "175186", description: "Beans, kidney, red, mature seeds, cooked", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Corn", fcdId: "169239", description: "Corn, sweet, yellow, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Green Beans", fcdId: "169961", description: "Beans, snap, green, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Tuna", fcdId: "175159", description: "Fish, tuna, light, canned in water", storage: "Pantry", quantity: "4", unit: "cans", expirationDays: 730, category: "Canned Goods" },
  { displayName: "Coconut Milk", fcdId: "170170", description: "Nuts, coconut milk, canned", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Canned Goods" },

  // Pantry - Sauces & Condiments
  { displayName: "Soy Sauce", fcdId: "174275", description: "Soy sauce made from soy and wheat (shoyu)", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Sauces & Condiments" },
  { displayName: "Hot Sauce", fcdId: "171974", description: "Sauce, ready-to-serve, pepper or hot", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Sauces & Condiments" },
  { displayName: "Worcestershire Sauce", fcdId: "174046", description: "Sauce, worcestershire", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Sauces & Condiments" },
  { displayName: "Fish Sauce", fcdId: "173847", description: "Fish sauce", storage: "Pantry", quantity: "1", unit: "bottle", expirationDays: 730, category: "Sauces & Condiments" },

  // Pantry - Snacks & Nuts
  { displayName: "Peanut Butter", fcdId: "172470", description: "Peanut butter, smooth style", storage: "Pantry", quantity: "1", unit: "jar", expirationDays: 180, category: "Snacks & Nuts" },
  { displayName: "Almonds", fcdId: "170567", description: "Nuts, almonds", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Snacks & Nuts" },
  { displayName: "Walnuts", fcdId: "170187", description: "Nuts, walnuts, english", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 180, category: "Snacks & Nuts" },
  { displayName: "Cashews", fcdId: "170569", description: "Nuts, cashew nuts, raw", storage: "Pantry", quantity: "1", unit: "bag", expirationDays: 365, category: "Snacks & Nuts" },
  { displayName: "Crackers", fcdId: "168827", description: "Crackers, saltines", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 180, category: "Snacks & Nuts" },
  { displayName: "Granola Bars", fcdId: "168165", description: "Snacks, granola bars", storage: "Pantry", quantity: "1", unit: "box", expirationDays: 180, category: "Snacks & Nuts" },

  // Pantry - Fresh Produce
  { displayName: "Onions", fcdId: "170000", description: "Onions, raw", storage: "Pantry", quantity: "3", unit: "whole", expirationDays: 30, category: "Fresh Produce" },
  { displayName: "Garlic", fcdId: "169228", description: "Garlic, raw", storage: "Pantry", quantity: "1", unit: "bulb", expirationDays: 30, category: "Fresh Produce" },
  { displayName: "Potatoes", fcdId: "170026", description: "Potatoes, flesh and skin, raw", storage: "Pantry", quantity: "5", unit: "lbs", expirationDays: 21, category: "Fresh Produce" },
  { displayName: "Sweet Potatoes", fcdId: "170071", description: "Sweet potato, raw", storage: "Pantry", quantity: "3", unit: "whole", expirationDays: 14, category: "Fresh Produce" },
  { displayName: "Bananas", fcdId: "173944", description: "Bananas, raw", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 5, category: "Fresh Produce" },
  { displayName: "Apples", fcdId: "171688", description: "Apples, raw, with skin", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 7, category: "Fresh Produce" },
  { displayName: "Oranges", fcdId: "169097", description: "Oranges, raw, all commercial varieties", storage: "Counter", quantity: "6", unit: "whole", expirationDays: 14, category: "Fresh Produce" },
  { displayName: "Lemons", fcdId: "169098", description: "Lemons, raw, without peel", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 21, category: "Fresh Produce" },
  { displayName: "Limes", fcdId: "169099", description: "Limes, raw", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 21, category: "Fresh Produce" },
  { displayName: "Avocados", fcdId: "171705", description: "Avocados, raw, all commercial varieties", storage: "Counter", quantity: "3", unit: "whole", expirationDays: 3, category: "Fresh Produce" },
  { displayName: "Tomatoes", fcdId: "170457", description: "Tomatoes, red, ripe, raw", storage: "Counter", quantity: "4", unit: "whole", expirationDays: 5, category: "Fresh Produce" },

  // Pantry - Broths & Soups
  { displayName: "Chicken Broth", fcdId: "174179", description: "Soup, chicken broth, canned, condensed", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Broths & Soups" },
  { displayName: "Vegetable Broth", fcdId: "173876", description: "Soup, vegetable broth", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Broths & Soups" },
  { displayName: "Beef Broth", fcdId: "173859", description: "Soup, beef broth or bouillon", storage: "Pantry", quantity: "2", unit: "cans", expirationDays: 365, category: "Broths & Soups" },

  // Fridge - Dairy Products
  { displayName: "Whole Milk", fcdId: "746776", description: "Milk, whole, 3.25% milkfat", storage: "Fridge", quantity: "1", unit: "gallon", expirationDays: 7, category: "Dairy Products" },
  { displayName: "2% Milk", fcdId: "746777", description: "Milk, reduced fat, fluid, 2% milkfat", storage: "Fridge", quantity: "1", unit: "gallon", expirationDays: 7, category: "Dairy Products" },
  { displayName: "Heavy Cream", fcdId: "170859", description: "Cream, fluid, heavy whipping", storage: "Fridge", quantity: "1", unit: "pint", expirationDays: 7, category: "Dairy Products" },
  { displayName: "Half and Half", fcdId: "172310", description: "Cream, fluid, half and half", storage: "Fridge", quantity: "1", unit: "pint", expirationDays: 7, category: "Dairy Products" },
  { displayName: "Sour Cream", fcdId: "173419", description: "Sour cream, reduced fat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 21, category: "Dairy Products" },
  { displayName: "Greek Yogurt", fcdId: "173433", description: "Yogurt, Greek, plain, nonfat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Dairy Products" },
  { displayName: "Plain Yogurt", fcdId: "170903", description: "Yogurt, plain, whole milk", storage: "Fridge", quantity: "4", unit: "cups", expirationDays: 14, category: "Dairy Products" },
  { displayName: "Cottage Cheese", fcdId: "173418", description: "Cheese, cottage, lowfat, 2% milkfat", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Dairy Products" },
  { displayName: "Cream Cheese", fcdId: "173431", description: "Cheese, cream", storage: "Fridge", quantity: "1", unit: "package", expirationDays: 30, category: "Dairy Products" },
  { displayName: "Butter", fcdId: "173430", description: "Butter, with salt", storage: "Fridge", quantity: "1", unit: "lb", expirationDays: 60, category: "Dairy Products" },

  // Fridge - Cheese
  { displayName: "Cheddar Cheese", fcdId: "173414", description: "Cheese, cheddar", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 30, category: "Cheese" },
  { displayName: "Mozzarella Cheese", fcdId: "170901", description: "Cheese, mozzarella, whole milk", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 21, category: "Cheese" },
  { displayName: "Parmesan Cheese", fcdId: "171250", description: "Cheese, parmesan, grated", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 60, category: "Cheese" },
  { displayName: "Swiss Cheese", fcdId: "173423", description: "Cheese, swiss", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 30, category: "Cheese" },
  { displayName: "Feta Cheese", fcdId: "173420", description: "Cheese, feta", storage: "Fridge", quantity: "1", unit: "container", expirationDays: 14, category: "Cheese" },

  // Fridge - Eggs
  { displayName: "Large Eggs", fcdId: "173424", description: "Egg, whole, raw, fresh", storage: "Fridge", quantity: "12", unit: "count", expirationDays: 21, category: "Eggs" },
  { displayName: "Egg Whites", fcdId: "172183", description: "Egg, white, raw, fresh", storage: "Fridge", quantity: "1", unit: "carton", expirationDays: 14, category: "Eggs" },

  // Fridge - Vegetables
  { displayName: "Carrots", fcdId: "170393", description: "Carrots, raw", storage: "Fridge", quantity: "1", unit: "lb", expirationDays: 21, category: "Vegetables" },
  { displayName: "Celery", fcdId: "169988", description: "Celery, raw", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 14, category: "Vegetables" },
  { displayName: "Bell Peppers", fcdId: "170108", description: "Peppers, sweet, red, raw", storage: "Fridge", quantity: "2", unit: "whole", expirationDays: 7, category: "Vegetables" },
  { displayName: "Lettuce", fcdId: "169247", description: "Lettuce, cos or romaine, raw", storage: "Fridge", quantity: "1", unit: "head", expirationDays: 7, category: "Vegetables" },
  { displayName: "Spinach", fcdId: "170469", description: "Spinach, raw", storage: "Fridge", quantity: "1", unit: "bag", expirationDays: 5, category: "Vegetables" },
  { displayName: "Broccoli", fcdId: "170379", description: "Broccoli, raw", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 7, category: "Vegetables" },
  { displayName: "Cauliflower", fcdId: "169986", description: "Cauliflower, raw", storage: "Fridge", quantity: "1", unit: "head", expirationDays: 7, category: "Vegetables" },
  { displayName: "Cucumbers", fcdId: "169225", description: "Cucumber, with peel, raw", storage: "Fridge", quantity: "2", unit: "whole", expirationDays: 7, category: "Vegetables" },
  { displayName: "Mushrooms", fcdId: "169251", description: "Mushrooms, white, raw", storage: "Fridge", quantity: "8", unit: "oz", expirationDays: 5, category: "Vegetables" },
  { displayName: "Green Onions", fcdId: "170000", description: "Onions, spring or scallions", storage: "Fridge", quantity: "1", unit: "bunch", expirationDays: 7, category: "Vegetables" },

  // Fridge - Condiments
  { displayName: "Mayonnaise", fcdId: "173482", description: "Mayonnaise, regular", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 90, category: "Condiments" },
  { displayName: "Mustard", fcdId: "170932", description: "Mustard, prepared, yellow", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 180, category: "Condiments" },
  { displayName: "Ketchup", fcdId: "173893", description: "Catsup", storage: "Fridge", quantity: "1", unit: "bottle", expirationDays: 180, category: "Condiments" },
  { displayName: "Salsa", fcdId: "171978", description: "Salsa, ready-to-serve", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 30, category: "Condiments" },
  { displayName: "Pickles", fcdId: "169266", description: "Pickles, cucumber, dill", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 365, category: "Condiments" },
  { displayName: "Olives", fcdId: "169095", description: "Olives, ripe, canned", storage: "Fridge", quantity: "1", unit: "jar", expirationDays: 365, category: "Condiments" },

  // Freezer - Frozen Vegetables
  { displayName: "Frozen Peas", fcdId: "170420", description: "Peas, green, frozen, cooked", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Vegetables" },
  { displayName: "Frozen Corn", fcdId: "169999", description: "Corn, sweet, yellow, frozen, kernels cut off cob", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Vegetables" },
  { displayName: "Frozen Broccoli", fcdId: "168571", description: "Broccoli, frozen, chopped, cooked", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Vegetables" },
  { displayName: "Frozen Mixed Vegetables", fcdId: "169915", description: "Vegetables, mixed, frozen", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Vegetables" },
  { displayName: "Frozen Green Beans", fcdId: "169893", description: "Beans, snap, green, frozen", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Frozen Vegetables" },
  { displayName: "Frozen Spinach", fcdId: "170451", description: "Spinach, frozen, chopped or leaf", storage: "Freezer", quantity: "1", unit: "package", expirationDays: 365, category: "Frozen Vegetables" },

  // Freezer - Meat & Poultry
  { displayName: "Chicken Breast", fcdId: "171077", description: "Chicken, broilers or fryers, breast, meat only, raw", storage: "Freezer", quantity: "2", unit: "lbs", expirationDays: 180, category: "Meat & Poultry" },
  { displayName: "Chicken Thighs", fcdId: "174608", description: "Chicken, broilers or fryers, thigh, meat only, raw", storage: "Freezer", quantity: "2", unit: "lbs", expirationDays: 180, category: "Meat & Poultry" },
  { displayName: "Ground Beef", fcdId: "174032", description: "Beef, ground, 85% lean meat / 15% fat, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 120, category: "Meat & Poultry" },
  { displayName: "Ground Turkey", fcdId: "171079", description: "Turkey, all classes, ground, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 120, category: "Meat & Poultry" },
  { displayName: "Pork Chops", fcdId: "167892", description: "Pork, fresh, loin, center loin (chops)", storage: "Freezer", quantity: "4", unit: "pieces", expirationDays: 120, category: "Meat & Poultry" },
  { displayName: "Bacon", fcdId: "168277", description: "Pork, cured, bacon, cooked", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 30, category: "Meat & Poultry" },
  { displayName: "Italian Sausage", fcdId: "171631", description: "Sausage, Italian, pork, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 60, category: "Meat & Poultry" },

  // Freezer - Seafood
  { displayName: "Salmon", fcdId: "173691", description: "Fish, salmon, Atlantic, wild, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Seafood" },
  { displayName: "Shrimp", fcdId: "175180", description: "Crustaceans, shrimp, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Seafood" },
  { displayName: "Tilapia", fcdId: "175177", description: "Fish, tilapia, raw", storage: "Freezer", quantity: "1", unit: "lb", expirationDays: 90, category: "Seafood" },

  // Freezer - Frozen Meals
  { displayName: "Frozen Pizza", fcdId: "173292", description: "Pizza, cheese topping, frozen", storage: "Freezer", quantity: "1", unit: "whole", expirationDays: 180, category: "Frozen Meals" },
  { displayName: "Frozen Lasagna", fcdId: "167540", description: "Lasagna, cheese, frozen, prepared", storage: "Freezer", quantity: "1", unit: "package", expirationDays: 180, category: "Frozen Meals" },

  // Freezer - Desserts
  { displayName: "Vanilla Ice Cream", fcdId: "170481", description: "Ice creams, vanilla", storage: "Freezer", quantity: "1", unit: "pint", expirationDays: 90, category: "Desserts" },
  { displayName: "Frozen Berries", fcdId: "167629", description: "Blueberries, frozen, unsweetened", storage: "Freezer", quantity: "1", unit: "bag", expirationDays: 365, category: "Desserts" },
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