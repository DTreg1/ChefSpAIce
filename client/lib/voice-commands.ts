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

