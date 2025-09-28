import { API_URL as ENV_API_URL, APP_ENV, LOG_LEVEL } from '@env';

// Fallback to production URL if env variable is not set
// Remove any trailing slashes to prevent double slashes in URLs
const baseUrl = ENV_API_URL || 'https://www.heyvoxxy.com';
export const API_URL = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_DEVELOPMENT = APP_ENV === 'development';
export const LOG_LEVEL_CONFIG = LOG_LEVEL || 'error';