#!/usr/bin/env node
import fs from 'fs';
import { glob } from 'glob';

// Fix client-side error handling
const fixClientErrors = async () => {
  console.log('Fixing client-side error handling...');
  
  const clientFiles = [
    'client/src/pages/appliances.tsx',
    'client/src/pages/camera-test.tsx', 
    'client/src/pages/settings.tsx',
    'client/src/utils/shareApi.ts'
  ];
  
  for (const file of clientFiles) {
    if (!fs.existsSync(file)) continue;
    
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix error type annotations in catch blocks
    content = content.replace(/catch\s*\(([\w]+)\)\s*{/g, (match, varName) => {
      return `catch (${varName}) {`;
    });
    
    // Add type assertions for error usage
    const errorUsagePattern = /(console\.(error|warn|log)\([^,]+,\s*)(error|err|e)([\),])/g;
    content = content.replace(errorUsagePattern, '$1String($3)$4');
    
    // Fix error message access
    content = content.replace(
      /(\w+)\.message(\s|;|\)|,)/g,
      (match, varName, suffix) => {
        if (['error', 'err', 'e'].includes(varName)) {
          return `(${varName} instanceof Error ? ${varName}.message : String(${varName}))${suffix}`;
        }
        return match;
      }
    );
    
    if (content !== fs.readFileSync(file, 'utf8')) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${file}`);
      modified = true;
    }
  }
};

// Fix server seed file errors
const fixSeedFileErrors = async () => {
  console.log('\nFixing seed file errors...');
  
  const seedFile = 'server/seed-common-food-items.ts';
  if (fs.existsSync(seedFile)) {
    let content = fs.readFileSync(seedFile, 'utf8');
    
    // Fix error handling in catch blocks
    content = content.replace(
      /catch\s*\((error)\)\s*{/g,
      'catch (error) {'
    );
    
    // Add type guard for error usage
    content = content.replace(
      /console\.error\("([^"]+)",\s*error\);/g,
      'console.error("$1", error instanceof Error ? error.message : String(error));'
    );
    
    fs.writeFileSync(seedFile, content);
    console.log(`Fixed: ${seedFile}`);
  }
};

// Fix remaining router type issues
const fixRouterBodyTypes = async () => {
  console.log('\nFixing router body type issues...');
  
  const routerFiles = await glob(['server/routers/*.router.ts']);
  
  for (const file of routerFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix req.body null checks
    if (content.includes('req.body')) {
      // Add null check for req.body where it's accessed directly
      content = content.replace(
        /const\s+{\s*([^}]+)\s*}\s*=\s*req\.body;/g,
        'const { $1 } = req.body || {};'
      );
      
      // Fix destructuring patterns
      content = content.replace(
        /const\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*req\.body\.([a-zA-Z_][a-zA-Z0-9_]*);/g,
        'const $1 = req.body?.$2;'
      );
      
      modified = true;
    }
    
    // Fix userId null checks
    if (content.includes('userId')) {
      // Ensure proper null checks after userId declaration
      const userIdPattern = /const userId = req\.user\?\.claims\.sub;(?!\s*if\s*\(!userId\))/g;
      if (userIdPattern.test(content)) {
        content = content.replace(userIdPattern, 
          'const userId = req.user?.claims.sub;\n    if (!userId) return res.status(401).json({ error: "Unauthorized" });'
        );
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${file}`);
    }
  }
};

const main = async () => {
  console.log('Fixing remaining TypeScript errors...\n');
  
  await fixClientErrors();
  await fixSeedFileErrors();
  await fixRouterBodyTypes();
  
  console.log('\n✅ Completed remaining error fixes');
};

main().catch(console.error);