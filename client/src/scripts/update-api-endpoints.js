#!/usr/bin/env node

/**
 * Script to update all API endpoints from legacy to v1 structure
 * This helps migrate all frontend API calls to the new RESTful endpoints
 */

const fs = require("fs");
const path = require("path");

// Mapping of old endpoints to new endpoints
const endpointMappings = {
  // Core resources
  "/api/inventory": "/api/v1/inventories",
  "/api/food-items": "/api/v1/food-items",
  "/api/storage-locations": "/api/v1/storage-locations",

  // Recipes & Meal Planning
  "/api/recipes": "/api/v1/recipes",
  "/api/meal-plans": "/api/v1/meal-plans",
  "/api/shopping-list": "/api/v1/shopping-list",

  // Chat & AI
  "/api/chat": "/api/v1/chat",
  "/api/writing": "/api/v1/ai/generation",
  "/api/ai/writing": "/api/v1/ai/generation",
  "/api/sentiment": "/api/v1/ai/analysis/sentiment",
  "/api/trends": "/api/v1/ai/analysis/trends",
  "/api/predictions": "/api/v1/ai/analysis/predictions",
  "/api/ocr": "/api/v1/ai/vision/ocr",
  "/api/faces": "/api/v1/ai/vision/faces",
  "/api/alt-text": "/api/v1/ai/vision/alt-text",
  "/api/voice": "/api/v1/ai/voice",
  "/api/transcribe": "/api/v1/ai/voice/transcribe",

  // Notifications
  "/api/notifications": "/api/v1/notifications",
  "/api/push-tokens": "/api/v1/notifications/tokens",

  // Analytics & Platform
  "/api/analytics": "/api/v1/analytics",
  "/api/activities": "/api/v1/activities",
  "/api/activity-logs": "/api/v1/activities",
  "/api/feedback": "/api/v1/feedback",
  "/api/batch": "/api/v1/batch",
  "/api/logs": "/api/v1/logs",

  // Admin
  "/api/admin": "/api/v1/admin",
  "/api/moderate": "/api/v1/admin/moderate",
  "/api/pricing": "/api/v1/admin/pricing",

  // ML Services
  "/api/ml": "/api/v1/ml",
  "/api/duplicates": "/api/v1/ml/duplicates",
  "/api/predict": "/api/v1/predictions",
  "/api/extract": "/api/v1/extraction",

  // Utilities
  "/api/autosave": "/api/v1/autosave",
  "/api/autocomplete": "/api/v1/autocomplete",
  "/api/validation": "/api/v1/validation",
  "/api/appliances": "/api/v1/appliances",
  "/api/cooking-terms": "/api/v1/cooking-terms",

  // External APIs
  "/api/fdc": "/api/v1/fdc",
  "/api/barcode": "/api/v1/barcodes",
  "/api/barcodelookup": "/api/v1/barcodes/lookup",

  // Special endpoints
  "/api/health": "/api/v1/health",
  "/api/info": "/api/v1/info",

  // Object storage
  "/api/objects": "/api/v1/objects",
  "/api/images": "/api/v1/images",
};

function updateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Track changes
  const changes = [];

  // Replace all old endpoints with new ones
  for (const [oldEndpoint, newEndpoint] of Object.entries(endpointMappings)) {
    // Create regex patterns to match the endpoints
    const patterns = [
      // Match in strings
      new RegExp(
        `(['"\`])${oldEndpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(/|['"\`])`,
        "g",
      ),
      new RegExp(
        `(['"\`])${oldEndpoint.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`,
        "gm",
      ),
    ];

    for (const pattern of patterns) {
      const matches = content.match(pattern);
      if (matches) {
        content = content.replace(pattern, (match, quote1, quote2) => {
          if (
            quote2 &&
            quote2 !== "/" &&
            (quote2 === '"' || quote2 === "'" || quote2 === "`")
          ) {
            return `${quote1}${newEndpoint}${quote2}`;
          }
          return `${quote1}${newEndpoint}${quote2 || ""}`;
        });
        modified = true;
        changes.push(
          `  ${oldEndpoint} → ${newEndpoint} (${matches.length} occurrences)`,
        );
      }
    }
  }

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Updated: ${filePath}`);
    changes.forEach((change) => console.log(change));
  }

  return modified;
}

function walkDirectory(dir, fileCallback) {
  const files = fs.readdirSync(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);

    // Skip node_modules and other build directories
    if (
      file === "node_modules" ||
      file === "dist" ||
      file === "build" ||
      file === ".git"
    ) {
      continue;
    }

    if (stat.isDirectory()) {
      walkDirectory(filePath, fileCallback);
    } else if (
      stat.isFile() &&
      (file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".js") ||
        file.endsWith(".jsx"))
    ) {
      fileCallback(filePath);
    }
  }
}

// Main execution
console.log("🔄 Updating API endpoints to v1...\n");

const srcDir = path.join(__dirname, "..");
let totalUpdated = 0;

walkDirectory(srcDir, (filePath) => {
  if (updateFile(filePath)) {
    totalUpdated++;
  }
});

console.log(`\n✨ Updated ${totalUpdated} files with new API endpoints!`);
console.log(
  "📝 Note: The backend automatically redirects old endpoints, so the app will continue to work during migration.",
);
