import { API_URL as ENV_API_URL, APP_ENV, LOG_LEVEL } from '@env';

// Fallback to production URL if env variable is not set
export const API_URL = ENV_API_URL || 'https://www.voxxyai.com/';
export const IS_PRODUCTION = APP_ENV === 'production';
export const IS_DEVELOPMENT = APP_ENV === 'development';
export const LOG_LEVEL_CONFIG = LOG_LEVEL || 'error';