declare module '@env' {
  export const API_URL: string;
  export const APP_ENV: 'development' | 'staging' | 'production';
  export const LOG_LEVEL: 'debug' | 'info' | 'warn' | 'error';
}