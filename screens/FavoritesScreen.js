import React, { useState, useEffect, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Map, List, X, MapPin, DollarSign } from 'react-native-feather';
import NativeMapView from '../components/NativeMapView';
import { API_URL } from '../config';
import { safeAuthApiCall } from '../utils/safeApiCall';
import * as Location from 'expo-location';

export default function FavoritesScreen() {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();
    const [userFavorites, setUserFavorites] = useState([]);
    const [loadingFavorites, setLoadingFavorites] = useState(true);
    const [viewMode, setViewMode] = useState('map'); // 'map' or 'list'
    const [selectedFavorite, setSelectedFavorite] = useState(null);
    const [mapRegion, setMapRegion] = useState(null);
    const [userLocation, setUserLocation] = useState(null);

    // Get user location
    useEffect(() => {
        (async () => {
            let { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
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
            setUserLocation({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            });
            
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
                if (data.length > 0 && !mapRegion) {
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
            console.error('Error fetching favorites:', error);
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

    const renderListItem = ({ item }) => {
        return (
            <TouchableOpacity
                style={styles.listItem}
                onPress={() => setSelectedFavorite(item)}
                activeOpacity={0.7}
            >
                <View style={styles.listItemContent}>
                    <Text style={styles.listItemTitle}>{item.title || 'Unnamed'}</Text>
                    <View style={styles.listItemMeta}>
                        <MapPin color="rgba(255, 255, 255, 0.6)" size={14} />
                        <Text style={styles.listItemAddress}>
                            {item.address ? item.address.split(',')[0] : 'Location not specified'}
                        </Text>
                    </View>
                    {item.price_range && (
                        <View style={styles.listItemPriceContainer}>
                            <DollarSign color="#fbbf24" size={14} />
                            <Text style={styles.listItemPrice}>{item.price_range}</Text>
                        </View>
                    )}
                    {item.created_at && (
                        <Text style={styles.listItemDate}>
                            Saved {new Date(item.created_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                            })}
                        </Text>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={(e) => {
                        e.stopPropagation();
                        handleDeleteFavorite(item);
                    }}
                >
                    <X color="#ff6b6b" size={18} />
                </TouchableOpacity>
            </TouchableOpacity>
        );
    };

    if (loadingFavorites) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={styles.loadingText}>Loading favorites...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft color="#fff" size={20} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>My Favorites</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.favoritesCount}>{userFavorites.length}</Text>
                </View>
            </View>

            {/* View Mode Toggle */}
            <View style={styles.viewModeToggle}>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'map' && styles.toggleButtonActive
                    ]}
                    onPress={() => setViewMode('map')}
                >
                    <Map color={viewMode === 'map' ? '#fff' : 'rgba(255, 255, 255, 0.6)'} size={18} />
                    <Text style={[
                        styles.toggleButtonText,
                        viewMode === 'map' && styles.toggleButtonTextActive
                    ]}>Map</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[
                        styles.toggleButton,
                        viewMode === 'list' && styles.toggleButtonActive
                    ]}
                    onPress={() => setViewMode('list')}
                >
                    <List color={viewMode === 'list' ? '#fff' : 'rgba(255, 255, 255, 0.6)'} size={18} />
                    <Text style={[
                        styles.toggleButtonText,
                        viewMode === 'list' && styles.toggleButtonTextActive
                    ]}>List</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            {viewMode === 'map' ? (
                <View style={styles.mapContainer}>
                    {!loadingFavorites ? (
                        <NativeMapView
                            recommendations={getMapMarkers()}
                            onMarkerPress={(marker) => {
                                const favorite = userFavorites.find(f => f.id === marker.id);
                                if (favorite) {
                                    setSelectedFavorite(favorite);
                                }
                            }}
                            style={styles.map}
                            showUserLocation={true}
                        />
                    ) : (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#9333ea" />
                            <Text style={styles.loadingText}>Loading favorites...</Text>
                        </View>
                    )}
                    {userFavorites.length === 0 && !loadingFavorites && (
                        <View style={styles.emptyMapOverlay}>
                            <Text style={styles.emptyText}>No favorites saved yet</Text>
                            <Text style={styles.emptySubtext}>
                                Save your favorite places from activities to see them here
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <FlatList
                    data={userFavorites.sort((a, b) => 
                        new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01')
                    )}
                    keyExtractor={(item) => String(item.id)}
                    renderItem={renderListItem}
                    contentContainerStyle={styles.listContainer}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                    ListEmptyComponent={() => (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No favorites saved yet</Text>
                            <Text style={styles.emptySubtext}>
                                Save your favorite places from activities to see them here
                            </Text>
                        </View>
                    )}
                />
            )}
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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
    },
    headerRight: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    favoritesCount: {
        color: '#9333ea',
        fontSize: 16,
        fontWeight: '600',
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
        flexGrow: 1,
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    listItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    listItemAddress: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginLeft: 6,
        flex: 1,
    },
    listItemPriceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
    },
    listItemPrice: {
        color: '#fbbf24',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 4,
    },
    listItemDate: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        marginTop: 4,
    },
    deleteButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        alignSelf: 'center',
    },
    listSeparator: {
        height: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 8,
    },
    emptySubtext: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});