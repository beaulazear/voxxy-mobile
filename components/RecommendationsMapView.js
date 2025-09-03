import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    Linking,
    Platform,
    Dimensions
} from 'react-native';
import MapView, { Marker, PROVIDER_DEFAULT } from 'react-native-maps';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../styles/RecommendationsMapStyles';

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

export default function RecommendationsMapView({ 
    recommendations = [], 
    activityType = 'Restaurant',
    onRecommendationSelect,
    userLocation 
}) {
    const mapRef = useRef(null);
    const [selectedMarker, setSelectedMarker] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [loading, setLoading] = useState(true);
    const [geocodedRecommendations, setGeocodedRecommendations] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [mapType, setMapType] = useState('standard');

    // Categories for filtering
    const categories = useMemo(() => {
        const cats = ['all'];
        const uniqueCategories = new Set();
        recommendations.forEach(rec => {
            if (rec.category) uniqueCategories.add(rec.category);
        });
        return [...cats, ...Array.from(uniqueCategories)];
    }, [recommendations]);

    // Geocode addresses to coordinates
    useEffect(() => {
        const geocodeAddresses = async () => {
            setLoading(true);
            const geocoded = [];
            
            for (const rec of recommendations) {
                if (rec.address) {
                    try {
                        // Using Apple's geocoding service through native module
                        const searchURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(rec.address)}&limit=1`;
                        const response = await fetch(searchURL);
                        const data = await response.json();
                        
                        if (data && data.length > 0) {
                            geocoded.push({
                                ...rec,
                                coordinate: {
                                    latitude: parseFloat(data[0].lat),
                                    longitude: parseFloat(data[0].lon)
                                }
                            });
                        }
                    } catch (error) {
                        console.log('Geocoding error for:', rec.address);
                        // Fallback: try to extract city and use approximate coordinates
                        // For demo purposes, using a default location
                        geocoded.push({
                            ...rec,
                            coordinate: null
                        });
                    }
                }
            }
            
            setGeocodedRecommendations(geocoded.filter(r => r.coordinate));
            
            // Set initial map region based on geocoded locations
            if (geocoded.length > 0 && geocoded[0].coordinate) {
                const validCoords = geocoded.filter(r => r.coordinate);
                if (validCoords.length > 0) {
                    const latitudes = validCoords.map(r => r.coordinate.latitude);
                    const longitudes = validCoords.map(r => r.coordinate.longitude);
                    
                    const minLat = Math.min(...latitudes);
                    const maxLat = Math.max(...latitudes);
                    const minLon = Math.min(...longitudes);
                    const maxLon = Math.max(...longitudes);
                    
                    setMapRegion({
                        latitude: (minLat + maxLat) / 2,
                        longitude: (minLon + maxLon) / 2,
                        latitudeDelta: Math.max(0.01, (maxLat - minLat) * 1.2),
                        longitudeDelta: Math.max(0.01, (maxLon - minLon) * 1.2)
                    });
                }
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
            setLoading(false);
        }
    }, [recommendations, userLocation]);

    // Filter recommendations based on selected category
    const filteredRecommendations = useMemo(() => {
        if (selectedCategory === 'all') {
            return geocodedRecommendations;
        }
        return geocodedRecommendations.filter(rec => rec.category === selectedCategory);
    }, [geocodedRecommendations, selectedCategory]);

    const handleMarkerPress = (recommendation) => {
        setSelectedMarker(recommendation);
        
        // Animate to selected marker
        if (mapRef.current && recommendation.coordinate) {
            mapRef.current.animateToRegion({
                ...recommendation.coordinate,
                latitudeDelta: 0.01,
                longitudeDelta: 0.01
            }, 1000);
        }
    };

    const handleGetDirections = (recommendation) => {
        if (!recommendation.coordinate) return;
        
        const scheme = Platform.select({ ios: 'maps:', android: 'geo:' });
        const url = Platform.select({
            ios: `${scheme}${recommendation.coordinate.latitude},${recommendation.coordinate.longitude}?q=${encodeURIComponent(recommendation.address)}`,
            android: `${scheme}${recommendation.coordinate.latitude},${recommendation.coordinate.longitude}?q=${encodeURIComponent(recommendation.address)}`
        });
        
        Linking.openURL(url).catch(err => {
            Alert.alert('Error', 'Unable to open maps');
        });
    };

    const handleCallPlace = (phone) => {
        if (!phone) return;
        Linking.openURL(`tel:${phone}`).catch(err => {
            Alert.alert('Error', 'Unable to make call');
        });
    };

    const handleVisitWebsite = (website) => {
        if (!website) return;
        Linking.openURL(website).catch(err => {
            Alert.alert('Error', 'Unable to open website');
        });
    };

    const renderCustomMarker = (recommendation) => {
        const color = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.default;
        const icon = ACTIVITY_ICONS[activityType] || ACTIVITY_ICONS.default;
        const isSelected = selectedMarker?.id === recommendation.id;
        
        return (
            <View style={[styles.markerContainer, isSelected && styles.selectedMarker]}>
                <View style={[styles.markerBubble, { backgroundColor: color }]}>
                    <Text style={styles.markerIcon}>{icon}</Text>
                </View>
                <View style={styles.markerArrow} />
            </View>
        );
    };


    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={ACTIVITY_COLORS[activityType]} />
                <Text style={styles.loadingText}>Loading map...</Text>
            </View>
        );
    }

    if (!mapRegion) {
        return (
            <View style={styles.errorContainer}>
                <Icon name="alert-triangle" size={48} color="#FF6B6B" />
                <Text style={styles.errorText}>Unable to load map</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Map Controls */}
            <View style={styles.mapControls}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                >
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
                                {cat === 'all' ? 'All' : cat}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                
                <View style={styles.mapTypeToggle}>
                    <TouchableOpacity
                        style={[styles.mapTypeButton, mapType === 'standard' && styles.mapTypeButtonActive]}
                        onPress={() => setMapType('standard')}
                    >
                        <Icon name="map" size={20} color={mapType === 'standard' ? '#FFF' : '#666'} />
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.mapTypeButton, mapType === 'satellite' && styles.mapTypeButtonActive]}
                        onPress={() => setMapType('satellite')}
                    >
                        <Icon name="globe" size={20} color={mapType === 'satellite' ? '#FFF' : '#666'} />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Map View */}
            <MapView
                ref={mapRef}
                style={styles.map}
                provider={PROVIDER_DEFAULT}
                initialRegion={mapRegion}
                mapType={mapType}
                showsUserLocation={true}
                showsMyLocationButton={true}
                showsCompass={true}
                showsScale={true}
            >
                {filteredRecommendations.map((recommendation) => (
                    <Marker
                        key={recommendation.id || `${recommendation.title}-${recommendation.address}`}
                        coordinate={recommendation.coordinate}
                        onPress={() => handleMarkerPress(recommendation)}
                        stopPropagation={true}
                        tracksViewChanges={false}
                    >
                        {renderCustomMarker(recommendation)}
                    </Marker>
                ))}
            </MapView>

            {/* Selected Place Card */}
            {selectedMarker && (
                <View style={styles.selectedCard}>
                    <TouchableOpacity
                        style={styles.selectedCardClose}
                        onPress={() => setSelectedMarker(null)}
                    >
                        <Icon name="x" size={24} color="#666" />
                    </TouchableOpacity>
                    
                    <Text style={styles.selectedCardTitle}>
                        {selectedMarker.title || selectedMarker.name}
                    </Text>
                    
                    {selectedMarker.address && (
                        <View style={styles.selectedCardRow}>
                            <Icon name="map-pin" size={16} color="#666" />
                            <Text style={styles.selectedCardText} numberOfLines={2}>
                                {selectedMarker.address}
                            </Text>
                        </View>
                    )}
                    
                    {selectedMarker.hours && (
                        <View style={styles.selectedCardRow}>
                            <Icon name="clock" size={16} color="#666" />
                            <Text style={styles.selectedCardText}>
                                {selectedMarker.hours}
                            </Text>
                        </View>
                    )}
                    
                    {selectedMarker.price_range && (
                        <View style={styles.selectedCardRow}>
                            <Icon name="dollar-sign" size={16} color="#666" />
                            <Text style={styles.selectedCardText}>
                                {selectedMarker.price_range}
                            </Text>
                        </View>
                    )}
                    
                    <View style={styles.selectedCardActions}>
                        <TouchableOpacity
                            style={styles.selectedCardButton}
                            onPress={() => handleGetDirections(selectedMarker)}
                        >
                            <Icon name="map" size={20} color="#FFF" />
                            <Text style={styles.selectedCardButtonText}>Directions</Text>
                        </TouchableOpacity>
                        
                        {onRecommendationSelect && (
                            <TouchableOpacity
                                style={styles.selectedCardButton}
                                onPress={() => {
                                    onRecommendationSelect(selectedMarker);
                                    setSelectedMarker(null);
                                }}
                            >
                                <Icon name="info" size={20} color="#FFF" />
                                <Text style={styles.selectedCardButtonText}>Details</Text>
                            </TouchableOpacity>
                        )}
                        
                        {selectedMarker.phone && (
                            <TouchableOpacity
                                style={[styles.selectedCardButton, styles.selectedCardButtonSecondary]}
                                onPress={() => handleCallPlace(selectedMarker.phone)}
                            >
                                <Icon name="phone" size={20} color="#748FFC" />
                            </TouchableOpacity>
                        )}
                        
                        {selectedMarker.website && (
                            <TouchableOpacity
                                style={[styles.selectedCardButton, styles.selectedCardButtonSecondary]}
                                onPress={() => handleVisitWebsite(selectedMarker.website)}
                            >
                                <Icon name="globe" size={20} color="#748FFC" />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Results count */}
            <View style={styles.resultsCount}>
                <Text style={styles.resultsCountText}>
                    {filteredRecommendations.length} places found
                </Text>
            </View>
        </View>
    );
}