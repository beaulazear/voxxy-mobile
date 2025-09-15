// services/PushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';
import { logger } from '../utils/logger';
import notificationDebugger from '../utils/notificationDebugger';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowBanner: true,  // Show notification banner at top of screen
        shouldShowList: true,    // Show in notification center/list
        shouldPlaySound: true,
        shouldSetBadge: true,    // Allow notifications to update the badge
    }),
});

class PushNotificationService {
    constructor() {
        this.expoPushToken = null;
        this.notificationListener = null;
        this.responseListener = null;
    }

    // Request notification permissions and get push token
    async registerForPushNotificationsAsync() {
        let token;

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync('default', {
                name: 'default',
                importance: Notifications.AndroidImportance.MAX,
                vibrationPattern: [0, 250, 250, 250],
                lightColor: '#FF231F7C',
            });
        }

        if (Device.isDevice) {
            try {
                // Debug permission check
                const finalStatus = await notificationDebugger.debugPermissionRequest();

                if (finalStatus !== 'granted') {
                    if (__DEV__) {
                        logger.debug('Push notification permissions denied');
                        notificationDebugger.logStateChange('PERMISSION_DENIED', { finalStatus });
                    }
                    return null;
                }

                // Debug token registration
                const projectId = Constants.expoConfig?.extra?.eas?.projectId;
                token = await notificationDebugger.debugTokenRegistration(projectId);
                
                this.expoPushToken = token.data;
                return token.data;
            } catch (error) {
                // Handle Expo service errors gracefully
                if (error.message?.includes('503') || error.message?.includes('no healthy upstream')) {
                    // Silently retry later for temporary service issues
                } else if (__DEV__) {
                    logger.error('Error in push notification setup:', error);
                    notificationDebugger.logStateChange('REGISTRATION_ERROR', { 
                        error: error.message
                    });
                }
                return null;
            }
        } else {
            if (__DEV__) {
                logger.debug('Push notifications require a physical device');
                notificationDebugger.logStateChange('DEVICE_CHECK_FAILED', { 
                    isDevice: Device.isDevice 
                });
            }
            return null;
        }
    }

    // Set up notification listeners
    setupNotificationListeners() {
        // Listener for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            if (__DEV__) {
                logger.debug('Notification received:', notification.request.content.title);
                notificationDebugger.logStateChange('NOTIFICATION_RECEIVED', {
                    title: notification.request.content.title,
                    body: notification.request.content.body,
                    data: notification.request.content.data,
                });
            }
            // Handle the notification when app is in foreground
        });

        // Listener for when a user taps on or interacts with a notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            if (__DEV__) {
                logger.debug('Notification tapped');
                notificationDebugger.logStateChange('NOTIFICATION_TAPPED', {
                    actionIdentifier: response.actionIdentifier,
                });
            }
            // Handle navigation or actions when user taps notification
            this.handleNotificationResponse(response);
        });
        
        if (__DEV__) {
            notificationDebugger.logStateChange('LISTENERS_SETUP', {
                hasNotificationListener: !!this.notificationListener,
                hasResponseListener: !!this.responseListener,
            });
        }
    }

    // Handle notification tap responses
    handleNotificationResponse(response) {
        const { notification } = response;
        const data = notification.request.content.data;

        // Navigate based on notification data
        if (data?.type === 'activity_invite') {
            // Navigate to activity details
            // You'll need to pass navigation here or use a global navigator
            logger.debug('Navigate to activity:', data.activityId);
        } else if (data?.type === 'activity_update') {
            // Navigate to specific activity
            logger.debug('Navigate to activity update:', data.activityId);
        }
    }

    // Send push token to backend (deprecated - use UserContext instead)
    async sendPushTokenToBackend(token, userId, authToken, apiUrl) {
        try {
            const response = await fetch(`${apiUrl}/users/${userId}/update_push_token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`,
                },
                body: JSON.stringify({
                    push_token: token,
                    platform: Platform.OS,
                }),
            });

            if (response.ok) {
                logger.debug('Push token sent to backend successfully');
            } else {
                logger.error('Failed to send push token to backend');
            }
        } catch (error) {
            logger.error('Error sending push token to backend:', error);
        }
    }

    // Clear the app badge count
    async clearBadge() {
        try {
            await Notifications.setBadgeCountAsync(0);
            logger.debug('Badge count cleared');
        } catch (error) {
            logger.error('Error clearing badge count:', error);
        }
    }

    // Set the app badge count
    async setBadgeCount(count) {
        try {
            await Notifications.setBadgeCountAsync(count);
            logger.debug('Badge count set to:', count);
        } catch (error) {
            logger.error('Error setting badge count:', error);
        }
    }

    // Clean up listeners
    cleanup() {
        if (this.notificationListener) {
            this.notificationListener.remove();
        }
        if (this.responseListener) {
            this.responseListener.remove();
        }
    }

    // Manually send a test notification (for development)
    async sendTestNotification() {
        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Test Notification",
                body: 'This is a test notification from your app!',
                data: { type: 'test' },
            },
            trigger: { seconds: 2 },
        });
    }
}

export default new PushNotificationService();