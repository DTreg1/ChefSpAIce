import { Router, Request, Response } from "express";
import { db } from "../../db";
import { cookingTerms } from "@shared/schema";
import CookingTermsService from "../../services/cooking-terms.service";
import { asyncHandler } from "../../middleware/error.middleware";
import { termDetector } from "../../services/term-detector.service";

const router = Router();

// Get all cooking terms
router.get("/", asyncHandler(async (req, res) => {
  const { category, search } = req.query;
  
  let terms;
  
  if (category && typeof category === "string") {
    terms = await CookingTermsService.getTermsByCategory(category);
  } else if (search && typeof search === "string") {
    terms = await CookingTermsService.searchTerms(search);
  } else {
    const allTerms = await db.select().from(cookingTerms).limit(100);
    terms = allTerms;
  }
  
  res.json(terms);
}));

// Get cooking term categories
router.get("/categories", asyncHandler(async (req, res) => {
  const categories = await CookingTermsService.getCategories();
  res.json(categories);
}));

// Search cooking terms
router.get("/search/:query", asyncHandler(async (req, res) => {
  const { query } = req.params;
  
  if (!query || query.length < 2) {
    return res.status(400).json({ error: "Search query must be at least 2 characters" });
  }
  
  const results = await CookingTermsService.searchTerms(query);
  res.json(results);
}));

// Get a single cooking term
router.get("/:term", asyncHandler(async (req, res) => {
  const { term } = req.params;
  
  const termData = await CookingTermsService.getTerm(term);
  
  if (!termData) {
    return res.status(404).json({ error: "Term not found" });
  }
  
  res.json(termData);
}));

// Get related terms
router.get("/:term/related", asyncHandler(async (req, res) => {
  const { term } = req.params;
  
  const relatedTerms = await CookingTermsService.getRelatedTerms(term);
  res.json(relatedTerms);
}));

// Detect cooking terms in text
router.post("/detect", asyncHandler(async (req, res) => {
  const { text  } = req.body || {};
  
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }
  
  const detectedTerms = await CookingTermsService.detectTermsInText(text);
  res.json(detectedTerms);
}));

// Format recipe instructions with cooking terms
router.post("/format", asyncHandler(async (req, res) => {
  const { instructions  } = req.body || {};
  
  if (!instructions || typeof instructions !== "string") {
    return res.status(400).json({ error: "Instructions are required" });
  }
  
  const formattedInstructions = await CookingTermsService.formatInstructionsWithTerms(instructions);
  res.json({ formatted: formattedInstructions });
}));

// Enhanced term detection - detect terms with variations
router.post("/detect-enhanced", asyncHandler(async (req, res) => {
  const { text, excludeCategories, maxMatches, contextAware  } = req.body || {};
  
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }
  
  if (text.length > 10000) {
    return res.status(400).json({ error: "Text too long. Maximum 10,000 characters allowed" });
  }
  
  const matches = await termDetector.detectTerms(text, {
    excludeCategories,
    maxMatches: maxMatches || 100,
    contextAware: contextAware !== false
  });
  
  res.json({ matches });
}));

// Enrich text with HTML markup for terms
router.post("/enrich", asyncHandler(async (req, res) => {
  const { text, excludeCategories, linkToGlossary, includeTooltip  } = req.body || {};
  
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }
  
  if (text.length > 10000) {
    return res.status(400).json({ error: "Text too long. Maximum 10,000 characters allowed" });
  }
  
  const enrichedText = await termDetector.enrichText(text, {
    excludeCategories,
    linkToGlossary: linkToGlossary || false,
    includeTooltip: includeTooltip !== false
  });
  
  res.json({ text: enrichedText });
}));

// Get detection statistics for text
router.post("/stats", asyncHandler(async (req, res) => {
  const { text  } = req.body || {};
  
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Text is required" });
  }
  
  const stats = await termDetector.getDetectionStats(text);
  res.json(stats);
}));

// Initialize/refresh term detector
router.post("/refresh", asyncHandler(async (req, res) => {
  await termDetector.refresh();
  res.json({ message: "Term detector refreshed successfully" });
}));

export default router;
