import dotenv from 'dotenv';
import path from 'path';

// Ensure .env.local and .env are parsed and loaded into process.env for Node.js serverless functions
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

export interface WhatsAppConfig {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string;
  apiVersion: string;
  graphApiBaseUrl: string;
  appPublicUrl: string;
}

export function getWhatsAppConfig(): WhatsAppConfig {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || '';
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
  const wabaId = process.env.WHATSAPP_WABA_ID || '';
  const apiVersion = process.env.META_GRAPH_API_VERSION || 'v25.0';
  const appPublicUrl = process.env.APP_PUBLIC_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

  const graphApiBaseUrl = `https://graph.facebook.com/${apiVersion}/${phoneNumberId}/messages`;

  return {
    accessToken,
    phoneNumberId,
    wabaId,
    apiVersion,
    graphApiBaseUrl,
    appPublicUrl
  };
}

export function validateWhatsAppConfig(): { isValid: boolean; errors: string[] } {
  const config = getWhatsAppConfig();
  const errors: string[] = [];

  if (!config.accessToken || !config.accessToken.trim()) {
    errors.push('WHATSAPP_ACCESS_TOKEN is missing or empty.');
  }

  if (!config.phoneNumberId || !config.phoneNumberId.trim()) {
    errors.push('WHATSAPP_PHONE_NUMBER_ID is missing or empty.');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

let startupLogged = false;

export function logStartupHealthCheck() {
  if (startupLogged) return;
  startupLogged = true;

  const validation = validateWhatsAppConfig();
  if (validation.isValid) {
    console.log('✓ Meta WhatsApp Cloud API credentials loaded');
  } else {
    console.warn('⚠ WhatsApp Cloud API not configured. Missing:');
    validation.errors.forEach(err => console.warn(`  - ${err}`));
  }
}

export function getWhatsAppHealthStatus(): Record<string, any> {
  const validation = validateWhatsAppConfig();
  const config = getWhatsAppConfig();

  return {
    status: validation.isValid ? 'configured' : 'unconfigured',
    whatsappConfigured: validation.isValid,
    graphApiVersion: config.apiVersion,
    environment: process.env.NODE_ENV === 'production' ? 'production' : 'development',
    provider: 'Meta WhatsApp Business Cloud API',
    hasAccessToken: Boolean(config.accessToken && config.accessToken.trim()),
    hasPhoneNumberId: Boolean(config.phoneNumberId && config.phoneNumberId.trim()),
    hasWabaId: Boolean(config.wabaId && config.wabaId.trim()),
    appPublicUrl: config.appPublicUrl,
    cwd: process.cwd(),
    envFileLoaded: Boolean(process.env.WHATSAPP_ACCESS_TOKEN || process.env.DATABASE_URL),
    timestamp: new Date().toISOString()
  };
}
