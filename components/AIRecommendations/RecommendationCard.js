import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
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
            <LinearGradient
                colors={isFavorited
                    ? ['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.08)']
                    : ['rgba(204, 49, 232, 0.08)', 'rgba(155, 29, 189, 0.05)']
                }
                style={styles.recCardGradient}
            >
                <View style={styles.recCardContent}>
                    {/* Header with Title and Price */}
                    <View style={styles.recCardHeader}>
                        <Text style={styles.recCardTitle} numberOfLines={1}>
                            {recommendation.title}
                        </Text>
                        <Text style={styles.recCardPrice}>
                            {recommendation.price_range || '$'}
                        </Text>
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
                            <Icons.MapPin color="#B8A5C4" size={14} />
                            <Text style={styles.recCardAddressText} numberOfLines={1}>
                                {recommendation.address}
                            </Text>
                        </View>
                    )}
                </View>

                {/* Chevron indicator */}
                <View style={styles.recCardChevron}>
                    <Icons.ChevronRight color="#B8A5C4" size={20} />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );
};

export default RecommendationCard;
