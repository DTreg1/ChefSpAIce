jest.mock("@react-native-async-storage/async-storage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  getAllKeys: jest.fn(),
}));

import {
  parseVoiceCommand,
  CommandIntent,
  ScreenContext,
} from "../lib/voice-commands";

describe("Voice Command Parsing", () => {
  describe("ADD_FOOD commands", () => {
    it("parses 'Add 2 apples to my inventory'", () => {
      const result = parseVoiceCommand("Add 2 apples to my inventory");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.quantity).toBe("2");
      expect(result.entities.item).toBe("apples");
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it("parses 'add 5 pounds of chicken to pantry'", () => {
      const result = parseVoiceCommand("add 5 pounds of chicken to pantry");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.quantity).toBe("5");
      expect(result.entities.item).toBe("pounds of chicken");
    });

    it("parses 'add milk to my fridge'", () => {
      const result = parseVoiceCommand("add milk to my fridge");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.quantity).toBe("1");
      expect(result.entities.item).toBe("milk");
    });

    it("parses 'add eggs to freezer'", () => {
      const result = parseVoiceCommand("add eggs to freezer");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.item).toBe("eggs");
    });

    it("parses simple 'add bananas'", () => {
      const result = parseVoiceCommand("add bananas");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.item).toBe("bananas");
      expect(result.entities.quantity).toBe("1");
    });

    it("parses 'add 3 tomatoes'", () => {
      const result = parseVoiceCommand("add 3 tomatoes");
      expect(result.intent).toBe("ADD_FOOD");
      expect(result.entities.quantity).toBe("3");
      expect(result.entities.item).toBe("tomatoes");
    });
  });

  describe("SEARCH_INVENTORY commands", () => {
    it("parses 'Do I have milk'", () => {
      const result = parseVoiceCommand("Do I have milk");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("milk");
    });

    it("parses 'do i have any eggs'", () => {
      const result = parseVoiceCommand("do i have any eggs");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("eggs");
    });

    it("parses 'search chicken in my inventory'", () => {
      const result = parseVoiceCommand("search chicken in my inventory");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("chicken");
    });

    it("parses 'find cheese in inventory'", () => {
      const result = parseVoiceCommand("find cheese in inventory");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("cheese");
    });

    it("parses 'look for bread in my inventory'", () => {
      const result = parseVoiceCommand("look for bread in my inventory");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("bread");
    });

    it("parses 'check my inventory'", () => {
      const result = parseVoiceCommand("check my inventory");
      expect(result.intent).toBe("SEARCH_INVENTORY");
      expect(result.entities.query).toBe("");
    });

    it("parses 'show my pantry'", () => {
      const result = parseVoiceCommand("show my pantry");
      expect(result.intent).toBe("SEARCH_INVENTORY");
    });

    it("parses 'what is in my fridge'", () => {
      const result = parseVoiceCommand("what is in my fridge");
      expect(result.intent).toBe("SEARCH_INVENTORY");
    });
  });

  describe("GENERATE_RECIPE commands", () => {
    it("parses 'Generate a recipe with chicken'", () => {
      const result = parseVoiceCommand("Generate a recipe with chicken");
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("chicken");
    });

    it("parses 'make a recipe using pasta and tomatoes'", () => {
      const result = parseVoiceCommand(
        "make a recipe using pasta and tomatoes",
      );
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("pasta and tomatoes");
    });

    it("parses 'suggest a recipe from vegetables'", () => {
      const result = parseVoiceCommand("suggest a recipe from vegetables");
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("vegetables");
    });

    it("parses 'what can I make with beef and rice'", () => {
      const result = parseVoiceCommand("what can I make with beef and rice");
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("beef and rice");
    });

    it("parses 'what can I cook using eggs'", () => {
      const result = parseVoiceCommand("what can I cook using eggs");
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("eggs");
    });

    it("parses simple 'generate a recipe'", () => {
      const result = parseVoiceCommand("generate a recipe");
      expect(result.intent).toBe("GENERATE_RECIPE");
      expect(result.entities.ingredients).toBe("");
    });

    it("parses 'suggest me a recipe'", () => {
      const result = parseVoiceCommand("suggest me a recipe");
      expect(result.intent).toBe("GENERATE_RECIPE");
    });
  });

  describe("READ_RECIPE commands", () => {
    it("parses 'read me the recipe'", () => {
      const result = parseVoiceCommand("read me the recipe");
      expect(result.intent).toBe("READ_RECIPE");
    });

    it("parses 'read recipe'", () => {
      const result = parseVoiceCommand("read recipe");
      expect(result.intent).toBe("READ_RECIPE");
    });

    it("parses 'start reading the recipe'", () => {
      const result = parseVoiceCommand("start reading the recipe");
      expect(result.intent).toBe("READ_RECIPE");
    });

    it("parses 'begin the recipe'", () => {
      const result = parseVoiceCommand("begin the recipe");
      expect(result.intent).toBe("READ_RECIPE");
    });
  });

  describe("Recipe Navigation commands", () => {
    const recipeContext: ScreenContext = "recipe_detail";

    it("parses 'Next step'", () => {
      const result = parseVoiceCommand("Next step", recipeContext);
      expect(result.intent).toBe("NEXT_STEP");
    });

    it("parses 'next'", () => {
      const result = parseVoiceCommand("next", recipeContext);
      expect(result.intent).toBe("NEXT_STEP");
    });

    it("parses 'previous step'", () => {
      const result = parseVoiceCommand("previous step", recipeContext);
      expect(result.intent).toBe("PREVIOUS_STEP");
    });

    it("parses 'back'", () => {
      const result = parseVoiceCommand("back", recipeContext);
      expect(result.intent).toBe("PREVIOUS_STEP");
    });

    it("parses 'go back'", () => {
      const result = parseVoiceCommand("go back", recipeContext);
      expect(result.intent).toBe("PREVIOUS_STEP");
    });

    it("parses 'repeat'", () => {
      const result = parseVoiceCommand("repeat", recipeContext);
      expect(result.intent).toBe("REPEAT_STEP");
    });

    it("parses 'repeat that'", () => {
      const result = parseVoiceCommand("repeat that", recipeContext);
      expect(result.intent).toBe("REPEAT_STEP");
    });

    it("parses 'repeat step'", () => {
      const result = parseVoiceCommand("repeat step", recipeContext);
      expect(result.intent).toBe("REPEAT_STEP");
    });

    it("parses 'go to step 3'", () => {
      const result = parseVoiceCommand("go to step 3", recipeContext);
      expect(result.intent).toBe("GO_TO_STEP");
      expect(result.entities.stepNumber).toBe("3");
    });

    it("parses 'step 5'", () => {
      const result = parseVoiceCommand("step 5", recipeContext);
      expect(result.intent).toBe("GO_TO_STEP");
      expect(result.entities.stepNumber).toBe("5");
    });

    it("parses 'skip to step 2'", () => {
      const result = parseVoiceCommand("skip to step 2", recipeContext);
      expect(result.intent).toBe("GO_TO_STEP");
      expect(result.entities.stepNumber).toBe("2");
    });

    it("parses 'read ingredients'", () => {
      const result = parseVoiceCommand("read ingredients", recipeContext);
      expect(result.intent).toBe("READ_INGREDIENTS");
    });

    it("parses 'list the ingredients'", () => {
      const result = parseVoiceCommand("list the ingredients", recipeContext);
      expect(result.intent).toBe("READ_INGREDIENTS");
    });
  });

  describe("Playback Control commands", () => {
    const recipeContext: ScreenContext = "recipe_detail";

    it("parses 'stop'", () => {
      const result = parseVoiceCommand("stop", recipeContext);
      expect(result.intent).toBe("STOP");
    });

    it("parses 'stop reading'", () => {
      const result = parseVoiceCommand("stop reading", recipeContext);
      expect(result.intent).toBe("STOP");
    });

    it("parses 'pause'", () => {
      const result = parseVoiceCommand("pause", recipeContext);
      expect(result.intent).toBe("PAUSE");
    });

    it("parses 'faster'", () => {
      const result = parseVoiceCommand("faster", recipeContext);
      expect(result.intent).toBe("FASTER");
    });

    it("parses 'speed up'", () => {
      const result = parseVoiceCommand("speed up", recipeContext);
      expect(result.intent).toBe("FASTER");
    });

    it("parses 'increase speed'", () => {
      const result = parseVoiceCommand("increase speed", recipeContext);
      expect(result.intent).toBe("FASTER");
    });

    it("parses 'slower'", () => {
      const result = parseVoiceCommand("slower", recipeContext);
      expect(result.intent).toBe("SLOWER");
    });

    it("parses 'slow down'", () => {
      const result = parseVoiceCommand("slow down", recipeContext);
      expect(result.intent).toBe("SLOWER");
    });

    it("parses 'decrease speed'", () => {
      const result = parseVoiceCommand("decrease speed", recipeContext);
      expect(result.intent).toBe("SLOWER");
    });
  });

  describe("WHAT_EXPIRES commands", () => {
    it("parses 'what is expiring soon'", () => {
      const result = parseVoiceCommand("what is expiring soon");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });

    it("parses 'what's expiring'", () => {
      const result = parseVoiceCommand("what's expiring");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });

    it("parses 'show expiring'", () => {
      const result = parseVoiceCommand("show expiring");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });

    it("parses 'list what is expiring'", () => {
      const result = parseVoiceCommand("list what is expiring");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });

    it("parses 'what will expire'", () => {
      const result = parseVoiceCommand("what will expire");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });

    it("parses 'what is going to expire'", () => {
      const result = parseVoiceCommand("what is going to expire");
      expect(result.intent).toBe("WHAT_EXPIRES");
    });
  });

  describe("HELP commands", () => {
    it("parses 'help'", () => {
      const result = parseVoiceCommand("help");
      expect(result.intent).toBe("HELP");
    });

    it("parses 'what can you do'", () => {
      const result = parseVoiceCommand("what can you do");
      expect(result.intent).toBe("HELP");
    });

    it("parses 'commands'", () => {
      const result = parseVoiceCommand("commands");
      expect(result.intent).toBe("HELP");
    });

    it("parses 'voice commands'", () => {
      const result = parseVoiceCommand("voice commands");
      expect(result.intent).toBe("HELP");
    });
  });

  describe("UNKNOWN intent for random text", () => {
    it("returns UNKNOWN for 'hello world'", () => {
      const result = parseVoiceCommand("hello world");
      expect(result.intent).toBe("UNKNOWN");
      expect(result.confidence).toBe(0);
    });

    it("returns UNKNOWN for 'random gibberish text'", () => {
      const result = parseVoiceCommand("random gibberish text");
      expect(result.intent).toBe("UNKNOWN");
    });

    it("returns UNKNOWN for empty string", () => {
      const result = parseVoiceCommand("");
      expect(result.intent).toBe("UNKNOWN");
    });

    it("returns UNKNOWN for 'the weather is nice today'", () => {
      const result = parseVoiceCommand("the weather is nice today");
      expect(result.intent).toBe("UNKNOWN");
    });

    it("returns UNKNOWN for 'play some music'", () => {
      const result = parseVoiceCommand("play some music");
      expect(result.intent).toBe("UNKNOWN");
    });
  });

  describe("Context-sensitive commands", () => {
    it("NEXT_STEP only works in recipe_detail context", () => {
      const result1 = parseVoiceCommand("next step", "recipe_detail");
      expect(result1.intent).toBe("NEXT_STEP");

      const result2 = parseVoiceCommand("next step", "inventory");
      expect(result2.intent).toBe("UNKNOWN");
    });

    it("STOP only works in recipe_detail context", () => {
      const result1 = parseVoiceCommand("stop", "recipe_detail");
      expect(result1.intent).toBe("STOP");

      const result2 = parseVoiceCommand("stop", "inventory");
      expect(result2.intent).toBe("UNKNOWN");
    });

    it("ADD_FOOD works in any context", () => {
      const contexts: ScreenContext[] = [
        "inventory",
        "recipes",
        "meal_plan",
        "profile",
      ];
      contexts.forEach((context) => {
        const result = parseVoiceCommand("add milk to inventory", context);
        expect(result.intent).toBe("ADD_FOOD");
      });
    });

    it("GENERATE_RECIPE works in any context", () => {
      const result1 = parseVoiceCommand(
        "generate a recipe with chicken",
        "inventory",
      );
      expect(result1.intent).toBe("GENERATE_RECIPE");

      const result2 = parseVoiceCommand(
        "generate a recipe with chicken",
        "recipes",
      );
      expect(result2.intent).toBe("GENERATE_RECIPE");
    });
  });

  describe("Case insensitivity", () => {
    it("handles uppercase commands", () => {
      const result = parseVoiceCommand("ADD 2 APPLES TO MY INVENTORY");
      expect(result.intent).toBe("ADD_FOOD");
    });

    it("handles mixed case commands", () => {
      const result = parseVoiceCommand("Do I Have Milk");
      expect(result.intent).toBe("SEARCH_INVENTORY");
    });
  });

  describe("Confidence levels", () => {
    it("returns high confidence for exact matches", () => {
      const result = parseVoiceCommand("help");
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
      expect(result.confidence).toBeLessThanOrEqual(0.95);
    });

    it("returns zero confidence for unknown commands", () => {
      const result = parseVoiceCommand("random text");
      expect(result.confidence).toBe(0);
    });
  });

  describe("Raw text preservation", () => {
    it("preserves original text in rawText field", () => {
      const originalText = "Add 2 Apples To Inventory";
      const result = parseVoiceCommand(originalText);
      expect(result.rawText).toBe(originalText);
    });
  });
});
