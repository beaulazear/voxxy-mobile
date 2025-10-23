import React from 'react';
import { View, Text } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../styles/AIRecommendationsStyles';
import { analyzeAvailability } from '../../utils/recommendationsUtils';

const Icons = {
    Calendar: (props) => <Icon name="calendar" size={16} color="#cc31e8" {...props} />,
};

/**
 * AvailabilityDisplay Component
 * Displays participant availability for group activities with time selection
 * @param {Array} responses - Array of response objects with availability data
 * @param {Object} activity - Activity object with settings
 */
const AvailabilityDisplay = ({ responses, activity }) => {
    if (!activity.allow_participant_time_selection) return null;

    const responsesWithAvailability = (responses || []).filter(r =>
        r.availability && Object.keys(r.availability).length > 0
    );

    if (responsesWithAvailability.length === 0) {
        return (
            <View style={styles.availabilitySection}>
                <View style={styles.availabilityHeader}>
                    <Icons.Calendar />
                    <Text style={styles.availabilityTitle}>Time Preferences</Text>
                </View>
                <Text style={styles.availabilityEmptyText}>
                    No availability submitted yet. Participants will share their preferred times along with their preferences.
                </Text>
            </View>
        );
    }

    const { availabilityData, participantCount } = analyzeAvailability(responsesWithAvailability);

    return (
        <View style={styles.availabilitySection}>
            <View style={styles.availabilityHeader}>
                <Icons.Calendar />
                <Text style={styles.availabilityTitle}>
                    Group Availability ({responsesWithAvailability.length} responses)
                </Text>
            </View>

            {responsesWithAvailability.map((response, index) => (
                <View key={index} style={styles.participantAvailability}>
                    <Text style={styles.participantName}>
                        {response.user?.name || response.email || 'Anonymous'}
                    </Text>
                    <View style={styles.availabilityGrid}>
                        {Object.entries(response.availability || {}).map(([date, times]) => (
                            <View key={date} style={styles.dateCard}>
                                <Text style={styles.dateHeader}>
                                    {new Date(date).toLocaleDateString()}
                                </Text>
                                <View style={styles.timeSlots}>
                                    {times.map((time, i) => (
                                        <View key={i} style={styles.timeSlot}>
                                            <Text style={styles.timeSlotText}>{time}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
            ))}

            {Object.keys(availabilityData).length > 0 && (
                <View style={styles.overlapAnalysis}>
                    <View style={styles.overlapTitleContainer}>
                        <Icon name="bar-chart-2" size={16} color="#fff" />
                        <Text style={styles.overlapTitle}>Best Times (Most Available)</Text>
                    </View>
                    {Object.entries(availabilityData).map(([date, timeData]) => {
                        const sortedTimes = Object.entries(timeData)
                            .sort(([, a], [, b]) => b.length - a.length)
                            .slice(0, 5);

                        return (
                            <View key={date} style={styles.bestTimeCard}>
                                <Text style={styles.bestTimeDateHeader}>
                                    {new Date(date).toLocaleDateString()}
                                    <Text style={styles.participantCountText}>
                                        {' '}({participantCount[date]} participant{participantCount[date] !== 1 ? 's' : ''})
                                    </Text>
                                </Text>
                                {sortedTimes.map(([time, participants]) => {
                                    const percentage = (participants.length / responsesWithAvailability.length) * 100;
                                    return (
                                        <View key={time} style={styles.timeOverlapItem}>
                                            <Text style={styles.timeText}>{time}</Text>
                                            <View style={[
                                                styles.availabilityBadge,
                                                { backgroundColor: percentage > 75 ? '#28a745' : percentage > 50 ? '#ffc107' : '#dc3545' }
                                            ]}>
                                                <Text style={styles.availabilityBadgeText}>
                                                    {participants.length}/{responsesWithAvailability.length} available ({Math.round(percentage)}%)
                                                </Text>
                                            </View>
                                        </View>
                                    );
                                })}
                            </View>
                        );
                    })}
                </View>
            )}
        </View>
    );
};

export default AvailabilityDisplay;
