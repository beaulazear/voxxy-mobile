import { API_URL, IS_PRODUCTION } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from './logger';

/**
 * Analytics utility for tracking events to backend
 * All tracking is handled server-side through the Rails API
 */

/**
 * Track a generic event
 * @param {string} event - Event name
 * @param {Object} properties - Event properties
 */
export const trackEvent = async (event, properties = {}) => {
  logger.error('🔍 DEBUG: trackEvent called, event:', event, 'IS_PRODUCTION:', IS_PRODUCTION);

  // Allow tracking in development for testing (backend will handle Mixpanel logic)
  try {
    const token = await AsyncStorage.getItem('jwt');
    logger.error('🔍 DEBUG: Got token, about to fetch:', API_URL + '/analytics/track');

    const response = await fetch(`${API_URL}/analytics/track`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        event,
        properties
      })
    });

    logger.error('🔍 DEBUG: Fetch completed, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Analytics track failed:', response.status, errorText);
    } else {
      logger.error('✅ Analytics event tracked successfully:', event);
    }
  } catch (error) {
    logger.error('❌ Analytics track error:', error.message, error);
  }
};

/**
 * Track a page view
 * @param {string} page - Page name
 * @param {Object} properties - Additional properties
 */
export const trackPageView = async (page, properties = {}) => {
  // Allow tracking in development for testing

  try {
    const token = await AsyncStorage.getItem('jwt');

    const response = await fetch(`${API_URL}/analytics/page_view`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify({
        page,
        properties
      })
    });

    if (!response.ok) {
      logger.error('Analytics page view failed:', response.status);
    }
  } catch (error) {
    logger.error('Analytics page view error:', error);
  }
};

/**
 * Identify user and optionally track login
 * @param {boolean} trackLogin - Whether to also track login event
 */
export const identifyUser = async (trackLogin = false) => {
  logger.error('🔍 DEBUG: identifyUser called, trackLogin:', trackLogin, 'IS_PRODUCTION:', IS_PRODUCTION);

  try {
    const token = await AsyncStorage.getItem('jwt');

    if (!token) {
      logger.error('❌ Analytics: No token available for identify');
      return;
    }

    logger.error('🔍 DEBUG: Got token, about to identify user');

    const response = await fetch(`${API_URL}/analytics/identify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        track_login: trackLogin
      })
    });

    logger.error('🔍 DEBUG: Identify fetch completed, status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('❌ Analytics identify failed:', response.status, errorText);
    } else {
      logger.error('✅ Analytics identify successful, trackLogin:', trackLogin);
    }
  } catch (error) {
    logger.error('❌ Analytics identify error:', error.message, error);
  }
};

/**
 * Track user login
 * Convenience method that identifies user and tracks login event
 */
export const trackLogin = async () => {
  await identifyUser(true);
};

/**
 * Track user signup
 * @param {Object} userData - User data from signup response
 */
export const trackSignup = async (userData) => {
  await trackEvent('Signup form completed, account created', {
    userId: userData.id,
    email: userData.email,
    name: userData.name
  });
};

/**
 * Track activity creation
 * @param {Object} activity - Activity data from creation response
 */
export const trackActivityCreated = async (activity) => {
  logger.error('🔍 DEBUG: trackActivityCreated called with activity:', activity ? activity.id : 'null');

  if (!activity) {
    logger.error('❌ trackActivityCreated called with null/undefined activity');
    return;
  }

  logger.error('🔍 DEBUG: About to call trackEvent for Activity Created');

  await trackEvent('Activity Created', {
    activityId: activity.id,
    activityType: activity.activity_type || activity.type,
    activityName: activity.activity_name || activity.name,
    date: activity.date_day || activity.date,
    dateTime: activity.date_time,
    location: activity.activity_location || activity.location,
    isSolo: activity.is_solo || false,
    groupType: activity.is_solo ? 'solo' : 'group',
    welcomeMessage: activity.welcome_message
  });

  logger.error('🔍 DEBUG: trackEvent completed for Activity Created');
};