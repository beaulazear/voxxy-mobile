// context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { API_URL } from '../config';
import PushNotificationService from '../services/PushNotificationService';
import BlockedUsersService from '../services/BlockedUsersService';
import { logger } from '../utils/logger';
import notificationDebugger from '../utils/notificationDebugger';
import { safeAuthApiCall, handleApiError, isModerationError, getModerationStatus } from '../utils/safeApiCall';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);
  const [rateLimitRetryCount, setRateLimitRetryCount] = useState(0);
  const [moderationStatus, setModerationStatus] = useState(null); // null, 'suspended', 'banned'
  const [suspendedUntil, setSuspendedUntil] = useState(null);
  const [needsPolicyAcceptance, setNeedsPolicyAcceptance] = useState(false);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const lastRateLimit = await AsyncStorage.getItem('lastRateLimit');
        if (lastRateLimit) {
          const timeSinceRateLimit = Date.now() - parseInt(lastRateLimit);
          const backoffTime = Math.min(30000, 1000 * Math.pow(2, rateLimitRetryCount)); // Max 30 seconds
          
          if (timeSinceRateLimit < backoffTime) {
            logger.warn(`Rate limit backoff: waiting ${(backoffTime - timeSinceRateLimit) / 1000}s before retry`);
            setLoading(false);
            return;
          }
        }

        // Clear any existing badge count on app launch
        await PushNotificationService.clearBadge();
        
        const token = await AsyncStorage.getItem('jwt');
        if (!token) return setLoading(false);

        const userData = await safeAuthApiCall(
          `${API_URL}/me`,
          token,
          { method: 'GET' }
        );

        // Check user moderation status
        if (userData.status === 'suspended') {
          setModerationStatus('suspended');
          setSuspendedUntil(userData.suspended_until);
          
          // Show alert to user
          Alert.alert(
            'Account Suspended',
            `Your account has been suspended until ${new Date(userData.suspended_until).toLocaleDateString()}. Reason: ${userData.suspension_reason || 'Policy violation'}`,
            [{ text: 'OK' }]
          );
        } else if (userData.status === 'banned') {
          setModerationStatus('banned');
          
          Alert.alert(
            'Account Banned',
            `Your account has been permanently banned. Reason: ${userData.ban_reason || 'Severe policy violation'}. Contact support@voxxyai.com for appeals.`,
            [{ text: 'OK', onPress: () => logout() }]
          );
          return setLoading(false);
        } else {
          setModerationStatus(null);
          setSuspendedUntil(null);
        }

        // Check policy acceptance status
        if (userData.needs_policy_acceptance) {
          setNeedsPolicyAcceptance(true);
          logger.debug('User needs to accept updated policies');
        } else {
          setNeedsPolicyAcceptance(false);
          
          // Sync pending policy acceptance if needed
          const pendingPolicies = await AsyncStorage.getItem('policies_accepted');
          if (pendingPolicies) {
            const policies = JSON.parse(pendingPolicies);
            if (policies.pending_sync && !policies.synced_with_backend) {
              try {
                await safeAuthApiCall(
                  `${API_URL}/accept_policies`,
                  token,
                  {
                    method: 'POST',
                    body: JSON.stringify({
                      accept_terms: true,
                      accept_privacy: true,
                      accept_guidelines: true,
                      terms_version: policies.terms_version,
                      privacy_version: policies.privacy_version,
                      guidelines_version: policies.guidelines_version
                    })
                  }
                );
                
                // Update local storage to mark as synced
                policies.synced_with_backend = true;
                policies.pending_sync = false;
                await AsyncStorage.setItem('policies_accepted', JSON.stringify(policies));
                logger.debug('Synced pending policy acceptance with backend');
              } catch (error) {
                logger.error('Failed to sync pending policy acceptance:', error);
              }
            }
          }
        }

        const userWithToken = { ...userData, token };
        setUser(userWithToken);

        // Initialize blocked users service with token
        BlockedUsersService.setAuthToken(token);
        await BlockedUsersService.initialize(token);

        // Clear rate limit tracking on successful login
        await AsyncStorage.removeItem('lastRateLimit');
        setRateLimitRetryCount(0);

        // PRIVACY FIX: Don't auto-register for push notifications
        // Only set up listeners, actual registration happens when user enables in settings
        PushNotificationService.setupNotificationListeners();
        
        // Fetch and set the actual unread count
        try {
          const notifications = await safeAuthApiCall(
            `${API_URL}/notifications`,
            token,
            { method: 'GET' }
          );
          const unreadCount = (notifications || []).filter(n => !n.read).length;
          setUnreadNotificationCount(unreadCount);
          // Update system badge to match actual unread count
          await PushNotificationService.setBadgeCount(unreadCount);
        } catch (error) {
          logger.error('Failed to fetch initial notification count:', error);
        }
      } catch (err) {
        logger.error('Failed to auto-login:', err);
        // Remove invalid token only for auth errors, not rate limits
        if (err.status === 401 || err.status === 403) {
          await AsyncStorage.removeItem('jwt');
          await AsyncStorage.removeItem('lastRateLimit');
        } else if (err.status === 429 || err.message?.includes('Rate limit')) {
          // For rate limit errors, store timestamp and increment retry count
          await AsyncStorage.setItem('lastRateLimit', Date.now().toString());
          setRateLimitRetryCount(prev => prev + 1);
          logger.warn('Rate limit hit during auto-login, implementing backoff');
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

      // Check user moderation status on login
      if (userData.status === 'suspended') {
        setModerationStatus('suspended');
        setSuspendedUntil(userData.suspended_until);
        
        Alert.alert(
          'Account Suspended',
          `Your account has been suspended until ${new Date(userData.suspended_until).toLocaleDateString()}. Reason: ${userData.suspension_reason || 'Policy violation'}`,
          [{ text: 'OK' }]
        );
      } else if (userData.status === 'banned') {
        setModerationStatus('banned');
        await AsyncStorage.removeItem('jwt');
        
        Alert.alert(
          'Account Banned',
          `Your account has been permanently banned. Reason: ${userData.ban_reason || 'Severe policy violation'}. Contact support@voxxyai.com for appeals.`,
          [{ text: 'OK' }]
        );
        throw new Error('Account is banned');
      } else {
        setModerationStatus(null);
        setSuspendedUntil(null);
      }

      const userWithToken = { ...userData, token };
      setUser(userWithToken);

      // Clear rate limit tracking on successful login
      await AsyncStorage.removeItem('lastRateLimit');
      setRateLimitRetryCount(0);

      // PRIVACY FIX: Don't auto-register for push notifications
      // Only set up listeners, actual registration happens when user enables in settings
      PushNotificationService.setupNotificationListeners();

      return userWithToken;
    } catch (error) {
      logger.error('Error during login:', error);
      
      // Check if error is due to moderation
      if (isModerationError(error)) {
        const status = getModerationStatus(error);
        setModerationStatus(status);
        
        if (status === 'banned') {
          Alert.alert(
            'Account Banned',
            handleApiError(error),
            [{ text: 'OK' }]
          );
        } else if (status === 'suspended') {
          Alert.alert(
            'Account Suspended',
            handleApiError(error),
            [{ text: 'OK' }]
          );
        }
      }
      
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
      // Also clear rate limit tracking on logout
      await AsyncStorage.removeItem('lastRateLimit');
      setRateLimitRetryCount(0);
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

      // Check moderation status on refresh
      if (userData.status === 'suspended') {
        setModerationStatus('suspended');
        setSuspendedUntil(userData.suspended_until);
        
        // Only show alert if status changed
        if (moderationStatus !== 'suspended') {
          Alert.alert(
            'Account Suspended',
            `Your account has been suspended until ${new Date(userData.suspended_until).toLocaleDateString()}. Reason: ${userData.suspension_reason || 'Policy violation'}`,
            [{ text: 'OK' }]
          );
        }
      } else if (userData.status === 'banned') {
        setModerationStatus('banned');
        
        Alert.alert(
          'Account Banned',
          `Your account has been permanently banned. Reason: ${userData.ban_reason || 'Severe policy violation'}. Contact support@voxxyai.com for appeals.`,
          [{ text: 'OK', onPress: () => logout() }]
        );
        return;
      } else {
        // Check if suspension was lifted
        if (moderationStatus === 'suspended') {
          Alert.alert(
            'Suspension Lifted',
            'Your account suspension has been lifted. Welcome back!',
            [{ text: 'OK' }]
          );
        }
        setModerationStatus(null);
        setSuspendedUntil(null);
      }

      const userWithToken = { ...userData, token: user.token };
      setUser(userWithToken);
      
      // Also refresh notifications count
      try {
        const notifications = await safeAuthApiCall(
          `${API_URL}/notifications`,
          user.token,
          { method: 'GET' }
        );
        const unreadCount = (notifications || []).filter(n => !n.read).length;
        setUnreadNotificationCount(unreadCount);
      } catch (notifErr) {
        logger.debug('Could not refresh notification count');
      }
      
      return userWithToken;
    } catch (err) {
      logger.error('Failed to refresh user:', err);
      
      // Check if error is due to moderation
      if (isModerationError(err)) {
        const status = getModerationStatus(err);
        setModerationStatus(status);
        
        Alert.alert(
          status === 'banned' ? 'Account Banned' : 'Account Suspended',
          handleApiError(err),
          [{ text: 'OK', onPress: status === 'banned' ? () => logout() : undefined }]
        );
      }
      
      // If unauthorized, clean up token
      if (err.status === 401 || err.status === 403) {
        await AsyncStorage.removeItem('jwt');
        setUser(null);
      }
    }
  };

  // Refresh a specific activity
  const refreshActivity = async (activityId) => {
    if (!user?.token || !activityId) return;

    try {
      const activityData = await safeAuthApiCall(
        `${API_URL}/activities/${activityId}`,
        user.token,
        { method: 'GET' }
      );

      if (activityData) {
        setUser(prevUser => {
          if (!prevUser) return prevUser;
          
          const updatedActivities = (prevUser.activities || []).map(act => 
            act.id === activityData.id ? activityData : act
          );
          
          const updatedParticipantActivities = (prevUser.participant_activities || []).map(p => 
            p.activity.id === activityData.id 
              ? { ...p, activity: activityData }
              : p
          );
          
          return {
            ...prevUser,
            activities: updatedActivities,
            participant_activities: updatedParticipantActivities
          };
        });
      }
      
      return activityData;
    } catch (error) {
      logger.error('Error refreshing activity:', error);
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
      refreshActivity,
      unreadNotificationCount,
      setUnreadNotificationCount,
      moderationStatus,
      suspendedUntil,
      needsPolicyAcceptance,
    }}>
      {children}
    </UserContext.Provider>
  );
};