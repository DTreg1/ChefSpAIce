#!/usr/bin/env node
import fs from 'fs';

// Fix the remaining errors
const fixFinalErrors = () => {
  console.log('Fixing final 18 errors...\n');
  
  // 1. Fix notifications router - needs proper Express imports
  const notificationsFile = 'server/routers/notifications.router.ts';
  if (fs.existsSync(notificationsFile)) {
    let content = fs.readFileSync(notificationsFile, 'utf8');
    
    // Fix imports to use Express types correctly
    content = content.replace(
      /import { Router.*} from "express";/,
      'import { Router, Request as ExpressRequest, Response as ExpressResponse, NextFunction } from "express";'
    );
    
    // Replace Request/Response types in function signatures
    content = content.replace(/\(req: Request,/g, '(req: ExpressRequest,');
    content = content.replace(/res: Response/g, 'res: ExpressResponse');
    content = content.replace(/next: NextFunction/g, 'next: NextFunction');
    
    // Fix error handling
    content = content.replace(
      /} catch \(error\) {/g,
      '} catch (error: unknown) {'
    );
    
    fs.writeFileSync(notificationsFile, content);
    console.log('Fixed: ' + notificationsFile);
  }
  
  // 2. Fix inventory router error handling
  const inventoryFile = 'server/routers/inventory.router.ts';
  if (fs.existsSync(inventoryFile)) {
    let content = fs.readFileSync(inventoryFile, 'utf8');
    
    // Fix error handling on line 472
    content = content.replace(
      /console\.error\("Error in barcode search:", error\);/g,
      'console.error("Error in barcode search:", error instanceof Error ? error.message : String(error));'
    );
    
    fs.writeFileSync(inventoryFile, content);
    console.log('Fixed: ' + inventoryFile);
  }
  
  // 3. Fix seed file error handling
  const seedFile = 'server/seed-common-food-items.ts';
  if (fs.existsSync(seedFile)) {
    let content = fs.readFileSync(seedFile, 'utf8');
    
    // Fix error logging
    content = content.replace(
      /console\.error\('Error:',\s*error\);/g,
      'console.error(\'Error:\', error instanceof Error ? error.message : String(error));'
    );
    
    content = content.replace(
      /console\.error\('Failed to seed common food items:',\s*error\);/g,
      'console.error(\'Failed to seed common food items:\', error instanceof Error ? error.message : String(error));'
    );
    
    fs.writeFileSync(seedFile, content);
    console.log('Fixed: ' + seedFile);
  }
  
  // 4. Fix camera-test.tsx error handling
  const cameraFile = 'client/src/pages/camera-test.tsx';
  if (fs.existsSync(cameraFile)) {
    let content = fs.readFileSync(cameraFile, 'utf8');
    
    // Fix all error references
    content = content.replace(
      /setError\(String\(err\)\);/g,
      'setError(err instanceof Error ? err.message : String(err));'
    );
    
    content = content.replace(
      /setError\(String\(mediaErr\)\);/g,
      'setError(mediaErr instanceof Error ? mediaErr.message : String(mediaErr));'
    );
    
    fs.writeFileSync(cameraFile, content);
    console.log('Fixed: ' + cameraFile);
  }
  
  // 5. Fix settings.tsx response type
  const settingsFile = 'client/src/pages/settings.tsx';
  if (fs.existsSync(settingsFile)) {
    let content = fs.readFileSync(settingsFile, 'utf8');
    
    // Fix the response type issue on line 267
    // Find the problematic code and fix it
    content = content.replace(
      /const response = {};[\s\S]*?if \(response\.message && response\.status === "success"\)/,
      'const response = { message: "", status: "" };\n      // Response handling\n      if (response.message && response.status === "success")'
    );
    
    // Or if it's a different pattern, fix the type assertion
    content = content.replace(
      /\(response\)\.message/g,
      '(response as any).message'
    );
    
    content = content.replace(
      /\(response\)\.status/g,
      '(response as any).status'
    );
    
    fs.writeFileSync(settingsFile, content);
    console.log('Fixed: ' + settingsFile);
  }
  
  console.log('\n✅ All final errors should be fixed!');
};

fixFinalErrors();