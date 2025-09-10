import React, { useState, useContext, useEffect } from 'react';
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
    PanResponder,
    Share,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Icon from 'react-native-vector-icons/Feather';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import styles from '../styles/AIRecommendationsStyles';
import { modalStyles, modalColors } from '../styles/modalStyles';
import NativeMapView from './NativeMapView';

// Activity configuration for emoji display
const ACTIVITY_CONFIG = {
    'Restaurant': { emoji: '🍜' },
    'Cocktails': { emoji: '🍸' },
    'Brunch': { emoji: '🥐' },
    'Game Night': { emoji: '🎮' },
};

// Updated Icons object using Feather icons
const Icons = {
    Users: (props) => <Icon name="users" size={16} color="#cc31e8" {...props} />,
    Share: (props) => <Icon name="share" size={16} color="#cc31e8" {...props} />,
    MoreHorizontal: (props) => <Icon name="more-horizontal" size={16} color="#cc31e8" {...props} />,
    ChevronRight: (props) => <Icon name="chevron-right" size={16} color="#cc31e8" {...props} />,
    ArrowRight: (props) => <Icon name="arrow-right" size={16} color="#cc31e8" {...props} />,
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
    Map: (props) => <Icon name="map" size={16} color="#cc31e8" {...props} />,
    Grid: (props) => <Icon name="grid" size={16} color="#cc31e8" {...props} />,
    Crown: (props) => <Icon name="award" size={16} color="#cc31e8" {...props} />,
    Check: (props) => <Icon name="check" size={16} color="#cc31e8" {...props} />,
    MessageCircle: (props) => <Icon name="message-circle" size={16} color="#cc31e8" {...props} />,
    Navigation: (props) => <Icon name="navigation" size={16} color="#cc31e8" {...props} />,
};

import CuisineResponseForm from './CuisineResponseForm';
import NightOutResponseForm from './NightOutResponseForm';
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

            {/* Card Content - Simplified like Try Voxxy */}
            <LinearGradient
                colors={['rgba(204, 49, 232, 0.08)', 'rgba(144, 81, 225, 0.04)']}
                style={styles.cardGradient}
            >
                {/* Header with Title and Price */}
                <View style={styles.cardHeader}>
                    <TouchableOpacity onPress={() => onViewDetails(recommendation)} activeOpacity={0.7} style={styles.cardTitleContainer}>
                        <Text style={styles.cardTitle}>{recommendation.title}</Text>
                    </TouchableOpacity>
                    <Text style={styles.cardPrice}>{recommendation.price_range || '$'}</Text>
                </View>

                {/* Description */}
                {recommendation.description && (
                    <Text style={styles.cardDescription} numberOfLines={2}>
                        {recommendation.description}
                    </Text>
                )}

                {/* Address */}
                {recommendation.address && (
                    <View style={styles.cardAddressRow}>
                        <Icons.MapPin color="#B8A5C4" size={14} />
                        <Text style={styles.cardAddressText} numberOfLines={1}>
                            {recommendation.address}
                        </Text>
                    </View>
                )}

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

// Helper function to format hours for display
const formatHours = (hoursString) => {
    if (!hoursString || hoursString === 'N/A') return 'Hours not available';
    
    // If it's already a simple string (old format), return as is
    if (!hoursString.includes('day')) {
        return hoursString;
    }
    
    try {
        // Parse days of the week from the string
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const shortDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        
        // Split by days and create a map
        const hoursMap = {};
        let currentHours = [];
        
        days.forEach((day, index) => {
            const dayPattern = new RegExp(`${day}[:\s]+([^,]+)(?:,|$)`, 'i');
            const match = hoursString.match(dayPattern);
            if (match) {
                const hours = match[1].trim();
                if (hours.toLowerCase() !== 'closed') {
                    if (!currentHours.length || currentHours[currentHours.length - 1].hours !== hours) {
                        currentHours.push({
                            days: [shortDays[index]],
                            hours: hours
                        });
                    } else {
                        currentHours[currentHours.length - 1].days.push(shortDays[index]);
                    }
                }
            }
        });
        
        // Format grouped hours
        if (currentHours.length === 0) {
            return 'Hours vary';
        }
        
        // Check if all days have the same hours
        if (currentHours.length === 1 && currentHours[0].days.length === 7) {
            return `Daily: ${currentHours[0].hours}`;
        }
        
        // Group consecutive days with same hours
        const formatted = currentHours.map(group => {
            if (group.days.length === 1) {
                return `${group.days[0]}: ${group.hours}`;
            } else if (group.days.length === 2) {
                return `${group.days.join(' & ')}: ${group.hours}`;
            } else {
                return `${group.days[0]}-${group.days[group.days.length - 1]}: ${group.hours}`;
            }
        });
        
        // If more than 2 groups, show simplified view
        if (formatted.length > 2) {
            return formatted.slice(0, 2).join(' • ');
        }
        
        return formatted.join(' • ');
    } catch (e) {
        // If parsing fails, return a simplified version
        return hoursString.length > 50 ? hoursString.substring(0, 47) + '...' : hoursString;
    }
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
    const [loadingFavorites, setLoadingFavorites] = useState(false);
    const [flaggedRecommendations, setFlaggedRecommendations] = useState([]);
    const [favoriteLoading, setFavoriteLoading] = useState({});
    
    // View mode toggle (map vs cards) - default to cards for Game Night
    const [viewMode, setViewMode] = useState(
        activity?.activity_type === 'Game Night' ? 'cards' : 'map'
    ); // 'map' or 'cards'
    
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
    const isLetsEatActivity = activityType === 'Restaurant' || activityType === 'Brunch'; // Treat Brunch as Restaurant
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
                },
                30000 // 30 second timeout for AI recommendations
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

    const sharePlanUrlClick = async () => {
        const shareUrl = `${API_URL}/activities/${activity.id}/share`;
        try {
            await Share.share({
                message: `Check out our plan: ${activity.activity_name}\n\n${shareUrl}`,
                url: shareUrl,
                title: activity.activity_name
            });
        } catch (error) {
            Alert.alert('Error', 'Could not share link');
        }
    };

    // Flag handler for marking recommendations to exclude  
    const handleFlag = (recommendation) => {
        setFlaggedRecommendations(prev => [...prev, recommendation]);
        Alert.alert('Flagged', 'This recommendation has been flagged for exclusion.');
    };

    // Helper function to check if a recommendation is favorited
    const isRecommendationFavorited = (recommendationId) => {
        if (!recommendationId || !userFavorites || userFavorites.length === 0) return false;
        return userFavorites.some(fav => {
            const pinnedActivityId = fav.pinned_activity?.id || fav.pinned_activity_id;
            return pinnedActivityId === recommendationId;
        });
    };

    // Get count of favorited recommendations from current pinned activities
    const getFavoritedRecommendationsFromCurrent = () => {
        if (!pinnedActivities || pinnedActivities.length === 0) return [];
        return pinnedActivities.filter(rec => isRecommendationFavorited(rec.id));
    };

    const handleFavorite = async (recommendation) => {
        if (!recommendation.id) {
            Alert.alert('Error', 'Unable to favorite this recommendation');
            return;
        }

        // Check if already favorited by looking through user's actual favorites
        const isAlreadyFavorited = userFavorites.some(fav => {
            const pinnedActivityId = fav.pinned_activity?.id || fav.pinned_activity_id;
            return pinnedActivityId === recommendation.id;
        });
        
        if (isAlreadyFavorited) {
            // For now, we don't handle unfavoriting
            Alert.alert('Already Favorited', 'This recommendation is already in your favorites.');
            return;
        }

        // Set loading state for this specific recommendation
        setFavoriteLoading(prev => ({ ...prev, [recommendation.id]: true }));

        try {
            // Make immediate API call to toggle favorite
            await safeAuthApiCall(
                `${API_URL}/pinned_activities/${recommendation.id}/toggle_favorite`,
                user.token,
                { method: 'POST' }
            );

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
                        
                        // Navigate to home
                        setRefreshTrigger(f => !f);
                        navigation.navigate('/');
                        
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
                            <View style={styles.actionGradient}>
                                <View style={styles.actionIconBg}>
                                    <Icon name="message-circle" size={24} color="#9333EA" />
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
                                    <Icon name="arrow-right" size={18} color="#FFFFFF" />
                                </TouchableOpacity>
                            </View>
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
                                        <Text style={modalStyles.modernTitle}>Ready to Discover?</Text>
                                        <Text style={modalStyles.modernDescription}>
                                            Let Voxxy create personalized recommendations based on your group's preferences
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
                    <View style={styles.recommendationsGrid}>
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
                                            
                                            {/* Description */}
                                            {(recommendation.description || recommendation.reason) && (
                                                <Text style={styles.recCardDescription} numberOfLines={2}>
                                                    {recommendation.description || recommendation.reason}
                                                </Text>
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

                {/* Detail Modal for participants */}
                <Modal
                    visible={showDetailModal}
                    animationType="slide"
                    onRequestClose={() => setShowDetailModal(false)}
                >
                    <SafeAreaView style={styles.detailModal}>
                        <View style={styles.detailModalHeader}>
                            <Text style={styles.detailModalTitle}>{selectedRec?.title || selectedRec?.name}</Text>
                            <TouchableOpacity style={styles.detailCloseButton} onPress={() => setShowDetailModal(false)}>
                                <Icons.X />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.detailModalBody}>
                            {(() => {
                                const activityType = activity.activity_type || 'Meeting';
                                const isGameNightActivity = false; // Game Night removed - keeping for legacy code
                                const activityText = {
                                    reasonTitle: isGameNightActivity ? 'Why this game?' : 'Why this place?'
                                };

                                return (
                                    <>
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
                                                        <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                                        <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                                <TouchableOpacity onPress={() => openMapWithAddress(selectedRec.address)}>
                                                    <Text style={[styles.description, styles.addressLink]}>
                                                        {selectedRec.address}
                                                    </Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}

                                        {!isGameNightActivity && selectedRec?.photos && (
                                            <PhotoGallery photos={safeJsonParse(selectedRec.photos, [])} />
                                        )}
                                    </>
                                );
                            })()}
                        </ScrollView>
                    </SafeAreaView>
                </Modal>
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

                                {isOwner && (
                                    <View style={styles.actionButtons}>
                                        <TouchableOpacity 
                                            style={styles.primaryActionButton} 
                                            onPress={() => {
                                                Alert.alert(
                                                    'What would you like to do?',
                                                    '',
                                                    [
                                                        {
                                                            text: "I'm done here",
                                                            onPress: handleCompleteActivity,
                                                            style: 'default'
                                                        },
                                                        {
                                                            text: 'Share plan with friends',
                                                            onPress: onEdit,
                                                            style: 'default'
                                                        },
                                                        {
                                                            text: 'Cancel',
                                                            style: 'cancel'
                                                        }
                                                    ]
                                                );
                                            }}
                                        >
                                            <Text style={styles.primaryActionButtonText}>Continue Planning</Text>
                                            <Icons.ChevronRight color="#fff" size={20} />
                                        </TouchableOpacity>
                                    </View>
                                )}
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
                                                            <Text style={styles.listDetail}>{formatHours(p.hours)}</Text>
                                                            <Text style={styles.listDetail}>{p.address || 'N/A'}</Text>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Text style={styles.listDetail}>{formatHours(p.hours)}</Text>
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
                    <View style={styles.mapViewContainer}>
                        <NativeMapView
                            recommendations={pinnedActivities.map(rec => ({
                                ...rec,
                                name: rec.title || rec.name,
                                id: rec.id || `${rec.title}-${rec.address}`,
                                isFavorite: isRecommendationFavorited(rec.id)
                            }))}
                            activityType={activity?.activity_type || 'Restaurant'}
                            onRecommendationSelect={(rec) => {
                                setSelectedRec(rec);
                                setShowDetailModal(true);
                            }}
                        />
                        
                        {/* View Mode Toggle overlay - only show for non-Game Night activities */}
                        {!isGameNightActivity && (
                            <View style={styles.viewModeToggleOverlay}>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeButtonActive]}
                                    onPress={() => setViewMode('map')}
                                >
                                    <Icons.Map color={viewMode === 'map' ? '#fff' : '#666'} size={18} />
                                    <Text style={[styles.viewModeButtonText, viewMode === 'map' && styles.viewModeButtonTextActive]}>
                                        Map
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'cards' && styles.viewModeButtonActive]}
                                    onPress={() => setViewMode('cards')}
                                >
                                    <Icons.Grid color={viewMode === 'cards' ? '#fff' : '#666'} size={18} />
                                    <Text style={[styles.viewModeButtonText, viewMode === 'cards' && styles.viewModeButtonTextActive]}>
                                        List
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                        
                        {/* Bottom actions for map view */}
                        {isOwner && (
                            <View style={styles.bottomActionsContainer}>
                                <TouchableOpacity 
                                    style={styles.primaryActionButton} 
                                    onPress={() => {
                                        Alert.alert(
                                            'What would you like to do?',
                                            '',
                                            [
                                                {
                                                    text: "I'm done here",
                                                    onPress: handleCompleteActivity,
                                                    style: 'default'
                                                },
                                                {
                                                    text: 'Share plan with friends',
                                                    onPress: onEdit,
                                                    style: 'default'
                                                },
                                                {
                                                    text: 'Cancel',
                                                    style: 'cancel'
                                                }
                                            ]
                                        );
                                    }}
                                >
                                    <Text style={styles.primaryActionButtonText}>Continue Planning</Text>
                                    <Icons.ChevronRight color="#fff" size={20} />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                ) : (
                    /* Card View */
                    <View style={styles.cardsContainer}>
                        {/* View Mode Toggle overlay - only show for non-Game Night activities */}
                        {!isGameNightActivity && (
                            <View style={styles.viewModeToggleOverlay}>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'map' && styles.viewModeButtonActive]}
                                    onPress={() => setViewMode('map')}
                                >
                                    <Icons.Map color={viewMode === 'map' ? '#fff' : '#666'} size={18} />
                                    <Text style={[styles.viewModeButtonText, viewMode === 'map' && styles.viewModeButtonTextActive]}>
                                        Map
                                    </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.viewModeButton, viewMode === 'cards' && styles.viewModeButtonActive]}
                                    onPress={() => setViewMode('cards')}
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
                        const isFavorited = isRecommendationFavorited(recommendation.id);
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
                                        {/* Header with Title and Price */}
                                        <View style={styles.recCardHeader}>
                                            <Text style={styles.recCardTitle} numberOfLines={1}>
                                                {recommendation.title}
                                            </Text>
                                            <Text style={styles.recCardPrice}>
                                                {recommendation.price_range || '$'}
                                            </Text>
                                        </View>
                                        
                                        {/* Description */}
                                        {(recommendation.description || recommendation.reason) && (
                                            <Text style={styles.recCardDescription} numberOfLines={2}>
                                                {recommendation.description || recommendation.reason}
                                            </Text>
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
                        
                        {/* Bottom actions for card view - Inside ScrollView */}
                        {isOwner && (
                    <View style={styles.bottomActionsContainer}>
                        <TouchableOpacity 
                            style={styles.primaryActionButton} 
                            onPress={() => {
                                Alert.alert(
                                    'What would you like to do?',
                                    '',
                                    [
                                        {
                                            text: "I'm done here",
                                            onPress: handleCompleteActivity,
                                            style: 'default'
                                        },
                                        {
                                            text: 'Share plan with friends',
                                            onPress: onEdit,
                                            style: 'default'
                                        },
                                        {
                                            text: 'Cancel',
                                            style: 'cancel'
                                        }
                                    ]
                                );
                            }}
                        >
                            <Text style={styles.primaryActionButtonText}>Continue Planning</Text>
                            <Icons.ChevronRight color="#fff" size={20} />
                        </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

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
                                                <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                                <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                        <TouchableOpacity onPress={() => openMapWithAddress(selectedRec.address)}>
                                            <Text style={[styles.description, styles.addressLink]}>
                                                {selectedRec.address}
                                            </Text>
                                        </TouchableOpacity>
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
                            
                            {/* Modal Action Buttons */}
                            <View style={styles.modalActionButtons}>
                                <TouchableOpacity 
                                    style={[
                                        styles.modalActionButton,
                                        flaggedRecommendations.some(r => r.id === selectedRec?.id) && styles.modalActionButtonActive
                                    ]}
                                    onPress={() => {
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
                                >
                                    <Icons.Flag color={flaggedRecommendations.some(r => r.id === selectedRec?.id) ? "#e74c3c" : "#999"} size={20} />
                                    <Text style={[
                                        styles.modalActionButtonText,
                                        flaggedRecommendations.some(r => r.id === selectedRec?.id) && styles.modalActionButtonTextActive
                                    ]}>
                                        {flaggedRecommendations.some(r => r.id === selectedRec?.id) ? 'Flagged' : 'Flag'}
                                    </Text>
                                </TouchableOpacity>
                                
                                <TouchableOpacity 
                                    style={[
                                        styles.modalActionButton,
                                        styles.modalFavoriteButton,
                                        isRecommendationFavorited(selectedRec?.id) && styles.modalFavoriteButtonActive
                                    ]}
                                    onPress={async () => {
                                        await handleFavorite(selectedRec);
                                        closeDetail();
                                    }}
                                    disabled={favoriteLoading[selectedRec?.id]}
                                >
                                    {favoriteLoading[selectedRec?.id] ? (
                                        <ActivityIndicator size="small" color="#D4AF37" />
                                    ) : (
                                        <>
                                            <Icons.Star color={isRecommendationFavorited(selectedRec?.id) ? "#D4AF37" : "#fff"} size={20} />
                                            <Text style={[
                                                styles.modalFavoriteButtonText,
                                                isRecommendationFavorited(selectedRec?.id) && styles.modalFavoriteButtonTextActive
                                            ]}>
                                                {isRecommendationFavorited(selectedRec?.id) ? 'Favorited' : 'Add to Favorites'}
                                            </Text>
                                        </>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </SafeAreaView>
                    </Modal>
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

                {/* Main Activity Card */}
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

                {/* Location Details Card */}
                {selectedPlace && (
                    <View style={styles.finalizedPlanCard}>
                        <View style={styles.sectionHeader}>
                            <Icons.MapPin color="#9333ea" size={20} />
                            <Text style={styles.sectionTitle}>Location Details</Text>
                        </View>
                        <Text style={styles.placeName}>{selectedPlace.title}</Text>
                        
                        {selectedPlace.description && (
                            <Text style={styles.placeDescription}>{selectedPlace.description}</Text>
                        )}
                        
                        <View style={styles.placeDetailRow}>
                            <Icons.Navigation color="rgba(255, 255, 255, 0.6)" size={16} />
                            <Text style={styles.placeAddress}>{selectedPlace.address}</Text>
                        </View>
                        
                        {selectedPlace.price_range && (
                            <View style={styles.placeDetailRow}>
                                <Icons.DollarSign color="#fbbf24" size={16} />
                                <Text style={styles.placePrice}>{selectedPlace.price_range}</Text>
                            </View>
                        )}
                        
                        <View style={styles.actionButtons}>
                            {selectedPlace.website && (
                                <TouchableOpacity 
                                    style={styles.secondaryButton}
                                    onPress={() => Linking.openURL(selectedPlace.website)}
                                >
                                    <Icons.Globe color="#9333ea" size={18} />
                                    <Text style={styles.secondaryButtonText}>Website</Text>
                                </TouchableOpacity>
                            )}
                            {selectedPlace.address && (
                                <TouchableOpacity 
                                    style={styles.primaryButton}
                                    onPress={() => {
                                        const encodedAddress = encodeURIComponent(selectedPlace.address);
                                        Linking.openURL(`https://maps.google.com?q=${encodedAddress}`);
                                    }}
                                >
                                    <Icons.Map color="#fff" size={18} />
                                    <Text style={styles.primaryButtonText}>Directions</Text>
                                </TouchableOpacity>
                            )}
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
                                            <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                            <Text style={styles.detailValue}>{formatHours(selectedRec?.hours)}</Text>
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
                                    <TouchableOpacity onPress={() => openMapWithAddress(selectedRec.address)}>
                                        <Text style={[styles.description, styles.addressLink]}>
                                            {selectedRec.address}
                                        </Text>
                                    </TouchableOpacity>
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
                        
                        {/* Modal Action Buttons for FINALIZED phase */}
                        <View style={styles.modalActionButtons}>
                            <TouchableOpacity 
                                style={[
                                    styles.modalActionButton,
                                    flaggedRecommendations.some(r => r.id === selectedRec?.id) && styles.modalActionButtonActive
                                ]}
                                onPress={() => {
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
                            >
                                <Icons.Flag color={flaggedRecommendations.some(r => r.id === selectedRec?.id) ? "#e74c3c" : "#999"} size={20} />
                                <Text style={[
                                    styles.modalActionButtonText,
                                    flaggedRecommendations.some(r => r.id === selectedRec?.id) && styles.modalActionButtonTextActive
                                ]}>
                                    {flaggedRecommendations.some(r => r.id === selectedRec?.id) ? 'Flagged' : 'Flag'}
                                </Text>
                            </TouchableOpacity>
                            
                            <TouchableOpacity 
                                style={[
                                    styles.modalActionButton,
                                    styles.modalFavoriteButton,
                                    isRecommendationFavorited(selectedRec?.id) && styles.modalFavoriteButtonActive
                                ]}
                                onPress={async () => {
                                    await handleFavorite(selectedRec);
                                    closeDetail();
                                }}
                                disabled={favoriteLoading[selectedRec?.id]}
                            >
                                {favoriteLoading[selectedRec?.id] ? (
                                    <ActivityIndicator size="small" color="#D4AF37" />
                                ) : (
                                    <>
                                        <Icons.Star color={isRecommendationFavorited(selectedRec?.id) ? "#D4AF37" : "#fff"} size={20} />
                                        <Text style={[
                                            styles.modalFavoriteButtonText,
                                            isRecommendationFavorited(selectedRec?.id) && styles.modalFavoriteButtonTextActive
                                        ]}>
                                            {isRecommendationFavorited(selectedRec?.id) ? 'Favorited' : 'Add to Favorites'}
                                        </Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
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
