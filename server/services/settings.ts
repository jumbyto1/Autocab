// Settings Service - Handles API key and configuration management
// Provides secure access to environment variables and credential storage

interface Settings {
  googleMapsApiKey?: string;
  autocabApiKey?: string;
  autocabBaseUrl?: string;
  gmailClientId?: string;
  gmailClientSecret?: string;
  gmailRedirectUri?: string;
}

// Get Google Maps API Key
export function getGoogleMapsApiKey(): string | undefined {
  return process.env.GOOGLE_MAPS_API_KEY;
}

// Get Autocab API Key
export function getAutocabApiKey(): string | undefined {
  return process.env.AUTOCAB_API_KEY;
}

// Get Gmail Client ID
export function getGmailClientId(): string | undefined {
  return process.env.GMAIL_CLIENT_ID;
}

// Get Gmail Client Secret
export function getGmailClientSecret(): string | undefined {
  return process.env.GMAIL_CLIENT_SECRET;
}

// Get Gmail Redirect URI
export function getGmailRedirectUri(): string | undefined {
  return process.env.GMAIL_REDIRECT_URI;
}

// Save settings to environment variables
export function saveSettings(settings: Settings): void {
  if (settings.googleMapsApiKey !== undefined) {
    process.env.GOOGLE_MAPS_API_KEY = settings.googleMapsApiKey;
  }
  
  if (settings.autocabApiKey !== undefined) {
    process.env.AUTOCAB_API_KEY = settings.autocabApiKey;
  }
  
  if (settings.autocabBaseUrl !== undefined) {
    process.env.AUTOCAB_BASE_URL = settings.autocabBaseUrl;
  }
  
  if (settings.gmailClientId !== undefined) {
    process.env.GMAIL_CLIENT_ID = settings.gmailClientId;
  }
  
  if (settings.gmailClientSecret !== undefined) {
    process.env.GMAIL_CLIENT_SECRET = settings.gmailClientSecret;
  }
  
  if (settings.gmailRedirectUri !== undefined) {
    process.env.GMAIL_REDIRECT_URI = settings.gmailRedirectUri;
  }
}

// Get all current settings (for display purposes)
export function getAllSettings(): Settings {
  return {
    googleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY ? "••••••••••••••••••••••••••••••••••••••••••••••" : "",
    autocabApiKey: process.env.AUTOCAB_API_KEY ? "••••••••••••••••••••••••••••••••••••••••••••••" : "",
    autocabBaseUrl: process.env.AUTOCAB_BASE_URL || "https://autocab-api.azure-api.net",
    gmailClientId: process.env.GMAIL_CLIENT_ID || "",
    gmailClientSecret: process.env.GMAIL_CLIENT_SECRET ? "••••••••••••••••••••••••••••••••••••••••••••••" : "",
    gmailRedirectUri: process.env.GMAIL_REDIRECT_URI || "https://782b30a1-37e6-4f04-acd8-d824def9b200-00-6cs7t0yzcbm4.worf.replit.dev/api/gmail/callback"
  };
}

// Check if Gmail credentials are fully configured
export function isGmailConfigured(): boolean {
  return !!(process.env.GMAIL_CLIENT_ID && 
           process.env.GMAIL_CLIENT_SECRET && 
           process.env.GMAIL_REDIRECT_URI);
}

// Check if Autocab API is configured
export function isAutocabConfigured(): boolean {
  return !!(process.env.AUTOCAB_API_KEY);
}

// Check if Google Maps API is configured
export function isGoogleMapsConfigured(): boolean {
  return !!(process.env.GOOGLE_MAPS_API_KEY);
}