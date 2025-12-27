import request from "supertest";
import express from "express";
import cookingTermsRouter, {
  invalidateTermsCache,
} from "../routers/user/cooking-terms.router";

const app = express();
app.use(express.json());
app.use("/api/cooking-terms", cookingTermsRouter);

describe("Cooking Terms API", () => {
  beforeEach(() => {
    invalidateTermsCache();
  });

  describe("GET /api/cooking-terms", () => {
    it("returns all cooking terms", async () => {
      const response = await request(app).get("/api/cooking-terms");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("returns terms with required fields", async () => {
      const response = await request(app).get("/api/cooking-terms");
      expect(response.status).toBe(200);

      const term = response.body[0];
      expect(term).toHaveProperty("id");
      expect(term).toHaveProperty("term");
      expect(term).toHaveProperty("definition");
      expect(term).toHaveProperty("category");
      expect(term).toHaveProperty("difficulty");
    });

    it("returns terms sorted alphabetically by default", async () => {
      const response = await request(app).get("/api/cooking-terms");
      expect(response.status).toBe(200);

      const terms = response.body.map((t: any) => t.term);
      const sortedTerms = [...terms].sort((a, b) => a.localeCompare(b));
      expect(terms).toEqual(sortedTerms);
    });
  });

  describe("GET /api/cooking-terms?category=", () => {
    it("filters terms by category", async () => {
      const response = await request(app).get(
        "/api/cooking-terms?category=technique",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((term: any) => {
        expect(term.category.toLowerCase()).toBe("technique");
      });
    });

    it("returns all terms when category is 'all'", async () => {
      const allResponse = await request(app).get("/api/cooking-terms");
      const filteredResponse = await request(app).get(
        "/api/cooking-terms?category=all",
      );

      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.length).toBe(allResponse.body.length);
    });

    it("returns empty array for non-existent category", async () => {
      const response = await request(app).get(
        "/api/cooking-terms?category=nonexistent",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("handles case-insensitive category filtering", async () => {
      const lowerResponse = await request(app).get(
        "/api/cooking-terms?category=technique",
      );
      const upperResponse = await request(app).get(
        "/api/cooking-terms?category=TECHNIQUE",
      );

      expect(lowerResponse.body.length).toBe(upperResponse.body.length);
    });
  });

  describe("GET /api/cooking-terms?search=", () => {
    it("searches terms by term name", async () => {
      const response = await request(app).get("/api/cooking-terms?search=saut");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      const hasMatchingTerm = response.body.some((t: any) =>
        t.term.toLowerCase().includes("saut"),
      );
      expect(hasMatchingTerm).toBe(true);
    });

    it("searches terms by definition", async () => {
      const response = await request(app).get("/api/cooking-terms?search=heat");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("prioritizes exact term matches", async () => {
      const response = await request(app).get("/api/cooking-terms?search=dice");
      expect(response.status).toBe(200);

      if (response.body.length > 0) {
        expect(response.body[0].term.toLowerCase()).toContain("dice");
      }
    });

    it("returns empty array for no matches", async () => {
      const response = await request(app).get(
        "/api/cooking-terms?search=xyznonexistent",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });
  });

  describe("GET /api/cooking-terms/detect", () => {
    it("detects cooking terms in text", async () => {
      const text = "First, dice the onions and sauté them in butter";
      const response = await request(app)
        .get("/api/cooking-terms/detect")
        .query({ text });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("returns 400 when text is missing", async () => {
      const response = await request(app).get("/api/cooking-terms/detect");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns empty array when no terms found", async () => {
      const text = "Just boil some water";
      const response = await request(app)
        .get("/api/cooking-terms/detect")
        .query({ text });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });

    it("detects terms case-insensitively", async () => {
      const text = "BLANCH the vegetables";
      const response = await request(app)
        .get("/api/cooking-terms/detect")
        .query({ text });

      expect(response.status).toBe(200);
      const termNames = response.body.map((t: any) => t.term.toLowerCase());
      expect(termNames).toContain("blanch");
    });
  });

  describe("GET /api/cooking-terms/:id", () => {
    it("returns a specific term by ID", async () => {
      const allResponse = await request(app).get("/api/cooking-terms");
      const firstTerm = allResponse.body[0];

      const response = await request(app).get(
        `/api/cooking-terms/${firstTerm.id}`,
      );
      expect(response.status).toBe(200);
      expect(response.body.term).toBe(firstTerm.term);
    });

    it("returns 400 for invalid ID format", async () => {
      const response = await request(app).get("/api/cooking-terms/invalid");
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 404 for non-existent ID", async () => {
      const response = await request(app).get("/api/cooking-terms/99999");
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty("error");
    });
  });
});
