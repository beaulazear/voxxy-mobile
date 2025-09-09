/**
 * Safe API call wrapper to prevent crashes from network requests
 * Handles response validation, JSON parsing errors, and provides consistent error handling
 */

import { logger } from './logger';

const DEFAULT_TIMEOUT = 10000; // 10 seconds

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
    logger.debug(`[${requestId}] Full URL:`, url);
    logger.debug(`[${requestId}] Request body:`, options.body);
    
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
      // Log timeouts as debug instead of error to reduce noise in polling scenarios
      logger.debug(`[${requestId}] Request timeout (expected during polling):`, error.message);
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
    // Check for backend moderation response format
    if (error.error?.code === 'USER_SUSPENDED') {
      const suspendedUntil = error.error?.suspended_until;
      const reason = error.error?.reason || 'Policy violation';
      if (suspendedUntil) {
        return `Your account is suspended until ${new Date(suspendedUntil).toLocaleDateString()}. Reason: ${reason}`;
      }
      return `Your account has been temporarily suspended. Reason: ${reason}`;
    }
    
    // Check for suspension/ban specific messages (legacy format)
    const errorMsg = error.message?.toLowerCase() || '';
    
    if (errorMsg.includes('suspended')) {
      // Extract suspension details if available
      if (errorMsg.includes('until')) {
        return error.message; // Use the full message with suspension end date
      }
      return 'Your account has been temporarily suspended. Please check your email for more details.';
    }
    
    if (errorMsg.includes('banned')) {
      return 'Your account has been banned. Please contact support@voxxyai.com for more information.';
    }
    
    if (errorMsg.includes('not authorized') || errorMsg.includes('can_login')) {
      return 'Your account access is currently restricted. Please contact support for assistance.';
    }
    
    return 'You do not have permission to perform this action.';
  }

  // Handle 451 status code for permanent bans
  if (error.status === 451) {
    if (error.error?.code === 'USER_BANNED') {
      const reason = error.error?.reason || 'Severe policy violation';
      return `Your account has been permanently banned. Reason: ${reason}. Contact support@voxxyai.com for appeals.`;
    }
    return 'Your account has been permanently banned due to policy violations. Contact support@voxxyai.com for appeals.';
  }
  
  if (error.status === 404) {
    return 'The requested resource was not found.';
  }
  
  if (error.status === 422) {
    // Handle validation errors (like duplicate reports and content filtering)
    if (error.message?.includes('already reported') || error.message?.includes('Reporter has already')) {
      return 'You have already reported this content.';
    }
    if (error.message?.includes('inappropriate') || error.message?.includes('spam') || error.message?.includes('profanity')) {
      return 'This content violates our community guidelines. Please revise and try again.';
    }
    if (error.message?.includes('too long')) {
      return 'Your message is too long. Please shorten it.';
    }
    if (error.message?.includes('too short')) {
      return 'Your message is too short. Please add more detail.';
    }
    return error.message || 'Invalid request. Please check your input and try again.';
  }
  
  if (error.status === 429) {
    return 'Too many requests. Please wait a moment and try again.';
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

/**
 * Check if an error indicates the user is suspended or banned
 */
export const isModerationError = (error) => {
  // Check new status codes
  if (error.status === 451) return true; // Banned
  if (error.status === 403) {
    // Check for new backend format
    if (error.error?.code === 'USER_SUSPENDED' || error.error?.code === 'USER_BANNED') {
      return true;
    }
    // Check legacy format
    const errorMsg = error.message?.toLowerCase() || '';
    return errorMsg.includes('suspended') || errorMsg.includes('banned') || errorMsg.includes('can_login');
  }
  return false;
};

/**
 * Extract moderation type and details from error
 */
export const getModerationStatus = (error) => {
  // Check for 451 status (banned)
  if (error.status === 451) {
    return {
      type: 'banned',
      reason: error.error?.reason || 'Severe policy violation',
      permanent: true
    };
  }
  
  // Check for 403 status
  if (error.status === 403) {
    // New backend format
    if (error.error?.code === 'USER_BANNED') {
      return {
        type: 'banned',
        reason: error.error?.reason || 'Severe policy violation',
        permanent: true
      };
    }
    
    if (error.error?.code === 'USER_SUSPENDED') {
      return {
        type: 'suspended',
        reason: error.error?.reason || 'Policy violation',
        until: error.error?.suspended_until,
        permanent: false
      };
    }
    
    // Legacy format
    const errorMsg = error.message?.toLowerCase() || '';
    if (errorMsg.includes('banned')) {
      return { type: 'banned', permanent: true };
    }
    if (errorMsg.includes('suspended')) {
      return { type: 'suspended', permanent: false };
    }
    if (errorMsg.includes('can_login')) {
      return { type: 'restricted', permanent: false };
    }
  }
  
  return null;
};

export default safeApiCall;