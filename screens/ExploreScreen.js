import React, { useState, useEffect, useContext, useMemo, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Linking,
    Animated,
    FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Map, List } from 'react-native-feather';
import { LinearGradient } from 'expo-linear-gradient';
import NativeMapView from '../components/NativeMapView';
import FavoriteDetailModal from '../components/FavoriteDetailModal';
import CommunityFeedItem from '../components/CommunityFeedItem';
import VoxxyFooter from '../components/VoxxyFooter';
import * as Location from 'expo-location';
import { logger } from '../utils/logger';
import { fetchCommunityFavorites } from '../utils/api';
import { getUserDisplayImage } from '../utils/avatarManager';
import { API_URL } from '../config';
import VoxxyLogo from '../assets/header.svg';

export default function ExploreScreen() {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();
    const [mapRegion, setMapRegion] = useState(null);
    const [userLocation, setUserLocation] = useState(null);
    const [loadingLocation, setLoadingLocation] = useState(true);
    const [communityFavorites, setCommunityFavorites] = useState([]);
    const [loadingFavorites, setLoadingFavorites] = useState(true);
    const [selectedFavorite, setSelectedFavorite] = useState(null);
    const [selectedUser, setSelectedUser] = useState(null);
    const [viewMode, setViewMode] = useState('map');
    const [infoCardVisible, setInfoCardVisible] = useState(true);
    const fadeAnim = useRef(new Animated.Value(1)).current;

    // Auto-fade info card after 3 seconds
    useEffect(() => {
        if (!loadingLocation && !loadingFavorites) {
            const timer = setTimeout(() => {
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }).start(() => {
                    setInfoCardVisible(false);
                });
            }, 3000);

            return () => clearTimeout(timer);
        }
    }, [loadingLocation, loadingFavorites, fadeAnim]);

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
                    latitudeDelta: 0.05,
                    longitudeDelta: 0.05,
                });
                setLoadingLocation(false);
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
                latitudeDelta: 0.05,
                longitudeDelta: 0.05,
            };
            setMapRegion(region);
            setLoadingLocation(false);
        })();
    }, []);

    // Fetch community favorites (all of them, we'll filter client-side)
    useEffect(() => {
        const loadCommunityFavorites = async () => {
            if (!user?.token) {
                setLoadingFavorites(false);
                return;
            }

            try {
                setLoadingFavorites(true);
                // Fetch all community favorites (not filtering by coordinates at API level)
                const data = await fetchCommunityFavorites(user.token, false);

                logger.debug('Fetched community favorites:', data.length);

                // Filter out invalid items (items without user or favorite data)
                const validData = (data || []).filter(item => {
                    return item && item.user && item.favorite && item.favorite.title;
                });

                logger.debug('Valid community favorites:', validData.length);
                setCommunityFavorites(validData);
            } catch (error) {
                logger.error('Error loading community favorites:', error);
                setCommunityFavorites([]);
            } finally {
                setLoadingFavorites(false);
            }
        };

        loadCommunityFavorites();
    }, [user?.token]);

    // Transform community favorites to map markers with profile photos
    // Include ALL favorites - NativeMapView will geocode addresses if needed
    // Memoize to prevent map reload on modal open/close
    const mapMarkers = useMemo(() => {
        const markers = [];

        communityFavorites.forEach((item) => {
            const { user: itemUser, favorite, created_at } = item;

            // Get user profile image
            const profileImage = getUserDisplayImage(itemUser, API_URL);
            const profilePhotoUri = profileImage?.uri || null;

            // If we have coordinates, use them directly
            if (favorite.latitude && favorite.longitude) {
                markers.push({
                    id: favorite.id,
                    coordinate: {
                        latitude: parseFloat(favorite.latitude),
                        longitude: parseFloat(favorite.longitude),
                    },
                    title: favorite.title,
                    address: favorite.address,
                    description: favorite.description,
                    price_range: favorite.price_range,
                    pinColor: '#9333ea',
                    // Add profile photo data
                    profilePhoto: profilePhotoUri,
                    userName: itemUser.name,
                    // Store the full favorite object and user for detail modal
                    fullData: { ...favorite, created_at },
                    userData: itemUser,
                });
            } else if (favorite.address) {
                // If we only have address, let NativeMapView geocode it
                markers.push({
                    id: favorite.id,
                    title: favorite.title,
                    address: favorite.address,
                    description: favorite.description,
                    price_range: favorite.price_range,
                    pinColor: '#9333ea',
                    // Add profile photo data
                    profilePhoto: profilePhotoUri,
                    userName: itemUser.name,
                    // Store the full favorite object and user for detail modal
                    fullData: { ...favorite, created_at },
                    userData: itemUser,
                });
            }
        });

        return markers;
    }, [communityFavorites]); // Only recalculate when communityFavorites changes

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
                    {communityFavorites.length > 0 && !loadingFavorites && (
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

            {/* Content - Map or List View */}
            {loadingLocation || loadingFavorites ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#9333ea" />
                    <Text style={styles.loadingText}>
                        {loadingLocation ? 'Finding your location...' : 'Loading community favorites...'}
                    </Text>
                    <Text style={styles.loadingSubtext}>This will only take a moment</Text>
                </View>
            ) : viewMode === 'map' ? (
                <View style={styles.mapContainer}>
                    <NativeMapView
                        recommendations={mapMarkers}
                        initialRegion={mapRegion}
                        onMarkerPress={(marker) => {
                            logger.debug('Marker pressed:', marker);
                            // Show detail modal with the favorite data and user who saved it
                            if (marker.fullData) {
                                setSelectedFavorite(marker.fullData);
                                setSelectedUser(marker.userData);
                            }
                        }}
                        style={styles.map}
                        showUserLocation={true}
                    />

                    {/* Stats card - auto-fades after 3 seconds */}
                    {infoCardVisible && (
                        <Animated.View
                            style={[styles.infoCard, { opacity: fadeAnim }]}
                        >
                        <Text style={styles.infoTitle}>Community Favorites</Text>
                        <Text style={styles.infoText}>
                            Exploring {communityFavorites.length} {communityFavorites.length === 1 ? 'place' : 'places'} saved by your community
                        </Text>
                        {communityFavorites.length === 0 && (
                            <Text style={styles.comingSoonBadge}>
                                Your community hasn't saved any places yet
                            </Text>
                        )}
                        </Animated.View>
                    )}
                </View>
            ) : (
                // List View - Community Feed
                <FlatList
                    data={communityFavorites}
                    keyExtractor={(item) => `${item.id}-${item.favorite.id}`}
                    renderItem={({ item }) => (
                        <CommunityFeedItem
                            item={item}
                            onPress={() => {
                                setSelectedFavorite({ ...item.favorite, created_at: item.created_at });
                                setSelectedUser(item.user);
                            }}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No community favorites yet</Text>
                            <Text style={styles.emptySubtext}>
                                Places saved by your community will appear here
                            </Text>
                        </View>
                    }
                />
            )}

            {/* Detail Modal */}
            <FavoriteDetailModal
                visible={selectedFavorite !== null}
                onClose={() => {
                    setSelectedFavorite(null);
                    setSelectedUser(null);
                }}
                favorite={selectedFavorite}
                savedByUser={selectedUser}
                isFavorited={false}
                onToggleFavorite={() => {
                    // Optional: implement favorite toggle
                }}
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
    headerBorder: {
        height: 2,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },
    headerViewModeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 4,
        gap: 4,
    },
    headerToggleButton: {
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        backgroundColor: 'transparent',
    },
    headerToggleButtonActive: {
        backgroundColor: 'rgba(146, 97, 229, 0.3)',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        flex: 1,
    },
    infoCard: {
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        backgroundColor: 'rgba(32, 25, 37, 0.95)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    infoTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
    },
    infoText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 20,
    },
    comingSoonBadge: {
        fontSize: 12,
        color: '#B954EC',
        fontWeight: '600',
        fontStyle: 'italic',
        marginTop: 8,
    },
    listContent: {
        paddingTop: 0,
        paddingBottom: 100,
    },
    emptyContainer: {
        padding: 24,
        backgroundColor: 'rgba(42, 30, 46, 0.4)',
        borderRadius: 0,
        alignItems: 'center',
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.25)',
        marginTop: 20,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
    },
    emptySubtext: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 18,
    },
});
