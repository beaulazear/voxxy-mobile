import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions,
    Platform
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';
import * as Location from 'expo-location';

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

export default function InteractiveMapView({ 
    recommendations = [], 
    activityType = 'Restaurant',
    onRecommendationSelect 
}) {
    const webViewRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [mapReady, setMapReady] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [geocodedRecommendations, setGeocodedRecommendations] = useState([]);
    const [userLocation, setUserLocation] = useState(null);
    const [error, setError] = useState(null);

    const color = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.default;
    const icon = ACTIVITY_ICONS[activityType] || ACTIVITY_ICONS.default;

    // Get user location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                return;
            }
            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location.coords);
        })();
    }, []);

    // Geocode addresses
    useEffect(() => {
        const geocodeAddresses = async () => {
            const geocoded = [];
            
            // Skip geocoding for now - use demo coordinates for testing
            for (const rec of recommendations) {
                if (rec.address) {
                    // Generate demo coordinates around San Francisco
                    const latOffset = (Math.random() - 0.5) * 0.1;
                    const lonOffset = (Math.random() - 0.5) * 0.1;
                    
                    geocoded.push({
                        ...rec,
                        lat: 37.7749 + latOffset,
                        lon: -122.4194 + lonOffset
                    });
                }
            }
            
            console.log('Geocoded recommendations:', geocoded.length);
            setGeocodedRecommendations(geocoded);
        };

        if (recommendations.length > 0) {
            geocodeAddresses();
        } else {
            // If no recommendations, show empty map
            setGeocodedRecommendations([]);
            setLoading(false);
        }
    }, [recommendations]);

    // Categories for filtering
    const categories = ['all', ...new Set(recommendations.map(r => r.category).filter(Boolean))];

    // Filter recommendations
    const filteredRecommendations = selectedCategory === 'all' 
        ? geocodedRecommendations 
        : geocodedRecommendations.filter(rec => rec.category === selectedCategory);

    // Generate the HTML for the map
    const generateMapHTML = () => {
        // Simplified version for testing
        if (filteredRecommendations.length === 0) {
            return `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        body { 
                            margin: 0; 
                            padding: 20px;
                            background: #f0f0f0;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        }
                        .message {
                            text-align: center;
                            padding: 40px;
                            background: white;
                            border-radius: 12px;
                            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                        }
                        h2 { color: #333; }
                        p { color: #666; }
                    </style>
                </head>
                <body>
                    <div class="message">
                        <h2>No locations to display</h2>
                        <p>Recommendations will appear here once loaded</p>
                    </div>
                    <script>
                        setTimeout(function() {
                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
                        }, 100);
                    </script>
                </body>
                </html>
            `;
        }
        
        // Full map generation
        const markers = filteredRecommendations.map(rec => ({
            lat: rec.lat,
            lon: rec.lon,
            title: rec.title || rec.name,
            description: rec.description || '',
            address: rec.address || '',
            price: rec.price_range || '',
            id: rec.id,
            color: color,
            icon: icon
        }));

        // Calculate center and zoom
        let centerLat = 37.7749; // Default SF
        let centerLon = -122.4194;
        let zoom = 12;

        if (markers.length > 0) {
            const lats = markers.map(m => m.lat);
            const lons = markers.map(m => m.lon);
            centerLat = lats.reduce((a, b) => a + b) / lats.length;
            centerLon = lons.reduce((a, b) => a + b) / lons.length;
            
            // Calculate zoom based on spread
            const latSpread = Math.max(...lats) - Math.min(...lats);
            const lonSpread = Math.max(...lons) - Math.min(...lons);
            const maxSpread = Math.max(latSpread, lonSpread);
            
            if (maxSpread < 0.01) zoom = 15;
            else if (maxSpread < 0.05) zoom = 13;
            else if (maxSpread < 0.1) zoom = 12;
            else if (maxSpread < 0.5) zoom = 10;
            else zoom = 9;
        } else if (userLocation) {
            centerLat = userLocation.latitude;
            centerLon = userLocation.longitude;
        }

        return `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <style>
        body { margin: 0; padding: 0; }
        #map { width: 100vw; height: 100vh; }
        .custom-marker {
            background: ${color};
            border-radius: 50%;
            width: 40px;
            height: 40px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            border: 3px solid white;
        }
        .leaflet-popup-content {
            margin: 8px;
            min-width: 200px;
        }
        .popup-title {
            font-weight: bold;
            font-size: 16px;
            margin-bottom: 4px;
            color: #333;
        }
        .popup-price {
            color: ${color};
            font-weight: 500;
            margin-bottom: 4px;
        }
        .popup-address {
            color: #666;
            font-size: 13px;
            margin-bottom: 8px;
        }
        .popup-description {
            color: #888;
            font-size: 12px;
            line-height: 1.4;
        }
        .popup-button {
            background: ${color};
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 13px;
            font-weight: 600;
            margin-top: 8px;
            width: 100%;
            cursor: pointer;
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <script>
        // Initialize map
        var map = L.map('map', {
            zoomControl: true,
            attributionControl: false
        }).setView([${centerLat}, ${centerLon}], ${zoom});

        // Add tile layer (using OpenStreetMap)
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
            attribution: ''
        }).addTo(map);

        // Add markers
        var markers = ${JSON.stringify(markers)};
        var leafletMarkers = [];

        markers.forEach(function(marker) {
            // Create custom icon
            var customIcon = L.divIcon({
                className: 'custom-div-icon',
                html: '<div class="custom-marker">' + marker.icon + '</div>',
                iconSize: [40, 40],
                iconAnchor: [20, 40],
                popupAnchor: [0, -40]
            });

            // Create marker
            var leafletMarker = L.marker([marker.lat, marker.lon], { icon: customIcon })
                .addTo(map);

            // Create popup content
            var popupContent = '<div class="popup-content">' +
                '<div class="popup-title">' + marker.title + '</div>' +
                (marker.price ? '<div class="popup-price">' + marker.price + '</div>' : '') +
                (marker.address ? '<div class="popup-address">📍 ' + marker.address + '</div>' : '') +
                (marker.description ? '<div class="popup-description">' + marker.description + '</div>' : '') +
                '<button class="popup-button" onclick="selectRecommendation(\'' + marker.id + '\')">View Details</button>' +
                '</div>';

            leafletMarker.bindPopup(popupContent);
            leafletMarkers.push(leafletMarker);
        });

        // Fit bounds to show all markers
        if (leafletMarkers.length > 0) {
            var group = new L.featureGroup(leafletMarkers);
            map.fitBounds(group.getBounds().pad(0.1));
        }

        // Add user location if available
        ${userLocation ? `
            var userIcon = L.divIcon({
                className: 'user-location',
                html: '<div style="background: #4285F4; border-radius: 50%; width: 16px; height: 16px; border: 3px solid white; box-shadow: 0 2px 8px rgba(0,0,0,0.3);"></div>',
                iconSize: [22, 22],
                iconAnchor: [11, 11]
            });
            L.marker([${userLocation.latitude}, ${userLocation.longitude}], { icon: userIcon })
                .addTo(map)
                .bindPopup('Your Location');
        ` : ''}

        // Function to send selection back to React Native
        function selectRecommendation(id) {
            window.ReactNativeWebView.postMessage(JSON.stringify({
                type: 'select',
                id: id
            }));
        }

        // Tell React Native the map is ready
        setTimeout(function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'ready' }));
            }
        }, 100);
    </script>
</body>
</html>
        `;
    };  // This closes the generateMapHTML function

    const handleMessage = (event) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);
            console.log('WebView message:', data);
            
            if (data.type === 'ready') {
                setMapReady(true);
                setLoading(false);
            } else if (data.type === 'select') {
                const selected = filteredRecommendations.find(r => r.id === data.id);
                if (selected && onRecommendationSelect) {
                    onRecommendationSelect(selected);
                }
            }
        } catch (error) {
            console.log('Error parsing WebView message:', error);
        }
    };

    const updateMapMarkers = () => {
        if (webViewRef.current && mapReady) {
            webViewRef.current.reload();
        }
    };

    useEffect(() => {
        if (mapReady) {
            updateMapMarkers();
        }
    }, [selectedCategory]);

    // Add timeout fallback
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (loading) {
                console.log('Map loading timeout - using simple view');
                setLoading(false);
                // Don't set error, just hide loading
            }
        }, 8000); // 8 second timeout

        return () => clearTimeout(timeout);
    }, [loading]);

    return (
        <View style={styles.container}>
            {/* Category Filter */}
            <View style={styles.headerContainer}>
                <ScrollView 
                    horizontal 
                    showsHorizontalScrollIndicator={false}
                    style={styles.categoryScroll}
                    contentContainerStyle={styles.categoryScrollContent}
                >
                    {categories.map(cat => (
                        <TouchableOpacity
                            key={cat}
                            style={[
                                styles.categoryChip,
                                selectedCategory === cat && styles.categoryChipActive,
                                selectedCategory === cat && { backgroundColor: color }
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
                
                <View style={styles.resultsCount}>
                    <Text style={styles.resultsCountText}>
                        {filteredRecommendations.length} places
                    </Text>
                </View>
            </View>

            {/* Map WebView */}
            <View style={styles.mapContainer}>
                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color={color} />
                        <Text style={styles.loadingText}>Loading map...</Text>
                    </View>
                )}
                
                {error ? (
                    <View style={styles.errorContainer}>
                        <Icon name="alert-triangle" size={48} color="#FF6B6B" />
                        <Text style={styles.errorText}>Unable to load map</Text>
                        <Text style={styles.errorSubtext}>Please try again later</Text>
                    </View>
                ) : (
                    <WebView
                        ref={webViewRef}
                        source={{ html: generateMapHTML() }}
                        style={styles.webView}
                        onMessage={handleMessage}
                        onError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView error: ', nativeEvent);
                            setError('Map failed to load');
                            setLoading(false);
                        }}
                        onHttpError={(syntheticEvent) => {
                            const { nativeEvent } = syntheticEvent;
                            console.warn('WebView HTTP error: ', nativeEvent);
                        }}
                        onLoadEnd={() => {
                            console.log('WebView loaded');
                        }}
                        javaScriptEnabled={true}
                        domStorageEnabled={true}
                        startInLoadingState={false}
                        scrollEnabled={false}
                        bounces={false}
                        originWhitelist={['*']}
                        mixedContentMode="always"
                    />
                )}
            </View>
        </View>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: '#201925'
    },
    headerContainer: {
        backgroundColor: 'rgba(0,0,0,0.3)',
        paddingTop: 12,
        paddingBottom: 8,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    categoryScroll: {
        maxHeight: 50
    },
    categoryScrollContent: {
        paddingHorizontal: 16,
        gap: 8
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.08)',
        marginRight: 8
    },
    categoryChipActive: {
        backgroundColor: '#748FFC'
    },
    categoryChipText: {
        fontSize: 13,
        fontWeight: '500',
        color: '#999'
    },
    categoryChipTextActive: {
        color: '#FFF'
    },
    resultsCount: {
        alignItems: 'center',
        marginTop: 8
    },
    resultsCountText: {
        fontSize: 12,
        color: '#999'
    },
    mapContainer: {
        flex: 1,
        position: 'relative'
    },
    webView: {
        flex: 1
    },
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#201925',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999'
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
    errorSubtext: {
        marginTop: 8,
        fontSize: 14,
        color: '#999'
    }
};