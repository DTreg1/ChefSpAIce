#!/usr/bin/env tsx
/**
 * Comprehensive TypeScript-aware codemod to eliminate ALL 'as any' type assertions
 * Uses ts-morph for proper AST manipulation instead of regex
 */

import { Project, SyntaxKind, Node, AsExpression } from "ts-morph";
import * as path from "path";
import * as fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.join(__dirname, "..");
const HELPERS_IMPORT = `import { getAuthenticatedUserId, sendError, sendSuccess } from "../types/request-helpers";`;

interface FileStats {
  file: string;
  originalCount: number;
  fixedCount: number;
  remainingCount: number;
  issues: string[];
}

class AnyAssertionEliminator {
  private project: Project;
  private stats: FileStats[] = [];

  constructor() {
    this.project = new Project({
      tsConfigFilePath: path.join(PROJECT_ROOT, "tsconfig.json"),
    });
  }

  /**
   * Main entry point to eliminate all 'as any' assertions
   */
  async eliminateAll() {
    console.log(
      '🔍 Scanning for TypeScript files with "as any" assertions...\n',
    );

    // Get all TypeScript files in server/, shared/, and client/ directories
    const sourceFiles = this.project.getSourceFiles([
      "server/**/*.ts",
      "shared/**/*.ts",
      "client/**/*.ts",
    ]);

    for (const sourceFile of sourceFiles) {
      const filePath = sourceFile.getFilePath();

      // Skip node_modules, generated files, and test files
      if (
        filePath.includes("node_modules") ||
        filePath.includes(".d.ts") ||
        filePath.includes(".test.") ||
        filePath.includes(".spec.")
      ) {
        continue;
      }

      await this.processFile(sourceFile);
    }

    this.printReport();
    this.saveManifest();
  }

  /**
   * Process a single file to remove 'as any' assertions
   */
  private async processFile(sourceFile: any) {
    const filePath = sourceFile.getFilePath();
    const relativeFilePath = path.relative(PROJECT_ROOT, filePath);

    // Find all 'as any' expressions
    const asExpressions = sourceFile
      .getDescendantsOfKind(SyntaxKind.AsExpression)
      .filter((expr: AsExpression) => {
        const typeNode = expr.getTypeNode();
        return typeNode && typeNode.getText() === "any";
      });

    if (asExpressions.length === 0) {
      return;
    }

    const stats: FileStats = {
      file: relativeFilePath,
      originalCount: asExpressions.length,
      fixedCount: 0,
      remainingCount: 0,
      issues: [],
    };

    console.log(
      `Processing: ${relativeFilePath} (${asExpressions.length} instances)`,
    );

    // Process each 'as any' expression
    for (const asExpr of asExpressions) {
      const fixed = this.fixAsAnyExpression(asExpr, sourceFile);
      if (fixed) {
        stats.fixedCount++;
      } else {
        stats.remainingCount++;
        stats.issues.push(this.getContextualInfo(asExpr));
      }
    }

    // Add helper imports if needed and file was modified
    if (stats.fixedCount > 0) {
      this.ensureHelperImports(sourceFile, relativeFilePath);
      await sourceFile.save();
      console.log(
        `  ✅ Fixed ${stats.fixedCount} of ${stats.originalCount} instances`,
      );
    }

    if (stats.remainingCount > 0) {
      console.log(`  ⚠️  ${stats.remainingCount} instances need manual review`);
    }

    this.stats.push(stats);
  }

  /**
   * Attempt to fix a specific 'as any' expression
   */
  private fixAsAnyExpression(asExpr: AsExpression, sourceFile: any): boolean {
    const expression = asExpr.getExpression();
    const expressionText = expression.getText();
    const parent = asExpr.getParent();

    // Pattern 1: (req.user as any)?.id => getAuthenticatedUserId(req)
    if (expressionText === "req.user" && parent) {
      const parentText = parent.getText();
      if (parentText.includes("?.id") || parentText.includes(".id")) {
        // Replace entire expression with helper function
        const grandParent = parent.getParent();
        if (
          grandParent &&
          grandParent.getKindName() === "PropertyAccessExpression"
        ) {
          grandParent.replaceWithText("getAuthenticatedUserId(req)");
          return true;
        }
      }
    }

    // Pattern 2: req.body as any => req.body
    if (expressionText === "req.body") {
      asExpr.replaceWithText("req.body");
      return true;
    }

    // Pattern 3: req.query as any => req.query
    if (expressionText === "req.query") {
      asExpr.replaceWithText("req.query");
      return true;
    }

    // Pattern 4: req.params as any => req.params
    if (expressionText === "req.params") {
      asExpr.replaceWithText("req.params");
      return true;
    }

    // Pattern 5: (req as any).user => req.user
    if (expressionText === "req" && parent) {
      const parentText = parent.getText();
      if (parentText.includes(".user") || parentText.includes(".session")) {
        asExpr.replaceWithText("req");
        return true;
      }
    }

    // Pattern 6: error as any => error
    if (expressionText === "error" || expressionText.includes("err")) {
      asExpr.replaceWithText(expressionText);
      return true;
    }

    // Pattern 7: Generic value as any in assignments
    const assignmentPatterns = [
      "validated",
      "result",
      "data",
      "response",
      "user",
      "item",
      "updates",
      "rule",
      "history",
      "pattern",
      "preferences",
      "suggestions",
      "category",
      "assignment",
      "cache",
      "event",
    ];

    for (const pattern of assignmentPatterns) {
      if (expressionText.includes(pattern)) {
        // Check if this is a database operation (common pattern)
        const parentText = parent?.getText() || "";
        if (parentText.includes(".values(") || parentText.includes(".set(")) {
          // Keep the assertion for database operations - these often need it
          return false;
        } else {
          asExpr.replaceWithText(expressionText);
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get contextual information about an unresolved 'as any' for manual review
   */
  private getContextualInfo(asExpr: AsExpression): string {
    const line = asExpr.getStartLineNumber();
    const expression = asExpr.getExpression().getText();
    const parent = asExpr.getParent()?.getText() || "";
    return `Line ${line}: ${expression} as any (context: ${parent.substring(0, 50)}...)`;
  }

  /**
   * Ensure helper imports are present in the file
   */
  private ensureHelperImports(sourceFile: any, filePath: string) {
    const hasHelperImport = sourceFile
      .getImportDeclarations()
      .some((imp: any) =>
        imp.getModuleSpecifierValue().includes("request-helpers"),
      );

    if (!hasHelperImport && filePath.includes("server/routers/")) {
      // Add import at the top after express import
      const expressImport = sourceFile
        .getImportDeclarations()
        .find((imp: any) => imp.getModuleSpecifierValue() === "express");

      if (expressImport) {
        expressImport.insertAfter(HELPERS_IMPORT);
      }
    }
  }

  /**
   * Print final report
   */
  private printReport() {
    console.log("\n" + "=".repeat(60));
    console.log("📊 ELIMINATION REPORT");
    console.log("=".repeat(60) + "\n");

    let totalOriginal = 0;
    let totalFixed = 0;
    let totalRemaining = 0;

    for (const stat of this.stats) {
      totalOriginal += stat.originalCount;
      totalFixed += stat.fixedCount;
      totalRemaining += stat.remainingCount;
    }

    console.log(`Total 'as any' assertions found: ${totalOriginal}`);
    console.log(`Successfully eliminated: ${totalFixed}`);
    console.log(`Remaining (need manual review): ${totalRemaining}`);

    if (totalRemaining > 0) {
      console.log("\n⚠️  Files requiring manual review:");
      for (const stat of this.stats.filter((s) => s.remainingCount > 0)) {
        console.log(`  - ${stat.file} (${stat.remainingCount} instances)`);
      }
    }
  }

  /**
   * Save manifest of remaining issues for manual follow-up
   */
  private saveManifest() {
    const remaining = this.stats.filter((s) => s.remainingCount > 0);

    if (remaining.length > 0) {
      const manifestPath = path.join(PROJECT_ROOT, "as-any-manifest.json");
      fs.writeFileSync(manifestPath, JSON.stringify(remaining, null, 2));
      console.log(`\n📝 Manifest saved to: as-any-manifest.json`);
    }
  }
}

// Execute the eliminator
async function main() {
  const eliminator = new AnyAssertionEliminator();
  await eliminator.eliminateAll();

  console.log("\n✨ Elimination complete!");
  console.log('Run "npm run type-check" to verify no type errors remain.\n');
}

main().catch(console.error);
