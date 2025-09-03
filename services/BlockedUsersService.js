import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';

const BLOCKED_USERS_KEY = 'blocked_users';

class BlockedUsersService {
    constructor() {
        this.blockedUsers = new Set();
        this.initialized = false;
    }

    async initialize() {
        if (this.initialized) return;
        
        try {
            const stored = await AsyncStorage.getItem(BLOCKED_USERS_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.blockedUsers = new Set(parsed);
            }
            this.initialized = true;
        } catch (error) {
            logger.error('Failed to load blocked users:', error);
            this.blockedUsers = new Set();
            this.initialized = true;
        }
    }

    async blockUser(userId) {
        await this.initialize();
        
        this.blockedUsers.add(userId);
        await this.persist();
        
        logger.debug(`User ${userId} blocked`);
        return true;
    }

    async unblockUser(userId) {
        await this.initialize();
        
        this.blockedUsers.delete(userId);
        await this.persist();
        
        logger.debug(`User ${userId} unblocked`);
        return true;
    }

    async isBlocked(userId) {
        await this.initialize();
        return this.blockedUsers.has(userId);
    }

    async getBlockedUsers() {
        await this.initialize();
        return Array.from(this.blockedUsers);
    }

    async persist() {
        try {
            await AsyncStorage.setItem(
                BLOCKED_USERS_KEY,
                JSON.stringify(Array.from(this.blockedUsers))
            );
        } catch (error) {
            logger.error('Failed to persist blocked users:', error);
        }
    }

    async clearAll() {
        this.blockedUsers.clear();
        await AsyncStorage.removeItem(BLOCKED_USERS_KEY);
    }
}

export default new BlockedUsersService();