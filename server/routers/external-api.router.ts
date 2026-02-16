import { Router, Request, Response, NextFunction } from "express";
import { db } from "../db";
import { users, userInventoryItems } from "@shared/schema";
import { and, eq, isNull, ilike } from "drizzle-orm";
import { randomBytes, createHash } from "crypto";
import { z } from "zod";
import OpenAI from "openai";
import { requireAuth } from "../middleware/auth";
import { AppError } from "../middleware/errorHandler";
import { successResponse } from "../lib/apiResponse";
import { logger } from "../lib/logger";
import { validateBody } from "../middleware/validateBody";
import { checkPantryItemLimit } from "../services/subscriptionService";
import { ERROR_CODES, ERROR_MESSAGES } from "@shared/subscription";
import { updateSectionTimestamp } from "./sync/sync-helpers";

interface ExternalInventoryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  addedDate?: string;
  storageLocation?: string;
  category?: string;
  expirationDate?: string;
  [key: string]: unknown;
}

const router = Router();

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

function escapeLikePattern(input: string): string {
  return input.replace(/[%_\\]/g, '\\$&');
}

function hashApiKey(apiKey: string): string {
  return createHash("sha256").update(apiKey).digest("hex");
}

function generateApiKey(): string {
  return `csa_${randomBytes(32).toString("hex")}`;
}

const actionSchema = z.object({
  apiKey: z.string().min(1),
  action: z.enum(["add_item", "check_inventory", "what_expires", "quick_recipe"]),
  item: z.string().optional(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
});

async function validateApiKey(apiKey: string): Promise<typeof users.$inferSelect | null> {
  const keyHash = hashApiKey(apiKey);
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.apiKeyHash, keyHash))
    .limit(1);
  
  return user || null;
}

router.post("/action", validateBody(actionSchema), async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { apiKey, action, item, quantity, unit } = req.body;

    const user = await validateApiKey(apiKey);
    if (!user) {
      throw AppError.unauthorized("Invalid API key", "INVALID_API_KEY");
    }

    switch (action) {
      case "add_item": {
        if (!item) {
          throw AppError.badRequest("Item name is required for add_item action", "MISSING_ITEM_NAME");
        }

        const limitCheck = await checkPantryItemLimit(user.id);
        if (typeof limitCheck.remaining === 'number' && limitCheck.remaining < 1) {
          throw AppError.forbidden(ERROR_MESSAGES[ERROR_CODES.PANTRY_LIMIT_REACHED], ERROR_CODES.PANTRY_LIMIT_REACHED).withDetails({
            limit: limitCheck.limit,
            remaining: 0,
          });
        }

        const itemId = randomBytes(8).toString("hex");
        const now = new Date();

        const [inserted] = await db.insert(userInventoryItems).values({
          userId: user.id,
          itemId,
          name: item,
          quantity: quantity || 1,
          unit: unit || "unit",
          storageLocation: "pantry",
          category: "other",
          updatedAt: now,
        }).returning();

        await updateSectionTimestamp(user.id, "inventory");

        const newItem: ExternalInventoryItem = {
          id: inserted.itemId,
          name: inserted.name,
          quantity: inserted.quantity,
          unit: inserted.unit,
          addedDate: inserted.addedAt?.toISOString(),
          storageLocation: inserted.storageLocation,
          category: inserted.category,
        };

        return res.json(successResponse({ item: newItem }, `Added ${quantity || 1} ${unit || "unit"} of ${item} to your pantry`));
      }

      case "check_inventory": {
        if (!item) {
          throw AppError.badRequest("Item name is required for check_inventory action", "MISSING_ITEM_NAME");
        }

        const foundRows = await db
          .select()
          .from(userInventoryItems)
          .where(
            and(
              eq(userInventoryItems.userId, user.id),
              isNull(userInventoryItems.deletedAt),
              ilike(userInventoryItems.name, `%${escapeLikePattern(item)}%`),
            ),
          );

        const found: ExternalInventoryItem[] = foundRows.map((row) => ({
          id: row.itemId,
          name: row.name,
          quantity: row.quantity,
          unit: row.unit,
          addedDate: row.addedAt?.toISOString(),
          storageLocation: row.storageLocation,
          category: row.category,
          expirationDate: row.expirationDate ?? undefined,
        }));

        if (found.length > 0) {
          const items = found.map((i) => `${i.quantity} ${i.unit} ${i.name}`).join(", ");
          return res.json(successResponse({ found: true, items: found }, `Yes, you have: ${items}`));
        } else {
          return res.json(successResponse({ found: false, items: [] }, `No ${item} found in your inventory`));
        }
      }

      case "what_expires": {
        const now = new Date();
        const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);

        const allWithExpiration = await db
          .select()
          .from(userInventoryItems)
          .where(
            and(
              eq(userInventoryItems.userId, user.id),
              isNull(userInventoryItems.deletedAt),
            ),
          );

        const expiring = allWithExpiration
          .filter((row) => {
            if (!row.expirationDate) return false;
            const expDate = new Date(row.expirationDate);
            return expDate >= now && expDate <= threeDaysFromNow;
          })
          .sort((a, b) => new Date(a.expirationDate!).getTime() - new Date(b.expirationDate!).getTime())
          .map((row): ExternalInventoryItem => ({
            id: row.itemId,
            name: row.name,
            quantity: row.quantity,
            unit: row.unit,
            addedDate: row.addedAt?.toISOString(),
            storageLocation: row.storageLocation,
            category: row.category,
            expirationDate: row.expirationDate ?? undefined,
          }));

        if (expiring.length > 0) {
          const itemList = expiring.map((i) => i.name).join(", ");
          return res.json(successResponse({ items: expiring }, `You have ${expiring.length} item${expiring.length > 1 ? "s" : ""} expiring soon: ${itemList}`));
        } else {
          return res.json(successResponse({ items: [] }, "No items are expiring in the next 3 days"));
        }
      }

      case "quick_recipe": {
        const inventoryRows = await db
          .select({ name: userInventoryItems.name })
          .from(userInventoryItems)
          .where(
            and(
              eq(userInventoryItems.userId, user.id),
              isNull(userInventoryItems.deletedAt),
            ),
          )
          .limit(10);

        const ingredientNames = inventoryRows.map((row) => row.name).filter(Boolean);

        if (ingredientNames.length === 0) {
          return res.json(successResponse({ recipe: null }, "Your inventory is empty. Add some ingredients first!"));
        }

        try {
          const response = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "You are a helpful cooking assistant. Give a very brief, one-sentence recipe suggestion using the available ingredients. Be concise - max 50 words.",
              },
              {
                role: "user",
                content: `I have these ingredients: ${ingredientNames.join(", ")}. Suggest one quick recipe idea.`,
              },
            ],
            max_tokens: 100,
          });

          const recipe = response.choices[0]?.message?.content || "Try combining your ingredients into a simple stir-fry or salad!";

          return res.json(successResponse({ recipe: recipe }, `Try making: ${recipe}`));
        } catch (aiError: unknown) {
          logger.error("AI recipe suggestion failed", { error: aiError instanceof Error ? aiError.message : String(aiError) });
          return res.json(successResponse({ recipe: "Simple stir-fry with your available ingredients" }, "Try combining your ingredients into a simple stir-fry or salad!"));
        }
      }

      default:
        throw AppError.badRequest("Unknown action", "UNKNOWN_ACTION");
    }
  } catch (error) {
    next(error);
  }
});

router.post("/generate-key", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw AppError.notFound("User not found", "USER_NOT_FOUND");
    }

    const newApiKey = generateApiKey();
    const keyHash = hashApiKey(newApiKey);

    await db
      .update(users)
      .set({ apiKeyHash: keyHash })
      .where(eq(users.id, userId));

    return res.json(successResponse({ apiKey: newApiKey }, "API key generated successfully. Save this key securely - it cannot be retrieved later."));
  } catch (error) {
    next(error);
  }
});

router.delete("/revoke-key", requireAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    await db
      .update(users)
      .set({ apiKeyHash: null })
      .where(eq(users.id, userId));

    return res.json(successResponse(null, "API key revoked successfully"));
  } catch (error) {
    next(error);
  }
});

export default router;
