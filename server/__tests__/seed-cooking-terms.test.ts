import { db } from "../db";
import { cookingTerms } from "@shared/schema";
import { count } from "drizzle-orm";

describe("Cooking Terms Seed Data", () => {
  it("has seeded at least 50 cooking terms", async () => {
    const result = await db.select({ count: count() }).from(cookingTerms);
    expect(result[0].count).toBeGreaterThanOrEqual(50);
  });

  it("has terms in all expected categories", async () => {
    const terms = await db.select().from(cookingTerms);
    const categories = new Set(terms.map((t) => t.category.toLowerCase()));

    const expectedCategories = [
      "technique",
      "cut",
      "equipment",
      "temperature",
      "ingredient",
      "measurement",
    ];

    expectedCategories.forEach((category) => {
      expect(categories.has(category)).toBe(true);
    });
  });

  it("all terms have required fields populated", async () => {
    const terms = await db.select().from(cookingTerms);

    terms.forEach((term) => {
      expect(term.id).toBeDefined();
      expect(term.term).toBeTruthy();
      expect(term.term.length).toBeGreaterThan(0);
      expect(term.definition).toBeTruthy();
      expect(term.definition.length).toBeGreaterThan(0);
      expect(term.category).toBeTruthy();
      expect(term.category.length).toBeGreaterThan(0);
    });
  });

  it("all terms have valid difficulty levels", async () => {
    const terms = await db.select().from(cookingTerms);
    const validDifficulties = ["beginner", "intermediate", "advanced"];

    terms.forEach((term) => {
      if (term.difficulty) {
        expect(validDifficulties).toContain(term.difficulty.toLowerCase());
      }
    });
  });

  it("terms have unique names (no duplicates)", async () => {
    const terms = await db.select().from(cookingTerms);
    const termNames = terms.map((t) => t.term.toLowerCase());
    const uniqueNames = new Set(termNames);

    expect(uniqueNames.size).toBe(termNames.length);
  });

  it("most related terms reference existing terms", async () => {
    const terms = await db.select().from(cookingTerms);
    const allTermNames = new Set(terms.map((t) => t.term.toLowerCase()));

    let validReferences = 0;
    let totalReferences = 0;

    terms.forEach((term) => {
      if (term.relatedTerms && term.relatedTerms.length > 0) {
        term.relatedTerms.forEach((relatedTerm) => {
          totalReferences++;
          if (allTermNames.has(relatedTerm.toLowerCase())) {
            validReferences++;
          }
        });
      }
    });

    if (totalReferences > 0) {
      const validPercentage = validReferences / totalReferences;
      expect(validPercentage).toBeGreaterThan(0.4);
    }
  });

  it("technique category has common cooking methods", async () => {
    const terms = await db.select().from(cookingTerms);
    const techniques = terms
      .filter((t) => t.category.toLowerCase() === "technique")
      .map((t) => t.term.toLowerCase());

    const commonTechniques = ["blanch", "braise", "simmer", "roast"];
    let foundCount = 0;

    commonTechniques.forEach((technique) => {
      if (
        techniques.some((t) => t.includes(technique) || technique.includes(t))
      ) {
        foundCount++;
      }
    });

    expect(foundCount).toBeGreaterThanOrEqual(2);
    expect(techniques.length).toBeGreaterThan(0);
  });

  it("cut category has common cutting terms", async () => {
    const terms = await db.select().from(cookingTerms);
    const cuts = terms
      .filter((t) => t.category.toLowerCase() === "cut")
      .map((t) => t.term.toLowerCase());

    expect(cuts.length).toBeGreaterThan(0);

    const commonCuts = ["dice", "julienne", "mince", "chop"];

    commonCuts.forEach((cut) => {
      expect(cuts.some((c) => c.includes(cut) || cut.includes(c))).toBe(true);
    });
  });
});
