import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Modal,
    ScrollView,
    ActivityIndicator,
    SafeAreaView,
    Keyboard,
} from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import colors from '../styles/Colors';
import GooglePlacesService from '../services/GooglePlacesService';
import { logger } from '../utils/logger';

const SearchLocationModal = ({ visible, onClose, onLocationSelect }) => {
    const [searchText, setSearchText] = useState('');
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const searchTimeout = useRef(null);
    const searchInputRef = useRef(null);

    // Focus input when modal opens
    useEffect(() => {
        if (visible) {
            logger.debug('🚪 SearchLocationModal opened, attempting to focus input...');
            // Longer delay to ensure modal is fully mounted, especially in nested contexts
            const timer = setTimeout(() => {
                logger.debug('🎯 Focusing search input');
                searchInputRef.current?.focus();
            }, 700);
            return () => clearTimeout(timer);
        } else {
            logger.debug('🚪 SearchLocationModal closed, clearing state');
            // Clear search when modal closes
            setSearchText('');
            setSuggestions([]);
        }
    }, [visible]);

    // Search places using Google Places API
    const searchPlaces = async (query) => {
        logger.debug('🔍 SearchLocationModal.searchPlaces called with:', query);
        if (!query || query.length < 2) {
            logger.debug('Query too short, clearing suggestions');
            setSuggestions([]);
            return;
        }

        try {
            setIsLoading(true);
            logger.debug('🌐 Calling GooglePlacesService.searchPlaces...');

            // Pass 'geocode' to get all location types including neighborhoods
            const results = await GooglePlacesService.searchPlaces(query, 'geocode');
            logger.debug(`📍 Got ${results.length} search results:`, results);
            setSuggestions(results);
        } catch (error) {
            logger.error('❌ Places search error:', error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle search input changes with debouncing
    const handleSearchChange = (text) => {
        logger.debug('⌨️  Search text changed to:', text);
        setSearchText(text);

        // Clear previous timeout
        if (searchTimeout.current) {
            clearTimeout(searchTimeout.current);
        }

        // Set new timeout for search debouncing
        searchTimeout.current = setTimeout(() => {
            logger.debug(`⏰ Debounce complete, searching for: "${text}"`);
            searchPlaces(text);
        }, 300);
    };

    // Handle location selection from suggestions
    const handleLocationSelect = async (place) => {
        try {
            setIsLoading(true);
            
            // Get detailed place information including coordinates
            const placeDetails = await GooglePlacesService.getPlaceDetails(place.place_id);
            const locationData = GooglePlacesService.parseLocationData(place, placeDetails);
            
            logger.debug('Selected location:', locationData);
            
            onLocationSelect(locationData);
            onClose();
        } catch (error) {
            logger.error('Error getting place details:', error);
            // Fallback to basic parsing without coordinates
            const locationData = GooglePlacesService.parseLocationData(place);
            onLocationSelect(locationData);
            onClose();
        } finally {
            setIsLoading(false);
        }
    };

    const handleClose = () => {
        Keyboard.dismiss();
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                        <X size={24} color={colors.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Search Location</Text>
                    <View style={styles.placeholder} />
                </View>

                {/* Search Input */}
                <View style={styles.searchContainer}>
                    <View style={styles.searchInputContainer}>
                        <Search size={20} color={colors.textMuted} style={styles.searchIcon} />
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            value={searchText}
                            onChangeText={handleSearchChange}
                            placeholder="Search neighborhood, city (e.g. Bushwick, Brooklyn)"
                            placeholderTextColor={colors.textMuted}
                            autoCorrect={false}
                            autoCapitalize="words"
                            returnKeyType="search"
                        />
                        {isLoading && (
                            <ActivityIndicator size="small" color={colors.primaryButton} style={styles.loadingIcon} />
                        )}
                    </View>
                </View>

                {/* Search Results */}
                <ScrollView 
                    style={styles.resultsContainer}
                    keyboardShouldPersistTaps="handled"
                    showsVerticalScrollIndicator={false}
                >
                    {searchText.length === 0 && (
                        <View style={styles.instructionsContainer}>
                            <MapPin size={48} color={colors.textMuted} style={styles.instructionIcon} />
                            <Text style={styles.instructionTitle}>Find Your Location</Text>
                            <Text style={styles.instructionText}>
                                Start typing your city, neighborhood, or area to see suggestions
                            </Text>
                        </View>
                    )}

                    {searchText.length > 0 && suggestions.length === 0 && !isLoading && (
                        <View style={styles.noResultsContainer}>
                            <Text style={styles.noResultsText}>
                                No locations found for "{searchText}"
                            </Text>
                            <Text style={styles.noResultsSubtext}>
                                Try searching for a city or region
                            </Text>
                        </View>
                    )}

                    {suggestions.map((suggestion, index) => (
                        <TouchableOpacity
                            key={suggestion.place_id}
                            style={[
                                styles.suggestionItem,
                                index === suggestions.length - 1 && styles.lastSuggestionItem
                            ]}
                            onPress={() => handleLocationSelect(suggestion)}
                            disabled={isLoading}
                        >
                            <MapPin size={20} color={colors.primaryButton} style={styles.suggestionIcon} />
                            <View style={styles.suggestionText}>
                                <Text style={styles.suggestionMain}>
                                    {suggestion.structured_formatting?.main_text || suggestion.description}
                                </Text>
                                {suggestion.structured_formatting?.secondary_text && (
                                    <Text style={styles.suggestionSecondary}>
                                        {suggestion.structured_formatting.secondary_text}
                                    </Text>
                                )}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: colors.purple2,
    },
    closeButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    placeholder: {
        width: 40,
    },
    searchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: colors.purple2,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchIcon: {
        marginRight: 12,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        color: colors.textPrimary,
        paddingVertical: 4,
    },
    loadingIcon: {
        marginLeft: 12,
    },
    resultsContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    instructionsContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 32,
    },
    instructionIcon: {
        marginBottom: 16,
    },
    instructionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 8,
        textAlign: 'center',
    },
    instructionText: {
        fontSize: 16,
        color: colors.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
    noResultsContainer: {
        paddingVertical: 40,
        alignItems: 'center',
    },
    noResultsText: {
        fontSize: 16,
        fontWeight: '500',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    noResultsSubtext: {
        fontSize: 14,
        color: colors.textMuted,
    },
    suggestionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: colors.purple2,
    },
    lastSuggestionItem: {
        borderBottomWidth: 0,
    },
    suggestionIcon: {
        marginRight: 16,
    },
    suggestionText: {
        flex: 1,
    },
    suggestionMain: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    suggestionSecondary: {
        color: colors.textMuted,
        fontSize: 14,
    },
});

export default SearchLocationModal;