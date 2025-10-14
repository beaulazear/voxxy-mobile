import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { User, MessageCircle } from 'lucide-react-native';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

export default function SoloActivityDecision({
    activity,
    onResponseModalOpen,
    onRecommendationsGenerated
}) {
    const { user } = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [loadingType, setLoadingType] = useState(null); // 'profile' or 'custom'

    // Check if user has complete preferences
    const hasPreferences = user?.preferences && user.preferences.trim().length > 0;
    const hasFavoriteFoods = user?.favorite_food && user.favorite_food.trim().length > 0;

    const handleUseProfilePreferences = async () => {
        if (!hasPreferences && !hasFavoriteFoods) {
            Alert.alert(
                'Incomplete Profile',
                'Please complete your preferences in your profile before using this option, or submit a custom response instead.',
                [{ text: 'OK' }]
            );
            return;
        }

        setLoading(true);
        setLoadingType('profile');

        try {
            // Create a response using profile preferences
            const notes = `Using profile preferences:
🥗 Dietary Needs: ${user.preferences || 'None'}
🍕 Favorite Foods: ${user.favorite_food || 'None'}`.trim();

            // Submit the response
            const responseData = await safeAuthApiCall(
                `${API_URL}/responses`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        response: {
                            notes,
                            activity_id: activity.id,
                        },
                    }),
                }
            );

            console.log('✅ Response API returned:', JSON.stringify(responseData));
            logger.log('✅ Full response data:', responseData);

            // Now generate recommendations immediately - pass the notes we just created
            await generateRecommendations(notes);

        } catch (error) {
            logger.error('❌ Error using profile preferences:', error);
            const userMessage = handleApiError(error, 'Failed to use profile preferences.');
            Alert.alert('Error', userMessage);
            setLoading(false);
            setLoadingType(null);
        }
    };

    const handleSubmitCustomResponse = () => {
        // Open the response modal for the user to fill out
        onResponseModalOpen();
    };

    const generateRecommendations = async (notesText) => {
        try {
            // Log the current activity for debugging
            console.log('🔍 SOLO ACTIVITY - Current activity object:', JSON.stringify({
                id: activity.id,
                activity_type: activity.activity_type,
                activity_location: activity.activity_location,
                activity_name: activity.activity_name,
                has_location: !!activity.activity_location
            }));
            logger.log('🔍 SOLO ACTIVITY - Current activity:', activity);

            // Determine the API endpoint based on activity type
            let apiEndpoint;
            switch (activity.activity_type) {
                case 'Restaurant':
                case 'Brunch':
                case 'Game Night':
                    apiEndpoint = '/api/openai/restaurant_recommendations';
                    break;
                case 'Bar':
                case 'Cocktails':
                    apiEndpoint = '/api/openai/bar_recommendations';
                    break;
                case 'Meeting':
                    // Meeting doesn't generate venue recommendations
                    throw new Error('Meeting activities do not generate venue recommendations');
                default:
                    apiEndpoint = '/api/openai/restaurant_recommendations';
            }

            // Use the notes passed in (either from profile or custom response)
            const responsesText = notesText;

            console.log('📍 SOLO ACTIVITY - Using activity location:', activity.activity_location);
            console.log('📝 SOLO ACTIVITY - Using submitted response:', responsesText);

            // Validate required parameters
            if (!activity.activity_location) {
                Alert.alert(
                    'Location Missing',
                    'This activity doesn\'t have a location set. Recommendations need a location to find nearby venues. Please edit the activity to add a location.',
                    [{ text: 'OK' }]
                );
                throw new Error('Activity location is required to generate recommendations');
            }

            if (!responsesText || !responsesText.trim()) {
                Alert.alert(
                    'Response Missing',
                    'No response was found. Please try submitting your preferences again.',
                    [{ text: 'OK' }]
                );
                throw new Error('At least one response is required to generate recommendations');
            }

            // Generate recommendations
            const recommendationsResponse = await safeAuthApiCall(
                `${API_URL}${apiEndpoint}`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        responses: responsesText,
                        activity_location: activity.activity_location,
                        date_notes: activity.date_notes || '',
                        activity_id: activity.id,
                    }),
                },
                30000 // 30 second timeout
            );

            if (!recommendationsResponse || !recommendationsResponse.recommendations || !Array.isArray(recommendationsResponse.recommendations)) {
                throw new Error('Invalid response format from recommendations API');
            }

            const recs = recommendationsResponse.recommendations;

            if (recs.length === 0) {
                throw new Error('No recommendations were generated. Please try again.');
            }

            // Create pinned activities from recommendations
            const pinnedActivityPromises = recs.map(rec =>
                safeAuthApiCall(
                    `${API_URL}/activities/${activity.id}/pinned_activities`,
                    user.token,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            pinned_activity: {
                                title: rec.name,
                                description: rec.description || '',
                                hours: rec.hours || '',
                                price_range: rec.price_range || '',
                                address: rec.address || '',
                                reason: rec.reason || '',
                                website: rec.website || '',
                            },
                        }),
                    }
                )
            );

            const newPinnedActivities = await Promise.all(pinnedActivityPromises);

            // Update activity to voting phase
            await safeAuthApiCall(
                `${API_URL}/activities/${activity.id}`,
                user.token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        collecting: false,
                        voting: true
                    }),
                }
            );

            logger.debug('✅ Recommendations generated successfully');

            // Notify parent component
            onRecommendationsGenerated(newPinnedActivities);

        } catch (error) {
            logger.error('❌ Error generating recommendations:', error);
            const userMessage = handleApiError(error, 'Failed to generate recommendations.');
            Alert.alert('Error', userMessage);
            throw error;
        } finally {
            setLoading(false);
            setLoadingType(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#cc31e8" />
                    <Text style={styles.loadingText}>
                        {loadingType === 'profile'
                            ? 'Generating recommendations from your profile...'
                            : 'Generating recommendations...'}
                    </Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <Text style={styles.title}>Ready for recommendations?</Text>
                <Text style={styles.subtitle}>
                    Since you're flying solo, let's get you some great options right away!
                </Text>

                <View style={styles.optionsContainer}>
                    {/* Use Profile Preferences Option */}
                    <TouchableOpacity
                        style={[
                            styles.optionCard,
                            !hasPreferences && !hasFavoriteFoods && styles.optionCardDisabled
                        ]}
                        onPress={handleUseProfilePreferences}
                        disabled={loading}
                    >
                        <View style={styles.iconContainer}>
                            <User stroke="#cc31e8" width={32} height={32} />
                        </View>
                        <Text style={styles.optionTitle}>Use My Profile</Text>
                        <Text style={styles.optionDescription}>
                            Get recommendations based on your saved preferences
                        </Text>
                        {(!hasPreferences && !hasFavoriteFoods) && (
                            <View style={styles.warningBadge}>
                                <Text style={styles.warningText}>Complete your profile first</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {/* Submit Custom Response Option */}
                    <TouchableOpacity
                        style={styles.optionCard}
                        onPress={handleSubmitCustomResponse}
                        disabled={loading}
                    >
                        <View style={styles.iconContainer}>
                            <MessageCircle stroke="#cc31e8" width={32} height={32} />
                        </View>
                        <Text style={styles.optionTitle}>Submit Preferences</Text>
                        <Text style={styles.optionDescription}>
                            Tell us what you're in the mood for today
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
        padding: 20,
        justifyContent: 'center',
    },
    card: {
        backgroundColor: '#2C1E33',
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.2)',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        marginBottom: 32,
        textAlign: 'center',
        lineHeight: 22,
    },
    optionsContainer: {
        gap: 16,
    },
    optionCard: {
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        alignItems: 'center',
    },
    optionCardDisabled: {
        opacity: 0.5,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    optionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    optionDescription: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 20,
    },
    warningBadge: {
        marginTop: 12,
        backgroundColor: 'rgba(255, 152, 0, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    warningText: {
        fontSize: 12,
        color: '#ff9800',
        fontWeight: '600',
    },
    loadingContainer: {
        backgroundColor: 'rgba(32, 25, 37, 0.95)',
        borderRadius: 16,
        padding: 32,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        textAlign: 'center',
    },
});
