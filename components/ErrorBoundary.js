/**
 * Global Error Boundary to catch and handle unhandled React errors
 * Prevents app crashes by displaying fallback UI and logging errors
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { logger } from '../utils/logger';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return {
      hasError: true,
      errorId: Math.random().toString(36).substring(7),
    };
  }

  componentDidCatch(error, errorInfo) {
    // Log the error details
    const errorId = Math.random().toString(36).substring(7);
    
    logger.error(`[ErrorBoundary-${errorId}] React Error Caught:`, {
      message: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    });

    // Update state with error details
    this.setState({
      error,
      errorInfo,
      errorId,
    });

    // TODO: In production, send error to crash reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleResetError = () => {
    logger.debug('ErrorBoundary: Resetting error state');
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  render() {
    if (this.state.hasError) {
      const { error, errorInfo, errorId } = this.state;
      const { fallback: CustomFallback, showDetails = false } = this.props;

      // If custom fallback provided, use it
      if (CustomFallback) {
        return (
          <CustomFallback
            error={error}
            errorInfo={errorInfo}
            onReset={this.handleResetError}
          />
        );
      }

      // Default fallback UI
      return (
        <SafeAreaView style={styles.container}>
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.errorContainer}>
              {/* Error Icon */}
              <Text style={styles.errorIcon}>⚠️</Text>
              
              {/* Main Error Message */}
              <Text style={styles.errorTitle}>Oops! Something went wrong</Text>
              <Text style={styles.errorMessage}>
                We're sorry, but the app encountered an unexpected error. 
                Don't worry - your data is safe!
              </Text>

              {/* Action Buttons */}
              <View style={styles.buttonContainer}>
                <TouchableOpacity
                  style={styles.primaryButton}
                  onPress={this.handleResetError}
                  activeOpacity={0.8}
                >
                  <Text style={styles.primaryButtonText}>Try Again</Text>
                </TouchableOpacity>
              </View>

              {/* Error ID for support */}
              <Text style={styles.errorId}>
                Error ID: {errorId}
              </Text>
              <Text style={styles.supportText}>
                If this problem persists, please contact support with the error ID above.
              </Text>

              {/* Debug Information (only in development) */}
              {__DEV__ && showDetails && error && (
                <View style={styles.debugContainer}>
                  <Text style={styles.debugTitle}>Debug Information:</Text>
                  <View style={styles.debugContent}>
                    <Text style={styles.debugLabel}>Error Message:</Text>
                    <Text style={styles.debugText}>{error.message}</Text>
                    
                    {error.stack && (
                      <>
                        <Text style={styles.debugLabel}>Stack Trace:</Text>
                        <Text style={styles.debugText}>{error.stack}</Text>
                      </>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <>
                        <Text style={styles.debugLabel}>Component Stack:</Text>
                        <Text style={styles.debugText}>{errorInfo.componentStack}</Text>
                      </>
                    )}
                  </View>
                </View>
              )}
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // No error, render children normally
    return this.props.children;
  }
}

/**
 * Higher-order component to wrap components with error boundary
 */
export const withErrorBoundary = (Component, fallbackComponent = null) => {
  const WrappedComponent = (props) => (
    <ErrorBoundary fallback={fallbackComponent}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  return WrappedComponent;
};

/**
 * Hook to manually trigger error boundary (for testing or forced errors)
 */
export const useErrorHandler = () => {
  return (error, errorInfo = {}) => {
    logger.error('Manual error triggered:', error);
    throw error;
  };
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
  },
  
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
  },
  
  errorContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  
  errorIcon: {
    fontSize: 64,
    marginBottom: 24,
  },
  
  errorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 16,
    fontFamily: 'Montserrat_700Bold',
  },
  
  errorMessage: {
    fontSize: 16,
    color: '#B8A5C4',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
  },
  
  primaryButton: {
    backgroundColor: '#cf38dd',
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 12,
    shadowColor: '#cf38dd',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  
  errorId: {
    fontSize: 12,
    color: '#777',
    fontFamily: 'monospace',
    marginBottom: 8,
  },
  
  supportText: {
    fontSize: 12,
    color: '#777',
    textAlign: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  
  // Debug styles (development only)
  debugContainer: {
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginTop: 24,
  },
  
  debugTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ff6b6b',
    marginBottom: 12,
  },
  
  debugContent: {
    gap: 8,
  },
  
  debugLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffd93d',
    marginTop: 8,
  },
  
  debugText: {
    fontSize: 11,
    color: '#fff',
    fontFamily: 'monospace',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    padding: 8,
    borderRadius: 4,
    marginTop: 4,
  },
});

export default ErrorBoundary;