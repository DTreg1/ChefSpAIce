import { Router, type Request, type Response } from "express";
import { db } from "../../db";
import { cookingTerms, type CookingTerm } from "@shared/schema";
import { logger } from "../../lib/logger";

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

router.get("/", async (req: Request, res: Response) => {
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
    logger.error("Error fetching cooking terms", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to fetch cooking terms" });
  }
});

router.get("/detect", async (req: Request, res: Response) => {
  try {
    const { text } = req.query;

    if (!text || typeof text !== "string") {
      return res.status(400).json({ error: "Text parameter is required" });
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
    logger.error("Error detecting cooking terms", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to detect cooking terms" });
  }
});

router.get("/:id", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || id.trim() === "") {
      return res.status(400).json({ error: "Invalid term ID" });
    }

    const allTerms = await getCachedTerms();
    const term = allTerms.find((t) => t.id === id);

    if (!term) {
      return res.status(404).json({ error: "Cooking term not found" });
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
    logger.error("Error fetching cooking term", { error: error instanceof Error ? error.message : String(error) });
    res.status(500).json({ error: "Failed to fetch cooking term" });
  }
});

export default router;
