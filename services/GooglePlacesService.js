/**
 * Google Places API Service
 * Handles location search and place details fetching
 */

import { API_URL } from '../config';
import { logger } from '../utils/logger';

class GooglePlacesService {
    constructor() {
        logger.debug('GooglePlacesService constructor - Using Rails API at:', API_URL);
    }

    /**
     * Search for places using Google Places Autocomplete API
     * @param {string} input - Search query
     * @param {string} types - Place types to search for (default: 'geocode' for all location types)
     * @param {string} language - Language for results (default: 'en')
     * @returns {Promise<Array>} Array of place predictions
     */
    async searchPlaces(input, types = 'geocode', language = 'en') {
        logger.debug('GooglePlacesService.searchPlaces called with:', input);
        if (!input || input.length < 2) {
            logger.debug('Input too short, returning empty array');
            return [];
        }

        try {
            const url = `${API_URL}/api/places/search?query=${encodeURIComponent(input)}&types=${encodeURIComponent(types)}`;
            logger.debug('Calling Rails API:', url);

            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mobile-App': 'true'
                }
            });

            const data = await response.json();
            logger.debug('Rails API response status:', response.status);
            logger.debug('Rails API response data:', data);

            if (response.ok && data.results && data.results.length > 0) {
                logger.debug(`✅ Got ${data.results.length} results from API`);
                return data.results;
            } else {
                logger.error('Rails Places API error:', data.error || 'Unknown error');
                logger.debug('⚠️ Falling back to mock data for query:', input);
                const mockResults = this.getMockResults(input);
                logger.debug(`⚠️ Returning ${mockResults.length} mock results`);
                return mockResults;
            }
        } catch (error) {
            logger.error('Rails Places API network error:', error);
            logger.debug('⚠️ Network error, falling back to mock data');
            return this.getMockResults(input);
        }
    }

    /**
     * Get place details including coordinates
     * @param {string} placeId - Google Places place ID
     * @param {string} fields - Comma-separated list of fields to return
     * @returns {Promise<Object>} Place details object
     */
    async getPlaceDetails(placeId, fields = 'geometry,address_components,formatted_address') {
        try {
            const url = `${API_URL}/api/places/details?place_id=${encodeURIComponent(placeId)}`;
            logger.debug('Calling Rails API for place details:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mobile-App': 'true'
                }
            });

            const data = await response.json();
            logger.debug('Rails API place details response:', data);

            if (response.ok && data.details) {
                return data.details;
            } else {
                logger.error('Rails Places Details API error:', data.error || 'Unknown error');
                // Return mock coordinates for fallback
                return {
                    geometry: {
                        location: {
                            lat: 40.7128,
                            lng: -74.0060
                        }
                    },
                    formatted_address: 'Mock Location',
                    address_components: []
                };
            }
        } catch (error) {
            logger.error('Rails Places Details API network error:', error);
            // Return mock coordinates for fallback
            return {
                geometry: {
                    location: {
                        lat: 40.7128,
                        lng: -74.0060
                    }
                },
                formatted_address: 'Mock Location',
                address_components: []
            };
        }
    }

    /**
     * Parse Google Places result into our location format
     * @param {Object} place - Place object from Google Places
     * @param {Object} placeDetails - Optional place details with coordinates
     * @returns {Object} Standardized location object
     */
    parseLocationData(place, placeDetails = null) {
        const components = placeDetails?.address_components || [];
        
        // Extract location components
        let neighborhood = '';
        let city = '';
        let state = '';
        let country = '';

        components.forEach((component) => {
            const types = component.types;

            if (types.includes('neighborhood') || types.includes('sublocality')) {
                neighborhood = component.long_name;
            } else if (types.includes('locality')) {
                city = component.long_name;
            } else if (types.includes('administrative_area_level_1')) {
                state = component.short_name;
            } else if (types.includes('country')) {
                country = component.short_name;
            }
        });

        // Always parse structured_formatting to enhance or override address_components
        // This ensures neighborhood names like "West Village" are captured correctly
        if (place.structured_formatting) {
            const mainText = place.structured_formatting.main_text;
            const secondary = place.structured_formatting.secondary_text;

            // If secondary text includes a city name (e.g., "Brooklyn, NY, USA" or "Manhattan, NY, USA")
            // then main_text is likely a neighborhood
            if (secondary && secondary.includes(',')) {
                const secondaryParts = secondary.split(', ');
                // First part of secondary is likely the city (e.g., "Brooklyn" or "Manhattan")
                if (secondaryParts.length >= 2) {
                    // Override with structured_formatting data as it's more specific
                    neighborhood = mainText; // Main text is the neighborhood (e.g., "West Village")
                    city = secondaryParts[0]; // First part of secondary is city (e.g., "Manhattan")
                    state = secondaryParts[1]; // Second part is state (e.g., "NY")
                    if (secondaryParts.length > 2) {
                        country = secondaryParts[2]; // Third part is country (e.g., "USA")
                    }
                } else {
                    // Just one part in secondary, main_text is probably city
                    // Only override if we didn't get better data from address_components
                    if (!city) {
                        city = mainText;
                        state = secondaryParts[0];
                    }
                }
            } else {
                // No commas in secondary, main_text is probably the city
                // Only override if we didn't get data from address_components
                if (!city) {
                    city = mainText;
                    if (secondary) {
                        state = secondary;
                    }
                }
            }
        }

        // Create a user-friendly formatted address
        let formattedAddress = '';
        if (neighborhood && city) {
            formattedAddress = `${neighborhood}, ${city}${state ? ', ' + state : ''}`;
        } else if (city) {
            formattedAddress = `${city}${state ? ', ' + state : ''}`;
        } else {
            formattedAddress = placeDetails?.formatted_address || place.description;
        }

        return {
            neighborhood: neighborhood,
            city: city,
            state: state,
            country: country,
            formatted: formattedAddress,
            latitude: placeDetails?.geometry?.location?.lat || null,
            longitude: placeDetails?.geometry?.location?.lng || null,
            place_id: place.place_id
        };
    }

    /**
     * Get mock results for development when API key isn't available
     */
    getMockResults(input) {
        logger.debug('🎭 getMockResults called with:', input);
        logger.debug('📦 Generating mock location data...');

        const mockData = [
            {
                place_id: 'mock_nyc',
                description: 'New York, NY, USA',
                structured_formatting: {
                    main_text: 'New York',
                    secondary_text: 'NY, USA'
                }
            },
            {
                place_id: 'mock_bushwick',
                description: 'Bushwick, Brooklyn, NY, USA',
                structured_formatting: {
                    main_text: 'Bushwick',
                    secondary_text: 'Brooklyn, NY, USA'
                }
            },
            {
                place_id: 'mock_williamsburg',
                description: 'Williamsburg, Brooklyn, NY, USA',
                structured_formatting: {
                    main_text: 'Williamsburg',
                    secondary_text: 'Brooklyn, NY, USA'
                }
            },
            {
                place_id: 'mock_brooklyn',
                description: 'Brooklyn, NY, USA',
                structured_formatting: {
                    main_text: 'Brooklyn',
                    secondary_text: 'NY, USA'
                }
            },
            {
                place_id: 'mock_manhattan',
                description: 'Manhattan, NY, USA',
                structured_formatting: {
                    main_text: 'Manhattan',
                    secondary_text: 'NY, USA'
                }
            },
            {
                place_id: 'mock_soho',
                description: 'SoHo, Manhattan, NY, USA',
                structured_formatting: {
                    main_text: 'SoHo',
                    secondary_text: 'Manhattan, NY, USA'
                }
            },
            {
                place_id: 'mock_la',
                description: 'Los Angeles, CA, USA',
                structured_formatting: {
                    main_text: 'Los Angeles',
                    secondary_text: 'CA, USA'
                }
            },
            {
                place_id: 'mock_san_francisco',
                description: 'San Francisco, CA, USA',
                structured_formatting: {
                    main_text: 'San Francisco',
                    secondary_text: 'CA, USA'
                }
            },
            {
                place_id: 'mock_chicago',
                description: 'Chicago, IL, USA',
                structured_formatting: {
                    main_text: 'Chicago',
                    secondary_text: 'IL, USA'
                }
            },
            {
                place_id: 'mock_london',
                description: 'London, UK',
                structured_formatting: {
                    main_text: 'London',
                    secondary_text: 'UK'
                }
            },
            {
                place_id: 'mock_paris',
                description: 'Paris, France',
                structured_formatting: {
                    main_text: 'Paris',
                    secondary_text: 'France'
                }
            },
            {
                place_id: 'mock_tokyo',
                description: 'Tokyo, Japan',
                structured_formatting: {
                    main_text: 'Tokyo',
                    secondary_text: 'Japan'
                }
            }
        ];

        const filtered = mockData.filter(item => {
            const searchLower = input.toLowerCase();
            const descLower = item.description.toLowerCase();
            const mainTextLower = item.structured_formatting.main_text.toLowerCase();
            const secondaryLower = item.structured_formatting.secondary_text.toLowerCase();

            return descLower.includes(searchLower) ||
                   mainTextLower.includes(searchLower) ||
                   secondaryLower.includes(searchLower);
        });

        logger.debug(`Mock results filtered: ${filtered.length} results for "${input}"`);
        logger.debug('Mock results:', filtered.map(f => f.description));
        return filtered;
    }
}

export default new GooglePlacesService();