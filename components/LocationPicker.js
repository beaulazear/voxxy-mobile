import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as Location from 'expo-location';
import { MapPin, Search, ChevronRight } from 'lucide-react-native';
import colors from '../styles/Colors';
import SearchLocationModal from './SearchLocationModal';
import { logger } from '../utils/logger';
import { API_URL } from '../config';

const LocationPicker = ({ onLocationSelect, currentLocation }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);

    // Request device location permission and get coordinates
    const handleUseMyLocation = async () => {
        try {
            setIsLoading(true);

            // Request permission
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Permission',
                    'Location permission is needed to use your current location. You can still search manually.',
                    [{ text: 'OK' }]
                );
                return;
            }

            // Get current location coordinates
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            logger.debug('Got coordinates:', location.coords);

            // Use Google Places Geocoding API for better neighborhood resolution
            try {
                const url = `${API_URL}/api/places/reverse_geocode?lat=${location.coords.latitude}&lng=${location.coords.longitude}`;
                logger.debug('Calling reverse geocode API:', url);

                const response = await fetch(url, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Mobile-App': 'true'
                    }
                });

                const data = await response.json();
                logger.debug('Reverse geocode response:', data);

                if (response.ok && data.results && data.results.length > 0) {
                    // Parse the first result (most specific location)
                    const result = data.results[0];
                    const components = result.address_components || [];

                    let neighborhood = '';
                    let city = '';
                    let state = '';
                    let country = '';
                    let politicalArea = ''; // For places like Brooklyn that are political but not locality

                    logger.debug('Raw address components:', components);

                    // Extract location components with priority for neighborhoods
                    components.forEach((component) => {
                        const types = component.types;
                        const name = component.long_name;

                        if (types.includes('neighborhood')) {
                            neighborhood = name;
                        } else if (types.includes('sublocality') || types.includes('sublocality_level_1')) {
                            if (!neighborhood) neighborhood = name;
                        } else if (types.includes('locality')) {
                            city = name;
                        } else if (types.includes('political') && !types.includes('administrative_area_level_1')) {
                            // Brooklyn, Queens, etc. are often marked as political
                            if (!politicalArea) politicalArea = name;
                        } else if (types.includes('administrative_area_level_1')) {
                            state = component.short_name;
                        } else if (types.includes('country')) {
                            country = component.short_name;
                        }
                    });

                    // Smart fallback logic
                    // If we have a neighborhood but no city, check if politicalArea can be the city
                    if (neighborhood && !city && politicalArea) {
                        // Case: Bed-Stuy (neighborhood) in Brooklyn (political)
                        city = politicalArea;
                        logger.debug('Using political area as city:', city);
                    } else if (!neighborhood && city) {
                        // If we only have a city, that's fine - no neighborhood
                        logger.debug('No neighborhood, only city:', city);
                    } else if (!neighborhood && !city && politicalArea) {
                        // If we only have political area and nothing else, use it as city
                        city = politicalArea;
                        logger.debug('Using political area as only location:', city);
                    }

                    // If still no city, try to extract from formatted_address
                    if (!city && result.formatted_address) {
                        // Try to parse city from formatted address (e.g., "Bed-Stuy, Brooklyn, NY 11216, USA")
                        const parts = result.formatted_address.split(',').map(p => p.trim());
                        if (parts.length >= 2) {
                            // Second part is usually the city
                            if (!city) city = parts[1];
                        }
                    }

                    // Create formatted address
                    let formattedAddress = '';
                    if (neighborhood && city) {
                        formattedAddress = `${neighborhood}, ${city}${state ? ', ' + state : ''}`;
                    } else if (city) {
                        formattedAddress = `${city}${state ? ', ' + state : ''}`;
                    } else if (neighborhood) {
                        formattedAddress = `${neighborhood}${state ? ', ' + state : ''}`;
                    } else {
                        formattedAddress = result.formatted_address || 'Your Location';
                    }

                    const locationData = {
                        neighborhood: neighborhood,
                        city: city,
                        state: state,
                        country: country,
                        formatted: formattedAddress,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };

                    logger.debug('Parsed location data:', locationData);
                    onLocationSelect(locationData);
                } else {
                    throw new Error('No results from reverse geocoding');
                }
            } catch (apiError) {
                // Fallback to Expo's reverse geocoding if API fails
                logger.warn('Google Places API failed, using Expo fallback:', apiError);

                const [address] = await Location.reverseGeocodeAsync({
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude,
                });

                if (address) {
                    const locationData = {
                        neighborhood: address.district || address.subregion || address.street || '',
                        city: address.city || '',
                        state: address.region || '',
                        country: address.country || '',
                        formatted: `${address.city || 'Your Location'}${address.region ? ', ' + address.region : ''}`,
                        latitude: location.coords.latitude,
                        longitude: location.coords.longitude
                    };

                    onLocationSelect(locationData);
                } else {
                    throw new Error('No address data available');
                }
            }
        } catch (error) {
            logger.error('Location error:', error);
            Alert.alert(
                'Location Error',
                'Unable to get your location. Please try searching manually.',
                [{ text: 'OK' }]
            );
        } finally {
            setIsLoading(false);
        }
    };

    // Handle manual search button press
    const handleSearchManually = () => {
        setShowSearchModal(true);
    };

    return (
        <View style={styles.container}>
            {/* Current location display */}
            {currentLocation?.formatted && (
                <View style={styles.currentLocationContainer}>
                    <MapPin size={16} color={colors.primaryButton} />
                    <Text style={styles.currentLocationText}>{currentLocation.formatted}</Text>
                </View>
            )}

            {/* Use My Location Button */}
            <TouchableOpacity
                style={styles.locationButton}
                onPress={handleUseMyLocation}
                disabled={isLoading}
            >
                <View style={styles.locationButtonContent}>
                    <MapPin size={20} color={colors.primaryButton} />
                    <Text style={styles.locationButtonText}>Use My Location</Text>
                </View>
                <View style={styles.locationButtonRight}>
                    {isLoading ? (
                        <ActivityIndicator size="small" color={colors.primaryButton} />
                    ) : (
                        <ChevronRight size={20} color={colors.textMuted} />
                    )}
                </View>
            </TouchableOpacity>

            {/* Search Manually Button */}
            <TouchableOpacity
                style={styles.locationButton}
                onPress={handleSearchManually}
                disabled={isLoading}
            >
                <View style={styles.locationButtonContent}>
                    <Search size={20} color={colors.primaryButton} />
                    <Text style={styles.locationButtonText}>Search Manually</Text>
                </View>
                <ChevronRight size={20} color={colors.textMuted} />
            </TouchableOpacity>

            {/* Search Modal */}
            <SearchLocationModal
                visible={showSearchModal}
                onClose={() => setShowSearchModal(false)}
                onLocationSelect={onLocationSelect}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        marginBottom: 16,
    },
    currentLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderRadius: 8,
        marginBottom: 16,
    },
    currentLocationText: {
        color: colors.textPrimary,
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 8,
        flex: 1,
    },
    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 16,
        marginBottom: 12,
        borderWidth: 1.5,
        borderColor: colors.purple2,
    },
    locationButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
        marginLeft: 12,
    },
    locationButtonRight: {
        marginLeft: 12,
    },
});

export default LocationPicker;