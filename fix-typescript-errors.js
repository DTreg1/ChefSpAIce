#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const fixRouterImports = async () => {
  console.log('Fixing TypeScript import errors in routers...');
  
  // Find all router files
  const routerFiles = await glob(['server/routers/*.ts'], { 
    ignore: ['**/node_modules/**'] 
  });
  
  let fixedCount = 0;
  
  for (const file of routerFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix 1: Remove global Request/Response imports and use Express types
    if (content.includes('import { Router')) {
      // Check if Express types are already imported correctly
      if (!content.includes('import { Request, Response')) {
        // Replace the Router import to include Request and Response
        content = content.replace(
          /import { Router }/g,
          'import { Router, Request, Response }'
        );
        
        // Also add NextFunction if needed
        if (content.includes('next:') || content.includes('NextFunction')) {
          content = content.replace(
            'import { Router, Request, Response }',
            'import { Router, Request, Response, NextFunction }'
          );
        }
        modified = true;
      }
    }
    
    // Fix 2: Update handler types to properly use Express types
    // Replace (req: Request, res: Response) with proper Express typing
    const patterns = [
      // Fix any declarations to use proper Express imports
      { 
        pattern: /async \(req: Request,/g, 
        replacement: 'async (req: Request<any, any, any, any>,' 
      },
      // Fix req: any declarations
      { 
        pattern: /\(req:\s*any,/g, 
        replacement: '(req: Request<any, any, any, any>,' 
      },
      // Fix res: any declarations  
      { 
        pattern: /,\s*res:\s*any\)/g, 
        replacement: ', res: Response)' 
      }
    ];
    
    for (const { pattern, replacement } of patterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${file}`);
      fixedCount++;
    }
  }
  
  return fixedCount;
};

const fixTypeDefinitions = async () => {
  console.log('\nAdding Express type definitions for req.user...');
  
  // Create a type definitions file for Express extensions
  const typeDefContent = `// Type definitions for Express extensions
import { UserClaims } from "./replitAuth";

declare global {
  namespace Express {
    interface Request {
      user?: {
        claims: UserClaims;
      };
    }
  }
}

export {};
`;

  fs.writeFileSync('server/types/express.d.ts', typeDefContent);
  console.log('Created: server/types/express.d.ts');
  
  // Ensure the directory exists
  if (!fs.existsSync('server/types')) {
    fs.mkdirSync('server/types');
  }
  
  return 1;
};

const fixErrorTypes = async () => {
  console.log('\nFixing error type annotations...');
  
  const files = await glob([
    'client/**/*.{ts,tsx}',
    'server/**/*.ts'
  ], { 
    ignore: ['**/node_modules/**', '**/dist/**'] 
  });
  
  let fixedCount = 0;
  
  for (const file of files) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix catch block error types
    const errorPatterns = [
      { 
        pattern: /catch\s*\(([\w]+)\)\s*{/g, 
        replacement: 'catch ($1: unknown) {' 
      },
      {
        pattern: /\(error:\s*Error \| unknown\)/g,
        replacement: '(error: unknown)'
      },
      {
        pattern: /\(err:\s*Error \| unknown\)/g,
        replacement: '(err: unknown)'
      }
    ];
    
    for (const { pattern, replacement } of errorPatterns) {
      if (pattern.test(content)) {
        content = content.replace(pattern, replacement);
        modified = true;
      }
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed error types in: ${file}`);
      fixedCount++;
    }
  }
  
  return fixedCount;
};

const main = async () => {
  console.log('Starting TypeScript error fixes...\n');
  
  let totalFixed = 0;
  
  // Fix router imports
  totalFixed += await fixRouterImports();
  
  // Add type definitions
  totalFixed += await fixTypeDefinitions();
  
  // Fix error types
  totalFixed += await fixErrorTypes();
  
  console.log(`\n✅ Total files fixed: ${totalFixed}`);
  console.log('Run npm run check to verify TypeScript compilation');
};

main().catch(console.error);