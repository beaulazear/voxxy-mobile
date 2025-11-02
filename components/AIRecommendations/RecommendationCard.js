import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Icons } from '../../constants/featherIcons';
import KeywordTags from './KeywordTags';
import { isKeywordFormat } from '../../utils/recommendationsUtils';
import styles from '../../styles/AIRecommendationsStyles';

/**
 * RecommendationCard Component
 *
 * Displays an individual recommendation card with title, price, description/keywords, and address.
 * Handles tap-to-view-details functionality and shows favorited state with visual styling.
 *
 * @param {Object} recommendation - The recommendation object to display
 * @param {Function} onPress - Callback when card is tapped
 * @param {boolean} isFavorited - Whether this recommendation is favorited
 * @param {boolean} isGameNightActivity - Whether this is a Game Night activity type
 */
const RecommendationCard = ({
    recommendation,
    onPress,
    isFavorited = false,
    isGameNightActivity = false,
}) => {
    return (
        <TouchableOpacity
            key={recommendation.id}
            style={[
                styles.recommendationCard,
                isFavorited && styles.recommendationCardFavorited
            ]}
            onPress={() => onPress(recommendation)}
            activeOpacity={0.7}
        >
            <View style={styles.recCardContent}>
                {/* Title and Price Row */}
                <View style={styles.recCardHeader}>
                    <View style={styles.recCardTitleRow}>
                        {isFavorited && (
                            <Icons.Star color="#D4AF37" size={14} fill="#D4AF37" style={{ marginRight: 6 }} />
                        )}
                        <Text style={styles.recCardTitle} numberOfLines={1}>
                            {recommendation.title}
                        </Text>
                    </View>
                    {recommendation.price_range && (
                        <View style={styles.recCardPriceTag}>
                            <Text style={styles.recCardPrice}>
                                {recommendation.price_range}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Description or Keywords */}
                {recommendation.reason && isKeywordFormat(recommendation.reason) ? (
                    <KeywordTags keywords={recommendation.reason} style={styles.recCardTags} />
                ) : (
                    (recommendation.description || recommendation.reason) && (
                        <Text style={styles.recCardDescription} numberOfLines={2}>
                            {recommendation.description || recommendation.reason}
                        </Text>
                    )
                )}

                {/* Address */}
                {recommendation.address && (
                    <View style={styles.recCardAddressRow}>
                        <Icons.MapPin color="rgba(255, 255, 255, 0.5)" size={13} />
                        <Text style={styles.recCardAddressText} numberOfLines={1}>
                            {recommendation.address}
                        </Text>
                    </View>
                )}
            </View>

            {/* Chevron indicator */}
            <View style={styles.recCardChevron}>
                <Icons.ChevronRight color="rgba(255, 255, 255, 0.3)" size={20} />
            </View>
        </TouchableOpacity>
    );
};

export default RecommendationCard;
