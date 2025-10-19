import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Alert,
    ActivityIndicator,
    Modal,
    Animated,
    Image,
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

    // Loading animations
    const spinValue1 = React.useRef(new Animated.Value(0)).current;
    const pulseValue = React.useRef(new Animated.Value(0.8)).current;
    const pulseOpacity = React.useRef(new Animated.Value(0.8)).current;
    const bounceValue1 = React.useRef(new Animated.Value(0)).current;
    const bounceValue2 = React.useRef(new Animated.Value(0)).current;
    const bounceValue3 = React.useRef(new Animated.Value(0)).current;

    // Start animations when loading
    React.useEffect(() => {
        if (loading) {
            // Spinning and pulsing triangle
            const spinAnimation1 = Animated.loop(
                Animated.timing(spinValue1, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            );

            const pulseAnimation = Animated.loop(
                Animated.sequence([
                    Animated.parallel([
                        Animated.timing(pulseValue, {
                            toValue: 1.2,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseOpacity, {
                            toValue: 1,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.parallel([
                        Animated.timing(pulseValue, {
                            toValue: 0.8,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseOpacity, {
                            toValue: 0.5,
                            duration: 1000,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );

            // Bouncing dots
            const bounceAnimation1 = Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceValue1, {
                        toValue: -10,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue1, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
            const bounceAnimation2 = Animated.loop(
                Animated.sequence([
                    Animated.delay(200),
                    Animated.timing(bounceValue2, {
                        toValue: -10,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue2, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );
            const bounceAnimation3 = Animated.loop(
                Animated.sequence([
                    Animated.delay(400),
                    Animated.timing(bounceValue3, {
                        toValue: -10,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue3, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ])
            );

            spinAnimation1.start();
            pulseAnimation.start();
            bounceAnimation1.start();
            bounceAnimation2.start();
            bounceAnimation3.start();

            return () => {
                spinAnimation1.stop();
                pulseAnimation.stop();
                bounceAnimation1.stop();
                bounceAnimation2.stop();
                bounceAnimation3.stop();
            };
        }
    }, [loading]);

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

            logger.debug('SOLO ACTIVITY - Using activity location:', activity.activity_location);
            logger.debug('SOLO ACTIVITY - Using submitted response:', responsesText);

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

    return (
        <View style={styles.container}>
            {/* Exciting Loading Modal */}
            <Modal
                visible={loading}
                transparent
                animationType="fade"
            >
                <View style={styles.loadingModalOverlay}>
                    <View style={styles.loadingModalContainer}>
                        <View style={styles.loadingAnimation}>
                            <Animated.View
                                style={[
                                    styles.voxxyTriangleContainer,
                                    {
                                        transform: [
                                            {
                                                scale: pulseValue
                                            },
                                            {
                                                rotate: spinValue1.interpolate({
                                                    inputRange: [0, 1],
                                                    outputRange: ['0deg', '360deg']
                                                })
                                            }
                                        ],
                                        opacity: pulseOpacity
                                    }
                                ]}
                            >
                                <Image
                                    source={require('../assets/voxxy-triangle.png')}
                                    style={styles.voxxyTriangle}
                                    resizeMode="contain"
                                />
                            </Animated.View>
                        </View>
                        <Text style={styles.loadingModalTitle}>Crafting Your Perfect Experience</Text>
                        <Text style={styles.loadingModalSubtitle}>
                            {loadingType === 'profile'
                                ? 'Voxxy is using your profile preferences to find the best venues...'
                                : 'Voxxy is analyzing venues and personalizing recommendations...'}
                        </Text>
                        <Text style={styles.loadingModalTimeEstimate}>
                            This may take 10-20 seconds
                        </Text>
                        <View style={styles.loadingDots}>
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    styles.loadingDot1,
                                    { transform: [{ translateY: bounceValue1 }] }
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    styles.loadingDot2,
                                    { transform: [{ translateY: bounceValue2 }] }
                                ]}
                            />
                            <Animated.View
                                style={[
                                    styles.loadingDot,
                                    styles.loadingDot3,
                                    { transform: [{ translateY: bounceValue3 }] }
                                ]}
                            />
                        </View>
                    </View>
                </View>
            </Modal>

            <View style={styles.optionsContainer}>
                    {/* Use Profile Preferences Option */}
                    <TouchableOpacity
                        style={[
                            styles.optionCard,
                            !hasPreferences && !hasFavoriteFoods && styles.optionCardDisabled
                        ]}
                        onPress={handleUseProfilePreferences}
                        disabled={loading}
                        activeOpacity={0.8}
                    >
                        <View style={styles.iconContainer}>
                            <User stroke="#cc31e8" width={40} height={40} strokeWidth={2} />
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
                        activeOpacity={0.8}
                    >
                        <View style={styles.iconContainer}>
                            <MessageCircle stroke="#cc31e8" width={40} height={40} strokeWidth={2} />
                        </View>
                        <Text style={styles.optionTitle}>Submit Preferences</Text>
                        <Text style={styles.optionDescription}>
                            Tell us what you're in the mood for today
                        </Text>
                    </TouchableOpacity>
                </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
        paddingHorizontal: 24,
        paddingVertical: 40,
        justifyContent: 'flex-start',
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
        gap: 20,
    },
    optionCard: {
        backgroundColor: 'rgba(44, 30, 51, 0.95)',
        borderRadius: 20,
        padding: 32,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.4)',
        alignItems: 'center',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    optionCardDisabled: {
        opacity: 0.6,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        shadowOpacity: 0.1,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.4)',
    },
    optionTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    optionDescription: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
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
    // Loading Modal Styles
    loadingModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingModalContainer: {
        backgroundColor: 'rgba(44, 30, 51, 0.98)',
        borderRadius: 32,
        padding: 48,
        alignItems: 'center',
        width: '85%',
        maxWidth: 400,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.4)',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 24,
        elevation: 12,
    },
    loadingAnimation: {
        marginBottom: 32,
    },
    voxxyTriangleContainer: {
        width: 120,
        height: 120,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voxxyTriangle: {
        width: 100,
        height: 100,
    },
    loadingModalTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    loadingModalSubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 12,
        paddingHorizontal: 8,
    },
    loadingModalTimeEstimate: {
        fontSize: 14,
        color: 'rgba(204, 49, 232, 0.9)',
        textAlign: 'center',
        fontWeight: '600',
        marginBottom: 24,
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    loadingDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#cc31e8',
    },
    loadingDot1: {
        backgroundColor: '#cc31e8',
    },
    loadingDot2: {
        backgroundColor: '#9f25b3',
    },
    loadingDot3: {
        backgroundColor: '#721a7f',
    },
});
