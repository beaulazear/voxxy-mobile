import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
    Alert,
    Share,
    Image,
    FlatList,
    Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
    MapPin,
    DollarSign,
    Clock,
    Phone,
    Globe,
    Navigation,
    Share2,
    Heart,
    ExternalLink,
    Calendar,
} from 'react-native-feather';
import { modalStyles, modalColors } from '../styles/modalStyles';
import DraggableBottomSheet from './DraggableBottomSheet';
import { getUserDisplayImage } from '../utils/avatarManager';
import { API_URL } from '../config';

export default function FavoriteDetailModal({ visible, onClose, favorite, savedByUser, onToggleFavorite, isFavorited }) {
    const [expandedHours, setExpandedHours] = useState(false);
    const [imageErrors, setImageErrors] = useState({});

    // Debug logging removed for production

    // Early return if no favorite
    if (!favorite) {
        return null;
    }

    const handleNavigate = () => {
        if (favorite.latitude && favorite.longitude) {
            const url = `https://maps.apple.com/?daddr=${favorite.latitude},${favorite.longitude}`;
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open maps');
            });
        } else if (favorite.address) {
            const address = encodeURIComponent(favorite.address);
            const url = `https://maps.apple.com/?address=${address}`;
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open maps');
            });
        }
    };

    const handleCall = () => {
        if (favorite.phone) {
            const phoneNumber = favorite.phone.replace(/[^0-9+]/g, '');
            Linking.openURL(`tel:${phoneNumber}`).catch(() => {
                Alert.alert('Error', 'Could not initiate call');
            });
        }
    };

    const handleWebsite = () => {
        if (favorite.website) {
            let url = favorite.website;
            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                url = 'https://' + url;
            }
            Linking.openURL(url).catch(() => {
                Alert.alert('Error', 'Could not open website');
            });
        }
    };

    const handleShare = async () => {
        try {
            const message = favorite.address
                ? `Check out ${favorite.title}!\n\n${favorite.address}`
                : `Check out ${favorite.title}!`;

            await Share.share({
                message: message,
                title: favorite.title,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    const formatHours = (hoursString) => {
        if (!hoursString) return null;

        // If hours are already formatted with line breaks
        if (hoursString.includes('\n')) {
            return hoursString.split('\n').map((line, index) => {
                const parts = line.split(': ');
                if (parts.length === 2) {
                    return (
                        <View key={index} style={styles.hoursRow}>
                            <Text style={styles.hoursDays}>{parts[0]}:</Text>
                            <Text style={styles.hoursTime}>{parts[1]}</Text>
                        </View>
                    );
                }
                return <Text key={index} style={styles.hoursTime}>{line}</Text>;
            });
        }

        // If hours are a single string
        return <Text style={styles.hoursTime}>{hoursString}</Text>;
    };

    const parsePhotos = (photos) => {
        if (!photos) return [];
        if (Array.isArray(photos)) return photos;
        if (typeof photos === 'string') {
            try {
                const parsed = JSON.parse(photos);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    const photos = parsePhotos(favorite?.photos || []);

    return (
        <DraggableBottomSheet
            visible={visible}
            onClose={onClose}
            title={favorite.title || 'Favorite Place'}
        >
            {/* Hero Photo Section */}
                    {photos.length > 0 ? (
                        <View style={styles.heroPhotoSection}>
                            <FlatList
                                data={photos}
                                horizontal
                                pagingEnabled
                                showsHorizontalScrollIndicator={false}
                                keyExtractor={(item, index) => index.toString()}
                                renderItem={({ item, index }) => {
                                    const imageUri = item.photo_url || item;
                                    const hasError = imageErrors[index];

                                    return hasError ? (
                                        <View style={[styles.heroImage, styles.imageFallback]}>
                                            <Globe color="rgba(255, 255, 255, 0.3)" size={48} />
                                            <Text style={styles.imageFallbackText}>Image unavailable</Text>
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.heroImage}
                                            resizeMode="cover"
                                            onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                                        />
                                    );
                                }}
                            />
                            {photos.length > 1 && (
                                <View style={styles.photoCounter}>
                                    <Text style={styles.photoCounterText}>{photos.length} photos</Text>
                                </View>
                            )}
                            {/* Saved By User - Overlay on photos */}
                            {savedByUser && (
                                <View style={styles.savedByOverlay}>
                                    <Image
                                        source={getUserDisplayImage(savedByUser, API_URL)}
                                        style={styles.savedByAvatar}
                                    />
                                    <View style={styles.savedByTextContainer}>
                                        <Text style={styles.savedByLabel}>Saved by</Text>
                                        <Text style={styles.savedByName}>{savedByUser.name}</Text>
                                        {favorite.created_at && (
                                            <Text style={styles.savedByDate}>
                                                {new Date(favorite.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.noPhotoPlaceholder}>
                            <Globe color="rgba(255, 255, 255, 0.2)" size={48} />
                            <Text style={styles.noPhotoText}>No photos</Text>
                            {/* Saved By User - Overlay on no photo placeholder */}
                            {savedByUser && (
                                <View style={styles.savedByOverlay}>
                                    <Image
                                        source={getUserDisplayImage(savedByUser, API_URL)}
                                        style={styles.savedByAvatar}
                                    />
                                    <View style={styles.savedByTextContainer}>
                                        <Text style={styles.savedByLabel}>Saved by</Text>
                                        <Text style={styles.savedByName}>{savedByUser.name}</Text>
                                        {favorite.created_at && (
                                            <Text style={styles.savedByDate}>
                                                {new Date(favorite.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })}
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Why This Place? - Pill Tags */}
                    {favorite.reason && typeof favorite.reason === 'string' && (
                        <View style={styles.reasonTagsContainer}>
                            {favorite.reason.split('.').filter(tag => tag.trim()).map((tag, index) => (
                                <View key={index} style={styles.reasonPill}>
                                    <Text style={styles.reasonPillText}>{tag.trim()}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Activity Context - Special for Favorites */}
                    {favorite.activity && favorite.activity.title && (
                        <View style={styles.activityContextCard}>
                            <Calendar color="#9333ea" size={16} />
                            <View style={styles.activityContextText}>
                                <Text style={styles.activityContextLabel}>From activity:</Text>
                                <Text style={styles.activityContextValue}>
                                    {favorite.activity.title}
                                    {favorite.activity.date && ` • ${new Date(favorite.activity.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                                </Text>
                            </View>
                        </View>
                    )}

                    {/* Info Badges Row */}
                    {(favorite?.rating || favorite?.category) && (
                        <View style={styles.badgesRow}>
                            {favorite.rating && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>⭐ {favorite.rating}</Text>
                                </View>
                            )}
                            {favorite.category && (
                                <View style={styles.badge}>
                                    <Text style={styles.badgeText}>{favorite.category}</Text>
                                </View>
                            )}
                        </View>
                    )}

                    {/* Quick Actions */}
                    <View style={styles.quickActionsRow}>
                        {favorite.address && (
                            <TouchableOpacity style={styles.quickActionButton} onPress={handleNavigate}>
                                <LinearGradient
                                    colors={['#9333EA', '#7C3AED']}
                                    style={styles.quickActionGradient}
                                >
                                    <Navigation color="#fff" size={18} />
                                    <Text style={styles.quickActionText}>Navigate</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {favorite.phone && (
                            <TouchableOpacity style={styles.quickActionButton} onPress={handleCall}>
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    style={styles.quickActionGradient}
                                >
                                    <Phone color="#fff" size={18} />
                                    <Text style={styles.quickActionText}>Call</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {(favorite.address || favorite.title) && (
                            <TouchableOpacity style={styles.quickActionButton} onPress={handleShare}>
                                <LinearGradient
                                    colors={['#3b82f6', '#2563eb']}
                                    style={styles.quickActionGradient}
                                >
                                    <Share2 color="#fff" size={18} />
                                    <Text style={styles.quickActionText}>Share</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {onToggleFavorite && (
                            <TouchableOpacity style={styles.quickActionButton} onPress={onToggleFavorite}>
                                <LinearGradient
                                    colors={isFavorited ? ['#D4AF37', '#B8941F'] : ['#ef4444', '#dc2626']}
                                    style={styles.quickActionGradient}
                                >
                                    <Heart
                                        color="#fff"
                                        fill={isFavorited ? '#fff' : 'transparent'}
                                        size={18}
                                    />
                                    <Text style={styles.quickActionText}>
                                        {isFavorited ? 'Saved' : 'Save'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Compact Details Grid */}
                    <View style={styles.detailsGrid}>
                        {favorite.address && (
                            <TouchableOpacity style={styles.detailItem} onPress={handleNavigate}>
                                <MapPin color="#9333ea" size={16} />
                                <Text style={styles.detailItemText} numberOfLines={2}>
                                    {favorite.address}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {favorite.phone && (
                            <TouchableOpacity style={styles.detailItem} onPress={handleCall}>
                                <Phone color="#10b981" size={16} />
                                <Text style={styles.detailItemText}>
                                    {favorite.phone}
                                </Text>
                            </TouchableOpacity>
                        )}

                        {favorite.price_range && (
                            <View style={styles.detailItem}>
                                <DollarSign color="#fbbf24" size={16} />
                                <Text style={styles.detailItemText}>
                                    {favorite.price_range}
                                </Text>
                            </View>
                        )}

                        {favorite.hours && (
                            <View style={styles.detailItem}>
                                <Clock color="#A855F7" size={16} />
                                <View style={styles.hoursContainer}>
                                    {formatHours(favorite.hours)}
                                </View>
                            </View>
                        )}

                        {favorite.website && (
                            <TouchableOpacity style={styles.detailItem} onPress={handleWebsite}>
                                <Globe color="#3b82f6" size={16} />
                                <Text style={styles.detailItemText} numberOfLines={1}>
                                    {favorite.website}
                                </Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {/* Description */}
                    {favorite.description && (
                        <View style={styles.descriptionCard}>
                            <Text style={styles.descriptionTitle}>About</Text>
                            <Text style={styles.descriptionText}>{favorite.description}</Text>
                        </View>
                    )}

                    {/* Saved Date */}
                    {favorite.created_at && (
                        <View style={styles.savedDateCard}>
                            <Text style={styles.savedDateText}>
                                Saved on {new Date(favorite.created_at).toLocaleDateString('en-US', {
                                    month: 'long',
                                    day: 'numeric',
                                    year: 'numeric',
                                })}
                            </Text>
                        </View>
                    )}
        </DraggableBottomSheet>
    );
}

const styles = StyleSheet.create({
    // Saved By User - Overlay on photos
    savedByOverlay: {
        position: 'absolute',
        top: 12,
        left: 12,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(32, 25, 37, 0.85)',
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.4)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 5,
        maxWidth: '70%',
    },
    savedByAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        marginRight: 8,
        borderWidth: 2,
        borderColor: '#B954EC',
    },
    savedByTextContainer: {
        flexShrink: 1,
    },
    savedByLabel: {
        fontSize: 9,
        color: 'rgba(255, 255, 255, 0.6)',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
        marginBottom: 1,
    },
    savedByName: {
        fontSize: 13,
        color: '#fff',
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    savedByDate: {
        fontSize: 10,
        color: 'rgba(255, 255, 255, 0.5)',
        marginTop: 1,
        fontStyle: 'italic',
    },
    // Hero Photo Section
    heroPhotoSection: {
        height: 200,
        marginBottom: 16,
        marginHorizontal: -16, // Break out of parent padding
        marginTop: -12,
        borderRadius: 0, // No radius since it's full width
        overflow: 'hidden',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    heroImage: {
        width: Dimensions.get('window').width,
        height: 200,
    },
    photoCounter: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
    },
    photoCounterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    noPhotoPlaceholder: {
        height: 200,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        marginHorizontal: -16,
        marginTop: -12,
    },
    noPhotoText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        marginTop: 8,
    },
    imageFallback: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    imageFallbackText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        marginTop: 8,
    },
    // Reason Pill Tags
    reasonTagsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    reasonPill: {
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.4)',
    },
    reasonPillText: {
        color: '#e9d5ff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Activity Context Card (for favorites)
    activityContextCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        gap: 10,
    },
    activityContextText: {
        flex: 1,
    },
    activityContextLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 11,
        fontWeight: '600',
        textTransform: 'uppercase',
        marginBottom: 2,
    },
    activityContextValue: {
        color: '#e9d5ff',
        fontSize: 13,
        fontWeight: '600',
    },
    // Info Badges
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    badge: {
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    badgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },
    quickActionsRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        gap: 10,
        marginBottom: 16,
    },
    quickActionButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
    },
    quickActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    quickActionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },
    // Details Grid
    detailsGrid: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
    },
    detailItemText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
        lineHeight: 18,
    },
    hoursContainer: {
        flex: 1,
        gap: 2,
    },
    hoursRow: {
        flexDirection: 'row',
        marginBottom: 2,
    },
    hoursDays: {
        color: '#B8A5C4',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 70,
    },
    hoursTime: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 12,
        fontWeight: '500',
        flex: 1,
    },
    descriptionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },
    descriptionTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 8,
    },
    descriptionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        lineHeight: 20,
    },
    savedDateCard: {
        paddingVertical: 12,
        marginBottom: 20,
        alignItems: 'center',
    },
    savedDateText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontStyle: 'italic',
    },
});
