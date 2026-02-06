import { Router, type Request, type Response, type NextFunction } from "express";
import { db } from "../../db";
import { cookingTerms, type CookingTerm } from "@shared/schema";
import { AppError } from "../../middleware/errorHandler";

const router = Router();

interface CacheEntry {
  data: CookingTerm[];
  timestamp: number;
}

let termsCache: CacheEntry | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

async function getCachedTerms(): Promise<CookingTerm[]> {
  if (termsCache && Date.now() - termsCache.timestamp < CACHE_TTL_MS) {
    return termsCache.data;
  }

  const terms = await db.select().from(cookingTerms);
  termsCache = {
    data: terms,
    timestamp: Date.now(),
  };
  return terms;
}

export function invalidateTermsCache(): void {
  termsCache = null;
}

function formatTermResponse(term: CookingTerm) {
  return {
    id: term.id,
    term: term.term,
    definition: term.shortDefinition || term.longDefinition || "",
    shortDefinition: term.shortDefinition || undefined,
    longDefinition: term.longDefinition || undefined,
    category: term.category,
    difficulty: term.difficulty || "beginner",
    timeEstimate: term.timeEstimate || undefined,
    tools: term.tools || [],
    tips: term.tips || [],
    videoUrl: term.videoUrl || undefined,
    imageUrl: term.imageUrl || undefined,
    relatedTerms: term.relatedTerms || [],
    example: term.example || undefined,
  };
}

router.get("/", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { category, search } = req.query;

    let terms = await getCachedTerms();

    if (category && typeof category === "string" && category !== "all") {
      terms = terms.filter(
        (t) => t.category.toLowerCase() === category.toLowerCase(),
      );
    }

    if (search && typeof search === "string") {
      const searchLower = search.toLowerCase();
      terms = terms.filter(
        (t) =>
          t.term.toLowerCase().includes(searchLower) ||
          (t.shortDefinition && t.shortDefinition.toLowerCase().includes(searchLower)) ||
          (t.longDefinition && t.longDefinition.toLowerCase().includes(searchLower)),
      );

      terms.sort((a, b) => {
        const aTermMatch = a.term.toLowerCase().startsWith(searchLower) ? 0 : 1;
        const bTermMatch = b.term.toLowerCase().startsWith(searchLower) ? 0 : 1;
        if (aTermMatch !== bTermMatch) return aTermMatch - bTermMatch;

        const aExactTerm = a.term.toLowerCase() === searchLower ? 0 : 1;
        const bExactTerm = b.term.toLowerCase() === searchLower ? 0 : 1;
        if (aExactTerm !== bExactTerm) return aExactTerm - bExactTerm;

        return a.term.localeCompare(b.term);
      });
    } else {
      terms.sort((a, b) => a.term.localeCompare(b.term));
    }

    res.json(terms.map(formatTermResponse));
  } catch (error) {
    next(error);
  }
});

router.get("/detect", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { text } = req.query;

    if (!text || typeof text !== "string") {
      throw AppError.badRequest("Text parameter is required", "TEXT_REQUIRED");
    }

    const allTerms = await getCachedTerms();

    const sortedTerms = [...allTerms].sort(
      (a, b) => b.term.length - a.term.length,
    );

    const foundTerms: CookingTerm[] = [];

    for (const term of sortedTerms) {
      const termLower = term.term.toLowerCase();
      const escapedTerm = termLower.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedTerm}\\b`, "i");

      if (regex.test(text)) {
        const alreadyFound = foundTerms.some(
          (f) =>
            f.term.toLowerCase().includes(termLower) ||
            termLower.includes(f.term.toLowerCase()),
        );

        if (!alreadyFound) {
          foundTerms.push(term);
        }
      }
    }

    res.json(foundTerms.map(formatTermResponse));
  } catch (error) {
    next(error);
  }
});

router.get("/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (!id || id.trim() === "") {
      throw AppError.badRequest("Invalid term ID", "INVALID_TERM_ID");
    }

    const allTerms = await getCachedTerms();
    const term = allTerms.find((t) => t.id === id);

    if (!term) {
      throw AppError.notFound("Cooking term not found", "COOKING_TERM_NOT_FOUND");
    }

    const response = formatTermResponse(term);

    if (term.relatedTerms && term.relatedTerms.length > 0) {
      const relatedDetails = allTerms
        .filter((t) => term.relatedTerms?.includes(t.term))
        .map(formatTermResponse);

      return res.json({
        ...response,
        relatedTermDetails: relatedDetails,
      });
    }

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
