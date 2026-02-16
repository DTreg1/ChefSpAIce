/**
 * Developer-defined ingredient substitutions
 * 
 * These substitutions allow the AI to create recipes even when users
 * don't have the exact ingredient, but have a suitable alternative.
 * 
 * Each category contains items that can substitute for each other.
 * The AI will use these when building recipes to be more flexible.
 */

export interface SubstitutionGroup {
  category: string;
  description: string;
  items: string[];
}

export const INGREDIENT_SUBSTITUTIONS: SubstitutionGroup[] = [
  {
    category: "Breads & Wraps",
    description: "Carb bases that can wrap or hold fillings",
    items: [
      "bread",
      "tortilla",
      "pita",
      "naan",
      "flatbread",
      "wrap",
      "lavash",
      "baguette",
      "ciabatta",
      "english muffin",
      "bagel",
      "croissant",
      "rice paper",
      "lettuce leaves",
    ],
  },
  {
    category: "Cooking Fats",
    description: "Fats used for cooking and sautéing",
    items: [
      "olive oil",
      "vegetable oil",
      "canola oil",
      "coconut oil",
      "butter",
      "ghee",
      "avocado oil",
      "sesame oil",
      "lard",
      "bacon fat",
      "duck fat",
    ],
  },
  {
    category: "Dairy Milk Alternatives",
    description: "Liquid milk and plant-based alternatives",
    items: [
      "milk",
      "whole milk",
      "skim milk",
      "2% milk",
      "almond milk",
      "oat milk",
      "soy milk",
      "coconut milk",
      "cashew milk",
      "rice milk",
      "half and half",
      "heavy cream",
    ],
  },
  {
    category: "Acidic Liquids",
    description: "Acids for deglazing, marinades, and brightness",
    items: [
      "lemon juice",
      "lime juice",
      "white wine vinegar",
      "apple cider vinegar",
      "rice vinegar",
      "balsamic vinegar",
      "red wine vinegar",
      "orange juice",
      "white wine",
      "red wine",
    ],
  },
  {
    category: "Leafy Greens",
    description: "Salad greens and cooking greens",
    items: [
      "spinach",
      "kale",
      "arugula",
      "romaine lettuce",
      "mixed greens",
      "swiss chard",
      "collard greens",
      "butter lettuce",
      "iceberg lettuce",
      "watercress",
      "bok choy",
    ],
  },
  {
    category: "Pasta & Noodles",
    description: "Various pasta shapes and noodle types",
    items: [
      "spaghetti",
      "penne",
      "fettuccine",
      "linguine",
      "rigatoni",
      "fusilli",
      "farfalle",
      "angel hair",
      "rice noodles",
      "udon noodles",
      "ramen noodles",
      "egg noodles",
      "ziti",
      "macaroni",
    ],
  },
  {
    category: "Rice & Grains",
    description: "Grain bases for meals",
    items: [
      "white rice",
      "brown rice",
      "jasmine rice",
      "basmati rice",
      "quinoa",
      "couscous",
      "bulgur",
      "farro",
      "barley",
      "orzo",
      "wild rice",
    ],
  },
  {
    category: "Ground Meats",
    description: "Ground proteins for various dishes",
    items: [
      "ground beef",
      "ground turkey",
      "ground chicken",
      "ground pork",
      "ground lamb",
      "italian sausage",
      "chorizo",
      "plant-based ground",
      "beyond meat",
      "impossible meat",
    ],
  },
  {
    category: "Chicken Cuts",
    description: "Different cuts of chicken",
    items: [
      "chicken breast",
      "chicken thigh",
      "chicken thighs",
      "chicken drumsticks",
      "chicken wings",
      "chicken tenders",
      "whole chicken",
      "rotisserie chicken",
    ],
  },
  {
    category: "Fish & Seafood",
    description: "Mild white fish that cook similarly",
    items: [
      "tilapia",
      "cod",
      "halibut",
      "sea bass",
      "mahi mahi",
      "snapper",
      "flounder",
      "sole",
      "haddock",
    ],
  },
  {
    category: "Cheese - Melting",
    description: "Cheeses good for melting",
    items: [
      "cheddar",
      "mozzarella",
      "monterey jack",
      "colby",
      "gruyere",
      "fontina",
      "provolone",
      "american cheese",
      "pepper jack",
      "gouda",
    ],
  },
  {
    category: "Cheese - Crumbling",
    description: "Crumbly cheeses for salads and toppings",
    items: [
      "feta",
      "goat cheese",
      "blue cheese",
      "gorgonzola",
      "cotija",
      "queso fresco",
      "ricotta salata",
    ],
  },
  {
    category: "Beans & Legumes",
    description: "Protein-rich beans and legumes",
    items: [
      "black beans",
      "kidney beans",
      "pinto beans",
      "cannellini beans",
      "chickpeas",
      "garbanzo beans",
      "lentils",
      "navy beans",
      "great northern beans",
      "lima beans",
    ],
  },
  {
    category: "Fresh Herbs",
    description: "Fresh herbs for finishing dishes",
    items: [
      "basil",
      "parsley",
      "cilantro",
      "mint",
      "dill",
      "chives",
      "tarragon",
      "oregano",
      "thyme",
      "rosemary",
    ],
  },
  {
    category: "Alliums",
    description: "Onion family aromatics",
    items: [
      "yellow onion",
      "white onion",
      "red onion",
      "shallot",
      "green onion",
      "scallion",
      "leek",
      "chives",
    ],
  },
  {
    category: "Hot Peppers",
    description: "Spicy peppers for heat",
    items: [
      "jalapeno",
      "serrano",
      "habanero",
      "thai chili",
      "fresno pepper",
      "cayenne",
      "poblano",
      "anaheim pepper",
    ],
  },
  {
    category: "Sweeteners",
    description: "Sugar and natural sweeteners",
    items: [
      "sugar",
      "brown sugar",
      "honey",
      "maple syrup",
      "agave",
      "molasses",
      "coconut sugar",
      "stevia",
    ],
  },
  {
    category: "Broths & Stocks",
    description: "Liquid bases for cooking",
    items: [
      "chicken broth",
      "chicken stock",
      "beef broth",
      "beef stock",
      "vegetable broth",
      "vegetable stock",
      "bone broth",
      "mushroom broth",
    ],
  },
  {
    category: "Soy-Based Sauces",
    description: "Umami-rich Asian sauces",
    items: [
      "soy sauce",
      "tamari",
      "coconut aminos",
      "liquid aminos",
      "teriyaki sauce",
    ],
  },
  {
    category: "Creamy Bases",
    description: "Creamy additions for sauces and dips",
    items: [
      "sour cream",
      "greek yogurt",
      "plain yogurt",
      "cream cheese",
      "creme fraiche",
      "cottage cheese",
      "ricotta",
    ],
  },
  {
    category: "Nut Butters",
    description: "Nut and seed spreads",
    items: [
      "peanut butter",
      "almond butter",
      "cashew butter",
      "sunflower seed butter",
      "tahini",
    ],
  },
  {
    category: "Eggs & Egg Substitutes",
    description: "Eggs and binding alternatives",
    items: [
      "eggs",
      "egg whites",
      "liquid eggs",
      "egg substitute",
      "just egg",
      "flax egg",
    ],
  },
];

/**
 * Find which substitution category an ingredient belongs to
 */
export function findSubstitutionCategory(ingredient: string): SubstitutionGroup | null {
  const normalized = ingredient.toLowerCase().trim();
  
  for (const group of INGREDIENT_SUBSTITUTIONS) {
    for (const item of group.items) {
      if (
        normalized.includes(item) || 
        item.includes(normalized) ||
        normalized === item
      ) {
        return group;
      }
    }
  }
  
  return null;
}

/**
 * Get possible substitutes for an ingredient
 */
export function getSubstitutes(ingredient: string): string[] {
  const category = findSubstitutionCategory(ingredient);
  if (!category) return [];
  
  const normalized = ingredient.toLowerCase().trim();
  return category.items.filter(item => item !== normalized);
}

/**
 * Format substitutions for inclusion in AI prompt
 */
export function formatSubstitutionsForPrompt(): string {
  let text = "";
  
  for (const group of INGREDIENT_SUBSTITUTIONS) {
    text += `- ${group.category}: ${group.items.slice(0, 5).join(", ")}${group.items.length > 5 ? ", etc." : ""}\n`;
  }
  
  return text;
}
