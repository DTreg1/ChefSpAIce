#!/usr/bin/env node

/**
 * Automated codemod script to remove 'as any' type assertions
 * and apply shared type helpers across all router files
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

// Configuration
const ROUTERS_DIR = path.join(__dirname, "../server/routers");
const MIDDLEWARE_DIR = path.join(__dirname, "../server/middleware");
const HELPERS_IMPORT = `import { getAuthenticatedUserId, sendError, sendSuccess } from "../types/request-helpers";`;

// Patterns to replace
const REPLACEMENTS = [
  // Replace ExpressRequest<any, any, any, any> with Request
  {
    pattern: /ExpressRequest<any,\s*any,\s*any,\s*any>/g,
    replacement: "Request",
  },
  // Replace Request as ExpressRequest with just Request
  {
    pattern: /Request\s+as\s+ExpressRequest/g,
    replacement: "Request",
  },
  // Replace Response as ExpressResponse with just Response
  {
    pattern: /Response\s+as\s+ExpressResponse/g,
    replacement: "Response",
  },
  // Replace (req.user as any)?.id with getAuthenticatedUserId(req)
  {
    pattern: /\(req\.user\s+as\s+any\)\?\.id/g,
    replacement: "getAuthenticatedUserId(req)",
    needsImport: true,
  },
  // Replace req.body as any with req.body
  {
    pattern: /req\.body\s+as\s+any/g,
    replacement: "req.body",
  },
  // Replace (req as any).session with req.session
  {
    pattern: /\(req\s+as\s+any\)\.session/g,
    replacement: "req.session",
  },
  // Replace (error as any) patterns
  {
    pattern: /\(error\s+as\s+any\)/g,
    replacement: "error",
  },
];

/**
 * Process a single file
 */
function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;
  let needsHelperImport = false;

  // Apply replacements
  REPLACEMENTS.forEach(({ pattern, replacement, needsImport }) => {
    if (pattern.test(content)) {
      content = content.replace(pattern, replacement);
      modified = true;
      if (needsImport) {
        needsHelperImport = true;
      }
    }
  });

  // Fix type imports if modified
  if (modified) {
    // Remove duplicate type imports
    content = content.replace(
      /import\s+type\s+{\s*Request,\s*Response\s*}\s+from\s+"express";\s*/g,
      "",
    );

    // Ensure proper imports
    if (!content.includes("import { Router, Request, Response")) {
      // Replace existing Router import with full import
      content = content.replace(
        /import\s+{\s*Router[^}]*}\s+from\s+"express";/,
        'import { Router, Request, Response } from "express";',
      );
    }

    // Add helper import if needed
    if (needsHelperImport && !content.includes("request-helpers")) {
      // Add after the express import
      content = content.replace(
        /(import\s+{\s*Router[^}]*}\s+from\s+"express";\s*\n)/,
        `$1${HELPERS_IMPORT}\n`,
      );
    }

    // Clean up any remaining ExpressRequest/ExpressResponse references
    content = content.replace(/:\s*ExpressRequest(?![<])/g, ": Request");
    content = content.replace(/:\s*ExpressResponse/g, ": Response");

    // Write back the modified content
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed: ${path.basename(filePath)}`);
    return true;
  }

  return false;
}

/**
 * Main execution
 */
function main() {
  console.log("🔧 Starting type assertion fixes...\n");

  // Find all router files
  const routerFiles = glob.sync(path.join(ROUTERS_DIR, "*.router.ts"));
  const middlewareFiles = glob.sync(
    path.join(MIDDLEWARE_DIR, "*.middleware.ts"),
  );

  const allFiles = [...routerFiles, ...middlewareFiles];

  let fixedCount = 0;
  let totalCount = allFiles.length;

  allFiles.forEach((file) => {
    if (processFile(file)) {
      fixedCount++;
    }
  });

  console.log(`\n✨ Complete! Fixed ${fixedCount} of ${totalCount} files.`);

  // Report remaining issues to check manually
  console.log("\n⚠️  Remember to:");
  console.log("1. Run npm run build to check for remaining type errors");
  console.log(
    "2. Review schema mismatches in writing-assistant.router.ts and scheduling.router.ts",
  );
  console.log("3. Restart the workflow to validate changes");
}

// Check if glob is available, install if not
try {
  require.resolve("glob");
  main();
} catch (e) {
  console.log("Installing glob dependency...");
  const { execSync } = require("child_process");
  execSync("npm install glob", { stdio: "inherit" });
  main();
}
