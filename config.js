import { API_URL as ENV_API_URL, APP_ENV, LOG_LEVEL } from '@env';

// Fallback to production URL if env variable is not set
// Remove any trailing slashes to prevent double slashes in URLs
const baseUrl = ENV_API_URL || 'https://www.heyvoxxy.com';
export const API_URL = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

// Safe environment detection with fallback to production
export const APP_ENV_VALUE = APP_ENV || 'production';
export const IS_PRODUCTION = APP_ENV_VALUE === 'production';
export const IS_DEVELOPMENT = APP_ENV_VALUE === 'development';
export const LOG_LEVEL_CONFIG = LOG_LEVEL || 'error';