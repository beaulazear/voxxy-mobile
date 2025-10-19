import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    FlatList,
    Linking,
    Platform,
    StyleSheet,
    Dimensions,
    ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import * as Haptics from 'expo-haptics';

const RecommendationDetails = ({
    recommendation,
    onClose,
    onFavorite,
    isFavorited = false,
    favoriteLoading = false,
    onFlag,
    isFlagged = false,
}) => {
    const [imageErrors, setImageErrors] = React.useState({});

    if (!recommendation) return null;

    const handleGetDirections = () => {
        // Handle both coordinate object and separate lat/lng properties
        const lat = recommendation.coordinate?.latitude || recommendation.latitude;
        const lng = recommendation.coordinate?.longitude || recommendation.longitude;

        if (!lat || !lng) {
            // Fallback to address-based navigation if no coordinates
            if (!recommendation.address) return;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            const encodedAddress = encodeURIComponent(recommendation.address);
            const url = Platform.select({
                ios: `maps:0,0?q=${encodedAddress}`,
                android: `geo:0,0?q=${encodedAddress}`
            });

            Linking.openURL(url).catch(err => {
                console.log('Error opening maps:', err);
            });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        const scheme = Platform.select({
            ios: 'maps:',
            android: 'geo:'
        });

        const url = Platform.select({
            ios: `${scheme}${lat},${lng}?q=${encodeURIComponent(recommendation.address || recommendation.title || recommendation.name)}`,
            android: `${scheme}${lat},${lng}?q=${encodeURIComponent(recommendation.address || recommendation.title || recommendation.name)}`
        });

        Linking.openURL(url).catch(err => {
            console.log('Error opening maps:', err);
        });
    };

    const handleOpenWebsite = () => {
        if (!recommendation.website) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let url = recommendation.website;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        Linking.openURL(url).catch(err => {
            console.log('Error opening website:', err);
        });
    };

    const handleCall = () => {
        if (!recommendation.phone) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const phoneNumber = recommendation.phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${phoneNumber}`).catch(err => {
            console.log('Error calling:', err);
        });
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

    const parseReviews = (reviews) => {
        if (!reviews) return [];
        if (typeof reviews === 'string') {
            try {
                return JSON.parse(reviews);
            } catch {
                return [];
            }
        }
        return reviews;
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

    const photos = parsePhotos(recommendation.photos);
    const reviews = parseReviews(recommendation.reviews);

    return (
        <View style={styles.container}>
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
                                    <Icon name="image" size={48} color="rgba(255, 255, 255, 0.3)" />
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
                            <Icon name="image" size={12} color="#fff" />
                            <Text style={styles.photoCounterText}>{photos.length}</Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.noPhotoPlaceholder}>
                    <Icon name="image" size={48} color="rgba(255, 255, 255, 0.2)" />
                    <Text style={styles.noPhotoText}>No photos</Text>
                </View>
            )}

            {/* Why This Place? - Pill Tags */}
            {recommendation.reason && typeof recommendation.reason === 'string' && (
                <View style={styles.reasonTagsContainer}>
                    {recommendation.reason.split('.').filter(tag => tag.trim()).map((tag, index) => (
                        <View key={index} style={styles.reasonPill}>
                            <Text style={styles.reasonPillText}>{tag.trim()}</Text>
                        </View>
                    ))}
                </View>
            )}

            {/* Action Buttons Row - Favorite & Flag */}
            <View style={styles.actionButtonsRow}>
                {onFavorite && (
                    <TouchableOpacity
                        style={[styles.actionButton, isFavorited && styles.actionButtonActive]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onFavorite(recommendation);
                        }}
                        disabled={favoriteLoading}
                    >
                        {favoriteLoading ? (
                            <ActivityIndicator size="small" color="#D4AF37" />
                        ) : (
                            <>
                                <Icon
                                    name="star"
                                    size={18}
                                    color={isFavorited ? "#D4AF37" : "#fff"}
                                    fill={isFavorited ? "#D4AF37" : "transparent"}
                                />
                                <Text style={[styles.actionButtonText, isFavorited && styles.actionButtonTextActive]}>
                                    {isFavorited ? 'Favorited' : 'Favorite'}
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {onFlag && (
                    <TouchableOpacity
                        style={[styles.actionButton, isFlagged && styles.actionButtonFlagged]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                            onFlag(recommendation);
                        }}
                    >
                        <Icon name="flag" size={18} color={isFlagged ? "#e74c3c" : "#999"} />
                        <Text style={[styles.actionButtonText, isFlagged && styles.actionButtonTextFlagged]}>
                            {isFlagged ? 'Flagged' : 'Flag'}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Info Badges Row */}
            <View style={styles.badgesRow}>
                {recommendation.rating && (
                    <View style={styles.badge}>
                        <Icon name="star" size={14} color="#FFD700" />
                        <Text style={styles.badgeText}>{recommendation.rating}</Text>
                    </View>
                )}
                {recommendation.category && (
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>{recommendation.category}</Text>
                    </View>
                )}
            </View>

            {/* Compact Details Grid */}
            <View style={styles.detailsGrid}>
                {recommendation.address && (
                    <TouchableOpacity style={styles.detailItem} onPress={handleGetDirections}>
                        <Icon name="map-pin" size={16} color="#9333ea" />
                        <Text style={styles.detailItemText} numberOfLines={2}>
                            {recommendation.address}
                        </Text>
                    </TouchableOpacity>
                )}

                {recommendation.phone && (
                    <TouchableOpacity style={styles.detailItem} onPress={handleCall}>
                        <Icon name="phone" size={16} color="#10b981" />
                        <Text style={styles.detailItemText}>
                            {recommendation.phone}
                        </Text>
                    </TouchableOpacity>
                )}

                {recommendation.price_range && (
                    <View style={styles.detailItem}>
                        <Icon name="dollar-sign" size={16} color="#fbbf24" />
                        <Text style={styles.detailItemText}>
                            {recommendation.price_range}
                        </Text>
                    </View>
                )}

                {recommendation.hours && (
                    <View style={styles.detailItem}>
                        <Icon name="clock" size={16} color="#A855F7" />
                        <View style={styles.hoursContainer}>
                            {formatHours(recommendation.hours)}
                        </View>
                    </View>
                )}
            </View>

            {/* Description */}
            {recommendation.description && (
                <View style={styles.descriptionCard}>
                    <Text style={styles.descriptionTitle}>About</Text>
                    <Text style={styles.descriptionText}>{recommendation.description}</Text>
                </View>
            )}

            {/* Quick Actions Row - Below About Section */}
            <View style={styles.quickActionsRow}>
                {recommendation.address && (
                    <TouchableOpacity style={styles.quickActionButton} onPress={handleGetDirections}>
                        <LinearGradient
                            colors={['#9333EA', '#7C3AED']}
                            style={styles.quickActionGradient}
                        >
                            <Icon name="navigation" size={18} color="#fff" />
                            <Text style={styles.quickActionText}>Navigate</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {recommendation.phone && (
                    <TouchableOpacity style={styles.quickActionButton} onPress={handleCall}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.quickActionGradient}
                        >
                            <Icon name="phone" size={18} color="#fff" />
                            <Text style={styles.quickActionText}>Call</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {recommendation.website && (
                    <TouchableOpacity style={styles.quickActionButton} onPress={handleOpenWebsite}>
                        <LinearGradient
                            colors={['#3b82f6', '#2563eb']}
                            style={styles.quickActionGradient}
                        >
                            <Icon name="globe" size={18} color="#fff" />
                            <Text style={styles.quickActionText}>Website</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </View>

            {/* Reviews */}
            {reviews.length > 0 && (
                <View style={styles.reviewsSection}>
                    <Text style={styles.sectionTitle}>Reviews</Text>
                    {reviews.slice(0, 3).map((review, index) => (
                        <View key={index} style={styles.reviewItem}>
                            <View style={styles.reviewHeader}>
                                <Text style={styles.reviewAuthor}>
                                    {review.author_name || 'Anonymous'}
                                </Text>
                                {review.rating && (
                                    <View style={styles.reviewRating}>
                                        <Icon name="star" size={12} color="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                    </View>
                                )}
                            </View>
                            {review.text && (
                                <Text style={styles.reviewText} numberOfLines={4}>
                                    {review.text}
                                </Text>
                            )}
                        </View>
                    ))}
                </View>
            )}

            {/* Bottom Padding */}
            <View style={styles.bottomPadding} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingBottom: 20,
    },
    // Hero Photo Section
    heroPhotoSection: {
        height: 200,
        marginBottom: 16,
        marginHorizontal: -16, // Break out of parent padding
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
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
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
    // Info Badges
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 16,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 4,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    badgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
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
    // Action Buttons (Favorite & Flag)
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    actionButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        gap: 8,
    },
    actionButtonActive: {
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        borderColor: '#D4AF37',
    },
    actionButtonFlagged: {
        backgroundColor: 'rgba(231, 76, 60, 0.15)',
        borderColor: '#e74c3c',
    },
    actionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    actionButtonTextActive: {
        color: '#D4AF37',
    },
    actionButtonTextFlagged: {
        color: '#e74c3c',
    },
    // Quick Actions
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
    // Description
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
    // Reviews
    sectionTitle: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
        marginBottom: 12,
    },
    reviewsSection: {
        marginBottom: 16,
    },
    reviewItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    reviewRatingText: {
        fontSize: 12,
        color: '#FFD700',
        fontWeight: '600',
    },
    reviewText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 20,
    },
    bottomPadding: {
        height: 40,
    },
});

export default RecommendationDetails;
