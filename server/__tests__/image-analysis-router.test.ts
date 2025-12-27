import {
  describe,
  it,
  expect,
  jest,
  beforeEach,
  afterEach,
} from "@jest/globals";
import express, { Express } from "express";
import request from "supertest";
import fileUpload from "express-fileupload";
import imageAnalysisRouter, {
  setOpenAIClient,
} from "../routers/platform/ai/image-analysis.router";

function createMockOpenAIClient(mockResponse: any) {
  return {
    chat: {
      completions: {
        create: jest.fn<() => Promise<any>>().mockResolvedValue(mockResponse),
      },
    },
  } as any;
}

function createTestImage(format: "jpeg" | "png" = "jpeg"): Buffer {
  if (format === "jpeg") {
    return Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00,
    ]);
  }
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
}

describe("Image Analysis Router", () => {
  let app: Express;

  beforeEach(() => {
    app = express();
    app.use(fileUpload());
    app.use("/api/ai", imageAnalysisRouter);
  });

  afterEach(() => {
    setOpenAIClient(null);
    jest.restoreAllMocks();
  });

  describe("POST /api/ai/analyze-food", () => {
    describe("Input Validation", () => {
      it("should reject non-multipart requests", async () => {
        const response = await request(app)
          .post("/api/ai/analyze-food")
          .send({ data: "test" });

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("multipart/form-data");
      });

      it("should reject requests without image file", async () => {
        const response = await request(app)
          .post("/api/ai/analyze-food")
          .set("Content-Type", "multipart/form-data");

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("No image file");
      });

      it("should reject invalid image formats", async () => {
        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", Buffer.from([0x00, 0x00, 0x00, 0x00]), "test.txt");

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("Invalid image format");
      });
    });

    describe("Successful Analysis", () => {
      it("should return parsed food items for valid image", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      name: "Gala Apple",
                      category: "produce",
                      quantity: 3,
                      quantityUnit: "items",
                      storageLocation: "refrigerator",
                      shelfLifeDays: 14,
                      confidence: 0.92,
                    },
                  ],
                  notes: "Fresh apple detected",
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(1);
        expect(response.body.items[0].name).toBe("Gala Apple");
        expect(response.body.items[0].category).toBe("produce");
        expect(response.body.items[0].confidence).toBe(0.92);
        expect(response.body.notes).toBe("Fresh apple detected");
      });

      it("should handle multiple items", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      name: "Apple",
                      category: "produce",
                      quantity: 4,
                      quantityUnit: "items",
                      storageLocation: "refrigerator",
                      shelfLifeDays: 14,
                      confidence: 0.9,
                    },
                    {
                      name: "Milk",
                      category: "dairy",
                      quantity: 1,
                      quantityUnit: "bottle",
                      storageLocation: "refrigerator",
                      shelfLifeDays: 7,
                      confidence: 0.85,
                    },
                    {
                      name: "Bread",
                      category: "bread",
                      quantity: 1,
                      quantityUnit: "items",
                      storageLocation: "counter",
                      shelfLifeDays: 5,
                      confidence: 0.88,
                    },
                  ],
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items).toHaveLength(3);
        expect(response.body.items.map((i: any) => i.name)).toEqual([
          "Apple",
          "Milk",
          "Bread",
        ]);
      });

      it("should handle no food detected", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [],
                  error: "No food items detected in this image",
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items).toEqual([]);
        expect(response.body.error).toBe(
          "No food items detected in this image",
        );
      });

      it("should accept PNG images", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({ items: [] }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage("png"), "test.png");

        expect(response.status).toBe(200);
      });
    });

    describe("Response Normalization", () => {
      it("should normalize invalid categories to 'other'", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      name: "Test Item",
                      category: "invalid_category",
                      quantity: 1,
                      quantityUnit: "items",
                      storageLocation: "refrigerator",
                      shelfLifeDays: 7,
                      confidence: 0.8,
                    },
                  ],
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items[0].category).toBe("other");
      });

      it("should clamp confidence values to valid range", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [
                    {
                      name: "Test",
                      category: "produce",
                      quantity: 1,
                      quantityUnit: "items",
                      storageLocation: "refrigerator",
                      shelfLifeDays: 7,
                      confidence: 1.5,
                    },
                  ],
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items[0].confidence).toBeLessThanOrEqual(1);
      });

      it("should provide defaults for missing fields", async () => {
        const mockClient = createMockOpenAIClient({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  items: [{ name: "Minimal Item" }],
                }),
              },
            },
          ],
        });
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(200);
        expect(response.body.items[0]).toMatchObject({
          name: "Minimal Item",
          category: "other",
          quantity: 1,
          quantityUnit: "items",
          storageLocation: "refrigerator",
        });
      });
    });

    describe("Error Handling", () => {
      it("should handle rate limit errors", async () => {
        const error = new Error("Rate limited") as any;
        error.status = 429;

        const mockClient = {
          chat: {
            completions: {
              create: jest.fn<() => Promise<any>>().mockRejectedValue(error),
            },
          },
        } as any;
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(429);
        expect(response.body.error).toContain("Too many requests");
      });

      it("should handle API key errors", async () => {
        const error = new Error("Invalid API key") as any;
        error.code = "invalid_api_key";

        const mockClient = {
          chat: {
            completions: {
              create: jest.fn<() => Promise<any>>().mockRejectedValue(error),
            },
          },
        } as any;
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(500);
        expect(response.body.error).toContain("configuration");
      });

      it("should handle image processing errors", async () => {
        const error = new Error("Could not process image");

        const mockClient = {
          chat: {
            completions: {
              create: jest.fn<() => Promise<any>>().mockRejectedValue(error),
            },
          },
        } as any;
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(400);
        expect(response.body.error).toContain("process");
      });

      it("should handle unexpected errors gracefully", async () => {
        const mockClient = {
          chat: {
            completions: {
              create: jest
                .fn<() => Promise<any>>()
                .mockRejectedValue(new Error("Unknown error")),
            },
          },
        } as any;
        setOpenAIClient(mockClient);

        const response = await request(app)
          .post("/api/ai/analyze-food")
          .attach("image", createTestImage(), "test.jpg");

        expect(response.status).toBe(500);
        expect(response.body.items).toEqual([]);
        expect(response.body.error).toBeTruthy();
      });
    });
  });

  describe("GET /api/ai/health", () => {
    it("should return health status", async () => {
      const response = await request(app).get("/api/ai/health");

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: "ok",
        model: "gpt-4o",
        maxFileSize: "10MB",
      });
      expect(response.body.supportedFormats).toContain("jpeg");
      expect(response.body.supportedFormats).toContain("png");
    });
  });
});
