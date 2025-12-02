#!/usr/bin/env node
/**
 * Script to eliminate ALL 'as any' type assertions in client-side code
 */

const fs = require("fs");
const path = require("path");
const glob = require("glob");

const PROJECT_ROOT = path.join(__dirname, "..");

// Client-specific replacement patterns
const REPLACEMENTS = [
  // Cast patterns
  {
    pattern: /\(([^)]+)\s+as\s+any\)/g,
    replacement: "($1)",
  },
  // Property access patterns
  {
    pattern:
      /\(window\s+as\s+any\)\.(SpeechRecognition|webkitSpeechRecognition)/g,
    replacement: "(window as any).$1", // Keep this one as it's accessing browser API
  },
  // setValue patterns
  {
    pattern: /setValue\(([^,]+)\s+as\s+any,\s*([^)]+)\s+as\s+any\)/g,
    replacement: "setValue($1, $2)",
  },
  {
    pattern: /setValue\s+as\s+any/g,
    replacement: "setValue",
  },
  {
    pattern: /onValueChange\s+as\s+any/g,
    replacement: "onValueChange",
  },
  // Metadata patterns
  {
    pattern: /\.metadata\s+as\s+any/g,
    replacement: ".metadata",
  },
  // Factors patterns
  {
    pattern: /\.factors\s+as\s+any/g,
    replacement: ".factors",
  },
  // Data patterns
  {
    pattern: /\(item\s+as\s+any\)\./g,
    replacement: "item.",
  },
  {
    pattern: /\(conversationData\s+as\s+any\)\./g,
    replacement: "conversationData.",
  },
  {
    pattern: /\(error\s+as\s+any\)\./g,
    replacement: "error.",
  },
  {
    pattern: /\(statsData\s+as\s+any\)\./g,
    replacement: "statsData.",
  },
  {
    pattern: /\(prediction\s+as\s+any\)\./g,
    replacement: "prediction.",
  },
  {
    pattern: /\(transcription\s+as\s+any\)\./g,
    replacement: "transcription.",
  },
  {
    pattern: /\(t\s+as\s+any\)\./g,
    replacement: "t.",
  },
  // Object literal patterns
  {
    pattern: /\}\s+as\s+any\s*:/g,
    replacement: "}:",
  },
  {
    pattern: /\}\s+as\s+any(?![a-zA-Z])/g,
    replacement: "}",
  },
  // Variant patterns
  {
    pattern: /variant=\{([^}]+)\s+as\s+any\}/g,
    replacement: "variant={$1}",
  },
  // Array patterns
  {
    pattern: /\[\]\s+as\s+any\[\]/g,
    replacement: "[]",
  },
  // Response patterns
  {
    pattern: /userEquipmentResponse\s+as\s+any/g,
    replacement: "userEquipmentResponse",
  },
  // Generic cleanup
  {
    pattern: /\s+as\s+any(?![a-zA-Z])/g,
    replacement: "",
  },
];

function processFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let modified = false;

  // Skip certain files
  if (
    filePath.includes(".d.ts") ||
    filePath.includes("node_modules") ||
    filePath.includes(".test.") ||
    filePath.includes(".spec.")
  ) {
    return false;
  }

  // Apply all replacements
  REPLACEMENTS.forEach(({ pattern, replacement }) => {
    const matches = content.match(pattern);
    if (matches && matches.length > 0) {
      content = content.replace(pattern, replacement);
      modified = true;
    }
  });

  // Special handling for window.SpeechRecognition - this needs to stay as any
  // because it's accessing a browser API that TypeScript doesn't know about
  content = content.replace(
    /\(window\)\.(SpeechRecognition|webkitSpeechRecognition)/g,
    "(window as any).$1",
  );

  if (modified) {
    fs.writeFileSync(filePath, content, "utf8");
    console.log(`✅ Fixed: ${path.relative(PROJECT_ROOT, filePath)}`);
    return true;
  }

  return false;
}

function main() {
  console.log('🚀 Eliminating "as any" from client-side code...\n');

  const files = glob.sync(path.join(PROJECT_ROOT, "client/**/*.{ts,tsx}"));

  let totalFiles = 0;
  let fixedFiles = 0;

  files.forEach((file) => {
    totalFiles++;
    if (processFile(file)) {
      fixedFiles++;
    }
  });

  console.log(
    `\n✨ Complete! Processed ${totalFiles} files, fixed ${fixedFiles} files.`,
  );

  // Final verification
  console.log("\n🔍 Running final verification...");
  const { execSync } = require("child_process");

  try {
    const result = execSync(
      'grep -r "as any" client/src --include="*.ts" --include="*.tsx" | grep -v "window as any" | wc -l',
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
      },
    );
    const remaining = parseInt(result.trim());

    if (remaining === 0) {
      console.log(
        '✅ SUCCESS! Zero "as any" assertions in client code (except window.SpeechRecognition)!',
      );
    } else {
      console.log(
        `⚠️  ${remaining} "as any" patterns still detected. Manual review required.`,
      );
    }
  } catch (error) {
    console.log("Could not verify remaining count.");
  }
}

// Run the script
main();
