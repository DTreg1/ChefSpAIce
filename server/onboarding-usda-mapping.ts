// USDA FDC IDs for common onboarding food items
// These are carefully selected to be generic, common versions of each item

export const onboardingUsdaMapping: Record<string, {
  fcdId: string;
  displayName: string;
  quantity: string;
  unit: string;
  storage: string;
  expirationDays: number;
  description?: string;
}> = {
  // Pantry Staples
  "Salt": {
    fcdId: "173410", // Table salt
    displayName: "Salt",
    quantity: "1",
    unit: "container",
    storage: "Pantry",
    expirationDays: 730,
    description: "Table salt"
  },
  "Black Pepper": {
    fcdId: "170931", // Black pepper, ground
    displayName: "Black Pepper",
    quantity: "1",
    unit: "container",
    storage: "Pantry",
    expirationDays: 730,
    description: "Ground black pepper"
  },
  "Olive Oil": {
    fcdId: "748608", // Olive oil, extra virgin
    displayName: "Olive Oil",
    quantity: "1",
    unit: "bottle",
    storage: "Pantry",
    expirationDays: 365,
    description: "Extra virgin olive oil"
  },
  "All-Purpose Flour": {
    fcdId: "789890", // Wheat flour, white, all purpose
    displayName: "All-Purpose Flour",
    quantity: "5",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 180,
    description: "All-purpose white flour"
  },
  "Sugar": {
    fcdId: "746773", // Granulated sugar
    displayName: "Sugar",
    quantity: "5",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 730,
    description: "Granulated white sugar"
  },
  "Rice": {
    fcdId: "786651", // Rice, white, long-grain
    displayName: "Rice",
    quantity: "2",
    unit: "lbs",
    storage: "Pantry",
    expirationDays: 365,
    description: "Long-grain white rice"
  },
  "Pasta": {
    fcdId: "356420", // Pasta, spaghetti, dry
    displayName: "Pasta",
    quantity: "1",
    unit: "lb",
    storage: "Pantry",
    expirationDays: 365,
    description: "Dry spaghetti pasta"
  },
  "Canned Tomatoes": {
    fcdId: "343109", // Tomatoes, canned, diced
    displayName: "Canned Tomatoes",
    quantity: "2",
    unit: "cans",
    storage: "Pantry",
    expirationDays: 365,
    description: "Canned diced tomatoes"
  },
  "Onions": {
    fcdId: "170000", // Onions, raw
    displayName: "Onions",
    quantity: "3",
    unit: "whole",
    storage: "Pantry",
    expirationDays: 30,
    description: "Fresh yellow onions"
  },
  "Garlic": {
    fcdId: "169230", // Garlic, raw
    displayName: "Garlic",
    quantity: "1",
    unit: "bulb",
    storage: "Pantry",
    expirationDays: 30,
    description: "Fresh garlic bulb"
  },
  "Chicken Broth": {
    fcdId: "174185", // Soup, chicken broth
    displayName: "Chicken Broth",
    quantity: "2",
    unit: "cans",
    storage: "Pantry",
    expirationDays: 365,
    description: "Canned chicken broth"
  },
  "Soy Sauce": {
    fcdId: "174277", // Soy sauce
    displayName: "Soy Sauce",
    quantity: "1",
    unit: "bottle",
    storage: "Pantry",
    expirationDays: 730,
    description: "Regular soy sauce"
  },
  // Refrigerator Items
  "Milk": {
    fcdId: "746776", // Milk, whole, 3.25% fat
    displayName: "Milk",
    quantity: "1",
    unit: "gallon",
    storage: "Fridge",
    expirationDays: 7,
    description: "Whole milk"
  },
  "Eggs": {
    fcdId: "748967", // Egg, whole, raw
    displayName: "Eggs",
    quantity: "12",
    unit: "count",
    storage: "Fridge",
    expirationDays: 21,
    description: "Large eggs"
  },
  "Butter": {
    fcdId: "173410", // Butter, salted
    displayName: "Butter",
    quantity: "1",
    unit: "lb",
    storage: "Fridge",
    expirationDays: 60,
    description: "Salted butter"
  },
  "Cheddar Cheese": {
    fcdId: "328637", // Cheese, cheddar
    displayName: "Cheddar Cheese",
    quantity: "8",
    unit: "oz",
    storage: "Fridge",
    expirationDays: 30,
    description: "Sharp cheddar cheese"
  },
  "Carrots": {
    fcdId: "787791", // Carrots, raw
    displayName: "Carrots",
    quantity: "1",
    unit: "lb",
    storage: "Fridge",
    expirationDays: 21,
    description: "Fresh carrots"
  },
  "Bell Peppers": {
    fcdId: "787813", // Pepper, bell, red, raw
    displayName: "Bell Peppers",
    quantity: "2",
    unit: "whole",
    storage: "Fridge",
    expirationDays: 7,
    description: "Fresh bell peppers"
  },
  "Lettuce": {
    fcdId: "342616", // Lettuce, iceberg
    displayName: "Lettuce",
    quantity: "1",
    unit: "head",
    storage: "Fridge",
    expirationDays: 7,
    description: "Iceberg lettuce"
  },
  "Yogurt": {
    fcdId: "330138", // Yogurt, plain, whole milk
    displayName: "Yogurt",
    quantity: "4",
    unit: "cups",
    storage: "Fridge",
    expirationDays: 14,
    description: "Plain yogurt"
  },
  "Mayonnaise": {
    fcdId: "322965", // Mayonnaise
    displayName: "Mayonnaise",
    quantity: "1",
    unit: "jar",
    storage: "Fridge",
    expirationDays: 90,
    description: "Regular mayonnaise"
  },
  "Mustard": {
    fcdId: "324863", // Mustard, yellow
    displayName: "Mustard",
    quantity: "1",
    unit: "jar",
    storage: "Fridge",
    expirationDays: 180,
    description: "Yellow mustard"
  },
  "Ketchup": {
    fcdId: "324862", // Ketchup
    displayName: "Ketchup",
    quantity: "1",
    unit: "bottle",
    storage: "Fridge",
    expirationDays: 180,
    description: "Tomato ketchup"
  },
  // Freezer Items
  "Frozen Peas": {
    fcdId: "747447", // Peas, green, frozen
    displayName: "Frozen Peas",
    quantity: "1",
    unit: "bag",
    storage: "Freezer",
    expirationDays: 365,
    description: "Frozen green peas"
  },
  "Frozen Corn": {
    fcdId: "168917", // Corn, sweet, frozen
    displayName: "Frozen Corn",
    quantity: "1",
    unit: "bag",
    storage: "Freezer",
    expirationDays: 365,
    description: "Frozen sweet corn"
  },
  "Chicken Breast": {
    fcdId: "331960", // Chicken breast, raw
    displayName: "Chicken Breast",
    quantity: "2",
    unit: "lbs",
    storage: "Freezer",
    expirationDays: 180,
    description: "Boneless skinless chicken breast"
  },
  "Ground Beef": {
    fcdId: "333875", // Ground beef, 85% lean
    displayName: "Ground Beef",
    quantity: "1",
    unit: "lb",
    storage: "Freezer",
    expirationDays: 120,
    description: "85% lean ground beef"
  },
  "Frozen Pizza": {
    fcdId: "339745", // Pizza, frozen, cheese
    displayName: "Frozen Pizza",
    quantity: "1",
    unit: "whole",
    storage: "Freezer",
    expirationDays: 180,
    description: "Frozen cheese pizza"
  },
  "Ice Cream": {
    fcdId: "740156", // Ice cream, vanilla
    displayName: "Ice Cream",
    quantity: "1",
    unit: "pint",
    storage: "Freezer",
    expirationDays: 90,
    description: "Vanilla ice cream"
  }
};

// Helper function to get all FDC IDs for batch fetching
export function getOnboardingFcdIds(): string[] {
  return Object.values(onboardingUsdaMapping).map(item => item.fcdId);
}

// Helper function to get item data by name
export function getOnboardingItemByName(name: string) {
  return onboardingUsdaMapping[name];
}