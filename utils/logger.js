/**
 * Production-ready logger utility
 * Respects LOG_LEVEL environment variable
 */

import { LOG_LEVEL_CONFIG, IS_PRODUCTION } from '../config';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const currentLogLevel = LOG_LEVELS[LOG_LEVEL_CONFIG] || LOG_LEVELS.error;

export const logger = {
  /**
   * Log debug messages
   * @param {...any} args - Arguments to log
   */
  debug: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.debug) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Log info messages
   * @param {...any} args - Arguments to log
   */
  info: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.info) {
      // eslint-disable-next-line no-console
      console.log('[INFO]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Log warning messages
   * @param {...any} args - Arguments to log
   */
  warn: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.warn) {
      // eslint-disable-next-line no-console
      console.warn('[WARN]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Log error messages
   * @param {...any} args - Arguments to log
   */
  error: (...args) => {
    if (currentLogLevel <= LOG_LEVELS.error) {
      // eslint-disable-next-line no-console
      console.error('[ERROR]', new Date().toISOString(), ...args);
    }
  },

  /**
   * Log messages with custom prefix
   * @param {string} prefix - Custom prefix for the log
   * @param {...any} args - Arguments to log
   */
  log: (prefix, ...args) => {
    if (currentLogLevel <= LOG_LEVELS.info) {
      // eslint-disable-next-line no-console
      console.log(`[${prefix}]`, new Date().toISOString(), ...args);
    }
  },

  /**
   * Disable all console methods in production
   */
  disableConsoleInProduction: () => {
    if (IS_PRODUCTION) {
      // eslint-disable-next-line no-console
      console.log = () => {};
      // eslint-disable-next-line no-console
      console.info = () => {};
      // eslint-disable-next-line no-console
      console.warn = () => {};
      // eslint-disable-next-line no-console
      console.debug = () => {};
      // Keep console.error for critical issues
    }
  }
};

export default logger;