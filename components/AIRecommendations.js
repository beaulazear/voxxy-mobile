import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Modal,
    StyleSheet,
    Alert,
    Dimensions,
    Image,
    FlatList,
    Animated,
    ActivityIndicator,
    Linking,
    SafeAreaView,
    PanResponder,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';

// Updated Icons object using Feather icons
const Icons = {
    Users: (props) => <Icon name="users" size={16} color="#cc31e8" {...props} />,
    Share: (props) => <Icon name="share" size={16} color="#cc31e8" {...props} />,
    HelpCircle: (props) => <Icon name="help-circle" size={16} color="#cc31e8" {...props} />,
    CheckCircle: (props) => <Icon name="check-circle" size={16} color="#cc31e8" {...props} />,
    Clock: (props) => <Icon name="clock" size={16} color="#cc31e8" {...props} />,
    Vote: (props) => <Icon name="check-square" size={16} color="#cc31e8" {...props} />,
    BookHeart: (props) => <Icon name="book" size={16} color="#cc31e8" {...props} />,
    Flag: (props) => <Icon name="flag" size={16} color="#cc31e8" {...props} />,
    X: (props) => <Icon name="x" size={16} color="#cc31e8" {...props} />,
    ExternalLink: (props) => <Icon name="external-link" size={16} color="#cc31e8" {...props} />,
    MapPin: (props) => <Icon name="map-pin" size={16} color="#cc31e8" {...props} />,
    DollarSign: (props) => <Icon name="dollar-sign" size={16} color="#cc31e8" {...props} />,
    Globe: (props) => <Icon name="globe" size={16} color="#cc31e8" {...props} />,
    Zap: (props) => <Icon name="zap" size={16} color="#cc31e8" {...props} />,
    Calendar: (props) => <Icon name="calendar" size={16} color="#cc31e8" {...props} />,
    Star: (props) => <Icon name="star" size={16} color="#cc31e8" {...props} />,
    RotateCcw: (props) => <Icon name="rotate-ccw" size={16} color="#cc31e8" {...props} />,
    FastForward: (props) => <Icon name="fast-forward" size={16} color="#cc31e8" {...props} />,
    ChevronRight: (props) => <Icon name="chevron-right" size={16} color="#cc31e8" {...props} />,
};

import CuisineResponseForm from './CuisineResponseForm';
import NightOutResponseForm from './NightOutResponseForm';
import GameNightResponseForm from './GameNightResponseForm';
import LetsMeetScheduler from './LetsMeetScheduler';
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const { width: screenWidth } = Dimensions.get('window');

const safeJsonParse = (data, fallback = []) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            logger.warn('Failed to parse JSON data:', e);
            return fallback;
        }
    }
    return fallback;
};

const analyzeAvailability = (responses) => {
    const availabilityData = {};
    const participantCount = {};

    (responses || []).forEach(response => {
        const availability = response.availability || {};
        const participantName = response.user?.name || response.email || 'Anonymous';

        Object.entries(availability).forEach(([date, times]) => {
            if (!availabilityData[date]) {
                availabilityData[date] = {};
                participantCount[date] = 0;
            }
            participantCount[date]++;

            times.forEach(time => {
                if (!availabilityData[date][time]) {
                    availabilityData[date][time] = [];
                }
                availabilityData[date][time].push(participantName);
            });
        });
    });

    return { availabilityData, participantCount };
};

// Availability Display Component
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

// Truncated Review Component
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

// Photo Gallery Component
const PhotoGallery = ({ photos }) => {
    const validPhotos = photos.filter(photo => photo.photo_url || (typeof photo === 'string' && photo.startsWith('http')));

    if (validPhotos.length === 0) return null;

    return (
        <View style={styles.photoSection}>
            <View style={styles.sectionHeader}>
                <Icon name="camera" size={16} color="#fff" />
                <Text style={styles.sectionHeaderText}>Photos ({validPhotos.length})</Text>
            </View>
            <FlatList
                data={validPhotos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item.photo_url || item }}
                        style={styles.photo}
                        resizeMode="cover"
                    />
                )}
            />
        </View>
    );
};

const ProgressBar = ({ percent }) => {
    return (
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
        </View>
    );
};

// Swipeable Card Component
const SwipeableCard = ({ recommendation, onSwipeLeft, onSwipeRight, onFlag, onFavorite, onViewDetails, isGameNight }) => {
    const pan = React.useRef(new Animated.ValueXY()).current;
    const scale = React.useRef(new Animated.Value(1)).current;
    const rotate = React.useRef(new Animated.Value(0)).current;

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            // Only respond to horizontal movement for swiping
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10;
        },
        onPanResponderGrant: () => {
            pan.setOffset({ x: pan.x._value, y: pan.y._value });
            Animated.spring(scale, { toValue: 1.05, useNativeDriver: false }).start();
        },
        onPanResponderMove: (evt, gestureState) => {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy });
            // Rotate card based on horizontal movement
            const rotation = gestureState.dx / screenWidth * 30; // Max 30 degrees
            rotate.setValue(rotation);
        },
        onPanResponderRelease: (evt, gestureState) => {
            pan.flattenOffset();
            
            const threshold = screenWidth * 0.2; // 20% of screen width for easier swiping
            
            if (gestureState.dx > threshold) {
                // Swipe right - like
                Animated.parallel([
                    Animated.timing(pan, {
                        toValue: { x: screenWidth + 100, y: gestureState.dy },
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(rotate, {
                        toValue: 30,
                        duration: 300,
                        useNativeDriver: false,
                    }),
                ]).start(() => onSwipeRight(recommendation));
            } else if (gestureState.dx < -threshold) {
                // Swipe left - dislike
                Animated.parallel([
                    Animated.timing(pan, {
                        toValue: { x: -screenWidth - 100, y: gestureState.dy },
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(rotate, {
                        toValue: -30,
                        duration: 300,
                        useNativeDriver: false,  
                    }),
                ]).start(() => onSwipeLeft(recommendation));
            } else {
                // Snap back to center
                Animated.parallel([
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }),
                    Animated.spring(scale, {
                        toValue: 1,
                        useNativeDriver: false,
                    }),
                    Animated.spring(rotate, {
                        toValue: 0,
                        useNativeDriver: false,
                    }),
                ]).start();
            }
        },
    });

    const rotateInterpolate = rotate.interpolate({
        inputRange: [-30, 0, 30],
        outputRange: ['-30deg', '0deg', '30deg'],
    });

    return (
        <Animated.View
            style={[
                styles.swipeCard,
                styles.activeCard,
                {
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { rotate: rotateInterpolate },
                        { scale: scale },
                    ],
                },
            ]}
            {...panResponder.panHandlers}
        >
            {/* Swipe Indicators */}
            <Animated.View 
                style={[
                    styles.swipeIndicator, 
                    styles.likeIndicator,
                    { opacity: pan.x.interpolate({ inputRange: [0, 75], outputRange: [0, 1] }) }
                ]}
            >
                <Icons.CheckCircle color="#28a745" size={24} />
                <Text style={styles.likeText}>LIKE</Text>
            </Animated.View>
            
            <Animated.View 
                style={[
                    styles.swipeIndicator, 
                    styles.dislikeIndicator,
                    { opacity: pan.x.interpolate({ inputRange: [-75, 0], outputRange: [1, 0] }) }
                ]}
            >
                <Icons.X color="#e74c3c" size={24} />
                <Text style={styles.dislikeText}>PASS</Text>
            </Animated.View>

            {/* Card Content */}
            <LinearGradient
                colors={['#3A2D44', '#2C1E33']}
                style={styles.cardGradient}
            >
                <View style={styles.cardHeader}>
                    <TouchableOpacity onPress={() => onViewDetails(recommendation)} activeOpacity={0.7} style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>{recommendation.title}</Text>
                    </TouchableOpacity>
                    <Text style={styles.cardPriceCorner}>{recommendation.price_range || '$'}</Text>
                </View>

                <View style={styles.cardDetails}>
                    {isGameNight ? (
                        <>
                            <View style={styles.cardDetailRow}>
                                <Icons.Users color="#cc31e8" size={16} />
                                <Text style={styles.cardDetailText}>Players: {recommendation.address || 'N/A'}</Text>
                            </View>
                            <View style={styles.cardDetailRow}>
                                <Icons.Clock color="#cc31e8" size={16} />
                                <Text style={styles.cardDetailText}>Play Time: {recommendation.hours || 'N/A'}</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.cardDetailRow}>
                                <Icons.Clock color="#cc31e8" size={16} />
                                <Text style={styles.cardDetailText}>{recommendation.hours || 'N/A'}</Text>
                            </View>
                            <View style={styles.cardDetailRow}>
                                <Icons.MapPin color="#cc31e8" size={16} />
                                <Text style={styles.cardDetailText}>{recommendation.address || 'N/A'}</Text>
                            </View>
                        </>
                    )}
                </View>

                {recommendation.description && (
                    <Text style={styles.cardDescription} numberOfLines={3}>
                        {recommendation.description}
                    </Text>
                )}

                {recommendation.reason && (
                    <View style={styles.cardReason}>
                        <Text style={styles.cardReasonTitle}>Why this choice?</Text>
                        <Text style={styles.cardReasonText} numberOfLines={4}>
                            {recommendation.reason}
                        </Text>
                    </View>
                )}

                {/* View Full Details Button */}
                <TouchableOpacity 
                    style={styles.viewDetailsButton} 
                    onPress={() => onViewDetails(recommendation)}
                    activeOpacity={0.7}
                >
                    <Text style={styles.viewDetailsButtonText}>View details</Text>
                    <Icons.ExternalLink color="rgba(255, 255, 255, 0.7)" size={14} />
                </TouchableOpacity>

                {/* Action Buttons */}
                <View style={styles.cardActions} pointerEvents="box-none">
                    <TouchableOpacity 
                        style={[styles.cardActionButton, styles.flagButton]} 
                        onPress={() => onFlag(recommendation)}
                        activeOpacity={0.8}
                    >
                        <Icons.Flag color="#ffc107" size={16} />
                        <Text style={styles.flagButtonText}>Flag</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={[styles.cardActionButton, styles.favoriteButton]} 
                        onPress={() => onFavorite(recommendation)}
                        activeOpacity={0.8}
                    >
                        <Icons.Star color="#D4AF37" size={16} />
                        <Text style={styles.favoriteButtonText}>Favorite</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </Animated.View>
    );
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
    
    // New swipeable card states
    const [currentCardIndex, setCurrentCardIndex] = useState(0);
    const [likedRecommendations, setLikedRecommendations] = useState([]);
    const [dislikedRecommendations, setDislikedRecommendations] = useState([]);
    const [flaggedRecommendations, setFlaggedRecommendations] = useState([]);
    const [showingResults, setShowingResults] = useState(false);

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

    const { id, responses = [], activity_location, date_notes, collecting, finalized, voting, completed, active, selected_pinned_activity_id } = activity;

    const activityType = activity.activity_type || 'Restaurant';

    const isNightOutActivity = activityType === 'Cocktails';
    const isLetsEatActivity = activityType === 'Restaurant';
    const isGameNightActivity = activityType === 'Game Night';
    const isMeetingActivity = activityType === 'Meeting';

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

        if (isGameNightActivity) {
            return {
                submitTitle: 'Collecting Preferences',
                submitDescription: 'Help us find the perfect games by sharing your game preferences and group dynamics',
                finalizedTitle: 'Game Night Finalized',
                preferencesQuiz: 'Take Game Preferences Quiz',
                resubmitPreferences: 'Resubmit Game Preferences',
                reasonTitle: 'Why This Game?',
                apiEndpoint: '/api/openai/game_recommendations'
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
    const responseRate = (responses.length / totalParticipants) * 100;

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

            case 'Game Night':
                return (
                    <GameNightResponseForm
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
            const { recommendations: recs } = await safeAuthApiCall(
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
                }
            );

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

    const handleSaveActivity = async () => {
        try {
            await fetch(`${API_URL}/activities/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`,
                },
                body: JSON.stringify({
                    saved: true
                }),
            });

            Alert.alert('Success', 'Activity saved successfully!');
            setRefreshTrigger(f => !f);
        } catch (error) {
            logger.error('Error saving activity:', error);
            const errorMessage = handleApiError(error, 'Failed to save activity.');
            Alert.alert('Error', errorMessage);
        }
    };


    const openDetail = (rec) => {
        setSelectedRec(rec);
        setShowDetailModal(true);
    };

    const closeDetail = () => {
        setShowDetailModal(false);
        setSelectedRec(null);
    };

    const sharePlanUrlClick = () => {
        const shareUrl = `${API_URL}/activities/${activity.id}/share`;
        Linking.openURL(shareUrl);
    };

    // Swipeable card handlers
    const handleSwipeLeft = (recommendation) => {
        setDislikedRecommendations(prev => [...prev, recommendation]);
        nextCard();
    };

    const handleSwipeRight = (recommendation) => {
        setLikedRecommendations(prev => [...prev, recommendation]);
        nextCard();
    };

    const handleFlag = (recommendation) => {
        setFlaggedRecommendations(prev => [...prev, recommendation]);
        // Also add to disliked to remove from deck
        setDislikedRecommendations(prev => [...prev, recommendation]);
        Alert.alert('Flagged', 'This recommendation has been flagged and removed from your deck.');
        nextCard();
    };

    const handleFavorite = (recommendation) => {
        // Add to liked recommendations and mark as favorite (favoriting automatically likes it)
        setLikedRecommendations(prev => {
            const isAlreadyLiked = prev.some(item => item.id === recommendation.id);
            if (!isAlreadyLiked) {
                return [...prev, { ...recommendation, isFavorite: true }];
            }
            return prev.map(item => 
                item.id === recommendation.id 
                    ? { ...item, isFavorite: true }
                    : item
            );
        });
        
        Alert.alert('Favorited & Liked', 'Added to your favorites and liked recommendations!');
        nextCard(); // Move to next card after favoriting
    };

    const nextCard = () => {
        setCurrentCardIndex(prev => {
            const nextIndex = prev + 1;
            if (nextIndex >= pinnedActivities.length) {
                // All cards reviewed, show results
                setShowingResults(true);
            }
            return nextIndex;
        });
    };

    const resetCards = () => {
        setCurrentCardIndex(0);
        setLikedRecommendations([]);
        setDislikedRecommendations([]);
        setFlaggedRecommendations([]);
        setShowingResults(false);
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

    const handleSaveFavoriteAndComplete = async () => {
        const favoriteRecommendations = likedRecommendations.filter(rec => rec.isFavorite);
        
        if (favoriteRecommendations.length === 0) {
            Alert.alert(
                'No Favorites Selected', 
                'Please mark at least one recommendation as a favorite before saving.',
                [{ text: 'OK' }]
            );
            return;
        }

        const favoritesText = favoriteRecommendations.length === 1 
            ? `"${favoriteRecommendations[0].title}"`
            : `${favoriteRecommendations.length} favorites`;
        
        Alert.alert(
            'Save Favorites & Complete Activity',
            `Save ${favoritesText} for future reference and mark this activity as completed?`,
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Save & Complete', onPress: async () => {
                    try {
                        // Saving favorites as user activities
                        
                        // Toggle favorite on pinned_activities to create user_activities
                        const saveFavoritePromises = favoriteRecommendations.map(async (favorite) => {
                            // Each favorite is a pinned_activity that needs to be marked as favorite
                            if (!favorite.id) {
                                logger.error('Favorite recommendation missing ID:', favorite);
                                return null;
                            }

                            // Toggle favorite on the pinned_activity (this creates a user_activity)
                            try {
                                const response = await safeAuthApiCall(
                                    `${API_URL}/pinned_activities/${favorite.id}/toggle_favorite`,
                                    user.token,
                                    { method: 'POST' }
                                );
                                return { ok: true, data: response };
                            } catch (error) {
                                logger.error('Failed to toggle favorite on pinned_activity:', {
                                    error: error.message,
                                    pinnedActivityId: favorite.id,
                                    favoriteName: favorite.title
                                });
                                return { ok: false, error };
                            }
                        });

                        // Step 3: Save flagged recommendations as user_activities
                        const saveFlaggedPromises = flaggedRecommendations.map(async (flagged) => {
                            // Each flagged is a pinned_activity that needs to be marked as flagged
                            if (!flagged.id) {
                                logger.error('Flagged recommendation missing ID:', flagged);
                                return null;
                            }

                            // Toggle flag on the pinned_activity (this creates a user_activity)
                            try {
                                const response = await safeAuthApiCall(
                                    `${API_URL}/pinned_activities/${flagged.id}/toggle_flag`,
                                    user.token,
                                    { method: 'POST' }
                                );
                                return { ok: true, data: response };
                            } catch (error) {
                                logger.error('Failed to toggle flag on pinned_activity:', {
                                    error: error.message,
                                    pinnedActivityId: flagged.id,
                                    flaggedName: flagged.title
                                });
                                return { ok: false, error };
                            }
                        });
                        
                        // Wait for both favorite and flagged saves to complete
                        const [favoriteResults, flaggedResults] = await Promise.all([
                            Promise.all(saveFavoritePromises),
                            Promise.all(saveFlaggedPromises)
                        ]);
                        
                        const successfulFavorites = favoriteResults.filter(r => r && r.ok);
                        const successfulFlagged = flaggedResults.filter(r => r && r.ok);
                        
                        // Track successful saves
                        logger.debug('Successfully marked as favorites:', successfulFavorites.length);
                        logger.debug('Successfully marked as flagged:', successfulFlagged.length);
                        
                        // Check for any failed saves
                        const allResults = [...favoriteResults, ...flaggedResults];
                        const failedSaves = allResults.filter(r => r && !r.ok);
                        if (failedSaves.length > 0) {
                            logger.warn('Some saves failed:', failedSaves.length);
                        }

                        // Mark the activity as completed
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

                        const successMessage = favoriteRecommendations.length === 1
                            ? 'Your favorite has been saved for future reference and the activity is completed.'
                            : `Your ${favoriteRecommendations.length} favorites have been saved for future reference and the activity is completed.`;
                        
                        // Navigate to home and show favorites modal
                        setRefreshTrigger(f => !f);
                        navigation.navigate('/', { showFavorites: true });
                        
                        // Show success message after a brief delay
                        setTimeout(() => {
                            Alert.alert('Success!', successMessage);
                        }, 500);
                    } catch (error) {
                        logger.error('Favorites save error:', {
                            details: error,
                            message: error.message,
                            stack: error.stack
                        });
                        Alert.alert('Error', 'Failed to save and complete activity. Please try again.');
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

                    {/* Compact Response Counter */}
                    <View style={styles.compactCounterWrapper}>
                        <Animated.View 
                            style={[
                                styles.compactCounter,
                                {
                                    transform: [{ scale: pulseValue.interpolate({
                                        inputRange: [1, 1.2],
                                        outputRange: [1, 1.03]
                                    })}]
                                }
                            ]}
                        >
                            <Text style={styles.compactNumber}>{responses.length}</Text>
                            <Text style={styles.compactLabel}>
                                {responses.length === 1 ? 'Response Submitted' : 'Responses Submitted'}
                            </Text>
                        </Animated.View>
                    </View>

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
                            <LinearGradient
                                colors={['#9333EA', '#7C3AED']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={styles.actionGradient}
                            >
                                <View style={styles.actionIconBg}>
                                    <Icon name="message-circle" size={24} color="#fff" />
                                </View>
                                <Text style={styles.actionTitle}>Your Input Matters!</Text>
                                <Text style={styles.actionText}>
                                    {activityText.submitDescription}
                                    {activity.allow_participant_time_selection && ' and select your availability'}
                                </Text>
                                <TouchableOpacity style={styles.modernActionButton} onPress={handleStartChat}>
                                    <Text style={styles.modernActionButtonText}>
                                        {activity.allow_participant_time_selection ? 'Share Preferences & Times' : 'Share Your Preferences'}
                                    </Text>
                                    <Icon name="arrow-right" size={18} color="#9333EA" />
                                </TouchableOpacity>
                            </LinearGradient>
                        </Animated.View>
                    ) : user && currentUserResponse ? (
                        <View style={styles.submittedCard}>
                            <View style={styles.submittedHeader}>
                                <View style={styles.checkCircle}>
                                    <Icon name="check" size={20} color="#10B981" />
                                </View>
                                <Text style={styles.submittedTitle}>You're All Set!</Text>
                            </View>
                            <Text style={styles.submittedText}>
                                Your preferences have been recorded
                                {activity.allow_participant_time_selection && ' along with your availability'}.
                            </Text>
                            <TouchableOpacity style={styles.updateButton} onPress={handleStartChat}>
                                <Icon name="refresh-cw" size={16} color="#A855F7" />
                                <Text style={styles.updateButtonText}>Update Response</Text>
                            </TouchableOpacity>
                        </View>
                    ) : null}

                    <AvailabilityDisplay responses={responses} activity={activity} />

                    {/* Generate Recommendations Button */}
                    {isOwner && (
                        <View style={styles.generateButtonContainer}>
                            {/* Pulse Ring */}
                            <Animated.View 
                                style={[
                                    styles.pulseRing,
                                    {
                                        opacity: pulseOpacity,
                                        transform: [{
                                            scale: pulseValue
                                        }]
                                    }
                                ]}
                            />
                            
                            {/* Main Button */}
                            <TouchableOpacity
                                style={[styles.generateButtonTouchable, responses.length === 0 && styles.generateButtonDisabled]}
                                onPress={() => responses.length > 0 && setShowGenerateModal(true)}
                                activeOpacity={responses.length > 0 ? 0.9 : 1}
                                disabled={responses.length === 0}
                            >
                                <LinearGradient
                                    colors={['#6B73FF', '#9D50BB']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.generateButtonGradient}
                                >
                                    <View style={styles.buttonInnerGlow} />
                                    <Icons.Zap color="#fff" size={20} style={styles.buttonIcon} />
                                    <Text style={styles.generateButtonText}>Generate Recommendations</Text>
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
                        <SafeAreaView style={styles.modalOverlay}>
                            <Animated.View 
                                style={[
                                    styles.votingModalContainer,
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
                                    colors={['#9333EA', '#7C3AED', '#6B21A8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.modalGradientBackground}
                                />
                                
                                {/* Content Container */}
                                <View style={styles.modalContentWrapper}>
                                    {/* Close Button */}
                                    <TouchableOpacity
                                        style={styles.modernCloseBtn}
                                        onPress={() => setShowGenerateModal(false)}
                                    >
                                        <View style={styles.closeBtnCircle}>
                                            <Icons.X size={20} color="rgba(255,255,255,0.9)" />
                                        </View>
                                    </TouchableOpacity>
                                    
                                    {/* Icon Animation */}
                                    <Animated.View 
                                        style={[
                                            styles.modalIconWrapper,
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
                                        <LinearGradient
                                            colors={['#A855F7', '#9333EA']}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                            style={styles.iconCircle}
                                        >
                                            <Icons.Zap size={32} color="#fff" />
                                        </LinearGradient>
                                    </Animated.View>
                                    
                                    {/* Text Content */}
                                    <View style={styles.votingModalContent}>
                                        <Text style={styles.modernTitle}>Ready to Discover?</Text>
                                        <Text style={styles.modernDescription}>
                                            Let AI create personalized recommendations based on your group's preferences
                                        </Text>
                                        
                                        {/* Progress Section */}
                                        <View style={styles.modernProgressSection}>
                                            <View style={styles.progressHeader}>
                                                <View style={styles.usersIconWrapper}>
                                                    <Icons.Users size={18} color="#A855F7" />
                                                </View>
                                                <Text style={styles.progressLabel}>Participation</Text>
                                            </View>
                                            
                                            <View style={styles.modernProgressBarBg}>
                                                <LinearGradient
                                                    colors={['#A855F7', '#7C3AED']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={[styles.modernProgressFill, { width: `${responseRate}%` }]}
                                                />
                                            </View>
                                            
                                            <View style={styles.progressInfo}>
                                                <Text style={styles.progressText}>
                                                    {responses.length} of {totalParticipants} responses
                                                </Text>
                                                <View style={styles.percentageBadge}>
                                                    <Text style={styles.percentageText}>{Math.round(responseRate)}%</Text>
                                                </View>
                                            </View>
                                        </View>
                                        
                                        {/* Warning Section */}
                                        {responseRate < 50 && (
                                            <View style={styles.modernWarning}>
                                                <View style={styles.warningIconCircle}>
                                                    <Icon name="alert-triangle" size={16} color="#FBBF24" />
                                                </View>
                                                <Text style={styles.modernWarningText}>
                                                    More responses = better recommendations
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {/* Action Buttons */}
                                        <View style={styles.buttonContainer}>
                                            <TouchableOpacity 
                                                style={styles.secondaryButton}
                                                onPress={() => setShowGenerateModal(false)}
                                            >
                                                <Text style={styles.secondaryButtonText}>Wait for More</Text>
                                            </TouchableOpacity>
                                            
                                            <TouchableOpacity 
                                                style={styles.primaryButton}
                                                onPress={generateRecommendations}
                                            >
                                                <LinearGradient
                                                    colors={['#9333EA', '#7C3AED']}
                                                    start={{ x: 0, y: 0 }}
                                                    end={{ x: 1, y: 0 }}
                                                    style={styles.primaryButtonGradient}
                                                >
                                                    <Icons.Zap size={20} color="#fff" />
                                                    <Text style={styles.primaryButtonText}>Generate Now</Text>
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
                                    Voxxy's AI is curating the perfect recommendations for your group...
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
                <View style={styles.header}>
                    <Text style={styles.heading}>AI Recommendations</Text>
                </View>
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
        
        // Only the activity owner can swipe through recommendations
        if (!isOwner) {
            return null;
        }
        // Show results if all cards have been swiped through
        if (showingResults) {
            return (
                <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                    {likedRecommendations.length > 0 ? (
                        <>
                            {/* Combined results and actions card */}
                            <View style={styles.combinedResultsCard}>
                                <View style={styles.resultsHeader}>
                                    <Icons.Star color="#D4AF37" size={24} />
                                    <Text style={styles.resultsTitle}>Great choices!</Text>
                                </View>
                                <Text style={styles.resultsSubtitle}>
                                    You've selected {likedRecommendations.length} recommendation{likedRecommendations.length > 1 ? 's' : ''}.
                                </Text>

                                {isOwner && (
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity 
                                            style={styles.saveFavoriteButton} 
                                            onPress={handleSaveFavoriteAndComplete}
                                        >
                                            <Icons.Star color="#fff" size={18} />
                                            <Text style={styles.saveFavoriteButtonText}>Save Favorites & Complete</Text>
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={styles.finalizeActivityButton} 
                                            onPress={onEdit}
                                        >
                                            <Icons.Calendar color="#fff" size={18} />
                                            <Text style={styles.finalizeActivityButtonText}>Finalize Activity Plans</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
                            </View>

                            {/* Stats card - moved below great choices */}
                            <View style={styles.statsCard}>
                                <View style={styles.resultsStats}>
                                    <View style={styles.statItem}>
                                        <Icons.CheckCircle color="#28a745" size={18} />
                                        <Text style={styles.statNumber}>{likedRecommendations.length}</Text>
                                        <Text style={styles.statLabel}>Liked</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Icons.X color="#e74c3c" size={18} />
                                        <Text style={styles.statNumber}>{dislikedRecommendations.length}</Text>
                                        <Text style={styles.statLabel}>Passed</Text>
                                    </View>
                                    <View style={styles.statItem}>
                                        <Icons.Flag color="#ffc107" size={18} />
                                        <Text style={styles.statNumber}>{flaggedRecommendations.length}</Text>
                                        <Text style={styles.statLabel}>Flagged</Text>
                                    </View>
                                </View>
                            </View>

                            <View style={styles.recommendationsList}>
                                {likedRecommendations.map((p) => (
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
                                                            <Text style={styles.listDetail}>{p.hours || 'N/A'}</Text>
                                                            <Text style={styles.listDetail}>{p.address || 'N/A'}</Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Text style={styles.listDetail}>{p.hours || 'N/A'}</Text>
                                                            <Text style={styles.listDetail}>{p.address || 'N/A'}</Text>
                                                        </>
                                                    )}
                                                </View>
                                            </View>
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>

                            <TouchableOpacity style={styles.resetButton} onPress={resetCards}>
                                <Icons.RotateCcw color="#cc31e8" size={16} />
                                <Text style={styles.resetButtonText}>Review Again</Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <View style={styles.noLikesContainer}>
                            <Icons.HelpCircle color="#ccc" size={48} />
                            <Text style={styles.noLikesTitle}>No matches found</Text>
                            <Text style={styles.noLikesText}>
                                You didn't like any of the recommendations. Try reviewing them again or generate new ones.
                            </Text>
                            <TouchableOpacity style={styles.tryAgainButton} onPress={resetCards}>
                                <Icons.RotateCcw />
                                <Text style={styles.tryAgainButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </ScrollView>
            );
        }

        // Show all recommendations as cards
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.heading}>AI Recommendations</Text>
                    <Text style={styles.subheading}>
                        Review and select your favorites
                    </Text>
                </View>

                {/* Display all recommendations */}
                <View style={styles.recommendationsGrid}>
                    {pinnedActivities.map((recommendation) => {
                        const isFavorited = likedRecommendations.some(rec => rec.id === recommendation.id);
                        const isFlagged = flaggedRecommendations.some(rec => rec.id === recommendation.id);
                        
                        return (
                            <TouchableOpacity 
                                key={recommendation.id}
                                style={[
                                    styles.recommendationCard,
                                    isFavorited && styles.recommendationCardFavorited
                                ]}
                                onPress={() => openDetail(recommendation)}
                                activeOpacity={0.7}
                            >
                                <LinearGradient
                                    colors={isFavorited ? ['rgba(212, 175, 55, 0.15)', 'rgba(212, 175, 55, 0.08)'] : ['rgba(204, 49, 232, 0.08)', 'rgba(155, 29, 189, 0.05)']}
                                    style={styles.recCardGradient}
                                >
                                    <View style={styles.recCardContent}>
                                        <Text style={styles.recCardTitle} numberOfLines={2}>
                                            {recommendation.title}
                                        </Text>
                                        
                                        {recommendation.price_range && (
                                            <View style={styles.recCardInfo}>
                                                <Icons.DollarSign size={14} />
                                                <Text style={styles.recCardInfoText}>{recommendation.price_range}</Text>
                                            </View>
                                        )}
                                        
                                        {recommendation.address && !isGameNightActivity && (
                                            <View style={styles.recCardInfo}>
                                                <Icons.MapPin size={14} />
                                                <Text style={styles.recCardInfoText} numberOfLines={1}>
                                                    {recommendation.address}
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {recommendation.hours && (
                                            <View style={styles.recCardInfo}>
                                                <Icons.Clock size={14} />
                                                <Text style={styles.recCardInfoText}>
                                                    {isGameNightActivity ? `Play time: ${recommendation.hours}` : recommendation.hours}
                                                </Text>
                                            </View>
                                        )}
                                        
                                        {recommendation.reason && (
                                            <Text style={styles.recCardReason} numberOfLines={3}>
                                                {recommendation.reason}
                                            </Text>
                                        )}
                                    </View>
                                    
                                    {/* Action buttons */}
                                    <View style={styles.recCardActions}>
                                        <TouchableOpacity 
                                            style={[
                                                styles.recActionButton,
                                                isFlagged && styles.recActionButtonActive
                                            ]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                if (isFlagged) {
                                                    // Remove from flagged
                                                    setFlaggedRecommendations(prev => 
                                                        prev.filter(item => item.id !== recommendation.id)
                                                    );
                                                } else {
                                                    // Add to flagged
                                                    setFlaggedRecommendations(prev => [...prev, recommendation]);
                                                    Alert.alert('Flagged', 'This recommendation has been flagged.');
                                                }
                                            }}
                                        >
                                            <Icons.Flag color={isFlagged ? "#e74c3c" : "#999"} size={16} />
                                        </TouchableOpacity>
                                        
                                        <TouchableOpacity 
                                            style={[
                                                styles.recActionButton,
                                                isFavorited && styles.recActionButtonFavorited
                                            ]}
                                            onPress={(e) => {
                                                e.stopPropagation();
                                                if (isFavorited) {
                                                    // Remove from liked
                                                    setLikedRecommendations(prev => 
                                                        prev.filter(item => item.id !== recommendation.id)
                                                    );
                                                } else {
                                                    // Add to liked with favorite flag
                                                    setLikedRecommendations(prev => [
                                                        ...prev, 
                                                        { ...recommendation, isFavorite: true }
                                                    ]);
                                                }
                                            }}
                                        >
                                            <Icons.Star color={isFavorited ? "#D4AF37" : "#999"} size={16} />
                                        </TouchableOpacity>
                                    </View>
                                </LinearGradient>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Bottom actions */}
                <View style={styles.bottomActionsContainer}>
                    <TouchableOpacity 
                        style={[
                            styles.saveFavoriteButton,
                            likedRecommendations.length === 0 && styles.buttonDisabled
                        ]} 
                        onPress={handleSaveFavoriteAndComplete}
                        disabled={likedRecommendations.length === 0}
                    >
                        <Icons.Star color="#fff" size={18} />
                        <Text style={styles.saveFavoriteButtonText}>
                            Save {likedRecommendations.length || 'No'} Favorites & Complete
                        </Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.finalizeActivityButton} 
                        onPress={onEdit}
                    >
                        <Icons.Calendar color="#fff" size={18} />
                        <Text style={styles.finalizeActivityButtonText}>Finalize Activity Plans</Text>
                    </TouchableOpacity>
                </View>

                    {/* Detail Modal - Same as before */}
                    <Modal
                        visible={showDetailModal}
                        animationType="slide"
                        onRequestClose={closeDetail}
                    >
                        <SafeAreaView style={styles.detailModal}>
                            <View style={styles.detailModalHeader}>
                                <Text style={styles.detailModalTitle}>{selectedRec?.title || selectedRec?.name}</Text>
                                <TouchableOpacity style={styles.detailCloseButton} onPress={closeDetail}>
                                    <Icons.X />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.detailModalBody}>
                                <View style={styles.detailGrid}>
                                    {isGameNightActivity ? (
                                        <>
                                            <View style={styles.detailItem}>
                                                <Icons.Users />
                                                <Text style={styles.detailLabel}>Players:</Text>
                                                <Text style={styles.detailValue}>{selectedRec?.address || 'N/A'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Icons.Clock />
                                                <Text style={styles.detailLabel}>Play Time:</Text>
                                                <Text style={styles.detailValue}>{selectedRec?.hours || 'N/A'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Icons.DollarSign />
                                                <Text style={styles.detailLabel}>Price:</Text>
                                                <Text style={styles.detailValue}>{selectedRec?.price_range || 'N/A'}</Text>
                                            </View>
                                        </>
                                    ) : (
                                        <>
                                            <View style={styles.detailItem}>
                                                <Icons.DollarSign />
                                                <Text style={styles.detailLabel}>Price:</Text>
                                                <Text style={styles.detailValue}>{selectedRec?.price_range || 'N/A'}</Text>
                                            </View>
                                            <View style={styles.detailItem}>
                                                <Icons.Clock />
                                                <Text style={styles.detailLabel}>Hours:</Text>
                                                <Text style={styles.detailValue}>{selectedRec?.hours || 'N/A'}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>

                                {selectedRec?.description && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icons.HelpCircle />
                                            <Text style={styles.sectionTitle}>About</Text>
                                        </View>
                                        <Text style={styles.description}>{selectedRec.description}</Text>
                                        {selectedRec.website && (
                                            <TouchableOpacity
                                                style={styles.websiteLink}
                                                onPress={() => Linking.openURL(selectedRec.website)}
                                            >
                                                <Icons.Globe />
                                                <Text style={styles.websiteLinkText}>Visit Website</Text>
                                                <Icons.ExternalLink />
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                )}

                                {selectedRec?.reason && (
                                    <View style={styles.reason}>
                                        <Text style={styles.reasonTitle}>{activityText.reasonTitle}</Text>
                                        <Text style={styles.reasonText}>{selectedRec.reason}</Text>
                                    </View>
                                )}

                                {!isGameNightActivity && selectedRec?.address && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <Icons.MapPin />
                                            <Text style={styles.sectionTitle}>Location</Text>
                                        </View>
                                        <Text style={styles.description}>{selectedRec.address}</Text>
                                    </View>
                                )}

                                {!isGameNightActivity && selectedRec?.photos && (
                                    <PhotoGallery photos={safeJsonParse(selectedRec.photos, [])} />
                                )}

                                {!isGameNightActivity && selectedRec?.reviews && (() => {
                                    const reviews = safeJsonParse(selectedRec.reviews, []);
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
                        </SafeAreaView>
                    </Modal>
            </ScrollView>
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

                {/* Combined Finalized Plan Card */}
                <View style={styles.finalizedPlanCard}>
                    {/* Header with status */}
                    <View style={styles.finalizedHeader}>
                        <View style={styles.finalizedStatusBadge}>
                            <Icons.CheckCircle color="#fff" size={16} />
                            <Text style={styles.finalizedStatusText}>{activityText.finalizedTitle}</Text>
                        </View>
                    </View>

                    {/* Selected Place Details */}
                    {selectedPlace && (
                        <TouchableOpacity 
                            style={styles.selectedPlaceSection} 
                            onPress={() => openDetail(selectedPlace)}
                            activeOpacity={0.7}
                        >
                            <View style={styles.selectedPlaceHeader}>
                                <Text style={styles.selectedPlaceName}>{selectedPlace.title}</Text>
                                <Icons.ChevronRight color="rgba(255, 255, 255, 0.6)" size={20} />
                            </View>
                            
                            <View style={styles.selectedPlaceDetails}>
                                <View style={styles.selectedPlaceDetail}>
                                    <Icons.DollarSign color="#B8A5C4" size={16} />
                                    <Text style={styles.selectedPlaceDetailText}>{selectedPlace.price_range || 'N/A'}</Text>
                                </View>
                                <View style={styles.selectedPlaceDetail}>
                                    <Icons.Clock color="#B8A5C4" size={16} />
                                    <Text style={styles.selectedPlaceDetailText}>{selectedPlace.hours || 'N/A'}</Text>
                                </View>
                                {selectedPlace.address && (
                                    <View style={styles.selectedPlaceDetail}>
                                        <Icons.MapPin color="#B8A5C4" size={16} />
                                        <Text style={styles.selectedPlaceDetailText}>{selectedPlace.address}</Text>
                                    </View>
                                )}
                            </View>
                        </TouchableOpacity>
                    )}

                    {/* Share Action */}
                    <View style={styles.finalizedActionSection}>
                        <TouchableOpacity style={styles.finalizedShareButton} onPress={sharePlanUrlClick}>
                            <Icons.Share size={18} color="#fff" />
                            <Text style={styles.finalizedShareButtonText}>Share Final Plan Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Detail Modal - Same as voting phase */}
                <Modal
                    visible={showDetailModal}
                    animationType="slide"
                    onRequestClose={closeDetail}
                >
                    <SafeAreaView style={styles.detailModal}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>{selectedRec?.title || selectedRec?.name}</Text>
                            <TouchableOpacity style={styles.detailCloseButton} onPress={closeDetail}>
                                <Icons.X />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.detailModalBody}>
                            {/* Same content as voting phase detail modal */}
                            <View style={styles.detailGrid}>
                                {isGameNightActivity ? (
                                    <>
                                        <View style={styles.detailItem}>
                                            <Icons.Users />
                                            <Text style={styles.detailLabel}>Players:</Text>
                                            <Text style={styles.detailValue}>{selectedRec?.address || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Icons.Clock />
                                            <Text style={styles.detailLabel}>Play Time:</Text>
                                            <Text style={styles.detailValue}>{selectedRec?.hours || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Icons.DollarSign />
                                            <Text style={styles.detailLabel}>Price:</Text>
                                            <Text style={styles.detailValue}>{selectedRec?.price_range || 'N/A'}</Text>
                                        </View>
                                    </>
                                ) : (
                                    <>
                                        <View style={styles.detailItem}>
                                            <Icons.DollarSign />
                                            <Text style={styles.detailLabel}>Price:</Text>
                                            <Text style={styles.detailValue}>{selectedRec?.price_range || 'N/A'}</Text>
                                        </View>
                                        <View style={styles.detailItem}>
                                            <Icons.Clock />
                                            <Text style={styles.detailLabel}>Hours:</Text>
                                            <Text style={styles.detailValue}>{selectedRec?.hours || 'N/A'}</Text>
                                        </View>
                                    </>
                                )}
                            </View>

                            {selectedRec?.description && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Icons.HelpCircle />
                                        <Text style={styles.sectionTitle}>About</Text>
                                    </View>
                                    <Text style={styles.description}>{selectedRec.description}</Text>
                                    {selectedRec.website && (
                                        <TouchableOpacity
                                            style={styles.websiteLink}
                                            onPress={() => Linking.openURL(selectedRec.website)}
                                        >
                                            <Icons.Globe />
                                            <Text style={styles.websiteLinkText}>Visit Website</Text>
                                            <Icons.ExternalLink />
                                        </TouchableOpacity>
                                    )}
                                </View>
                            )}

                            {selectedRec?.reason && (
                                <View style={styles.reason}>
                                    <Text style={styles.reasonTitle}>{activityText.reasonTitle}</Text>
                                    <Text style={styles.reasonText}>{selectedRec.reason}</Text>
                                </View>
                            )}

                            {!isGameNightActivity && selectedRec?.address && (
                                <View style={styles.section}>
                                    <View style={styles.sectionHeader}>
                                        <Icons.MapPin />
                                        <Text style={styles.sectionTitle}>Location</Text>
                                    </View>
                                    <Text style={styles.description}>{selectedRec.address}</Text>
                                </View>
                            )}

                            {!isGameNightActivity && selectedRec?.photos && (
                                <PhotoGallery photos={safeJsonParse(selectedRec.photos, [])} />
                            )}

                            {!isGameNightActivity && selectedRec?.reviews && (() => {
                                const reviews = safeJsonParse(selectedRec.reviews, []);
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
                    </SafeAreaView>
                </Modal>
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

const styles = StyleSheet.create({
    container: {
        marginHorizontal: 16,
    },
    contentContainer: {
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#201925',
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 10,
    },
    header: {
        padding: 20,
        paddingBottom: 10,
    },
    heading: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    subheading: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        fontWeight: '500',
    },
    errorText: {
        color: '#e74c3c',
        fontSize: 14,
        textAlign: 'center',
        margin: 16,
        padding: 10,
        backgroundColor: 'rgba(231, 76, 60, 0.1)',
        borderRadius: 8,
    },
    phaseIndicator: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
    },
    combinedCard: {
        flexDirection: 'column',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginTop: 24,
    },
    collectingTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        marginBottom: 16,
        opacity: 1,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        marginBottom: 20,
    },
    submissionCountContainer: {
        alignItems: 'center',
    },
    submissionCount: {
        color: '#cc31e8',
        fontSize: 48,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        lineHeight: 52,
    },
    submissionLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        marginTop: 4,
    },
    phaseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    phaseTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    subtleActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(103, 115, 234, 0.15)',
        borderColor: 'rgba(103, 115, 234, 0.3)',
        borderWidth: 1,
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    subtleActionButtonText: {
        color: '#cc31e8',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 8,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#201925',
        borderRadius: 8,
        borderWidth: 1.5,
        borderColor: '#cc31e8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        marginHorizontal: 16,
        marginBottom: 20,
        alignSelf: 'flex-start',
        flexShrink: 1,
    },
    shareButtonText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    phaseSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 20,
    },
    phaseActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%',
    },
    phaseActionButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        marginHorizontal: 16,
        marginBottom: 16,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 3,
    },
    availabilitySection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        marginBottom: 16,
        padding: 16,
    },
    availabilityHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    availabilityTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    availabilityEmptyText: {
        color: '#ccc',
        fontSize: 14,
    },
    participantAvailability: {
        marginBottom: 16,
    },
    participantName: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    availabilityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    dateCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 8,
        padding: 12,
        minWidth: 120,
        marginBottom: 8,
    },
    dateHeader: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
    },
    timeSlots: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
    },
    timeSlot: {
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
    },
    timeSlotText: {
        color: '#cc31e8',
        fontSize: 11,
    },
    overlapAnalysis: {
        marginTop: 16,
        paddingTop: 16,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: 1,
    },
    overlapTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    overlapTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    bestTimeCard: {
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    bestTimeDateHeader: {
        color: '#28a745',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    participantCountText: {
        fontWeight: 'normal',
        color: 'rgba(40, 167, 69, 0.8)',
    },
    timeOverlapItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    timeText: {
        color: '#fff',
        fontSize: 13,
    },
    availabilityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
    },
    availabilityBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    preferencesCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        alignItems: 'center',
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderWidth: 1,
    },
    preferencesSection: {
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: 1,
        width: '100%',
    },
    submittedSection: {
        alignItems: 'center',
        marginTop: 16,
        paddingTop: 16,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: 1,
        width: '100%',
    },
    generateButtonContainer: {
        marginHorizontal: 24,
        marginTop: 20,
        marginBottom: 20,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    pulseRing: {
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#6B73FF',
        backgroundColor: 'transparent',
    },
    generateButtonTouchable: {
        borderRadius: 30,
        overflow: 'hidden',
        elevation: 8,
        shadowColor: '#6B73FF',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    generateButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 30,
        position: 'relative',
    },
    buttonInnerGlow: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonIcon: {
        marginRight: 2,
    },
    generateButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        marginLeft: 8,
        letterSpacing: 0.3,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        gap: 8,
        width: '100%',
        marginTop: 16,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#28a745',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        flex: 1,
    },
    saveButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 14,
    },
    finalizeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 12,
        flex: 1,
    },
    finalizeButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 6,
        fontSize: 14,
    },
    preferencesTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    preferencesText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    preferencesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    preferencesButtonText: {
        color: '#fff',
        fontWeight: '600',
        marginLeft: 8,
    },
    submittedCard: {
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
        borderRadius: 20,
        padding: 20,
        marginBottom: 20,
        marginHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
    },
    submittedTitle: {
        color: '#28a745',
        fontSize: 18,
        fontWeight: '700',
        marginTop: 12,
        marginBottom: 8,
        textAlign: 'center',
    },
    submittedText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    resubmitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderColor: '#cc31e8',
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    resubmitButtonText: {
        color: '#cc31e8',
        fontWeight: '600',
        marginLeft: 8,
    },
    recommendationsList: {
        marginTop: 32,
        marginBottom: 16,
    },
    listItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        marginBottom: 12,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderWidth: 1,
        overflow: 'hidden',
    },
    selectedListItem: {
        borderColor: '#28a745',
        borderWidth: 2,
    },
    selectedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#28a745',
        paddingHorizontal: 12,
        paddingVertical: 6,
        justifyContent: 'center',
    },
    selectedBadgeText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        marginLeft: 6,
    },
    listContent: {
        padding: 16,
    },
    listTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    listName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
        marginRight: 12,
    },
    listMeta: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '600',
    },
    listBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    listDetail: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        marginBottom: 2,
    },
    voteSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderWidth: 1,
    },
    likedButton: {
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        borderColor: '#e74c3c',
    },
    likeButtonText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    voteCount: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    voteCountText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 4,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    votingModalContainer: {
        width: '90%',
        maxWidth: 380,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#1A1625',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    modalGradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 140,
    },
    modalContentWrapper: {
        backgroundColor: 'transparent',
    },
    modernCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },
    closeBtnCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    modalIconWrapper: {
        alignSelf: 'center',
        marginTop: 60,
        marginBottom: -35,
        zIndex: 5,
    },
    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },
    votingModalContent: {
        backgroundColor: '#1A1625',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 50,
        alignItems: 'center',
    },
    modernTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    modernDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 16,
    },
    modernProgressSection: {
        width: '100%',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    usersIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    progressLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    modernProgressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },
    modernProgressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    progressText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },
    percentageBadge: {
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    percentageText: {
        color: '#A855F7',
        fontSize: 14,
        fontWeight: '700',
    },
    modernWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },
    warningIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    modernWarningText: {
        color: '#FBBF24',
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
    },
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },
    secondaryButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    secondaryButtonText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },
    primaryButton: {
        flex: 1.5,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
    votingModalCloseButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        padding: 12,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    votingModalTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 12,
    },
    votingModalDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
    },
    votingModalProgressSection: {
        width: '100%',
        marginBottom: 20,
    },
    votingModalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 12,
        width: '100%',
        marginTop: 10,
    },
    votingModalButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    modalContainer: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
    },
    modalHeader: {
        padding: 20,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomWidth: 1,
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        textAlign: 'center',
    },
    modalSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 4,
    },
    modalCloseButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        zIndex: 10,
    },
    modalBody: {
        padding: 20,
    },
    modalProgressContainer: {
        marginBottom: 16,
    },
    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 8,
    },
    progressLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    progressText: {
        color: '#ccc',
        fontSize: 14,
        marginLeft: 6,
    },
    progressPercentage: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: 'rgba(255, 193, 7, 0.3)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
    },
    warningIcon: {
        marginRight: 8,
        marginTop: 2,
    },
    warningText: {
        color: '#ffc107',
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    detailModal: {
        flex: 1,
        backgroundColor: '#201925',
    },
    detailModalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 20,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        borderBottomWidth: 1,
    },
    detailModalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        flex: 1,
        textAlign: 'center',
        paddingRight: 40,
    },
    detailCloseButton: {
        position: 'absolute',
        top: 10,
        right: 15,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        zIndex: 10,
    },
    detailModalBody: {
        flex: 1,
        padding: 20,
    },
    detailGrid: {
        marginBottom: 20,
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    detailLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginLeft: 8,
        marginRight: 8,
    },
    detailValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionHeaderText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    description: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 14,
        lineHeight: 20,
    },
    websiteLink: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        paddingVertical: 8,
    },
    websiteLinkText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginHorizontal: 6,
    },
    reason: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },
    reasonTitle: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    reasonText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 14,
        lineHeight: 20,
    },
    photoSection: {
        marginBottom: 20,
    },
    photo: {
        width: 120,
        height: 120,
        borderRadius: 8,
        marginRight: 12,
    },
    reviewItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 8,
        padding: 12,
        marginBottom: 8,
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reviewAuthor: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    reviewRatingText: {
        color: '#D4AF37',
        fontSize: 12,
        marginLeft: 4,
    },
    reviewText: {
        color: 'rgba(255, 255, 255, 0.95)',
        fontSize: 13,
        lineHeight: 18,
    },
    reviewToggleButton: {
        color: '#cc31e8',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    fallbackText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        margin: 20,
    },

    // Exciting Loading Modal Styles
    loadingModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingModalContainer: {
        backgroundColor: '#2C1E33',
        borderRadius: 30,
        padding: 50,
        alignItems: 'center',
        maxWidth: 350,
        margin: 20,
        shadowColor: '#6B73FF',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
        borderWidth: 1,
        borderColor: 'rgba(107, 115, 255, 0.3)',
    },
    loadingAnimation: {
        position: 'relative',
        width: 80,
        height: 80,
        marginBottom: 30,
    },
    loadingCircle: {
        position: 'absolute',
        borderWidth: 3,
        borderRadius: 40,
        borderColor: 'transparent',
    },
    loadingCircle1: {
        width: 80,
        height: 80,
        borderTopColor: '#6B73FF',
        borderRightColor: '#6B73FF',
    },
    loadingCircle2: {
        width: 60,
        height: 60,
        top: 10,
        left: 10,
        borderTopColor: '#9D50BB',
        borderRightColor: '#9D50BB',
    },
    loadingCircle3: {
        width: 40,
        height: 40,
        top: 20,
        left: 20,
        borderTopColor: '#CF38DD',
        borderRightColor: '#CF38DD',
    },
    voxxyTriangleContainer: {
        width: 100,
        height: 100,
        justifyContent: 'center',
        alignItems: 'center',
    },
    voxxyTriangle: {
        width: 80,
        height: 80,
        tintColor: undefined, // Let the image use its natural colors
    },
    loadingModalTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    loadingModalSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    loadingDots: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    loadingDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#6B73FF',
    },
    loadingDot1: {
        backgroundColor: '#6B73FF',
    },
    loadingDot2: {
        backgroundColor: '#9D50BB',
    },
    loadingDot3: {
        backgroundColor: '#CF38DD',
    },

    // Swipeable Card Styles
    swipeContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },
    swipeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        paddingBottom: 8,
    },
    swipeBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    swipeHeaderCenter: {
        flex: 1,
        alignItems: 'center',
    },
    swipeHeaderRight: {
        width: 40, // Balance the back button
    },
    swipeHeaderTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 0,
    },
    cardCounter: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    cardCounterText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
    swipeInstructions: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
        paddingVertical: 8,
        marginBottom: -8,
    },
    instructionItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    swipeLeftDemo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    swipeRightDemo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },
    instructionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        fontWeight: '500',
    },
    cardStack: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    swipeCard: {
        width: screenWidth - 40,
        height: 450,
        borderRadius: 20,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    activeCard: {
        position: 'absolute',
        zIndex: 1,
    },
    nextCard: {
        position: 'absolute',
        zIndex: -1,
        transform: [{ scale: 0.95 }],
        opacity: 0.6,
    },
    cardGradient: {
        flex: 1,
        borderRadius: 20,
        padding: 20,
        justifyContent: 'space-between',
    },
    swipeIndicator: {
        position: 'absolute',
        top: 30,
        zIndex: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: 90,
        height: 90,
        borderRadius: 45,
        borderWidth: 4,
    },
    likeIndicator: {
        right: 25,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.25)',
    },
    dislikeIndicator: {
        left: 25,
        borderColor: '#e74c3c',
        backgroundColor: 'rgba(231, 76, 60, 0.25)',
    },
    likeText: {
        color: '#28a745',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    dislikeText: {
        color: '#e74c3c',
        fontSize: 14,
        fontWeight: '800',
        marginTop: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },
    cardHeader: {
        marginBottom: 16,
    },
    cardTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 4,
    },
    cardPrice: {
        color: '#D4AF37',
        fontSize: 16,
        fontWeight: '600',
    },
    cardDetails: {
        marginBottom: 16,
    },
    cardDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    cardDetailText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginLeft: 8,
    },
    cardDescription: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    cardReason: {
        backgroundColor: 'rgba(102, 126, 234, 0.15)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },
    cardReasonTitle: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    cardReasonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        lineHeight: 18,
    },
    cardActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    cardActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    flagButton: {
        borderColor: '#ffc107',
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
    },
    flagButtonText: {
        color: '#ffc107',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    favoriteButton: {
        borderColor: '#D4AF37',
        backgroundColor: 'rgba(212, 175, 55, 0.1)',
    },
    favoriteButtonText: {
        color: '#D4AF37',
        fontSize: 13,
        fontWeight: '600',
        marginLeft: 6,
    },
    nextCardTitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
    },
    skipButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        marginHorizontal: 20,
        marginBottom: 20,
    },
    skipButtonText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },

    // Results View Styles
    resultsHeader: {
        padding: 16,
        marginBottom: 16,
    },
    resultsStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginTop: 6,
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 11,
        marginTop: 2,
    },
    favoriteListItem: {
        borderColor: '#D4AF37',
        borderWidth: 2,
    },
    favoriteIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#D4AF37',
        paddingHorizontal: 12,
        paddingVertical: 6,
        justifyContent: 'center',
    },
    favoriteIndicatorText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 12,
        marginLeft: 6,
    },
    finalActionsContainer: {
        flexDirection: 'row',
        gap: 12,
        marginHorizontal: 16,
        marginBottom: 16,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#201925',
        borderWidth: 1.5,
        borderColor: '#cc31e8',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignSelf: 'center',
        marginHorizontal: 16,
        marginBottom: 20,
    },
    shareButtonText: {
        color: '#cc31e8',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
    finalizeFromResultsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#28a745',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 12,
        flex: 1,
    },
    finalizeFromResultsButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        marginLeft: 8,
    },
    resetButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        borderColor: '#cc31e8',
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginHorizontal: 16,
        marginBottom: 20,
    },
    resetButtonText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    noLikesContainer: {
        alignItems: 'center',
        padding: 40,
        marginHorizontal: 16,
    },
    noLikesTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    noLikesText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    tryAgainButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    tryAgainButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },

    // No recommendations styles
    noRecommendationsContainer: {
        alignItems: 'center',
        padding: 40,
        marginHorizontal: 16,
    },
    noRecommendationsTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginTop: 16,
        marginBottom: 8,
    },
    noRecommendationsText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 24,
    },
    generateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
    },
    generateButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },

    // Voting placeholder styles
    votingPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
        padding: 40,
        marginHorizontal: 16,
    },
    votingPlaceholderText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
    },

    // Test button styles
    testButtons: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        paddingHorizontal: 40,
        paddingVertical: 20,
    },
    testButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    testButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },

    // Phase-specific button styles
    activateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 16,
    },
    activateButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },
    startCollectingButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#28a745',
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 12,
        marginTop: 16,
    },
    startCollectingButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        marginLeft: 8,
    },

    // Debug styles
    debugInfo: {
        marginTop: 20,
        padding: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
    },
    debugText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontFamily: 'monospace',
    },

    // Combined results card styles
    combinedResultsCard: {
        marginHorizontal: 16,
        marginBottom: 20,
        padding: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    resultsTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginLeft: 8,
    },
    resultsSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    actionButtons: {
        gap: 12,
    },
    statsCard: {
        marginHorizontal: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.2)',
    },
    saveFavoriteButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#D4AF37',
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#D4AF37',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    finalizeActivityButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        paddingVertical: 14,
        borderRadius: 12,
        elevation: 3,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    saveFavoriteButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    finalizeActivityButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginLeft: 8,
    },
    generateButtonDisabled: {
        opacity: 0.5,
    },
    modernHeader: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 16,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        marginBottom: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#10B981',
        marginRight: 6,
    },
    statusText: {
        color: '#10B981',
        fontSize: 12,
        fontWeight: '600',
    },
    modernCollectingTitle: {
        color: '#FFFFFF',
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 4,
    },
    modernSubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        textAlign: 'center',
    },
    statsCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
    },
    statsGradient: {
        padding: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginBottom: 20,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    bigNumber: {
        color: '#A855F7',
        fontSize: 36,
        fontWeight: '800',
        marginBottom: 4,
    },
    statLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '500',
    },
    divider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
    },
    percentageCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#A855F7',
    },
    percentageNumber: {
        color: '#A855F7',
        fontSize: 18,
        fontWeight: '700',
    },
    modernProgressContainer: {
        width: '100%',
    },
    modernProgressBg: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    modernProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    progressGradientFill: {
        width: '100%',
        height: '100%',
    },
    actionCard: {
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 20,
        marginHorizontal: 16,
    },
    actionGradient: {
        padding: 24,
        alignItems: 'center',
    },
    actionIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    actionTitle: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 8,
    },
    actionText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
        lineHeight: 20,
    },
    modernActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        gap: 8,
    },
    modernActionButtonText: {
        color: '#9333EA',
        fontSize: 15,
        fontWeight: '700',
    },
    checkCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    submittedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    updateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.3)',
        gap: 8,
    },
    updateButtonText: {
        color: '#A855F7',
        fontSize: 14,
        fontWeight: '600',
    },
    compactCounterWrapper: {
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 20,
    },
    compactCounter: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        gap: 8,
    },
    compactNumber: {
        color: '#A855F7',
        fontSize: 20,
        fontWeight: '700',
    },
    compactLabel: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
    collectingPhaseTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 16,
        textAlign: 'center',
    },
    viewDetailsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginTop: 10,
        marginBottom: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    viewDetailsButtonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        fontWeight: '500',
        marginRight: 6,
    },
    cardPriceCorner: {
        position: 'absolute',
        top: 0,
        right: 0,
        color: '#D4AF37',
        fontSize: 16,
        fontWeight: '600',
    },
    cardTitleContainer: {
        flex: 1,
        paddingRight: 60, // Make room for price
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        position: 'relative',
    },

    // Finalized Plan Card Styles
    finalizedPlanCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        marginHorizontal: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        overflow: 'hidden',
    },

    finalizedHeader: {
        backgroundColor: '#28a745',
        paddingVertical: 12,
        paddingHorizontal: 16,
        alignItems: 'center',
    },

    finalizedStatusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    finalizedStatusText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },

    selectedPlaceSection: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },

    selectedPlaceHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },

    selectedPlaceName: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
        marginRight: 12,
    },

    selectedPlaceDetails: {
        gap: 8,
    },

    selectedPlaceDetail: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    selectedPlaceDetailText: {
        color: '#B8A5C4',
        fontSize: 14,
        fontWeight: '500',
    },

    finalizedActionSection: {
        padding: 20,
    },

    finalizedShareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#cc31e8',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 20,
        gap: 8,
    },

    finalizedShareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    
    // New card grid styles for voting phase
    recommendationsGrid: {
        paddingHorizontal: 12,
        paddingBottom: 20,
    },
    recommendationCard: {
        marginBottom: 12,
        borderRadius: 12,
        overflow: 'hidden',
        marginHorizontal: 4,
    },
    recommendationCardFavorited: {
        borderWidth: 2,
        borderColor: '#D4AF37',
    },
    recCardGradient: {
        padding: 1,
        borderRadius: 12,
    },
    recCardContent: {
        backgroundColor: 'rgba(30, 30, 35, 0.95)',
        borderRadius: 11,
        padding: 12,
        paddingBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    recCardTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 6,
        letterSpacing: 0.3,
    },
    recCardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
        gap: 6,
    },
    recCardInfoText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
    },
    recCardReason: {
        color: 'rgba(255, 255, 255, 0.75)',
        fontSize: 13,
        lineHeight: 18,
        marginTop: 6,
        fontWeight: '400',
    },
    recCardActions: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(30, 30, 35, 0.95)',
        paddingHorizontal: 12,
        paddingBottom: 10,
        paddingTop: 4,
        gap: 10,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.05)',
    },
    recActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    recActionButtonActive: {
        backgroundColor: 'rgba(231, 76, 60, 0.25)',
        borderColor: '#e74c3c',
    },
    recActionButtonFavorited: {
        backgroundColor: 'rgba(212, 175, 55, 0.25)',
        borderColor: '#D4AF37',
    },
    bottomActionsContainer: {
        paddingHorizontal: 16,
        paddingBottom: 30,
        gap: 12,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});