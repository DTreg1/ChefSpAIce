// Common onboarding food items with UPC barcodes and FDC IDs
// These are carefully selected to be generic, common versions of each item

export const onboardingUsdaMapping: Record<string, {
  upc?: string;  // Optional UPC barcode for product lookup
  fcdId?: string;  // Optional FDC ID for USDA database lookup  
  displayName: string;
  quantity: string;
  unit: string;
  storage: string;
  expirationDays: number;
  description?: string;
}> = {
  // Pantry Staples
  "Salt": {
    upc: "024600017008", // Morton Table Salt
    fcdId: "173410",
    displayName: "Salt",
    quantity: "1",
    unit: "container",
    storage: "Pantry",
    expirationDays: 730,
    description: "Table salt"
  },
  "Black Pepper": {
    upc: "052100002989", // McCormick Black Pepper
    fcdId: "170931",
    displayName: "Black Pepper",
    quantity: "1",
    unit: "container",
    storage: "Pantry",
    expirationDays: 730,
    description: "Ground black pepper"
  },
  "Olive Oil": {
    upc: "041618000185", // Filippo Berio Olive Oil
    displayName: "Olive Oil",
    quantity: "1",
    unit: "bottle",
    storage: "Pantry",
    expirationDays: 365,
    description: "Extra virgin olive oil"
  },
  "All-Purpose Flour": {
    upc: "016000502406", // Gold Medal All-Purpose Flour
    displayName: "All-Purpose Flour",
    quantity: "5",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 180,
    description: "All-purpose white flour"
  },
  "Sugar": {
    upc: "049200035412", // Domino Granulated Sugar
    displayName: "Sugar",
    quantity: "5",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 730,
    description: "Granulated white sugar"
  },
  "Rice": {
    upc: "054800029426", // Uncle Ben's Long Grain Rice
    displayName: "Rice",
    quantity: "2",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 365,
    description: "Long-grain white rice"
  },
  "Pasta": {
    upc: "076808533316", // Barilla Spaghetti
    displayName: "Pasta",
    quantity: "1",
    unit: "lb",
    storage: "Pantry",
    expirationDays: 365,
    description: "Dry spaghetti pasta"
  },
  "Canned Tomatoes": {
    upc: "027000386460", // Hunt's Diced Tomatoes
    displayName: "Canned Tomatoes",
    quantity: "2",
    unit: "cans",
    storage: "Pantry",
    expirationDays: 365,
    description: "Canned diced tomatoes"
  },
  "Onions": {
    upc: "033383671000", // Yellow Onions (3 lb bag)
    displayName: "Onions",
    quantity: "3",
    unit: "whole",
    storage: "Pantry",
    expirationDays: 30,
    description: "Fresh yellow onions"
  },
  "Garlic": {
    upc: "033383997018", // Fresh Garlic
    displayName: "Garlic",
    quantity: "1",
    unit: "bulb",
    storage: "Pantry",
    expirationDays: 30,
    description: "Fresh garlic bulb"
  },
  "Chicken Broth": {
    upc: "051000127990", // Campbell's Chicken Broth
    displayName: "Chicken Broth",
    quantity: "2",
    unit: "cans",
    storage: "Pantry",
    expirationDays: 365,
    description: "Canned chicken broth"
  },
  "Soy Sauce": {
    upc: "041390000003", // Kikkoman Soy Sauce
    displayName: "Soy Sauce",
    quantity: "1",
    unit: "bottle",
    storage: "Pantry",
    expirationDays: 730,
    description: "Regular soy sauce"
  },
  // Refrigerator Items
  "Milk": {
    upc: "041383090141", // Great Value Whole Milk
    displayName: "Milk",
    quantity: "1",
    unit: "gallon",
    storage: "Fridge",
    expirationDays: 7,
    description: "Whole milk"
  },
  "Eggs": {
    upc: "041415001121", // Large Grade A Eggs
    displayName: "Eggs",
    quantity: "12",
    unit: "count",
    storage: "Fridge",
    expirationDays: 21,
    description: "Large eggs"
  },
  "Butter": {
    upc: "034500151122", // Land O Lakes Butter
    displayName: "Butter",
    quantity: "1",
    unit: "lb",
    storage: "Fridge",
    expirationDays: 60,
    description: "Salted butter"
  },
  "Cheddar Cheese": {
    upc: "021000615872", // Kraft Sharp Cheddar
    displayName: "Cheddar Cheese",
    quantity: "8",
    unit: "oz",
    storage: "Fridge",
    expirationDays: 30,
    description: "Sharp cheddar cheese"
  },
  "Carrots": {
    upc: "033383659008", // Fresh Carrots 1lb bag
    displayName: "Carrots",
    quantity: "1",
    unit: "lb",
    storage: "Fridge",
    expirationDays: 21,
    description: "Fresh carrots"
  },
  "Bell Peppers": {
    upc: "000651330023", // Bell Peppers (Red)
    displayName: "Bell Peppers",
    quantity: "2",
    unit: "whole",
    storage: "Fridge",
    expirationDays: 7,
    description: "Fresh bell peppers"
  },
  "Lettuce": {
    upc: "000000004061", // Iceberg Lettuce
    displayName: "Lettuce",
    quantity: "1",
    unit: "head",
    storage: "Fridge",
    expirationDays: 7,
    description: "Iceberg lettuce"
  },
  "Yogurt": {
    upc: "053600000222", // Yoplait Original Yogurt
    displayName: "Yogurt",
    quantity: "4",
    unit: "cups",
    storage: "Fridge",
    expirationDays: 14,
    description: "Plain yogurt"
  },
  "Mayonnaise": {
    upc: "048001213487", // Hellmann's Real Mayonnaise
    displayName: "Mayonnaise",
    quantity: "1",
    unit: "jar",
    storage: "Fridge",
    expirationDays: 90,
    description: "Regular mayonnaise"
  },
  "Mustard": {
    upc: "054467005016", // French's Yellow Mustard
    displayName: "Mustard",
    quantity: "1",
    unit: "jar",
    storage: "Fridge",
    expirationDays: 180,
    description: "Yellow mustard"
  },
  "Ketchup": {
    upc: "013000001243", // Heinz Tomato Ketchup
    displayName: "Ketchup",
    quantity: "1",
    unit: "bottle",
    storage: "Fridge",
    expirationDays: 180,
    description: "Tomato ketchup"
  },
  // Freezer Items
  "Frozen Peas": {
    upc: "014500013927", // Birds Eye Sweet Peas
    displayName: "Frozen Peas",
    quantity: "1",
    unit: "bag",
    storage: "Freezer",
    expirationDays: 365,
    description: "Frozen green peas"
  },
  "Frozen Corn": {
    upc: "014500000946", // Birds Eye Whole Kernel Corn
    displayName: "Frozen Corn",
    quantity: "1",
    unit: "bag",
    storage: "Freezer",
    expirationDays: 365,
    description: "Frozen sweet corn"
  },
  "Chicken Breast": {
    upc: "023700035851", // Tyson Boneless Skinless Chicken Breasts
    displayName: "Chicken Breast",
    quantity: "2",
    unit: "lbs",
    storage: "Freezer",
    expirationDays: 180,
    description: "Boneless skinless chicken breast"
  },
  "Ground Beef": {
    upc: "037600286848", // Ground Beef 85% Lean
    displayName: "Ground Beef",
    quantity: "1",
    unit: "lb",
    storage: "Freezer",
    expirationDays: 120,
    description: "85% lean ground beef"
  },
  "Frozen Pizza": {
    upc: "071921001230", // DiGiorno Rising Crust Cheese Pizza
    displayName: "Frozen Pizza",
    quantity: "1",
    unit: "whole",
    storage: "Freezer",
    expirationDays: 180,
    description: "Frozen cheese pizza"
  },
  "Ice Cream": {
    upc: "077567254122", // Breyers Vanilla Ice Cream
    displayName: "Ice Cream",
    quantity: "1",
    unit: "pint",
    storage: "Freezer",
    expirationDays: 90,
    description: "Vanilla ice cream"
  }
};

// Helper function to get all UPC codes for batch fetching
export function getOnboardingUpcs(): string[] {
  return Object.values(onboardingUsdaMapping).map(item => item.upc);
}

// Helper function to get item data by name
export function getOnboardingItemByName(name: string) {
  return onboardingUsdaMapping[name];
}