import React from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    ActivityIndicator,
    Linking,
    SafeAreaView,
} from 'react-native';
import { Icons } from '../../constants/featherIcons';
import KeywordTags from './KeywordTags';
import TruncatedReview from './TruncatedReview';
import PhotoGallery from './PhotoGallery';
import HoursDisplay from './HoursDisplay';
import { safeJsonParse, isKeywordFormat } from '../../utils/recommendationsUtils';
import styles from '../../styles/AIRecommendationsStyles';

/**
 * RecommendationDetailModal - Full-screen modal for detailed recommendation view
 *
 * Used in both voting and finalized phases to show comprehensive details
 * about a recommendation including description, photos, reviews, and actions.
 */
const RecommendationDetailModal = ({
    visible,
    recommendation,
    onClose,
    isGameNightActivity = false,
    activityText = {},
    // Flag management
    isFlagged = false,
    onFlagToggle,
    // Favorite management
    isFavorited = false,
    favoriteLoading = false,
    onFavorite,
}) => {
    if (!recommendation) return null;

    const openMapWithAddress = (address) => {
        if (!address) return;
        const encodedAddress = encodeURIComponent(address);
        const url = `https://maps.apple.com/?address=${encodedAddress}`;
        Linking.openURL(url);
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.detailModal}>
                <View style={styles.detailModalHeader}>
                    <Text style={styles.detailModalTitle}>
                        {recommendation?.title || recommendation?.name}
                    </Text>
                    <TouchableOpacity style={styles.detailCloseButton} onPress={onClose}>
                        <Icons.X />
                    </TouchableOpacity>
                </View>

                <ScrollView style={styles.detailModalBody}>
                    {/* Quick Info Grid */}
                    <View style={styles.detailGrid}>
                        {isGameNightActivity ? (
                            <>
                                <View style={styles.detailItem}>
                                    <Icons.Users />
                                    <Text style={styles.detailLabel}>Players:</Text>
                                    <Text style={styles.detailValue}>
                                        {recommendation?.address || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Icons.Clock />
                                    <Text style={styles.detailLabel}>Play Time:</Text>
                                    <HoursDisplay
                                        hours={recommendation?.hours}
                                        style={styles.detailValue}
                                    />
                                </View>
                                <View style={styles.detailItem}>
                                    <Icons.DollarSign />
                                    <Text style={styles.detailLabel}>Price:</Text>
                                    <Text style={styles.detailValue}>
                                        {recommendation?.price_range || 'N/A'}
                                    </Text>
                                </View>
                            </>
                        ) : (
                            <>
                                <View style={styles.detailItem}>
                                    <Icons.DollarSign />
                                    <Text style={styles.detailLabel}>Price:</Text>
                                    <Text style={styles.detailValue}>
                                        {recommendation?.price_range || 'N/A'}
                                    </Text>
                                </View>
                                <View style={styles.detailItem}>
                                    <Icons.Clock />
                                    <Text style={styles.detailLabel}>Hours:</Text>
                                    <HoursDisplay
                                        hours={recommendation?.hours}
                                        style={styles.detailValue}
                                    />
                                </View>
                            </>
                        )}
                    </View>

                    {/* About Section */}
                    {recommendation?.description && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icons.HelpCircle />
                                <Text style={styles.sectionTitle}>About</Text>
                            </View>
                            <Text style={styles.description}>{recommendation.description}</Text>
                            {recommendation.website && (
                                <TouchableOpacity
                                    style={styles.websiteLink}
                                    onPress={() => Linking.openURL(recommendation.website)}
                                >
                                    <Icons.Globe />
                                    <Text style={styles.websiteLinkText}>Visit Website</Text>
                                    <Icons.ExternalLink />
                                </TouchableOpacity>
                            )}
                        </View>
                    )}

                    {/* Why This Place? */}
                    {recommendation?.reason && (
                        <View style={styles.reason}>
                            {isKeywordFormat(recommendation.reason) ? (
                                <KeywordTags
                                    keywords={recommendation.reason}
                                    style={styles.detailTags}
                                />
                            ) : (
                                <>
                                    <Text style={styles.reasonTitle}>
                                        {activityText.reasonTitle}
                                    </Text>
                                    <Text style={styles.reasonText}>{recommendation.reason}</Text>
                                </>
                            )}
                        </View>
                    )}

                    {/* Location */}
                    {!isGameNightActivity && recommendation?.address && (
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Icons.MapPin />
                                <Text style={styles.sectionTitle}>Location</Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => openMapWithAddress(recommendation.address)}
                            >
                                <Text style={[styles.description, styles.addressLink]}>
                                    {recommendation.address}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Photos */}
                    {!isGameNightActivity && recommendation?.photos && (
                        <PhotoGallery
                            photos={safeJsonParse(recommendation.photos, [])}
                        />
                    )}

                    {/* Reviews */}
                    {!isGameNightActivity && recommendation?.reviews && (() => {
                        const reviews = safeJsonParse(recommendation.reviews, []);
                        return reviews.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <Icons.Star />
                                    <Text style={styles.sectionTitle}>Reviews</Text>
                                </View>
                                {reviews.slice(0, 3).map((review, i) => (
                                    <TruncatedReview key={i} review={review} />
                                ))}
                            </View>
                        );
                    })()}
                </ScrollView>

                {/* Action Buttons */}
                <View style={styles.modalActionButtons}>
                    {/* Flag Button */}
                    {onFlagToggle && (
                        <TouchableOpacity
                            style={[
                                styles.modalActionButton,
                                isFlagged && styles.modalActionButtonActive
                            ]}
                            onPress={onFlagToggle}
                        >
                            <Icons.Flag
                                color={isFlagged ? "#e74c3c" : "#999"}
                                size={20}
                            />
                            <Text style={[
                                styles.modalActionButtonText,
                                isFlagged && styles.modalActionButtonTextActive
                            ]}>
                                {isFlagged ? 'Flagged' : 'Flag'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Favorite Button */}
                    {onFavorite && (
                        <TouchableOpacity
                            style={[
                                styles.modalActionButton,
                                styles.modalFavoriteButton,
                                isFavorited && styles.modalFavoriteButtonActive
                            ]}
                            onPress={onFavorite}
                            disabled={favoriteLoading}
                        >
                            {favoriteLoading ? (
                                <ActivityIndicator size="small" color="#D4AF37" />
                            ) : (
                                <>
                                    <Icons.Star
                                        color={isFavorited ? "#D4AF37" : "#fff"}
                                        size={20}
                                    />
                                    <Text style={[
                                        styles.modalFavoriteButtonText,
                                        isFavorited && styles.modalFavoriteButtonTextActive
                                    ]}>
                                        {isFavorited ? 'Favorited' : 'Add to Favorites'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>
            </SafeAreaView>
        </Modal>
    );
};

export default RecommendationDetailModal;
