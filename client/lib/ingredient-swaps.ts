export interface IngredientSwap {
  original: string;
  alternative: string;
  ratio: number;
  notes?: string;
  dietaryTags: string[];
}

interface _SwapCategory {
  name: string;
  swaps: IngredientSwap[];
}
// @ts-ignore - defined for future use
type SwapCategory = _SwapCategory;

export const DIETARY_FILTERS = [
  { id: "vegan", label: "Vegan", icon: "feather" },
  { id: "vegetarian", label: "Vegetarian", icon: "heart" },
  { id: "dairy-free", label: "Dairy Free", icon: "droplet" },
  { id: "gluten-free", label: "Gluten Free", icon: "slash" },
  { id: "nut-free", label: "Nut Free", icon: "x-circle" },
  { id: "low-carb", label: "Low Carb", icon: "trending-down" },
  { id: "keto", label: "Keto", icon: "zap" },
] as const;

export type DietaryFilter = (typeof DIETARY_FILTERS)[number]["id"];

const INGREDIENT_SWAPS: Record<string, IngredientSwap[]> = {
  butter: [
    {
      original: "butter",
      alternative: "coconut oil",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Works well in baking",
    },
    {
      original: "butter",
      alternative: "olive oil",
      ratio: 0.75,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Use 3/4 cup oil per 1 cup butter",
    },
    {
      original: "butter",
      alternative: "avocado",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "low-carb", "keto"],
      notes: "Great for spreading",
    },
    {
      original: "butter",
      alternative: "applesauce",
      ratio: 0.5,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Use half the amount, adds sweetness",
    },
    {
      original: "butter",
      alternative: "Greek yogurt",
      ratio: 0.5,
      dietaryTags: ["vegetarian"],
      notes: "Use half the amount",
    },
    {
      original: "butter",
      alternative: "ghee",
      ratio: 1,
      dietaryTags: ["vegetarian", "keto"],
      notes: "Lactose-free but not vegan",
    },
  ],
  milk: [
    {
      original: "milk",
      alternative: "almond milk",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Lighter flavor",
    },
    {
      original: "milk",
      alternative: "oat milk",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "Creamy texture",
    },
    {
      original: "milk",
      alternative: "coconut milk",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "Rich and creamy",
    },
    {
      original: "milk",
      alternative: "soy milk",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "High protein",
    },
    {
      original: "milk",
      alternative: "cashew milk",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Neutral flavor",
    },
  ],
  eggs: [
    {
      original: "eggs",
      alternative: "flax egg (1 tbsp flax + 3 tbsp water)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Let sit 5 min to gel",
    },
    {
      original: "eggs",
      alternative: "chia egg (1 tbsp chia + 3 tbsp water)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Let sit 5 min to gel",
    },
    {
      original: "eggs",
      alternative: "mashed banana (1/4 cup)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Adds sweetness, good for baking",
    },
    {
      original: "eggs",
      alternative: "applesauce (1/4 cup)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Works in moist recipes",
    },
    {
      original: "eggs",
      alternative: "silken tofu (1/4 cup blended)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Neutral flavor",
    },
    {
      original: "eggs",
      alternative: "aquafaba (3 tbsp)",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Chickpea water, great for meringues",
    },
  ],
  cream: [
    {
      original: "cream",
      alternative: "coconut cream",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Rich and thick",
    },
    {
      original: "cream",
      alternative: "cashew cream",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Soak and blend cashews",
    },
    {
      original: "cream",
      alternative: "silken tofu blended",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "Neutral flavor",
    },
    {
      original: "cream",
      alternative: "evaporated milk",
      ratio: 1,
      dietaryTags: ["vegetarian"],
      notes: "Lower fat option",
    },
  ],
  cheese: [
    {
      original: "cheese",
      alternative: "nutritional yeast",
      ratio: 0.5,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Cheesy flavor, use half",
    },
    {
      original: "cheese",
      alternative: "cashew cheese",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Creamy texture",
    },
    {
      original: "cheese",
      alternative: "tofu ricotta",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "Works in lasagna",
    },
    {
      original: "cheese",
      alternative: "avocado",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free", "nut-free"],
      notes: "Creamy replacement",
    },
  ],
  flour: [
    {
      original: "flour",
      alternative: "almond flour",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto"],
      notes: "Denser texture",
    },
    {
      original: "flour",
      alternative: "coconut flour",
      ratio: 0.25,
      dietaryTags: ["gluten-free", "low-carb", "keto", "nut-free"],
      notes: "Use 1/4 cup per 1 cup flour",
    },
    {
      original: "flour",
      alternative: "oat flour",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Check oats are certified GF",
    },
    {
      original: "flour",
      alternative: "rice flour",
      ratio: 1,
      dietaryTags: ["gluten-free", "nut-free"],
      notes: "Good for thickening",
    },
    {
      original: "flour",
      alternative: "cassava flour",
      ratio: 1,
      dietaryTags: ["gluten-free", "nut-free"],
      notes: "Most similar to wheat",
    },
  ],
  sugar: [
    {
      original: "sugar",
      alternative: "honey",
      ratio: 0.75,
      dietaryTags: ["vegetarian"],
      notes: "Use 3/4 cup per 1 cup sugar",
    },
    {
      original: "sugar",
      alternative: "maple syrup",
      ratio: 0.75,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Reduce liquid slightly",
    },
    {
      original: "sugar",
      alternative: "stevia",
      ratio: 0.02,
      dietaryTags: ["vegan", "low-carb", "keto"],
      notes: "Very concentrated",
    },
    {
      original: "sugar",
      alternative: "erythritol",
      ratio: 1,
      dietaryTags: ["vegan", "low-carb", "keto"],
      notes: "1:1 replacement",
    },
    {
      original: "sugar",
      alternative: "coconut sugar",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Lower glycemic index",
    },
    {
      original: "sugar",
      alternative: "date paste",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Natural sweetness",
    },
  ],
  "sour cream": [
    {
      original: "sour cream",
      alternative: "Greek yogurt",
      ratio: 1,
      dietaryTags: ["vegetarian"],
      notes: "Lower fat option",
    },
    {
      original: "sour cream",
      alternative: "coconut yogurt",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Tangy flavor",
    },
    {
      original: "sour cream",
      alternative: "cashew cream with lemon",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Add lemon for tang",
    },
  ],
  "soy sauce": [
    {
      original: "soy sauce",
      alternative: "coconut aminos",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Slightly sweeter",
    },
    {
      original: "soy sauce",
      alternative: "tamari",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Similar flavor, check label",
    },
    {
      original: "soy sauce",
      alternative: "liquid aminos",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Concentrated flavor",
    },
  ],
  "bread crumbs": [
    {
      original: "bread crumbs",
      alternative: "crushed pork rinds",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto"],
      notes: "Crunchy coating",
    },
    {
      original: "bread crumbs",
      alternative: "almond flour",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto"],
      notes: "Fine texture",
    },
    {
      original: "bread crumbs",
      alternative: "crushed nuts",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Adds flavor",
    },
    {
      original: "bread crumbs",
      alternative: "oat flour",
      ratio: 1,
      dietaryTags: ["gluten-free"],
      notes: "Check oats are certified GF",
    },
  ],
  chicken: [
    {
      original: "chicken",
      alternative: "tofu",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Press well, marinate",
    },
    {
      original: "chicken",
      alternative: "tempeh",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Nutty flavor",
    },
    {
      original: "chicken",
      alternative: "seitan",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Chewy texture, contains gluten",
    },
    {
      original: "chicken",
      alternative: "jackfruit",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian", "gluten-free"],
      notes: "Shredded texture",
    },
    {
      original: "chicken",
      alternative: "chickpeas",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian", "gluten-free"],
      notes: "Mash for salads",
    },
  ],
  beef: [
    {
      original: "beef",
      alternative: "mushrooms",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian", "gluten-free"],
      notes: "Portobello for steaks",
    },
    {
      original: "beef",
      alternative: "lentils",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian", "gluten-free"],
      notes: "Great for tacos",
    },
    {
      original: "beef",
      alternative: "textured vegetable protein",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian"],
      notes: "Rehydrate before use",
    },
    {
      original: "beef",
      alternative: "black beans",
      ratio: 1,
      dietaryTags: ["vegan", "vegetarian", "gluten-free"],
      notes: "Works in burgers",
    },
  ],
  pasta: [
    {
      original: "pasta",
      alternative: "zucchini noodles",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto", "vegan"],
      notes: "Spiralize fresh",
    },
    {
      original: "pasta",
      alternative: "spaghetti squash",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "vegan"],
      notes: "Roast and scrape",
    },
    {
      original: "pasta",
      alternative: "shirataki noodles",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto", "vegan"],
      notes: "Rinse well",
    },
    {
      original: "pasta",
      alternative: "rice noodles",
      ratio: 1,
      dietaryTags: ["gluten-free", "vegan"],
      notes: "Lighter texture",
    },
  ],
  rice: [
    {
      original: "rice",
      alternative: "cauliflower rice",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto", "vegan"],
      notes: "Pulse in food processor",
    },
    {
      original: "rice",
      alternative: "quinoa",
      ratio: 1,
      dietaryTags: ["gluten-free", "vegan"],
      notes: "Higher protein",
    },
    {
      original: "rice",
      alternative: "riced broccoli",
      ratio: 1,
      dietaryTags: ["gluten-free", "low-carb", "keto", "vegan"],
      notes: "Extra nutrients",
    },
  ],
  mayonnaise: [
    {
      original: "mayonnaise",
      alternative: "Greek yogurt",
      ratio: 1,
      dietaryTags: ["vegetarian"],
      notes: "Tangy flavor",
    },
    {
      original: "mayonnaise",
      alternative: "avocado",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Creamy texture",
    },
    {
      original: "mayonnaise",
      alternative: "hummus",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Adds flavor",
    },
    {
      original: "mayonnaise",
      alternative: "vegan mayo",
      ratio: 1,
      dietaryTags: ["vegan", "dairy-free"],
      notes: "Direct substitute",
    },
  ],
  honey: [
    {
      original: "honey",
      alternative: "maple syrup",
      ratio: 1,
      dietaryTags: ["vegan"],
      notes: "Similar sweetness",
    },
    {
      original: "honey",
      alternative: "agave nectar",
      ratio: 1,
      dietaryTags: ["vegan"],
      notes: "Thinner consistency",
    },
    {
      original: "honey",
      alternative: "date syrup",
      ratio: 1,
      dietaryTags: ["vegan"],
      notes: "Rich flavor",
    },
  ],
};

const normalizeIngredient = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
    .replace(/s$/, "")
    .replace(/ies$/, "y");
};

const tokenize = (name: string): string[] => {
  return name
    .toLowerCase()
    .replace(/[^a-z\s]/g, "")
    .split(/\s+/)
    .filter((word) => word.length > 1);
};

const INGREDIENT_ALIASES: Record<string, string> = {
  "heavy cream": "cream",
  "whipping cream": "cream",
  "double cream": "cream",
  "half and half": "cream",
  "all-purpose flour": "flour",
  "all purpose flour": "flour",
  "ap flour": "flour",
  "white flour": "flour",
  "whole wheat flour": "flour",
  "bread flour": "flour",
  "cake flour": "flour",
  "self-rising flour": "flour",
  "whole milk": "milk",
  "skim milk": "milk",
  "2% milk": "milk",
  "1% milk": "milk",
  "unsalted butter": "butter",
  "salted butter": "butter",
  "melted butter": "butter",
  "softened butter": "butter",
  "cheddar cheese": "cheese",
  "mozzarella cheese": "cheese",
  "parmesan cheese": "cheese",
  "cream cheese": "cheese",
  "shredded cheese": "cheese",
  "grated cheese": "cheese",
  "swiss cheese": "cheese",
  "feta cheese": "cheese",
  "goat cheese": "cheese",
  "ricotta cheese": "cheese",
  granulated: "sugar",
  "granulated sugar": "sugar",
  "white sugar": "sugar",
  "brown sugar": "sugar",
  "cane sugar": "sugar",
  "powdered sugar": "sugar",
  "confectioners sugar": "sugar",
  "chicken breast": "chicken",
  "chicken thigh": "chicken",
  "chicken thighs": "chicken",
  "chicken breasts": "chicken",
  "boneless chicken": "chicken",
  "skinless chicken": "chicken",
  "ground beef": "beef",
  "beef steak": "beef",
  "beef chuck": "beef",
  steak: "beef",
  spaghetti: "pasta",
  penne: "pasta",
  fettuccine: "pasta",
  linguine: "pasta",
  rigatoni: "pasta",
  macaroni: "pasta",
  "elbow pasta": "pasta",
  "white rice": "rice",
  "brown rice": "rice",
  "jasmine rice": "rice",
  "basmati rice": "rice",
  "long grain rice": "rice",
  egg: "eggs",
  "large eggs": "eggs",
  "large egg": "eggs",
  "whole eggs": "eggs",
  "whole egg": "eggs",
  "heavy whipping cream": "cream",
  "light soy sauce": "soy sauce",
  "dark soy sauce": "soy sauce",
  "low sodium soy sauce": "soy sauce",
  panko: "bread crumbs",
  "panko bread crumbs": "bread crumbs",
  "italian bread crumbs": "bread crumbs",
};

export function findSwapsForIngredient(
  ingredientName: string,
  dietaryFilters: DietaryFilter[] = [],
): IngredientSwap[] {
  const normalized = normalizeIngredient(ingredientName);
  const tokens = tokenize(ingredientName);

  let lookupKey: string | null = null;

  for (const [alias, baseIngredient] of Object.entries(INGREDIENT_ALIASES)) {
    const normalizedAlias = normalizeIngredient(alias);
    if (
      normalized === normalizedAlias ||
      normalized.includes(normalizedAlias)
    ) {
      lookupKey = baseIngredient;
      break;
    }
  }

  if (!lookupKey) {
    if (INGREDIENT_SWAPS[normalized]) {
      lookupKey = normalized;
    }
  }

  if (!lookupKey) {
    for (const key of Object.keys(INGREDIENT_SWAPS)) {
      if (
        tokens.includes(key) ||
        normalized.includes(key) ||
        key.includes(normalized)
      ) {
        lookupKey = key;
        break;
      }
    }
  }

  let swaps = lookupKey ? INGREDIENT_SWAPS[lookupKey] || [] : [];

  if (dietaryFilters.length > 0) {
    swaps = swaps.filter((swap) =>
      dietaryFilters.every((filter) => swap.dietaryTags.includes(filter)),
    );
  }

  return swaps;
}

export function hasSwapsAvailable(ingredientName: string): boolean {
  return findSwapsForIngredient(ingredientName).length > 0;
}

export function formatSwapRatio(ratio: number): string {
  if (ratio === 1) return "1:1";
  if (ratio === 0.75) return "3:4";
  if (ratio === 0.5) return "1:2";
  if (ratio === 0.25) return "1:4";
  return `${ratio}:1`;
}
