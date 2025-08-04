/**
 * Input validation and sanitization utilities
 * Provides consistent validation across the app to prevent crashes and security issues
 */

import { logger } from './logger';

/**
 * Email validation regex - more comprehensive than basic checks
 */
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

/**
 * Sanitize string input by removing potentially harmful characters
 * @param {string} input - Raw input string
 * @param {object} options - Sanitization options
 * @returns {string} - Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
  if (typeof input !== 'string') {
    return '';
  }

  const {
    maxLength = 500,
    allowHtml = false,
    allowNewlines = true,
    trim = true,
  } = options;

  let sanitized = input;

  // Trim whitespace if requested
  if (trim) {
    sanitized = sanitized.trim();
  }

  // Remove HTML tags if not allowed
  if (!allowHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove newlines if not allowed
  if (!allowNewlines) {
    sanitized = sanitized.replace(/[\r\n]+/g, ' ');
  }

  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    logger.debug('Input truncated to maximum length:', maxLength);
  }

  // Remove null bytes and other potentially dangerous characters
  sanitized = sanitized.replace(/\0/g, '');

  return sanitized;
};

/**
 * Validate email address format
 * @param {string} email - Email to validate
 * @returns {object} - Validation result with isValid and error message
 */
export const validateEmail = (email) => {
  if (!email || typeof email !== 'string') {
    return {
      isValid: false,
      error: 'Email is required',
      sanitized: '',
    };
  }

  const sanitized = sanitizeString(email, { maxLength: 254, allowHtml: false, allowNewlines: false });
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'Email cannot be empty',
      sanitized,
    };
  }

  if (!EMAIL_REGEX.test(sanitized)) {
    return {
      isValid: false,
      error: 'Please enter a valid email address',
      sanitized,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitized: sanitized.toLowerCase(),
  };
};

/**
 * Validate activity name/title
 * @param {string} name - Activity name to validate
 * @returns {object} - Validation result
 */
export const validateActivityName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Activity name is required',
      sanitized: '',
    };
  }

  const sanitized = sanitizeString(name, { maxLength: 100, allowHtml: false });
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'Activity name cannot be empty',
      sanitized,
    };
  }

  if (sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Activity name must be at least 2 characters',
      sanitized,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitized,
  };
};

/**
 * Validate comment content
 * @param {string} content - Comment content to validate
 * @returns {object} - Validation result
 */
export const validateComment = (content) => {
  if (!content || typeof content !== 'string') {
    return {
      isValid: false,
      error: 'Comment cannot be empty',
      sanitized: '',
    };
  }

  const sanitized = sanitizeString(content, { maxLength: 500, allowHtml: false });
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'Comment cannot be empty',
      sanitized,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitized,
  };
};

/**
 * Validate user name
 * @param {string} name - User name to validate
 * @returns {object} - Validation result
 */
export const validateUserName = (name) => {
  if (!name || typeof name !== 'string') {
    return {
      isValid: false,
      error: 'Name is required',
      sanitized: '',
    };
  }

  const sanitized = sanitizeString(name, { maxLength: 50, allowHtml: false, allowNewlines: false });
  
  if (sanitized.length === 0) {
    return {
      isValid: false,
      error: 'Name cannot be empty',
      sanitized,
    };
  }

  if (sanitized.length < 2) {
    return {
      isValid: false,
      error: 'Name must be at least 2 characters',
      sanitized,
    };
  }

  // Check for valid name characters (letters, spaces, hyphens, apostrophes)
  const nameRegex = /^[a-zA-Z\s'-]+$/;
  if (!nameRegex.test(sanitized)) {
    return {
      isValid: false,
      error: 'Name can only contain letters, spaces, hyphens, and apostrophes',
      sanitized,
    };
  }

  return {
    isValid: true,
    error: null,
    sanitized,
  };
};

/**
 * Validate password strength
 * @param {string} password - Password to validate
 * @returns {object} - Validation result with strength score
 */
export const validatePassword = (password) => {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      error: 'Password is required',
      strength: 0,
    };
  }

  if (password.length < 8) {
    return {
      isValid: false,
      error: 'Password must be at least 8 characters long',
      strength: 1,
    };
  }

  if (password.length > 128) {
    return {
      isValid: false,
      error: 'Password is too long (maximum 128 characters)',
      strength: 0,
    };
  }

  let strength = 0;
  const checks = {
    length: password.length >= 8,
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /\d/.test(password),
    symbols: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
  };

  // Calculate strength score
  Object.values(checks).forEach(check => {
    if (check) strength++;
  });

  const isValid = strength >= 3; // Require at least 3 criteria

  let error = null;
  if (!isValid) {
    const missing = [];
    if (!checks.lowercase) missing.push('lowercase letter');
    if (!checks.uppercase) missing.push('uppercase letter');
    if (!checks.numbers) missing.push('number');
    if (!checks.symbols) missing.push('special character');
    
    error = `Password must contain at least 3 of: ${missing.join(', ')}`;
  }

  return {
    isValid,
    error,
    strength,
    strengthText: getPasswordStrengthText(strength),
  };
};

/**
 * Get password strength description
 * @param {number} strength - Strength score (0-5)
 * @returns {string} - Strength description
 */
const getPasswordStrengthText = (strength) => {
  switch (strength) {
    case 0:
    case 1:
      return 'Very Weak';
    case 2:
      return 'Weak';
    case 3:
      return 'Fair';
    case 4:
      return 'Good';
    case 5:
      return 'Strong';
    default:
      return 'Unknown';
  }
};

/**
 * Validate URL format
 * @param {string} url - URL to validate
 * @returns {object} - Validation result
 */
export const validateUrl = (url) => {
  if (!url || typeof url !== 'string') {
    return {
      isValid: false,
      error: 'URL is required',
      sanitized: '',
    };
  }

  const sanitized = sanitizeString(url, { maxLength: 2048, allowHtml: false, allowNewlines: false });
  
  try {
    new URL(sanitized);
    return {
      isValid: true,
      error: null,
      sanitized,
    };
  } catch {
    return {
      isValid: false,
      error: 'Please enter a valid URL',
      sanitized,
    };
  }
};

/**
 * Batch validate multiple fields
 * @param {object} fields - Object with field names as keys and values to validate
 * @param {object} validators - Object with field names as keys and validator functions as values
 * @returns {object} - Validation results for all fields
 */
export const validateFields = (fields, validators) => {
  const results = {};
  let isValid = true;

  Object.keys(fields).forEach(fieldName => {
    const validator = validators[fieldName];
    if (validator && typeof validator === 'function') {
      const result = validator(fields[fieldName]);
      results[fieldName] = result;
      if (!result.isValid) {
        isValid = false;
      }
    }
  });

  return {
    isValid,
    fields: results,
    errors: Object.keys(results).reduce((errors, fieldName) => {
      if (results[fieldName].error) {
        errors[fieldName] = results[fieldName].error;
      }
      return errors;
    }, {}),
  };
};

/**
 * Common validation rules that can be reused
 */
export const validationRules = {
  email: validateEmail,
  activityName: validateActivityName,
  comment: validateComment,
  userName: validateUserName,
  password: validatePassword,
  url: validateUrl,
};

export default {
  sanitizeString,
  validateEmail,
  validateActivityName,
  validateComment,
  validateUserName,
  validatePassword,
  validateUrl,
  validateFields,
  validationRules,
};