import React, { useState, useContext, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    Alert,
    Dimensions,
    Image,
    FlatList,
    Animated,
    ActivityIndicator,
    Linking,
    Platform,
    SafeAreaView,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import Icon from 'react-native-vector-icons/Feather';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from '../styles/AIRecommendationsStyles';
import { modalStyles, modalColors } from '../styles/modalStyles';
import NativeMapView from './NativeMapView';
import DraggableBottomSheet from './DraggableBottomSheet';
import RecommendationDetails from './RecommendationDetails';
import DefaultIcon from '../assets/pfp-placeholder.png';
import { avatarMap } from '../utils/avatarManager';
import { Icons } from '../constants/featherIcons';
import CuisineResponseForm from './CuisineResponseForm';
import NightOutResponseForm from './NightOutResponseForm';
import LetsMeetScheduler from './LetsMeetScheduler';
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import {
    safeJsonParse,
    userHasProfilePreferences,
    isKeywordFormat,
    formatHours,
    analyzeAvailability
} from '../utils/recommendationsUtils';
import KeywordTags from './AIRecommendations/KeywordTags';
import TruncatedReview from './AIRecommendations/TruncatedReview';
import PhotoGallery from './AIRecommendations/PhotoGallery';
import HoursDisplay from './AIRecommendations/HoursDisplay';
import AvailabilityDisplay from './AIRecommendations/AvailabilityDisplay';
import RecommendationCard from './AIRecommendations/RecommendationCard';
import RecommendationDetailModal from './AIRecommendations/RecommendationDetailModal';
import MapViewContainer from './AIRecommendations/MapViewContainer';
import CommentsSection from './CommentsSection';
import AIGenerationLoader from './AIGenerationLoader';

// Helper function to get avatar from map
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null;
    } catch (error) {
        logger.debug(`⚠️ Avatar ${filename} not found in mapping`);
        return null;
    }
};

// Helper function to get user's display image
const getUserDisplayImage = (userObj) => {
    if (!userObj) return DefaultIcon;

    if (userObj?.profile_pic_url) {
        const profilePicUrl = userObj.profile_pic_url.startsWith('http')
            ? userObj.profile_pic_url
            : `${API_URL}${userObj.profile_pic_url}`;
        return { uri: profilePicUrl };
    }

    if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
        const avatarFilename = userObj.avatar.includes('/')
            ? userObj.avatar.split('/').pop()
            : userObj.avatar;

        const mappedAvatar = getAvatarFromMap(avatarFilename);
        if (mappedAvatar) return mappedAvatar;

        if (userObj.avatar.startsWith('http')) {
            return { uri: userObj.avatar };
        }
    }

    return DefaultIcon;
};

export default function AIRecommendations({
    activity,
    pinnedActivities,
    setPinnedActivities,
    setPinned,
    setRefreshTrigger,
    isOwner,
    onEdit,
    onDelete,
    onReport,
    onLeave,
    onFinalize,
    onSoloComplete,
    viewMode = 'cards',
    onViewModeChange,
    onScroll,
    onContentSizeChange,
    onLayout,
}) {
    const { user, setUser, refreshUser } = useContext(UserContext);
    const navigation = useNavigation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [selectedRec, setSelectedRec] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showGenerateModal, setShowGenerateModal] = useState(false);

    // Favoriting states
    const [userFavorites, setUserFavorites] = useState([]);
    const [flaggedRecommendations, setFlaggedRecommendations] = useState([]);
    const [favoriteLoading, setFavoriteLoading] = useState({});
    const [loadingFavorites, setLoadingFavorites] = useState(false);

    // Bottom sheet state for map markers
    const [selectedMapMarker, setSelectedMapMarker] = useState(null);
    const [showMapBottomSheet, setShowMapBottomSheet] = useState(false);

    // Close bottom sheet when view mode changes
    useEffect(() => {
        if (showMapBottomSheet) {
            setShowMapBottomSheet(false);
            setSelectedMapMarker(null);
        }
    }, [viewMode]);

    // Fetch user favorites from API
    const fetchUserFavorites = async () => {
        if (!user?.token) {
            logger.debug('No user token available for fetching favorites');
            return;
        }
        
        logger.debug('Fetching favorites from:', `${API_URL}/user_activities/favorited`);
        setLoadingFavorites(true);
        try {
            const favorites = await safeAuthApiCall(
                `${API_URL}/user_activities/favorited`,
                user.token,
                { method: 'GET' }
            );
            
            // Filter out favorites where the activity has been deleted
            const validFavorites = (favorites || []).filter(fav => {
                const hasActivity = fav.activity || fav.pinned_activity?.activity;
                if (!hasActivity) {
                    logger.debug('Filtering out favorite with no activity:', fav);
                }
                return hasActivity;
            });

            logger.debug('⭐ Fetched user favorites:', {
                totalFavorites: validFavorites.length,
                favorites: validFavorites.map(fav => ({
                    id: fav.id,
                    pinnedActivityId: fav.pinned_activity?.id || fav.pinned_activity_id,
                    title: fav.pinned_activity?.title || fav.title,
                    activityName: fav.activity?.activity_name
                }))
            });

            setUserFavorites(validFavorites);
        } catch (error) {
            logger.error('Error fetching favorites:', error);
            const userMessage = handleApiError(error, 'Failed to load favorites. Please try again.');
            // Only show alert for non-network errors to avoid spam
            if (!error.message.includes('Network connection failed')) {
                Alert.alert('Error', userMessage);
            }
        } finally {
            setLoadingFavorites(false);
        }
    };
    
    // Fetch favorites when component mounts or user changes
    useEffect(() => {
        if (user?.token) {
            fetchUserFavorites();
        }
    }, [user?.token]);
    
    // Refresh favorites when screen is focused (user might have favorited something elsewhere)
    useFocusEffect(
        React.useCallback(() => {
            if (user?.token) {
                fetchUserFavorites();
            }
        }, [user?.token])
    );

    // Generate button pulse animation
    const pulseValue = React.useRef(new Animated.Value(1)).current;
    const pulseOpacity = React.useRef(new Animated.Value(0.8)).current;

    // Helper function to check if a recommendation is favorited
    const isRecommendationFavorited = (recommendation) => {
        if (!recommendation || !userFavorites || userFavorites.length === 0) {
            logger.debug('isRecommendationFavorited: No recommendation or no favorites', {
                hasRecommendation: !!recommendation,
                favoritesCount: userFavorites?.length || 0
            });
            return false;
        }

        // Get the recommendation name (could be title or name)
        const recName = recommendation.title || recommendation.name;

        if (!recName) {
            logger.debug('isRecommendationFavorited: No name found for recommendation', recommendation);
            return false;
        }

        const result = userFavorites.some(fav => {
            // Get the favorite's name from pinned_activity
            const favName = fav.pinned_activity?.title || fav.pinned_activity?.name || fav.title || fav.name;
            const matches = favName && recName && favName.toLowerCase().trim() === recName.toLowerCase().trim();

            if (matches) {
                logger.debug('✅ Found favorited recommendation by name:', {
                    recName,
                    favName,
                    pinnedActivityId: fav.pinned_activity?.id || fav.pinned_activity_id
                });
            }
            return matches;
        });

        if (!result) {
            logger.debug('❌ Recommendation not favorited:', {
                recName,
                availableFavoriteNames: userFavorites.map(f => f.pinned_activity?.title || f.pinned_activity?.name || f.title || f.name)
            });
        }

        return result;
    };

    // Memoize map recommendations to prevent map resets on re-renders
    const mapRecommendations = useMemo(() => {
        const result = pinnedActivities.map(rec => ({
            ...rec,
            name: rec.title || rec.name,
            id: rec.id || `${rec.title}-${rec.address}`,
            isFavorite: isRecommendationFavorited(rec)
        }));

        logger.debug('🗺️ Map recommendations created:', {
            total: result.length,
            favorited: result.filter(r => r.isFavorite).length,
            recommendations: result.map(r => ({
                id: r.id,
                title: r.title,
                isFavorite: r.isFavorite
            }))
        });

        return result;
    }, [pinnedActivities, userFavorites]); // Only recalculate when pinnedActivities or favorites change

    // Start pulse animation for generate button
    React.useEffect(() => {
        if (collecting && isOwner) {
            const pulseAnimation = Animated.loop(
                Animated.parallel([
                    Animated.sequence([
                        Animated.timing(pulseValue, {
                            toValue: 1.12,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseValue, {
                            toValue: 1,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ]),
                    Animated.sequence([
                        Animated.timing(pulseOpacity, {
                            toValue: 0.3,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                        Animated.timing(pulseOpacity, {
                            toValue: 0.8,
                            duration: 1500,
                            useNativeDriver: true,
                        }),
                    ]),
                ])
            );
            pulseAnimation.start();

            return () => pulseAnimation.stop();
        }
    }, [collecting, isOwner]);

    const { id, responses = [], activity_location, date_notes, collecting, finalized, voting, completed, active } = activity;

    const activityType = activity.activity_type || 'Restaurant';

    const isNightOutActivity = activityType === 'Cocktails';
    const isBrunchActivity = activityType === 'Brunch'; // Legacy support
    const isMeetingActivity = activityType === 'Meeting';
    const isGameNightActivity = activityType === 'Game Night'; // Legacy support

    const getActivityText = () => {
        if (isNightOutActivity) {
            return {
                submitTitle: 'Collecting Preferences',
                submitDescription: 'Help us plan the perfect night out by sharing your food, drink, and atmosphere preferences',
                finalizedTitle: 'Drinks Finalized',
                preferencesQuiz: 'Take Bar Preferences Quiz',
                resubmitPreferences: 'Resubmit Bar Preferences',
                reasonTitle: 'Why This Option?',
                apiEndpoint: '/api/openai/bar_recommendations'
            };
        }

        if (isBrunchActivity) {
            return {
                submitTitle: 'Collecting Preferences',
                submitDescription: 'Help us find the perfect brunch spot by sharing your food and atmosphere preferences',
                finalizedTitle: 'Brunch Spot Selected',
                preferencesQuiz: 'Take Brunch Preferences Quiz',
                resubmitPreferences: 'Resubmit Brunch Preferences',
                reasonTitle: 'Why This Spot?',
                apiEndpoint: '/api/openai/restaurant_recommendations'
            };
        }

        if (isMeetingActivity) {
            return {
                submitTitle: 'Collecting Preferences',
                submitDescription: 'Help us find the perfect meeting spot by sharing your workspace and atmosphere needs',
                finalizedTitle: 'Meeting Finalized',
                preferencesQuiz: 'Take Meeting Preferences Quiz',
                resubmitPreferences: 'Resubmit Meeting Preferences',
                reasonTitle: 'Why This Location?',
                apiEndpoint: '/api/openai/meeting_recommendations'
            };
        }

        return {
            submitTitle: 'Collecting Preferences',
            submitDescription: 'Help us find the perfect restaurant by sharing your food preferences and dietary needs',
            finalizedTitle: 'Activity Finalized',
            preferencesQuiz: 'Take Preferences Quiz',
            resubmitPreferences: 'Resubmit Preferences',
            reasonTitle: 'Why This Restaurant?',
            apiEndpoint: '/api/openai/restaurant_recommendations'
        };
    };

    const activityText = getActivityText();

    const allParticipants = activity.participants || [];
    const totalParticipants = allParticipants.length + 1;

    const currentUserResponse = user ? responses.find(r =>
        r.user_id === user.id || r.email === user.email
    ) : null;

    // Calculate participation based on responses OR profile preferences
    // Create list of all members including host
    const allMembers = [
        { id: activity.user_id || activity.user?.id, user: activity.user, isHost: true },
        ...allParticipants.map(p => ({ id: p.id, user: p, isHost: false }))
    ];

    // Count members who have either a response OR profile preferences
    const membersWithInput = allMembers.filter(member => {
        // Check if they have a response
        const hasResponse = responses.some(r => r.user_id === member.id);

        // Get the full user object with all preference data
        // If it's the current logged-in user, use the user from context (has all data)
        // Otherwise, use the member.user object
        const fullUserObject = member.id === user?.id ? user : member.user;

        const hasPreferences = userHasProfilePreferences(fullUserObject, activityType);

        // Debug logging with full data visibility
        logger.debug(`👤 Member ${fullUserObject?.name || member.id}:`, {
            id: member.id,
            isHost: member.isHost,
            isCurrentUser: member.id === user?.id,
            hasResponse,
            hasPreferences,
            hasFavoriteFood: fullUserObject?.favorite_food?.length > 0,
            hasPreferencesField: fullUserObject?.preferences?.length > 0,
            hasDietaryPrefs: !!(fullUserObject?.dairy_free || fullUserObject?.gluten_free || fullUserObject?.vegan || fullUserObject?.vegetarian || fullUserObject?.kosher),
            fullUserData: {
                favorite_food: fullUserObject?.favorite_food,
                preferences: fullUserObject?.preferences,
                dairy_free: fullUserObject?.dairy_free,
                gluten_free: fullUserObject?.gluten_free,
                vegan: fullUserObject?.vegan,
                vegetarian: fullUserObject?.vegetarian,
                kosher: fullUserObject?.kosher
            },
            willCount: hasResponse || hasPreferences
        });

        if (hasResponse) return true;

        // Check if they have profile preferences
        return hasPreferences;
    }).length;

    const totalWithInput = membersWithInput;
    const responseRate = (totalWithInput / totalParticipants) * 100;

    logger.debug('📊 Participation summary:', {
        totalMembers: totalParticipants,
        membersWithInput: totalWithInput,
        responseRate: Math.round(responseRate),
        responsesCount: responses.length
    });

    const handleStartChat = () => {
        setShowChat(true);
    };

    const handleChatComplete = (response, comment) => {
        logger.debug('Chat completed:', { response, comment });
        setShowChat(false);
        // Trigger a refresh to update the UI
        if (setRefreshTrigger) {
            setRefreshTrigger(prev => !prev);
        }
    };

    const handleChatClose = () => {
        setShowChat(false);
    };

    // Render the appropriate chat component based on activity type
    const renderChatComponent = () => {
        if (!showChat) return null;

        const cleanActivityType = activityType?.trim();

        switch (cleanActivityType) {
            case 'Restaurant':
                return (
                    <CuisineResponseForm
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        onResponseComplete={handleChatComplete}
                        guestMode={false}
                    />
                );

            case 'Cocktails':
                return (
                    <NightOutResponseForm
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        onResponseComplete={handleChatComplete}
                        guestMode={false}
                    />
                );

            // Legacy support for Brunch - treat as Restaurant
            case 'Brunch':
                return (
                    <CuisineResponseForm
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        onResponseComplete={handleChatComplete}
                        guestMode={false}
                    />
                );
            
            // Legacy support for Game Night - treat as Restaurant
            case 'Game Night':
                return (
                    <CuisineResponseForm
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        onResponseComplete={handleChatComplete}
                        guestMode={false}
                    />
                );

            case 'Meeting':
                return (
                    <LetsMeetScheduler
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        currentActivity={activity}
                        responseSubmitted={false}
                        isUpdate={!!currentUserResponse}
                        onAvailabilityUpdate={handleChatComplete}
                        guestMode={false}
                        guestToken={null}
                        guestEmail={null}
                        onChatComplete={handleChatComplete}
                    />
                );

            default:
                // Fallback to cuisine form for unknown types
                return (
                    <CuisineResponseForm
                        visible={showChat}
                        onClose={handleChatClose}
                        activityId={id}
                        onResponseComplete={handleChatComplete}
                        guestMode={false}
                    />
                );
        }
    };

    const generateRecommendations = async () => {
        setShowGenerateModal(false);
        setLoading(true);
        setError('');

        if (!user?.token) {
            setError('Authentication required');
            setLoading(false);
            return;
        }

        try {
            const response = await safeAuthApiCall(
                `${API_URL}${activityText.apiEndpoint}`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        responses: responses.map(r => r.notes).join('\n\n'),
                        activity_location,
                        date_notes,
                        activity_id: id,
                    }),
                },
                30000 // 30 second timeout for AI recommendations
            );

            // Add null checking and validation
            if (!response || !response.recommendations || !Array.isArray(response.recommendations)) {
                throw new Error('Invalid response format from recommendations API');
            }

            const recs = response.recommendations;

            // Ensure we have recommendations before proceeding
            if (recs.length === 0) {
                throw new Error('No recommendations were generated. Please try again.');
            }

            const pinnedActivityPromises = recs.map(rec =>
                safeAuthApiCall(
                    `${API_URL}/activities/${id}/pinned_activities`,
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

            let pinnedTimeSlotPromises = [];
            if (activity.allow_participant_time_selection) {
                const availabilityMap = {};
                responses.forEach(response => {
                    const availability = response.availability;
                    if (!availability) return;

                    Object.entries(availability).forEach(([date, times]) => {
                        if (!Array.isArray(times)) return;
                        if (!availabilityMap[date]) availabilityMap[date] = {};
                        times.forEach(time => {
                            availabilityMap[date][time] = (availabilityMap[date][time] || 0) + 1;
                        });
                    });
                });

                const allSlots = [];
                Object.entries(availabilityMap).forEach(([date, times]) => {
                    Object.entries(times).forEach(([time, count]) => {
                        allSlots.push({ date, time, count });
                    });
                });

                const topSlots = allSlots
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 8);

                pinnedTimeSlotPromises = topSlots.map(slot =>
                    safeAuthApiCall(
                        `${API_URL}/activities/${id}/time_slots`,
                        user.token,
                        {
                            method: 'POST',
                            body: JSON.stringify({
                                date: slot.date,
                                time: slot.time
                            }),
                        }
                    )
                );
            }

            const [newPinnedActivities, newTimeSlots] = await Promise.all([
                Promise.all(pinnedActivityPromises),
                Promise.all(pinnedTimeSlotPromises)
            ]);

            // Update activity to voting phase
            await safeAuthApiCall(`${API_URL}/activities/${id}`, user.token, {
                method: 'PATCH',
                body: JSON.stringify({
                    collecting: false,
                    voting: true
                }),
            });

            if (user && setUser) {
                setUser(prevUser => ({
                    ...prevUser,
                    activities: prevUser.activities.map(act =>
                        act.id === id
                            ? { ...act, collecting: false, voting: true, pinned_activities: newPinnedActivities }
                            : act
                    )
                }));
            }

            setPinnedActivities(newPinnedActivities);
            setPinned(newTimeSlots);
            setRefreshTrigger(f => !f);

            // Also refresh user data to ensure everything is in sync
            if (refreshUser) {
                setTimeout(() => refreshUser(), 1000); // Small delay to ensure backend is updated
            }

        } catch (err) {
            const errorMessage = handleApiError(err, 'Failed to generate recommendations');
            setError(errorMessage);
            Alert.alert('Error', errorMessage);
        } finally {
            setLoading(false);
        }
    };



    const openDetail = (rec) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedRec(rec);
        setShowDetailModal(true);
    };

    const closeDetail = () => {
        setShowDetailModal(false);
        setSelectedRec(null);
    };

    const sharePlanUrlClick = async () => {
        const shareUrl = `${API_URL}/activities/${activity.id}/share`;
        try {
            await Share.share({
                message: `Check out our plan: ${activity.activity_name}\n\n${shareUrl}`,
                url: shareUrl,
                title: activity.activity_name
            });
        } catch (_error) {
            Alert.alert('Error', 'Could not share link');
        }
    };

    // Get count of favorited recommendations from current pinned activities
    const getFavoritedRecommendationsFromCurrent = () => {
        if (!pinnedActivities || pinnedActivities.length === 0) return [];
        return pinnedActivities.filter(rec => isRecommendationFavorited(rec));
    };

    const handleFavorite = async (recommendation) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

        logger.debug('💖 handleFavorite called:', {
            recommendationId: recommendation.id,
            recommendationTitle: recommendation.title,
            hasId: !!recommendation.id
        });

        if (!recommendation.id) {
            Alert.alert('Error', 'Unable to favorite this recommendation');
            return;
        }

        // Check if already favorited by looking through user's actual favorites
        // Match by name since IDs may differ between recommendations and favorites
        const recName = recommendation.title || recommendation.name;
        const isAlreadyFavorited = userFavorites.some(fav => {
            const favName = fav.pinned_activity?.title || fav.pinned_activity?.name || fav.title || fav.name;
            return favName && recName && favName.toLowerCase().trim() === recName.toLowerCase().trim();
        });

        logger.debug('Checking if already favorited:', {
            recommendationId: recommendation.id,
            recommendationName: recName,
            isAlreadyFavorited,
            currentFavorites: userFavorites.map(f => ({
                pinnedActivityId: f.pinned_activity?.id || f.pinned_activity_id,
                name: f.pinned_activity?.title || f.pinned_activity?.name || f.title || f.name
            }))
        });

        if (isAlreadyFavorited) {
            // For now, we don't handle unfavoriting
            Alert.alert('Already Favorited', 'This recommendation is already in your favorites.');
            return;
        }

        // Set loading state for this specific recommendation
        setFavoriteLoading(prev => ({ ...prev, [recommendation.id]: true }));

        try {
            logger.debug('🚀 Calling toggle_favorite API:', {
                url: `${API_URL}/pinned_activities/${recommendation.id}/toggle_favorite`
            });

            // Make immediate API call to toggle favorite
            const result = await safeAuthApiCall(
                `${API_URL}/pinned_activities/${recommendation.id}/toggle_favorite`,
                user.token,
                { method: 'POST' }
            );

            logger.debug('✅ Toggle favorite API response:', result);

            // Refresh favorites from server to ensure consistency
            await fetchUserFavorites();
            
            Alert.alert('Success', `${recommendation.title} has been added to your favorites!`);
        } catch (error) {
            logger.error('Failed to favorite recommendation:', error);
            Alert.alert('Error', 'Failed to add to favorites. Please try again.');
        } finally {
            setFavoriteLoading(prev => ({ ...prev, [recommendation.id]: false }));
        }
    };

    const openMapWithAddress = (address) => {
        if (!address) return;
        
        // Encode the address for URL
        const encodedAddress = encodeURIComponent(address);
        
        // Try to open in default map app (Apple Maps on iOS, Google Maps on Android)
        const mapUrl = Platform.OS === 'ios' 
            ? `maps:0,0?q=${encodedAddress}`
            : `geo:0,0?q=${encodedAddress}`;
        
        Linking.openURL(mapUrl).catch(() => {
            // Fallback to Google Maps in browser if native map app fails
            const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
            Linking.openURL(googleMapsUrl).catch(() => {
                Alert.alert('Error', 'Unable to open map application');
            });
        });
    };


    const handleFinalizeActivity = async (selectedPinnedActivity) => {
        Alert.alert(
            'Finalize Activity',
            `Set "${selectedPinnedActivity.title}" as the final choice for this activity?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Finalize', onPress: async () => {
                    try {
                        // Mark the activity as finalized with selected pinned activity
                        await safeAuthApiCall(`${API_URL}/activities/${id}`, user.token, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                finalized: true,
                                voting: false,
                                selected_pinned_activity_id: selectedPinnedActivity.id
                            }),
                        });

                        Alert.alert('Success!', `"${selectedPinnedActivity.title}" has been set as the final choice for this activity.`);
                        setRefreshTrigger(f => !f);
                    } catch (error) {
                        logger.error('Error finalizing activity:', error);
                        Alert.alert('Error', 'Failed to finalize activity. Please try again.');
                    }
                }}
            ]
        );
    };

    const handleCompleteActivity = async () => {
        const currentFavorites = getFavoritedRecommendationsFromCurrent();
        const favoritesCount = currentFavorites.length;
        
        const message = favoritesCount > 0 
            ? `You have ${favoritesCount} favorite${favoritesCount !== 1 ? 's' : ''} selected. Complete this activity?`
            : 'Complete this activity without selecting any favorites?';
        
        Alert.alert(
            'Complete Activity',
            message,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Complete', onPress: async () => {
                    try {
                        // Favorites are already saved individually when clicked
                        // Just mark the activity as completed
                        await safeAuthApiCall(`${API_URL}/activities/${id}`, user.token, {
                            method: 'PATCH',
                            body: JSON.stringify({
                                completed: true,
                                voting: false
                            }),
                        });

                        // Update local user state
                        if (user && setUser) {
                            setUser(prevUser => ({
                                ...prevUser,
                                activities: prevUser.activities.map(act =>
                                    act.id === id
                                        ? { ...act, completed: true, voting: false }
                                        : act
                                )
                            }));
                        }

                        const successMessage = favoritesCount > 0
                            ? `Activity completed with ${favoritesCount} favorite${favoritesCount !== 1 ? 's' : ''}!`
                            : 'Activity completed successfully!';

                        // Show success message and navigate on dismiss
                        logger.debug('✅ Activity completed successfully, showing alert');
                        Alert.alert('Success!', successMessage, [
                            {
                                text: 'OK',
                                onPress: () => {
                                    logger.debug('🔙 Navigating back after completion');
                                    setRefreshTrigger(f => !f);
                                    setTimeout(() => {
                                        navigation.goBack();
                                    }, 100);
                                }
                            }
                        ]);
                    } catch (error) {
                        logger.error('Favorites save error:', {
                            details: error,
                            message: error.message,
                            stack: error.stack
                        });
                        Alert.alert('Error', 'Failed to complete activity. Please try again.');
                    }
                }}
            ]
        );
    };


    // COMPLETED PHASE - Activity is done - don't show any recommendations interface
    if (completed) {
        return null;
    }

    // DRAFT PHASE - Activity created but not started - don't show recommendations interface
    if (!active) {
        return null;
    }

    // ACTIVE BUT NOT COLLECTING - Waiting to start preference collection - don't show recommendations interface
    if (active && !collecting && !voting && !finalized) {
        return null;
    }

    // COLLECTING PHASE
    if (collecting) {
        return (
            <>
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* User Action Section */}
                    {user && !currentUserResponse ? (
                        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
                            <LinearGradient
                                colors={['#cc31e8', '#667eea', '#cc31e8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.collectingCardGradientBorder}
                            >
                                <View style={styles.collectingCardInner}>
                                    {/* Section Header */}
                                    <View style={styles.collectingSectionHeader}>
                                        <View style={styles.collectingIconWrapper}>
                                            <Icons.MessageCircle color="#9333ea" size={20} />
                                        </View>
                                        <Text style={styles.collectingSectionTitle}>Share Your Preferences</Text>
                                    </View>

                                    {/* Two Options */}
                                    <View style={styles.optionsContainer}>
                                        {/* Option 1: Use Profile - Active by default if user has preferences */}
                                        <View
                                            style={[
                                                styles.optionCard,
                                                !userHasProfilePreferences(user, activityType) && styles.optionCardDisabled,
                                                userHasProfilePreferences(user, activityType) && styles.optionCardActive
                                            ]}
                                        >
                                            <View style={[
                                                styles.optionIconContainer,
                                                userHasProfilePreferences(user, activityType) && styles.optionIconActive
                                            ]}>
                                                <Icon
                                                    name="user"
                                                    size={18}
                                                    color={userHasProfilePreferences(user, activityType) ? "#ffffff" : "#6b7280"}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.optionTitle,
                                                !userHasProfilePreferences(user, activityType) && styles.optionTitleDisabled
                                            ]}>
                                                Use My Profile
                                            </Text>
                                            {userHasProfilePreferences(user, activityType) && (
                                                <View style={styles.activeIndicatorCompact}>
                                                    <Icon name="check-circle" size={16} color="#10b981" />
                                                </View>
                                            )}
                                        </View>

                                        {/* Option 2: Custom Preferences */}
                                        <TouchableOpacity
                                            style={styles.optionCard}
                                            onPress={handleStartChat}
                                            activeOpacity={0.7}
                                        >
                                            <View style={styles.optionIconContainer}>
                                                <Icon name="edit-3" size={18} color="#8b5cf6" />
                                            </View>
                                            <Text style={styles.optionTitle}>Custom Preferences</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    ) : user && currentUserResponse ? (
                        <View style={{ marginHorizontal: 16, marginTop: 16, marginBottom: 12 }}>
                            <LinearGradient
                                colors={['#cc31e8', '#667eea', '#cc31e8']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.collectingCardGradientBorder}
                            >
                                <View style={styles.collectingCardInner}>
                                    {/* Section Header */}
                                    <View style={styles.collectingSectionHeader}>
                                        <View style={styles.collectingIconWrapper}>
                                            <Icons.CheckCircle color="#10b981" size={20} />
                                        </View>
                                        <Text style={styles.collectingSectionTitle}>Your Preferences</Text>
                                    </View>

                                    {/* Two Options - Show which one is active */}
                                    <View style={styles.optionsContainer}>
                                        {/* Option 1: Use Profile - Show if NO custom response */}
                                        <View
                                            style={[
                                                styles.optionCard,
                                                !currentUserResponse.notes && userHasProfilePreferences(user, activityType) && styles.optionCardActive
                                            ]}
                                        >
                                            <View style={[
                                                styles.optionIconContainer,
                                                !currentUserResponse.notes && userHasProfilePreferences(user, activityType) && styles.optionIconActive
                                            ]}>
                                                <Icon
                                                    name="user"
                                                    size={18}
                                                    color={!currentUserResponse.notes && userHasProfilePreferences(user, activityType) ? "#ffffff" : "#6b7280"}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.optionTitle,
                                                (currentUserResponse.notes || !userHasProfilePreferences(user, activityType)) && styles.optionTitleDisabled
                                            ]}>
                                                Use My Profile
                                            </Text>
                                            {!currentUserResponse.notes && userHasProfilePreferences(user, activityType) && (
                                                <View style={styles.activeIndicatorCompact}>
                                                    <Icon name="check-circle" size={16} color="#10b981" />
                                                </View>
                                            )}
                                        </View>

                                        {/* Option 2: Custom Preferences - Show if custom response exists */}
                                        <TouchableOpacity
                                            style={[
                                                styles.optionCard,
                                                currentUserResponse.notes && styles.optionCardActive
                                            ]}
                                            onPress={handleStartChat}
                                            activeOpacity={0.7}
                                        >
                                            <View style={[
                                                styles.optionIconContainer,
                                                currentUserResponse.notes && styles.optionIconActive
                                            ]}>
                                                <Icon
                                                    name="edit-3"
                                                    size={18}
                                                    color={currentUserResponse.notes ? "#ffffff" : "#6b7280"}
                                                />
                                            </View>
                                            <Text style={[
                                                styles.optionTitle,
                                                !currentUserResponse.notes && styles.optionTitleDisabled
                                            ]}>
                                                Custom Preferences
                                            </Text>
                                            {currentUserResponse.notes && (
                                                <View style={styles.activeIndicatorCompact}>
                                                    <Icon name="check-circle" size={16} color="#10b981" />
                                                </View>
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    ) : null}

                    <AvailabilityDisplay responses={responses} activity={activity} />

                    {/* Generate Recommendations Button */}
                    {isOwner && (
                        <View style={{ marginHorizontal: 16, marginTop: 8, marginBottom: 20 }}>
                            <TouchableOpacity
                                onPress={() => totalWithInput > 0 && setShowGenerateModal(true)}
                                activeOpacity={0.85}
                                disabled={totalWithInput === 0}
                            >
                                {/* Gradient Border */}
                                <LinearGradient
                                    colors={totalWithInput === 0 ? ['#4b5563', '#374151'] : ['#cc31e8', '#667eea', '#cc31e8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.generateButtonGradientBorder}
                                >
                                    <View style={styles.generateButtonInner}>
                                        <View style={styles.generateButtonContent}>
                                            {/* Icon with glow */}
                                            <View style={styles.generateButtonIconContainer}>
                                                <View style={styles.generateIconGlow} />
                                                <Icons.Zap color="#ffffff" size={28} />
                                            </View>

                                            {/* Text */}
                                            <View style={styles.generateTextContainer}>
                                                <Text style={styles.generateButtonText}>
                                                    Generate Recommendations
                                                </Text>
                                                {(() => {
                                                    // Check if any participant is missing both response and profile preferences
                                                    const participantsWithoutPreferences = (activity?.activity_participants || []).filter(ap => {
                                                        if (!ap.confirmed) return false; // Skip unconfirmed invites

                                                        // Check if they have a response
                                                        const hasResponse = responses.some(r => r.user_id === ap.apId);
                                                        if (hasResponse) return false;

                                                        // Check if they have profile preferences
                                                        const participant = activity.participants?.find(p => p.id === ap.apId);
                                                        if (userHasProfilePreferences(participant, activityType)) return false;

                                                        return true; // Missing both
                                                    });

                                                    if (totalWithInput === 0) {
                                                        return (
                                                            <Text style={styles.generateButtonSubtext}>
                                                                Invite your friends and gather their preferences to get your group's recommendations ✨
                                                            </Text>
                                                        );
                                                    } else if (participantsWithoutPreferences.length > 0) {
                                                        return (
                                                            <Text style={styles.generateButtonSubtext}>
                                                                ⚠️ {participantsWithoutPreferences.length} participant{participantsWithoutPreferences.length === 1 ? '' : 's'} missing preferences
                                                            </Text>
                                                        );
                                                    }
                                                    return null; // No subtitle when ready
                                                })()}
                                            </View>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Generate Recommendations Modal */}
                    <Modal
                        visible={showGenerateModal}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowGenerateModal(false)}
                    >
                        <SafeAreaView style={modalStyles.modalOverlay}>
                            <Animated.View 
                                style={[
                                    modalStyles.modalContainer,
                                    {
                                        transform: [
                                            {
                                                scale: showGenerateModal ? 1 : 0.95
                                            }
                                        ],
                                        opacity: showGenerateModal ? 1 : 0
                                    }
                                ]}
                            >
                                {/* Gradient Background */}
                                <LinearGradient
                                    colors={modalColors.headerGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={modalStyles.modalGradientBackground}
                                />
                                
                                {/* Content Container */}
                                <View style={modalStyles.modalContentWrapper}>
                                    {/* Close Button */}
                                    <TouchableOpacity
                                        style={modalStyles.modernCloseBtn}
                                        onPress={() => setShowGenerateModal(false)}
                                    >
                                        <View style={modalStyles.closeBtnCircle}>
                                            <Icons.X size={18} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {/* Voxxy Logo */}
                                    <Animated.View 
                                        style={[
                                            styles.logoWrapper,
                                            {
                                                transform: [
                                                    {
                                                        rotate: pulseValue.interpolate({
                                                            inputRange: [1, 1.2],
                                                            outputRange: ['0deg', '5deg']
                                                        })
                                                    }
                                                ]
                                            }
                                        ]}
                                    >
                                        <View style={styles.logoCircle}>
                                            <Image
                                                source={require('../assets/voxxy-triangle.png')}
                                                style={styles.logoImage}
                                                resizeMode="contain"
                                            />
                                        </View>
                                    </Animated.View>
                                    
                                    {/* Text Content */}
                                    <View style={modalStyles.modalContent}>
                                        <Text style={modalStyles.modernTitle}>Ready for recommendations?</Text>
                                        <Text style={modalStyles.modernDescription}>
                                            We'll use everyone's input to find the perfect spots
                                        </Text>
                                        
                                        {/* Progress Section */}
                                        <View style={modalStyles.modernProgressSection}>
                                            <View style={modalStyles.progressHeader}>
                                                <View style={modalStyles.usersIconWrapper}>
                                                    <Icons.Users size={18} color="#A855F7" />
                                                </View>
                                                <Text style={modalStyles.progressLabel}>Participation</Text>
                                            </View>
                                            
                                            <View style={modalStyles.modernProgressBarBg}>
                                                <LinearGradient
                                                    colors={['#A855F7', '#7C3AED']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[styles.modernProgressFill, { width: `${responseRate}%` }]}
                                                />
                                            </View>
                                            
                                            <View style={styles.progressInfo}>
                                                <Text style={styles.progressText}>
                                                    {totalWithInput} of {totalParticipants} members ready
                                                </Text>
                                                <View style={styles.percentageBadge}>
                                                    <Text style={styles.percentageText}>{Math.round(responseRate)}%</Text>
                                                </View>
                                            </View>

                                            {/* Member Status Overview */}
                                            <View style={{ marginTop: 12, gap: 6 }}>
                                                {allMembers.map((m, i) => {
                                                    const hasResp = responses.some(r => r.user_id === m.id);
                                                    const fullUser = m.id === user?.id ? user : m.user;
                                                    const hasPref = userHasProfilePreferences(fullUser, activityType);
                                                    const hasInput = hasResp || hasPref;

                                                    return (
                                                        <View key={i} style={{
                                                            flexDirection: 'row',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            paddingHorizontal: 12,
                                                            paddingVertical: 8,
                                                            backgroundColor: hasInput ? 'rgba(139, 92, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                                            borderRadius: 8,
                                                            borderWidth: 1,
                                                            borderColor: hasInput ? 'rgba(139, 92, 246, 0.3)' : 'rgba(255, 255, 255, 0.1)'
                                                        }}>
                                                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                                                                <Icon
                                                                    name={hasInput ? "check-circle" : "circle"}
                                                                    size={16}
                                                                    color={hasInput ? "#8b5cf6" : "rgba(255,255,255,0.3)"}
                                                                />
                                                                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '500' }}>
                                                                    {fullUser?.name}
                                                                </Text>
                                                            </View>
                                                            <View style={{ flexDirection: 'row', gap: 4 }}>
                                                                {hasResp && (
                                                                    <View style={{
                                                                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                                                        paddingHorizontal: 6,
                                                                        paddingVertical: 2,
                                                                        borderRadius: 4
                                                                    }}>
                                                                        <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '600' }}>Response</Text>
                                                                    </View>
                                                                )}
                                                                {hasPref && (
                                                                    <View style={{
                                                                        backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                                                        paddingHorizontal: 6,
                                                                        paddingVertical: 2,
                                                                        borderRadius: 4
                                                                    }}>
                                                                        <Text style={{ color: '#8b5cf6', fontSize: 10, fontWeight: '600' }}>Profile</Text>
                                                                    </View>
                                                                )}
                                                                {!hasInput && (
                                                                    <View style={{
                                                                        backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                                                        paddingHorizontal: 6,
                                                                        paddingVertical: 2,
                                                                        borderRadius: 4
                                                                    }}>
                                                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600' }}>Pending</Text>
                                                                    </View>
                                                                )}
                                                            </View>
                                                        </View>
                                                    );
                                                })}
                                            </View>
                                        </View>
                                        
                                        {/* Warning Section */}
                                        {responseRate < 50 && (
                                            <View style={styles.modernWarning}>
                                                <View style={styles.warningIconCircle}>
                                                    <Icon name="alert-triangle" size={16} color="#FBBF24" />
                                                </View>
                                                <Text style={styles.modernWarningText}>
                                                    More input = better results
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {/* Action Buttons */}
                                        <View style={modalStyles.buttonContainer}>
                                            <TouchableOpacity 
                                                style={modalStyles.secondaryButton}
                                                onPress={() => setShowGenerateModal(false)}
                                            >
                                                <Text style={modalStyles.secondaryButtonText}>Wait for More</Text>
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={modalStyles.primaryButton}
                                                onPress={generateRecommendations}
                                            >
                                                <LinearGradient
                                                    colors={modalColors.buttonGradient}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={modalStyles.primaryButtonGradient}
                                                >
                                                    <Icons.Zap size={20} color="#fff" />
                                                    <Text style={modalStyles.primaryButtonText}>Generate Now</Text>
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </View>
                            </Animated.View>
                        </SafeAreaView>
                    </Modal>

                    {/* AI Generation Loading Modal */}
                    <AIGenerationLoader visible={loading} isSolo={false} />
                </ScrollView>

                {/* Render Chat Component Conditionally */}
                {renderChatComponent()}
            </>
        );
    }

    // VOTING PHASE - No recommendations case
    if (!collecting && !finalized && voting && pinnedActivities.length === 0) {
        return (
            <View style={styles.container}>
                <View style={styles.noRecommendationsContainer}>
                    <Icons.HelpCircle color="#ccc" size={48} />
                    <Text style={styles.noRecommendationsTitle}>No Recommendations</Text>
                    <Text style={styles.noRecommendationsText}>
                        There are no recommendations to review. This might be a technical issue.
                    </Text>
                    {isOwner && (
                        <TouchableOpacity
                            style={[styles.generateButton, totalWithInput === 0 && styles.generateButtonDisabled]}
                            onPress={() => totalWithInput > 0 && setShowGenerateModal(true)}
                            disabled={totalWithInput === 0}
                        >
                            <Icons.Zap />
                            <Text style={styles.generateButtonText}>Generate New Recommendations</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    }

    // VOTING PHASE (Swipeable Cards) - OWNER ONLY
    if (!collecting && !finalized && voting && pinnedActivities.length > 0) {
        // Check if user is the owner of the activity
        
        // If not the owner, show recommendations in read-only mode with map/cards toggle
        if (!isOwner) {
            return (
                <View style={styles.container}>
                    {/* Map or Cards View */}
                    {viewMode === 'map' && !isGameNightActivity ? (
                        /* Map View - takes up most of screen */
                        <MapViewContainer
                            recommendations={mapRecommendations}
                            activityType={activity?.activity_type || 'Restaurant'}
                            onMarkerPress={(marker) => {
                                setSelectedMapMarker(marker);
                                setShowMapBottomSheet(true);
                            }}
                        />
                    ) : (
                        /* Card View with FlatList */
                        <FlatList
                            data={pinnedActivities}
                            renderItem={({ item }) => {
                                const isFavorited = isRecommendationFavorited(item);
                                return (
                                    <RecommendationCard
                                        recommendation={item}
                                        onPress={openDetail}
                                        isFavorited={isFavorited}
                                        isGameNightActivity={isGameNightActivity}
                                    />
                                );
                            }}
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.cardsContainer}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                            initialNumToRender={10}
                            maxToRenderPerBatch={5}
                            windowSize={10}
                            onScroll={onScroll}
                            scrollEventThrottle={16}
                            onContentSizeChange={onContentSizeChange}
                            onLayout={onLayout}
                            ListHeaderComponent={
                                <>
                                    {/* Finalize/Complete Section - Only show for Owner */}
                                    {isOwner && (
                                        activity.is_solo ? (
                                            /* Solo Activity - Complete Button */
                                            onSoloComplete && (
                                                <View style={styles.finalizeContainer}>
                                                    <TouchableOpacity
                                                        style={styles.finalizeButtonTop}
                                                        onPress={onSoloComplete}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Icons.CheckCircle color="#10b981" size={18} />
                                                        <View style={styles.finalizeTextContainer}>
                                                            <Text style={[styles.finalizeButtonTopText, styles.completeButtonText]}>
                                                                All done here?
                                                            </Text>
                                                            <Text style={[styles.finalizeButtonSubtitle, styles.completeButtonSubtitle]}>
                                                                Mark this activity as completed
                                                            </Text>
                                                        </View>
                                                        <Icons.ChevronRight color="rgba(16, 185, 129, 0.5)" size={18} />
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        ) : (
                                            /* Group Activity - Finalize Button */
                                            onFinalize && (
                                                <View style={styles.finalizeContainer}>
                                                    <TouchableOpacity
                                                        style={styles.finalizeButtonTop}
                                                        onPress={onFinalize}
                                                        activeOpacity={0.7}
                                                    >
                                                        <Icons.CheckCircle color="#cc31e8" size={18} />
                                                        <View style={styles.finalizeTextContainer}>
                                                            <Text style={styles.finalizeButtonTopText}>
                                                                Finalize & Share with Group
                                                            </Text>
                                                            <Text style={styles.finalizeButtonSubtitle}>
                                                                Already made a reservation? Add your details here and we'll notify the group!
                                                            </Text>
                                                        </View>
                                                        <Icons.ChevronRight color="rgba(204, 49, 232, 0.5)" size={18} />
                                                    </TouchableOpacity>
                                                </View>
                                            )
                                        )
                                    )}

                                    {/* Note for participants - Only show for non-owners */}
                                    {!isOwner && (
                                        <View style={styles.participantNoteTop}>
                                            <Icons.HelpCircle color="#B8A5C4" size={16} />
                                            <Text style={styles.participantNoteText}>
                                                Only the host can finalize the venue selection
                                            </Text>
                                        </View>
                                    )}
                                </>
                            }
                            ListFooterComponent={
                                <>
                                    {/* Comments Section - Hide for solo activities */}
                                    {!activity.is_solo && <CommentsSection activity={activity} />}

                                    {/* Delete/Report/Leave Activity Button Section */}
                                    <View style={styles.deleteActivitySection}>
                                        {/* Report Activity Button - Always visible */}
                                        <TouchableOpacity
                                            style={styles.reportActivityButton}
                                            onPress={onReport}
                                        >
                                            <Text style={styles.reportActivityButtonText}>
                                                Report
                                            </Text>
                                        </TouchableOpacity>

                                        {/* Delete button - Only for host/owner */}
                                        {isOwner && (
                                            <TouchableOpacity
                                                style={styles.deleteActivityButton}
                                                onPress={onDelete}
                                            >
                                                <Text style={styles.deleteActivityButtonText}>Delete</Text>
                                            </TouchableOpacity>
                                        )}

                                        {/* Leave button - Only for participants */}
                                        {!isOwner && onLeave && (
                                            <TouchableOpacity
                                                style={styles.leaveActivityButton}
                                                onPress={onLeave}
                                            >
                                                <Text style={styles.leaveActivityButtonText}>Leave</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            }
                        />
                    )}

                    {/* Detail Modal - Extracted Component */}
                    <RecommendationDetailModal
                        visible={showDetailModal}
                        recommendation={selectedRec}
                        onClose={closeDetail}
                        isGameNightActivity={isGameNightActivity}
                        activityText={activityText}
                        isFlagged={flaggedRecommendations.some(r => r.id === selectedRec?.id)}
                        onFlagToggle={() => {
                            const isFlagged = flaggedRecommendations.some(r => r.id === selectedRec?.id);
                            if (isFlagged) {
                                setFlaggedRecommendations(prev =>
                                    prev.filter(item => item.id !== selectedRec?.id)
                                );
                            } else {
                                setFlaggedRecommendations(prev => [...prev, selectedRec]);
                                Alert.alert('Flagged', 'This recommendation has been flagged.');
                            }
                        }}
                        isFavorited={isRecommendationFavorited(selectedRec)}
                        favoriteLoading={favoriteLoading[selectedRec?.id]}
                        onFavorite={async () => {
                            await handleFavorite(selectedRec);
                            closeDetail();
                        }}
                    />

                    {/* Map Marker Bottom Sheet - rendered at component level to avoid clipping */}
                    <DraggableBottomSheet
                        visible={showMapBottomSheet}
                        onClose={() => setShowMapBottomSheet(false)}
                        title={selectedMapMarker?.title || selectedMapMarker?.name || "Details"}
                    >
                        <RecommendationDetails
                            recommendation={selectedMapMarker}
                            onClose={() => setShowMapBottomSheet(false)}
                            onFavorite={handleFavorite}
                            isFavorited={isRecommendationFavorited(selectedMapMarker)}
                            favoriteLoading={favoriteLoading[selectedMapMarker?.id]}
                            onFlag={(rec) => {
                                const isFlagged = flaggedRecommendations.some(r => r.id === rec?.id);
                                if (isFlagged) {
                                    setFlaggedRecommendations(prev =>
                                        prev.filter(item => item.id !== rec?.id)
                                    );
                                } else {
                                    setFlaggedRecommendations(prev => [...prev, rec]);
                                    Alert.alert('Flagged', 'This recommendation has been flagged.');
                                }
                            }}
                            isFlagged={flaggedRecommendations.some(r => r.id === selectedMapMarker?.id)}
                        />
                    </DraggableBottomSheet>
                </View>
            );
        }
        // Removed swipe results view - we're not using swipe functionality
        if (false) { // Keep for reference but never execute
            return (
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                    {getFavoritedRecommendationsFromCurrent().length > 0 ? (
                        <>
                            {/* Combined results and actions card */}
                            <View style={styles.combinedResultsCard}>
                                <View style={styles.resultsHeader}>
                                    <Icons.Star color="#D4AF37" size={24} />
                                    <Text style={styles.resultsTitle}>Great choices!</Text>
                                </View>
                                <Text style={styles.resultsSubtitle}>
                                    You've selected {getFavoritedRecommendationsFromCurrent().length} recommendation{getFavoritedRecommendationsFromCurrent().length > 1 ? 's' : ''}.
                                </Text>

                            </View>

                            {/* Stats card - moved below great choices */}
                            <View style={styles.statsCard}>
                                <View style={styles.resultsStats}>
                                    <View style={styles.statItem}>
                                        <Icons.Star color="#D4AF37" size={18} />
                                        <Text style={styles.statNumber}>{getFavoritedRecommendationsFromCurrent().length}</Text>
                                        <Text style={styles.statLabel}>Favorited</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Icons.Flag color="#ffc107" size={18} />
                                        <Text style={styles.statNumber}>{flaggedRecommendations.length}</Text>
                                        <Text style={styles.statLabel}>Flagged</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.recommendationsList}>
                                {getFavoritedRecommendationsFromCurrent().map((p) => (
                                    <View key={p.id} style={[styles.listItem, p.isFavorite && styles.favoriteListItem]}>
                                        {p.isFavorite && (
                                            <View style={styles.favoriteIndicator}>
                                                <Icons.Star color="#D4AF37" size={16} />
                                                <Text style={styles.favoriteIndicatorText}>FAVORITE</Text>
                                            </View>
                                        )}
                                        <TouchableOpacity style={styles.listContent} onPress={() => openDetail(p)}>
                                            <View style={styles.listTop}>
                                                <Text style={styles.listName}>{p.title}</Text>
                                                <Text style={styles.listMeta}>{p.price_range || 'N/A'}</Text>
                                            </View>
                                            <View style={styles.listBottom}>
                                                <View>
                                                    {isGameNightActivity ? (
                                                        <>
                                                            <HoursDisplay hours={p.hours} style={styles.listDetail} compact={true} />
                                                            <Text style={styles.listDetail}>{p.address || 'N/A'}</Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <HoursDisplay hours={p.hours} style={styles.listDetail} compact={true} />
                                                            <Text style={styles.listDetail}>{p.address || 'N/A'}</Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        </>
                    ) : (
                        <View style={styles.noLikesContainer}>
                            <Icons.HelpCircle color="#ccc" size={48} />
                            <Text style={styles.noLikesTitle}>No matches found</Text>
                            <Text style={styles.noLikesText}>
                                You didn't like any of the recommendations. Try generating new ones.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            );
        }

        // Show all recommendations as cards or map
        return (
            <View style={styles.container}>
                {/* Map or Cards View - force cards for Game Night */}
                {viewMode === 'map' && !isGameNightActivity ? (
                    /* Map View - takes up most of screen */
                    <MapViewContainer
                        recommendations={mapRecommendations}
                        activityType={activity?.activity_type || 'Restaurant'}
                        onMarkerPress={(marker) => {
                            setSelectedMapMarker(marker);
                            setShowMapBottomSheet(true);
                        }}
                    />
                ) : (
                    /* Card View with FlatList */
                    <FlatList
                        data={pinnedActivities}
                        renderItem={({ item }) => {
                            const isFavorited = isRecommendationFavorited(item);
                            return (
                                <RecommendationCard
                                    recommendation={item}
                                    onPress={openDetail}
                                    isFavorited={isFavorited}
                                    isGameNightActivity={isGameNightActivity}
                                />
                            );
                        }}
                        keyExtractor={(item) => item.id.toString()}
                        style={styles.cardsContainer}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                        initialNumToRender={10}
                        maxToRenderPerBatch={5}
                        windowSize={10}
                        onScroll={onScroll}
                        scrollEventThrottle={16}
                        onContentSizeChange={onContentSizeChange}
                        onLayout={onLayout}
                        ListHeaderComponent={
                            <>
                                {/* Finalize/Complete Section - Only show for Owner */}
                                {isOwner && (
                                    activity.is_solo ? (
                                        /* Solo Activity - Complete Button */
                                        onSoloComplete && (
                                            <View style={styles.finalizeContainer}>
                                                <TouchableOpacity
                                                    style={styles.finalizeButtonTop}
                                                    onPress={onSoloComplete}
                                                    activeOpacity={0.7}
                                                >
                                                    <Icons.CheckCircle color="#10b981" size={18} />
                                                    <View style={styles.finalizeTextContainer}>
                                                        <Text style={[styles.finalizeButtonTopText, styles.completeButtonText]}>
                                                            All done here?
                                                        </Text>
                                                        <Text style={[styles.finalizeButtonSubtitle, styles.completeButtonSubtitle]}>
                                                            Mark this activity as completed
                                                        </Text>
                                                    </View>
                                                    <Icons.ChevronRight color="rgba(16, 185, 129, 0.5)" size={18} />
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    ) : (
                                        /* Group Activity - Finalize Button */
                                        onFinalize && (
                                            <View style={styles.finalizeContainer}>
                                                <TouchableOpacity
                                                    style={styles.finalizeButtonTop}
                                                    onPress={onFinalize}
                                                    activeOpacity={0.7}
                                                >
                                                    <Icons.CheckCircle color="#cc31e8" size={18} />
                                                    <View style={styles.finalizeTextContainer}>
                                                        <Text style={styles.finalizeButtonTopText}>
                                                            Finalize & Share with Group
                                                        </Text>
                                                        <Text style={styles.finalizeButtonSubtitle}>
                                                            Already made a reservation? Add your details here and we'll notify the group!
                                                        </Text>
                                                    </View>
                                                    <Icons.ChevronRight color="rgba(204, 49, 232, 0.5)" size={18} />
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    )
                                )}
                            </>
                        }
                        ListFooterComponent={
                            <>
                                {/* Comments Section - Hide for solo activities */}
                                {!activity.is_solo && <CommentsSection activity={activity} />}

                                {/* Delete/Report/Leave Activity Button Section */}
                                <View style={styles.deleteActivitySection}>
                                    {/* Report Activity Button - Always visible */}
                                    <TouchableOpacity
                                        style={styles.reportActivityButton}
                                        onPress={onReport}
                                    >
                                        <Text style={styles.reportActivityButtonText}>
                                            Report
                                        </Text>
                                    </TouchableOpacity>

                                    {/* Delete button - Only for host/owner */}
                                    {isOwner && (
                                        <TouchableOpacity
                                            style={styles.deleteActivityButton}
                                            onPress={onDelete}
                                        >
                                            <Text style={styles.deleteActivityButtonText}>Delete</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Leave button - Only for participants */}
                                    {!isOwner && onLeave && (
                                        <TouchableOpacity
                                            style={styles.leaveActivityButton}
                                            onPress={onLeave}
                                        >
                                            <Text style={styles.leaveActivityButtonText}>Leave</Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        }
                    />
                )}

                {/* Detail Modal - Extracted Component */}
                    <RecommendationDetailModal
                        visible={showDetailModal}
                        recommendation={selectedRec}
                        onClose={closeDetail}
                        isGameNightActivity={isGameNightActivity}
                        activityText={activityText}
                        isFlagged={flaggedRecommendations.some(r => r.id === selectedRec?.id)}
                        onFlagToggle={() => {
                            const isFlagged = flaggedRecommendations.some(r => r.id === selectedRec?.id);
                            if (isFlagged) {
                                setFlaggedRecommendations(prev =>
                                    prev.filter(item => item.id !== selectedRec?.id)
                                );
                            } else {
                                setFlaggedRecommendations(prev => [...prev, selectedRec]);
                                Alert.alert('Flagged', 'This recommendation has been flagged.');
                            }
                        }}
                        isFavorited={isRecommendationFavorited(selectedRec)}
                        favoriteLoading={favoriteLoading[selectedRec?.id]}
                        onFavorite={async () => {
                            await handleFavorite(selectedRec);
                            closeDetail();
                        }}
                    />

                    {/* Map Marker Bottom Sheet - rendered at component level to avoid clipping */}
                    <DraggableBottomSheet
                        visible={showMapBottomSheet}
                        onClose={() => setShowMapBottomSheet(false)}
                        title={selectedMapMarker?.title || selectedMapMarker?.name || "Details"}
                    >
                        <RecommendationDetails
                            recommendation={selectedMapMarker}
                            onClose={() => setShowMapBottomSheet(false)}
                            onFavorite={handleFavorite}
                            isFavorited={isRecommendationFavorited(selectedMapMarker)}
                            favoriteLoading={favoriteLoading[selectedMapMarker?.id]}
                            onFlag={(rec) => {
                                const isFlagged = flaggedRecommendations.some(r => r.id === rec?.id);
                                if (isFlagged) {
                                    setFlaggedRecommendations(prev =>
                                        prev.filter(item => item.id !== rec?.id)
                                    );
                                } else {
                                    setFlaggedRecommendations(prev => [...prev, rec]);
                                    Alert.alert('Flagged', 'This recommendation has been flagged.');
                                }
                            }}
                            isFlagged={flaggedRecommendations.some(r => r.id === selectedMapMarker?.id)}
                        />
                    </DraggableBottomSheet>
            </View>
        );
    }

    // FINALIZED PHASE
    if (finalized) {
        const selectedPlace = pinnedActivities && pinnedActivities.length > 0
            ? pinnedActivities.filter(p => p.selected)[0]
            : null;

        return (
            <ScrollView
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                bounces={false}
                onScroll={onScroll}
                scrollEventThrottle={16}
                onContentSizeChange={onContentSizeChange}
                onLayout={onLayout}
            >
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Main Activity Finalized Card - Modernized */}
                <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
                <LinearGradient
                    colors={['#cc31e8', '#667eea', '#cc31e8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.finalizedPlanCardGradientBorder}
                >
                    <View style={styles.finalizedPlanCardInner}>
                        <View style={styles.finalizedIconContainer}>
                            <View style={styles.finalizedIconCircle}>
                                <Icons.CheckCircle color="#fff" size={24} />
                            </View>
                            <View style={styles.finalizedTitleContainer}>
                                <Text style={styles.finalizedActivityTitle}>
                                    {activity.activity_name}
                                </Text>
                                <Text style={styles.finalizedStatusSubtext}>Plan Finalized</Text>
                            </View>
                            {isOwner && onEdit && (
                                <TouchableOpacity
                                    style={styles.finalizedEditButton}
                                    onPress={onEdit}
                                    activeOpacity={0.7}
                                >
                                    <Icon name="edit-2" size={18} color="#9333ea" />
                                </TouchableOpacity>
                            )}
                        </View>

                        {/* Host Message */}
                        {activity.welcome_message && (
                            <View style={styles.finalizedHostMessageContainer}>
                                <Image
                                    source={getUserDisplayImage(activity.user)}
                                    style={styles.finalizedHostProfilePic}
                                />
                                <Text style={styles.finalizedHostMessage} numberOfLines={3}>
                                    {activity.welcome_message}
                                </Text>
                            </View>
                        )}

                        {/* Date and Time if available */}
                        {(activity.date_day || activity.date_time) && (
                            <View style={styles.eventDateBanner}>
                                <View style={styles.eventDateIconCircle}>
                                    <Icons.Calendar color="#9333ea" size={20} />
                                </View>
                                <View style={styles.eventDateTextContainer}>
                                    {activity.date_day && (
                                        <Text style={styles.eventDateText}>
                                            {new Date(activity.date_day).toLocaleDateString('en-US', {
                                                weekday: 'short',
                                                month: 'short',
                                                day: 'numeric',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                    )}
                                    {activity.date_time && (
                                        <Text style={styles.eventTimeText}>
                                            {new Date(activity.date_time).toLocaleTimeString('en-US', {
                                                hour: 'numeric',
                                                minute: '2-digit',
                                                hour12: true
                                            })}
                                        </Text>
                                    )}
                                </View>
                            </View>
                        )}

                        {/* Action Buttons */}
                        <View style={styles.actionButtons}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={sharePlanUrlClick}
                                activeOpacity={0.8}
                            >
                                <Icons.Share color="#fff" size={16} />
                                <Text style={styles.primaryButtonText}>Share Plan</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </LinearGradient>
                </View>

                {/* Selected Venue Card - Modernized to match the rest of the flow */}
                {selectedPlace && (
                    <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
                    <LinearGradient
                        colors={['#cc31e8', '#667eea', '#cc31e8']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.finalizedVenueCardGradientBorder}
                    >
                        <View style={styles.finalizedVenueCardInner}>
                            {/* Section Header with Icon */}
                            <View style={styles.finalizedVenueHeaderRow}>
                                <View style={styles.finalizedVenueIconWrapper}>
                                    <Icons.MapPin color="#9333ea" size={20} />
                                </View>
                                <Text style={styles.finalizedVenueSectionTitle}>Location Details</Text>
                            </View>

                            {/* Venue Header with Title */}
                            <View style={styles.finalizedVenueHeader}>
                                <Text style={styles.finalizedVenueTitle} numberOfLines={2}>
                                    {selectedPlace.title}
                                </Text>
                            </View>

                            {/* Description */}
                            {selectedPlace.description && (
                                <Text style={styles.finalizedVenueDescription} numberOfLines={3}>
                                    {selectedPlace.description}
                                </Text>
                            )}

                            {/* Venue Details Grid */}
                            <View style={styles.finalizedDetailsGrid}>
                                {/* Address */}
                                {selectedPlace.address && (
                                    <View style={styles.finalizedDetailCard}>
                                        <View style={styles.finalizedDetailIconContainer}>
                                            <Icons.MapPin color="#a855f7" size={18} />
                                        </View>
                                        <View style={styles.finalizedDetailContent}>
                                            <Text style={styles.finalizedDetailLabel}>Address</Text>
                                            <Text style={styles.finalizedDetailValue} numberOfLines={2}>
                                                {selectedPlace.address}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Phone */}
                                {selectedPlace.phone && (
                                    <View style={styles.finalizedDetailCard}>
                                        <View style={[styles.finalizedDetailIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                                            <Icons.Phone color="#10b981" size={18} />
                                        </View>
                                        <View style={styles.finalizedDetailContent}>
                                            <Text style={styles.finalizedDetailLabel}>Phone</Text>
                                            <Text style={styles.finalizedDetailValue}>{selectedPlace.phone}</Text>
                                        </View>
                                    </View>
                                )}

                                {/* Hours */}
                                {selectedPlace.hours && (
                                    <View style={styles.finalizedDetailCard}>
                                        <View style={[styles.finalizedDetailIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
                                            <Icons.Clock color="#f59e0b" size={18} />
                                        </View>
                                        <View style={styles.finalizedDetailContent}>
                                            <Text style={styles.finalizedDetailLabel}>Hours</Text>
                                            <Text style={styles.finalizedDetailValue} numberOfLines={2}>
                                                {selectedPlace.hours}
                                            </Text>
                                        </View>
                                    </View>
                                )}

                                {/* Price Range */}
                                {selectedPlace.price_range && (
                                    <View style={styles.finalizedDetailCard}>
                                        <View style={[styles.finalizedDetailIconContainer, { backgroundColor: 'rgba(234, 179, 8, 0.15)' }]}>
                                            <Icons.DollarSign color="#eab308" size={18} />
                                        </View>
                                        <View style={styles.finalizedDetailContent}>
                                            <Text style={styles.finalizedDetailLabel}>Price</Text>
                                            <Text style={styles.finalizedDetailValue}>{selectedPlace.price_range}</Text>
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Action Buttons Row - Modernized with text labels and distinct colors */}
                            <View style={styles.finalizedVenueActions}>
                                <TouchableOpacity
                                    style={[styles.finalizedActionButton, {
                                        backgroundColor: 'rgba(147, 51, 234, 0.2)',
                                        borderColor: 'rgba(147, 51, 234, 0.4)',
                                    }]}
                                    onPress={() => {
                                        if (selectedPlace.latitude && selectedPlace.longitude) {
                                            const url = `https://maps.apple.com/?daddr=${selectedPlace.latitude},${selectedPlace.longitude}`;
                                            Linking.openURL(url);
                                        } else if (selectedPlace.address) {
                                            const encodedAddress = encodeURIComponent(selectedPlace.address);
                                            Linking.openURL(`https://maps.apple.com/?address=${encodedAddress}`);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icons.Navigation color="#a855f7" size={16} />
                                    <Text style={styles.finalizedActionButtonText}>Directions</Text>
                                </TouchableOpacity>

                                {selectedPlace.website && (
                                    <TouchableOpacity
                                        style={[styles.finalizedActionButton, {
                                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                                            borderColor: 'rgba(16, 185, 129, 0.4)',
                                        }]}
                                        onPress={() => {
                                            let url = selectedPlace.website;
                                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                                url = 'https://' + url;
                                            }
                                            Linking.openURL(url).catch(() => {
                                                Alert.alert('Error', 'Could not open website');
                                            });
                                        }}
                                        activeOpacity={0.7}
                                    >
                                        <Icons.Globe color="#10b981" size={16} />
                                        <Text style={styles.finalizedActionButtonText}>Website</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[styles.finalizedActionButton, {
                                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                                        borderColor: 'rgba(59, 130, 246, 0.4)',
                                    }]}
                                    onPress={async () => {
                                        try {
                                            const message = selectedPlace.address
                                                ? `Check out ${selectedPlace.title}!\n\n${selectedPlace.address}`
                                                : `Check out ${selectedPlace.title}!`;

                                            await Share.share({
                                                message: message,
                                                title: selectedPlace.title,
                                            });
                                        } catch (error) {
                                            logger.error('Error sharing venue:', error);
                                        }
                                    }}
                                    activeOpacity={0.7}
                                >
                                    <Icons.Share color="#3b82f6" size={16} />
                                    <Text style={styles.finalizedActionButtonText}>Share</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </LinearGradient>
                    </View>
                )}

                {/* Attendees Card - Modernized */}
                <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
                <LinearGradient
                    colors={['#cc31e8', '#667eea', '#cc31e8']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.finalizedPlanCardGradientBorder}
                >
                    <View style={styles.finalizedPlanCardInner}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.finalizedVenueIconWrapper}>
                                <Icons.Users color="#9333ea" size={20} />
                            </View>
                            <Text style={styles.sectionTitle}>Who's Coming</Text>
                        </View>
                        <View style={styles.attendeePills}>
                            <View style={[styles.attendeePill, styles.hostPill]}>
                                <Image
                                    source={getUserDisplayImage(activity.user)}
                                    style={styles.hostProfilePic}
                                />
                                <Text style={styles.attendeePillText}>{activity.user?.name || 'Host'}</Text>
                            </View>
                            {activity.participants?.map((participant, index) => (
                                <View key={index} style={styles.attendeePill}>
                                    <Image
                                        source={getUserDisplayImage(participant)}
                                        style={styles.attendeeProfilePic}
                                    />
                                    <Text style={styles.attendeePillText}>
                                        {participant.name?.split(' ')[0] || participant.name}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                </LinearGradient>
                </View>

                {/* Comments Section - Hide for solo activities */}
                {!activity.is_solo && <CommentsSection activity={activity} />}

                {/* Delete/Report/Leave Activity Button Section */}
                <View style={styles.deleteActivitySection}>
                    {/* Report Activity Button - Always visible */}
                    <TouchableOpacity
                        style={styles.reportActivityButton}
                        onPress={onReport}
                    >
                        <Text style={styles.reportActivityButtonText}>
                            Report
                        </Text>
                    </TouchableOpacity>

                    {/* Delete button - Only for host/owner */}
                    {isOwner && (
                        <TouchableOpacity
                            style={styles.deleteActivityButton}
                            onPress={onDelete}
                        >
                            <Text style={styles.deleteActivityButtonText}>Delete</Text>
                        </TouchableOpacity>
                    )}

                    {/* Leave button - Only for participants */}
                    {!isOwner && onLeave && (
                        <TouchableOpacity
                            style={styles.leaveActivityButton}
                            onPress={onLeave}
                        >
                            <Text style={styles.leaveActivityButtonText}>Leave</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Detail Modal - Extracted Component */}
                <RecommendationDetailModal
                    visible={showDetailModal}
                    recommendation={selectedRec}
                    onClose={closeDetail}
                    isGameNightActivity={isGameNightActivity}
                    activityText={activityText}
                    isFlagged={flaggedRecommendations.some(r => r.id === selectedRec?.id)}
                    onFlagToggle={() => {
                        const isFlagged = flaggedRecommendations.some(r => r.id === selectedRec?.id);
                        if (isFlagged) {
                            setFlaggedRecommendations(prev =>
                                prev.filter(item => item.id !== selectedRec?.id)
                            );
                        } else {
                            setFlaggedRecommendations(prev => [...prev, selectedRec]);
                            Alert.alert('Flagged', 'This recommendation has been flagged.');
                        }
                    }}
                    isFavorited={isRecommendationFavorited(selectedRec)}
                    favoriteLoading={favoriteLoading[selectedRec?.id]}
                    onFavorite={async () => {
                        await handleFavorite(selectedRec);
                        closeDetail();
                    }}
                />
            </ScrollView>
        );
    }

    // Default fallback - This should rarely be reached
    return (
        <View style={styles.container}>
            <View style={styles.phaseIndicator}>
                <View style={styles.phaseContent}>
                    <Icons.HelpCircle color="#ccc" />
                    <Text style={styles.phaseTitle}>Unknown Phase</Text>
                </View>
                <Text style={styles.phaseSubtitle}>
                    This activity is in an unexpected state. Please contact support if this persists.
                </Text>
                <View style={styles.debugInfo}>
                    <Text style={styles.debugText}>
                        Debug: active={String(active)}, collecting={String(collecting)}, voting={String(voting)}, finalized={String(finalized)}, completed={String(completed)}
                    </Text>
                </View>
            </View>
        </View>
    );
}
