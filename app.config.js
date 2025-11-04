// app.config.js
import 'dotenv/config';

export default ({ config }) => ({
  ...config,
  name: "The Ledger",
  slug: "TheLedger",
  version: "1.0.0",
  orientation: "portrait",
  icon: "./assets/images/app-icon.png",
  scheme: "slipscan",
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  splash: {
    image: "./assets/images/app-icon.png",
    resizeMode: "contain",
    backgroundColor: "#007AFF"
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: "com.developer.SlipScan"
  },
  android: {
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: "com.developer.SlipScan",
    adaptiveIcon: {
      foregroundImage: "./assets/images/app-icon-foreground.png",
      backgroundColor: "#007AFF"
    }
  },
  web: {
    output: "static"
  },
  plugins: [
    "expo-router",
    "expo-dev-client",
    "expo-web-browser"
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true
  },
  extra: {
    // Environment variables from .env file
    GOOGLE_CLOUD_PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT_ID,
    GOOGLE_CLOUD_VISION_API_KEY: process.env.GOOGLE_CLOUD_VISION_API_KEY,
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    LLM_PROVIDER: process.env.LLM_PROVIDER,
    GOOGLE_GEMINI_API_KEY: process.env.GOOGLE_GEMINI_API_KEY,
    CLAUDE_API_KEY: process.env.CLAUDE_API_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    LLM_MODEL: process.env.LLM_MODEL,
    DATABASE_PROVIDER: process.env.DATABASE_PROVIDER,
    MONGODB_CONNECTION_STRING: process.env.MONGODB_CONNECTION_STRING,
    FIRESTORE_PROJECT_ID: process.env.FIRESTORE_PROJECT_ID,
    ENABLE_LOGGING: process.env.ENABLE_LOGGING,
    ENABLE_MOCK_DATA: process.env.ENABLE_MOCK_DATA,
    MAX_RETRIES: process.env.MAX_RETRIES,
    REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT,
  }
});