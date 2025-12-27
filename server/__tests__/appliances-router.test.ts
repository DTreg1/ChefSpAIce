import request from "supertest";
import express from "express";
import {
  appliancesRouter,
  invalidateAppliancesCache,
} from "../routers/user/appliances.router";

const app = express();
app.use(express.json());
app.use("/api/appliances", appliancesRouter);

describe("Appliances API", () => {
  beforeEach(() => {
    invalidateAppliancesCache();
  });

  describe("GET /api/appliances", () => {
    it("returns all appliances", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it("returns appliances with required fields", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      const appliance = response.body[0];
      expect(appliance).toHaveProperty("id");
      expect(appliance).toHaveProperty("name");
      expect(appliance).toHaveProperty("category");
      expect(appliance).toHaveProperty("icon");
      expect(appliance).toHaveProperty("isCommon");
      expect(appliance).toHaveProperty("alternatives");
    });

    it("returns appliances sorted alphabetically by name", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      const names = response.body.map((a: any) => a.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it("returns appliances with valid category values", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      const validCategories = [
        "essential",
        "cooking",
        "bakeware",
        "small appliances",
        "prep tools",
        "specialty",
      ];

      response.body.forEach((appliance: any) => {
        expect(validCategories).toContain(appliance.category.toLowerCase());
      });
    });

    it("sets cache control headers", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toContain("max-age=86400");
    });
  });

  describe("GET /api/appliances?category=", () => {
    it("filters appliances by category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=essential",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((appliance: any) => {
        expect(appliance.category.toLowerCase()).toBe("essential");
      });
    });

    it("returns all appliances when category is 'all'", async () => {
      const allResponse = await request(app).get("/api/appliances");
      const filteredResponse = await request(app).get(
        "/api/appliances?category=all",
      );

      expect(filteredResponse.status).toBe(200);
      expect(filteredResponse.body.length).toBe(allResponse.body.length);
    });

    it("returns empty array for non-existent category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=nonexistent",
      );
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(0);
    });

    it("handles case-insensitive category filtering", async () => {
      const lowerResponse = await request(app).get(
        "/api/appliances?category=cooking",
      );
      const upperResponse = await request(app).get(
        "/api/appliances?category=COOKING",
      );

      expect(lowerResponse.body.length).toBe(upperResponse.body.length);
    });

    it("filters by 'small appliances' category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=small%20appliances",
      );
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(appliance.category.toLowerCase()).toBe("small appliances");
      });
    });

    it("filters by 'bakeware' category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=bakeware",
      );
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(appliance.category.toLowerCase()).toBe("bakeware");
      });
    });

    it("filters by 'prep tools' category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=prep%20tools",
      );
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(appliance.category.toLowerCase()).toBe("prep tools");
      });
    });

    it("filters by 'specialty' category", async () => {
      const response = await request(app).get(
        "/api/appliances?category=specialty",
      );
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(appliance.category.toLowerCase()).toBe("specialty");
      });
    });
  });

  describe("GET /api/appliances/common", () => {
    it("returns only common appliances", async () => {
      const response = await request(app).get("/api/appliances/common");
      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);

      response.body.forEach((appliance: any) => {
        expect(appliance.isCommon).toBe(true);
      });
    });

    it("returns common appliances sorted alphabetically", async () => {
      const response = await request(app).get("/api/appliances/common");
      expect(response.status).toBe(200);

      const names = response.body.map((a: any) => a.name);
      const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
      expect(names).toEqual(sortedNames);
    });

    it("returns fewer items than total appliances", async () => {
      const allResponse = await request(app).get("/api/appliances");
      const commonResponse = await request(app).get("/api/appliances/common");

      expect(commonResponse.body.length).toBeLessThan(allResponse.body.length);
      expect(commonResponse.body.length).toBeGreaterThan(0);
    });

    it("common items have all required fields", async () => {
      const response = await request(app).get("/api/appliances/common");
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(appliance).toHaveProperty("id");
        expect(appliance).toHaveProperty("name");
        expect(appliance).toHaveProperty("category");
        expect(appliance).toHaveProperty("icon");
        expect(appliance.isCommon).toBe(true);
        expect(appliance).toHaveProperty("alternatives");
      });
    });

    it("sets cache control headers for common endpoint", async () => {
      const response = await request(app).get("/api/appliances/common");
      expect(response.status).toBe(200);
      expect(response.headers["cache-control"]).toContain("max-age=86400");
    });
  });

  describe("Appliance data integrity", () => {
    it("each appliance has a unique id", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      const ids = response.body.map((a: any) => a.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("each appliance has a non-empty name", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(typeof appliance.name).toBe("string");
        expect(appliance.name.length).toBeGreaterThan(0);
      });
    });

    it("alternatives array contains valid strings", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(Array.isArray(appliance.alternatives)).toBe(true);
        appliance.alternatives.forEach((alt: any) => {
          expect(typeof alt).toBe("string");
        });
      });
    });

    it("icon property is a non-empty string", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(typeof appliance.icon).toBe("string");
        expect(appliance.icon.length).toBeGreaterThan(0);
      });
    });

    it("isCommon is a boolean", async () => {
      const response = await request(app).get("/api/appliances");
      expect(response.status).toBe(200);

      response.body.forEach((appliance: any) => {
        expect(typeof appliance.isCommon).toBe("boolean");
      });
    });
  });

  describe("Cache behavior", () => {
    it("returns consistent results on repeated calls", async () => {
      const response1 = await request(app).get("/api/appliances");
      const response2 = await request(app).get("/api/appliances");

      expect(response1.body.length).toBe(response2.body.length);
      expect(response1.body[0].id).toBe(response2.body[0].id);
    });

    it("cache invalidation returns fresh data", async () => {
      const response1 = await request(app).get("/api/appliances");
      invalidateAppliancesCache();
      const response2 = await request(app).get("/api/appliances");

      expect(response1.body.length).toBe(response2.body.length);
    });
  });
});
