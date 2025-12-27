import { useCallback, useMemo } from "react";
import {
  useNavigation,
  useRoute,
  NavigationProp,
} from "@react-navigation/native";
import { differenceInDays, parseISO, format } from "date-fns";
import { storage, FoodItem, Recipe } from "./storage";

export interface ParsedCommand {
  intent: CommandIntent;
  entities: Record<string, string>;
  confidence: number;
  rawText: string;
}

export type CommandIntent =
  | "ADD_FOOD"
  | "SEARCH_INVENTORY"
  | "GENERATE_RECIPE"
  | "READ_RECIPE"
  | "READ_INGREDIENTS"
  | "NEXT_STEP"
  | "PREVIOUS_STEP"
  | "REPEAT_STEP"
  | "GO_TO_STEP"
  | "STOP"
  | "PAUSE"
  | "FASTER"
  | "SLOWER"
  | "WHAT_EXPIRES"
  | "HELP"
  | "UNKNOWN";

export interface CommandResult {
  success: boolean;
  response: string;
  data?: unknown;
  action?: "navigate" | "mutation" | "query" | "speak";
  navigateTo?: { screen: string; params?: Record<string, unknown> };
}

export type ScreenContext =
  | "inventory"
  | "recipes"
  | "recipe_detail"
  | "meal_plan"
  | "profile"
  | "add_item"
  | "unknown";

interface CommandPattern {
  pattern: RegExp;
  intent: CommandIntent;
  extract: (match: RegExpMatchArray) => Record<string, string>;
  contexts?: ScreenContext[];
}

const COMMAND_PATTERNS: CommandPattern[] = [
  {
    pattern:
      /add (\d+)?\s*(.+?) to (?:my )?(?:inventory|pantry|fridge|freezer)/i,
    intent: "ADD_FOOD",
    extract: (match) => ({
      quantity: match[1] || "1",
      item: match[2].trim(),
    }),
  },
  {
    pattern: /add (\d+)?\s*(.+)/i,
    intent: "ADD_FOOD",
    extract: (match) => ({
      quantity: match[1] || "1",
      item: match[2].trim(),
    }),
  },
  {
    pattern: /do i have (?:any )?(.+)/i,
    intent: "SEARCH_INVENTORY",
    extract: (match) => ({ query: match[1].trim() }),
  },
  {
    pattern: /(?:search|find|look for) (.+?) in (?:my )?inventory/i,
    intent: "SEARCH_INVENTORY",
    extract: (match) => ({ query: match[1].trim() }),
  },
  {
    pattern:
      /(?:check|show|what) (?:is )?(?:in )?(?:my )?(?:inventory|pantry|fridge|freezer)/i,
    intent: "SEARCH_INVENTORY",
    extract: () => ({ query: "" }),
  },
  {
    pattern:
      /(?:make|generate|create|suggest) (?:a |me )?recipe (?:with|using|from) (.+)/i,
    intent: "GENERATE_RECIPE",
    extract: (match) => ({ ingredients: match[1].trim() }),
  },
  {
    pattern: /what can i (?:make|cook) (?:with|using|from) (.+)/i,
    intent: "GENERATE_RECIPE",
    extract: (match) => ({ ingredients: match[1].trim() }),
  },
  {
    pattern: /(?:make|generate|suggest) (?:me )?(?:a )?recipe/i,
    intent: "GENERATE_RECIPE",
    extract: () => ({ ingredients: "" }),
  },
  {
    pattern: /(?:show|give) (?:me )?(?:some )?recipes?/i,
    intent: "GENERATE_RECIPE",
    extract: () => ({ ingredients: "" }),
  },
  {
    pattern: /(?:what|find)(?: can i)? (?:cook|make)/i,
    intent: "GENERATE_RECIPE",
    extract: () => ({ ingredients: "" }),
  },
  {
    pattern: /read (?:me )?(?:the )?recipe(?: for (.+))?/i,
    intent: "READ_RECIPE",
    extract: (match) => ({ recipeName: match[1]?.trim() || "" }),
  },
  {
    pattern: /(?:start|begin) (?:reading )?(?:the )?recipe/i,
    intent: "READ_RECIPE",
    extract: () => ({ recipeName: "" }),
  },
  {
    pattern: /next(?: step)?/i,
    intent: "NEXT_STEP",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /(?:previous|back|go back)(?: step)?/i,
    intent: "PREVIOUS_STEP",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /repeat(?: (?:that|step|last))?/i,
    intent: "REPEAT_STEP",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /(?:go to |skip to )?step (\d+)/i,
    intent: "GO_TO_STEP",
    extract: (match) => ({ stepNumber: match[1] }),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /(?:read |list )?(?:the )?ingredients/i,
    intent: "READ_INGREDIENTS",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /stop(?: reading)?/i,
    intent: "STOP",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /pause/i,
    intent: "PAUSE",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /(?:speed up|faster|increase speed)/i,
    intent: "FASTER",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /(?:slow down|slower|decrease speed)/i,
    intent: "SLOWER",
    extract: () => ({}),
    contexts: ["recipe_detail"],
  },
  {
    pattern: /what(?:'s| is) expiring(?: soon)?/i,
    intent: "WHAT_EXPIRES",
    extract: () => ({}),
  },
  {
    pattern: /(?:show|list|check) (?:what(?:'s| is) )?expiring/i,
    intent: "WHAT_EXPIRES",
    extract: () => ({}),
  },
  {
    pattern: /what (?:will|is going to) expire/i,
    intent: "WHAT_EXPIRES",
    extract: () => ({}),
  },
  {
    pattern: /help|what can you do|commands|voice commands/i,
    intent: "HELP",
    extract: () => ({}),
  },
];

export function parseVoiceCommand(
  text: string,
  context?: ScreenContext,
): ParsedCommand {
  const normalizedText = text.toLowerCase().trim();

  for (const { pattern, intent, extract, contexts } of COMMAND_PATTERNS) {
    if (contexts && context && !contexts.includes(context)) {
      continue;
    }

    const match = normalizedText.match(pattern);
    if (match) {
      const matchLength = match[0].length / normalizedText.length;
      const confidence = Math.min(0.95, 0.7 + matchLength * 0.25);

      return {
        intent,
        entities: extract(match),
        confidence,
        rawText: text,
      };
    }
  }

  return {
    intent: "UNKNOWN",
    entities: {},
    confidence: 0,
    rawText: text,
  };
}

const HELP_RESPONSES: Record<ScreenContext, string> = {
  inventory: `You can say things like: "Add 2 apples to inventory", "Do I have milk?", "What's expiring soon?", or "Generate a recipe with chicken".`,
  recipes: `You can say: "Generate a recipe with pasta", "Read the recipe", or "What can I make with chicken and rice?".`,
  recipe_detail: `While viewing a recipe, say: "Next step", "Previous step", "Repeat", "Go to step 3", or "Read the recipe".`,
  meal_plan: `Try saying: "What's expiring soon?" to plan meals around items that need to be used.`,
  profile: `You can say: "What's expiring soon?" or "Generate a recipe" from here.`,
  add_item: `Say the name of the item you want to add, like "2 pounds of chicken breast".`,
  unknown: `I can help you manage your food inventory. Try saying: "Add milk to inventory", "Do I have eggs?", "What's expiring?", or "Generate a recipe with vegetables".`,
};

const RESPONSE_TEMPLATES = {
  ADD_FOOD: {
    success: (item: string, quantity: string) =>
      `Got it! I'll add ${quantity} ${item} to your inventory.`,
    navigate: "Opening the add item screen for you.",
  },
  SEARCH_INVENTORY: {
    found: (item: string, count: number) =>
      count === 1
        ? `Yes, you have ${item} in your inventory.`
        : `Yes, you have ${count} items matching "${item}".`,
    notFound: (item: string) =>
      `I couldn't find any ${item} in your inventory.`,
    showAll: "Here's your current inventory.",
  },
  GENERATE_RECIPE: {
    success: (ingredients: string) =>
      ingredients
        ? `Let me generate a recipe using ${ingredients}.`
        : `I'll help you generate a recipe with your available ingredients.`,
  },
  READ_RECIPE: {
    noRecipe: "Please open a recipe first, then ask me to read it.",
    starting: (title: string) => `Reading the recipe for ${title}.`,
  },
  STEP_NAVIGATION: {
    next: (step: number, text: string) => `Step ${step}: ${text}`,
    previous: (step: number, text: string) => `Back to step ${step}: ${text}`,
    repeat: (step: number, text: string) => `Step ${step}: ${text}`,
    noMore:
      "That's the end of the recipe. Would you like me to repeat any step?",
    atStart: "You're at the beginning of the recipe.",
    jumpTo: (step: number, text: string) => `Jumping to step ${step}: ${text}`,
    invalidStep: (max: number) => `Please choose a step between 1 and ${max}.`,
  },
  WHAT_EXPIRES: {
    hasItems: (items: string[]) => {
      if (items.length === 1) {
        return `${items[0]} is expiring soon.`;
      } else if (items.length <= 3) {
        return `These items are expiring soon: ${items.join(", ")}.`;
      }
      return `You have ${items.length} items expiring soon, including ${items.slice(0, 3).join(", ")}, and more.`;
    },
    noItems: "Great news! Nothing is expiring in the next few days.",
  },
  UNKNOWN: {
    default:
      "I didn't understand that command. Say 'help' to hear what I can do.",
    suggestion: (context: ScreenContext) =>
      `I didn't catch that. ${HELP_RESPONSES[context] || HELP_RESPONSES.unknown}`,
  },
};

interface RecipeStepContext {
  currentStep: number;
  totalSteps: number;
  recipe: Recipe | null;
  onStepChange?: (step: number) => void;
}

interface VoiceCommandHandlerOptions {
  screenContext?: ScreenContext;
  recipeContext?: RecipeStepContext;
  onNavigate?: (screen: string, params?: Record<string, unknown>) => void;
}

export function useVoiceCommandHandler(
  options: VoiceCommandHandlerOptions = {},
) {
  const { screenContext = "unknown", recipeContext, onNavigate } = options;
  const navigation =
    useNavigation<NavigationProp<Record<string, object | undefined>>>();

  const navigateToScreen = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      if (onNavigate) {
        onNavigate(screen, params);
      } else {
        try {
          (
            navigation.navigate as (
              screen: string,
              params?: Record<string, unknown>,
            ) => void
          )(screen, params);
        } catch (error) {
          console.warn(`Failed to navigate to ${screen}:`, error);
        }
      }
    },
    [navigation, onNavigate],
  );

  const executeAddFood = useCallback(
    async (entities: Record<string, string>): Promise<CommandResult> => {
      const { item, quantity } = entities;

      navigateToScreen("AddItem", {
        productName: item,
        suggestedQuantity: parseInt(quantity, 10) || 1,
      });

      return {
        success: true,
        response: RESPONSE_TEMPLATES.ADD_FOOD.success(item, quantity),
        action: "navigate",
        navigateTo: { screen: "AddItem", params: { productName: item } },
      };
    },
    [navigateToScreen],
  );

  const executeSearchInventory = useCallback(
    async (entities: Record<string, string>): Promise<CommandResult> => {
      const { query } = entities;

      if (!query) {
        navigateToScreen("KitchenTab");
        return {
          success: true,
          response: RESPONSE_TEMPLATES.SEARCH_INVENTORY.showAll,
          action: "navigate",
        };
      }

      const inventory = await storage.getInventory();
      const matches = inventory.filter((item) =>
        item.name.toLowerCase().includes(query.toLowerCase()),
      );

      if (matches.length > 0) {
        return {
          success: true,
          response: RESPONSE_TEMPLATES.SEARCH_INVENTORY.found(
            query,
            matches.length,
          ),
          data: matches,
          action: "query",
        };
      }

      return {
        success: false,
        response: RESPONSE_TEMPLATES.SEARCH_INVENTORY.notFound(query),
        action: "query",
      };
    },
    [navigateToScreen],
  );

  const executeGenerateRecipe = useCallback(
    async (entities: Record<string, string>): Promise<CommandResult> => {
      const { ingredients } = entities;

      const params: Record<string, unknown> = {};
      if (ingredients) {
        const ingredientList = ingredients
          .split(/,|and/)
          .map((i) => i.trim())
          .filter(Boolean);
        params.preselectedIngredientNames = ingredientList;
      }

      navigateToScreen("GenerateRecipe", params);

      return {
        success: true,
        response: RESPONSE_TEMPLATES.GENERATE_RECIPE.success(ingredients),
        action: "navigate",
        navigateTo: { screen: "GenerateRecipe", params },
      };
    },
    [navigateToScreen],
  );

  const executeReadRecipe = useCallback(
    async (entities: Record<string, string>): Promise<CommandResult> => {
      if (!recipeContext?.recipe) {
        return {
          success: false,
          response: RESPONSE_TEMPLATES.READ_RECIPE.noRecipe,
          action: "speak",
        };
      }

      const { recipe } = recipeContext;
      const parts: string[] = [];

      parts.push(`${recipe.title}.`);
      if (recipe.description) {
        parts.push(recipe.description);
      }

      parts.push(
        `This recipe serves ${recipe.servings} and takes about ${recipe.prepTime + recipe.cookTime} minutes.`,
      );

      parts.push("Ingredients:");
      recipe.ingredients.forEach((ing) => {
        parts.push(`${ing.quantity} ${ing.unit} ${ing.name}`);
      });

      parts.push("Instructions:");
      recipe.instructions.forEach((step, index) => {
        parts.push(`Step ${index + 1}: ${step}`);
      });

      return {
        success: true,
        response: RESPONSE_TEMPLATES.READ_RECIPE.starting(recipe.title),
        data: { fullText: parts.join(" "), parts },
        action: "speak",
      };
    },
    [recipeContext],
  );

  const executeStepNavigation = useCallback(
    async (
      intent: "NEXT_STEP" | "PREVIOUS_STEP" | "REPEAT_STEP",
      entities: Record<string, string>,
    ): Promise<CommandResult> => {
      if (!recipeContext?.recipe) {
        return {
          success: false,
          response: RESPONSE_TEMPLATES.READ_RECIPE.noRecipe,
          action: "speak",
        };
      }

      const { currentStep, totalSteps, recipe, onStepChange } = recipeContext;
      let newStep = currentStep;

      if (entities.stepNumber) {
        const requestedStep = parseInt(entities.stepNumber, 10);
        if (requestedStep < 1 || requestedStep > totalSteps) {
          return {
            success: false,
            response:
              RESPONSE_TEMPLATES.STEP_NAVIGATION.invalidStep(totalSteps),
            action: "speak",
          };
        }
        newStep = requestedStep - 1;
        onStepChange?.(newStep);
        return {
          success: true,
          response: RESPONSE_TEMPLATES.STEP_NAVIGATION.jumpTo(
            newStep + 1,
            recipe.instructions[newStep],
          ),
          data: { step: newStep },
          action: "speak",
        };
      }

      switch (intent) {
        case "NEXT_STEP":
          if (currentStep >= totalSteps - 1) {
            return {
              success: true,
              response: RESPONSE_TEMPLATES.STEP_NAVIGATION.noMore,
              action: "speak",
            };
          }
          newStep = currentStep + 1;
          onStepChange?.(newStep);
          return {
            success: true,
            response: RESPONSE_TEMPLATES.STEP_NAVIGATION.next(
              newStep + 1,
              recipe.instructions[newStep],
            ),
            data: { step: newStep },
            action: "speak",
          };

        case "PREVIOUS_STEP":
          if (currentStep <= 0) {
            return {
              success: true,
              response: RESPONSE_TEMPLATES.STEP_NAVIGATION.atStart,
              action: "speak",
            };
          }
          newStep = currentStep - 1;
          onStepChange?.(newStep);
          return {
            success: true,
            response: RESPONSE_TEMPLATES.STEP_NAVIGATION.previous(
              newStep + 1,
              recipe.instructions[newStep],
            ),
            data: { step: newStep },
            action: "speak",
          };

        case "REPEAT_STEP":
          return {
            success: true,
            response: RESPONSE_TEMPLATES.STEP_NAVIGATION.repeat(
              currentStep + 1,
              recipe.instructions[currentStep],
            ),
            data: { step: currentStep },
            action: "speak",
          };

        default:
          return {
            success: false,
            response: RESPONSE_TEMPLATES.UNKNOWN.default,
            action: "speak",
          };
      }
    },
    [recipeContext],
  );

  const executeWhatExpires = useCallback(async (): Promise<CommandResult> => {
    const inventory = await storage.getInventory();
    const today = new Date();

    const expiringItems = inventory.filter((item) => {
      if (!item.expirationDate) return false;
      const expDate = parseISO(item.expirationDate);
      const daysUntilExpiry = differenceInDays(expDate, today);
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 7;
    });

    expiringItems.sort((a, b) => {
      const dateA = parseISO(a.expirationDate);
      const dateB = parseISO(b.expirationDate);
      return dateA.getTime() - dateB.getTime();
    });

    if (expiringItems.length === 0) {
      return {
        success: true,
        response: RESPONSE_TEMPLATES.WHAT_EXPIRES.noItems,
        data: [],
        action: "query",
      };
    }

    const itemNames = expiringItems.map((item) => {
      const daysLeft = differenceInDays(parseISO(item.expirationDate), today);
      if (daysLeft === 0) return `${item.name} expires today`;
      if (daysLeft === 1) return `${item.name} expires tomorrow`;
      return `${item.name} in ${daysLeft} days`;
    });

    return {
      success: true,
      response: RESPONSE_TEMPLATES.WHAT_EXPIRES.hasItems(itemNames),
      data: expiringItems,
      action: "query",
    };
  }, []);

  const executeHelp = useCallback((): CommandResult => {
    return {
      success: true,
      response: HELP_RESPONSES[screenContext] || HELP_RESPONSES.unknown,
      action: "speak",
    };
  }, [screenContext]);

  const executeCommand = useCallback(
    async (command: ParsedCommand): Promise<CommandResult> => {
      switch (command.intent) {
        case "ADD_FOOD":
          return executeAddFood(command.entities);

        case "SEARCH_INVENTORY":
          return executeSearchInventory(command.entities);

        case "GENERATE_RECIPE":
          return executeGenerateRecipe(command.entities);

        case "READ_RECIPE":
          return executeReadRecipe(command.entities);

        case "NEXT_STEP":
        case "PREVIOUS_STEP":
        case "REPEAT_STEP":
          return executeStepNavigation(command.intent, command.entities);

        case "WHAT_EXPIRES":
          return executeWhatExpires();

        case "HELP":
          return executeHelp();

        case "UNKNOWN":
        default:
          return {
            success: false,
            response: RESPONSE_TEMPLATES.UNKNOWN.suggestion(screenContext),
            action: "speak",
          };
      }
    },
    [
      executeAddFood,
      executeSearchInventory,
      executeGenerateRecipe,
      executeReadRecipe,
      executeStepNavigation,
      executeWhatExpires,
      executeHelp,
      screenContext,
    ],
  );

  const availableCommands = useMemo(() => {
    const allCommands: CommandIntent[] = [
      "ADD_FOOD",
      "SEARCH_INVENTORY",
      "GENERATE_RECIPE",
      "WHAT_EXPIRES",
      "HELP",
    ];

    if (screenContext === "recipe_detail") {
      allCommands.push(
        "READ_RECIPE",
        "NEXT_STEP",
        "PREVIOUS_STEP",
        "REPEAT_STEP",
      );
    }

    return allCommands;
  }, [screenContext]);

  return {
    executeCommand,
    parseVoiceCommand: (text: string) => parseVoiceCommand(text, screenContext),
    availableCommands,
    screenContext,
  };
}

export function getScreenContext(routeName: string | undefined): ScreenContext {
  if (!routeName) return "unknown";

  const routeMap: Record<string, ScreenContext> = {
    Inventory: "inventory",
    ItemDetail: "inventory",
    Recipes: "recipes",
    RecipeDetail: "recipe_detail",
    GenerateRecipe: "recipes",
    Chat: "recipes",
    MealPlan: "meal_plan",
    ShoppingList: "meal_plan",
    Profile: "profile",
    Settings: "profile",
    Analytics: "profile",
    AddItem: "add_item",
    BarcodeScanner: "add_item",
    FoodSearch: "add_item",
  };

  return routeMap[routeName] || "unknown";
}

export type { RecipeStepContext, VoiceCommandHandlerOptions };
