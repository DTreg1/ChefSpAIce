import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "../../db";
import {
  appliances,
  userAppliances,
  userSyncData,
  type Appliance,
  type UserAppliance,
} from "@shared/schema";
import { eq, and, inArray, sql } from "drizzle-orm";
import { requireAuth } from "../../middleware/auth";
import { logger } from "../../lib/logger";
import { AppError } from "../../middleware/errorHandler";

export const appliancesRouter = Router();
export const userAppliancesRouter = Router();

async function updateCookwareSectionTimestamp(userId: string) {
  const now = new Date().toISOString();
  await db
    .update(userSyncData)
    .set({
      updatedAt: new Date(),
      sectionUpdatedAt: sql`COALESCE("section_updated_at", '{}'::jsonb) || ${JSON.stringify({ cookware: now })}::jsonb`,
    })
    .where(eq(userSyncData.userId, userId));
}

// Apply auth middleware to all user appliances routes - all users must authenticate
userAppliancesRouter.use(requireAuth);

type FallbackAppliance = Omit<
  Appliance,
  "createdAt" | "updatedAt" | "imageUrl"
> & {
  createdAt?: Date | null;
  updatedAt?: Date | null;
  imageUrl?: string | null;
};

const FALLBACK_APPLIANCES: FallbackAppliance[] = [
  {
    id: 1,
    name: "Stovetop/Range",
    category: "essential",
    description: "A cooking appliance with burners for heating pots and pans",
    icon: "thermometer",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 2,
    name: "Oven",
    category: "essential",
    description: "An enclosed compartment for baking and roasting food",
    icon: "square",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 3,
    name: "Refrigerator",
    category: "essential",
    description: "An appliance for keeping food cold and fresh",
    icon: "box",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 4,
    name: "Freezer",
    category: "essential",
    description: "An appliance for freezing and storing food long-term",
    icon: "box",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 5,
    name: "Microwave",
    category: "essential",
    description: "An appliance that heats food using electromagnetic radiation",
    icon: "zap",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 6,
    name: "Sink",
    category: "essential",
    description: "A basin with running water for washing food and dishes",
    icon: "droplet",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 7,
    name: "Frying Pan/Skillet",
    category: "cooking",
    description:
      "A flat-bottomed pan used for frying, searing, and browning foods",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 8,
    name: "Saucepan (small, medium, large)",
    category: "cooking",
    description:
      "Deep pans with a handle used for cooking sauces, boiling, and more",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 9,
    name: "Stock Pot",
    category: "cooking",
    description:
      "A large, deep pot for making stocks, soups, and boiling pasta",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 10,
    name: "Dutch Oven",
    category: "cooking",
    description: "A heavy pot with a tight lid for braising and slow cooking",
    icon: "circle",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 11,
    name: "Wok",
    category: "cooking",
    description: "A round-bottomed pan used for stir-frying and Asian cooking",
    icon: "circle",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 12,
    name: "Grill Pan",
    category: "cooking",
    description: "A pan with ridges that creates grill marks on food",
    icon: "grid",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 13,
    name: "Roasting Pan",
    category: "cooking",
    description: "A large pan for roasting meats and vegetables in the oven",
    icon: "square",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 14,
    name: "Baking Sheet",
    category: "bakeware",
    description: "A flat metal pan for baking cookies and roasting vegetables",
    icon: "square",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 15,
    name: "Cake Pan",
    category: "bakeware",
    description: "A round or square pan for baking cakes",
    icon: "circle",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 16,
    name: "Muffin Tin",
    category: "bakeware",
    description: "A pan with cups for baking muffins and cupcakes",
    icon: "grid",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 17,
    name: "Loaf Pan",
    category: "bakeware",
    description: "A rectangular pan for baking bread and meatloaf",
    icon: "square",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 18,
    name: "Pie Dish",
    category: "bakeware",
    description: "A shallow dish with sloped sides for baking pies",
    icon: "circle",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 19,
    name: "Casserole Dish",
    category: "bakeware",
    description: "A deep dish for baking casseroles and gratins",
    icon: "square",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 20,
    name: "Cooling Rack",
    category: "bakeware",
    description: "A wire rack for cooling baked goods",
    icon: "grid",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 21,
    name: "Blender",
    category: "small appliances",
    description:
      "An electric appliance for blending, pureeing, and making smoothies",
    icon: "zap",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 22,
    name: "Food Processor",
    category: "small appliances",
    description:
      "An electric appliance for chopping, slicing, and mixing ingredients",
    icon: "zap",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 23,
    name: "Stand Mixer",
    category: "small appliances",
    description: "A countertop mixer for baking with various attachments",
    icon: "zap",
    isCommon: false,
    alternatives: ["Hand Mixer"],
  },
  {
    id: 24,
    name: "Hand Mixer",
    category: "small appliances",
    description: "A handheld electric mixer for beating and whipping",
    icon: "zap",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 25,
    name: "Toaster",
    category: "small appliances",
    description: "An appliance for toasting bread and bagels",
    icon: "square",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 26,
    name: "Coffee Maker",
    category: "small appliances",
    description: "An appliance for brewing coffee",
    icon: "coffee",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 27,
    name: "Kettle",
    category: "small appliances",
    description: "An appliance for boiling water quickly",
    icon: "droplet",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 28,
    name: "Rice Cooker",
    category: "small appliances",
    description: "An appliance designed for cooking rice perfectly",
    icon: "zap",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 29,
    name: "Slow Cooker/Crock Pot",
    category: "small appliances",
    description: "An appliance for slow-cooking meals over several hours",
    icon: "clock",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 30,
    name: "Instant Pot/Pressure Cooker",
    category: "small appliances",
    description:
      "A multi-function cooker that uses pressure to cook food quickly",
    icon: "zap",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 31,
    name: "Air Fryer",
    category: "small appliances",
    description:
      "An appliance that uses hot air circulation to cook crispy food",
    icon: "wind",
    isCommon: false,
    alternatives: ["Oven", "Convection Oven"],
  },
  {
    id: 32,
    name: "Immersion Blender",
    category: "small appliances",
    description:
      "A handheld blender for pureeing soups and sauces directly in the pot",
    icon: "zap",
    isCommon: false,
    alternatives: ["Blender", "Food Processor"],
  },
  {
    id: 33,
    name: "Cutting Board",
    category: "prep tools",
    description: "A board for cutting and preparing ingredients",
    icon: "square",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 34,
    name: "Chef's Knife",
    category: "prep tools",
    description: "A versatile knife for chopping, slicing, and dicing",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 35,
    name: "Paring Knife",
    category: "prep tools",
    description: "A small knife for peeling and detailed cutting work",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 36,
    name: "Bread Knife",
    category: "prep tools",
    description: "A serrated knife for slicing bread and soft foods",
    icon: "minus",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 37,
    name: "Kitchen Shears",
    category: "prep tools",
    description: "Scissors designed for cutting food items",
    icon: "scissors",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 38,
    name: "Measuring Cups",
    category: "prep tools",
    description: "Cups for measuring dry and liquid ingredients",
    icon: "droplet",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 39,
    name: "Measuring Spoons",
    category: "prep tools",
    description: "Spoons for measuring small quantities of ingredients",
    icon: "droplet",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 40,
    name: "Mixing Bowls",
    category: "prep tools",
    description: "Bowls of various sizes for mixing ingredients",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 41,
    name: "Colander",
    category: "prep tools",
    description: "A bowl with holes for draining pasta and washing vegetables",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 42,
    name: "Grater",
    category: "prep tools",
    description: "A tool for shredding cheese, vegetables, and other foods",
    icon: "grid",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 43,
    name: "Peeler",
    category: "prep tools",
    description: "A tool for removing the skin from fruits and vegetables",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 44,
    name: "Can Opener",
    category: "prep tools",
    description: "A tool for opening canned foods",
    icon: "circle",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 45,
    name: "Whisk",
    category: "prep tools",
    description: "A tool for beating eggs and mixing batters",
    icon: "activity",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 46,
    name: "Spatula",
    category: "prep tools",
    description: "A flat tool for flipping and lifting foods",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 47,
    name: "Wooden Spoon",
    category: "prep tools",
    description: "A heat-resistant spoon for stirring and cooking",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 48,
    name: "Tongs",
    category: "prep tools",
    description: "A tool for gripping and turning food",
    icon: "minus",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 49,
    name: "Ladle",
    category: "prep tools",
    description: "A deep-bowled spoon for serving soups and stews",
    icon: "droplet",
    isCommon: true,
    alternatives: null,
  },
  {
    id: 50,
    name: "Sous Vide",
    category: "specialty",
    description:
      "A precision cooking device that circulates water at exact temperatures",
    icon: "thermometer",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 51,
    name: "Waffle Maker",
    category: "specialty",
    description: "An appliance for making waffles",
    icon: "grid",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 52,
    name: "Panini Press",
    category: "specialty",
    description: "A heated press for making grilled sandwiches",
    icon: "square",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 53,
    name: "Ice Cream Maker",
    category: "specialty",
    description: "An appliance for making homemade ice cream",
    icon: "circle",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 54,
    name: "Dehydrator",
    category: "specialty",
    description: "An appliance for drying fruits, vegetables, and meats",
    icon: "sun",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 55,
    name: "Bread Machine",
    category: "specialty",
    description: "An appliance for automatically making bread",
    icon: "square",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 56,
    name: "Pasta Machine",
    category: "specialty",
    description: "A manual or electric device for making fresh pasta",
    icon: "minus",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 57,
    name: "KitchenAid Attachments",
    category: "specialty",
    description: "Various attachments for KitchenAid stand mixers",
    icon: "tool",
    isCommon: false,
    alternatives: null,
  },
  {
    id: 58,
    name: "Thermomix",
    category: "specialty",
    description:
      "An all-in-one cooking appliance that weighs, chops, and cooks",
    icon: "zap",
    isCommon: false,
    alternatives: null,
  },
];

interface CacheEntry {
  data: FallbackAppliance[];
  timestamp: number;
}

let appliancesCache: CacheEntry | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getCachedAppliances(): Promise<FallbackAppliance[]> {
  if (
    appliancesCache &&
    Date.now() - appliancesCache.timestamp < CACHE_TTL_MS
  ) {
    return appliancesCache.data;
  }

  try {
    const allAppliances = await db.select().from(appliances);
    if (allAppliances.length > 0) {
      appliancesCache = {
        data: allAppliances,
        timestamp: Date.now(),
      };
      return allAppliances;
    }
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      logger.info("Database not available, using fallback appliances");
    }
  }

  appliancesCache = {
    data: FALLBACK_APPLIANCES,
    timestamp: Date.now(),
  };
  return FALLBACK_APPLIANCES;
}

export function invalidateAppliancesCache(): void {
  appliancesCache = null;
}

function formatApplianceResponse(appliance: FallbackAppliance) {
  return {
    id: appliance.id,
    name: appliance.name,
    category: appliance.category,
    description: appliance.description || undefined,
    icon: appliance.icon || "tool",
    isCommon: appliance.isCommon || false,
    alternatives: appliance.alternatives || [],
    imageUrl: appliance.imageUrl || undefined,
  };
}

function formatUserApplianceResponse(
  userAppliance: UserAppliance & { appliance: FallbackAppliance },
) {
  return {
    id: userAppliance.id,
    applianceId: userAppliance.applianceId,
    notes: userAppliance.notes || undefined,
    brand: userAppliance.brand || undefined,
    createdAt: userAppliance.createdAt,
    appliance: formatApplianceResponse(userAppliance.appliance),
  };
}

appliancesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category } = req.query;

    let allAppliances = await getCachedAppliances();

    if (category && typeof category === "string" && category !== "all") {
      allAppliances = allAppliances.filter(
        (a) => a.category.toLowerCase() === category.toLowerCase(),
      );
    }

    allAppliances.sort((a, b) => a.name.localeCompare(b.name));

    res.set("Cache-Control", "public, max-age=86400");
    res.json(allAppliances.map(formatApplianceResponse));
  } catch (error) {
    next(error);
  }
});

appliancesRouter.get("/common", async (req: Request, res: Response, next: NextFunction) => {
  try {
    let allAppliances = await getCachedAppliances();

    const commonAppliances = allAppliances.filter((a) => a.isCommon === true);
    commonAppliances.sort((a, b) => a.name.localeCompare(b.name));

    res.set("Cache-Control", "public, max-age=86400");
    res.json(commonAppliances.map(formatApplianceResponse));
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const userAppliancesList = await db
      .select()
      .from(userAppliances)
      .where(eq(userAppliances.userId, userId));

    if (userAppliancesList.length === 0) {
      return res.json([]);
    }

    const allAppliances = await getCachedAppliances();
    const applianceMap = new Map(allAppliances.map((a) => [a.id, a]));

    const result = userAppliancesList
      .map((ua) => {
        const appliance = applianceMap.get(ua.applianceId);
        if (!appliance) return null;
        return formatUserApplianceResponse({ ...ua, appliance });
      })
      .filter((item): item is NonNullable<typeof item> => item !== null);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.post("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const { applianceId, notes, brand } = req.body;

    if (!applianceId || typeof applianceId !== "number") {
      throw AppError.badRequest("Appliance ID is required", "MISSING_APPLIANCE_ID");
    }

    const allAppliances = await getCachedAppliances();
    const appliance = allAppliances.find((a) => a.id === applianceId);

    if (!appliance) {
      throw AppError.notFound("Appliance not found", "APPLIANCE_NOT_FOUND");
    }

    const existing = await db
      .select()
      .from(userAppliances)
      .where(
        and(
          eq(userAppliances.userId, userId),
          eq(userAppliances.applianceId, applianceId),
        ),
      );

    if (existing.length > 0) {
      throw AppError.conflict("Appliance already added to kitchen", "APPLIANCE_ALREADY_EXISTS");
    }

    const [created] = await db
      .insert(userAppliances)
      .values({
        userId,
        applianceId,
        notes: notes || null,
        brand: brand || null,
      })
      .returning();

    await updateCookwareSectionTimestamp(userId);

    res
      .status(201)
      .json(formatUserApplianceResponse({ ...created, appliance }));
  } catch (error) {
    next(error);
  }
});

userAppliancesRouter.delete(
  "/:applianceId",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.userId!;

      const applianceId = parseInt(req.params.applianceId, 10);

      if (isNaN(applianceId)) {
        throw AppError.badRequest("Invalid appliance ID", "INVALID_APPLIANCE_ID");
      }

      const result = await db
        .delete(userAppliances)
        .where(
          and(
            eq(userAppliances.userId, userId),
            eq(userAppliances.applianceId, applianceId),
          ),
        )
        .returning();

      if (result.length === 0) {
        throw AppError.notFound("Appliance not found in user's kitchen", "APPLIANCE_NOT_FOUND");
      }

      await updateCookwareSectionTimestamp(userId);

      res.json({ success: true, message: "Appliance removed from kitchen" });
    } catch (error) {
      next(error);
    }
  },
);

userAppliancesRouter.post("/bulk", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.userId!;

    const { applianceIds } = req.body;

    // Allow empty array to clear all cookware
    if (!Array.isArray(applianceIds)) {
      throw AppError.badRequest("Appliance IDs array is required", "MISSING_APPLIANCE_IDS");
    }

    const validIds = applianceIds.filter(
      (id): id is number => typeof id === "number" && !isNaN(id),
    );

    // Get current user appliances
    const currentUserAppliances = await db
      .select({ applianceId: userAppliances.applianceId })
      .from(userAppliances)
      .where(eq(userAppliances.userId, userId));

    const currentIds = new Set(currentUserAppliances.map((ua) => ua.applianceId));
    const newIds = new Set(validIds);

    // Find IDs to add and remove
    const toAdd = validIds.filter((id) => !currentIds.has(id));
    const toRemove = Array.from(currentIds).filter((id) => !newIds.has(id));

    // Remove old appliances
    if (toRemove.length > 0) {
      await db
        .delete(userAppliances)
        .where(
          and(
            eq(userAppliances.userId, userId),
            inArray(userAppliances.applianceId, toRemove),
          ),
        );
    }

    // Add new appliances
    if (toAdd.length > 0) {
      const allAppliances = await getCachedAppliances();
      const applianceMap = new Map(allAppliances.map((a) => [a.id, a]));
      const validToAdd = toAdd.filter((id) => applianceMap.has(id));

      if (validToAdd.length > 0) {
        const valuesToInsert = validToAdd.map((applianceId) => ({
          userId,
          applianceId,
          notes: null,
          brand: null,
        }));

        await db.insert(userAppliances).values(valuesToInsert);
      }
    }

    if (toAdd.length > 0 || toRemove.length > 0) {
      await updateCookwareSectionTimestamp(userId);
    }

    res.json({
      added: toAdd.length,
      removed: toRemove.length,
      total: validIds.length,
      message: `Synced ${validIds.length} appliances`,
    });
  } catch (error) {
    next(error);
  }
});
