import { Image } from 'react-native';
import { logger } from './logger';

// Only keeping Weird5.jpg as the default avatar
const avatarMap = {
    'Weird5.jpg': require('../assets/Weird5.jpg'),
};

// Cache for prefetched images
const imageCache = new Map();

// Get avatar source - now only returns the default Weird5.jpg
export const getAvatarSource = (filename) => {
    return avatarMap['Weird5.jpg'];
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
    return avatarMap['Weird5.jpg'];
};