import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { API_URL } from '../config';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const BLOCKED_USERS_KEY = 'blocked_users_cache';

class BlockedUsersService {
    constructor() {
        this.blockedUsers = new Set();
        this.blockedUserDetails = new Map(); // Store user details for UI
        this.initialized = false;
        this.token = null;
    }

    setAuthToken(token) {
        this.token = token;
    }

    async initialize(token = null) {
        if (token) {
            this.token = token;
        }
        
        if (this.initialized && !token) return;
        
        try {
            // Try to sync with backend first
            if (this.token) {
                await this.syncWithBackend();
            } else {
                // Fall back to cached data if no token
                await this.loadFromCache();
            }
            this.initialized = true;
        } catch (error) {
            logger.error('Failed to initialize blocked users:', error);
            // Fall back to cache on error
            await this.loadFromCache();
            this.initialized = true;
        }
    }

    async loadFromCache() {
        try {
            const stored = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.blockedUsers = new Set(parsed.userIds || []);
                this.blockedUserDetails = new Map(parsed.userDetails || []);
            }
        } catch (error) {
            logger.error('Failed to load blocked users from cache:', error);
            this.blockedUsers = new Set();
            this.blockedUserDetails = new Map();
        }
    }

    async syncWithBackend() {
        if (!this.token) {
            logger.warn('No auth token available for syncing blocked users');
            return;
        }

        try {
            // Log the exact URL being called for debugging
            const blockedUsersUrl = `${API_URL}/users/blocked`;
            logger.debug(`Syncing blocked users from: ${blockedUsersUrl}`);
            
            const response = await safeAuthApiCall(
                blockedUsersUrl,
                this.token,
                { method: 'GET' }
            );

            if (response && response.blocked_users) {
                // Clear and rebuild from backend data
                this.blockedUsers.clear();
                this.blockedUserDetails.clear();
                
                response.blocked_users.forEach(user => {
                    this.blockedUsers.add(user.id);
                    this.blockedUserDetails.set(user.id, {
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        profilePic: user.profile_pic
                    });
                });

                // Cache the updated list
                await this.persistToCache();
                
                logger.debug(`Synced ${response.blocked_users.length} blocked users from backend`);
            }
        } catch (error) {
            logger.error('Failed to sync blocked users with backend:', error);
            throw error;
        }
    }

    async blockUser(userId, userName = null) {
        if (!this.token) {
            logger.error('No auth token available for blocking user');
            return false;
        }

        try {
            // Call backend API to block user
            const blockUrl = `${API_URL}/users/${userId}/block`;
            logger.debug(`Blocking user at: ${blockUrl}`);
            
            const response = await safeAuthApiCall(
                blockUrl,
                this.token,
                { method: 'POST' }
            );

            if (response && response.blocked_user) {
                // Update local state
                this.blockedUsers.add(userId);
                this.blockedUserDetails.set(userId, {
                    id: response.blocked_user.id,
                    name: response.blocked_user.name,
                    email: response.blocked_user.email,
                    profilePic: response.blocked_user.profile_pic
                });

                // Cache the update
                await this.persistToCache();
                
                logger.debug(`User ${userId} blocked successfully`);
                return true;
            }
        } catch (error) {
            logger.error(`Failed to block user ${userId}:`, error);
            const errorMessage = handleApiError(error, 'Failed to block user');
            throw new Error(errorMessage);
        }

        return false;
    }

    async unblockUser(userId) {
        if (!this.token) {
            logger.error('No auth token available for unblocking user');
            return false;
        }

        try {
            // Call backend API to unblock user
            const unblockUrl = `${API_URL}/users/${userId}/unblock`;
            logger.debug(`Unblocking user at: ${unblockUrl}`);
            
            const response = await safeAuthApiCall(
                unblockUrl,
                this.token,
                { method: 'DELETE' }
            );

            if (response) {
                // Update local state
                this.blockedUsers.delete(userId);
                this.blockedUserDetails.delete(userId);

                // Cache the update
                await this.persistToCache();
                
                logger.debug(`User ${userId} unblocked successfully`);
                return true;
            }
        } catch (error) {
            logger.error(`Failed to unblock user ${userId}:`, error);
            const errorMessage = handleApiError(error, 'Failed to unblock user');
            throw new Error(errorMessage);
        }

        return false;
    }

    async isBlocked(userId) {
        await this.initialize();
        return this.blockedUsers.has(userId);
    }

    async getBlockedUsers() {
        await this.initialize();
        return Array.from(this.blockedUsers);
    }

    async getBlockedUserDetails() {
        await this.initialize();
        return Array.from(this.blockedUserDetails.values());
    }

    async persistToCache() {
        try {
            const dataToStore = {
                userIds: Array.from(this.blockedUsers),
                userDetails: Array.from(this.blockedUserDetails.entries()),
                lastSynced: new Date().toISOString()
            };
            
            await AsyncStorage.setItem(
                BLOCKED_USERS_KEY,
                JSON.stringify(dataToStore)
            );
        } catch (error) {
            logger.error('Failed to persist blocked users to cache:', error);
        }
    }

    async clearAll() {
        this.blockedUsers.clear();
        this.blockedUserDetails.clear();
        await AsyncStorage.removeItem(BLOCKED_USERS_KEY);
    }

    // Force refresh from backend
    async refresh() {
        if (!this.token) {
            logger.warn('Cannot refresh blocked users without auth token');
            return;
        }
        
        try {
            await this.syncWithBackend();
        } catch (error) {
            logger.error('Failed to refresh blocked users:', error);
        }
    }
}

export default new BlockedUsersService();