// context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { API_URL } from '../config';
import PushNotificationService from '../services/PushNotificationService';
import { logger } from '../utils/logger';
import notificationDebugger from '../utils/notificationDebugger';
import { safeApiCall, safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt');
        if (!token) return setLoading(false);

        const userData = await safeAuthApiCall(
          `${API_URL}/me`,
          token,
          { method: 'GET' }
        );

        const userWithToken = { ...userData, token };
        setUser(userWithToken);

        // Set up push notifications after user is loaded
        setupPushNotificationsForUser(userWithToken);
      } catch (err) {
        logger.error('Failed to auto-login:', err);
        // Remove invalid token
        if (err.status === 401 || err.status === 403) {
          await AsyncStorage.removeItem('jwt');
        }
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // Set up push notifications for a user
  const setupPushNotificationsForUser = async (userData) => {
    if (!userData) return;

    try {
      // Set up notification listeners
      PushNotificationService.setupNotificationListeners();

      // Check if user has push notifications enabled
      if (userData.push_notifications) {
        // Request permissions and get token
        const pushToken = await PushNotificationService.registerForPushNotificationsAsync();

        if (pushToken && userData.token) {
          // Send token to backend
          await sendPushTokenToBackend(pushToken, userData.id, userData.token);
        }
      }
    } catch (error) {
      logger.error('Error setting up push notifications:', error);
    }
  };

  // Send push token to your backend
  const sendPushTokenToBackend = async (pushToken, userId, authToken) => {
    try {
      const url = `${API_URL}/users/${userId}/update_push_token`;
      const response = await notificationDebugger.debugBackendSync(
        url, 
        userId, 
        pushToken, 
        authToken
      );

      if (response.ok) {
        logger.debug('Push token sent to backend successfully');
      } else {
        logger.error('Failed to send push token to backend:', {
          status: response.status,
          statusText: response.statusText
        });
      }
    } catch (error) {
      logger.error('Error sending push token to backend:', error);
    }
  };

  // Login method (for when you need to set user after login)
  const login = async (token) => {
    try {
      await AsyncStorage.setItem('jwt', token);

      const userData = await safeAuthApiCall(
        `${API_URL}/me`,
        token,
        { method: 'GET' }
      );

      const userWithToken = { ...userData, token };
      setUser(userWithToken);

      // Set up push notifications after login
      setupPushNotificationsForUser(userWithToken);

      return userWithToken;
    } catch (error) {
      logger.error('Error during login:', error);
      await AsyncStorage.removeItem('jwt');
      throw error;
    }
  };

  // Logout method
  const logout = async () => {
    try {
      // Clean up push notification listeners
      PushNotificationService.cleanup();

      setUser(null);
      await AsyncStorage.removeItem('jwt');
    } catch (error) {
      logger.error('Error during logout:', error);
    }
  };

  // Update user method (for profile updates, notification settings, etc.)
  const updateUser = async (updatedFields) => {
    if (!user || !user.token) return;

    try {
      const updatedUserData = await safeAuthApiCall(
        `${API_URL}/users/${user.id}`,
        user.token,
        {
          method: 'PATCH',
          body: JSON.stringify({
            user: updatedFields
          }),
        }
      );

      const userWithToken = { ...updatedUserData, token: user.token };
      setUser(userWithToken);

      // Handle push notification preference changes
      if (updatedFields.push_notifications !== undefined) {
        if (updatedFields.push_notifications && !user.push_notifications) {
          // User enabled push notifications
          setupPushNotificationsForUser(userWithToken);
        } else if (!updatedFields.push_notifications && user.push_notifications) {
          // User disabled push notifications - cleanup
          PushNotificationService.cleanup();
          logger.debug('User disabled push notifications');
        }
      }

      return userWithToken;
    } catch (error) {
      logger.error('Error updating user:', error);
      throw error;
    }
  };

  // Custom setUser method that also handles push notifications
  const setUserWithNotifications = (userData) => {
    setUser(userData);
    if (userData) {
      setupPushNotificationsForUser(userData);
    } else {
      PushNotificationService.cleanup();
    }
  };

  // Refresh user data from server
  const refreshUser = async () => {
    if (!user?.token) return;

    try {
      const userData = await safeAuthApiCall(
        `${API_URL}/me`,
        user.token,
        { method: 'GET' }
      );

      const userWithToken = { ...userData, token: user.token };
      setUser(userWithToken);
      return userWithToken;
    } catch (err) {
      logger.error('Failed to refresh user:', err);
      // If unauthorized, clean up token
      if (err.status === 401 || err.status === 403) {
        await AsyncStorage.removeItem('jwt');
        setUser(null);
      }
    }
  };

  return (
    <UserContext.Provider value={{
      user,
      setUser: setUserWithNotifications,
      loading,
      login,
      logout,
      updateUser,
      refreshUser,
      unreadNotificationCount,
      setUnreadNotificationCount,
    }}>
      {children}
    </UserContext.Provider>
  );
};