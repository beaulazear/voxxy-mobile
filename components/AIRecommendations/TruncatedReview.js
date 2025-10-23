import React, { useState } from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../styles/AIRecommendationsStyles';

const Icons = {
    Star: (props) => <Icon name="star" size={16} color="#cc31e8" {...props} />,
};

/**
 * TruncatedReview Component
 * Displays a review with expand/collapse functionality for long text
 * @param {Object} review - Review object with text, author_name, and rating
 * @param {number} maxLength - Maximum length before truncation (default: 150)
 */
const TruncatedReview = ({ review, maxLength = 150 }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const shouldTruncate = review.text && review.text.length > maxLength;

    const displayText = shouldTruncate && !isExpanded
        ? review.text.substring(0, maxLength) + '...'
        : review.text;

    return (
        <View style={styles.reviewItem}>
            <View style={styles.reviewHeader}>
                <Text style={styles.reviewAuthor}>{review.author_name || 'Anonymous'}</Text>
                {review.rating && (
                    <View style={styles.reviewRating}>
                        <Icons.Star color="#D4AF37" />
                        <Text style={styles.reviewRatingText}>{review.rating}/5</Text>
                    </View>
                )}
            </View>
            <Text style={styles.reviewText}>
                {displayText}
                {shouldTruncate && (
                    <Text
                        style={styles.reviewToggleButton}
                        onPress={() => setIsExpanded(!isExpanded)}
                    >
                        {isExpanded ? ' Show less' : ' Show more'}
                    </Text>
                )}
            </Text>
        </View>
    );
};

export default TruncatedReview;
