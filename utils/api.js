import { API_URL } from '../config';
import { safeAuthApiCall } from './safeApiCall';
import { logger } from './logger';

/**
 * Fetch community favorites feed
 * @param {string} token - User authentication token
 * @param {boolean} withCoordinates - Optional: filter to only return favorites with lat/lng coordinates
 * @returns {Promise<Array>} Array of community favorite activities
 *
 * Response structure:
 * [
 *   {
 *     id: number,
 *     user: { id, name, avatar_url, profile_image, profile_pic_url },
 *     favorite: {
 *       id: number,
 *       title: string,
 *       address: string,
 *       latitude: number | null,  // Can be null for old data
 *       longitude: number | null, // Can be null for old data
 *       price_range: string,
 *       description: string,
 *       photos: array | null,     // Array of photo URLs (JSON)
 *       reviews: array | null,    // Array of review objects (JSON)
 *       hours: string | null,     // Business hours
 *       reason: string | null,    // Reason for saving
 *       website: string | null,   // Business website
 *       activity_type: string | null // Activity type (e.g., "Restaurant", "Cocktails", "Brunch")
 *     },
 *     created_at: string
 *   }
 * ]
 */
export const fetchCommunityFavorites = async (token, withCoordinates = false) => {
  try {
    const url = withCoordinates
      ? `${API_URL}/user_activities/community_feed?with_coordinates=true`
      : `${API_URL}/user_activities/community_feed`;

    const data = await safeAuthApiCall(
      url,
      token,
      { method: 'GET' }
    );
    return data || [];
  } catch (error) {
    logger.error('Error fetching community favorites:', error);
    return [];
  }
};
