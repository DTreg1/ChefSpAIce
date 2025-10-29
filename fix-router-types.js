#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

const fixRouterFiles = async () => {
  console.log('Fixing all router TypeScript issues...');
  
  // Find all router files
  const routerFiles = await glob(['server/routers/*.ts'], { 
    ignore: ['**/node_modules/**'] 
  });
  
  let fixedCount = 0;
  
  for (const file of routerFiles) {
    let content = fs.readFileSync(file, 'utf8');
    let modified = false;
    
    // Fix 1: Remove duplicate imports and fix Express imports
    if (content.includes('import type { Response } from "express"')) {
      // Remove the duplicate type import line
      content = content.replace(/import type { Response } from "express";\n/g, '');
      modified = true;
    }
    
    // Fix 2: Ensure proper Express imports (Router, Request, Response, NextFunction)
    const hasRouter = content.includes('Router');
    const hasNextFunction = content.includes('NextFunction') || content.includes('next:');
    
    if (hasRouter) {
      // Replace existing express import with the full one
      const importPattern = /import\s+{[^}]+}\s+from\s+["']express["'];?/;
      const match = content.match(importPattern);
      
      if (match) {
        let newImport = 'import { Router, Request as ExpressRequest, Response as ExpressResponse';
        if (hasNextFunction) {
          newImport += ', NextFunction';
        }
        newImport += ' } from "express";';
        
        content = content.replace(importPattern, newImport);
        
        // Replace all Request with ExpressRequest, Response with ExpressResponse
        // But avoid replacing in type definitions
        content = content.replace(/\basync\s+\(req:\s+Request/g, 'async (req: ExpressRequest');
        content = content.replace(/,\s+res:\s+Response\)/g, ', res: ExpressResponse)');
        content = content.replace(/\(req:\s+Request,/g, '(req: ExpressRequest,');
        content = content.replace(/,\s+res:\s+Response,/g, ', res: ExpressResponse,');
        content = content.replace(/\basync\s+\(req:\s+Request<any, any, any, any>/g, 'async (req: ExpressRequest');
        
        modified = true;
      }
    }
    
    // Fix 3: Fix req.user access - add type assertion where needed
    if (content.includes('req.user.claims')) {
      content = content.replace(
        /const userId = req\.user\.claims\.sub;/g,
        'const userId = req.user?.claims.sub;'
      );
      
      // Add a guard check after userId declaration
      content = content.replace(
        /(const userId = req\.user\?\.claims\.sub;)/g,
        '$1\n    if (!userId) return res.status(401).json({ error: "Unauthorized" });'
      );
      
      modified = true;
    }
    
    // Fix 4: Fix req.body access for proper typing
    if (content.includes('req.body')) {
      // Ensure req.body is properly typed
      content = content.replace(
        /const validation = ([^;]+)\.safeParse\(req\.body\);/g,
        'const validation = $1.safeParse(req.body as any);'
      );
      
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(file, content);
      console.log(`Fixed: ${file}`);
      fixedCount++;
    }
  }
  
  return fixedCount;
};

const main = async () => {
  console.log('Starting comprehensive router TypeScript fixes...\n');
  
  const totalFixed = await fixRouterFiles();
  
  console.log(`\n✅ Fixed ${totalFixed} router files`);
};

main().catch(console.error);