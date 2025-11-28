/**
 * Environment Variable Validator
 * 
 * Validates required and optional environment variables at startup.
 * Ensures no sensitive defaults are used in production.
 */

interface EnvVarConfig {
  name: string;
  required: boolean;
  sensitive?: boolean;
  description?: string;
  validator?: (value: string) => boolean;
  defaultValue?: string; // Only for non-sensitive variables
}

/**
 * Environment variable configurations grouped by service
 */
const ENV_CONFIGS: Record<string, EnvVarConfig[]> = {
  core: [
    {
      name: 'PORT',
      required: false,
      description: 'Server port',
      defaultValue: '5000',
      validator: (val) => !isNaN(parseInt(val))
    },
    {
      name: 'NODE_ENV',
      required: false,
      description: 'Node environment',
      defaultValue: 'development',
      validator: (val) => ['development', 'production', 'test'].includes(val)
    },
    {
      name: 'SESSION_SECRET',
      required: true,
      sensitive: true,
      description: 'Session encryption secret (min 32 characters)',
      validator: (val) => val.length >= 32
    }
  ],
  database: [
    {
      name: 'DATABASE_URL',
      required: false,
      sensitive: true,
      description: 'PostgreSQL connection string'
    }
  ],
  oauth: [
    {
      name: 'GOOGLE_CLIENT_ID',
      required: false,
      sensitive: true,
      description: 'Google OAuth client ID'
    },
    {
      name: 'GOOGLE_CLIENT_SECRET',
      required: false,
      sensitive: true,
      description: 'Google OAuth client secret'
    },
    {
      name: 'GITHUB_CLIENT_ID',
      required: false,
      sensitive: true,
      description: 'GitHub OAuth client ID'
    },
    {
      name: 'GITHUB_CLIENT_SECRET',
      required: false,
      sensitive: true,
      description: 'GitHub OAuth client secret'
    },
    {
      name: 'TWITTER_CLIENT_ID',
      required: false,
      sensitive: true,
      description: 'Twitter/X OAuth 2.0 client ID'
    },
    {
      name: 'TWITTER_CLIENT_SECRET',
      required: false,
      sensitive: true,
      description: 'Twitter/X OAuth 2.0 client secret'
    },
    {
      name: 'APPLE_CLIENT_ID',
      required: false,
      sensitive: true,
      description: 'Apple OAuth client ID'
    },
    {
      name: 'APPLE_TEAM_ID',
      required: false,
      sensitive: true,
      description: 'Apple developer team ID'
    },
    {
      name: 'APPLE_KEY_ID',
      required: false,
      sensitive: true,
      description: 'Apple OAuth key ID'
    },
    {
      name: 'APPLE_PRIVATE_KEY',
      required: false,
      sensitive: true,
      description: 'Apple OAuth private key'
    },
    {
      name: 'REPLIT_CLIENT_ID',
      required: false,
      sensitive: true,
      description: 'Replit OAuth client ID'
    },
    {
      name: 'REPLIT_CLIENT_SECRET',
      required: false,
      sensitive: true,
      description: 'Replit OAuth client secret'
    }
  ],
  ai: [
    {
      name: 'OPENAI_API_KEY',
      required: false,
      sensitive: true,
      description: 'OpenAI API key for chat features'
    },
    {
      name: 'AI_INTEGRATIONS_OPENAI_API_KEY',
      required: false,
      sensitive: true,
      description: 'OpenAI API key via Replit AI integrations'
    },
    {
      name: 'AI_INTEGRATIONS_OPENAI_BASE_URL',
      required: false,
      description: 'OpenAI base URL for Replit AI integrations'
    }
  ],
  storage: [
    {
      name: 'PUBLIC_OBJECT_SEARCH_PATHS',
      required: false,
      description: 'Public object storage paths'
    },
    {
      name: 'PRIVATE_OBJECT_DIR',
      required: false,
      description: 'Private object storage directory'
    }
  ],
  stripe: [
    {
      name: 'STRIPE_SECRET_KEY',
      required: false,
      sensitive: true,
      description: 'Stripe secret key for payments'
    },
    {
      name: 'STRIPE_WEBHOOK_SECRET',
      required: false,
      sensitive: true,
      description: 'Stripe webhook endpoint secret'
    }
  ],
  push: [
    {
      name: 'FCM_PROJECT_ID',
      required: false,
      description: 'Firebase Cloud Messaging project ID'
    },
    {
      name: 'FCM_PRIVATE_KEY',
      required: false,
      sensitive: true,
      description: 'Firebase service account private key'
    },
    {
      name: 'FCM_CLIENT_EMAIL',
      required: false,
      description: 'Firebase service account email'
    },
    {
      name: 'APNS_KEY_ID',
      required: false,
      sensitive: true,
      description: 'Apple Push Notification key ID'
    },
    {
      name: 'APNS_TEAM_ID',
      required: false,
      description: 'Apple Push Notification team ID'
    },
    {
      name: 'APNS_BUNDLE_ID',
      required: false,
      description: 'iOS app bundle identifier'
    },
    {
      name: 'APNS_KEY_PATH',
      required: false,
      description: 'Path to Apple Push Notification key file'
    },
    {
      name: 'VAPID_PUBLIC_KEY',
      required: false,
      sensitive: false,
      description: 'VAPID public key for web push'
    },
    {
      name: 'VAPID_PRIVATE_KEY',
      required: false,
      sensitive: true,
      description: 'VAPID private key for web push'
    }
  ],
  twilio: [
    {
      name: 'TWILIO_ACCOUNT_SID',
      required: false,
      sensitive: true,
      description: 'Twilio account SID'
    },
    {
      name: 'TWILIO_AUTH_TOKEN',
      required: false,
      sensitive: true,
      description: 'Twilio auth token'
    },
    {
      name: 'TWILIO_PHONE_NUMBER',
      required: false,
      description: 'Twilio phone number for SMS'
    }
  ]
};

/**
 * Validation result for an environment variable
 */
interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
}

/**
 * Validates all environment variables
 */
export function validateEnvironment(): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    missingRequired: [],
    missingOptional: []
  };

  const isProduction = process.env.NODE_ENV === 'production';

  for (const [category, configs] of Object.entries(ENV_CONFIGS)) {
    for (const config of configs) {
      const value = process.env[config.name];

      // Check if variable exists
      if (!value || value.trim() === '') {
        if (config.required) {
          result.valid = false;
          result.errors.push(`Missing required environment variable: ${config.name} (${config.description || category})`);
          result.missingRequired.push(config.name);
        } else {
          // Apply default value for non-sensitive optional variables
          if (!config.sensitive && config.defaultValue !== undefined) {
            process.env[config.name] = config.defaultValue;
          } else {
            result.missingOptional.push(config.name);
          }
        }
        continue;
      }

      // Check for placeholder values in production
      if (isProduction && config.sensitive) {
        const lowerValue = value.toLowerCase();
        if (lowerValue.includes('placeholder') || 
            lowerValue.includes('not-needed') ||
            lowerValue === 'test' ||
            lowerValue === 'demo') {
          result.valid = false;
          result.errors.push(`Invalid placeholder value for ${config.name} in production`);
        }
      }

      // Run custom validator if provided
      if (config.validator && !config.validator(value)) {
        result.valid = false;
        result.errors.push(`Invalid value for ${config.name}: ${config.description || 'validation failed'}`);
      }
    }
  }

  // Generate warnings for missing optional sensitive variables
  if (result.missingOptional.length > 0) {
    const sensitiveOptional = result.missingOptional.filter(name => 
      Object.values(ENV_CONFIGS).some(configs => 
        configs.find(c => c.name === name && c.sensitive)
      )
    );
    
    if (sensitiveOptional.length > 0) {
      result.warnings.push(`Optional sensitive variables not configured: ${sensitiveOptional.join(', ')}`);
    }
  }

  return result;
}

/**
 * Get a safe environment variable value
 * Returns undefined for sensitive variables that are not properly configured
 */
export function getSafeEnvVar(name: string): string | undefined {
  const value = process.env[name];
  
  if (!value) return undefined;
  
  // Check if this is a sensitive variable
  const config = Object.values(ENV_CONFIGS)
    .flat()
    .find(c => c.name === name);
  
  if (config?.sensitive) {
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('placeholder') || 
        lowerValue.includes('not-needed') ||
        lowerValue === 'test' ||
        lowerValue === 'demo' ||
        value === '') {
      return undefined;
    }
  }
  
  return value;
}

/**
 * Initialize environment validation
 * Should be called at application startup
 */
export function initializeEnvironment(): void {
  console.log('🔧 Validating environment variables...');
  
  const validation = validateEnvironment();
  
  if (!validation.valid) {
    console.error('❌ Environment validation failed:');
    validation.errors.forEach(error => console.error(`   - ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      console.error('\n⚠️  Cannot start application in production with invalid environment');
      process.exit(1);
    } else {
      console.warn('\n⚠️  Running in development mode with missing configuration');
      console.warn('   Some features may not work properly');
    }
  } else {
    console.log('✅ Environment validation passed');
  }
  
  if (validation.warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    validation.warnings.forEach(warning => console.warn(`   - ${warning}`));
  }
  
  // Log configured services (without exposing sensitive values)
  const configuredServices: string[] = [];
  
  if (getSafeEnvVar('GOOGLE_CLIENT_ID')) configuredServices.push('Google OAuth');
  if (getSafeEnvVar('GITHUB_CLIENT_ID')) configuredServices.push('GitHub OAuth');
  if (getSafeEnvVar('TWITTER_CLIENT_ID')) configuredServices.push('Twitter/X OAuth');
  if (getSafeEnvVar('APPLE_CLIENT_ID')) configuredServices.push('Apple OAuth');
  if (getSafeEnvVar('REPLIT_CLIENT_ID') || process.env.REPLIT_DOMAINS) configuredServices.push('Replit OAuth');
  if (getSafeEnvVar('OPENAI_API_KEY') || getSafeEnvVar('AI_INTEGRATIONS_OPENAI_API_KEY')) configuredServices.push('OpenAI');
  if (getSafeEnvVar('STRIPE_SECRET_KEY')) configuredServices.push('Stripe');
  if (getSafeEnvVar('TWILIO_ACCOUNT_SID')) configuredServices.push('Twilio');
  if (getSafeEnvVar('FCM_PROJECT_ID')) configuredServices.push('Firebase Push');
  if (getSafeEnvVar('VAPID_PUBLIC_KEY')) configuredServices.push('Web Push');
  if (getSafeEnvVar('APNS_KEY_ID')) configuredServices.push('Apple Push');
  
  if (configuredServices.length > 0) {
    console.log(`📦 Configured services: ${configuredServices.join(', ')}`);
  }
}