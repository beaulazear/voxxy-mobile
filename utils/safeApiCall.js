/**
 * Safe API call wrapper to prevent crashes from network requests
 * Handles response validation, JSON parsing errors, and provides consistent error handling
 */

import { logger } from './logger';

// Network timeout in milliseconds
const DEFAULT_TIMEOUT = 10000; // 10 seconds

/**
 * Create a timeout promise that rejects after specified time
 */
const createTimeoutPromise = (timeout) => {
  return new Promise((_, reject) => {
    setTimeout(() => {
      reject(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  });
};

/**
 * Safe API call wrapper with comprehensive error handling
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 * @returns {Promise<object>} - Parsed JSON response or throws descriptive error
 */
export const safeApiCall = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const requestId = Math.random().toString(36).substring(7);
  
  try {
    logger.debug(`[${requestId}] API Request:`, url, options.method || 'GET');
    
    // Validate inputs
    if (!url || typeof url !== 'string') {
      throw new Error('Invalid URL provided to API call');
    }

    // Ensure headers exist
    const safeOptions = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    // Create fetch promise with timeout
    const fetchPromise = fetch(url, safeOptions);
    const timeoutPromise = createTimeoutPromise(timeout);
    
    // Race between fetch and timeout
    const response = await Promise.race([fetchPromise, timeoutPromise]);
    
    logger.debug(`[${requestId}] Response status:`, response.status);

    // Check if response is ok
    if (!response.ok) {
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      logger.error(`[${requestId}] API Error:`, errorMessage);
      
      // Try to get error details from response body
      let errorDetails = errorMessage;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          try {
            const parsedError = JSON.parse(errorBody);
            // Handle Rails errors array format
            if (parsedError.errors && Array.isArray(parsedError.errors)) {
              errorDetails = parsedError.errors.join(', ');
            } else {
              errorDetails = parsedError.error || parsedError.message || errorMessage;
            }
          } catch {
            // If JSON parsing fails, use the text as error details
            errorDetails = errorBody.substring(0, 200); // Limit error length
          }
        }
      } catch (textError) {
        logger.debug(`[${requestId}] Could not read error response body:`, textError.message);
      }
      
      const error = new Error(errorDetails);
      error.status = response.status;
      error.statusText = response.statusText;
      throw error;
    }

    // Safely parse JSON response
    let data;
    try {
      const responseText = await response.text();
      
      if (!responseText.trim()) {
        // Handle empty response
        logger.debug(`[${requestId}] Empty response received`);
        return {};
      }
      
      data = JSON.parse(responseText);
      logger.debug(`[${requestId}] API Success:`, Object.keys(data || {}).length, 'keys in response');
      
    } catch (parseError) {
      logger.error(`[${requestId}] JSON Parse Error:`, parseError.message);
      throw new Error(`Invalid JSON response from server: ${parseError.message}`);
    }

    return data;
    
  } catch (error) {
    // Enhanced error logging
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      logger.error(`[${requestId}] Network Error:`, 'Check internet connection');
      throw new Error('Network connection failed. Please check your internet connection and try again.');
    }
    
    if (error.message.includes('timeout')) {
      logger.error(`[${requestId}] Timeout Error:`, error.message);
      throw new Error('Request timed out. Please check your connection and try again.');
    }
    
    // Re-throw with request ID for debugging
    logger.error(`[${requestId}] API Call Failed:`, error.message);
    throw error;
  }
};

/**
 * Safe API call specifically for authenticated requests
 * Automatically adds authorization header and handles token validation
 */
export const safeAuthApiCall = async (url, token, options = {}, timeout = DEFAULT_TIMEOUT) => {
  if (!token) {
    throw new Error('Authentication token is required');
  }
  
  const authOptions = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
    },
  };
  
  return safeApiCall(url, authOptions, timeout);
};

/**
 * Utility for handling common API error responses
 */
export const handleApiError = (error, userMessage = 'Something went wrong. Please try again.') => {
  logger.error('Handled API Error:', error.message);
  
  // Map specific errors to user-friendly messages
  if (error.status === 401) {
    return 'Your session has expired. Please log in again.';
  }
  
  if (error.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.status >= 500) {
    return 'Server error. Please try again later.';
  }
  
  if (error.message.includes('Network connection failed')) {
    return 'Please check your internet connection and try again.';
  }
  
  if (error.message.includes('timeout')) {
    return 'Request timed out. Please try again.';
  }
  
  return userMessage;
};

export default safeApiCall;