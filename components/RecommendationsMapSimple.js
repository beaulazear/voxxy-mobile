import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Linking,
    Platform,
    Dimensions,
    FlatList
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import * as Location from 'expo-location';

const { width: screenWidth } = Dimensions.get('window');

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

export default function RecommendationsMapSimple({ 
    recommendations = [], 
    activityType = 'Restaurant',
    onRecommendationSelect 
}) {
    const [selectedRec, setSelectedRec] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const color = ACTIVITY_COLORS[activityType] || ACTIVITY_COLORS.default;
    const icon = ACTIVITY_ICONS[activityType] || ACTIVITY_ICONS.default;

    // Get user location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                setLoading(false);
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            setUserLocation(location.coords);
            setLoading(false);
        })();
    }, []);

    // Categories for filtering
    const categories = ['all', ...new Set(recommendations.map(r => r.category).filter(Boolean))];

    // Filter recommendations
    const filteredRecommendations = selectedCategory === 'all' 
        ? recommendations 
        : recommendations.filter(rec => rec.category === selectedCategory);

    const openInMaps = (address, name) => {
        const encodedAddress = encodeURIComponent(address);
        const scheme = Platform.select({ 
            ios: `maps:0,0?q=${name}@${encodedAddress}`,
            android: `geo:0,0?q=${encodedAddress}`
        });
        
        Linking.openURL(scheme).catch(() => {
            // Fallback to web
            const url = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            Linking.openURL(url);
        });
    };

    const renderRecommendationCard = ({ item }) => {
        const isSelected = selectedRec?.id === item.id;
        
        return (
            <TouchableOpacity
                style={[
                    styles.card,
                    isSelected && styles.cardSelected
                ]}
                onPress={() => {
                    setSelectedRec(item);
                    if (onRecommendationSelect) {
                        onRecommendationSelect(item);
                    }
                }}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={isSelected 
                        ? [color + '30', color + '15'] 
                        : ['rgba(255,255,255,0.08)', 'rgba(255,255,255,0.04)']}
                    style={styles.cardGradient}
                >
                    <View style={styles.cardHeader}>
                        <View style={[styles.iconBubble, { backgroundColor: color }]}>
                            <Text style={styles.iconText}>{icon}</Text>
                        </View>
                        <View style={styles.cardInfo}>
                            <Text style={styles.cardTitle} numberOfLines={1}>
                                {item.title || item.name}
                            </Text>
                            {item.price_range && (
                                <Text style={styles.cardPrice}>{item.price_range}</Text>
                            )}
                        </View>
                    </View>
                    
                    {item.address && (
                        <View style={styles.addressRow}>
                            <Icon name="map-pin" size={14} color="#999" />
                            <Text style={styles.addressText} numberOfLines={1}>
                                {item.address}
                            </Text>
                        </View>
                    )}
                    
                    {item.description && (
                        <Text style={styles.description} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                    
                    <View style={styles.cardActions}>
                        <TouchableOpacity
                            style={[styles.actionButton, { backgroundColor: color }]}
                            onPress={(e) => {
                                e.stopPropagation();
                                openInMaps(item.address, item.title || item.name);
                            }}
                        >
                            <Icon name="navigation" size={14} color="#FFF" />
                            <Text style={styles.actionButtonText}>Directions</Text>
                        </TouchableOpacity>
                        
                        {item.website && (
                            <TouchableOpacity
                                style={[styles.actionButton, styles.actionButtonSecondary]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    Linking.openURL(item.website);
                                }}
                            >
                                <Icon name="globe" size={14} color={color} />
                                <Text style={[styles.actionButtonText, { color }]}>Website</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={color} />
                <Text style={styles.loadingText}>Loading recommendations...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header with Map Icon */}
            <View style={styles.header}>
                <View style={styles.headerIcon}>
                    <Icon name="map" size={24} color={color} />
                </View>
                <Text style={styles.headerTitle}>Location View</Text>
                <Text style={styles.resultsCount}>
                    {filteredRecommendations.length} places found
                </Text>
            </View>

            {/* Category Filter */}
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

            {/* Recommendations List */}
            <FlatList
                data={filteredRecommendations}
                renderItem={renderRecommendationCard}
                keyExtractor={(item) => item.id || `${item.title}-${item.address}`}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
            />

            {/* Open Full Map Button */}
            <TouchableOpacity
                style={[styles.floatingMapButton, { backgroundColor: color }]}
                onPress={() => {
                    // Open all locations in maps
                    const allAddresses = filteredRecommendations
                        .map(r => r.address)
                        .filter(Boolean)
                        .join(' | ');
                    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(allAddresses)}`;
                    Linking.openURL(url);
                }}
            >
                <Icon name="map" size={20} color="#FFF" />
                <Text style={styles.floatingMapButtonText}>Open in Maps</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = {
    container: {
        flex: 1,
        backgroundColor: 'transparent'
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        color: '#999'
    },
    header: {
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 20
    },
    headerIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4
    },
    resultsCount: {
        fontSize: 13,
        color: '#999'
    },
    categoryScroll: {
        maxHeight: 50,
        marginBottom: 12
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
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 100
    },
    card: {
        marginBottom: 12,
        borderRadius: 16,
        overflow: 'hidden'
    },
    cardSelected: {
        transform: [{ scale: 0.98 }]
    },
    cardGradient: {
        padding: 16
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    iconBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12
    },
    iconText: {
        fontSize: 20
    },
    cardInfo: {
        flex: 1
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2
    },
    cardPrice: {
        fontSize: 14,
        color: '#748FFC',
        fontWeight: '500'
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6
    },
    addressText: {
        flex: 1,
        fontSize: 13,
        color: '#999'
    },
    description: {
        fontSize: 13,
        lineHeight: 18,
        color: '#bbb',
        marginBottom: 12
    },
    cardActions: {
        flexDirection: 'row',
        gap: 8
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        gap: 6
    },
    actionButtonSecondary: {
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)'
    },
    actionButtonText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#FFF'
    },
    floatingMapButton: {
        position: 'absolute',
        bottom: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5
    },
    floatingMapButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF'
    }
};