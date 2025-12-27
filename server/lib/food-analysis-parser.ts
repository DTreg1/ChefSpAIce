import { z } from "zod";

export const identifiedFoodSchema = z.object({
  name: z.string(),
  category: z.enum([
    "produce",
    "dairy",
    "meat",
    "seafood",
    "bread",
    "canned",
    "frozen",
    "beverages",
    "condiments",
    "snacks",
    "grains",
    "spices",
    "other",
  ]),
  quantity: z.number().min(0),
  quantityUnit: z.enum([
    "items",
    "lbs",
    "oz",
    "bunch",
    "container",
    "bag",
    "box",
    "bottle",
    "can",
  ]),
  storageLocation: z.enum(["refrigerator", "freezer", "pantry", "counter"]),
  shelfLifeDays: z.number().min(1).max(365),
  confidence: z.number().min(0).max(1),
});

export const analysisResponseSchema = z.object({
  items: z.array(identifiedFoodSchema),
  notes: z.string().optional(),
  error: z.string().optional(),
});

export type IdentifiedFood = z.infer<typeof identifiedFoodSchema>;
export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;

const VALID_CATEGORIES = [
  "produce",
  "dairy",
  "meat",
  "seafood",
  "bread",
  "canned",
  "frozen",
  "beverages",
  "condiments",
  "snacks",
  "grains",
  "spices",
  "other",
];

const VALID_UNITS = [
  "items",
  "lbs",
  "oz",
  "bunch",
  "container",
  "bag",
  "box",
  "bottle",
  "can",
];

const VALID_LOCATIONS = ["refrigerator", "freezer", "pantry", "counter"];

export interface ParsedAnalysisResult {
  success: boolean;
  normalized: boolean;
  data?: AnalysisResponse;
  error?: string;
}

export function parseAnalysisResponse(
  content: string | null,
): ParsedAnalysisResult {
  if (!content) {
    return { success: false, normalized: false, error: "No response content" };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    return {
      success: false,
      normalized: false,
      error: "Failed to parse AI response",
    };
  }

  const validationResult = analysisResponseSchema.safeParse(parsed);

  if (validationResult.success) {
    return { success: true, normalized: false, data: validationResult.data };
  }

  const fixedItems = normalizeItems((parsed as any)?.items || []);

  return {
    success: true,
    normalized: true,
    data: {
      items: fixedItems,
      notes: (parsed as any)?.notes || undefined,
      error: (parsed as any)?.error || undefined,
    },
  };
}

export function normalizeItems(items: unknown[]): IdentifiedFood[] {
  if (!Array.isArray(items)) {
    return [];
  }

  return items.map((item: any) => ({
    name: String(item?.name || "Unknown Item"),
    category: normalizeCategory(item?.category),
    quantity: normalizeQuantity(item?.quantity),
    quantityUnit: normalizeUnit(item?.quantityUnit),
    storageLocation: normalizeStorageLocation(item?.storageLocation),
    shelfLifeDays: normalizeShelfLife(item?.shelfLifeDays),
    confidence: normalizeConfidence(item?.confidence),
  }));
}

export function normalizeCategory(
  category: unknown,
): IdentifiedFood["category"] {
  if (
    typeof category === "string" &&
    VALID_CATEGORIES.includes(category.toLowerCase())
  ) {
    return category.toLowerCase() as IdentifiedFood["category"];
  }
  return "other";
}

export function normalizeUnit(unit: unknown): IdentifiedFood["quantityUnit"] {
  if (typeof unit === "string" && VALID_UNITS.includes(unit.toLowerCase())) {
    return unit.toLowerCase() as IdentifiedFood["quantityUnit"];
  }
  return "items";
}

export function normalizeStorageLocation(
  location: unknown,
): IdentifiedFood["storageLocation"] {
  if (
    typeof location === "string" &&
    VALID_LOCATIONS.includes(location.toLowerCase())
  ) {
    return location.toLowerCase() as IdentifiedFood["storageLocation"];
  }
  return "refrigerator";
}

export function normalizeQuantity(quantity: unknown): number {
  const num = Number(quantity);
  return isNaN(num) ? 1 : Math.max(0, num);
}

export function normalizeShelfLife(shelfLifeDays: unknown): number {
  const num = Number(shelfLifeDays);
  if (isNaN(num)) return 7;
  return Math.min(365, Math.max(1, num));
}

export function normalizeConfidence(confidence: unknown): number {
  const num = Number(confidence);
  if (isNaN(num)) return 0.5;
  return Math.min(1, Math.max(0, num));
}

export const SUPPORTED_IMAGE_FORMATS = ["jpeg", "jpg", "png", "webp", "gif"];
export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function getImageMimeType(filename: string): string | null {
  const ext = filename.split(".").pop()?.toLowerCase();

  const mimeTypes: Record<string, string> = {
    jpeg: "image/jpeg",
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };

  return ext && mimeTypes[ext] ? mimeTypes[ext] : null;
}

export function isValidImageFormat(filename: string): boolean {
  const ext = filename.split(".").pop()?.toLowerCase();
  return ext ? SUPPORTED_IMAGE_FORMATS.includes(ext) : false;
}

export function detectMimeTypeFromBuffer(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "image/png";
  }

  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46
  ) {
    if (buffer.length >= 12 && buffer.toString("utf8", 8, 12) === "WEBP") {
      return "image/webp";
    }
  }

  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38
  ) {
    return "image/gif";
  }

  return null;
}
