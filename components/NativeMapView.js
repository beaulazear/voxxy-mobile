import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Dimensions,
    Image,
    StyleSheet
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Feather';
import * as Location from 'expo-location';
import * as Haptics from 'expo-haptics';
import { logger } from '../utils/logger';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ACTIVITY_COLORS = {
    Restaurant: '#FF6B6B',
    Bar: '#4ECDC4',
    Cafe: '#FFD93D',
    Activity: '#6BCF7F',
    Shopping: '#95E1D3',
    Entertainment: '#A8E6CF',
    GameNight: '#BB86FC',
    Cocktail: '#FF8B94',
    default: '#748FFC'
};

const ACTIVITY_ICONS = {
    Restaurant: '🍽️',
    Bar: '🍷',
    Cafe: '☕',
    Activity: '🎯',
    Shopping: '🛍️',
    Entertainment: '🎭',
    GameNight: '🎮',
    Cocktail: '🍸',
    default: '📍'
};

export default function NativeMapView({
    recommendations = [],
    activityType = 'Restaurant',
    onMarkerPress,
    initialRegion = null
}) {
    const mapRef = useRef(null);
    const mapReadyTimeoutRef = useRef(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geocodedRecommendations, setGeocodedRecommendations] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    const color = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.default;
    const icon = ACTIVITY_ICONS[activityType] || ACTIVITY_ICONS.default;

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (mapReadyTimeoutRef.current) {
                clearTimeout(mapReadyTimeoutRef.current);
                mapReadyTimeoutRef.current = null;
            }
        };
    }, []);

    // Get user location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                logger.debug('Location permission denied');
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude
            });
        })();
    }, []);

    // Geocode addresses to coordinates
    useEffect(() => {
        const geocodeAddresses = async () => {
            logger.debug('Starting geocoding for', recommendations.length, 'recommendations');
            setLoading(true);
            const geocoded = [];

            for (const rec of recommendations) {
                // Check if coordinates already exist
                if (rec.coordinate && rec.coordinate.latitude && rec.coordinate.longitude) {
                    logger.debug('Using existing coordinates for:', rec.title);
                    geocoded.push(rec);
                } else if (rec.address) {
                    try {
                        // Try to geocode using Expo Location
                        const geocodeResult = await Location.geocodeAsync(rec.address);

                        if (geocodeResult && geocodeResult.length > 0) {
                            geocoded.push({
                                ...rec,
                                coordinate: {
                                    latitude: geocodeResult[0].latitude,
                                    longitude: geocodeResult[0].longitude
                                }
                            });
                        } else {
                            // Fallback: generate demo coordinates for testing
                            const latOffset = (Math.random() - 0.5) * 0.1;
                            const lonOffset = (Math.random() - 0.5) * 0.1;

                            geocoded.push({
                                ...rec,
                                coordinate: {
                                    latitude: 37.7749 + latOffset,
                                    longitude: -122.4194 + lonOffset
                                }
                            });
                        }
                    } catch (error) {
                        logger.debug('Geocoding error for:', rec.address);
                        // Fallback coordinates
                        const latOffset = (Math.random() - 0.5) * 0.1;
                        const lonOffset = (Math.random() - 0.5) * 0.1;

                        geocoded.push({
                            ...rec,
                            coordinate: {
                                latitude: 37.7749 + latOffset,
                                longitude: -122.4194 + lonOffset
                            }
                        });
                    }
                }
            }

            logger.debug('Geocoded', geocoded.length, 'locations');
            setGeocodedRecommendations(geocoded);

            // Set initial map region based on priority:
            // 1. Use initialRegion prop if provided (e.g., user location from parent)
            // 2. Calculate region from geocoded locations
            // 3. Fall back to user location
            // 4. Default to San Francisco
            if (initialRegion) {
                logger.debug('Using provided initialRegion');
                setMapRegion(initialRegion);
                // Don't auto-animate when initialRegion is provided
            } else if (geocoded.length > 0) {
                const latitudes = geocoded.map(r => r.coordinate.latitude);
                const longitudes = geocoded.map(r => r.coordinate.longitude);

                const minLat = Math.min(...latitudes);
                const maxLat = Math.max(...latitudes);
                const minLon = Math.min(...longitudes);
                const maxLon = Math.max(...longitudes);

                const region = {
                    latitude: (minLat + maxLat) / 2,
                    longitude: (minLon + maxLon) / 2,
                    latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.2),
                    longitudeDelta: Math.max(0.01, (maxLon - minLon) * 1.2)
                };

                setMapRegion(region);

                // Animate to region after map loads
                setTimeout(() => {
                    if (mapRef.current) {
                        mapRef.current.animateToRegion(region, 1000);
                    }
                }, 500);
            } else if (userLocation) {
                // Fallback to user location
                setMapRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                });
            } else {
                // Default location (San Francisco)
                setMapRegion({
                    latitude: 37.7749,
                    longitude: -122.4194,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                });
            }

            setLoading(false);
        };

        if (recommendations.length > 0) {
            geocodeAddresses();
        } else {
            // Set default region when no recommendations
            // Prioritize initialRegion prop if provided
            if (initialRegion) {
                setMapRegion(initialRegion);
            } else if (userLocation) {
                setMapRegion({
                    latitude: userLocation.latitude,
                    longitude: userLocation.longitude,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                });
            } else {
                // Default to San Francisco
                setMapRegion({
                    latitude: 37.7749,
                    longitude: -122.4194,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421
                });
            }
            setLoading(false);
        }
    }, [recommendations, initialRegion]);

    // Categories for filtering
    const categories = [...new Set(recommendations.map(r => r.category).filter(Boolean))];

    // Filter recommendations based on selected category
    const filteredRecommendations = !selectedCategory 
        ? geocodedRecommendations 
        : geocodedRecommendations.filter(rec => rec.category === selectedCategory);

    const handleMarkerPress = (recommendation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        // Call parent callback
        if (onMarkerPress) {
            onMarkerPress(recommendation);
        }
    };


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={color} />
                <Text style={styles.loadingText}>Loading map...</Text>
                <Text style={styles.debugText}>Recommendations: {recommendations.length}</Text>
            </View>
        );
    }

    if (!mapRegion) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-triangle" size={48} color="#FF6B6B" />
                <Text style={styles.errorText}>Unable to load map</Text>
                <Text style={styles.debugText}>
                    Region: null | Geocoded: {geocodedRecommendations.length}
                </Text>
            </View>
        );
    }

    // Log for debugging
    logger.debug('Rendering map with region:', mapRegion);
    logger.debug('Filtered recommendations:', filteredRecommendations.length);

    return (
        <View style={styles.container}>
            {/* Category Filter - Only show if there are categories */}
            {categories.length > 0 && (
                <View style={styles.categoryContainer}>
                    <ScrollView 
                        horizontal 
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.categoryScroll}
                    >
                        {/* Show All button if a category is selected */}
                        {selectedCategory && (
                            <TouchableOpacity
                                style={styles.categoryChip}
                                onPress={() => setSelectedCategory(null)}
                            >
                                <Text style={styles.categoryChipText}>
                                    Show All
                                </Text>
                            </TouchableOpacity>
                        )}
                        
                        {categories.map(cat => (
                            <TouchableOpacity
                                key={cat}
                                style={[
                                    styles.categoryChip,
                                    selectedCategory === cat && styles.categoryChipActive
                                ]}
                                onPress={() => setSelectedCategory(cat)}
                            >
                                <Text style={[
                                    styles.categoryChipText,
                                    selectedCategory === cat && styles.categoryChipTextActive
                                ]}>
                                    {cat}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            )}

            {/* Native Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={mapRegion || {
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onMapReady={() => {
                    logger.debug('Map ready');
                    // Only fit to show all markers if initialRegion was NOT provided
                    // If initialRegion is provided, respect that zoom level (user location centered)
                    if (!initialRegion && mapRef.current && filteredRecommendations.length > 0) {
                        logger.debug('Animating to show all markers');
                        // Clear any existing timeout
                        if (mapReadyTimeoutRef.current) {
                            clearTimeout(mapReadyTimeoutRef.current);
                        }

                        mapReadyTimeoutRef.current = setTimeout(() => {
                            // Check again if mapRef still exists (component might have unmounted)
                            if (mapRef.current && filteredRecommendations.length > 0) {
                                mapRef.current.fitToCoordinates(
                                    filteredRecommendations.map(r => r.coordinate),
                                    {
                                        edgePadding: { top: 100, right: 50, bottom: 50, left: 50 },
                                        animated: true,
                                    }
                                );
                            }
                        }, 500);
                    }
                }}
                mapType="standard"
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                zoomEnabled={true}
                scrollEnabled={true}
                rotateEnabled={false}
                pitchEnabled={false}
                showsPointsOfInterest={false}
                showsBuildings={false}
            >
                {filteredRecommendations.map((recommendation, index) => (
                    <Marker
                        key={`${recommendation.id || index}-${recommendation.isFavorite ? 'fav' : 'unfav'}`}
                        coordinate={recommendation.coordinate}
                        onPress={() => handleMarkerPress(recommendation)}
                        tracksViewChanges={recommendation.isFavorite}
                        stopPropagation={true}
                    >
                        <View style={[
                            styles.vLogoMarkerContainer,
                            recommendation.isFavorite && styles.favoriteMarkerContainer
                        ]}>
                            <View style={[
                                styles.vLogoMarkerOuter,
                                recommendation.isFavorite && styles.favoriteMarkerOuter
                            ]}>
                                <View style={[
                                    styles.vLogoMarkerInner,
                                    recommendation.isFavorite && styles.favoriteMarkerInner
                                ]}>
                                    <Image 
                                        source={require('../assets/voxxy-triangle.png')} 
                                        style={styles.vLogoImage}
                                        resizeMode="contain"
                                    />
                                </View>
                            </View>
                            <View style={[
                                styles.vLogoMarkerPointer,
                                recommendation.isFavorite && styles.favoriteMarkerPointer
                            ]} />
                            {recommendation.isFavorite && (
                                <View style={styles.favoriteStarBadge}>
                                    <Icon name="star" size={10} color="#FFD700" />
                                </View>
                            )}
                        </View>
                    </Marker>
                ))}
            </MapView>


            {/* Map Controls */}
            <View style={styles.mapControls}>
                {/* Center on all markers button */}
                <TouchableOpacity
                    style={styles.mapControlButton}
                    onPress={() => {
                        if (mapRef.current && filteredRecommendations.length > 0) {
                            mapRef.current.fitToCoordinates(
                                filteredRecommendations.map(r => r.coordinate),
                                {
                                    edgePadding: { top: 150, right: 50, bottom: 100, left: 50 },
                                    animated: true,
                                }
                            );
                        }
                    }}
                >
                    <Icon name="maximize-2" size={20} color="#cc31e8" />
                </TouchableOpacity>

                {/* Center on user location */}
                {userLocation && (
                    <TouchableOpacity
                        style={styles.mapControlButton}
                        onPress={() => {
                            if (mapRef.current && userLocation) {
                                mapRef.current.animateToRegion({
                                    ...userLocation,
                                    latitudeDelta: 0.01,
                                    longitudeDelta: 0.01
                                }, 1000);
                            }
                        }}
                    >
                        <Icon name="navigation" size={20} color="#cc31e8" />
                    </TouchableOpacity>
                )}
            </View>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        overflow: 'visible'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#201925'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#999',
        fontWeight: '500'
    },
    debugText: {
        marginTop: 8,
        fontSize: 12,
        color: '#666'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#201925'
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#FF6B6B',
        fontWeight: '500'
    },
    categoryContainer: {
        position: 'absolute',
        top: 50,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 15
    },
    categoryScroll: {
        paddingVertical: 10
    },
    categoryChip: {
        paddingHorizontal: 18,
        paddingVertical: 10,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        marginRight: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    },
    categoryChipActive: {
        backgroundColor: '#cc31e8',
        borderColor: '#cc31e8',
        shadowOpacity: 0.25,
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333'
    },
    categoryChipTextActive: {
        color: '#FFF'
    },
    map: {
        flex: 1,
        width: '100%',
        height: '100%'
    },
    markerContainer: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#cc31e8',
        borderWidth: 4,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 8
    },
    markerEmoji: {
        fontSize: 24
    },
    vLogoMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center'
    },
    vLogoMarkerOuter: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#7B3FF2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 12,
        borderWidth: 2,
        borderColor: 'rgba(123, 63, 242, 0.1)'
    },
    vLogoMarkerInner: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.1)'
    },
    vLogoImage: {
        width: 26,
        height: 26,
        tintColor: '#7B3FF2'
    },
    vLogoMarkerPointer: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 10,
        borderStyle: 'solid',
        backgroundColor: 'transparent',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: 'white',
        marginTop: -2,
        shadowColor: '#7B3FF2',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
    },
    // Favorite marker styles
    favoriteMarkerContainer: {
        transform: [{ scale: 1.1 }],
    },
    favoriteMarkerOuter: {
        backgroundColor: '#FFD700',
        shadowColor: '#FFD700',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.5,
        shadowRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 215, 0, 0.2)',
    },
    favoriteMarkerInner: {
        backgroundColor: '#FFA500',
        borderColor: 'rgba(255, 165, 0, 0.3)',
        borderWidth: 1,
    },
    favoriteMarkerPointer: {
        borderTopColor: '#FFD700',
        shadowColor: '#FFD700',
    },
    favoriteStarBadge: {
        position: 'absolute',
        top: -6,
        right: -6,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
        borderWidth: 2,
        borderColor: '#FFD700',
    },
    resultsCount: {
        position: 'absolute',
        top: 120,
        alignSelf: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    resultsCountText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF'
    },
    mapControls: {
        position: 'absolute',
        right: 20,
        top: 20,
        gap: 12
    },
    mapControlButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'white',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)'
    }
});