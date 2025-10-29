/**
 * Environment Configuration for SlipScan
 * 
 * This file manages all API keys and configuration in a secure, centralized manner.
 * 
 * IMPORTANT: Never commit API keys to version control!
 * 
 * For production deployment:
 * 1. Create environment variables in your deployment platform
 * 2. Use expo-constants to access environment variables
 * 3. Consider using expo-secure-store for sensitive keys
 */

import Constants from 'expo-constants';
// Note: Service account support requires the JSON file to be imported directly

export interface APIConfiguration {
  // Google Cloud APIs
  googleCloud: {
    projectId: string;
    apiKey?: string;
    serviceAccountPath?: string;
    serviceAccountKey?: string;
    clientEmail?: string;
    visionApiUrl: string;
  };
  
  // LLM APIs
  llm: {
    provider: 'claude' | 'gemini' | 'openai';
    apiKey: string;
    apiUrl: string;
    model: string;
  };
  
  // Database Configuration
  database: {
    provider: 'firestore' | 'mongodb' | 'asyncstorage';
    connectionString?: string;
    projectId?: string;
  };
  
  // App Configuration
  app: {
    enableLogging: boolean;
    enableMockData: boolean;
    maxRetries: number;
    requestTimeout: number;
  };
}

/**
 * Load configuration from environment variables
 * Falls back to development defaults if environment variables are not set
 */
function loadConfiguration(): APIConfiguration {
  const extra = Constants.expoConfig?.extra || {};
  
  return {
    googleCloud: {
      projectId: extra.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID || 'your-project-id',
      apiKey: extra.GOOGLE_CLOUD_VISION_API_KEY || process.env.GOOGLE_CLOUD_VISION_API_KEY || '',
      serviceAccountPath: extra.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS || '',
      visionApiUrl: 'https://vision.googleapis.com/v1',
    },
    
    llm: {
      provider: (extra.LLM_PROVIDER || process.env.LLM_PROVIDER || 'gemini') as 'claude' | 'gemini' | 'openai',
      apiKey: getProviderApiKey(extra, process.env),
      apiUrl: getLLMApiUrl(extra.LLM_PROVIDER || process.env.LLM_PROVIDER || 'gemini'),
      model: extra.LLM_MODEL || process.env.LLM_MODEL || getDefaultModel(extra.LLM_PROVIDER || process.env.LLM_PROVIDER || 'gemini'),
    },
    
    database: {
      provider: (extra.DATABASE_PROVIDER || process.env.DATABASE_PROVIDER || 'asyncstorage') as 'firestore' | 'mongodb' | 'asyncstorage',
      connectionString: extra.MONGODB_CONNECTION_STRING || process.env.MONGODB_CONNECTION_STRING,
      projectId: extra.FIRESTORE_PROJECT_ID || process.env.FIRESTORE_PROJECT_ID || extra.GOOGLE_CLOUD_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT_ID,
    },
    
    app: {
      enableLogging: (extra.ENABLE_LOGGING || process.env.ENABLE_LOGGING || 'true') === 'true',
      enableMockData: (extra.ENABLE_MOCK_DATA || process.env.ENABLE_MOCK_DATA || 'false') === 'true',
      maxRetries: parseInt(extra.MAX_RETRIES || process.env.MAX_RETRIES || '3'),
      requestTimeout: parseInt(extra.REQUEST_TIMEOUT || process.env.REQUEST_TIMEOUT || '30000'),
    },
  };
}

/**
 * Load service account credentials from JSON file
 */
// Import service account credentials statically to avoid dynamic require issues
let serviceAccountCredentials: {
  clientEmail: string;
  privateKey: string;
} | null = null;

try {
  // Import the service account JSON file directly
  const serviceAccount = require('../google-service-account.json');
  serviceAccountCredentials = {
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key,
  };
} catch (error) {
  console.warn('Service account credentials not found or invalid');
}

/**
 * Generate OAuth2 access token for service account
 */
async function generateAccessToken(credentials: { clientEmail: string; privateKey: string }): Promise<string | null> {
  try {
    // For React Native, we'll need to implement JWT signing differently
    // This is a simplified approach - in production you might want to use a JWT library
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT'
    };
    
    const payload = {
      iss: credentials.clientEmail,
      scope: 'https://www.googleapis.com/auth/cloud-platform',
      aud: 'https://oauth2.googleapis.com/token',
      exp: now + 3600, // 1 hour
      iat: now
    };
    
    // For now, we'll return a placeholder
    // In a full implementation, you'd need to sign this JWT with the private key
    console.warn('Service account authentication requires JWT signing - using fallback');
    return null;
  } catch (error) {
    console.error('Failed to generate access token:', error);
    return null;
  }
}

function getProviderApiKey(extra: any, env: any): string {
  const provider = extra.LLM_PROVIDER || env.LLM_PROVIDER || 'gemini';
  
  switch (provider) {
    case 'claude':
      return extra.ANTHROPIC_API_KEY || env.ANTHROPIC_API_KEY || '';
    case 'gemini':
      return extra.GOOGLE_GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || '';
    case 'openai':
      return extra.OPENAI_API_KEY || env.OPENAI_API_KEY || '';
    default:
      return extra.GOOGLE_GEMINI_API_KEY || env.GOOGLE_GEMINI_API_KEY || '';
  }
}

function getLLMApiUrl(provider: string): string {
  switch (provider) {
    case 'claude':
      return 'https://api.anthropic.com/v1';
    case 'gemini':
      return 'https://generativelanguage.googleapis.com/v1beta';
    case 'openai':
      return 'https://api.openai.com/v1';
    default:
      return 'https://generativelanguage.googleapis.com/v1beta';
  }
}

function getDefaultModel(provider: string): string {
  switch (provider) {
    case 'claude':
      return 'claude-3-haiku-20240307';
    case 'gemini':
      return 'gemini-1.5-flash';  // Updated to current available model
    case 'openai':
      return 'gpt-4o-mini';
    default:
      return 'claude-3-haiku-20240307';
  }
}

/**
 * Validate that all required API keys are present
 */
export function validateConfiguration(config: APIConfiguration): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!config.googleCloud.projectId || config.googleCloud.projectId === 'your-project-id') {
    errors.push('Google Cloud Project ID is required');
  }
  
  if (!config.googleCloud.apiKey && !config.googleCloud.serviceAccountPath) {
    errors.push('Google Cloud Vision API Key is required (or enable mock data for testing)');
  }
  
  if (!config.llm.apiKey) {
    errors.push('LLM API Key is required');
  }
  
  if (config.database.provider === 'mongodb' && !config.database.connectionString) {
    errors.push('MongoDB connection string is required when using MongoDB');
  }
  
  if (config.database.provider === 'firestore' && !config.database.projectId) {
    errors.push('Firestore Project ID is required when using Firestore');
  }
  
  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Get the current configuration
 * Throws an error if configuration is invalid in production
 */
export function getConfig(): APIConfiguration {
  const config = loadConfiguration();
  const validation = validateConfiguration(config);
  
  if (!validation.isValid && !config.app.enableMockData) {
    console.error('Configuration validation failed:', validation.errors);
    if (!__DEV__) {
      throw new Error(`Configuration validation failed: ${validation.errors.join(', ')}`);
    }
  }
  
  if (config.app.enableLogging) {
    console.log('📋 Configuration loaded:', {
      googleCloudProjectId: config.googleCloud.projectId,
      llmProvider: config.llm.provider,
      databaseProvider: config.database.provider,
      hasGoogleCloudApiKey: !!config.googleCloud.apiKey,
      hasLLMApiKey: !!config.llm.apiKey,
      enableMockData: config.app.enableMockData,
    });
  }
  
  return config;
}

export default getConfig;