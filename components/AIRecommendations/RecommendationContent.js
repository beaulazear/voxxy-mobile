import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image,
    Linking,
    Platform,
    ActivityIndicator,
    Dimensions,
    ScrollView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import * as Haptics from 'expo-haptics';
import styles from '../../styles/RecommendationContentStyles';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * RecommendationContent - Unified content component for recommendation details
 *
 * Used by both:
 * - Full-screen modal (RecommendationDetailModal)
 * - Bottom sheet (DraggableBottomSheet)
 *
 * Ensures consistent experience across all viewing contexts
 */
const RecommendationContent = ({
    recommendation,
    onFavorite,
    isFavorited = false,
    favoriteLoading = false,
    onFlag,
    isFlagged = false,
    isGameNightActivity = false,
    showActions = true,
    showQuickActions = true,
}) => {
    const [imageErrors, setImageErrors] = useState({});
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [showAllReviews, setShowAllReviews] = useState(false);

    if (!recommendation) return null;

    // Parse photos from various formats
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

    // Parse reviews from various formats
    const parseReviews = (reviews) => {
        if (!reviews) return [];
        if (Array.isArray(reviews)) return reviews;
        if (typeof reviews === 'string') {
            try {
                const parsed = JSON.parse(reviews);
                return Array.isArray(parsed) ? parsed : [];
            } catch {
                return [];
            }
        }
        return [];
    };

    // Parse reason into tags (handles both period and comma separation)
    const parseReasonTags = (reason) => {
        if (!reason || typeof reason !== 'string') return [];

        // Try splitting by period first
        let tags = reason.split('.').map(t => t.trim()).filter(t => t.length > 0);

        // If we only got one tag, try comma separation
        if (tags.length === 1) {
            tags = reason.split(',').map(t => t.trim()).filter(t => t.length > 0);
        }

        // If still only one tag and it's very long, it's probably a sentence
        if (tags.length === 1 && tags[0].length > 100) {
            return [];
        }

        return tags;
    };

    const photos = parsePhotos(recommendation.photos);
    const reviews = parseReviews(recommendation.reviews);
    const reasonTags = parseReasonTags(recommendation.reason);
    const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);

    // Navigation handlers
    const handleGetDirections = () => {
        const lat = recommendation.coordinate?.latitude || recommendation.latitude;
        const lng = recommendation.coordinate?.longitude || recommendation.longitude;

        if (!lat || !lng) {
            if (!recommendation.address) return;

            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            const encodedAddress = encodeURIComponent(recommendation.address);
            const url = Platform.select({
                ios: `maps:0,0?q=${encodedAddress}`,
                android: `geo:0,0?q=${encodedAddress}`
            });

            Linking.openURL(url).catch(() => {
                console.log('Could not open maps');
            });
            return;
        }

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const url = Platform.select({
            ios: `maps:${lat},${lng}?q=${encodeURIComponent(recommendation.title || recommendation.name || 'Location')}`,
            android: `geo:${lat},${lng}?q=${encodeURIComponent(recommendation.title || recommendation.name || 'Location')}`
        });

        Linking.openURL(url).catch(() => {
            console.log('Could not open maps');
        });
    };

    const handleOpenWebsite = () => {
        if (!recommendation.website) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        let url = recommendation.website;
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }

        Linking.openURL(url).catch(() => {
            console.log('Could not open website');
        });
    };

    const handleCall = () => {
        if (!recommendation.phone) return;

        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const phoneNumber = recommendation.phone.replace(/[^0-9+]/g, '');
        Linking.openURL(`tel:${phoneNumber}`).catch(() => {
            console.log('Could not initiate call');
        });
    };

    const handleFavoritePress = () => {
        if (favoriteLoading) return;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        if (onFavorite) onFavorite(recommendation);
    };

    const handleFlagPress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        if (onFlag) onFlag(recommendation);
    };

    // Format hours for display
    const formatHours = (hoursString) => {
        if (!hoursString) return null;

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

        return <Text style={styles.hoursTime}>{hoursString}</Text>;
    };

    return (
        <View style={styles.container}>
            {/* Hero Photo Gallery */}
            {photos.length > 0 ? (
                <View style={styles.photoGallery}>
                    <ScrollView
                        horizontal
                        pagingEnabled
                        showsHorizontalScrollIndicator={false}
                        onMomentumScrollEnd={(e) => {
                            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
                            setCurrentPhotoIndex(index);
                        }}
                    >
                        {photos.map((photo, index) => {
                            const imageUri = photo.photo_url || photo;
                            const hasError = imageErrors[index];

                            return (
                                <View key={index} style={styles.photoContainer}>
                                    {hasError ? (
                                        <View style={styles.photoFallback}>
                                            <Icon name="image" size={48} color="rgba(255, 255, 255, 0.3)" />
                                            <Text style={styles.photoFallbackText}>Image unavailable</Text>
                                        </View>
                                    ) : (
                                        <Image
                                            source={{ uri: imageUri }}
                                            style={styles.photo}
                                            resizeMode="cover"
                                            onError={() => setImageErrors(prev => ({ ...prev, [index]: true }))}
                                        />
                                    )}
                                </View>
                            );
                        })}
                    </ScrollView>

                    {/* Photo pagination dots */}
                    {photos.length > 1 && (
                        <View style={styles.paginationDots}>
                            {photos.map((_, index) => (
                                <View
                                    key={index}
                                    style={[
                                        styles.dot,
                                        index === currentPhotoIndex && styles.dotActive
                                    ]}
                                />
                            ))}
                        </View>
                    )}

                    {/* Photo counter */}
                    {photos.length > 1 && (
                        <View style={styles.photoCounter}>
                            <Icon name="image" size={12} color="#fff" />
                            <Text style={styles.photoCounterText}>
                                {currentPhotoIndex + 1}/{photos.length}
                            </Text>
                        </View>
                    )}
                </View>
            ) : (
                <View style={styles.noPhotoPlaceholder}>
                    <Icon name="image" size={48} color="rgba(255, 255, 255, 0.2)" />
                    <Text style={styles.noPhotoText}>No photos available</Text>
                </View>
            )}

            {/* Reason Tags */}
            {reasonTags.length > 0 ? (
                <View style={styles.reasonSection}>
                    <Text style={styles.sectionTitle}>Why this place?</Text>
                    <View style={styles.reasonTags}>
                        {reasonTags.map((tag, index) => (
                            <View key={index} style={styles.reasonTag}>
                                <Icon name="check" size={12} color="#9333ea" />
                                <Text style={styles.reasonTagText}>{tag}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            ) : recommendation.reason ? (
                <View style={styles.reasonSection}>
                    <Text style={styles.sectionTitle}>Why this place?</Text>
                    <Text style={styles.reasonText}>{recommendation.reason}</Text>
                </View>
            ) : null}

            {/* Action Buttons - Favorite & Flag */}
            {showActions && (onFavorite || onFlag) && (
                <View style={styles.actionButtonsRow}>
                    {onFavorite && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.favoriteButton,
                                isFavorited && styles.favoriteButtonActive
                            ]}
                            onPress={handleFavoritePress}
                            disabled={favoriteLoading}
                            activeOpacity={0.7}
                        >
                            <LinearGradient
                                colors={isFavorited ? ['#D4AF37', '#B8941F'] : ['rgba(212, 175, 55, 0.2)', 'rgba(184, 148, 31, 0.2)']}
                                style={styles.actionButtonGradient}
                            >
                                {favoriteLoading ? (
                                    <ActivityIndicator size="small" color={isFavorited ? "#fff" : "#D4AF37"} />
                                ) : (
                                    <>
                                        <Icon
                                            name="star"
                                            size={18}
                                            color={isFavorited ? "#fff" : "#D4AF37"}
                                            fill={isFavorited ? "#fff" : "transparent"}
                                        />
                                        <Text style={[
                                            styles.actionButtonText,
                                            isFavorited && styles.actionButtonTextActive
                                        ]}>
                                            {isFavorited ? 'Favorited' : 'Add to Favorites'}
                                        </Text>
                                    </>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    {onFlag && (
                        <TouchableOpacity
                            style={[
                                styles.actionButton,
                                styles.flagButton,
                                isFlagged && styles.flagButtonActive
                            ]}
                            onPress={handleFlagPress}
                            activeOpacity={0.7}
                        >
                            <View style={styles.flagButtonContent}>
                                <Icon
                                    name="flag"
                                    size={18}
                                    color={isFlagged ? "#ef4444" : "rgba(255, 255, 255, 0.6)"}
                                />
                                <Text style={[
                                    styles.actionButtonText,
                                    isFlagged && styles.flagButtonTextActive
                                ]}>
                                    {isFlagged ? 'Flagged' : 'Flag'}
                                </Text>
                            </View>
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Info Badges */}
            {(recommendation.rating || recommendation.category) && (
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
            )}

            {/* Quick Actions */}
            {showQuickActions && (recommendation.address || recommendation.phone || recommendation.website) && (
                <View style={styles.quickActionsSection}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsRow}>
                        {recommendation.address && (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={handleGetDirections}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#9333EA', '#7C3AED']}
                                    style={styles.quickActionGradient}
                                >
                                    <Icon name="navigation" size={18} color="#fff" />
                                    <Text style={styles.quickActionText}>Directions</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        )}

                        {recommendation.phone && (
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={handleCall}
                                activeOpacity={0.8}
                            >
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
                            <TouchableOpacity
                                style={styles.quickActionButton}
                                onPress={handleOpenWebsite}
                                activeOpacity={0.8}
                            >
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
                </View>
            )}

            {/* Details Grid */}
            <View style={styles.detailsSection}>
                <Text style={styles.sectionTitle}>Details</Text>
                <View style={styles.detailsGrid}>
                    {recommendation.address && (
                        <View style={styles.detailItem}>
                            <View style={styles.detailIconWrapper}>
                                <Icon name="map-pin" size={16} color="#9333ea" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Address</Text>
                                <Text style={styles.detailValue}>{recommendation.address}</Text>
                            </View>
                        </View>
                    )}

                    {recommendation.phone && (
                        <View style={styles.detailItem}>
                            <View style={styles.detailIconWrapper}>
                                <Icon name="phone" size={16} color="#10b981" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Phone</Text>
                                <Text style={styles.detailValue}>{recommendation.phone}</Text>
                            </View>
                        </View>
                    )}

                    {recommendation.price_range && (
                        <View style={styles.detailItem}>
                            <View style={styles.detailIconWrapper}>
                                <Icon name="dollar-sign" size={16} color="#fbbf24" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Price Range</Text>
                                <Text style={styles.detailValue}>{recommendation.price_range}</Text>
                            </View>
                        </View>
                    )}

                    {recommendation.hours && (
                        <View style={styles.detailItem}>
                            <View style={styles.detailIconWrapper}>
                                <Icon name="clock" size={16} color="#A855F7" />
                            </View>
                            <View style={styles.detailContent}>
                                <Text style={styles.detailLabel}>Hours</Text>
                                <View style={styles.hoursContainer}>
                                    {formatHours(recommendation.hours)}
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </View>

            {/* Description */}
            {recommendation.description && (
                <View style={styles.descriptionSection}>
                    <Text style={styles.sectionTitle}>About</Text>
                    <Text style={styles.descriptionText}>{recommendation.description}</Text>
                </View>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
                <View style={styles.reviewsSection}>
                    <View style={styles.reviewsHeader}>
                        <Text style={styles.sectionTitle}>Reviews</Text>
                        {reviews.length > 3 && (
                            <Text style={styles.reviewsCount}>
                                {showAllReviews ? reviews.length : `${reviews.length} total`}
                            </Text>
                        )}
                    </View>

                    {displayedReviews.map((review, index) => (
                        <View key={index} style={styles.reviewCard}>
                            <View style={styles.reviewHeader}>
                                <View style={styles.reviewAuthorSection}>
                                    <View style={styles.reviewAvatar}>
                                        <Icon name="user" size={14} color="#9333ea" />
                                    </View>
                                    <Text style={styles.reviewAuthor}>
                                        {review.author_name || 'Anonymous'}
                                    </Text>
                                </View>
                                {review.rating && (
                                    <View style={styles.reviewRating}>
                                        <Icon name="star" size={12} color="#FFD700" fill="#FFD700" />
                                        <Text style={styles.reviewRatingText}>{review.rating}</Text>
                                    </View>
                                )}
                            </View>
                            {review.text && (
                                <Text style={styles.reviewText} numberOfLines={showAllReviews ? undefined : 4}>
                                    {review.text}
                                </Text>
                            )}
                        </View>
                    ))}

                    {reviews.length > 3 && (
                        <TouchableOpacity
                            style={styles.showMoreButton}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setShowAllReviews(!showAllReviews);
                            }}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.showMoreText}>
                                {showAllReviews ? 'Show Less' : `Show ${reviews.length - 3} More Reviews`}
                            </Text>
                            <Icon
                                name={showAllReviews ? "chevron-up" : "chevron-down"}
                                size={16}
                                color="#9333ea"
                            />
                        </TouchableOpacity>
                    )}
                </View>
            )}

            {/* Bottom spacing */}
            <View style={styles.bottomSpacing} />
        </View>
    );
};

export default RecommendationContent;
