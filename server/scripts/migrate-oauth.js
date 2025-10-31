#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

// Define the router files that need updating
const routerFiles = [
  'auth.router.ts',
  'recipes.router.ts',
  'unified-inventory.router.ts',
  'ai-assistant.router.ts',
  'nutrition.router.ts',
  'voice-commands.router.ts',
  'email-drafting.router.ts',
  'meal-planning.router.ts',
  'writing-assistant.router.ts',
  'appliances.router.ts',
  'push-tokens.router.ts',
  'chat-stream.router.ts',
  'feedback.router.ts',
  'notifications.router.ts',
  'inventory.router.ts'
];

const routersPath = path.join(__dirname, '../routers');

// Process each router file
routerFiles.forEach(fileName => {
  const filePath = path.join(routersPath, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${fileName}`);
    return;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  let modified = false;
  
  // Replace import statement if it's from replitAuth
  if (content.includes('import { isAuthenticated } from "../replitAuth"')) {
    content = content.replace(
      'import { isAuthenticated } from "../replitAuth"',
      '// Use OAuth authentication middleware\nimport { isAuthenticated } from "../auth/oauth"'
    );
    modified = true;
  }
  
  // Replace all instances of req.user?.claims.sub with (req.user as any)?.id
  const oldPattern = /req\.user\?\.claims\.sub/g;
  if (oldPattern.test(content)) {
    content = content.replace(oldPattern, '(req.user as any)?.id');
    modified = true;
  }
  
  // Replace all instances of req.user.claims.sub with (req.user as any).id
  const oldPattern2 = /req\.user\.claims\.sub/g;
  if (oldPattern2.test(content)) {
    content = content.replace(oldPattern2, '(req.user as any).id');
    modified = true;
  }
  
  if (modified) {
    fs.writeFileSync(filePath, content);
    console.log(`✅ Updated ${fileName}`);
  } else {
    console.log(`⏭️  No changes needed for ${fileName}`);
  }
});

console.log('\n✅ OAuth migration script completed!');