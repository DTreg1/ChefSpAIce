import supertest from "supertest";
import { createTestApp, cleanupAllTestUsers, registerTestUser } from "./testSetup";
import type express from "express";

describe("Auth Flow Integration", () => {
  let app: express.Express;
  let request: ReturnType<typeof supertest>;

  beforeAll(async () => {
    app = await createTestApp();
    request = supertest(app);
  });

  afterAll(async () => {
    await cleanupAllTestUsers();
  });

  describe("User Registration", () => {
    it("should register a new user with valid credentials", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("csrfToken");

      const { user, token } = response.body.data;
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.displayName).toBe(displayName);
      expect(user.createdAt).toBeDefined();
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
      expect(token.length).toBeGreaterThan(0);
    });

    it("should reject registration with duplicate email", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `duplicate-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      // First registration should succeed
      await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      // Second registration with same email should fail
      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName: "Different Name" })
        .expect(409);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("errorCode", "EMAIL_EXISTS");
    });

    it("should reject registration with weak password (less than 8 characters)", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "Short1A";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("at least 8 characters");
    });

    it("should reject registration with password missing uppercase letter", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "nouppercase123";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("uppercase letter");
    });

    it("should reject registration with password missing lowercase letter", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "NOLOWERCASE123";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("lowercase letter");
    });

    it("should reject registration with password missing number", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "NoNumbersHere";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("number");
    });

    it("should reject registration with invalid email format", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `invalid-email-${uniqueId}`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      const response = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(400);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body.error).toContain("valid email");
    });
  });

  describe("User Login", () => {
    it("should login user with correct credentials", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      // Register first
      await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      // Now login
      const response = await request
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("user");
      expect(response.body.data).toHaveProperty("token");
      expect(response.body.data).toHaveProperty("csrfToken");

      const { user, token } = response.body.data;
      expect(user.id).toBeDefined();
      expect(user.email).toBe(email);
      expect(user.displayName).toBe(displayName);
      expect(token).toBeDefined();
      expect(typeof token).toBe("string");
    });

    it("should reject login with incorrect password", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      // Register first
      await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      // Try login with wrong password
      const response = await request
        .post("/api/auth/login")
        .send({ email, password: "WrongPassword123" })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject login with non-existent email", async () => {
      const response = await request
        .post("/api/auth/login")
        .send({ email: "nonexistent@example.com", password: "AnyPassword123" })
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Token Validation (GET /api/auth/me)", () => {
    it("should return user data when provided valid Bearer token", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      // Register and get token
      const registerResponse = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      const { token, user: registeredUser } = registerResponse.body.data;

      // Validate token
      const response = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toHaveProperty("user");

      const { user } = response.body.data;
      expect(user.id).toBe(registeredUser.id);
      expect(user.email).toBe(email);
      expect(user.displayName).toBe(displayName);
    });

    it("should reject request without Authorization header", async () => {
      const response = await request
        .get("/api/auth/me")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("errorCode", "AUTH_REQUIRED");
    });

    it("should reject request with malformed Bearer token", async () => {
      const response = await request
        .get("/api/auth/me")
        .set("Authorization", "Bearer invalid_token_format")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject request with invalid token", async () => {
      const response = await request
        .get("/api/auth/me")
        .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.invalid")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });

    it("should reject request without Bearer prefix", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const { token } = await registerTestUser(app, {
        email: `test-${uniqueId}@example.com`,
      });

      const response = await request
        .get("/api/auth/me")
        .set("Authorization", token) // Missing "Bearer " prefix
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
      expect(response.body).toHaveProperty("errorCode", "AUTH_REQUIRED");
    });
  });

  describe("User Logout", () => {
    it("should logout user and invalidate token", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const { token } = await registerTestUser(app, {
        email: `test-${uniqueId}@example.com`,
      });

      // Verify token works before logout
      await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      // Logout
      const logoutResponse = await request
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${token}`)
        .expect(200);

      expect(logoutResponse.body).toHaveProperty("success", true);
      expect(logoutResponse.body.data).toBeNull();

      // Verify token no longer works
      const meResponse = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${token}`)
        .expect(401);

      expect(meResponse.body).toHaveProperty("success", false);
      expect(meResponse.body).toHaveProperty("error");
    });

    it("should handle logout without token gracefully", async () => {
      const response = await request
        .post("/api/auth/logout")
        .expect(200);

      expect(response.body).toHaveProperty("success", true);
      expect(response.body.data).toBeNull();
    });
  });

  describe("Protected Routes", () => {
    it("should reject protected route access without authentication", async () => {
      // Using the /api/auth/me endpoint as an example of a protected route
      const response = await request
        .get("/api/auth/me")
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("errorCode", "AUTH_REQUIRED");
    });

    it("should reject protected route access with expired/invalid token", async () => {
      const expiredToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjB9.invalid";

      const response = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${expiredToken}`)
        .expect(401);

      expect(response.body).toHaveProperty("success", false);
      expect(response.body).toHaveProperty("error");
    });
  });

  describe("Complete Auth Flow", () => {
    it("should complete full registration -> login -> token validation -> logout flow", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const email = `test-${uniqueId}@example.com`;
      const password = "ValidPass123";
      const displayName = `TestUser-${uniqueId}`;

      // Step 1: Register
      const registerResponse = await request
        .post("/api/auth/register")
        .send({ email, password, displayName })
        .expect(201);

      expect(registerResponse.body.success).toBe(true);
      const registeredUser = registerResponse.body.data.user;
      const registeredToken = registerResponse.body.data.token;

      // Step 2: Validate token immediately after registration
      const meResponse1 = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${registeredToken}`)
        .expect(200);

      expect(meResponse1.body.success).toBe(true);
      expect(meResponse1.body.data.user.id).toBe(registeredUser.id);

      // Step 3: Logout
      const logoutResponse = await request
        .post("/api/auth/logout")
        .set("Authorization", `Bearer ${registeredToken}`)
        .expect(200);

      expect(logoutResponse.body.success).toBe(true);

      // Step 4: Verify token is now invalid
      const meResponse2 = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${registeredToken}`)
        .expect(401);

      expect(meResponse2.body.success).toBe(false);

      // Step 5: Login again with same credentials
      const loginResponse = await request
        .post("/api/auth/login")
        .send({ email, password })
        .expect(200);

      expect(loginResponse.body.success).toBe(true);
      const newToken = loginResponse.body.data.token;
      const loginUser = loginResponse.body.data.user;

      // Step 6: Verify new token works
      const meResponse3 = await request
        .get("/api/auth/me")
        .set("Authorization", `Bearer ${newToken}`)
        .expect(200);

      expect(meResponse3.body.success).toBe(true);
      expect(meResponse3.body.data.user.id).toBe(registeredUser.id);
      expect(meResponse3.body.data.user.email).toBe(email);
    });

    it("should allow multiple sequential logins", async () => {
      const uniqueId = Math.random().toString(36).substring(2, 10);
      const { email } = await registerTestUser(app, {
        email: `test-${uniqueId}@example.com`,
        password: "TestPass123!",
      });

      // Multiple login attempts
      for (let i = 0; i < 3; i++) {
        const loginResponse = await request
          .post("/api/auth/login")
          .send({ email, password: "TestPass123!" })
          .expect(200);

        expect(loginResponse.body.success).toBe(true);
        expect(loginResponse.body.data.token).toBeDefined();

        // Verify each token works
        const token = loginResponse.body.data.token;
        await request
          .get("/api/auth/me")
          .set("Authorization", `Bearer ${token}`)
          .expect(200);
      }
    });
  });
});
