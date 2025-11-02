import { logger } from './logger';

/**
 * Safely parse JSON data with fallback
 * @param {any} data - Data to parse
 * @param {any} fallback - Fallback value if parsing fails
 * @returns {any} Parsed data or fallback
 */
export const safeJsonParse = (data, fallback = []) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            logger.warn('Failed to parse JSON data:', e);
            return fallback;
        }
    }
    return fallback;
};

/**
 * Check if user has any profile preferences set
 * @param {Object} user - User object
 * @param {String} activityType - Activity type (e.g. 'Restaurant', 'Cocktails')
 * @returns {boolean} Whether user has preferences appropriate for this activity type
 */
export const userHasProfilePreferences = (user, activityType = 'Restaurant') => {
    if (!user) return false;

    const isBarActivity = activityType === 'Cocktails' || activityType === 'Night Out';

    // For bar/cocktail activities, check bar_preferences
    if (isBarActivity) {
        const hasBarPreferences = user.bar_preferences && user.bar_preferences.trim().length > 0;
        return hasBarPreferences;
    }

    // For restaurant activities, check favorite_food and dietary preferences
    const hasFavoriteFood = user.favorite_food && user.favorite_food.trim().length > 0;
    const hasPreferencesField = user.preferences && user.preferences.trim().length > 0;
    const hasDietaryPreferences = user.dairy_free === true ||
        user.gluten_free === true ||
        user.vegan === true ||
        user.vegetarian === true ||
        user.kosher === true;

    return hasFavoriteFood || hasPreferencesField || hasDietaryPreferences;
};

/**
 * Determine if reason field contains keywords or paragraph format
 * @param {string} reason - Reason text to analyze
 * @returns {boolean} True if keyword format, false if paragraph
 */
export const isKeywordFormat = (reason) => {
    if (!reason || typeof reason !== 'string') return false;

    // Check if it's likely keywords: short phrases separated by commas
    const parts = reason.split(',');

    // If we have multiple parts and they're all relatively short, it's likely keywords
    if (parts.length > 1) {
        // Check if all parts are short (less than 30 chars) and don't contain sentence-ending punctuation
        const allShort = parts.every(part => {
            const trimmed = part.trim();
            return trimmed.length < 30 && !trimmed.match(/[.!?]$/);
        });
        return allShort;
    }

    // Single item or long text is likely a paragraph
    return false;
};

/**
 * Format hours string for display
 * @param {string} hoursString - Raw hours string
 * @returns {Object} Formatted hours data with type and content
 */
export const formatHours = (hoursString) => {
    if (!hoursString || hoursString === 'N/A') return { type: 'simple', text: 'Hours not available' };

    // If it's already a simple string (old format), return as is
    if (!hoursString.includes('Mon') && !hoursString.includes('Tue') && !hoursString.includes('Wed')) {
        return { type: 'simple', text: hoursString };
    }

    try {
        // Parse the hours string - expecting format like "Mon: Closed, Tue: Closed, Wed: 12:00 – 8:00 PM..."
        const dayAbbrevs = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hoursData = [];

        // Split by comma and parse each day
        const parts = hoursString.split(',').map(p => p.trim());

        parts.forEach(part => {
            const colonIndex = part.indexOf(':');
            if (colonIndex > -1) {
                const day = part.substring(0, colonIndex).trim();
                const hours = part.substring(colonIndex + 1).trim();

                // Find the day index
                const dayIndex = dayAbbrevs.findIndex(d => part.startsWith(d));
                if (dayIndex !== -1) {
                    hoursData.push({
                        day: dayAbbrevs[dayIndex],
                        dayIndex,
                        hours: hours
                    });
                }
            }
        });

        // Group consecutive days with same hours
        const groups = [];
        let currentGroup = null;

        hoursData.forEach(data => {
            if (data.hours.toLowerCase() === 'closed') {
                // Skip closed days for cleaner display
                return;
            }

            // Clean up the hours format (remove extra spaces, standardize dash)
            const cleanHours = data.hours.replace(/\s+/g, ' ').replace(/[–—]/g, '-').trim();

            if (!currentGroup || currentGroup.hours !== cleanHours) {
                currentGroup = {
                    startDay: data.day,
                    endDay: data.day,
                    startIndex: data.dayIndex,
                    endIndex: data.dayIndex,
                    hours: cleanHours
                };
                groups.push(currentGroup);
            } else if (data.dayIndex === currentGroup.endIndex + 1) {
                // Consecutive day with same hours
                currentGroup.endDay = data.day;
                currentGroup.endIndex = data.dayIndex;
            } else {
                // Non-consecutive day with same hours - start new group
                currentGroup = {
                    startDay: data.day,
                    endDay: data.day,
                    startIndex: data.dayIndex,
                    endIndex: data.dayIndex,
                    hours: cleanHours
                };
                groups.push(currentGroup);
            }
        });

        // Format the groups
        if (groups.length === 0) {
            return { type: 'simple', text: 'Closed' };
        }

        // Check if all open days have the same hours
        if (groups.length === 1) {
            const group = groups[0];
            if (group.startIndex === 0 && group.endIndex === 6) {
                return { type: 'simple', text: `Daily: ${group.hours}` };
            } else if (group.startDay === group.endDay) {
                return { type: 'simple', text: `${group.startDay}: ${group.hours}` };
            } else {
                return { type: 'simple', text: `${group.startDay}-${group.endDay}: ${group.hours}` };
            }
        }

        // For multiple groups, return structured data for better display
        return {
            type: 'structured',
            groups: groups.map(group => ({
                days: group.startDay === group.endDay ? group.startDay : `${group.startDay}-${group.endDay}`,
                hours: group.hours
            }))
        };

    } catch (e) {
        // If parsing fails, try to extract just the hours
        const timeMatch = hoursString.match(/\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\s*[AP]M/i);
        if (timeMatch) {
            return { type: 'simple', text: timeMatch[0] };
        }
        return { type: 'simple', text: 'See details' };
    }
};

/**
 * Analyze availability data from responses
 * @param {Array} responses - Array of response objects with availability
 * @returns {Object} Availability data and participant counts
 */
export const analyzeAvailability = (responses) => {
    const availabilityData = {};
    const participantCount = {};

    (responses || []).forEach(response => {
        const availability = response.availability || {};
        const participantName = response.user?.name || response.email || 'Anonymous';

        Object.entries(availability).forEach(([date, times]) => {
            if (!availabilityData[date]) {
                availabilityData[date] = {};
                participantCount[date] = 0;
            }
            participantCount[date]++;

            times.forEach(time => {
                if (!availabilityData[date][time]) {
                    availabilityData[date][time] = [];
                }
                availabilityData[date][time].push(participantName);
            });
        });
    });

    return { availabilityData, participantCount };
};
