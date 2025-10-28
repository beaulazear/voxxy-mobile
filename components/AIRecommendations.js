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
    
    // View mode toggle (map vs cards) - default to cards for Game Night
    const [viewMode, setViewMode] = useState(
        activity?.activity_type === 'Game Night' ? 'cards' : 'map'
    ); // 'map' or 'cards'

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

    // Loading animations
    const spinValue1 = React.useRef(new Animated.Value(0)).current;
    const spinValue2 = React.useRef(new Animated.Value(0)).current;
    const spinValue3 = React.useRef(new Animated.Value(0)).current;
    const bounceValue1 = React.useRef(new Animated.Value(0)).current;
    const bounceValue2 = React.useRef(new Animated.Value(0)).current;
    const bounceValue3 = React.useRef(new Animated.Value(0)).current;

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

    // Start animations when loading
    React.useEffect(() => {
        if (loading) {
            // Spinning circles
            const spinAnimation1 = Animated.loop(
                Animated.timing(spinValue1, {
                    toValue: 1,
                    duration: 2000,
                    useNativeDriver: true,
                })
            );
            const spinAnimation2 = Animated.loop(
                Animated.timing(spinValue2, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                })
            );
            const spinAnimation3 = Animated.loop(
                Animated.timing(spinValue3, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                })
            );

            // Bouncing dots
            const bounceAnimation1 = Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceValue1, {
                        toValue: -10,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue1, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            const bounceAnimation2 = Animated.loop(
                Animated.sequence([
                    Animated.delay(200),
                    Animated.timing(bounceValue2, {
                        toValue: -10,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue2, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );
            const bounceAnimation3 = Animated.loop(
                Animated.sequence([
                    Animated.delay(400),
                    Animated.timing(bounceValue3, {
                        toValue: -10,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceValue3, {
                        toValue: 0,
                        duration: 600,
                        useNativeDriver: true,
                    }),
                ])
            );

            spinAnimation1.start();
            spinAnimation2.start();
            spinAnimation3.start();
            bounceAnimation1.start();
            bounceAnimation2.start();
            bounceAnimation3.start();

            return () => {
                spinAnimation1.stop();
                spinAnimation2.stop();
                spinAnimation3.stop();
                bounceAnimation1.stop();
                bounceAnimation2.stop();
                bounceAnimation3.stop();
            };
        }
    }, [loading]);

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

        const hasPreferences = userHasProfilePreferences(fullUserObject);

        // Debug logging
        logger.debug(`👤 Member ${fullUserObject?.name || member.id}:`, {
            id: member.id,
            isHost: member.isHost,
            isCurrentUser: member.id === user?.id,
            hasResponse,
            hasPreferences,
            hasFavoriteFood: fullUserObject?.favorite_food?.length > 0,
            hasPreferencesField: fullUserObject?.preferences?.length > 0,
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
                <ScrollView style={styles.transparentContainer} contentContainerStyle={styles.contentContainer}>
                    {error ? <Text style={styles.errorText}>{error}</Text> : null}

                    {/* User Action Section */}
                    {user && !currentUserResponse ? (
                        <Animated.View
                            style={[
                                styles.actionCard,
                                {
                                    transform: [{ translateY: showGenerateModal ? 5 : 0 }]
                                }
                            ]}
                        >
                            <View style={styles.socialActionContainer}>
                                {/* Two Options */}
                                <View style={styles.optionsContainer}>
                                    {/* Option 1: Use Profile - Active by default if user has preferences */}
                                    <View
                                        style={[
                                            styles.optionCard,
                                            !userHasProfilePreferences(user) && styles.optionCardDisabled,
                                            userHasProfilePreferences(user) && styles.optionCardActive
                                        ]}
                                    >
                                        <View style={[
                                            styles.optionIconContainer,
                                            userHasProfilePreferences(user) && styles.optionIconActive
                                        ]}>
                                            <Icon
                                                name="user"
                                                size={20}
                                                color={userHasProfilePreferences(user) ? "#ffffff" : "#6b7280"}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.optionTitle,
                                            !userHasProfilePreferences(user) && styles.optionTitleDisabled
                                        ]}>
                                            Use My Profile
                                        </Text>
                                        {userHasProfilePreferences(user) && (
                                            <View style={styles.activeIndicator}>
                                                <Icon name="check" size={14} color="#8b5cf6" />
                                                <Text style={styles.activeIndicatorText}>Selected by default</Text>
                                            </View>
                                        )}
                                    </View>

                                    {/* Option 2: Custom Preferences */}
                                    <TouchableOpacity
                                        style={styles.optionCard}
                                        onPress={handleStartChat}
                                    >
                                        <View style={styles.optionIconContainer}>
                                            <Icon name="edit-3" size={20} color="#8b5cf6" />
                                        </View>
                                        <Text style={styles.optionTitle}>Submit New Preferences</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    ) : user && currentUserResponse ? (
                        <View style={styles.actionCard}>
                            <View style={styles.socialActionContainer}>
                                {/* Two Options - Show which one is active */}
                                <View style={styles.optionsContainer}>
                                    {/* Option 1: Use Profile - Show if NO custom response */}
                                    <View
                                        style={[
                                            styles.optionCard,
                                            !currentUserResponse.notes && userHasProfilePreferences(user) && styles.optionCardActive
                                        ]}
                                    >
                                        <View style={[
                                            styles.optionIconContainer,
                                            !currentUserResponse.notes && userHasProfilePreferences(user) && styles.optionIconActive
                                        ]}>
                                            <Icon
                                                name="user"
                                                size={20}
                                                color={!currentUserResponse.notes && userHasProfilePreferences(user) ? "#ffffff" : "#6b7280"}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.optionTitle,
                                            (currentUserResponse.notes || !userHasProfilePreferences(user)) && styles.optionTitleDisabled
                                        ]}>
                                            Use My Profile
                                        </Text>
                                        <Text style={[
                                            styles.optionDescription,
                                            (currentUserResponse.notes || !userHasProfilePreferences(user)) && styles.optionDescriptionDisabled
                                        ]}>
                                            Use saved preferences from your profile
                                        </Text>
                                        {!currentUserResponse.notes && userHasProfilePreferences(user) && (
                                            <View style={styles.activeIndicator}>
                                                <Icon name="check" size={14} color="#8b5cf6" />
                                                <Text style={styles.activeIndicatorText}>Currently using</Text>
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
                                                size={20}
                                                color={currentUserResponse.notes ? "#ffffff" : "#6b7280"}
                                            />
                                        </View>
                                        <Text style={[
                                            styles.optionTitle,
                                            !currentUserResponse.notes && styles.optionTitleDisabled
                                        ]}>
                                            {currentUserResponse.notes ? "Custom Preferences" : "Feeling Something Different?"}
                                        </Text>
                                        <Text style={[
                                            styles.optionDescription,
                                            !currentUserResponse.notes && styles.optionDescriptionDisabled
                                        ]}>
                                            {currentUserResponse.notes ? "Tap to resubmit preferences" : "Take a quick survey and let us know the vibe"}
                                        </Text>
                                        {currentUserResponse.notes && (
                                            <View style={styles.activeIndicator}>
                                                <Icon name="check" size={14} color="#8b5cf6" />
                                                <Text style={styles.activeIndicatorText}>Currently using</Text>
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    ) : null}

                    <AvailabilityDisplay responses={responses} activity={activity} />

                    {/* Generate Recommendations Button */}
                    {isOwner && (
                        <TouchableOpacity
                            onPress={() => responses.length > 0 && setShowGenerateModal(true)}
                            activeOpacity={0.85}
                            disabled={responses.length === 0}
                            style={styles.generateButtonContainer}
                        >
                            {/* Gradient Border */}
                            <LinearGradient
                                colors={responses.length === 0 ? ['#4b5563', '#374151'] : ['#cc31e8', '#667eea', '#cc31e8']}
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
                                                    if (userHasProfilePreferences(participant)) return false;

                                                    return true; // Missing both
                                                });

                                                if (responses.length === 0) {
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
                                                    const hasPref = userHasProfilePreferences(fullUser);
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
                                                        scale: pulseValue.interpolate({
                                                            inputRange: [0.8, 1.2],
                                                            outputRange: [0.8, 1.2]
                                                        })
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
                                    Voxxy is analyzing venues and personalizing recommendations...
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
                            style={[styles.generateButton, responses.length === 0 && styles.generateButtonDisabled]} 
                            onPress={() => responses.length > 0 && setShowGenerateModal(true)}
                            disabled={responses.length === 0}
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
        
        // If not the owner, show recommendations in read-only mode
        if (!isOwner) {
            // Show all recommendations as cards (view-only for participants)
            return (
                <>
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                    <View style={styles.participantViewHeader}>
                        <Text style={styles.participantViewTitle}>
                            The organizer is reviewing your picks ✨
                        </Text>
                    </View>
                    
                    {/* Display all recommendations */}
                    <View style={[styles.recommendationsGrid, styles.recommendationsGridNoToggle]}>
                        {pinnedActivities.map((recommendation) => {
                            return (
                                <TouchableOpacity
                                    key={recommendation.id}
                                    style={styles.recommendationCard}
                                    onPress={() => openDetail(recommendation)}
                                    activeOpacity={0.7}
                                >
                                    <LinearGradient
                                        colors={['rgba(204, 49, 232, 0.08)', 'rgba(155, 29, 189, 0.05)']}
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
                        })}
                    </View>
                    
                    {/* Note for participants */}
                    <View style={styles.participantNote}>
                        <Icons.HelpCircle color="#B8A5C4" size={16} />
                        <Text style={styles.participantNoteText}>
                            Only the host can finalize the activity selection
                        </Text>
                    </View>
                </ScrollView>

                {/* Detail Modal for list items - using same bottom sheet as map */}
                <DraggableBottomSheet
                    visible={showDetailModal}
                    onClose={closeDetail}
                    title={selectedRec?.title || selectedRec?.name || "Details"}
                >
                    <RecommendationDetails
                        recommendation={selectedRec}
                        onClose={closeDetail}
                        onFavorite={handleFavorite}
                        isFavorited={isRecommendationFavorited(selectedRec)}
                        favoriteLoading={favoriteLoading[selectedRec?.id]}
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
                        isFlagged={flaggedRecommendations.some(r => r.id === selectedRec?.id)}
                    />
                </DraggableBottomSheet>
                </>
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
                        viewMode={viewMode}
                        onViewModeChange={setViewMode}
                        isGameNightActivity={isGameNightActivity}
                    />
                ) : (
                    /* Card View */
                    <ScrollView style={styles.cardsContainer} showsVerticalScrollIndicator={false}>
                        {/* View Mode Toggle overlay - only show for non-Game Night activities */}
                        {!isGameNightActivity && (
                            <View style={styles.viewModeToggleOverlay}>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeButtonActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setViewMode('map');
                                    }}
                                >
                                    <Icons.Map color={viewMode === 'map' ? '#fff' : '#666'} size={18} />
                                    <Text style={[styles.viewModeButtonText, viewMode === 'map' && styles.viewModeButtonTextActive]}>
                                        Map
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'cards' && styles.viewModeButtonActive]}
                                    onPress={() => {
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        setViewMode('cards');
                                    }}
                                >
                                    <Icons.Grid color={viewMode === 'cards' ? '#fff' : '#666'} size={18} />
                                    <Text style={[styles.viewModeButtonText, viewMode === 'cards' && styles.viewModeButtonTextActive]}>
                                        List
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        <View style={[
                            styles.recommendationsGrid,
                            isGameNightActivity && styles.recommendationsGridNoToggle
                        ]}>
                            {pinnedActivities.map((recommendation) => {
                                const isFavorited = isRecommendationFavorited(recommendation);

                                return (
                                    <RecommendationCard
                                        key={recommendation.id}
                                        recommendation={recommendation}
                                        onPress={openDetail}
                                        isFavorited={isFavorited}
                                        isGameNightActivity={isGameNightActivity}
                                    />
                                );
                            })}
                        </View>
                        
                    </ScrollView>
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
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                {/* Main Activity Finalized Card */}
                <View style={styles.finalizedPlanCard}>
                    <View style={styles.finalizedIconContainer}>
                        <View style={styles.finalizedIconCircle}>
                            <Icons.CheckCircle color="#fff" size={32} />
                        </View>
                    </View>
                    <Text style={styles.finalizedActivityTitle}>
                        {activity.activity_name}
                    </Text>
                    <Text style={styles.finalizedStatusSubtext}>Plan Finalized</Text>

                    {/* Date and Time if available */}
                    {(activity.date_day || activity.date_time) && (
                        <View style={styles.eventDateBanner}>
                            <Icons.Calendar color="#9333ea" size={22} />
                            <View style={styles.eventDateTextContainer}>
                                {activity.date_day && (
                                    <Text style={styles.eventDateText}>
                                        {new Date(activity.date_day).toLocaleDateString('en-US', {
                                            weekday: 'long',
                                            month: 'long',
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
                        <TouchableOpacity style={styles.primaryButton} onPress={sharePlanUrlClick}>
                            <Icons.Share color="#fff" size={18} />
                            <Text style={styles.primaryButtonText}>Share Plan</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Selected Venue Card - Styled Like Favorites */}
                {selectedPlace && (
                    <View style={styles.finalizedVenueCard}>
                            {/* Section Header */}
                            <View style={styles.finalizedVenueHeaderRow}>
                                <Icons.MapPin color="#9333ea" size={20} />
                                <Text style={styles.finalizedVenueSectionTitle}>Location Details</Text>
                            </View>

                            {/* Venue Header with Title and Price */}
                            <View style={styles.finalizedVenueHeader}>
                                <Text style={styles.finalizedVenueTitle} numberOfLines={2}>
                                    {selectedPlace.title}
                                </Text>
                                {selectedPlace.price_range && (
                                    <View style={styles.finalizedPriceTag}>
                                        <Text style={styles.finalizedPriceText}>{selectedPlace.price_range}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Description */}
                            {selectedPlace.description && (
                                <Text style={styles.finalizedVenueDescription} numberOfLines={2}>
                                    {selectedPlace.description}
                                </Text>
                            )}

                            {/* Address Meta */}
                            {selectedPlace.address && (
                                <View style={styles.finalizedVenueMeta}>
                                    <Icons.Navigation color="rgba(255, 255, 255, 0.5)" size={14} />
                                    <Text style={styles.finalizedVenueAddress} numberOfLines={1}>
                                        {selectedPlace.address.split(',').slice(0, 2).join(',')}
                                    </Text>
                                </View>
                            )}

                            {/* Action Buttons Row */}
                            <View style={styles.finalizedVenueActions}>
                                <TouchableOpacity
                                    style={styles.finalizedActionButton}
                                    onPress={() => {
                                        if (selectedPlace.latitude && selectedPlace.longitude) {
                                            const url = `https://maps.apple.com/?daddr=${selectedPlace.latitude},${selectedPlace.longitude}`;
                                            Linking.openURL(url);
                                        } else if (selectedPlace.address) {
                                            const encodedAddress = encodeURIComponent(selectedPlace.address);
                                            Linking.openURL(`https://maps.apple.com/?address=${encodedAddress}`);
                                        }
                                    }}
                                >
                                    <Icons.Navigation color="#9333ea" size={18} />
                                </TouchableOpacity>

                                {selectedPlace.website && (
                                    <TouchableOpacity
                                        style={styles.finalizedActionButton}
                                        onPress={() => {
                                            let url = selectedPlace.website;
                                            if (!url.startsWith('http://') && !url.startsWith('https://')) {
                                                url = 'https://' + url;
                                            }
                                            Linking.openURL(url).catch(() => {
                                                Alert.alert('Error', 'Could not open website');
                                            });
                                        }}
                                    >
                                        <Icons.Globe color="#10b981" size={18} />
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={styles.finalizedActionButton}
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
                                >
                                    <Icons.Share color="#3b82f6" size={18} />
                                </TouchableOpacity>
                            </View>
                    </View>
                )}

                {/* Welcome Message if exists */}
                {activity.welcome_message && (
                    <View style={styles.finalizedPlanCard}>
                        <View style={styles.sectionHeader}>
                            <Icons.MessageCircle color="#9333ea" size={20} />
                            <Text style={styles.sectionTitle}>Message from Organizer</Text>
                        </View>
                        <Text style={styles.welcomeMessage}>{activity.welcome_message}</Text>
                    </View>
                )}

                {/* Attendees Card */}
                <View style={styles.finalizedPlanCard}>
                    <View style={styles.sectionHeader}>
                        <Icons.Users color="#9333ea" size={20} />
                        <Text style={styles.sectionTitle}>Who's Coming</Text>
                    </View>
                    <View style={styles.attendeePills}>
                        <View style={[styles.attendeePill, styles.hostPill]}>
                            <Icons.Crown color="#fbbf24" size={14} />
                            <Text style={styles.attendeePillText}>{activity.user?.name || 'Host'}</Text>
                        </View>
                        {activity.participants?.map((participant, index) => (
                            <View key={index} style={styles.attendeePill}>
                                <Icons.Check color="#9333ea" size={14} />
                                <Text style={styles.attendeePillText}>
                                    {participant.name?.split(' ')[0] || participant.name}
                                </Text>
                            </View>
                        ))}
                    </View>
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
