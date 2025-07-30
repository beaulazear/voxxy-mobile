import { Image } from 'react-native';
import { logger } from './logger';

// Centralized avatar map - loaded once, shared everywhere
const avatarMap = {
    // Avatar series
    'Avatar1.jpg': require('../assets/Avatar1.jpg'),
    'Avatar2.jpg': require('../assets/Avatar2.jpg'),
    'Avatar3.jpg': require('../assets/Avatar3.jpg'),
    'Avatar4.jpg': require('../assets/Avatar4.jpg'),
    'Avatar5.jpg': require('../assets/Avatar5.jpg'),
    'Avatar6.jpg': require('../assets/Avatar6.jpg'),
    'Avatar7.jpg': require('../assets/Avatar7.jpg'),
    'Avatar8.jpg': require('../assets/Avatar8.jpg'),
    'Avatar9.jpg': require('../assets/Avatar9.jpg'),
    'Avatar10.jpg': require('../assets/Avatar10.jpg'),
    'Avatar11.jpg': require('../assets/Avatar11.jpg'),
    
    // Weird series
    'Weird1.jpg': require('../assets/Weird1.jpg'),
    'Weird2.jpg': require('../assets/Weird2.jpg'),
    'Weird3.jpg': require('../assets/Weird3.jpg'),
    'Weird4.jpg': require('../assets/Weird4.jpg'),
    'Weird5.jpg': require('../assets/Weird5.jpg'),
};

// Cache for prefetched images
const imageCache = new Map();

// Get avatar source
export const getAvatarSource = (filename) => {
    if (!filename) return avatarMap['Avatar1.jpg'];
    
    // Extract filename if it includes path
    const avatarFilename = filename.includes('/') 
        ? filename.split('/').pop() 
        : filename;
    
    return avatarMap[avatarFilename] || avatarMap['Avatar1.jpg'];
};

// Prefetch images to prevent loading delays
export const prefetchAvatars = async () => {
    try {
        const promises = Object.entries(avatarMap).map(async ([key, source]) => {
            if (!imageCache.has(key)) {
                await Image.prefetch(Image.resolveAssetSource(source).uri);
                imageCache.set(key, true);
            }
        });
        
        await Promise.all(promises);
        logger.debug('✅ All avatars prefetched');
    } catch (error) {
        logger.error('Failed to prefetch avatars:', error);
    }
};

// Get all avatar keys
export const getAvatarKeys = () => Object.keys(avatarMap);

// Export the map for components that need it
export { avatarMap };

// Helper to get display image for user
export const getUserDisplayImage = (userObj, API_URL) => {
    // Check for profile_pic_url first (full URL)
    if (userObj?.profile_pic_url) {
        const profilePicUrl = userObj.profile_pic_url.startsWith('http')
            ? userObj.profile_pic_url
            : `${API_URL}${userObj.profile_pic_url}`;
        return { uri: profilePicUrl };
    }
    
    // Check for avatar (relative path)
    if (userObj?.avatar) {
        return getAvatarSource(userObj.avatar);
    }
    
    // Default avatar
    return avatarMap['Avatar1.jpg'];
};