// services/PushNotificationService.js
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform, Alert } from 'react-native';

// Configure notification behavior
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
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
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('Push notification permissions denied');
                return null;
            }

            try {
                token = await Notifications.getExpoPushTokenAsync({
                    projectId: Constants.expoConfig?.extra?.eas?.projectId,
                });
                this.expoPushToken = token.data;
                return token.data;
            } catch (error) {
                console.error('Error getting push token:', error);
                return null;
            }
        } else {
            console.warn('Push notifications require a physical device');
            return null;
        }
    }

    // Set up notification listeners
    setupNotificationListeners() {
        // Listener for notifications received while app is foregrounded
        this.notificationListener = Notifications.addNotificationReceivedListener(notification => {
            console.log('Notification received:', notification);
            // Handle the notification when app is in foreground
        });

        // Listener for when a user taps on or interacts with a notification
        this.responseListener = Notifications.addNotificationResponseReceivedListener(response => {
            console.log('Notification response:', response);
            // Handle navigation or actions when user taps notification
            this.handleNotificationResponse(response);
        });
    }

    // Handle notification tap responses
    handleNotificationResponse(response) {
        const { notification } = response;
        const data = notification.request.content.data;

        // Navigate based on notification data
        if (data?.type === 'activity_invite') {
            // Navigate to activity details
            // You'll need to pass navigation here or use a global navigator
            console.log('Navigate to activity:', data.activityId);
        } else if (data?.type === 'activity_update') {
            // Navigate to specific activity
            console.log('Navigate to activity update:', data.activityId);
        }
    }

    // Send push token to your backend
    // Note: This method is now handled in UserContext, but keeping for reference
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
                console.log('Push token sent to backend successfully');
            } else {
                console.error('Failed to send push token to backend');
            }
        } catch (error) {
            console.error('Error sending push token to backend:', error);
        }
    }

    // Clean up listeners
    cleanup() {
        if (this.notificationListener) {
            Notifications.removeNotificationSubscription(this.notificationListener);
        }
        if (this.responseListener) {
            Notifications.removeNotificationSubscription(this.responseListener);
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