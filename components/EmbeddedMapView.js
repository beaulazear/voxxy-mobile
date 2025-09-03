import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ActivityIndicator,
    ScrollView,
    Dimensions
} from 'react-native';
import { WebView } from 'react-native-webview';
import Icon from 'react-native-vector-icons/Feather';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const ACTIVITY_COLORS = {
    Restaurant: '#FF6B6B',
    Bar: '#4ECDC4',
    Cafe: '#FFD93D',
    Activity: '#6BCF7F',
    default: '#748FFC'
};

export default function EmbeddedMapView({ 
    recommendations = [], 
    activityType = 'Restaurant',
    onRecommendationSelect 
}) {
    const webViewRef = useRef(null);
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('all');
    
    const color = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.default;

    // Categories for filtering
    const categories = ['all', ...new Set(recommendations.map(r => r.category).filter(Boolean))];

    // Filter recommendations
    const filteredRecommendations = selectedCategory === 'all' 
        ? recommendations 
        : recommendations.filter(rec => rec.category === selectedCategory);

    // Create simple map HTML that will definitely work
    const mapHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f0f0f0;
        }
        #map { 
            width: 100vw; 
            height: 100vh; 
        }
        .place-card {
            background: white;
            border-radius: 12px;
            padding: 12px;
            margin: 8px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
            cursor: pointer;
            transition: transform 0.2s;
        }
        .place-card:active {
            transform: scale(0.98);
        }
        .place-title {
            font-size: 16px;
            font-weight: 600;
            color: #333;
            margin-bottom: 4px;
        }
        .place-address {
            font-size: 13px;
            color: #666;
            margin-bottom: 8px;
        }
        .place-button {
            background: ${color};
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 8px;
            font-size: 13px;
            font-weight: 600;
            width: 100%;
        }
        .loading {
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            color: #999;
        }
    </style>
</head>
<body>
    <div id="map">
        <iframe
            width="100%"
            height="100%"
            frameborder="0"
            style="border:0"
            src="https://www.openstreetmap.org/export/embed.html?bbox=-122.5194,37.7249,-122.3194,37.8249&layer=mapnik"
            allowfullscreen>
        </iframe>
    </div>
    
    <script>
        // Send ready message
        window.onload = function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('ready');
            }
        };
    </script>
</body>
</html>
    `;

    // Alternative: Use Google Maps Embed (simpler, more reliable)
    const googleMapsHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <style>
        * { margin: 0; padding: 0; }
        body { margin: 0; padding: 0; }
        #map-container { 
            width: 100vw; 
            height: 100vh;
            position: relative;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: 0;
        }
    </style>
</head>
<body>
    <div id="map-container">
        <iframe
            src="https://maps.google.com/maps?q=${encodeURIComponent(filteredRecommendations.map(r => r.address).join('|'))}&t=&z=13&ie=UTF8&iwloc=&output=embed"
            frameborder="0"
            scrolling="no"
            marginheight="0"
            marginwidth="0">
        </iframe>
    </div>
    <script>
        setTimeout(function() {
            if (window.ReactNativeWebView) {
                window.ReactNativeWebView.postMessage('ready');
            }
        }, 500);
    </script>
</body>
</html>
    `;

    const handleWebViewMessage = (event) => {
        console.log('WebView message:', event.nativeEvent.data);
        if (event.nativeEvent.data === 'ready') {
            setMapLoaded(true);
        }
    };

    return (
        <View style={styles.container}>
            {/* Category Filter */}
            <View style={styles.headerContainer}>
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
                
                <Text style={styles.resultsText}>
                    {filteredRecommendations.length} locations • Tap markers to view details
                </Text>
            </View>

            {/* Embedded Map */}
            <View style={styles.mapContainer}>
                {!mapLoaded && (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={color} />
                        <Text style={styles.loadingText}>Loading map...</Text>
                    </View>
                )}
                
                <WebView
                    ref={webViewRef}
                    source={{ html: googleMapsHTML }}
                    style={[styles.webView, { opacity: mapLoaded ? 1 : 0 }]}
                    onMessage={handleWebViewMessage}
                    javaScriptEnabled={true}
                    domStorageEnabled={true}
                    scrollEnabled={true}
                    scalesPageToFit={true}
                    onLoadEnd={() => {
                        console.log('WebView load complete');
                        // Fallback in case message doesn't work
                        setTimeout(() => setMapLoaded(true), 1000);
                    }}
                />
            </View>

            {/* List of Places Below Map */}
            <ScrollView style={styles.placesList} showsVerticalScrollIndicator={false}>
                {filteredRecommendations.map((rec, index) => (
                    <TouchableOpacity
                        key={rec.id || index}
                        style={styles.placeCard}
                        onPress={() => onRecommendationSelect && onRecommendationSelect(rec)}
                    >
                        <Text style={styles.placeTitle}>{rec.title || rec.name}</Text>
                        {rec.address && (
                            <Text style={styles.placeAddress}>{rec.address}</Text>
                        )}
                        <View style={styles.placeActions}>
                            <Text style={styles.viewDetails}>View Details →</Text>
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
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
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)'
    },
    categoryScroll: {
        paddingHorizontal: 16,
        marginBottom: 8
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
    resultsText: {
        textAlign: 'center',
        fontSize: 12,
        color: '#999',
        paddingHorizontal: 16
    },
    mapContainer: {
        height: screenHeight * 0.4,
        position: 'relative'
    },
    webView: {
        flex: 1
    },
    loadingContainer: {
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
    placesList: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 12
    },
    placeCard: {
        backgroundColor: 'rgba(255,255,255,0.08)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8
    },
    placeTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4
    },
    placeAddress: {
        fontSize: 13,
        color: '#999',
        marginBottom: 8
    },
    placeActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end'
    },
    viewDetails: {
        fontSize: 13,
        color: '#748FFC',
        fontWeight: '600'
    }
};