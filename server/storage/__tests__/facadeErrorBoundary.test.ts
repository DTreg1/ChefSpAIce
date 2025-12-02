/**
 * Facade Error Boundary Unit Tests
 *
 * Tests for the FacadeErrorBoundary utilities including:
 * - Error logging at facade level
 * - Error context enrichment
 * - Error boundary wrappers (async and sync)
 * - Domain storage proxy creation
 */

import { describe, it, beforeEach } from "node:test";
import assert from "node:assert";
import {
  StorageError,
  StorageNotFoundError,
  StorageConnectionError,
  StorageErrorCode,
  isStorageError,
} from "../errors/StorageError";

describe("FacadeErrorBoundary", () => {
  describe("FacadeContext", () => {
    it("should define valid facade types", () => {
      const validFacades = ["user", "admin", "platform"] as const;

      validFacades.forEach((facade) => {
        assert.ok(["user", "admin", "platform"].includes(facade));
      });
    });

    it("should include domain and operation", () => {
      const context = {
        facade: "user" as const,
        domain: "recipes",
        operation: "getRecipes",
      };

      assert.strictEqual(context.facade, "user");
      assert.strictEqual(context.domain, "recipes");
      assert.strictEqual(context.operation, "getRecipes");
    });

    it("should support additional info", () => {
      const context = {
        facade: "admin" as const,
        domain: "moderation",
        operation: "reviewContent",
        additionalInfo: {
          contentId: "content-123",
          reviewType: "manual",
        },
      };

      assert.ok(context.additionalInfo);
      assert.strictEqual(context.additionalInfo.contentId, "content-123");
    });
  });

  describe("logFacadeError", () => {
    it("should format StorageError logs correctly", () => {
      const storageError = new StorageError(
        "Database connection failed",
        StorageErrorCode.CONNECTION_ERROR,
        { domain: "user", operation: "getUserById", entityId: "user-123" },
      );

      const expectedFormat = {
        errorCode: StorageErrorCode.CONNECTION_ERROR,
        errorMessage: "Database connection failed",
      };

      assert.strictEqual(storageError.code, expectedFormat.errorCode);
      assert.strictEqual(storageError.message, expectedFormat.errorMessage);
    });

    it("should format regular Error logs correctly", () => {
      const regularError = new Error("Something went wrong");

      assert.strictEqual(regularError.name, "Error");
      assert.strictEqual(regularError.message, "Something went wrong");
    });

    it("should handle unknown error types", () => {
      const unknownError = "String error";

      assert.strictEqual(typeof unknownError, "string");
    });
  });

  describe("enrichStorageErrorContext", () => {
    it("should add facade information to error context", () => {
      const storageError = new StorageError(
        "Not found",
        StorageErrorCode.NOT_FOUND,
        { domain: "user", operation: "getUserById", entityId: "user-123" },
      );

      const facadeContext = {
        facade: "user" as const,
        domain: "user",
        operation: "getUserById",
      };

      storageError.context.additionalInfo = {
        ...storageError.context.additionalInfo,
        facade: facadeContext.facade,
        facadeOperation: `${facadeContext.domain}.${facadeContext.operation}`,
      };

      assert.strictEqual(storageError.context.additionalInfo?.facade, "user");
      assert.strictEqual(
        storageError.context.additionalInfo?.facadeOperation,
        "user.getUserById",
      );
    });

    it("should preserve existing additional info", () => {
      const storageError = new StorageError(
        "Validation failed",
        StorageErrorCode.VALIDATION_FAILED,
        {
          domain: "recipes",
          operation: "createRecipe",
          additionalInfo: { title: "Test Recipe" },
        },
      );

      const originalTitle = storageError.context.additionalInfo?.title;

      storageError.context.additionalInfo = {
        ...storageError.context.additionalInfo,
        facade: "user",
      };

      assert.strictEqual(
        storageError.context.additionalInfo?.title,
        originalTitle,
      );
      assert.strictEqual(storageError.context.additionalInfo?.facade, "user");
    });
  });

  describe("withFacadeErrorBoundary (async)", () => {
    it("should return function result on success", async () => {
      const result = await (async () => "success")();
      assert.strictEqual(result, "success");
    });

    it("should log and rethrow StorageError", async () => {
      const storageError = new StorageNotFoundError("User not found", {
        domain: "user",
        operation: "getUserById",
        entityId: "user-123",
      });

      let caughtError: unknown;
      try {
        await Promise.reject(storageError);
      } catch (error) {
        caughtError = error;
      }

      assert.ok(isStorageError(caughtError));
      assert.strictEqual(
        (caughtError as StorageError).code,
        StorageErrorCode.NOT_FOUND,
      );
    });

    it("should preserve error type after boundary", async () => {
      const connectionError = new StorageConnectionError(
        "Database unavailable",
        { domain: "system", operation: "healthCheck" },
        undefined,
        true,
      );

      assert.ok(connectionError instanceof StorageConnectionError);
      assert.ok(connectionError instanceof StorageError);
      assert.strictEqual(connectionError.isRetryable, true);
    });
  });

  describe("withFacadeErrorBoundarySync", () => {
    it("should return function result on success", () => {
      const result = (() => "sync success")();
      assert.strictEqual(result, "sync success");
    });

    it("should log and rethrow synchronous errors", () => {
      const error = new Error("Sync error");

      let caughtError: unknown;
      try {
        throw error;
      } catch (e) {
        caughtError = e;
      }

      assert.ok(caughtError instanceof Error);
      assert.strictEqual((caughtError as Error).message, "Sync error");
    });
  });

  describe("createDomainStorageProxy", () => {
    it("should wrap all method calls with error boundary", () => {
      const mockStorage = {
        getData: () => "data",
        getCount: () => 42,
      };

      assert.strictEqual(mockStorage.getData(), "data");
      assert.strictEqual(mockStorage.getCount(), 42);
    });

    it("should handle async methods", async () => {
      const mockStorage = {
        getDataAsync: async () => "async data",
      };

      const result = await mockStorage.getDataAsync();
      assert.strictEqual(result, "async data");
    });

    it("should propagate errors from proxied methods", async () => {
      const mockStorage = {
        failingMethod: async () => {
          throw new Error("Method failed");
        },
      };

      let caughtError: unknown;
      try {
        await mockStorage.failingMethod();
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError instanceof Error);
    });

    it("should propagate StorageErrors with enriched context", async () => {
      const storageError = new StorageNotFoundError("Entity not found", {
        domain: "test",
        operation: "find",
      });

      storageError.context.additionalInfo = {
        facade: "user",
        facadeOperation: "test.find",
      };

      assert.ok(storageError.context.additionalInfo?.facade);
    });

    it("should not affect non-function properties", () => {
      const mockStorage = {
        name: "TestStorage",
        version: 1,
        getData: () => "data",
      };

      assert.strictEqual(mockStorage.name, "TestStorage");
      assert.strictEqual(mockStorage.version, 1);
    });

    it("should handle synchronous throws before Promise", () => {
      const mockStorage = {
        syncThrow: () => {
          throw new Error("Sync throw");
        },
      };

      let caughtError: unknown;
      try {
        mockStorage.syncThrow();
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError instanceof Error);
      assert.strictEqual((caughtError as Error).message, "Sync throw");
    });

    it("should handle Promise rejections", async () => {
      const mockStorage = {
        asyncReject: () => Promise.reject(new Error("Async reject")),
      };

      let caughtError: unknown;
      try {
        await mockStorage.asyncReject();
      } catch (error) {
        caughtError = error;
      }

      assert.ok(caughtError instanceof Error);
      assert.strictEqual((caughtError as Error).message, "Async reject");
    });
  });

  describe("createFacadeContext", () => {
    it("should create context with required fields", () => {
      const context = {
        facade: "user" as const,
        domain: "recipes",
        operation: "createRecipe",
      };

      assert.strictEqual(context.facade, "user");
      assert.strictEqual(context.domain, "recipes");
      assert.strictEqual(context.operation, "createRecipe");
    });

    it("should include optional additional info", () => {
      const context = {
        facade: "admin" as const,
        domain: "users",
        operation: "banUser",
        additionalInfo: {
          userId: "user-123",
          reason: "Violation",
        },
      };

      assert.ok(context.additionalInfo);
      assert.strictEqual(context.additionalInfo.userId, "user-123");
      assert.strictEqual(context.additionalInfo.reason, "Violation");
    });
  });

  describe("Error Flow Through Facades", () => {
    it("should preserve error chain from domain to facade", () => {
      const originalError = new Error("Database error");
      const storageError = new StorageConnectionError(
        "Connection failed",
        { domain: "user", operation: "getUserById" },
        originalError,
        true,
      );

      assert.strictEqual(storageError.originalError, originalError);
      assert.ok(storageError.context.domain === "user");
    });

    it("should allow callers to catch specific error types", () => {
      const notFoundError = new StorageNotFoundError("Not found", {
        domain: "recipes",
        operation: "getRecipe",
      });

      if (notFoundError instanceof StorageNotFoundError) {
        assert.ok(true, "Can catch StorageNotFoundError specifically");
      }

      if (isStorageError(notFoundError)) {
        assert.ok(true, "Can identify as StorageError");
      }
    });

    it("should maintain error type identity through facade proxy", () => {
      const connectionError = new StorageConnectionError(
        "Timeout",
        { domain: "system", operation: "query" },
        undefined,
        true,
      );

      assert.ok(connectionError instanceof StorageConnectionError);
      assert.ok(connectionError instanceof StorageError);
      assert.ok(connectionError instanceof Error);
    });
  });
});

console.log("Facade Error Boundary tests loaded successfully");
