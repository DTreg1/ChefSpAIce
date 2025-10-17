export function validateEnvironmentVariables(): void {
  const requiredVars = [
    'DATABASE_URL',
    'REPLIT_DOMAINS',
    'SESSION_SECRET',
    'REPL_ID'
  ];

  const missingVars: string[] = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error(`❌ Missing required environment variables: ${missingVars.join(', ')}`);
    console.error('Please ensure all required environment variables are set.');
    
    // Provide helpful messages for specific variables
    if (missingVars.includes('DATABASE_URL')) {
      console.error('→ DATABASE_URL: Required for database connection. Ensure database is provisioned.');
    }
    if (missingVars.includes('REPLIT_DOMAINS')) {
      console.error('→ REPLIT_DOMAINS: Required for authentication. Should be automatically set by Replit.');
    }
    if (missingVars.includes('SESSION_SECRET')) {
      console.error('→ SESSION_SECRET: Required for session encryption. Add a secure secret key.');
    }
    if (missingVars.includes('REPL_ID')) {
      console.error('→ REPL_ID: Required for authentication. Should be automatically set by Replit.');
    }
    
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Warn about optional but recommended variables
  const optionalVars = [
    { name: 'AI_INTEGRATIONS_OPENAI_API_KEY', feature: 'AI chat features' },
    { name: 'BARCODE_LOOKUP_API_KEY', feature: 'Barcode scanning' },
    { name: 'PRIVATE_OBJECT_DIR', feature: 'Object storage' },
    { name: 'STRIPE_SECRET_KEY', feature: 'Payment processing' }
  ];
  
  const missingOptional: string[] = [];
  
  for (const { name, feature } of optionalVars) {
    if (!process.env[name]) {
      missingOptional.push(`${name} (${feature})`);
    }
  }
  
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Optional environment variables not set (some features may be disabled):`);
    missingOptional.forEach(varInfo => {
      console.warn(`   - ${varInfo}`);
    });
  }
  
  console.log('✅ Environment variables validated successfully');
}