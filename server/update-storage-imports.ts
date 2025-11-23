#!/usr/bin/env tsx
/**
 * Script to update all storage imports to use the new three-tier structure
 */

import fs from 'fs';
import path from 'path';

// Mapping of old imports to new structure
const importMapping: Record<string, string> = {
  // User tier
  'userStorage': 'storage.user.user',
  'foodStorage': 'storage.user.food',
  'recipesStorage': 'storage.user.recipes',
  'inventoryStorage': 'storage.user.inventory',
  'chatStorage': 'storage.user.chat',
  'notificationStorage': 'storage.user.notifications',
  'schedulingStorage': 'storage.user.scheduling',
  
  // Admin tier
  'billingStorage': 'storage.admin.billing',
  'securityStorage': 'storage.admin.security',
  'pricingStorage': 'storage.admin.pricing',
  'experimentsStorage': 'storage.admin.experiments',
  'supportStorage': 'storage.admin.support',
  
  // Platform tier
  'analyticsStorage': 'storage.platform.analytics',
  'aiMlStorage': 'storage.platform.ai',
  'systemStorage': 'storage.platform.system',
  'contentStorage': 'storage.platform.content',
  'feedbackStorage': 'storage.platform.feedback',
};

function updateFile(filePath: string) {
  let content = fs.readFileSync(filePath, 'utf8');
  let hasChanges = false;
  
  // Check if file imports any of the old storage modules
  const oldImports = Object.keys(importMapping);
  const hasOldImports = oldImports.some(imp => content.includes(imp));
  
  if (!hasOldImports && !content.includes('from "../storage')) {
    return false; // No changes needed
  }
  
  // Step 1: Update import statements
  // Handle various import patterns
  const importPatterns = [
    // Pattern: import { storageModule1, storageModule2 } from "../storage/index"
    /import\s*\{([^}]+)\}\s*from\s*["']\.\.\/storage(?:\/index)?["']/g,
    // Pattern: import { storage } from "../storage"
    /import\s*\{\s*storage\s*\}\s*from\s*["']\.\.\/storage(?:\/index)?["']/g,
  ];
  
  // Check what modules are imported
  const importedModules: string[] = [];
  let alreadyImportsStorage = false;
  
  content.replace(importPatterns[0], (match, imports) => {
    const modules = imports.split(',').map((s: string) => s.trim());
    modules.forEach((mod: string) => {
      if (mod === 'storage') {
        alreadyImportsStorage = true;
      } else if (importMapping[mod]) {
        importedModules.push(mod);
      }
    });
    return match;
  });
  
  // Replace old imports with just storage import
  if (importedModules.length > 0) {
    content = content.replace(importPatterns[0], (match, imports) => {
      const modules = imports.split(',').map((s: string) => s.trim());
      const hasStorage = modules.includes('storage');
      const needsStorage = modules.some(m => importMapping[m]);
      
      if (needsStorage && !hasStorage) {
        return 'import { storage } from "../storage/index"';
      } else if (hasStorage && modules.length === 1) {
        return match; // Already correct
      } else if (hasStorage && modules.length > 1) {
        // Keep only storage import
        return 'import { storage } from "../storage/index"';
      }
      return match;
    });
    hasChanges = true;
  }
  
  // Step 2: Update usage in the code
  oldImports.forEach(oldImport => {
    if (content.includes(oldImport)) {
      const newImport = importMapping[oldImport];
      // Use regex to replace whole word only (not parts of other words)
      const regex = new RegExp(`\\b${oldImport}\\b(?!\\.user\\.|\\.admin\\.|\\.platform\\.)`, 'g');
      content = content.replace(regex, newImport);
      hasChanges = true;
    }
  });
  
  // Step 3: Special handling for domain imports
  content = content.replace(
    /from\s*["']\.\.\/storage\/domains\/[^"']+["']/g,
    'from "../storage/index"'
  );
  
  if (hasChanges) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated: ${path.basename(filePath)}`);
    return true;
  }
  return false;
}

function updateDirectory(dirPath: string) {
  const files = fs.readdirSync(dirPath);
  let updatedCount = 0;
  
  files.forEach(file => {
    if (file.endsWith('.ts') && !file.endsWith('.test.ts')) {
      const filePath = path.join(dirPath, file);
      const stats = fs.statSync(filePath);
      
      if (stats.isFile()) {
        if (updateFile(filePath)) {
          updatedCount++;
        }
      }
    }
  });
  
  return updatedCount;
}

// Update routers
console.log('🔄 Updating router imports...');
const routersUpdated = updateDirectory('./routers');
console.log(`✅ Updated ${routersUpdated} router files\n`);

// Update services
console.log('🔄 Updating service imports...');
const servicesUpdated = updateDirectory('./services');
console.log(`✅ Updated ${servicesUpdated} service files\n`);

console.log('✨ Storage import migration complete!');