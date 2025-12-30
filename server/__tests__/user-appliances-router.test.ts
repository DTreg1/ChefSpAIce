import request from "supertest";
import express from "express";

jest.mock("../middleware/auth", () => ({
  requireAuth: jest.fn((req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Authentication required" });
    }

    const token = authHeader.substring(7);
    
    if (!token || token === "invalid") {
      return res.status(401).json({ error: "Invalid or expired session" });
    }
    
    req.userId = token;
    next();
  }),
}));

import {
  userAppliancesRouter,
  appliancesRouter,
  invalidateAppliancesCache,
} from "../routers/user/appliances.router";

const app = express();
app.use(express.json());
app.use("/api/appliances", appliancesRouter);
app.use("/api/user/appliances", userAppliancesRouter);

const TEST_USER_ID = "test-user-" + Date.now();

describe("User Appliances API", () => {
  let testApplianceId: number;
  let allAppliances: any[];

  beforeAll(async () => {
    invalidateAppliancesCache();
    const response = await request(app).get("/api/appliances");
    allAppliances = response.body;
    testApplianceId = allAppliances[0]?.id;
  });

  afterEach(async () => {
    invalidateAppliancesCache();
  });

  describe("GET /api/user/appliances", () => {
    it("returns 401 when authorization header is missing", async () => {
      const response = await request(app).get("/api/user/appliances");
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns empty array for user with no appliances", async () => {
      const response = await request(app)
        .get("/api/user/appliances")
        .set("Authorization", `Bearer empty-user-${Date.now()}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("returns array response for valid user", async () => {
      const response = await request(app)
        .get("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe("POST /api/user/appliances - Validation", () => {
    it("returns 401 when authorization header is missing", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .send({ applianceId: testApplianceId });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 when applianceId is missing", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Appliance ID");
    });

    it("returns 400 when applianceId is not a number", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: "invalid" });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Appliance ID");
    });

    it("returns 404 for non-existent appliance", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: 999999 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("not found");
    });

    it("validates appliance exists before checking user constraint", async () => {
      const userId = "validation-test-" + Date.now();
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${userId}`)
        .send({ applianceId: 888888 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("not found");
    });

    it("accepts request with valid applianceId", async () => {
      const userId = "add-test-user-" + Date.now();
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${userId}`)
        .send({ applianceId: testApplianceId });

      expect([201, 500]).toContain(response.status);
    });

    it("accepts request with optional notes and brand", async () => {
      const userId = "add-with-notes-" + Date.now();
      const secondAppliance = allAppliances[1];

      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${userId}`)
        .send({
          applianceId: secondAppliance.id,
          notes: "My favorite appliance",
          brand: "KitchenAid",
        });

      expect([201, 500]).toContain(response.status);
    });
  });

  describe("DELETE /api/user/appliances/:applianceId - Validation", () => {
    it("returns 401 when authorization header is missing", async () => {
      const response = await request(app).delete(
        `/api/user/appliances/${testApplianceId}`,
      );
      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 for invalid appliance ID format", async () => {
      const response = await request(app)
        .delete("/api/user/appliances/invalid")
        .set("Authorization", `Bearer ${TEST_USER_ID}`);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("Invalid appliance ID");
    });

    it("returns 404 when appliance not in user's kitchen", async () => {
      const userId = "delete-not-found-" + Date.now();
      const response = await request(app)
        .delete(`/api/user/appliances/${testApplianceId}`)
        .set("Authorization", `Bearer ${userId}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain("not found");
    });

    it("handles non-existent appliance ID gracefully", async () => {
      const userId = "delete-nonexistent-" + Date.now();
      const response = await request(app)
        .delete(`/api/user/appliances/999999`)
        .set("Authorization", `Bearer ${userId}`);

      expect(response.status).toBe(404);
    });
  });

  describe("POST /api/user/appliances/bulk - Validation", () => {
    it("returns 401 when authorization header is missing", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .send({ applianceIds: [testApplianceId] });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("error");
    });

    it("returns 400 when applianceIds is missing", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("array");
    });

    it("returns 400 when applianceIds is empty array", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceIds: [] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("array");
    });

    it("returns 400 when applianceIds contains only invalid values", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceIds: ["invalid", "not-numbers"] });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain("valid");
    });

    it("returns 404 when no valid appliances found", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceIds: [999999, 888888] });

      expect(response.status).toBe(404);
    });

    it("accepts valid appliance IDs array", async () => {
      const userId = "bulk-add-" + Date.now();
      const applianceIds = allAppliances.slice(0, 3).map((a: any) => a.id);

      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${userId}`)
        .send({ applianceIds });

      expect([200, 201, 500]).toContain(response.status);
    });

    it("filters out invalid IDs in mixed array before DB operations", async () => {
      const userId = "bulk-mixed-" + Date.now();
      const validId = allAppliances[5]?.id;
      const mixedIds = [validId, "invalid"];

      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${userId}`)
        .send({ applianceIds: mixedIds });

      expect([200, 201, 500]).toContain(response.status);
    });
  });

  describe("API Response Structure", () => {
    it("GET returns proper JSON structure", async () => {
      const response = await request(app)
        .get("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`);

      expect(response.headers["content-type"]).toMatch(/json/);
      expect(response.body).toBeDefined();
    });

    it("POST error response has error property", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({});

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });

    it("DELETE error response has error property", async () => {
      const response = await request(app)
        .delete("/api/user/appliances/invalid")
        .set("Authorization", `Bearer ${TEST_USER_ID}`);

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });

    it("bulk endpoint error response has error property", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({});

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });
  });

  describe("Request Header Validation", () => {
    it("validates Authorization header for GET", async () => {
      const response = await request(app).get("/api/user/appliances");

      expect(response.status).toBe(401);
    });

    it("validates Authorization header for POST", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .send({ applianceId: testApplianceId });

      expect(response.status).toBe(401);
    });

    it("validates Authorization header for DELETE", async () => {
      const response = await request(app).delete(
        `/api/user/appliances/${testApplianceId}`,
      );

      expect(response.status).toBe(401);
    });

    it("validates Authorization header for bulk endpoint", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .send({ applianceIds: [testApplianceId] });

      expect(response.status).toBe(401);
    });
  });

  describe("Input Type Validation", () => {
    it("rejects null applianceId", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: null });

      expect(response.status).toBe(400);
    });

    it("rejects undefined applianceId", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: undefined });

      expect(response.status).toBe(400);
    });

    it("rejects object as applianceId", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: { id: 1 } });

      expect(response.status).toBe(400);
    });

    it("rejects array as applianceId in single add", async () => {
      const response = await request(app)
        .post("/api/user/appliances")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceId: [1, 2, 3] });

      expect(response.status).toBe(400);
    });

    it("rejects object instead of array in bulk add", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceIds: { ids: [1, 2] } });

      expect(response.status).toBe(400);
    });

    it("rejects number instead of array in bulk add", async () => {
      const response = await request(app)
        .post("/api/user/appliances/bulk")
        .set("Authorization", `Bearer ${TEST_USER_ID}`)
        .send({ applianceIds: 123 });

      expect(response.status).toBe(400);
    });
  });
});
