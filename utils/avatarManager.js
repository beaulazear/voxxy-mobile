import { Image } from 'react-native';
import { logger } from './logger';

// Using voxxy-triangle.png as the default avatar
const avatarMap = {
    'Weird5.jpg': require('../assets/Weird5.jpg'),
    'voxxy-triangle.png': require('../assets/voxxy-triangle.png'),
};

// Cache for prefetched images
const imageCache = new Map();

// Get avatar source - now returns voxxy-triangle.png as default
export const getAvatarSource = (_filename) => {
    return avatarMap['voxxy-triangle.png'];
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
    
    // Check for profilePic (from blocked users API)
    if (userObj?.profilePic) {
        const profilePicUrl = userObj.profilePic.startsWith('http')
            ? userObj.profilePic
            : `${API_URL}${userObj.profilePic}`;
        return { uri: profilePicUrl };
    }
    
    // Check for avatar (relative path - legacy)
    if (userObj?.avatar) {
        return getAvatarSource(userObj.avatar);
    }
    
    // Default avatar
    return avatarMap['voxxy-triangle.png'];
};