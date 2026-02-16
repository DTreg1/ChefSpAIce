import { Router, Request, Response, NextFunction } from "express";
import OpenAI from "openai";
import { eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { userSessions, appliances } from "@shared/schema";
import { checkFeatureAccess } from "../services/subscriptionService";
import { logger } from "../lib/logger";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { hashToken } from "../lib/auth-utils";
import { withCircuitBreaker } from "../lib/circuit-breaker";
import { validateBody } from "../middleware/validateBody";

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

const chatMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  context: z.string().optional(),
  history: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() })).optional(),
  inventory: z.array(z.any()).optional(),
  preferences: z.any().optional(),
  equipment: z.array(z.any()).optional(),
});

router.post("/", validateBody(chatMessageSchema), async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { message, context, history, inventory, preferences, equipment } = req.body;

      // Import chat action handlers
      const { chatFunctionDefinitions, executeChatAction, getUserSyncData } = await import("../lib/chat-actions");

      // Check if user is authenticated
      const authHeader = req.headers.authorization;
      let authenticatedUserId: string | null = null;
      
      if (authHeader?.startsWith("Bearer ")) {
        const rawToken = authHeader.slice(7);
        const hashedToken = hashToken(rawToken);
        const sessions = await db
          .select()
          .from(userSessions)
          .where(eq(userSessions.token, hashedToken));
        
        if (sessions.length > 0 && new Date(sessions[0].expiresAt) > new Date()) {
          authenticatedUserId = sessions[0].userId;
        }
      }

      if (authenticatedUserId) {
        const hasAccess = await checkFeatureAccess(authenticatedUserId, "aiKitchenAssistant");
        if (!hasAccess) {
          throw AppError.forbidden(
            "Live AI Kitchen Assistant requires an active subscription. Upgrade to chat with your AI kitchen assistant.",
            "FEATURE_NOT_AVAILABLE"
          ).withDetails({ feature: "aiKitchenAssistant" });
        }
      }

      // Build inventory context from passed data or fetch from database
      let inventoryContext = context || "";
      let fullInventory: unknown[] = [];
      let userPreferences = preferences || null;
      let userEquipment = equipment || [];
      
      interface InventoryItem {
        name: string;
        quantity?: number;
        unit?: string;
      }
      
      if (authenticatedUserId) {
        const userData = await getUserSyncData(authenticatedUserId);
        fullInventory = userData.inventory;
        if (fullInventory.length > 0) {
          inventoryContext = `Available ingredients: ${(fullInventory as InventoryItem[]).map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ")}`;
        }
        // Use server-side preferences/equipment if available
        if (userData.preferences) {
          userPreferences = userData.preferences;
        }
        if (userData.cookware && userData.cookware.length > 0) {
          userEquipment = userData.cookware;
        }
      } else if (inventory && Array.isArray(inventory)) {
        fullInventory = inventory;
        inventoryContext = `Available ingredients: ${(inventory as InventoryItem[]).map((i) => `${i.quantity || 1} ${i.unit || 'item'} ${i.name}`).join(", ")}`;
      }

      // Build preferences context
      let preferencesContext = "";
      if (userPreferences) {
        const prefParts: string[] = [];
        if (userPreferences.dietaryRestrictions?.length > 0) {
          prefParts.push(`Dietary restrictions: ${userPreferences.dietaryRestrictions.join(", ")}`);
        }
        if (userPreferences.cuisinePreferences?.length > 0) {
          prefParts.push(`Favorite cuisines: ${userPreferences.cuisinePreferences.join(", ")}`);
        }
        if (userPreferences.macroTargets) {
          const mt = userPreferences.macroTargets;
          prefParts.push(`Daily macro targets: ${mt.calories || "N/A"} cal, ${mt.protein || "N/A"}g protein, ${mt.carbs || "N/A"}g carbs, ${mt.fat || "N/A"}g fat`);
        }
        if (prefParts.length > 0) {
          preferencesContext = `\nUSER'S PREFERENCES:\n${prefParts.join("\n")}`;
        }
      }

      // Build equipment context - fetch actual appliance names from database
      let equipmentContext = "";
      if (userEquipment && userEquipment.length > 0) {
        try {
          // Normalize equipment to array of numeric IDs (handles both raw IDs and objects with id property)
          const equipmentIds: number[] = userEquipment
            .map((item: unknown) => {
              if (typeof item === "number") return item;
              if (typeof item === "object" && item !== null && "id" in item) {
                return typeof (item as { id: unknown }).id === "number" 
                  ? (item as { id: number }).id 
                  : parseInt(String((item as { id: unknown }).id), 10);
              }
              if (typeof item === "string") return parseInt(item, 10);
              return NaN;
            })
            .filter((id: number) => !isNaN(id));

          if (equipmentIds.length > 0) {
            const applianceRecords = await db
              .select({ id: appliances.id, name: appliances.name })
              .from(appliances)
              .where(inArray(appliances.id, equipmentIds));
            
            if (applianceRecords.length > 0) {
              const applianceNames = applianceRecords.map(a => a.name);
              equipmentContext = `\nUSER'S KITCHEN EQUIPMENT: ${applianceNames.join(", ")}
Note: Only suggest recipes that can be made with the equipment the user has. If they don't have specialty appliances, suggest alternatives.`;
            }
          }
        } catch (error) {
          logger.error("Failed to fetch appliance names", { error: error instanceof Error ? error.message : String(error) });
        }
      }

      const systemPrompt = `You are ChefSpAIce, an intelligent kitchen assistant with the ability to take actions on behalf of users.

CAPABILITIES:
- Add items to the user's pantry inventory
- Mark items as consumed when the user uses them
- Log wasted items when food goes bad
- Check specific inventory levels, find low-stock items, and items expiring soon
- Look up detailed nutrition information for any food (calories, macros, vitamins)
- Generate personalized recipes based on available ingredients and user preferences
- Create weekly meal plans respecting dietary restrictions
- Update or swap individual meals in existing meal plans
- Add items to shopping lists
- Mark shopping items as purchased or remove them from the list
- Provide cooking tips and food storage advice
- Collect user feedback and bug reports through a conversational flow

FEEDBACK COLLECTION:
When a user wants to send feedback or report a bug, guide them conversationally:
1. First, acknowledge their intent and ask what type of feedback (suggestion, compliment, question) or bug (UI issue, crash, data problem, performance issue)
2. Ask them to describe their feedback or the bug in detail
3. For bug reports, ask what they were doing when it happened
4. Optionally ask if they'd like to provide an email for follow-up
5. Once you have enough information, use the save_feedback function to record it
6. Thank them warmly for their contribution to improving the app

${
  inventoryContext
    ? `USER'S CURRENT INVENTORY:
${inventoryContext}

When suggesting recipes, prioritize ingredients the user actually has. If asked to add, consume, or waste items, use the appropriate function.`
    : "The user has not added any ingredients yet. Encourage them to add items to their pantry to get personalized suggestions."
}${preferencesContext}${equipmentContext}

${
  authenticatedUserId
    ? `IMPORTANT: This user is authenticated. You CAN perform actions on their behalf like adding items, generating recipes, creating meal plans, etc. When the user asks you to do something actionable, USE THE AVAILABLE FUNCTIONS to actually perform the action.`
    : `NOTE: This user is not logged in. You can provide advice and suggestions, but tell them to log in to enable features like saving recipes, meal planning, and shopping lists.`
}

BEHAVIOR GUIDELINES:
- Be proactive: If a user says "I just bought milk", add it to their inventory
- Be helpful: If a user says "I used all the eggs", mark them as consumed
- Be practical: Keep responses concise and actionable
- ALWAYS respect the user's dietary restrictions when suggesting or generating recipes
- Consider the user's cuisine preferences when making suggestions
- When asked to generate a recipe, always use the generate_recipe function
- When asked for a meal plan, use create_meal_plan function
- When asked to add to shopping list, use add_to_shopping_list function`;

      const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: "system", content: systemPrompt },
      ];

      if (history && Array.isArray(history)) {
        history.forEach(
          (msg: { role: "user" | "assistant"; content: string }) => {
            messages.push({ role: msg.role, content: msg.content });
          },
        );
      }

      messages.push({ role: "user", content: message });

      // Use function calling if user is authenticated
      const completionOptions: OpenAI.Chat.ChatCompletionCreateParams = {
        model: "gpt-4o-mini",
        messages,
        max_completion_tokens: 1024,
      };

      if (authenticatedUserId) {
        completionOptions.tools = chatFunctionDefinitions;
        completionOptions.tool_choice = "auto";
      }

      const completion = await withCircuitBreaker("openai", () => openai.chat.completions.create(completionOptions));
      const responseMessage = completion.choices[0]?.message;

      // Check if the AI wants to call a function
      if (responseMessage?.tool_calls && responseMessage.tool_calls.length > 0 && authenticatedUserId) {
        const toolCalls = responseMessage.tool_calls;
        const actionResults: Array<{ name: string; result: unknown }> = [];
        
        // Execute all function calls
        for (const toolCall of toolCalls) {
          // Handle both standard and custom tool calls
          const toolCallAny = toolCall as any;
          if (!toolCallAny.function) continue;
          const functionName = toolCallAny.function.name as string;
          const args = JSON.parse(toolCallAny.function.arguments as string);
          
          logger.info("Chat executing function", { functionName, args });
          const result = await executeChatAction(authenticatedUserId, functionName, args);
          actionResults.push({ name: functionName, result });
        }

        // Build follow-up messages with function results
        const followUpMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
          ...messages,
          responseMessage as OpenAI.Chat.ChatCompletionMessageParam,
          ...toolCalls.map((toolCall, index) => ({
            role: "tool" as const,
            tool_call_id: toolCall.id,
            content: JSON.stringify(actionResults[index]?.result || { success: false })
          }))
        ];

        // Get final response after function execution
        const finalCompletion = await withCircuitBreaker("openai", () => openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: followUpMessages,
          max_completion_tokens: 1024,
        }));

        const finalReply = finalCompletion.choices[0]?.message?.content || 
          "I've completed the action for you.";

        // Extract navigation instruction from action results (if any)
        const navigationResult = actionResults.find(ar => {
          const result = ar.result as { navigateTo?: { screen: string; params?: Record<string, unknown> } };
          return result?.navigateTo;
        });
        const navigateTo = navigationResult 
          ? (navigationResult.result as { navigateTo: { screen: string; params?: Record<string, unknown> } }).navigateTo 
          : undefined;

        return res.json(successResponse({ 
          reply: finalReply,
          actions: actionResults.map(ar => ar.result),
          refreshData: true,
          navigateTo,
        }));
      }

      // Regular response without function calls
      const reply =
        responseMessage?.content ||
        "I'm sorry, I couldn't process that request.";
      res.json(successResponse({ reply }));
    } catch (error) {
      next(error);
    }
  });

export default router;
