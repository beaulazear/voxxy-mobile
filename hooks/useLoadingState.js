/**
 * Custom hook for managing loading states across the application
 * Provides consistent loading state management with error handling
 */

import React, { useState, useCallback, useRef } from 'react';
import { logger } from '../utils/logger';

/**
 * Hook for managing loading states with error handling
 * @param {string} operationName - Name of the operation for logging
 * @returns {object} - Loading state and control functions
 */
export const useLoadingState = (operationName = 'operation') => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Execute an async operation with loading state management
   * @param {function} asyncOperation - Async function to execute
   * @param {object} options - Options for execution
   * @returns {Promise} - Promise that resolves with operation result
   */
  const execute = useCallback(async (asyncOperation, options = {}) => {
    const {
      onSuccess,
      onError,
      resetErrorOnStart = true,
      logErrors = true,
    } = options;

    if (typeof asyncOperation !== 'function') {
      throw new Error('asyncOperation must be a function');
    }

    // Reset error state if requested
    if (resetErrorOnStart && isMountedRef.current) {
      setError(null);
    }

    // Set loading state if component is still mounted
    if (isMountedRef.current) {
      setIsLoading(true);
      logger.debug(`Starting ${operationName}`);
    }

    try {
      const result = await asyncOperation();
      
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
        setLastUpdated(new Date());
        logger.debug(`${operationName} completed successfully`);
        
        if (onSuccess) {
          onSuccess(result);
        }
      }

      return result;
    } catch (err) {
      // Only update state if component is still mounted
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(err);
        setLastUpdated(new Date());
        
        if (logErrors) {
          logger.error(`${operationName} failed:`, err.message);
        }
        
        if (onError) {
          onError(err);
        }
      }

      throw err; // Re-throw so caller can handle if needed
    }
  }, [operationName]);

  /**
   * Reset all states to initial values
   */
  const reset = useCallback(() => {
    if (isMountedRef.current) {
      setIsLoading(false);
      setError(null);
      setLastUpdated(null);
      logger.debug(`${operationName} state reset`);
    }
  }, [operationName]);

  /**
   * Set loading state manually
   */
  const setLoadingState = useCallback((loading) => {
    if (isMountedRef.current) {
      setIsLoading(loading);
    }
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    if (isMountedRef.current) {
      setError(null);
    }
  }, []);

  return {
    isLoading,
    error,
    lastUpdated,
    execute,
    reset,
    setLoading: setLoadingState,
    clearError,
    // Helper computed properties
    hasError: error !== null,
    isIdle: !isLoading && error === null,
    isComplete: !isLoading && lastUpdated !== null,
  };
};

/**
 * Hook for managing multiple loading states
 * Useful when a component has multiple async operations
 */
export const useMultipleLoadingStates = (operations = {}) => {
  const loadingStates = {};
  
  Object.keys(operations).forEach(key => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    loadingStates[key] = useLoadingState(operations[key] || key);
  });

  // Helper to check if any operation is loading
  const isAnyLoading = Object.values(loadingStates).some(state => state.isLoading);
  
  // Helper to check if all operations have errors
  const hasAnyError = Object.values(loadingStates).some(state => state.hasError);
  
  // Helper to reset all states
  const resetAll = () => {
    Object.values(loadingStates).forEach(state => state.reset());
  };

  return {
    ...loadingStates,
    isAnyLoading,
    hasAnyError,
    resetAll,
  };
};

/**
 * Hook for managing paginated loading states
 * Includes special handling for initial load, refresh, and load more
 */
export const usePaginatedLoadingState = (operationName = 'paginated-operation') => {
  const baseState = useLoadingState(operationName);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const isMountedRef = useRef(true);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  /**
   * Execute initial load
   */
  const executeInitialLoad = useCallback(async (asyncOperation, options = {}) => {
    return baseState.execute(asyncOperation, {
      ...options,
      onSuccess: (result) => {
        if (isMountedRef.current && options.onSuccess) {
          options.onSuccess(result);
        }
      },
    });
  }, [baseState]);

  /**
   * Execute refresh operation
   */
  const executeRefresh = useCallback(async (asyncOperation, options = {}) => {
    if (isMountedRef.current) {
      setIsRefreshing(true);
    }

    try {
      const result = await asyncOperation();
      
      if (isMountedRef.current) {
        setIsRefreshing(false);
        if (options.onSuccess) {
          options.onSuccess(result);
        }
      }

      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setIsRefreshing(false);
        if (options.onError) {
          options.onError(err);
        }
      }
      throw err;
    }
  }, []);

  /**
   * Execute load more operation
   */
  const executeLoadMore = useCallback(async (asyncOperation, options = {}) => {
    if (!hasMore || isLoadingMore) {
      return;
    }

    if (isMountedRef.current) {
      setIsLoadingMore(true);
    }

    try {
      const result = await asyncOperation();
      
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        if (options.onSuccess) {
          options.onSuccess(result);
        }
      }

      return result;
    } catch (err) {
      if (isMountedRef.current) {
        setIsLoadingMore(false);
        if (options.onError) {
          options.onError(err);
        }
      }
      throw err;
    }
  }, [hasMore, isLoadingMore]);

  /**
   * Set whether there are more items to load
   */
  const setHasMoreItems = useCallback((hasMoreItems) => {
    if (isMountedRef.current) {
      setHasMore(hasMoreItems);
    }
  }, []);

  /**
   * Reset all paginated states
   */
  const resetPaginated = useCallback(() => {
    baseState.reset();
    if (isMountedRef.current) {
      setIsRefreshing(false);
      setIsLoadingMore(false);
      setHasMore(true);
    }
  }, [baseState]);

  return {
    ...baseState,
    isRefreshing,
    isLoadingMore,
    hasMore,
    executeInitialLoad,
    executeRefresh,
    executeLoadMore,
    setHasMore: setHasMoreItems,
    reset: resetPaginated,
    // Helper computed properties
    isAnyLoading: baseState.isLoading || isRefreshing || isLoadingMore,
  };
};

export default useLoadingState;