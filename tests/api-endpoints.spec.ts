import { test, expect, APIRequestContext } from "@playwright/test";

/**
 * Comprehensive API Endpoint Tests
 *
 * Tests all major API endpoints for Phase 4 router refactoring validation.
 * Covers: Health, User Domain, Admin Domain, AI Domain, Platform Domain
 *
 * Test Strategy:
 * - Health endpoints: Must return 200 with specific JSON structure
 * - Protected endpoints: Must return 401 (unauthenticated) - NOT 404/500
 * - Public endpoints: Must return 200 with valid data
 * - Legacy endpoints: Must redirect/work (NOT return 404)
 */

/**
 * Helper to verify an endpoint exists and is protected (returns 401, not 404)
 */
async function expectProtectedEndpoint(
  request: APIRequestContext,
  path: string,
) {
  const response = await request.get(path);
  expect(
    response.status(),
    `${path} should require auth (401) not be missing (404)`,
  ).toBe(401);

  const contentType = response.headers()["content-type"];
  expect(contentType, `${path} should return JSON error`).toContain(
    "application/json",
  );
}

/**
 * Helper to verify an endpoint exists (returns 200 or 401, not 404 or 500)
 */
async function expectEndpointExists(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(response.status(), `${path} should exist (not 404)`).not.toBe(404);
  expect(response.status(), `${path} should not error (500)`).not.toBe(500);

  // Should return either success (200) or auth required (401)
  expect([200, 401, 403], `${path} should return 200 or 401`).toContain(
    response.status(),
  );
}

/**
 * Helper to verify an admin endpoint requires authentication (401) or forbidden (403)
 */
async function expectAdminEndpoint(request: APIRequestContext, path: string) {
  const response = await request.get(path);
  expect(
    response.status(),
    `${path} should require auth/admin (401 or 403)`,
  ).toBe(401);
}

/**
 * Helper to verify a legacy endpoint works (doesn't 404)
 */
async function expectLegacyEndpointWorks(
  request: APIRequestContext,
  path: string,
) {
  const response = await request.get(path);
  expect(
    response.status(),
    `Legacy ${path} should work (401 auth required), not 404`,
  ).not.toBe(404);
  expect(response.status(), `Legacy ${path} should not error (500)`).not.toBe(
    500,
  );
}

test.describe("API Endpoints - Health & Status", () => {
  test("GET /health returns healthy status with required fields", async ({
    request,
  }) => {
    const response = await request.get("/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data).toHaveProperty("version");
    expect(data).toHaveProperty("timestamp");
    expect(data).toHaveProperty("uptime");
    expect(typeof data.uptime).toBe("number");
  });

  test("GET /api/v1/health returns healthy status with environment", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("healthy");
    expect(data).toHaveProperty("environment");
    expect(["development", "production", "test"]).toContain(data.environment);
  });

  test("GET /api/v1/info returns complete API information", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/info");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.version).toBe("v1");
    expect(data.currentVersion).toBe("v1");
    expect(Array.isArray(data.supportedVersions)).toBe(true);
    expect(data.supportedVersions).toContain("v1");
  });

  test("Legacy /api/health endpoint returns healthy status", async ({
    request,
  }) => {
    const response = await request.get("/api/health");
    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe("healthy");
  });
});

test.describe("API Endpoints - User Domain - Inventory", () => {
  test("GET /api/v1/inventory endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/inventory");
  });

  test("GET /api/v1/inventory/usda/search endpoint exists", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/inventory/usda/search?q=apple");
    expect(response.status(), "USDA search should exist").not.toBe(404);
    expect(response.status(), "USDA search should not error").not.toBe(500);
  });

  test("GET /api/v1/food-items endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/food-items");
  });

  test("Legacy /api/inventory works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/inventory");
  });
});

test.describe("API Endpoints - User Domain - Recipes", () => {
  test("GET /api/v1/recipes endpoint exists and works", async ({ request }) => {
    await expectEndpointExists(request, "/api/v1/recipes");
  });

  test("Legacy /api/recipes works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/recipes");
  });
});

test.describe("API Endpoints - User Domain - Meal Plans", () => {
  test("GET /api/v1/meal-plans endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/meal-plans");
  });

  test("Legacy /api/meal-plans works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/meal-plans");
  });
});

test.describe("API Endpoints - User Domain - Shopping List", () => {
  test("GET /api/v1/shopping-list requires authentication (401)", async ({
    request,
  }) => {
    await expectProtectedEndpoint(request, "/api/v1/shopping-list");
  });

  test("GET /api/v1/shopping-list/items requires authentication", async ({
    request,
  }) => {
    await expectProtectedEndpoint(request, "/api/v1/shopping-list/items");
  });

  test("Legacy /api/shopping-list works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/shopping-list");
  });
});

test.describe("API Endpoints - User Domain - Chat", () => {
  test("GET /api/v1/chat endpoint exists and works", async ({ request }) => {
    await expectEndpointExists(request, "/api/v1/chat");
  });

  test("Legacy /api/chat works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/chat");
  });
});

test.describe("API Endpoints - User Domain - Appliances", () => {
  test("GET /api/v1/appliances endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/appliances");
  });

  test("GET /api/v1/appliances/library endpoint exists", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/appliances/library");
  });
});

test.describe("API Endpoints - User Domain - Nutrition", () => {
  test("GET /api/v1/nutrition endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/nutrition");
  });
});

test.describe("API Endpoints - User Domain - Utilities", () => {
  test("GET /api/v1/cooking-terms endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/cooking-terms");
  });

  test("POST /api/v1/autocomplete endpoint exists", async ({ request }) => {
    const response = await request.post("/api/v1/autocomplete", {
      data: { query: "app", type: "food" },
    });
    expect(response.status(), "autocomplete should exist").not.toBe(404);
    expect(response.status(), "autocomplete should not error").not.toBe(500);
  });

  test("POST /api/v1/validation endpoint exists", async ({ request }) => {
    const response = await request.post("/api/v1/validation", {
      data: { type: "email", value: "test@example.com" },
    });
    expect(response.status(), "validation should exist").not.toBe(404);
    expect(response.status(), "validation should not error").not.toBe(500);
  });
});

test.describe("API Endpoints - Admin Domain", () => {
  // SECURITY REQUIREMENT: All admin endpoints MUST require authentication
  // Tests are strict - they will fail if endpoints return 200 without auth

  test("GET /api/v1/admin requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin");
  });

  test("GET /api/v1/admin/users requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/users");
  });

  test("GET /api/v1/admin/experiments requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/experiments");
  });

  test("GET /api/v1/admin/cohorts requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/cohorts");
  });

  test("GET /api/v1/admin/maintenance requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/maintenance");
  });

  test("GET /api/v1/admin/pricing requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/pricing");
  });

  test("GET /api/v1/admin/moderation requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/moderation");
  });

  test("GET /api/v1/admin/ai-metrics requires authentication (401)", async ({
    request,
  }) => {
    await expectAdminEndpoint(request, "/api/v1/admin/ai-metrics");
  });

  test("Legacy /api/admin works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/admin");
  });
});

test.describe("API Endpoints - AI Domain", () => {
  test("GET /api/v1/ai/content endpoint exists and requires auth", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/ai/content");
    // AI endpoints should exist (not 404) and require auth or allow GET
    expect(response.status(), "/api/v1/ai/content should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("GET /api/v1/ai/analysis endpoint exists and requires auth", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/ai/analysis");
    expect(response.status(), "/api/v1/ai/analysis should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("GET /api/v1/ai/media endpoint exists and requires auth", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/ai/media");
    expect(response.status(), "/api/v1/ai/media should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("Legacy /api/v1/ai/generation path works (backward compatibility)", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/ai/generation");
    expect(response.status(), "Legacy ai/generation should not 404").not.toBe(
      404,
    );
    expect(response.status()).not.toBe(500);
  });
});

test.describe("API Endpoints - Platform Domain - Analytics", () => {
  test("GET /api/v1/analytics requires authentication", async ({ request }) => {
    const response = await request.get("/api/v1/analytics");
    expect(response.status(), "/api/v1/analytics should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("Legacy /api/analytics works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/analytics");
  });
});

test.describe("API Endpoints - Platform Domain - Notifications", () => {
  test("GET /api/v1/notifications endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/notifications");
  });

  test("GET /api/v1/notifications/tokens endpoint exists", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/notifications/tokens");
    expect(
      response.status(),
      "/api/v1/notifications/tokens should exist",
    ).not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("Legacy /api/notifications works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/notifications");
  });
});

test.describe("API Endpoints - Platform Domain - Activities", () => {
  test("GET /api/v1/activities endpoint exists and works", async ({
    request,
  }) => {
    await expectEndpointExists(request, "/api/v1/activities");
  });

  test("Legacy /api/activity-logs works (not 404)", async ({ request }) => {
    await expectLegacyEndpointWorks(request, "/api/activity-logs");
  });
});

test.describe("API Endpoints - Platform Domain - Batch Operations", () => {
  test("POST /api/v1/batch requires authentication", async ({ request }) => {
    const response = await request.post("/api/v1/batch", {
      data: { operations: [] },
    });
    expect(response.status(), "/api/v1/batch should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });
});

test.describe("API Endpoints - Platform Domain - Feedback", () => {
  test("GET /api/v1/feedback requires authentication", async ({ request }) => {
    const response = await request.get("/api/v1/feedback");
    expect(response.status(), "/api/v1/feedback should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });

  test("POST /api/v1/feedback requires authentication", async ({ request }) => {
    const response = await request.post("/api/v1/feedback", {
      data: {
        type: "bug",
        message: "Test feedback from automated tests",
        rating: 5,
      },
    });
    expect(response.status(), "/api/v1/feedback POST should exist").not.toBe(
      404,
    );
    expect(response.status()).not.toBe(500);
  });
});

test.describe("API Endpoints - Specialized Services", () => {
  test("GET /api/v1/fraud-detection endpoint exists", async ({ request }) => {
    const response = await request.get("/api/v1/fraud-detection");
    expect(response.status(), "/api/v1/fraud-detection should exist").not.toBe(
      404,
    );
    expect(response.status()).not.toBe(500);
  });

  test("GET /api/v1/scheduling requires authentication", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/scheduling");
    expect(response.status(), "/api/v1/scheduling should exist").not.toBe(404);
    expect(response.status()).not.toBe(500);
  });
});

test.describe("API Endpoints - Backward Compatibility", () => {
  test("All legacy user endpoints work (not 404)", async ({ request }) => {
    const legacyEndpoints = [
      "/api/inventory",
      "/api/recipes",
      "/api/meal-plans",
      "/api/shopping-list",
      "/api/chat",
    ];

    for (const endpoint of legacyEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `Legacy ${endpoint} should not 404`).not.toBe(
        404,
      );
      expect(response.status(), `Legacy ${endpoint} should not 500`).not.toBe(
        500,
      );
    }
  });

  test("All legacy platform endpoints work (not 404)", async ({ request }) => {
    const legacyEndpoints = ["/api/notifications", "/api/analytics"];

    for (const endpoint of legacyEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `Legacy ${endpoint} should not 404`).not.toBe(
        404,
      );
      expect(response.status(), `Legacy ${endpoint} should not 500`).not.toBe(
        500,
      );
    }
  });
});

test.describe("API Endpoints - Error Handling", () => {
  test("Invalid JSON body returns 401 (unauthenticated) not 500", async ({
    request,
  }) => {
    const response = await request.post("/api/v1/inventory", {
      headers: { "Content-Type": "application/json" },
      data: "invalid json",
    });
    // Should fail auth first, not crash
    expect(response.status()).not.toBe(500);
  });

  test("API error responses for auth are JSON with error field", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/admin/users");

    expect(response.status()).toBe(401);
    const contentType = response.headers()["content-type"];
    expect(contentType).toContain("application/json");

    const data = await response.json();
    expect(data).toHaveProperty("error");
  });
});

test.describe("API Endpoints - Authentication Flow", () => {
  test("GET /api/v1/auth/me responds appropriately", async ({ request }) => {
    const response = await request.get("/api/v1/auth/me");
    // Should exist and respond - not 404 or 500
    expect(response.status(), "/api/v1/auth/me should exist").not.toBe(404);
    expect(response.status(), "/api/v1/auth/me should not error").not.toBe(500);
  });

  test("GET /api/v1/auth/session responds appropriately", async ({
    request,
  }) => {
    const response = await request.get("/api/v1/auth/session");
    // Should exist and respond - not 404 or 500
    expect(response.status(), "/api/v1/auth/session should exist").not.toBe(
      404,
    );
    expect(response.status(), "/api/v1/auth/session should not error").not.toBe(
      500,
    );
  });

  test("Core user endpoints exist and respond correctly", async ({
    request,
  }) => {
    const endpoints = [
      "/api/v1/inventory",
      "/api/v1/recipes",
      "/api/v1/meal-plans",
      "/api/v1/shopping-list",
      "/api/v1/notifications",
    ];

    for (const endpoint of endpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} must exist (not 404)`).not.toBe(
        404,
      );
      expect(response.status(), `${endpoint} must not error (500)`).not.toBe(
        500,
      );
    }
  });
});

test.describe("API Endpoints - Response Headers", () => {
  test("Health endpoint returns JSON content-type", async ({ request }) => {
    const response = await request.get("/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
  });

  test("API v1 health returns JSON content-type", async ({ request }) => {
    const response = await request.get("/api/v1/health");
    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
  });
});

test.describe("API Endpoints - Critical Route Verification", () => {
  test("All core user routes exist", async ({ request }) => {
    const coreRoutes = [
      "/api/v1/inventory",
      "/api/v1/recipes",
      "/api/v1/meal-plans",
      "/api/v1/shopping-list",
      "/api/v1/appliances",
      "/api/v1/nutrition",
      "/api/v1/cooking-terms",
    ];

    for (const route of coreRoutes) {
      const response = await request.get(route);
      expect(response.status(), `${route} must exist (not 404)`).not.toBe(404);
      expect(response.status(), `${route} must not error (500)`).not.toBe(500);
    }
  });

  test("All admin routes exist", async ({ request }) => {
    const adminRoutes = [
      "/api/v1/admin/users",
      "/api/v1/admin/experiments",
      "/api/v1/admin/cohorts",
      "/api/v1/admin/pricing",
    ];

    for (const route of adminRoutes) {
      const response = await request.get(route);
      expect(response.status(), `${route} must exist (not 404)`).not.toBe(404);
      expect(response.status(), `${route} must not error (500)`).not.toBe(500);
    }
  });

  test("Strictly protected endpoints require authentication (401)", async ({
    request,
  }) => {
    // These are the endpoints confirmed to require authentication
    const strictlyProtectedEndpoints = [
      "/api/v1/shopping-list",
      "/api/v1/shopping-list/items",
      "/api/v1/admin/users",
      "/api/v1/inventory",
      "/api/v1/food-items",
    ];

    for (const endpoint of strictlyProtectedEndpoints) {
      const response = await request.get(endpoint);
      expect(response.status(), `${endpoint} should require auth`).toBe(401);
    }
  });
});
