import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    Alert,
    ActivityIndicator,
    TextInput,
    Linking,
    Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import {
    Map,
    List,
    X,
    MapPin,
    Search,
    Navigation,
    Share2,
    Heart,
    Calendar,
} from 'react-native-feather';
import { LinearGradient } from 'expo-linear-gradient';
import NativeMapView from '../components/NativeMapView';
import FavoriteDetailModal from '../components/FavoriteDetailModal';
import ShareFavoriteModal from '../components/ShareFavoriteModal';
import VoxxyFooter from '../components/VoxxyFooter';
import { API_URL } from '../config';
import { safeAuthApiCall } from '../utils/safeApiCall';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';
import VoxxyLogo from '../assets/header.svg';

export default function FavoritesScreen({ route }) {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();
    const [userFavorites, setUserFavorites] = useState([]);
    const [loadingFavorites, setLoadingFavorites] = useState(true);
    const [viewMode, setViewMode] = useState('list'); // 'map' or 'list'
    const [selectedFavorite, setSelectedFavorite] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [shareModalVisible, setShareModalVisible] = useState(false);
    const [favoriteToShare, setFavoriteToShare] = useState(null);

    // Handle shared favorite from deep link
    useEffect(() => {
        if (route?.params?.sharedFavorite) {
            const shared = route.params.sharedFavorite;
            logger.info('Opening shared favorite:', shared);

            // Show the shared favorite in detail modal
            setSelectedFavorite({
                id: shared.id,
                name: shared.name,
                title: shared.name,
                address: shared.address,
                latitude: parseFloat(shared.latitude),
                longitude: parseFloat(shared.longitude),
            });
        }
    }, [route?.params?.sharedFavorite]);

    // Get user location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Location Access',
                    'Voxxy needs location access to show places near you on the map. You can enable this in Settings.',
                    [
                        { text: 'Cancel', style: 'cancel' },
                        { text: 'Open Settings', onPress: () => Linking.openSettings() }
                    ]
                );
                // Set default to San Francisco
                setMapRegion({
                    latitude: 37.7749,
                    longitude: -122.4194,
                    latitudeDelta: 0.1,
                    longitudeDelta: 0.1,
                });
                return;
            }

            let location = await Location.getCurrentPositionAsync({});
            const userLoc = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            };
            setUserLocation(userLoc);

            // Set initial region to user location
            const region = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                latitudeDelta: 0.1,
                longitudeDelta: 0.1,
            };
            setMapRegion(region);
        })();
    }, []);

    // Fetch user favorites
    useEffect(() => {
        if (user?.token) {
            fetchUserFavorites();
        }
    }, [user?.token]);

    const fetchUserFavorites = async () => {
        if (!user?.token) return;
        
        setLoadingFavorites(true);
        try {
            const data = await safeAuthApiCall(
                `${API_URL}/user_activities/favorited`,
                user.token,
                { method: 'GET' }
            );
            
            if (data) {
                setUserFavorites(data);

                // Calculate optimal map region to show all favorites
                // Only override the region if we don't already have user location set
                if (data.length > 0 && !mapRegion && !userLocation) {
                    const validFavorites = data.filter(f => f.latitude && f.longitude);

                    if (validFavorites.length > 0) {
                        const lats = validFavorites.map(f => parseFloat(f.latitude));
                        const lngs = validFavorites.map(f => parseFloat(f.longitude));

                        const minLat = Math.min(...lats);
                        const maxLat = Math.max(...lats);
                        const minLng = Math.min(...lngs);
                        const maxLng = Math.max(...lngs);

                        const midLat = (minLat + maxLat) / 2;
                        const midLng = (minLng + maxLng) / 2;

                        // Add some padding to the deltas
                        const latDelta = Math.max(0.05, (maxLat - minLat) * 1.5);
                        const lngDelta = Math.max(0.05, (maxLng - minLng) * 1.5);

                        const newRegion = {
                            latitude: midLat,
                            longitude: midLng,
                            latitudeDelta: latDelta,
                            longitudeDelta: lngDelta,
                        };
                        setMapRegion(newRegion);
                    }
                }
            }
        } catch (error) {
            logger.error('Error fetching favorites:', error);
        } finally {
            setLoadingFavorites(false);
        }
    };

    // Delete a favorite
    const deleteFavorite = async (favoriteId) => {
        if (!user?.token) return;
        
        try {
            await safeAuthApiCall(
                `${API_URL}/user_activities/${favoriteId}`,
                user.token,
                { method: 'DELETE' }
            );
            
            // Update local state
            setUserFavorites(prev => prev.filter(f => f.id !== favoriteId));
        } catch (error) {
            Alert.alert('Error', 'Failed to remove favorite');
        }
    };

    const handleDeleteFavorite = (item) => {
        Alert.alert(
            'Remove Favorite',
            'Are you sure you want to remove this favorite?',
            [
                { text: 'Cancel', style: 'cancel' },
                { 
                    text: 'Remove', 
                    style: 'destructive',
                    onPress: () => deleteFavorite(item.id)
                }
            ]
        );
    };

    // Convert favorites to map markers
    const getMapMarkers = () => {
        const markers = [];
        
        userFavorites.forEach(fav => {
            // Data should be directly on the favorite from /user_activities/favorited endpoint
            if (fav.latitude && fav.longitude) {
                // If we have coordinates, use them directly
                markers.push({
                    id: fav.id,
                    coordinate: {
                        latitude: parseFloat(fav.latitude),
                        longitude: parseFloat(fav.longitude),
                    },
                    title: fav.title || fav.name,
                    address: fav.address,
                    description: fav.address,
                    price_range: fav.price_range,
                    pinColor: '#9333ea',
                });
            } else if (fav.address) {
                // If we only have address, let NativeMapView geocode it
                markers.push({
                    id: fav.id,
                    title: fav.title || fav.name,
                    address: fav.address,
                    description: fav.address,
                    price_range: fav.price_range,
                    pinColor: '#9333ea',
                });
            }
        });
        
        return markers;
    };

    // Filter favorites based on search and category
    const getFilteredFavorites = () => {
        let filtered = userFavorites;

        // Search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();

            // Filter and add relevance score
            filtered = filtered
                .filter((fav) => {
                    // Get the displayed title (same logic as in renderListItem)
                    const displayedTitle = (fav.title || fav.name || fav.activity_name || 'Unnamed').toLowerCase();

                    // Prioritize searching the displayed title first, then fallback to other fields
                    return displayedTitle.includes(query) ||
                           fav.address?.toLowerCase().includes(query) ||
                           fav.description?.toLowerCase().includes(query);
                })
                .map((fav) => {
                    // Calculate relevance score for sorting
                    const displayedTitle = (fav.title || fav.name || fav.activity_name || 'Unnamed').toLowerCase();
                    let score = 0;

                    // Exact match in title (highest priority)
                    if (displayedTitle === query) {
                        score = 1000;
                    }
                    // Title starts with query (high priority)
                    else if (displayedTitle.startsWith(query)) {
                        score = 500;
                    }
                    // Title contains query (medium priority)
                    else if (displayedTitle.includes(query)) {
                        score = 100;
                    }
                    // Address contains query (lower priority)
                    else if (fav.address?.toLowerCase().includes(query)) {
                        score = 50;
                    }
                    // Description contains query (lowest priority)
                    else if (fav.description?.toLowerCase().includes(query)) {
                        score = 10;
                    }

                    return { ...fav, relevanceScore: score };
                })
                .sort((a, b) => b.relevanceScore - a.relevanceScore);
        }

        // Category filter - you can expand this based on your data structure
        if (selectedCategory !== 'all') {
            filtered = filtered.filter((fav) => {
                // Add category logic here if you have category data
                // For now, using price_range as a proxy
                if (selectedCategory === 'budget' && fav.price_range) {
                    return fav.price_range.includes('$') && !fav.price_range.includes('$$$$');
                }
                if (selectedCategory === 'upscale' && fav.price_range) {
                    return fav.price_range.includes('$$$');
                }
                return true;
            });
        }

        return filtered;
    };

    const handleNavigate = (item) => {
        if (item.latitude && item.longitude) {
            const url = `https://maps.apple.com/?daddr=${item.latitude},${item.longitude}`;
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open maps');
            });
        } else if (item.address) {
            const address = encodeURIComponent(item.address);
            const url = `https://maps.apple.com/?address=${address}`;
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open maps');
            });
        }
    };

    const handleShare = (item) => {
        setFavoriteToShare(item);
        setShareModalVisible(true);
    };

    const renderListItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => setSelectedFavorite(item)}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={['rgba(42, 30, 46, 0.8)', 'rgba(32, 25, 37, 0.9)']}
                    style={styles.listItemGradient}
                >
                    <View style={styles.listItemContent}>
                        <View style={styles.listItemHeader}>
                            <Text style={styles.listItemTitle} numberOfLines={2}>
                                {item.title || item.name || item.activity_name || 'Unnamed'}
                            </Text>
                            {item.price_range && (
                                <View style={styles.priceTag}>
                                    <Text style={styles.priceTagText}>{item.price_range}</Text>
                                </View>
                            )}
                        </View>

                        {item.description && (
                            <Text style={styles.listItemDescription} numberOfLines={2}>
                                {item.description}
                            </Text>
                        )}

                        <View style={styles.listItemMeta}>
                            <MapPin color="rgba(255, 255, 255, 0.5)" size={14} />
                            <Text style={styles.listItemAddress} numberOfLines={1}>
                                {item.address ? item.address.split(',').slice(0, 2).join(',') : 'Location not specified'}
                            </Text>
                        </View>

                        {item.created_at && (
                            <View style={styles.listItemFooter}>
                                <Calendar color="rgba(255, 255, 255, 0.4)" size={12} />
                                <Text style={styles.listItemDate}>
                                    {new Date(item.created_at).toLocaleDateString('en-US', {
                                        month: 'short',
                                        day: 'numeric',
                                        year: 'numeric',
                                    })}
                                </Text>
                            </View>
                        )}
                    </View>

                    {/* Quick Actions */}
                    <View style={styles.listItemActions}>
                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleNavigate(item);
                            }}
                        >
                            <Navigation color="#9333ea" size={18} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleShare(item);
                            }}
                        >
                            <Share2 color="#3b82f6" size={18} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionIcon, styles.deleteIcon]}
                            onPress={(e) => {
                                e.stopPropagation();
                                handleDeleteFavorite(item);
                            }}
                        >
                            <X color="#ef4444" size={18} />
                        </TouchableOpacity>
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    const filteredFavorites = getFilteredFavorites();

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header with view mode toggles */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoGlow}>
                            <VoxxyLogo height={36} width={120} />
                        </View>
                    </View>
                    {/* View Mode Toggle in Header */}
                    {userFavorites.length > 0 && !loadingFavorites && (
                        <View style={styles.headerViewModeToggle}>
                            <TouchableOpacity
                                style={[styles.headerToggleButton, viewMode === 'list' && styles.headerToggleButtonActive]}
                                onPress={() => setViewMode('list')}
                            >
                                <List color={viewMode === 'list' ? '#fff' : 'rgba(255, 255, 255, 0.6)'} size={18} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.headerToggleButton, viewMode === 'map' && styles.headerToggleButtonActive]}
                                onPress={() => setViewMode('map')}
                            >
                                <Map color={viewMode === 'map' ? '#fff' : 'rgba(255, 255, 255, 0.6)'} size={18} />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
                <LinearGradient
                    colors={['#B954EC', '#667eea', '#B954EC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerBorder}
                />
            </View>

            {/* Search Bar - Only show in list view */}
            {viewMode === 'list' && !loadingFavorites && (
                <View style={styles.searchBarContainer}>
                    <View style={styles.searchBar}>
                        <Search color="rgba(255, 255, 255, 0.5)" size={18} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search favorites..."
                            placeholderTextColor="rgba(255, 255, 255, 0.4)"
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                        {searchQuery.length > 0 && (
                            <TouchableOpacity onPress={() => setSearchQuery('')}>
                                <X color="rgba(255, 255, 255, 0.5)" size={18} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            {/* Content */}
            {loadingFavorites ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={styles.loadingText}>Loading your favorites...</Text>
                    <Text style={styles.loadingSubtext}>This will only take a moment</Text>
                </View>
            ) : viewMode === 'map' ? (
                <View style={styles.mapContainer}>
                    <NativeMapView
                        recommendations={getMapMarkers()}
                        initialRegion={mapRegion}
                        onMarkerPress={(marker) => {
                            const favorite = userFavorites.find((f) => f.id === marker.id);
                            if (favorite) {
                                setSelectedFavorite(favorite);
                            }
                        }}
                        style={styles.map}
                        showUserLocation={true}
                    />
                    {userFavorites.length === 0 && (
                        <View style={styles.emptyMapOverlay}>
                            <Heart color="rgba(255, 255, 255, 0.3)" size={64} />
                            <Text style={styles.emptyText}>No favorites saved yet</Text>
                            <Text style={styles.emptySubtext}>
                                Save your favorite places from activities to see them here
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <FlatList
                    data={
                        searchQuery.trim()
                            ? filteredFavorites // Already sorted by relevance when searching
                            : filteredFavorites.sort(
                                  (a, b) =>
                                      new Date(b.created_at || '1970-01-01') -
                                      new Date(a.created_at || '1970-01-01')
                              )
                    }
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderListItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                    onScrollBeginDrag={() => Keyboard.dismiss()}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Heart color="rgba(255, 255, 255, 0.3)" size={64} />
                            <Text style={styles.emptyText}>
                                {searchQuery ? 'No favorites match your search' : 'No favorites saved yet'}
                            </Text>
                            <Text style={styles.emptySubtext}>
                                {searchQuery
                                    ? 'Try a different search term'
                                    : 'Save your favorite places from activities to see them here'}
                            </Text>
                        </View>
                    )}
                />
            )}

            {/* Detail Modal */}
            <FavoriteDetailModal
                visible={selectedFavorite !== null}
                onClose={() => setSelectedFavorite(null)}
                favorite={selectedFavorite}
                isFavorited={true}
                onToggleFavorite={() => {
                    if (selectedFavorite) {
                        handleDeleteFavorite(selectedFavorite);
                        setSelectedFavorite(null);
                    }
                }}
            />

            {/* Share Modal */}
            <ShareFavoriteModal
                visible={shareModalVisible}
                onClose={() => {
                    setShareModalVisible(false);
                    setFavoriteToShare(null);
                }}
                favorite={favoriteToShare}
            />

            <VoxxyFooter />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        marginTop: 12,
    },
    loadingSubtext: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    headerContainer: {
        backgroundColor: '#201925',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        paddingHorizontal: 20,
        backgroundColor: '#201925',
    },

    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGlow: {
        shadowColor: '#9f2fce',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 12,
    },

    headerViewModeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 10,
        padding: 3,
        gap: 4,
    },

    headerToggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerToggleButtonActive: {
        backgroundColor: 'rgba(147, 51, 234, 0.3)',
    },

    searchBarContainer: {
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 12,
    },
    headerBorder: {
        height: 2,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        gap: 12,
    },
    searchInput: {
        flex: 1,
        color: '#fff',
        fontSize: 15,
        fontWeight: '500',
    },
    viewModeToggle: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 4,
    },
    toggleButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        gap: 6,
    },
    toggleButtonActive: {
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
    },
    toggleButtonText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '600',
    },
    toggleButtonTextActive: {
        color: '#fff',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    emptyMapOverlay: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        alignItems: 'center',
        marginTop: -50,
        padding: 20,
    },
    listContainer: {
        padding: 20,
        paddingBottom: 100, // Add padding for fixed footer
        flexGrow: 1,
    },
    listItem: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    listItemGradient: {
        flexDirection: 'row',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: 16,
    },
    listItemContent: {
        flex: 1,
    },
    listItemHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    listItemTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        marginRight: 12,
    },
    priceTag: {
        backgroundColor: 'rgba(251, 191, 36, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
    },
    priceTagText: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '700',
    },
    listItemDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    listItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 6,
    },
    listItemAddress: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    listItemFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    listItemDate: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
    },
    listItemActions: {
        flexDirection: 'column',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginLeft: 12,
        gap: 8,
    },
    actionIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    deleteIcon: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    listSeparator: {
        height: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 8,
        textAlign: 'center',
    },
    emptySubtext: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
});