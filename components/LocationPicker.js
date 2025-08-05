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

            // Get current location
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.Balanced,
            });

            // Reverse geocode to get address
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });

            if (address) {
                const locationData = {
                    neighborhood: address.district || address.subregion || '',
                    city: address.city || '',
                    state: address.region || '',
                    country: address.country || '',
                    formatted: `${address.city}, ${address.region}, ${address.country}`,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                };

                onLocationSelect(locationData);
            }
        } catch (error) {
            console.error('Location error:', error);
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