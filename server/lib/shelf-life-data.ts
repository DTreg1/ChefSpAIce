export interface ShelfLifeEntry {
  category: string;
  refrigerator: number;
  freezer: number;
  pantry: number;
  counter: number;
  notes?: string;
}

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

const categoryKeywords: Record<string, string[]> = {
  milk: ["dairy", "cream", "lactose", "half and half", "creamer"],
  cheese: [
    "cheddar",
    "mozzarella",
    "parmesan",
    "brie",
    "gouda",
    "swiss",
    "feta",
    "ricotta",
  ],
  yogurt: ["greek", "probiotic", "kefir"],
  beef: ["steak", "ground beef", "roast", "brisket", "ribeye", "sirloin"],
  chicken: [
    "poultry",
    "turkey",
    "duck",
    "wings",
    "breast",
    "thigh",
    "drumstick",
  ],
  pork: ["bacon", "ham", "sausage", "chop", "tenderloin", "ribs"],
  seafood: [
    "fish",
    "salmon",
    "tuna",
    "shrimp",
    "lobster",
    "crab",
    "shellfish",
    "cod",
    "tilapia",
  ],
  fruits: [
    "apple",
    "banana",
    "orange",
    "berry",
    "grape",
    "melon",
    "citrus",
    "mango",
    "pear",
  ],
  vegetables: [
    "carrot",
    "broccoli",
    "spinach",
    "lettuce",
    "tomato",
    "onion",
    "pepper",
    "celery",
    "cucumber",
  ],
  bread: ["loaf", "baguette", "roll", "toast", "sourdough", "pita", "naan"],
  bakery: ["cake", "pastry", "cookie", "muffin", "croissant", "donut", "pie"],
  eggs: ["egg", "omelette"],
  condiments: [
    "ketchup",
    "mustard",
    "mayo",
    "mayonnaise",
    "salsa",
    "dressing",
    "relish",
  ],
  leftovers: ["leftover", "cooked", "prepared"],
  grains: ["rice", "quinoa", "oat", "barley", "wheat", "couscous", "bulgur"],
  pasta: [
    "spaghetti",
    "noodle",
    "macaroni",
    "penne",
    "linguine",
    "fettuccine",
    "ravioli",
  ],
  snacks: ["chip", "cracker", "pretzel", "popcorn", "trail mix"],
  spices: [
    "spice",
    "seasoning",
    "cumin",
    "paprika",
    "oregano",
    "basil dried",
    "thyme dried",
  ],
  herbs: ["basil", "cilantro", "parsley", "mint", "rosemary", "thyme", "dill"],
  nuts: [
    "almond",
    "walnut",
    "peanut",
    "cashew",
    "pistachio",
    "pecan",
    "hazelnut",
  ],
  juice: ["orange juice", "apple juice", "smoothie", "lemonade"],
  sauces: ["sauce", "marinara", "pesto", "gravy", "teriyaki", "bbq"],
};

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

export function getShelfLifeEntry(category: string): ShelfLifeEntry | null {
  const normalizedCategory = category.toLowerCase().trim();

  return (
    SHELF_LIFE_DATA.find(
      (item) => item.category.toLowerCase() === normalizedCategory,
    ) || null
  );
}

export function findPartialMatch(foodName: string): {
  days: number;
  notes?: string;
  matchedCategory: string;
  location: string;
} | null {
  const normalizedName = foodName.toLowerCase().trim();

  for (const entry of SHELF_LIFE_DATA) {
    const entryCategory = entry.category.toLowerCase();

    if (
      normalizedName.includes(entryCategory) ||
      entryCategory.includes(normalizedName)
    ) {
      return {
        days: entry.refrigerator || entry.pantry || entry.freezer || 7,
        notes: entry.notes,
        matchedCategory: entry.category,
        location:
          entry.refrigerator > 0
            ? "refrigerator"
            : entry.pantry > 0
              ? "pantry"
              : "freezer",
      };
    }
  }

  for (const [mainCategory, keywords] of Object.entries(categoryKeywords)) {
    if (keywords.some((keyword) => normalizedName.includes(keyword))) {
      const entry = SHELF_LIFE_DATA.find(
        (e) => e.category.toLowerCase() === mainCategory,
      );
      if (entry) {
        return {
          days: entry.refrigerator || entry.pantry || entry.freezer || 7,
          notes: entry.notes,
          matchedCategory: entry.category,
          location:
            entry.refrigerator > 0
              ? "refrigerator"
              : entry.pantry > 0
                ? "pantry"
                : "freezer",
        };
      }
    }
  }

  return null;
}

export function getShelfLifeForLocation(
  category: string,
  storageLocation: string,
): { days: number; notes?: string } | null {
  const normalizedLocation = storageLocation.toLowerCase().trim();

  const locationMap: Record<string, string> = {
    fridge: "refrigerator",
    freezer: "freezer",
    pantry: "pantry",
    counter: "counter",
    refrigerator: "refrigerator",
  };

  const mappedLocation = locationMap[normalizedLocation];
  if (!mappedLocation) {
    return null;
  }

  const days = getShelfLife(category, mappedLocation);
  const entry = getShelfLifeEntry(category);

  if (days !== null && days > 0 && entry) {
    return {
      days,
      notes: entry.notes,
    };
  }

  return null;
}
