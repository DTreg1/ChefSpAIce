#!/usr/bin/env node
/**
 * CI Guard Script - Prevents 'as any' type assertions from being introduced
 * Run this in CI/CD pipeline to ensure type safety
 */

const { execSync } = require("child_process");
const path = require("path");

const PROJECT_ROOT = path.join(__dirname, "..");

function checkForAsAny() {
  console.log('🔍 Checking for "as any" type assertions...\n');

  try {
    // Search for "as any" excluding comments and type definition files
    const result = execSync(
      'grep -r "as any" server/ client/ shared/ --include="*.ts" --include="*.tsx" | ' +
        'grep -v "//" | grep -v "\\*" | grep -v node_modules | grep -v ".d.ts"',
      {
        cwd: PROJECT_ROOT,
        encoding: "utf8",
        stdio: ["pipe", "pipe", "pipe"], // Capture stdout and stderr
      },
    );

    if (result && result.trim()) {
      console.error('❌ FAILED: Found "as any" type assertions:\n');
      console.error(result);
      console.error('\n⚠️  Please remove all "as any" type assertions.');
      console.error(
        "   Use proper types or the helpers in server/types/request-helpers.ts",
      );
      process.exit(1);
    }
  } catch (error) {
    // grep returns exit code 1 when no matches found (which is what we want)
    if (error.status === 1) {
      console.log('✅ SUCCESS: No "as any" type assertions found!');
      console.log("   Type safety is maintained throughout the codebase.\n");
      return;
    }
    // Other errors should be reported
    console.error("Error running check:", error.message);
    process.exit(1);
  }
}

function checkTypeScript() {
  console.log("🔍 Running TypeScript compiler check...\n");

  try {
    execSync("npx tsc --noEmit", {
      cwd: PROJECT_ROOT,
      stdio: "inherit",
    });
    console.log("✅ TypeScript compilation successful!\n");
  } catch (error) {
    console.error(
      "❌ TypeScript compilation failed. Please fix type errors.\n",
    );
    process.exit(1);
  }
}

// Main execution
console.log("=".repeat(60));
console.log('Type Safety Guard - Preventing "as any" Regressions');
console.log("=".repeat(60) + "\n");

checkForAsAny();

// Optionally check TypeScript compilation
if (process.argv.includes("--check-types")) {
  checkTypeScript();
}

console.log("🎉 All checks passed! Code maintains type safety standards.");
