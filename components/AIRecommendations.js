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
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
// Temporarily using text icons - you can replace with react-native-vector-icons later
const Icons = {
    Users: () => <Text style={styles.iconText}>👥</Text>,
    Share: () => <Text style={styles.iconText}>📤</Text>,
    HelpCircle: () => <Text style={styles.iconText}>❓</Text>,
    CheckCircle: () => <Text style={styles.iconText}>✅</Text>,
    Clock: () => <Text style={styles.iconText}>🕐</Text>,
    Vote: () => <Text style={styles.iconText}>🗳️</Text>,
    BookHeart: () => <Text style={styles.iconText}>📚</Text>,
    Flag: () => <Text style={styles.iconText}>🏁</Text>,
    X: () => <Text style={styles.iconText}>✕</Text>,
    ExternalLink: () => <Text style={styles.iconText}>🔗</Text>,
    MapPin: () => <Text style={styles.iconText}>📍</Text>,
    DollarSign: () => <Text style={styles.iconText}>💰</Text>,
    Globe: () => <Text style={styles.iconText}>🌐</Text>,
    Zap: () => <Text style={styles.iconText}>⚡</Text>,
    Calendar: () => <Text style={styles.iconText}>📅</Text>,
    Star: () => <Text style={styles.iconText}>⭐</Text>,
};

// Import chat components (you'll need to create React Native versions)
// import CuisineChat from './CuisineChat';
// import BarChat from '../cocktails/BarChat';
// import GameNightPreferenceChat from '../gamenight/GameNightPreferenceChat';

const { width: screenWidth } = Dimensions.get('window');

// Helper functions
const safeJsonParse = (data, fallback = []) => {
    if (!data) return fallback;
    if (typeof data === 'object') return data;
    if (typeof data === 'string') {
        try {
            return JSON.parse(data);
        } catch (e) {
            console.warn('Failed to parse JSON data:', e);
            return fallback;
        }
    }
    return fallback;
};

const analyzeAvailability = (responses) => {
    const availabilityData = {};
    const participantCount = {};

    responses.forEach(response => {
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

    const responsesWithAvailability = responses.filter(r =>
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
                    <Text style={styles.overlapTitle}>📊 Best Times (Most Available)</Text>
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
                        <Icons.Star />
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
                <Text style={styles.sectionHeaderText}>📸 Photos ({validPhotos.length})</Text>
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

// Progress Bar Component
const ProgressBar = ({ percent }) => {
    return (
        <View style={styles.progressBarContainer}>
            <View style={[styles.progressBar, { width: `${percent}%` }]} />
        </View>
    );
};

// Main Component
export default function AIRecommendations({
    activity,
    pinnedActivities,
    setPinnedActivities,
    setPinned,
    setRefreshTrigger,
    isOwner,
    onEdit,
}) {
    const { user, setUser } = useContext(UserContext);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [selectedRec, setSelectedRec] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [showMoveToVotingModal, setShowMoveToVotingModal] = useState(false);

    const { id, responses, activity_location, date_notes, collecting, voting, finalized, selected_pinned_activity_id } = activity;

    // Determine activity type for dynamic text and API calls
    const activityType = activity.activity_type || 'Restaurant';
    const isCocktailsActivity = activityType === 'Cocktails';
    const isGameNightActivity = activityType === 'Game Night';

    // Dynamic text based on activity type
    const getActivityText = () => {
        if (isCocktailsActivity) {
            return {
                submitTitle: 'Submit Your Bar Preferences',
                submitDescription: 'Help us find the perfect bar by sharing your drink preferences and atmosphere needs',
                planningTitle: 'Bar Planning',
                votingTitle: 'Vote on Bars',
                finalizedTitle: 'Activity Finalized',
                preferencesQuiz: 'Take Bar Preferences Quiz',
                resubmitPreferences: 'Resubmit Bar Preferences',
                reasonTitle: 'Why This Bar?',
                apiEndpoint: '/api/openai/bar_recommendations'
            };
        }

        if (isGameNightActivity) {
            return {
                submitTitle: 'Submit Your Game Preferences',
                submitDescription: 'Help us find the perfect games by sharing your game preferences and group dynamics',
                planningTitle: 'Game Night Planning',
                votingTitle: 'Vote on Games',
                finalizedTitle: 'Game Night Finalized',
                preferencesQuiz: 'Take Game Preferences Quiz',
                resubmitPreferences: 'Resubmit Game Preferences',
                reasonTitle: 'Why This Game?',
                apiEndpoint: '/api/openai/game_recommendations'
            };
        }

        return {
            submitTitle: 'Submit Your Preferences',
            submitDescription: 'Help us find the perfect restaurant by sharing your food preferences and dietary needs',
            planningTitle: 'Restaurant Planning',
            votingTitle: 'Vote on Restaurants',
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

    const participantsWithVotes = new Set();
    pinnedActivities.forEach(pin => {
        (pin.voters || []).forEach(voter => {
            participantsWithVotes.add(voter.id);
        });
    });
    const votingRate = (participantsWithVotes.size / totalParticipants) * 100;

    const handleStartChat = () => {
        // TODO: Implement analytics tracking for production
        setShowChat(true);
    };

    const moveToVotingPhase = async () => {
        setLoading(true);
        setError('');

        try {
            const res = await fetch(
                `${API_URL}${activityText.apiEndpoint}`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({
                        responses: responses.map(r => r.notes).join('\n\n'),
                        activity_location,
                        date_notes,
                        activity_id: id,
                    }),
                }
            );

            if (!res.ok) throw new Error('❌ Error fetching recommendations');
            const { recommendations: recs } = await res.json();

            const pinnedActivityPromises = recs.map(rec =>
                fetch(`${API_URL}/activities/${id}/pinned_activities`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({
                        pinned_activity: {
                            title: rec.name,
                            description: rec.description || '',
                            hours: rec.hours || '',
                            price_range: rec.price_range || '',
                            address: rec.address || '',
                            votes: [],
                            voters: [],
                            reason: rec.reason || '',
                            website: rec.website || '',
                        },
                    }),
                })
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
                    fetch(`${API_URL}/activities/${id}/time_slots`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${user?.token}`,
                        },
                        body: JSON.stringify({
                            date: slot.date,
                            time: slot.time
                        }),
                    })
                );
            }

            const [pinnedActivityResults, pinnedTimeSlotResults] = await Promise.all([
                Promise.all(pinnedActivityPromises),
                Promise.all(pinnedTimeSlotPromises)
            ]);

            const newPinnedActivities = await Promise.all(
                pinnedActivityResults.map(res => res.json())
            );

            const newTimeSlots = await Promise.all(
                pinnedTimeSlotResults.map(res => res.json())
            );

            await fetch(`${API_URL}/activities/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`,
                },
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
                            ? { ...act, collecting: false, voting: true }
                            : act
                    )
                }));
            }

            setPinnedActivities(newPinnedActivities);
            setPinned(newTimeSlots);
            setRefreshTrigger(f => !f);

        } catch (err) {
            setError(err.message);
            Alert.alert('Error', err.message);
        } finally {
            setLoading(false);
            setShowMoveToVotingModal(false);
        }
    };

    const handleLike = async (pin) => {
        if (!user) return;

        const hasLiked = (pin.voters || []).some(v => v.id === user.id);

        try {
            if (hasLiked) {
                const vote = (pin.votes || []).find(v => v.user_id === user.id);
                if (!vote) return;

                const response = await fetch(`${API_URL}/pinned_activities/${pin.id}/votes/${vote.id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`,
                    },
                });

                const data = await response.json();
                if (data.success) {
                    setPinnedActivities(prev =>
                        prev.map(a =>
                            a.id === pin.id
                                ? { ...a, votes: data.votes, voters: data.voters }
                                : a
                        )
                    );
                    setRefreshTrigger(f => !f);
                }
            } else {
                const response = await fetch(`${API_URL}/pinned_activities/${pin.id}/votes`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${user?.token}`,
                    },
                });

                const data = await response.json();
                if (data.success) {
                    setPinnedActivities(prev =>
                        prev.map(a =>
                            a.id === pin.id
                                ? { ...a, votes: data.votes, voters: data.voters }
                                : a
                        )
                    );
                    setRefreshTrigger(f => !f);
                }
            }
        } catch (error) {
            console.error('Error voting:', error);
            Alert.alert('Error', 'Failed to vote. Please try again.');
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

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#667eea" />
                <Text style={styles.loadingText}>Generating recommendations...</Text>
            </View>
        );
    }

    // COLLECTING PHASE
    if (collecting && !voting) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.heading}>{activityText.submitTitle}</Text>
                </View>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.phaseIndicator}>
                    <View style={styles.phaseContent}>
                        <Icons.HelpCircle />
                        <Text style={styles.phaseTitle}>Group Status</Text>
                    </View>

                    <Text style={styles.phaseSubtitle}>
                        {responses.length}/{totalParticipants} participants have submitted
                        {activity.allow_participant_time_selection && ' preferences & availability'}
                    </Text>

                    {isOwner && (
                        <TouchableOpacity
                            style={styles.phaseActionButton}
                            onPress={() => setShowMoveToVotingModal(true)}
                        >
                            <Icons.Vote />
                            <Text style={styles.phaseActionButtonText}>Move to Voting</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ProgressBar percent={responseRate} />

                <AvailabilityDisplay responses={responses} activity={activity} />

                {user && !currentUserResponse ? (
                    <View style={styles.preferencesCard}>
                        <Icons.BookHeart />
                        <Text style={styles.preferencesTitle}>Submit Your Preferences!</Text>
                        <Text style={styles.preferencesText}>
                            {activityText.submitDescription}
                            {activity.allow_participant_time_selection && ' and your availability'}.
                        </Text>
                        <TouchableOpacity style={styles.preferencesButton} onPress={handleStartChat}>
                            <Icons.HelpCircle />
                            <Text style={styles.preferencesButtonText}>
                                {activity.allow_participant_time_selection ? `${activityText.preferencesQuiz} & Availability` : activityText.preferencesQuiz}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : user && currentUserResponse ? (
                    <View style={styles.submittedCard}>
                        <Icons.CheckCircle />
                        <Text style={styles.submittedTitle}>Thank you for submitting your response!</Text>
                        <Text style={styles.submittedText}>
                            The organizer will gather recommendations shortly. You can resubmit your preferences
                            {activity.allow_participant_time_selection && ' and availability'} if you'd like to make changes.
                        </Text>
                        <TouchableOpacity style={styles.resubmitButton} onPress={handleStartChat}>
                            <Icons.HelpCircle />
                            <Text style={styles.resubmitButtonText}>
                                {activity.allow_participant_time_selection ? `${activityText.resubmitPreferences} & Availability` : activityText.resubmitPreferences}
                            </Text>
                        </TouchableOpacity>
                    </View>
                ) : null}

                {/* Move to Voting Modal */}
                <Modal
                    visible={showMoveToVotingModal}
                    transparent
                    animationType="slide"
                    onRequestClose={() => setShowMoveToVotingModal(false)}
                >
                    <SafeAreaView style={styles.modalOverlay}>
                        <View style={styles.votingModalContainer}>
                            <TouchableOpacity
                                style={styles.votingModalCloseButton}
                                onPress={() => setShowMoveToVotingModal(false)}
                            >
                                <Icons.X />
                            </TouchableOpacity>

                            <View style={styles.votingModalContent}>
                                <Text style={styles.votingModalTitle}>Move to voting phase?</Text>
                                <Text style={styles.votingModalDescription}>
                                    Generate recommendations and start group voting
                                </Text>

                                <View style={styles.votingModalProgressSection}>
                                    <ProgressBar percent={responseRate} />
                                    <View style={styles.progressInfo}>
                                        <View style={styles.progressLeft}>
                                            <Icons.Users />
                                            <Text style={styles.progressText}>{responses.length}/{totalParticipants} users submitted</Text>
                                        </View>
                                        <Text style={styles.progressPercentage}>{Math.round(responseRate)}%</Text>
                                    </View>
                                </View>

                                {responseRate < 50 && (
                                    <View style={styles.warningBox}>
                                        <Text style={styles.warningText}>
                                            ⚠️ Less than 50% of participants have submitted their preferences. Consider waiting for more responses to get better recommendations.
                                        </Text>
                                    </View>
                                )}

                                <TouchableOpacity style={styles.votingModalButton} onPress={moveToVotingPhase}>
                                    <Icons.Zap />
                                    <Text style={styles.votingModalButtonText}>Generate Recommendations</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </SafeAreaView>
                </Modal>
            </ScrollView>
        );
    }

    // VOTING PHASE
    if (voting && !collecting && !finalized) {
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.heading}>{activityText.votingTitle}</Text>
                </View>

                <View style={styles.phaseIndicator}>
                    <View style={styles.phaseContent}>
                        <Icons.Vote />
                        <Text style={styles.phaseTitle}>Voting Phase</Text>
                    </View>

                    <Text style={styles.phaseSubtitle}>
                        {participantsWithVotes.size}/{totalParticipants} participants have voted. After everyone has voted, your organizer can finalize the activity plans. ✨
                    </Text>

                    {isOwner && (
                        <TouchableOpacity style={styles.phaseActionButton} onPress={onEdit}>
                            <Icons.Flag />
                            <Text style={styles.phaseActionButtonText}>Finalize Activity</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <ProgressBar percent={votingRate} />

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.recommendationsList}>
                    {[...pinnedActivities]
                        .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
                        .map((p) => (
                            <View key={p.id} style={styles.listItem}>
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
                                        <View style={styles.voteSection}>
                                            {user && (
                                                <TouchableOpacity
                                                    style={[
                                                        styles.likeButton,
                                                        (p.voters || []).some(v => v.id === user.id) && styles.likedButton
                                                    ]}
                                                    onPress={() => handleLike(p)}
                                                >
                                                    <Text style={styles.likeButtonText}>
                                                        {(p.voters || []).some(v => v.id === user.id) ? '❤️' : '🤍'} {(p.votes || []).length}
                                                    </Text>
                                                </TouchableOpacity>
                                            )}
                                            {!user && (
                                                <Text style={styles.voteCount}>❤️ {(p.votes || []).length}</Text>
                                            )}
                                        </View>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        ))}
                </View>

                {/* Detail Modal */}
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
        return (
            <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
                <View style={styles.header}>
                    <Text style={styles.heading}>{activityText.finalizedTitle}</Text>
                </View>

                <TouchableOpacity style={styles.phaseIndicator} onPress={sharePlanUrlClick}>
                    <View style={styles.phaseContent}>
                        <Icons.Share />
                        <Text style={styles.phaseTitle}>Share Finalized Activity Link!</Text>
                    </View>

                    <Text style={styles.phaseSubtitle}>Click here to view & share finalized activity.</Text>
                </TouchableOpacity>

                {error ? <Text style={styles.errorText}>{error}</Text> : null}

                <View style={styles.recommendationsList}>
                    {[...pinnedActivities]
                        .sort((a, b) => (b.votes?.length || 0) - (a.votes?.length || 0))
                        .map((p) => {
                            const isSelected = p.id === selected_pinned_activity_id;
                            return (
                                <View key={p.id} style={[styles.listItem, isSelected && styles.selectedListItem]}>
                                    {isSelected && (
                                        <View style={styles.selectedBadge}>
                                            <Icons.CheckCircle />
                                            <Text style={styles.selectedBadgeText}>SELECTED</Text>
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
                                            <Text style={styles.voteCount}>❤️ {(p.votes || []).length}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </View>
                            );
                        })}
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

    // Default fallback
    return (
        <View style={styles.container}>
            <Text style={styles.heading}>{activityText.planningTitle}</Text>
            <Text style={styles.fallbackText}>Activity is not in collecting or voting phase.</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    // Icon text style for emoji icons
    iconText: {
        fontSize: 16,
        color: '#667eea',
    },
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    contentContainer: {
        paddingBottom: 20,
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
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
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
        flexDirection: 'column', // Changed from row to column for stacked layout
        alignItems: 'center', // Center everything
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderRadius: 16,
        padding: 20,
        margin: 16,
    },
    phaseContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12, // Add space below title section
    },
    phaseTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    phaseSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center', // Center the description
        marginBottom: 16, // Add space below description
        lineHeight: 20,
    },
    phaseActionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#667eea',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        width: '100%', // Full width button
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
        backgroundColor: '#667eea',
        borderRadius: 3,
    },
    availabilitySection: {
        margin: 16,
        padding: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        minWidth: 120,
        marginBottom: 8,
    },
    dateHeader: {
        color: '#667eea',
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
        color: '#667eea',
        fontSize: 11,
    },
    overlapAnalysis: {
        marginTop: 16,
        paddingTop: 16,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        borderTopWidth: 1,
    },
    overlapTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 24,
        margin: 16,
        alignItems: 'center',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
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
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    preferencesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#667eea',
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
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
        borderRadius: 16,
        padding: 24,
        margin: 16,
        alignItems: 'center',
        borderColor: 'rgba(40, 167, 69, 0.3)',
        borderWidth: 1,
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
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
        marginBottom: 20,
    },
    resubmitButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'transparent',
        borderColor: '#667eea',
        borderWidth: 1,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
    },
    resubmitButtonText: {
        color: '#667eea',
        fontWeight: '600',
        marginLeft: 8,
    },
    recommendationsList: {
        margin: 16,
    },
    listItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        marginBottom: 12,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        marginBottom: 2,
    },
    voteSection: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    likeButton: {
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
    },
    voteCount: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '600',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    // New voting modal styles
    votingModalContainer: {
        backgroundColor: '#2C1E33',
        borderRadius: 20,
        width: '100%',
        maxWidth: 400,
        padding: 0,
        overflow: 'hidden',
    },
    votingModalCloseButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 15,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 20,
        zIndex: 10,
    },
    votingModalContent: {
        padding: 30,
        alignItems: 'center',
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
        backgroundColor: '#667eea',
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
    // Old modal styles (keeping for compatibility)
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
        color: '#667eea',
        fontSize: 14,
        fontWeight: '600',
    },
    warningBox: {
        backgroundColor: 'rgba(255, 193, 7, 0.1)',
        borderColor: 'rgba(255, 193, 7, 0.3)',
        borderWidth: 1,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        width: '100%',
    },
    warningText: {
        color: '#ffc107',
        fontSize: 13,
        textAlign: 'center',
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
        paddingRight: 40, // Give space for the close button
    },
    detailCloseButton: {
        position: 'absolute',
        top: 10, // Back to normal position since we're using SafeAreaView
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
        color: 'rgba(255, 255, 255, 0.8)',
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
        color: '#667eea',
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
        color: '#667eea',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 8,
    },
    reasonText: {
        color: 'rgba(255, 255, 255, 0.8)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
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
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 13,
        lineHeight: 18,
    },
    reviewToggleButton: {
        color: '#667eea',
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
    fallbackText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        margin: 20,
    },
});