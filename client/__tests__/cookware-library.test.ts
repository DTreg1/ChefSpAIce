interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: { name: string; amount: string }[];
  requiredCookware?: string[];
  optionalCookware?: string[];
  isFavorite?: boolean;
}

interface Appliance {
  id: number;
  name: string;
  category: string;
  description: string;
  icon: string;
  isCommon: boolean;
  alternatives: string[];
}

function canMakeWithCookware(recipe: Recipe, userCookware: string[]): boolean {
  if (!recipe.requiredCookware || recipe.requiredCookware.length === 0) {
    return true;
  }
  if (userCookware.length === 0) {
    return true;
  }
  const userCookwareLower = userCookware.map((e) => e.toLowerCase());
  return recipe.requiredCookware.every((eq) =>
    userCookwareLower.includes(eq.toLowerCase()),
  );
}

function getMissingCookware(recipe: Recipe, userCookware: string[]): string[] {
  if (!recipe.requiredCookware || recipe.requiredCookware.length === 0) {
    return [];
  }
  return recipe.requiredCookware.filter(
    (eq) => !userCookware.includes(eq.toLowerCase()),
  );
}

function canUseAlternative(
  requiredCookware: string,
  userCookware: string[],
  appliances: Appliance[],
): boolean {
  const appliance = appliances.find(
    (a) => a.name.toLowerCase() === requiredCookware.toLowerCase(),
  );
  if (
    !appliance ||
    !appliance.alternatives ||
    appliance.alternatives.length === 0
  ) {
    return false;
  }
  const userCookwareLower = userCookware.map((e) => e.toLowerCase());
  return appliance.alternatives.some((alt) =>
    userCookwareLower.includes(alt.toLowerCase()),
  );
}

function filterRecipesByCookware(
  recipes: Recipe[],
  userCookware: string[],
): Recipe[] {
  return recipes.filter((recipe) => canMakeWithCookware(recipe, userCookware));
}

function getCookwareStats(
  recipes: Recipe[],
  userCookware: string[],
): { canMake: number; cannotMake: number; noRequirements: number } {
  let canMake = 0;
  let cannotMake = 0;
  let noRequirements = 0;

  for (const recipe of recipes) {
    if (!recipe.requiredCookware || recipe.requiredCookware.length === 0) {
      noRequirements++;
    } else if (canMakeWithCookware(recipe, userCookware)) {
      canMake++;
    } else {
      cannotMake++;
    }
  }

  return { canMake, cannotMake, noRequirements };
}

describe("Cookware Library Tests", () => {
  describe("Cookware filtering logic", () => {
    const testRecipes: Recipe[] = [
      {
        id: "1",
        title: "Pasta",
        description: "Simple pasta",
        ingredients: [{ name: "pasta", amount: "500g" }],
        requiredCookware: ["pot", "strainer"],
      },
      {
        id: "2",
        title: "Salad",
        description: "Fresh salad",
        ingredients: [{ name: "lettuce", amount: "1 head" }],
        requiredCookware: ["cutting board", "knife"],
      },
      {
        id: "3",
        title: "Blended Soup",
        description: "Creamy soup",
        ingredients: [{ name: "vegetables", amount: "500g" }],
        requiredCookware: ["blender", "pot"],
      },
      {
        id: "4",
        title: "Toast",
        description: "Simple toast",
        ingredients: [{ name: "bread", amount: "2 slices" }],
      },
      {
        id: "5",
        title: "Baked Chicken",
        description: "Roasted chicken",
        ingredients: [{ name: "chicken", amount: "1 whole" }],
        requiredCookware: ["oven", "roasting pan"],
        optionalCookware: ["meat thermometer"],
      },
    ];

    it("returns true when recipe has no required cookware", () => {
      const recipe = testRecipes[3];
      const userCookware = ["knife", "cutting board"];
      expect(canMakeWithCookware(recipe, userCookware)).toBe(true);
    });

    it("returns true when user has no cookware (allows all recipes)", () => {
      const recipe = testRecipes[0];
      const userCookware: string[] = [];
      expect(canMakeWithCookware(recipe, userCookware)).toBe(true);
    });

    it("returns true when user has all required cookware", () => {
      const recipe = testRecipes[0];
      const userCookware = ["pot", "strainer", "knife"];
      expect(canMakeWithCookware(recipe, userCookware)).toBe(true);
    });

    it("returns false when user is missing required cookware", () => {
      const recipe = testRecipes[0];
      const userCookware = ["pot"];
      expect(canMakeWithCookware(recipe, userCookware)).toBe(false);
    });

    it("handles case-insensitive cookware matching", () => {
      const recipe = testRecipes[0];
      const userCookware = ["POT", "STRAINER"];
      expect(canMakeWithCookware(recipe, userCookware)).toBe(true);
    });

    it("identifies missing cookware correctly", () => {
      const recipe = testRecipes[0];
      const userCookware = ["pot"];
      const missing = getMissingCookware(recipe, userCookware);
      expect(missing).toContain("strainer");
      expect(missing).not.toContain("pot");
    });

    it("returns empty array when no cookware is missing", () => {
      const recipe = testRecipes[0];
      const userCookware = ["pot", "strainer"];
      const missing = getMissingCookware(recipe, userCookware);
      expect(missing.length).toBe(0);
    });

    it("returns empty array for recipes with no requirements", () => {
      const recipe = testRecipes[3];
      const userCookware = ["knife"];
      const missing = getMissingCookware(recipe, userCookware);
      expect(missing.length).toBe(0);
    });
  });

  describe("Recipe filtering by cookware", () => {
    const recipes: Recipe[] = [
      {
        id: "1",
        title: "Recipe A",
        description: "",
        ingredients: [],
        requiredCookware: ["blender"],
      },
      {
        id: "2",
        title: "Recipe B",
        description: "",
        ingredients: [],
        requiredCookware: ["oven"],
      },
      {
        id: "3",
        title: "Recipe C",
        description: "",
        ingredients: [],
      },
      {
        id: "4",
        title: "Recipe D",
        description: "",
        ingredients: [],
        requiredCookware: ["blender", "pot"],
      },
    ];

    it("filters recipes to only those user can make", () => {
      const userCookware = ["blender"];
      const filtered = filterRecipesByCookware(recipes, userCookware);
      expect(filtered.length).toBe(2);
      expect(filtered.map((r) => r.id)).toContain("1");
      expect(filtered.map((r) => r.id)).toContain("3");
    });

    it("includes recipes with no requirements", () => {
      const userCookware = ["oven"];
      const filtered = filterRecipesByCookware(recipes, userCookware);
      expect(filtered.map((r) => r.id)).toContain("3");
    });

    it("returns all recipes when user has no cookware", () => {
      const userCookware: string[] = [];
      const filtered = filterRecipesByCookware(recipes, userCookware);
      expect(filtered.length).toBe(4);
    });

    it("returns all recipes when user has all cookware", () => {
      const userCookware = ["blender", "oven", "pot"];
      const filtered = filterRecipesByCookware(recipes, userCookware);
      expect(filtered.length).toBe(4);
    });

    it("correctly calculates cookware stats", () => {
      const userCookware = ["blender"];
      const stats = getCookwareStats(recipes, userCookware);
      expect(stats.canMake).toBe(1);
      expect(stats.cannotMake).toBe(2);
      expect(stats.noRequirements).toBe(1);
    });
  });

  describe("Cookware alternatives", () => {
    const appliances: Appliance[] = [
      {
        id: 1,
        name: "Air Fryer",
        category: "small appliances",
        description: "Countertop convection oven",
        icon: "wind",
        isCommon: false,
        alternatives: ["Oven", "Convection Oven"],
      },
      {
        id: 2,
        name: "Stand Mixer",
        category: "small appliances",
        description: "Heavy-duty mixer",
        icon: "disc",
        isCommon: false,
        alternatives: ["Hand Mixer", "Whisk"],
      },
      {
        id: 3,
        name: "Blender",
        category: "small appliances",
        description: "High-speed blender",
        icon: "wind",
        isCommon: true,
        alternatives: ["Immersion Blender", "Food Processor"],
      },
      {
        id: 4,
        name: "Knife",
        category: "essential",
        description: "Chef's knife",
        icon: "tool",
        isCommon: true,
        alternatives: [],
      },
    ];

    it("finds alternative when user has substitute cookware", () => {
      const userCookware = ["oven"];
      const canUse = canUseAlternative("Air Fryer", userCookware, appliances);
      expect(canUse).toBe(true);
    });

    it("returns false when no alternatives available", () => {
      const userCookware = ["cutting board"];
      const canUse = canUseAlternative("Knife", userCookware, appliances);
      expect(canUse).toBe(false);
    });

    it("returns false when user doesn't have alternative", () => {
      const userCookware = ["knife"];
      const canUse = canUseAlternative("Air Fryer", userCookware, appliances);
      expect(canUse).toBe(false);
    });

    it("returns false for unknown cookware", () => {
      const userCookware = ["oven"];
      const canUse = canUseAlternative(
        "Unknown Cookware",
        userCookware,
        appliances,
      );
      expect(canUse).toBe(false);
    });

    it("handles case-insensitive alternative matching", () => {
      const userCookware = ["OVEN"];
      const canUse = canUseAlternative("air fryer", userCookware, appliances);
      expect(canUse).toBe(true);
    });

    it("finds any matching alternative from list", () => {
      const userCookware = ["convection oven"];
      const canUse = canUseAlternative("Air Fryer", userCookware, appliances);
      expect(canUse).toBe(true);
    });
  });

  describe("Cookware selection state", () => {
    it("starts with empty selection when no preselected items", () => {
      const preselected: number[] = [];
      const selectedIds = new Set(preselected);
      expect(selectedIds.size).toBe(0);
    });

    it("initializes with preselected items", () => {
      const preselected = [1, 2, 3];
      const selectedIds = new Set(preselected);
      expect(selectedIds.size).toBe(3);
      expect(selectedIds.has(1)).toBe(true);
      expect(selectedIds.has(2)).toBe(true);
      expect(selectedIds.has(3)).toBe(true);
    });

    it("toggles item selection correctly", () => {
      const selectedIds = new Set<number>([1, 2]);
      const toggle = (id: number) => {
        if (selectedIds.has(id)) {
          selectedIds.delete(id);
        } else {
          selectedIds.add(id);
        }
      };

      toggle(2);
      expect(selectedIds.has(2)).toBe(false);
      toggle(3);
      expect(selectedIds.has(3)).toBe(true);
    });

    it("batch select adds all items", () => {
      const selectedIds = new Set<number>([1]);
      const categoryItems = [2, 3, 4, 5];

      categoryItems.forEach((id) => selectedIds.add(id));

      expect(selectedIds.size).toBe(5);
      categoryItems.forEach((id) => {
        expect(selectedIds.has(id)).toBe(true);
      });
    });

    it("batch deselect removes all items", () => {
      const selectedIds = new Set<number>([1, 2, 3, 4, 5]);
      const categoryItems = [2, 3, 4];

      categoryItems.forEach((id) => selectedIds.delete(id));

      expect(selectedIds.size).toBe(2);
      expect(selectedIds.has(1)).toBe(true);
      expect(selectedIds.has(5)).toBe(true);
    });
  });

  describe("Common items preselection", () => {
    const allAppliances: Appliance[] = [
      {
        id: 1,
        name: "Knife",
        category: "essential",
        description: "",
        icon: "tool",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 2,
        name: "Cutting Board",
        category: "essential",
        description: "",
        icon: "square",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 3,
        name: "Pot",
        category: "cooking",
        description: "",
        icon: "disc",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 4,
        name: "Air Fryer",
        category: "small appliances",
        description: "",
        icon: "wind",
        isCommon: false,
        alternatives: [],
      },
      {
        id: 5,
        name: "Stand Mixer",
        category: "small appliances",
        description: "",
        icon: "disc",
        isCommon: false,
        alternatives: [],
      },
      {
        id: 6,
        name: "Mixing Bowls",
        category: "prep tools",
        description: "",
        icon: "disc",
        isCommon: true,
        alternatives: [],
      },
    ];

    it("identifies common items correctly", () => {
      const commonItems = allAppliances.filter((a) => a.isCommon);
      expect(commonItems.length).toBe(4);
    });

    it("preselects all common items in setup mode", () => {
      const commonItems = allAppliances.filter((a) => a.isCommon);
      const selectedIds = new Set(commonItems.map((a) => a.id));

      expect(selectedIds.size).toBe(4);
      expect(selectedIds.has(1)).toBe(true);
      expect(selectedIds.has(2)).toBe(true);
      expect(selectedIds.has(3)).toBe(true);
      expect(selectedIds.has(6)).toBe(true);
      expect(selectedIds.has(4)).toBe(false);
    });

    it("does not preselect non-common items", () => {
      const commonItems = allAppliances.filter((a) => a.isCommon);
      const selectedIds = new Set(commonItems.map((a) => a.id));

      expect(selectedIds.has(4)).toBe(false);
      expect(selectedIds.has(5)).toBe(false);
    });

    it("converts selected IDs to array correctly", () => {
      const selectedIds = new Set([1, 2, 3]);
      const result = Array.from(selectedIds);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(3);
      expect(result).toContain(1);
      expect(result).toContain(2);
      expect(result).toContain(3);
    });
  });

  describe("Cookware categories", () => {
    const allAppliances: Appliance[] = [
      {
        id: 1,
        name: "Knife",
        category: "essential",
        description: "",
        icon: "tool",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 2,
        name: "Pot",
        category: "cooking",
        description: "",
        icon: "disc",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 3,
        name: "Baking Sheet",
        category: "bakeware",
        description: "",
        icon: "square",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 4,
        name: "Blender",
        category: "small appliances",
        description: "",
        icon: "wind",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 5,
        name: "Whisk",
        category: "prep tools",
        description: "",
        icon: "disc",
        isCommon: true,
        alternatives: [],
      },
      {
        id: 6,
        name: "Waffle Iron",
        category: "specialty",
        description: "",
        icon: "grid",
        isCommon: false,
        alternatives: [],
      },
    ];

    const CATEGORIES = [
      { id: "essential", label: "Essential" },
      { id: "cooking", label: "Cooking" },
      { id: "bakeware", label: "Bakeware" },
      { id: "small appliances", label: "Small Appliances" },
      { id: "prep tools", label: "Prep Tools" },
      { id: "specialty", label: "Specialty" },
    ];

    it("groups appliances by category correctly", () => {
      const grouped: Record<string, Appliance[]> = {};
      CATEGORIES.forEach((cat) => {
        grouped[cat.id] = allAppliances.filter(
          (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
        );
      });

      expect(grouped["essential"].length).toBe(1);
      expect(grouped["cooking"].length).toBe(1);
      expect(grouped["bakeware"].length).toBe(1);
      expect(grouped["small appliances"].length).toBe(1);
      expect(grouped["prep tools"].length).toBe(1);
      expect(grouped["specialty"].length).toBe(1);
    });

    it("counts selected items per category", () => {
      const selectedIds = new Set([1, 2, 4]);
      const grouped: Record<string, Appliance[]> = {};
      CATEGORIES.forEach((cat) => {
        grouped[cat.id] = allAppliances.filter(
          (a) => a.category.toLowerCase() === cat.id.toLowerCase(),
        );
      });

      const countSelected = (categoryId: string) => {
        return grouped[categoryId].filter((a) => selectedIds.has(a.id)).length;
      };

      expect(countSelected("essential")).toBe(1);
      expect(countSelected("cooking")).toBe(1);
      expect(countSelected("bakeware")).toBe(0);
      expect(countSelected("small appliances")).toBe(1);
      expect(countSelected("prep tools")).toBe(0);
      expect(countSelected("specialty")).toBe(0);
    });

    it("checks if all items in category are selected", () => {
      const selectedIds = new Set([1]);
      const essentialItems = allAppliances.filter(
        (a) => a.category === "essential",
      );
      const allSelected = essentialItems.every((a) => selectedIds.has(a.id));
      expect(allSelected).toBe(true);
    });

    it("correctly identifies partial selection in category", () => {
      const selectedIds = new Set([1, 2]);
      const allItems = allAppliances;
      const selectedCount = allItems.filter((a) =>
        selectedIds.has(a.id),
      ).length;

      expect(selectedCount).toBe(2);
      expect(selectedCount < allItems.length).toBe(true);
    });
  });

  describe("Owned cookware display state", () => {
    it("correctly shows owned state for items in user list", () => {
      const ownedIds = new Set([1, 2, 3]);
      const appliance = { id: 2, name: "Test" };

      expect(ownedIds.has(appliance.id)).toBe(true);
    });

    it("correctly shows not-owned state for items not in user list", () => {
      const ownedIds = new Set([1, 2, 3]);
      const appliance = { id: 5, name: "Test" };

      expect(ownedIds.has(appliance.id)).toBe(false);
    });

    it("updates owned state after toggle add", () => {
      const ownedIds = new Set([1, 2]);
      const applianceToAdd = 3;

      ownedIds.add(applianceToAdd);
      expect(ownedIds.has(applianceToAdd)).toBe(true);
    });

    it("updates owned state after toggle remove", () => {
      const ownedIds = new Set([1, 2, 3]);
      const applianceToRemove = 2;

      ownedIds.delete(applianceToRemove);
      expect(ownedIds.has(applianceToRemove)).toBe(false);
    });
  });

  describe("Editable prop behavior", () => {
    it("allows toggling when editable is true", () => {
      const editable = true;
      const selectedIds = new Set([1, 2]);

      if (editable) {
        selectedIds.add(3);
      }

      expect(selectedIds.has(3)).toBe(true);
    });

    it("prevents toggling when editable is false", () => {
      const editable = false;
      const selectedIds = new Set([1, 2]);

      if (editable) {
        selectedIds.add(3);
      }

      expect(selectedIds.has(3)).toBe(false);
    });
  });
});
