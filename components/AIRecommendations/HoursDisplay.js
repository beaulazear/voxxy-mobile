import React from 'react';
import { View, Text } from 'react-native';
import styles from '../../styles/AIRecommendationsStyles';
import { formatHours } from '../../utils/recommendationsUtils';

/**
 * HoursDisplay Component
 * Displays business hours in a stylized, formatted way
 * @param {string} hours - Raw hours string to format
 * @param {Object} style - Additional styles to apply
 * @param {boolean} compact - Whether to show compact view (default: false)
 */
const HoursDisplay = ({ hours, style, compact = false }) => {
    const hoursData = formatHours(hours);

    if (hoursData.type === 'simple') {
        return <Text style={style}>{hoursData.text}</Text>;
    }

    if (compact) {
        // For compact view, just show the first group
        const firstGroup = hoursData.groups[0];
        const moreCount = hoursData.groups.length - 1;
        return (
            <Text style={style}>
                {firstGroup.days}: {firstGroup.hours}
                {moreCount > 0 && ` +${moreCount}`}
            </Text>
        );
    }

    return (
        <View style={styles.hoursContainer}>
            {hoursData.groups.map((group, index) => (
                <View key={index} style={styles.hoursRow}>
                    <Text style={styles.hoursDays}>{group.days}:</Text>
                    <Text style={styles.hoursTime}>{group.hours}</Text>
                </View>
            ))}
        </View>
    );
};

export default HoursDisplay;
