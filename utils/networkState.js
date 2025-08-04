/**
 * Network state management utility
 * Provides connection monitoring and offline handling capabilities
 */

import NetInfo from '@react-native-community/netinfo';
import { logger } from './logger';

class NetworkStateManager {
  constructor() {
    this.isConnected = true;
    this.connectionType = 'unknown';
    this.listeners = new Set();
    this.unsubscribe = null;
    this.lastConnectionCheck = Date.now();
    this.connectionCheckInterval = 30000; // 30 seconds
  }

  /**
   * Initialize network monitoring
   */
  initialize() {
    if (this.unsubscribe) {
      logger.debug('Network monitoring already initialized');
      return;
    }

    logger.debug('Initializing network state monitoring');

    // Subscribe to network state changes
    this.unsubscribe = NetInfo.addEventListener(state => {
      const wasConnected = this.isConnected;
      this.isConnected = state.isConnected ?? false;
      this.connectionType = state.type || 'unknown';

      logger.debug('Network state changed:', {
        isConnected: this.isConnected,
        type: this.connectionType,
        wasConnected,
      });

      // Notify listeners of state change
      this.notifyListeners({
        isConnected: this.isConnected,
        connectionType: this.connectionType,
        wasConnected,
        justConnected: !wasConnected && this.isConnected,
        justDisconnected: wasConnected && !this.isConnected,
      });
    });

    // Get initial network state
    this.checkConnectionState();
  }

  /**
   * Check current connection state
   */
  async checkConnectionState() {
    try {
      const state = await NetInfo.fetch();
      this.isConnected = state.isConnected ?? false;
      this.connectionType = state.type || 'unknown';
      this.lastConnectionCheck = Date.now();

      logger.debug('Network state checked:', {
        isConnected: this.isConnected,
        type: this.connectionType,
      });

      return {
        isConnected: this.isConnected,
        connectionType: this.connectionType,
      };
    } catch (error) {
      logger.error('Failed to check network state:', error);
      return {
        isConnected: false,
        connectionType: 'unknown',
      };
    }
  }

  /**
   * Add a listener for network state changes
   * @param {function} callback - Function to call when network state changes
   * @returns {function} - Unsubscribe function
   */
  addListener(callback) {
    if (typeof callback !== 'function') {
      throw new Error('Network state listener must be a function');
    }

    this.listeners.add(callback);
    logger.debug('Added network state listener, total:', this.listeners.size);

    // Return unsubscribe function
    return () => {
      this.listeners.delete(callback);
      logger.debug('Removed network state listener, remaining:', this.listeners.size);
    };
  }

  /**
   * Notify all listeners of network state changes
   */
  notifyListeners(networkState) {
    this.listeners.forEach(callback => {
      try {
        callback(networkState);
      } catch (error) {
        logger.error('Error in network state listener:', error);
      }
    });
  }

  /**
   * Check if device is currently connected
   * @param {boolean} forceRefresh - Force a fresh check instead of using cached value
   * @returns {Promise<boolean>}
   */
  async isOnline(forceRefresh = false) {
    if (forceRefresh || (Date.now() - this.lastConnectionCheck > this.connectionCheckInterval)) {
      const state = await this.checkConnectionState();
      return state.isConnected;
    }
    return this.isConnected;
  }

  /**
   * Get current connection type
   * @returns {string} - Connection type (wifi, cellular, etc.)
   */
  getConnectionType() {
    return this.connectionType;
  }

  /**
   * Check if connection is fast enough for heavy operations
   * @returns {boolean}
   */
  isConnectionFast() {
    return ['wifi', 'ethernet'].includes(this.connectionType.toLowerCase());
  }

  /**
   * Wait for network connection to be restored
   * @param {number} timeout - Maximum time to wait in milliseconds
   * @returns {Promise<boolean>}
   */
  async waitForConnection(timeout = 30000) {
    if (this.isConnected) {
      return true;
    }

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        unsubscribe();
        resolve(false);
      }, timeout);

      const unsubscribe = this.addListener(({ isConnected }) => {
        if (isConnected) {
          clearTimeout(timeoutId);
          unsubscribe();
          resolve(true);
        }
      });
    });
  }

  /**
   * Cleanup network monitoring
   */
  cleanup() {
    logger.debug('Cleaning up network state monitoring');
    
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }

    this.listeners.clear();
  }
}

// Create singleton instance
const networkStateManager = new NetworkStateManager();

// Auto-initialize when imported (but only if NetInfo is available)
if (typeof NetInfo !== 'undefined') {
  networkStateManager.initialize();
}

export default networkStateManager;

/**
 * React hook for using network state in components
 * Note: Import React in the component file that uses this hook
 */
export const createNetworkStateHook = (React) => {
  return () => {
    const [networkState, setNetworkState] = React.useState({
      isConnected: networkStateManager.isConnected,
      connectionType: networkStateManager.connectionType,
    });

    React.useEffect(() => {
      const unsubscribe = networkStateManager.addListener((state) => {
        setNetworkState({
          isConnected: state.isConnected,
          connectionType: state.connectionType,
          justConnected: state.justConnected,
          justDisconnected: state.justDisconnected,
        });
      });

      return unsubscribe;
    }, []);

    return networkState;
  };
};