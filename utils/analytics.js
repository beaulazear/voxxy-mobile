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
  if (!IS_PRODUCTION) {
    logger.info('📊 Analytics [DEV]:', { event, properties });
    return;
  }

  try {
    const token = await AsyncStorage.getItem('jwt');

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

    if (!response.ok) {
      logger.error('Analytics track failed:', response.status);
    }
  } catch (error) {
    // Fail silently - don't disrupt user experience for analytics
    logger.error('Analytics track error:', error);
  }
};

/**
 * Track a page view
 * @param {string} page - Page name
 * @param {Object} properties - Additional properties
 */
export const trackPageView = async (page, properties = {}) => {
  if (!IS_PRODUCTION) {
    logger.debug('Analytics: Skipping page view in non-production', { page });
    return;
  }

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
  if (!IS_PRODUCTION) {
    logger.debug('Analytics: Skipping identify in non-production');
    return;
  }

  try {
    const token = await AsyncStorage.getItem('jwt');

    if (!token) {
      logger.debug('Analytics: No token available for identify');
      return;
    }

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

    if (!response.ok) {
      logger.error('Analytics identify failed:', response.status);
    }
  } catch (error) {
    logger.error('Analytics identify error:', error);
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
  await trackEvent('Activity Created', {
    activityId: activity.id,
    activityType: activity.activity_type || activity.type,
    activityName: activity.activity_name || activity.name,
    date: activity.date_day || activity.date,
    dateTime: activity.date_time,
    location: activity.activity_location || activity.location,
    isSolo: activity.is_solo || false,
    groupType: activity.is_solo ? 'solo' : 'group',
    timeOfDay: activity.time_of_day,
    welcomeMessage: activity.welcome_message
  });
};