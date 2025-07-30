import { logger } from './logger';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

class NotificationDebugger {
    constructor() {
        this.isEnabled = __DEV__; // Only debug in development
        this.stateHistory = [];
    }

    // Log notification state changes
    logStateChange(event, data) {
        if (!this.isEnabled) return;
        
        const entry = {
            timestamp: new Date().toISOString(),
            event,
            data,
            platform: Platform.OS,
        };
        
        this.stateHistory.push(entry);
        logger.debug(`📱 [Notification] ${event}:`, data);
        
        // Keep only last 50 entries
        if (this.stateHistory.length > 50) {
            this.stateHistory.shift();
        }
    }

    // Debug permission request
    async debugPermissionRequest() {
        this.logStateChange('PERMISSION_CHECK_START', {});
        
        try {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            this.logStateChange('PERMISSION_EXISTING', { status: existingStatus });
            
            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                this.logStateChange('PERMISSION_REQUESTED', { status });
                return status;
            }
            
            return existingStatus;
        } catch (error) {
            this.logStateChange('PERMISSION_ERROR', { error: error.message });
            throw error;
        }
    }

    // Debug token registration
    async debugTokenRegistration(projectId) {
        this.logStateChange('TOKEN_REGISTRATION_START', { projectId });
        
        try {
            const token = await Notifications.getExpoPushTokenAsync({
                projectId,
            });
            
            this.logStateChange('TOKEN_RECEIVED', { 
                token: token.data,
                type: token.type 
            });
            
            return token;
        } catch (error) {
            this.logStateChange('TOKEN_ERROR', { 
                error: error.message,
                projectId 
            });
            throw error;
        }
    }

    // Debug backend token sync
    async debugBackendSync(url, userId, token, authToken) {
        this.logStateChange('BACKEND_SYNC_START', { 
            url, 
            userId,
            tokenLength: token?.length 
        });
        
        try {
            const response = await fetch(url, {
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
            
            const responseData = response.ok ? await response.json() : null;
            
            this.logStateChange('BACKEND_SYNC_COMPLETE', { 
                status: response.status,
                ok: response.ok,
                responseData 
            });
            
            return response;
        } catch (error) {
            this.logStateChange('BACKEND_SYNC_ERROR', { 
                error: error.message 
            });
            throw error;
        }
    }

    // Get debug history
    getHistory() {
        return this.stateHistory;
    }

    // Clear history
    clearHistory() {
        this.stateHistory = [];
        this.logStateChange('HISTORY_CLEARED', {});
    }

    // Export history for debugging
    exportHistory() {
        const history = {
            exportTime: new Date().toISOString(),
            platform: Platform.OS,
            entries: this.stateHistory,
        };
        
        logger.debug('📊 Notification Debug History:', JSON.stringify(history, null, 2));
        return history;
    }
}

export default new NotificationDebugger();