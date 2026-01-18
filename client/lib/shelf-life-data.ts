export type StorageLocation = "refrigerator" | "freezer" | "pantry" | "counter";

interface StorageRecommendation {
  primary: StorageLocation;
  alternatives: StorageLocation[];
  notes: string;
}

export interface ShelfLifeEntry {
  category: string;
  refrigerator: number;
  freezer: number;
  pantry: number;
  counter: number;
  notes?: string;
}

export interface ItemStorageRecommendation {
  locations: StorageLocation[];
  notes: string;
}

const ITEM_STORAGE_RECOMMENDATIONS: Record<
  string,
  ItemStorageRecommendation
> = {
  milk: {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at 35-40°F. Use within 7 days of opening.",
  },
  "whole milk": {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at 35-40°F. Use within 7 days of opening.",
  },
  "2% milk": {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at 35-40°F. Use within 7 days of opening.",
  },
  "skim milk": {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at 35-40°F. Use within 7 days of opening.",
  },
  "almond milk": {
    locations: ["refrigerator"],
    notes: "Refrigerate after opening. Shelf-stable before opening.",
  },
  "oat milk": {
    locations: ["refrigerator"],
    notes: "Refrigerate after opening. Shelf-stable before opening.",
  },
  bread: {
    locations: ["pantry", "freezer"],
    notes:
      "Room temperature keeps best texture. Freeze for long-term storage. Avoid refrigerator.",
  },
  "white bread": {
    locations: ["pantry", "freezer"],
    notes: "Room temperature keeps best texture. Freeze for long-term storage.",
  },
  "whole wheat bread": {
    locations: ["pantry", "freezer"],
    notes: "Room temperature keeps best texture. Freeze for long-term storage.",
  },
  apples: {
    locations: ["counter", "refrigerator"],
    notes:
      "Ripen on counter, then refrigerate to extend freshness up to 4-6 weeks.",
  },
  apple: {
    locations: ["counter", "refrigerator"],
    notes:
      "Ripen on counter, then refrigerate to extend freshness up to 4-6 weeks.",
  },
  bananas: {
    locations: ["counter"],
    notes:
      "Keep on counter to ripen. Refrigeration darkens skin but extends life.",
  },
  banana: {
    locations: ["counter"],
    notes:
      "Keep on counter to ripen. Refrigeration darkens skin but extends life.",
  },
  oranges: {
    locations: ["counter", "refrigerator"],
    notes: "Counter for short-term, refrigerator extends life to 2-3 weeks.",
  },
  orange: {
    locations: ["counter", "refrigerator"],
    notes: "Counter for short-term, refrigerator extends life to 2-3 weeks.",
  },
  "ice cream": {
    locations: ["freezer"],
    notes:
      "Keep at 0°F or below. Store in back of freezer for consistent temperature.",
  },
  "frozen pizza": {
    locations: ["freezer"],
    notes: "Keep frozen until ready to cook. Do not refreeze after thawing.",
  },
  "frozen vegetables": {
    locations: ["freezer"],
    notes: "Keep at 0°F or below. Can be cooked directly from frozen.",
  },
  "frozen fruit": {
    locations: ["freezer"],
    notes: "Keep frozen. Great for smoothies and baking.",
  },
  "frozen dinner": {
    locations: ["freezer"],
    notes: "Keep frozen until ready to heat. Check packaging for instructions.",
  },
  "canned beans": {
    locations: ["pantry"],
    notes:
      "Cool, dry place. Refrigerate after opening and use within 3-4 days.",
  },
  "canned soup": {
    locations: ["pantry"],
    notes:
      "Cool, dry place. Refrigerate after opening and use within 3-4 days.",
  },
  "canned tomatoes": {
    locations: ["pantry"],
    notes:
      "Cool, dry place. Transfer to container and refrigerate after opening.",
  },
  "canned tuna": {
    locations: ["pantry"],
    notes: "Cool, dry place. Refrigerate after opening and use within 2 days.",
  },
  "canned vegetables": {
    locations: ["pantry"],
    notes:
      "Cool, dry place. Refrigerate after opening and use within 3-4 days.",
  },
  cheese: {
    locations: ["refrigerator", "freezer"],
    notes:
      "Wrap tightly. Hard cheeses last longer. Freeze for extended storage.",
  },
  eggs: {
    locations: ["refrigerator"],
    notes:
      "Keep in original carton on shelf, not in door. Do not freeze in shell.",
  },
  butter: {
    locations: ["refrigerator", "counter"],
    notes:
      "Refrigerate for long-term. Small amount on counter for easy spreading.",
  },
  yogurt: {
    locations: ["refrigerator"],
    notes:
      "Keep refrigerated. Check expiration date. Freezing changes texture.",
  },
  chicken: {
    locations: ["refrigerator", "freezer"],
    notes: "Use within 1-2 days refrigerated or freeze immediately.",
  },
  beef: {
    locations: ["refrigerator", "freezer"],
    notes: "Ground beef 1-2 days, steaks 3-5 days. Freeze for longer storage.",
  },
  pork: {
    locations: ["refrigerator", "freezer"],
    notes: "Use within 3-5 days refrigerated. Freeze for extended storage.",
  },
  fish: {
    locations: ["refrigerator", "freezer"],
    notes: "Highly perishable. Use within 1-2 days or freeze immediately.",
  },
  salmon: {
    locations: ["refrigerator", "freezer"],
    notes: "Use within 1-2 days refrigerated. Freeze for up to 3 months.",
  },
  shrimp: {
    locations: ["refrigerator", "freezer"],
    notes: "Use within 1-2 days refrigerated. Keep frozen until ready to use.",
  },
  rice: {
    locations: ["pantry"],
    notes: "Store in airtight container in cool, dry place. Lasts 1-2 years.",
  },
  pasta: {
    locations: ["pantry"],
    notes: "Dry pasta lasts 1-2 years in pantry. Cooked pasta refrigerate.",
  },
  cereal: {
    locations: ["pantry"],
    notes: "Keep in airtight container in cool, dry place.",
  },
  chips: {
    locations: ["pantry"],
    notes: "Store in cool, dry place. Seal bag tightly after opening.",
  },
  crackers: {
    locations: ["pantry"],
    notes: "Keep in airtight container in cool, dry place.",
  },
  cookies: {
    locations: ["pantry", "freezer"],
    notes: "Room temperature in airtight container. Freeze for long-term.",
  },
  ketchup: {
    locations: ["pantry", "refrigerator"],
    notes: "Pantry before opening. Refrigerate after opening for best quality.",
  },
  mustard: {
    locations: ["refrigerator"],
    notes: "Refrigerate after opening to maintain flavor and quality.",
  },
  mayonnaise: {
    locations: ["refrigerator"],
    notes: "Always refrigerate after opening. Use within 2 months.",
  },
  tomatoes: {
    locations: ["counter"],
    notes:
      "Store at room temperature for best flavor. Refrigerate only when ripe.",
  },
  tomato: {
    locations: ["counter"],
    notes:
      "Store at room temperature for best flavor. Refrigerate only when ripe.",
  },
  potatoes: {
    locations: ["pantry"],
    notes: "Store in cool, dark, dry place. Not in refrigerator.",
  },
  potato: {
    locations: ["pantry"],
    notes: "Store in cool, dark, dry place. Not in refrigerator.",
  },
  onions: {
    locations: ["pantry"],
    notes: "Store in cool, dark, dry place. Keep away from potatoes.",
  },
  onion: {
    locations: ["pantry"],
    notes: "Store in cool, dark, dry place. Keep away from potatoes.",
  },
  garlic: {
    locations: ["pantry"],
    notes: "Store in cool, dry place with good air circulation.",
  },
  lettuce: {
    locations: ["refrigerator"],
    notes: "Keep in crisper drawer. Wrap in paper towel to absorb moisture.",
  },
  spinach: {
    locations: ["refrigerator"],
    notes: "Keep in crisper drawer. Use within 5-7 days.",
  },
  carrots: {
    locations: ["refrigerator"],
    notes: "Remove greens. Store in plastic bag in crisper drawer.",
  },
  avocados: {
    locations: ["counter", "refrigerator"],
    notes: "Ripen on counter, then refrigerate to extend freshness.",
  },
  avocado: {
    locations: ["counter", "refrigerator"],
    notes: "Ripen on counter, then refrigerate to extend freshness.",
  },
  lemons: {
    locations: ["counter", "refrigerator"],
    notes: "Counter for short-term. Refrigerate for up to 4 weeks.",
  },
  lemon: {
    locations: ["counter", "refrigerator"],
    notes: "Counter for short-term. Refrigerate for up to 4 weeks.",
  },
  berries: {
    locations: ["refrigerator"],
    notes: "Don't wash until ready to use. Store in single layer if possible.",
  },
  strawberries: {
    locations: ["refrigerator"],
    notes: "Don't wash until ready to eat. Use within 3-5 days.",
  },
  blueberries: {
    locations: ["refrigerator"],
    notes: "Don't wash until ready to eat. Use within 1-2 weeks.",
  },
  grapes: {
    locations: ["refrigerator"],
    notes: "Don't wash until ready to eat. Store in perforated bag.",
  },
  coffee: {
    locations: ["pantry"],
    notes:
      "Store in airtight container in cool, dark place. Don't refrigerate.",
  },
  tea: {
    locations: ["pantry"],
    notes: "Store in airtight container away from light and moisture.",
  },
  honey: {
    locations: ["pantry"],
    notes:
      "Room temperature in pantry. Never refrigerate - causes crystallization.",
  },
  peanut_butter: {
    locations: ["pantry"],
    notes:
      "Pantry storage is fine. Refrigerate natural peanut butter after opening.",
  },
  jam: {
    locations: ["pantry", "refrigerator"],
    notes: "Pantry before opening. Refrigerate after opening.",
  },
  jelly: {
    locations: ["pantry", "refrigerator"],
    notes: "Pantry before opening. Refrigerate after opening.",
  },
  olive_oil: {
    locations: ["pantry"],
    notes: "Store in cool, dark place. Not in refrigerator.",
  },
  "olive oil": {
    locations: ["pantry"],
    notes: "Store in cool, dark place. Not in refrigerator.",
  },
  nuts: {
    locations: ["pantry", "refrigerator", "freezer"],
    notes: "Pantry short-term. Refrigerate or freeze to prevent rancidity.",
  },
  chocolate: {
    locations: ["pantry"],
    notes: "Cool, dry place around 65-70°F. Avoid refrigerator.",
  },
  "orange juice": {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at all times. Use within 7-10 days of opening.",
  },
  oj: {
    locations: ["refrigerator"],
    notes: "Keep refrigerated at all times. Use within 7-10 days of opening.",
  },
  juice: {
    locations: ["refrigerator"],
    notes:
      "Most juices should be refrigerated after opening. Check label for shelf-stable varieties.",
  },
};

export function getItemStorageRecommendation(
  itemName: string,
): ItemStorageRecommendation | null {
  const normalized = itemName.toLowerCase().trim();

  if (ITEM_STORAGE_RECOMMENDATIONS[normalized]) {
    return ITEM_STORAGE_RECOMMENDATIONS[normalized];
  }

  for (const [key, value] of Object.entries(ITEM_STORAGE_RECOMMENDATIONS)) {
    if (normalized.includes(key) || key.includes(normalized)) {
      return value;
    }
  }

  return null;
}

export const STORAGE_RECOMMENDATIONS: Record<string, StorageRecommendation> = {
  dairy: {
    primary: "refrigerator",
    alternatives: ["freezer"],
    notes:
      "Keep at 35-40°F (2-4°C). Freeze milk in original container leaving room for expansion.",
  },
  meat: {
    primary: "refrigerator",
    alternatives: ["freezer"],
    notes:
      "Store on bottom shelf to prevent cross-contamination. Use within 2 days or freeze immediately.",
  },
  seafood: {
    primary: "refrigerator",
    alternatives: ["freezer"],
    notes:
      "Keep at 32-38°F (0-3°C). Highly perishable - use within 1-2 days or freeze immediately.",
  },
  produce: {
    primary: "refrigerator",
    alternatives: ["counter", "pantry"],
    notes:
      "Some fruits ripen on counter first. Keep ethylene producers separate from sensitive items.",
  },
  bread: {
    primary: "pantry",
    alternatives: ["freezer", "counter"],
    notes:
      "Refrigerator makes bread stale faster. Freeze for long-term storage.",
  },
  eggs: {
    primary: "refrigerator",
    alternatives: [],
    notes: "Store in original carton on a shelf, not the door.",
  },
  condiments: {
    primary: "pantry",
    alternatives: ["refrigerator"],
    notes: "Most need refrigeration after opening.",
  },
  canned: {
    primary: "pantry",
    alternatives: [],
    notes: "Cool, dry place. Refrigerate after opening.",
  },
  frozen: {
    primary: "freezer",
    alternatives: [],
    notes: "Keep at 0°F or below. Use within recommended time.",
  },
  beverages: {
    primary: "pantry",
    alternatives: ["refrigerator"],
    notes: "Refrigerate after opening or for preference.",
  },
  grains: {
    primary: "pantry",
    alternatives: ["refrigerator", "freezer"],
    notes: "Airtight container. Freeze to kill any pests.",
  },
  spices: {
    primary: "pantry",
    alternatives: [],
    notes:
      "Store in cool, dark, dry place away from stove heat. Ground spices lose potency faster.",
  },
  snacks: {
    primary: "pantry",
    alternatives: [],
    notes:
      "Keep in airtight containers in a cool, dry place to maintain crispness and freshness.",
  },
  leftovers: {
    primary: "refrigerator",
    alternatives: ["freezer"],
    notes:
      "Refrigerate within 2 hours of cooking. Divide large amounts for faster cooling. Label with date.",
  },
};

export const SHELF_LIFE_DATA: ShelfLifeEntry[] = [
  {
    category: "milk",
    refrigerator: 7,
    freezer: 90,
    pantry: 0,
    counter: 0,
    notes:
      "Use within 7 days of opening. Freeze in airtight container leaving room for expansion.",
  },
  {
    category: "cheese",
    refrigerator: 14,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes:
      "Hard cheeses last longer than soft cheeses. Wrap tightly to prevent drying.",
  },
  {
    category: "yogurt",
    refrigerator: 14,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes: "Check expiration date. Freezing may change texture but is safe.",
  },
  {
    category: "beef",
    refrigerator: 5,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes:
      "Ground beef lasts 1-2 days in fridge, steaks 3-5 days. Freeze for longer storage.",
  },
  {
    category: "chicken",
    refrigerator: 3,
    freezer: 270,
    pantry: 0,
    counter: 0,
    notes:
      "Raw chicken should be used within 1-2 days. Cooked chicken lasts 3-4 days.",
  },
  {
    category: "pork",
    refrigerator: 5,
    freezer: 180,
    pantry: 0,
    counter: 0,
    notes:
      "Fresh pork lasts 3-5 days refrigerated. Cured pork products last longer.",
  },
  {
    category: "seafood",
    refrigerator: 2,
    freezer: 180,
    pantry: 0,
    counter: 0,
    notes:
      "Fresh fish is highly perishable. Use within 1-2 days or freeze immediately.",
  },
  {
    category: "fruits",
    refrigerator: 7,
    freezer: 300,
    pantry: 3,
    counter: 5,
    notes:
      "Ripeness varies. Some fruits ripen on counter, then refrigerate. Freeze for smoothies.",
  },
  {
    category: "vegetables",
    refrigerator: 7,
    freezer: 300,
    pantry: 0,
    counter: 3,
    notes:
      "Leafy greens last 3-5 days. Root vegetables can last weeks. Blanch before freezing.",
  },
  {
    category: "bread",
    refrigerator: 7,
    freezer: 90,
    pantry: 5,
    counter: 7,
    notes:
      "Store at room temperature for best texture. Freeze to extend shelf life.",
  },
  {
    category: "bakery",
    refrigerator: 5,
    freezer: 90,
    pantry: 3,
    counter: 5,
    notes: "Pastries and baked goods vary. Most freeze well for later use.",
  },
  {
    category: "eggs",
    refrigerator: 35,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes:
      "Keep in original carton. Can freeze beaten eggs. Do not freeze in shell.",
  },
  {
    category: "condiments",
    refrigerator: 180,
    freezer: 0,
    pantry: 365,
    counter: 0,
    notes:
      "Refrigerate after opening. Check individual product labels for specific guidance.",
  },
  {
    category: "canned goods",
    refrigerator: 7,
    freezer: 60,
    pantry: 1825,
    counter: 0,
    notes:
      "Unopened cans last 1-5 years. Once opened, transfer to container and refrigerate.",
  },
  {
    category: "frozen foods",
    refrigerator: 3,
    freezer: 365,
    pantry: 0,
    counter: 0,
    notes: "Keep frozen until ready to use. Once thawed, use within 3-4 days.",
  },
  {
    category: "leftovers",
    refrigerator: 4,
    freezer: 90,
    pantry: 0,
    counter: 0,
    notes:
      "Refrigerate within 2 hours of cooking. Label with date when freezing.",
  },
  {
    category: "beverages",
    refrigerator: 14,
    freezer: 180,
    pantry: 365,
    counter: 7,
    notes: "Varies widely by type. Check individual product for best guidance.",
  },
  {
    category: "grains",
    refrigerator: 180,
    freezer: 365,
    pantry: 730,
    counter: 0,
    notes:
      "Store in airtight containers. Whole grains last longer when refrigerated.",
  },
  {
    category: "pasta",
    refrigerator: 5,
    freezer: 180,
    pantry: 730,
    counter: 0,
    notes:
      "Dry pasta lasts 1-2 years. Cooked pasta lasts 3-5 days refrigerated.",
  },
  {
    category: "snacks",
    refrigerator: 30,
    freezer: 180,
    pantry: 60,
    counter: 30,
    notes:
      "Keep in airtight containers to maintain freshness. Check for staleness.",
  },
  {
    category: "spices",
    refrigerator: 730,
    freezer: 1460,
    pantry: 1460,
    counter: 365,
    notes:
      "Ground spices lose potency faster than whole. Store away from heat and light.",
  },
  {
    category: "butter",
    refrigerator: 30,
    freezer: 270,
    pantry: 0,
    counter: 7,
    notes:
      "Salted butter lasts longer. Keep wrapped to prevent absorption of odors.",
  },
  {
    category: "deli meat",
    refrigerator: 5,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes:
      "Use within 3-5 days of opening. Freeze in portions for convenience.",
  },
  {
    category: "juice",
    refrigerator: 10,
    freezer: 365,
    pantry: 365,
    counter: 0,
    notes:
      "Fresh juice lasts 3-5 days. Concentrated juice lasts longer when frozen.",
  },
  {
    category: "nuts",
    refrigerator: 180,
    freezer: 365,
    pantry: 90,
    counter: 30,
    notes:
      "Refrigerate or freeze for extended storage. Oils can go rancid at room temperature.",
  },
  {
    category: "sauces",
    refrigerator: 30,
    freezer: 90,
    pantry: 365,
    counter: 0,
    notes:
      "Refrigerate after opening. Tomato-based sauces last shorter than vinegar-based.",
  },
  {
    category: "herbs",
    refrigerator: 7,
    freezer: 180,
    pantry: 365,
    counter: 3,
    notes: "Fresh herbs are delicate. Dried herbs last longer in pantry.",
  },
  {
    category: "cream",
    refrigerator: 7,
    freezer: 60,
    pantry: 0,
    counter: 0,
    notes:
      "Heavy cream lasts longer than light cream. Whipped cream should be used quickly.",
  },
  {
    category: "tofu",
    refrigerator: 7,
    freezer: 150,
    pantry: 0,
    counter: 0,
    notes: "Opened tofu should be covered in water and used within a week.",
  },
  {
    category: "pickles",
    refrigerator: 365,
    freezer: 0,
    pantry: 730,
    counter: 0,
    notes: "Unopened pickles last 1-2 years. Refrigerate after opening.",
  },
];

export function getShelfLife(
  category: string,
  location: string,
): number | null {
  const normalizedCategory = category.toLowerCase().trim();
  const normalizedLocation = location.toLowerCase().trim();

  const entry = SHELF_LIFE_DATA.find(
    (item) => item.category.toLowerCase() === normalizedCategory,
  );

  if (!entry) {
    return null;
  }

  switch (normalizedLocation) {
    case "refrigerator":
    case "fridge":
      return entry.refrigerator > 0 ? entry.refrigerator : null;
    case "freezer":
      return entry.freezer > 0 ? entry.freezer : null;
    case "pantry":
      return entry.pantry > 0 ? entry.pantry : null;
    case "counter":
      return entry.counter > 0 ? entry.counter : null;
    default:
      return null;
  }
}

export function getValidStorageLocations(category: string): string[] {
  const normalizedCategory = category.toLowerCase().trim();

  const entry = SHELF_LIFE_DATA.find(
    (item) => item.category.toLowerCase() === normalizedCategory,
  );

  if (!entry) {
    return [];
  }

  const locations: string[] = [];

  if (entry.refrigerator > 0) {
    locations.push("refrigerator");
  }
  if (entry.freezer > 0) {
    locations.push("freezer");
  }
  if (entry.pantry > 0) {
    locations.push("pantry");
  }
  if (entry.counter > 0) {
    locations.push("counter");
  }

  return locations;
}

export function getShelfLifeEntry(category: string): ShelfLifeEntry | null {
  const normalizedCategory = category.toLowerCase().trim();

  return (
    SHELF_LIFE_DATA.find(
      (item) => item.category.toLowerCase() === normalizedCategory,
    ) || null
  );
}

const FOOD_ALIASES: Record<string, string> = {
  // Dairy
  "whole milk": "milk",
  "2% milk": "milk",
  "skim milk": "milk",
  "almond milk": "milk",
  "oat milk": "milk",
  "sour cream": "cream",
  "cream cheese": "cheese",
  "cottage cheese": "cheese",
  cheddar: "cheese",
  mozzarella: "cheese",
  parmesan: "cheese",
  "greek yogurt": "yogurt",

  // Meat
  "ground beef": "beef",
  "ground turkey": "chicken",
  "ground pork": "pork",
  steak: "beef",
  roast: "beef",
  turkey: "chicken",
  duck: "chicken",
  ham: "deli meat",
  salami: "deli meat",
  pepperoni: "deli meat",
  sausage: "pork",
  "hot dogs": "pork",
  bacon: "pork",

  // Seafood
  salmon: "seafood",
  tuna: "seafood",
  cod: "seafood",
  tilapia: "seafood",
  shrimp: "seafood",
  crab: "seafood",
  lobster: "seafood",
  mussels: "seafood",
  clams: "seafood",
  scallops: "seafood",
  fish: "seafood",

  // Produce - Fruits
  apple: "fruits",
  apples: "fruits",
  banana: "fruits",
  bananas: "fruits",
  orange: "fruits",
  oranges: "fruits",
  lemon: "fruits",
  lemons: "fruits",
  lime: "fruits",
  limes: "fruits",
  strawberry: "fruits",
  strawberries: "fruits",
  blueberry: "fruits",
  blueberries: "fruits",
  raspberry: "fruits",
  raspberries: "fruits",
  grape: "fruits",
  grapes: "fruits",
  avocado: "fruits",
  avocados: "fruits",
  mango: "fruits",
  mangoes: "fruits",
  pineapple: "fruits",
  watermelon: "fruits",
  cantaloupe: "fruits",
  peach: "fruits",
  peaches: "fruits",
  pear: "fruits",
  pears: "fruits",
  berries: "fruits",

  // Produce - Vegetables
  lettuce: "vegetables",
  spinach: "vegetables",
  kale: "vegetables",
  arugula: "vegetables",
  carrots: "vegetables",
  carrot: "vegetables",
  broccoli: "vegetables",
  cauliflower: "vegetables",
  celery: "vegetables",
  cucumber: "vegetables",
  cucumbers: "vegetables",
  tomato: "vegetables",
  tomatoes: "vegetables",
  pepper: "vegetables",
  peppers: "vegetables",
  "bell pepper": "vegetables",
  onion: "vegetables",
  onions: "vegetables",
  garlic: "vegetables",
  potato: "vegetables",
  potatoes: "vegetables",
  "sweet potato": "vegetables",
  mushroom: "vegetables",
  mushrooms: "vegetables",
  zucchini: "vegetables",
  squash: "vegetables",
  corn: "vegetables",
  asparagus: "vegetables",
  "green beans": "vegetables",
  peas: "vegetables",
  cabbage: "vegetables",

  // Bread & Bakery
  bagel: "bread",
  bagels: "bread",
  buns: "bread",
  rolls: "bread",
  pita: "bread",
  tortilla: "bread",
  tortillas: "bread",
  croissant: "bakery",
  croissants: "bakery",
  muffin: "bakery",
  muffins: "bakery",
  donut: "bakery",
  donuts: "bakery",
  cake: "bakery",
  pie: "bakery",
  pastry: "bakery",
  pastries: "bakery",
  cookies: "bakery",

  // Canned & Jarred
  "canned tomatoes": "canned goods",
  "canned corn": "canned goods",
  "canned beans": "canned goods",
  "canned soup": "canned goods",
  "canned tuna": "canned goods",
  "canned salmon": "canned goods",
  "canned chicken": "canned goods",
  "canned vegetables": "canned goods",
  "canned fruit": "canned goods",

  // Grains
  rice: "grains",
  "white rice": "grains",
  "brown rice": "grains",
  quinoa: "grains",
  oats: "grains",
  oatmeal: "grains",
  cereal: "grains",
  flour: "grains",
  cornmeal: "grains",
  couscous: "grains",
  barley: "grains",

  // Pasta
  spaghetti: "pasta",
  penne: "pasta",
  macaroni: "pasta",
  noodles: "pasta",
  linguine: "pasta",
  fettuccine: "pasta",
  lasagna: "pasta",

  // Condiments & Sauces
  ketchup: "condiments",
  mustard: "condiments",
  mayonnaise: "condiments",
  mayo: "condiments",
  "hot sauce": "sauces",
  "soy sauce": "sauces",
  "bbq sauce": "sauces",
  "pasta sauce": "sauces",
  "tomato sauce": "sauces",
  marinara: "sauces",
  pesto: "sauces",
  salsa: "sauces",
  jam: "condiments",
  jelly: "condiments",
  honey: "condiments",
  "maple syrup": "condiments",
  vinegar: "condiments",
  "olive oil": "condiments",
  "vegetable oil": "condiments",

  // Snacks
  chips: "snacks",
  crackers: "snacks",
  pretzels: "snacks",
  popcorn: "snacks",
  "granola bars": "snacks",
  chocolate: "snacks",
  candy: "snacks",

  // Beverages
  "orange juice": "juice",
  "apple juice": "juice",
  "grape juice": "juice",
  soda: "beverages",
  cola: "beverages",
  water: "beverages",
  tea: "beverages",
  coffee: "beverages",
  wine: "beverages",
  beer: "beverages",

  // Frozen
  "frozen pizza": "frozen foods",
  "frozen vegetables": "frozen foods",
  "frozen fruit": "frozen foods",
  "ice cream": "frozen foods",
  "frozen dinner": "frozen foods",
  "frozen meals": "frozen foods",

  // Herbs & Spices
  basil: "herbs",
  cilantro: "herbs",
  parsley: "herbs",
  mint: "herbs",
  rosemary: "herbs",
  thyme: "herbs",
  oregano: "spices",
  cumin: "spices",
  paprika: "spices",
  cinnamon: "spices",
  salt: "spices",
  "black pepper": "spices",

  // Leftovers
  leftover: "leftovers",
  cooked: "leftovers",
  prepared: "leftovers",
};

/**
 * Get shelf life for a food item with fuzzy matching
 */
export function getShelfLifeForFood(
  foodName: string,
  location: string,
): { days: number; category: string; notes?: string } | null {
  const normalizedFood = foodName.toLowerCase().trim();
  const normalizedLocation = location.toLowerCase().trim();

  // First check direct match
  let category = normalizedFood;
  let entry = SHELF_LIFE_DATA.find(
    (item) => item.category.toLowerCase() === normalizedFood,
  );

  // Check aliases
  if (!entry && FOOD_ALIASES[normalizedFood]) {
    category = FOOD_ALIASES[normalizedFood];
    entry = SHELF_LIFE_DATA.find(
      (item) => item.category.toLowerCase() === category,
    );
  }

  // Try partial matching on food name
  if (!entry) {
    for (const [alias, cat] of Object.entries(FOOD_ALIASES)) {
      if (normalizedFood.includes(alias) || alias.includes(normalizedFood)) {
        category = cat;
        entry = SHELF_LIFE_DATA.find(
          (item) => item.category.toLowerCase() === category,
        );
        break;
      }
    }
  }

  // Try partial matching on categories
  if (!entry) {
    for (const item of SHELF_LIFE_DATA) {
      if (
        normalizedFood.includes(item.category) ||
        item.category.includes(normalizedFood)
      ) {
        entry = item;
        category = item.category;
        break;
      }
    }
  }

  if (!entry) {
    return null;
  }

  let days: number;
  switch (normalizedLocation) {
    case "refrigerator":
    case "fridge":
      days = entry.refrigerator;
      break;
    case "freezer":
      days = entry.freezer;
      break;
    case "pantry":
      days = entry.pantry;
      break;
    case "counter":
      days = entry.counter;
      break;
    default:
      days =
        entry.refrigerator || entry.pantry || entry.freezer || entry.counter;
  }

  if (days <= 0) {
    return null;
  }

  return {
    days,
    category,
    notes: entry.notes,
  };
}

/**
 * Format days into a human-readable string
 */
