import React, { useState, useEffect, useContext, useRef } from 'react'
import {
    View,
    Text,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Modal,
    Animated,
    Alert,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
    AppState,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native'
import { X } from 'react-native-feather'
import ActivityHeader, { ActivityStickyHeader } from '../components/ActivityHeader'
import ParticipantsSection from '../components/ParticipantsSection'
import AIRecommendations from '../components/AIRecommendations'
import CommentsSection from '../components/CommentsSection'
import UpdateDetailsModal from '../components/UpdateDetailsModal'
import FinalizeActivityModal from '../components/FinalizeActivityModal'
import ReportModal from '../components/ReportModal'
import SoloActivityDecision from '../components/SoloActivityDecision'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const adventures = [
    {
        name: 'Restaurant',
        emoji: '🍜',
        active: true,
        description: 'Find the perfect restaurant for your group.'
    },
    {
        name: 'Bar',
        emoji: '🍸',
        active: true,
        description: 'Discover great bars and lounges.'
    },
    {
        name: 'Brunch',
        emoji: '☕',
        active: true,
        description: 'Find the best brunch spots.'
    },
    {
        name: 'Lets Meet',
        emoji: '⏰',
        active: true,
        description: 'Find a time that works for everyone.'
    },
    {
        name: 'Find a Destination',
        emoji: '🗺️',
        active: false,
        description: 'Discover new travel destinations.'
    },
    {
        name: 'Movie Night',
        emoji: '🎥',
        active: false,
        description: 'Plan your perfect movie night.'
    },
    {
        name: 'Kids Play Date',
        emoji: '👩‍👧‍👦',
        active: false,
        description: 'Coordinate a fun playdate for little ones.'
    },
    {
        name: 'Family Reunion',
        emoji: '👨‍👩‍👧‍👦',
        active: false,
        description: 'Plan a family gathering.'
    },
]

// Helper function to get activity details
const getActivityDetails = (activityType) => {
    return adventures.find(adventure => adventure.name === activityType) ||
        { emoji: '🎉', description: 'Join this exciting activity!' };
}

export default function ActivityDetailsScreen({ route }) {
    const { activityId, forceRefresh } = route?.params || {}
    const { user, setUser, refreshUser } = useContext(UserContext)
    const navigation = useNavigation()


    // State
    const [currentActivity, setCurrentActivity] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [showReportModal, setShowReportModal] = useState(false)
    const [showFinalizeModal, setShowFinalizeModal] = useState(false)
    const [pinnedActivities, setPinnedActivities] = useState([])
    const [isUpdating, setIsUpdating] = useState(false)
    const [lastRefreshTime, setLastRefreshTime] = useState(Date.now())
    const [showSoloResponseModal, setShowSoloResponseModal] = useState(false)
    
    // Refs
    const scrollViewRef = useRef(null)
    const [pinned, setPinned] = useState([])
    const [loadingPinned, setLoadingPinned] = useState(false)
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)
    const pollingRef = useRef(null)
    const hasAutoShownInviteModal = useRef(false)

    // State for controlling invite modal from parent
    const [showInviteModal, setShowInviteModal] = useState(false)

    // Token - match ProfileScreen pattern exactly
    const token = user?.token

    logger.debug('💬 User in ActivityDetailsScreen:', user?.id)
    logger.debug('💬 Token in ActivityDetailsScreen:', !!token)
    logger.debug('💬 Activity ID:', activityId)

    // Early return if no activityId
    if (!activityId) {
        return (
            <View style={styles.safe}>
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Missing activity ID</Text>
                    </View>
                </View>
            </View>
        )
    }

    // Find the activity from user context
    const pendingInvite = user?.participant_activities?.find(
        p => p.activity.id === activityId && !p.accepted
    )


    useEffect(() => {
        // Find current activity from user context
        const activity =
            user?.activities?.find(act => act.id === activityId) ||
            user?.participant_activities?.find(p => p.activity.id === activityId)?.activity

        // Validate that we have a proper activity object, not a user object
        const isValidActivity = activity && (
            activity.activity_type !== undefined ||
            activity.participants !== undefined ||
            activity.responses !== undefined ||
            activity.user_id !== undefined
        ) && !activity.email // User objects have email, activities don't

        if (activity && isValidActivity) {
            setCurrentActivity(activity)
            
            logger.debug(`🔍 Activity state - Type: ${activity.activity_type}, Voting: ${activity.voting}, Finalized: ${activity.finalized}`)
            logger.debug(`🔍 Pinned activities in context: ${activity.pinned_activities?.length || 0}`)

            // Fetch pinned activities for restaurant/bar types that use them (including legacy types)
            // Only fetch if activity is in voting phase or has pinned activities (not during preference collection phase)
            if (['Restaurant', 'Cocktails', 'Brunch', 'Game Night'].includes(activity.activity_type) && (activity.voting || activity.finalized)) {
                logger.debug(`🍽️ Fetching pinned activities for activity ${activityId} (voting: ${activity.voting}, finalized: ${activity.finalized})`)
                
                if (!token) {
                    logger.error('❌ No token available for fetching pinned activities')
                    return
                }
                
                setLoadingPinned(true)
                
                const fetchPinnedActivities = async () => {
                    try {
                        const data = await safeAuthApiCall(
                            `${API_URL}/activities/${activityId}/pinned_activities`,
                            token,
                            { method: 'GET' }
                        )
                        
                        logger.debug('✅ Pinned activities fetched successfully:', data?.length || 0)
                        setPinnedActivities(data || [])
                    } catch (err) {
                        logger.error('❌ Error fetching pinned activities:', err)
                        logger.debug(`🔍 Activity details - ID: ${activityId}, Type: ${activity.activity_type}, Finalized: ${activity.finalized}`)
                        
                        // Only show error for non-finalized activities since finalized might not have pinned activities to fetch
                        if (!activity.finalized) {
                            logger.debug('📱 Showing error alert for non-finalized activity')
                            const userMessage = handleApiError(err, 'Unable to load recommendations. Please check your connection and try again.');
                            Alert.alert('Network Error', userMessage, [{ text: 'OK' }])
                        } else {
                            logger.debug('🤐 Suppressing error alert for finalized activity')
                        }
                    } finally {
                        setLoadingPinned(false)
                    }
                }
                
                fetchPinnedActivities()
            } else if (['Restaurant', 'Cocktails', 'Brunch', 'Game Night'].includes(activity.activity_type)) {
                logger.debug(`⏸️ Skipping pinned activities fetch for activity ${activityId} - recommendations not yet generated`)
                // Use context data as fallback only if we're not fetching from API
                if (activity.pinned_activities && activity.pinned_activities.length > 0) {
                    logger.debug('📌 Using pinned activities from context data as fallback')
                    setPinnedActivities(activity.pinned_activities)
                }
            }

            // Fetch time slots for meetings
            if (activity.activity_type === 'Meeting') {
                logger.debug(`🕐 Fetching time slots for activity ${activityId}`)
                setLoadingTimeSlots(true)
                
                const fetchTimeSlots = async () => {
                    try {
                        const data = await safeAuthApiCall(
                            `${API_URL}/activities/${activityId}/time_slots`,
                            token,
                            { method: 'GET' }
                        )
                        
                        logger.debug('✅ Time slots fetched successfully:', data?.length || 0)
                        setPinned(data || [])
                    } catch (err) {
                        logger.error('❌ Error fetching time slots:', err)
                        const userMessage = handleApiError(err, 'Unable to load meeting time slots. Please check your connection and try again.');
                        Alert.alert('Network Error', userMessage, [{ text: 'OK' }])
                    } finally {
                        setLoadingTimeSlots(false)
                    }
                }
                
                fetchTimeSlots()
            }
        } else if (activity && !isValidActivity) {
            // Log error and navigate back if we got bad data
            logger.error('❌ Invalid activity data detected - got user object instead of activity');
            logger.debug('Invalid object keys:', Object.keys(activity));
            Alert.alert(
                'Data Error',
                'There was an issue loading this activity. Please try again.',
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        }
    }, [user, activityId, refreshTrigger, token])

    // Handle forceRefresh from notification navigation
    useEffect(() => {
        if (forceRefresh) {
            logger.debug('🔄 Force refreshing from notification tap');
            // Refresh user context to get latest data
            if (refreshUser) {
                refreshUser();
            }
            setRefreshTrigger(prev => !prev);
        }
    }, [forceRefresh, refreshUser]);

    // Auto-show invite modal for group activities with no participants
    useEffect(() => {
        // Only run this once per screen load
        if (hasAutoShownInviteModal.current) {
            return;
        }

        // Check if we have a valid activity
        if (!currentActivity) {
            return;
        }

        // Only for group activities (not solo)
        if (currentActivity.is_solo) {
            logger.debug('⏭️ Skipping auto-invite modal - activity is solo');
            return;
        }

        // Only for owners
        if (!isOwner) {
            logger.debug('⏭️ Skipping auto-invite modal - user is not owner');
            return;
        }

        // Don't show during voting or finalized phases
        if (currentActivity.voting || currentActivity.finalized || currentActivity.completed) {
            logger.debug('⏭️ Skipping auto-invite modal - activity is in voting/finalized/completed phase');
            return;
        }

        // Check if there are any participants or pending invites
        const participantsArray = Array.isArray(currentActivity.participants) ? currentActivity.participants : [];
        const pendingInvitesArray = Array.isArray(currentActivity.activity_participants)
            ? currentActivity.activity_participants.filter(p => !p.accepted)
            : [];

        const hasNoInvitedUsers = participantsArray.length === 0 && pendingInvitesArray.length === 0;

        if (hasNoInvitedUsers) {
            logger.debug('🎉 Auto-showing invite modal - group activity with no participants');
            // Small delay to ensure the screen is fully loaded
            setTimeout(() => {
                setShowInviteModal(true);
                hasAutoShownInviteModal.current = true;
            }, 500);
        } else {
            logger.debug('✅ Not showing auto-invite modal - activity already has participants or pending invites');
        }
    }, [currentActivity, isOwner]);

    // Set up polling for real-time updates
    useEffect(() => {
        // Only poll if we have an activity and user is logged in
        if (!currentActivity || !user?.token) {
            return;
        }

        // Function to fetch latest activity data
        const fetchLatestActivity = async () => {
            try {
                // Don't fetch if modal is open or user is typing
                if (showUpdateModal || showFinalizeModal || showReportModal) {
                    return;
                }
                
                // Don't poll when in voting phase (map view) to prevent map glitches
                if (currentActivity?.voting) {
                    logger.debug('📊 Skipping poll in voting phase to prevent map re-renders');
                    return;
                }

                const data = await safeAuthApiCall(
                    `${API_URL}/activities/${activityId}`,
                    user.token,
                    { method: 'GET' }
                );

                if (data) {
                    // Create deep copies and remove fields that shouldn't trigger re-renders
                    const oldData = JSON.parse(JSON.stringify(currentActivity || {}));
                    const newData = JSON.parse(JSON.stringify(data));
                    
                    // Remove volatile fields that change frequently but don't affect UI
                    delete oldData.updated_at;
                    delete newData.updated_at;
                    delete oldData.last_seen;
                    delete newData.last_seen;
                    
                    // Check if there are actual meaningful changes
                    const hasChanges = JSON.stringify(newData) !== JSON.stringify(oldData);
                    
                    if (hasChanges) {
                        logger.debug('📊 Activity data changed, updating...');
                        
                        // Update the activity in user context
                        setUser(prevUser => {
                            if (!prevUser) return prevUser;
                            
                            const updatedActivities = (prevUser.activities || []).map(act => 
                                act.id === data.id ? data : act
                            );
                            
                            const updatedParticipantActivities = (prevUser.participant_activities || []).map(p => 
                                p.activity.id === data.id 
                                    ? { ...p, activity: data }
                                    : p
                            );
                            
                            return {
                                ...prevUser,
                                activities: updatedActivities,
                                participant_activities: updatedParticipantActivities
                            };
                        });
                        
                        setCurrentActivity(data);
                        setLastRefreshTime(Date.now());
                    }
                }
            } catch (error) {
                // Silent fail for polling - don't interrupt user
                // Only log if it's not a timeout error (these are expected sometimes)
                if (!error.message.includes('timeout')) {
                    logger.debug('Polling error (silent):', error.message);
                }
            }
        };

        // Handle app state changes
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active') {
                logger.debug('📦 App became active - resuming activity polling');
                // Fetch immediately when returning to app
                fetchLatestActivity();
                
                // Restart polling if not already running
                if (!pollingRef.current) {
                    // Check finalized state from latest fetch
                    fetchLatestActivity().then(() => {
                        const pollInterval = 5000; // Use fixed 5s interval for simplicity
                        pollingRef.current = setInterval(fetchLatestActivity, pollInterval);
                    });
                }
            } else {
                logger.debug('📦 App went to background - pausing activity polling');
                // Stop polling when app goes to background
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        };

        // Subscribe to app state changes
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        // Start polling if app is active
        if (AppState.currentState === 'active') {
            logger.debug('🔄 Setting up activity polling for activity:', activityId);
            // Fetch immediately on mount
            fetchLatestActivity();
            
            // Start polling with fixed interval
            const pollInterval = 5000; // Use fixed 5s interval
            pollingRef.current = setInterval(fetchLatestActivity, pollInterval);
        }

        // Cleanup on unmount or when dependencies change
        return () => {
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            appStateSubscription?.remove();
        };
    }, [activityId, user?.token]); // Only depend on essential values, not modal states


    const handleAcceptInvite = async () => {
        if (!pendingInvite || !token) return

        try {
            const updatedActivity = await safeAuthApiCall(
                `${API_URL}/activity_participants/accept`,
                token,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        email: user.email,
                        activity_id: activityId
                    }),
                }
            )

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.map(p =>
                    p.activity.id === updatedActivity.id
                        ? { ...p, accepted: true, activity: updatedActivity }
                        : p
                ),
                activities: prevUser.activities.map(activity =>
                    activity.id === updatedActivity.id
                        ? updatedActivity
                        : activity
                ),
            }))

            Alert.alert('Success', 'Welcome to the board!')
            setRefreshTrigger(prev => !prev)
        } catch (error) {
            logger.error('Error accepting invite:', error)
            const userMessage = handleApiError(error, 'Failed to accept invite.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleDeclineInvite = async () => {
        if (!pendingInvite || !token) return

        try {
            await safeAuthApiCall(
                `${API_URL}/activity_participants/decline`,
                token,
                {
                    method: 'DELETE',
                    body: JSON.stringify({
                        email: user.email,
                        activity_id: activityId
                    }),
                }
            )

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.filter(
                    p => p.activity.id !== activityId
                ),
            }))
            Alert.alert(
                'Success', 
                'Invite declined.',
                [
                    { 
                        text: 'OK', 
                        onPress: () => navigation.goBack()
                    }
                ]
            )
        } catch (error) {
            logger.error('Error declining invite:', error)
            const userMessage = handleApiError(error, 'Failed to decline invite.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleBack = () => {
        navigation.goBack()
    }

    const handleDelete = (id) => {
        Alert.alert(
            'Delete Activity',
            'Are you sure you want to delete this activity? This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => performDelete(id)
                }
            ]
        )
    }

    const performDelete = async (id) => {
        if (!token) return

        try {
            await safeAuthApiCall(
                `${API_URL}/activities/${id}`,
                token,
                { method: 'DELETE' }
            )

            logger.debug(`Activity with ID ${id} deleted successfully`)

            setUser(prevUser => ({
                ...prevUser,
                activities: prevUser.activities.filter(
                    activity => activity.id !== id
                ),
                // Also remove any user_activities (favorites) that reference this deleted activity
                user_activities: prevUser.user_activities?.filter(
                    ua => ua.activity_id !== id && ua.pinned_activity?.activity_id !== id
                ) || []
            }))

            Alert.alert(
                'Success', 
                'Activity deleted successfully.',
                [
                    { 
                        text: 'OK', 
                        onPress: () => navigation.goBack()
                    }
                ]
            )
        } catch (error) {
            logger.error('Error deleting activity:', error)
            const userMessage = handleApiError(error, 'Failed to delete activity.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleReportActivity = () => {
        setShowReportModal(true);
    };

    const handleReportSubmitted = () => {
        // Optional: show a success message or refresh
        logger.debug('Activity report submitted');
    };

    const handleLeaveActivity = async () => {
        Alert.alert(
            'Leave Activity',
            'Are you sure you want to leave this activity? This action is permanent and you cannot rejoin unless invited again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: performLeave
                }
            ]
        )
    }

    const performLeave = async () => {
        if (!user?.token) return

        try {
            await safeAuthApiCall(
                `${API_URL}/activity_participants/leave`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({ activity_id: activityId }),
                }
            )

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.filter(
                    p => p.activity.id !== activityId
                ),
            }))

            Alert.alert(
                'Success', 
                'You have successfully left the activity.',
                [
                    { 
                        text: 'OK', 
                        onPress: () => navigation.goBack()
                    }
                ]
            )
        } catch (error) {
            logger.error('Error leaving activity:', error)
            const userMessage = handleApiError(error, 'Failed to leave activity.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleInvite = async (email) => {
        if (!email) return

        const normalizedEmail = email.trim().toLowerCase()
        const participants = currentActivity.participants || []
        const pendingInvites = currentActivity.activity_participants || []

        const isDuplicate =
            participants.some(p => p?.email?.toLowerCase() === normalizedEmail) ||
            pendingInvites.some(p => p?.invited_email?.toLowerCase() === normalizedEmail)

        if (isDuplicate) {
            Alert.alert('Duplicate Email', 'This email is already invited or is a participant.')
            return
        }

        try {
            await safeAuthApiCall(
                `${API_URL}/activity_participants/invite`,
                token,
                {
                    method: 'POST',
                    body: JSON.stringify({ email: email, activity_id: currentActivity.id }),
                }
            )

            const newParticipant = {
                invited_email: normalizedEmail,
                name: 'Invite Pending',
                confirmed: false
            }

            setUser(prevUser => ({
                ...prevUser,
                activities: prevUser.activities.map(act =>
                    act.id === currentActivity.id
                        ? {
                            ...act,
                            participants: newParticipant.user_id
                                ? [...(act.participants || []), { id: newParticipant.user_id, name: newParticipant.invited_email }]
                                : act.participants,
                            activity_participants: [...(act.activity_participants || []), newParticipant],
                        }
                        : act
                ),
            }))

            setRefreshTrigger(prev => !prev)
        } catch (error) {
            logger.error('Error sending invite:', error)
            const userMessage = handleApiError(error, 'Failed to send invitation.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleRemoveParticipant = async (participant) => {
        try {
            const url = new URL(`${API_URL}/activity_participants/remove`)
            url.searchParams.set('activity_id', currentActivity.id)
            url.searchParams.set('email', participant.email)

            await safeAuthApiCall(
                url.toString(),
                token,
                { method: 'DELETE' }
            )

            Alert.alert('Success', 'Participant successfully removed!')

            setUser(prev => ({
                ...prev,
                activities: (prev.activities || []).map(a => {
                    if (a.id !== currentActivity.id) return a
                    return {
                        ...a,
                        participants: (a.participants || []).filter(p => p.email !== participant.email),
                        activity_participants: (a.activity_participants || [])
                            .filter(ap => ap.invited_email !== participant.email),
                    }
                })
            }))

            setCurrentActivity(prev => ({
                ...prev,
                participants: (prev.participants || []).filter(p => p.email !== participant.email),
                activity_participants: (prev.activity_participants || [])
                    .filter(ap => ap.invited_email !== participant.email),
            }))

            setRefreshTrigger(prev => !prev)
        } catch (error) {
            logger.error('Error removing participant:', error)
            const userMessage = handleApiError(error, 'Remove failed.');
            Alert.alert('Error', userMessage)
        }
    }

    const handleFinalize = () => {
        setShowFinalizeModal(true)
    }

    const handleSoloComplete = async () => {
        // Mark solo activity as completed
        if (!token || !currentActivity) return;

        try {
            setIsUpdating(true);

            // Update activity to completed state
            const updatedActivity = await safeAuthApiCall(
                `${API_URL}/activities/${currentActivity.id}`,
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        completed: true
                    }),
                }
            );

            // Update user context
            setUser(prevUser => ({
                ...prevUser,
                activities: prevUser.activities.map(act =>
                    act.id === updatedActivity.id ? updatedActivity : act
                ),
                participant_activities: prevUser.participant_activities.map(p =>
                    p.activity.id === updatedActivity.id
                        ? { ...p, activity: updatedActivity }
                        : p
                ),
            }));

            setCurrentActivity(updatedActivity);
            setRefreshTrigger(prev => !prev);

            Alert.alert(
                'Activity Completed!',
                'Your activity has been marked as completed. You can view your saved favorites anytime in your Favorites tab.',
                [{ text: 'OK' }]
            );
        } catch (error) {
            logger.error('Error completing solo activity:', error);
            const userMessage = handleApiError(error, 'Failed to complete activity.');
            Alert.alert('Error', userMessage);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleFinalizeSuccess = (finalizedActivity) => {
        // Update the activity in user context
        setUser(prevUser => ({
            ...prevUser,
            activities: prevUser.activities.map(act =>
                act.id === finalizedActivity.id ? finalizedActivity : act
            ),
            participant_activities: prevUser.participant_activities.map(p =>
                p.activity.id === finalizedActivity.id
                    ? { ...p, activity: finalizedActivity }
                    : p
            ),
        }))

        setCurrentActivity(finalizedActivity)
        setRefreshTrigger(prev => !prev)
        setShowFinalizeModal(false)
    }

    const handleSoloResponseModalOpen = () => {
        setShowSoloResponseModal(true)
    }

    const handleSoloRecommendationsGenerated = (newPinnedActivities) => {
        // Update the activity in user context to voting phase
        setUser(prevUser => ({
            ...prevUser,
            activities: prevUser.activities.map(act =>
                act.id === currentActivity.id
                    ? { ...act, collecting: false, voting: true, pinned_activities: newPinnedActivities }
                    : act
            ),
            participant_activities: prevUser.participant_activities.map(p =>
                p.activity.id === currentActivity.id
                    ? { ...p, activity: { ...p.activity, collecting: false, voting: true, pinned_activities: newPinnedActivities } }
                    : p
            ),
        }))

        setPinnedActivities(newPinnedActivities)
        setRefreshTrigger(prev => !prev)

        // Refresh user data to ensure everything is in sync
        if (refreshUser) {
            setTimeout(() => refreshUser(), 1000)
        }
    }

    const handleSoloResponseComplete = async () => {
        setShowSoloResponseModal(false)

        // After response is submitted, automatically generate recommendations
        setIsUpdating(true)

        try {
            // Refresh to get the latest activity with the response
            if (refreshUser) {
                await refreshUser()
            }

            // Fetch the updated activity
            const updatedActivity = await safeAuthApiCall(
                `${API_URL}/activities/${activityId}`,
                token,
                { method: 'GET' }
            )

            // Now generate recommendations using the SoloActivityDecision component's logic
            // We'll set a flag to trigger automatic generation
            setCurrentActivity(updatedActivity)

            // Generate recommendations
            await generateSoloRecommendations(updatedActivity)

        } catch (error) {
            logger.error('Error in solo response completion flow:', error)
            const userMessage = handleApiError(error, 'Failed to complete response submission.')
            Alert.alert('Error', userMessage)
        } finally {
            setIsUpdating(false)
        }
    }

    const generateSoloRecommendations = async (activity) => {
        try {
            // Determine the API endpoint based on activity type
            let apiEndpoint
            switch (activity.activity_type) {
                case 'Restaurant':
                case 'Brunch':
                case 'Game Night':
                    apiEndpoint = '/api/openai/restaurant_recommendations'
                    break
                case 'Bar':
                case 'Cocktails':
                    apiEndpoint = '/api/openai/bar_recommendations'
                    break
                case 'Meeting':
                    // Meeting doesn't generate venue recommendations
                    throw new Error('Meeting activities do not generate venue recommendations')
                default:
                    apiEndpoint = '/api/openai/restaurant_recommendations'
            }

            const responses = activity.responses || []
            const responsesText = responses.map(r => r.notes).join('\n\n')

            logger.debug('📍 Activity location:', activity.activity_location)
            logger.debug('📝 Responses count:', responses.length)
            logger.debug('📝 Responses text:', responsesText)

            // Validate required parameters
            if (!activity.activity_location) {
                throw new Error('Activity location is required to generate recommendations')
            }

            if (responses.length === 0 || !responsesText.trim()) {
                throw new Error('At least one response is required to generate recommendations')
            }

            // Generate recommendations
            const recommendationsResponse = await safeAuthApiCall(
                `${API_URL}${apiEndpoint}`,
                token,
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
            )

            if (!recommendationsResponse || !recommendationsResponse.recommendations || !Array.isArray(recommendationsResponse.recommendations)) {
                throw new Error('Invalid response format from recommendations API')
            }

            const recs = recommendationsResponse.recommendations

            if (recs.length === 0) {
                throw new Error('No recommendations were generated. Please try again.')
            }

            // Create pinned activities from recommendations
            const pinnedActivityPromises = recs.map(rec =>
                safeAuthApiCall(
                    `${API_URL}/activities/${activity.id}/pinned_activities`,
                    token,
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
            )

            const newPinnedActivities = await Promise.all(pinnedActivityPromises)

            // Update activity to voting phase
            await safeAuthApiCall(
                `${API_URL}/activities/${activity.id}`,
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({
                        collecting: false,
                        voting: true
                    }),
                }
            )

            logger.debug('✅ Recommendations generated successfully for solo activity')

            // Update state
            handleSoloRecommendationsGenerated(newPinnedActivities)

        } catch (error) {
            logger.error('❌ Error generating solo recommendations:', error)
            const userMessage = handleApiError(error, 'Failed to generate recommendations.')
            Alert.alert('Error', userMessage)
            throw error
        }
    }

    // Helper function to render appropriate response form based on activity type
    const renderResponseForm = () => {
        const CuisineResponseForm = require('../components/CuisineResponseForm').default;
        const NightOutResponseForm = require('../components/NightOutResponseForm').default;
        const LetsMeetScheduler = require('../components/LetsMeetScheduler').default;

        switch (currentActivity.activity_type) {
            case 'Bar':
            case 'Cocktails':
                return (
                    <NightOutResponseForm
                        visible={showSoloResponseModal}
                        onClose={() => setShowSoloResponseModal(false)}
                        activityId={currentActivity.id}
                        onResponseComplete={handleSoloResponseComplete}
                        guestMode={false}
                    />
                );

            case 'Restaurant':
            case 'Brunch':
            case 'Game Night':
                return (
                    <CuisineResponseForm
                        visible={showSoloResponseModal}
                        onClose={() => setShowSoloResponseModal(false)}
                        activityId={currentActivity.id}
                        onResponseComplete={handleSoloResponseComplete}
                        guestMode={false}
                    />
                );

            case 'Meeting':
                return (
                    <LetsMeetScheduler
                        visible={showSoloResponseModal}
                        onClose={() => setShowSoloResponseModal(false)}
                        activityId={currentActivity.id}
                        currentActivity={currentActivity}
                        responseSubmitted={false}
                        isUpdate={false}
                        onAvailabilityUpdate={handleSoloResponseComplete}
                        guestMode={false}
                        guestToken={null}
                        guestEmail={null}
                        onChatComplete={handleSoloResponseComplete}
                    />
                );

            default:
                return (
                    <CuisineResponseForm
                        visible={showSoloResponseModal}
                        onClose={() => setShowSoloResponseModal(false)}
                        activityId={currentActivity.id}
                        onResponseComplete={handleSoloResponseComplete}
                        guestMode={false}
                    />
                );
        }
    };

    if (!currentActivity) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <StatusBar backgroundColor="#201925" barStyle="light-content" />
                
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        )
    }

    // Validate activity structure before checking ownership
    const isValidActivity = currentActivity && (
        currentActivity.activity_type !== undefined ||
        currentActivity.participants !== undefined ||
        currentActivity.responses !== undefined ||
        currentActivity.user_id !== undefined
    ) && !currentActivity.email; // User objects have email, activities don't

    // Use loose comparison to handle string/number type differences
    const isOwner = isValidActivity && (
        (user?.id == currentActivity?.user_id) || 
        (user?.id == currentActivity?.user?.id)
    )

    // Don't render if we have invalid activity data
    if (currentActivity && !isValidActivity) {
        return (
            <SafeAreaView style={styles.safe} edges={['top']}>
                <StatusBar backgroundColor="#201925" barStyle="light-content" />
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>Unable to load activity</Text>
                    <TouchableOpacity 
                        style={styles.errorBackButton} 
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.errorBackButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar backgroundColor="#201925" barStyle="light-content" />
            
            {/* When in voting phase (map view), don't use ScrollView */}
            {currentActivity.voting ? (
                <View style={styles.fixedContainer}>
                    {/* Sticky header */}
                    <ActivityStickyHeader
                        activity={currentActivity}
                        isOwner={isOwner}
                        onBack={handleBack}
                        onEdit={() => setShowUpdateModal(true)}
                        onDelete={() => handleDelete(currentActivity.id)}
                        onLeave={handleLeaveActivity}
                        onReport={handleReportActivity}
                        onComplete={handleFinalize}
                        onSoloComplete={handleSoloComplete}
                    />
                    
                    {/* Map view takes remaining space */}
                    <View style={styles.mapViewContent}>
                        <AIRecommendations
                            activity={currentActivity}
                            pinnedActivities={pinnedActivities}
                            setPinnedActivities={setPinnedActivities}
                            setPinned={setPinned}
                            setRefreshTrigger={setRefreshTrigger}
                            isOwner={isOwner}
                            onEdit={() => handleFinalize()}
                        />
                    </View>
                </View>
            ) : (
                <KeyboardAvoidingView 
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={styles.keyboardAvoidingView}
                >
                    <ScrollView
                        ref={scrollViewRef}
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={styles.contentContainer}
                        stickyHeaderIndices={[0]}
                        keyboardShouldPersistTaps="handled"
                        keyboardDismissMode="on-drag"
                    >
                        {/* Sticky header - only the top buttons */}
                        <View>
                            <ActivityStickyHeader
                                activity={currentActivity}
                                isOwner={isOwner}
                                onBack={handleBack}
                                onEdit={() => setShowUpdateModal(true)}
                                onDelete={() => handleDelete(currentActivity.id)}
                                onLeave={handleLeaveActivity}
                                onReport={handleReportActivity}
                                onComplete={handleFinalize}
                                onSoloComplete={handleSoloComplete}
                            />
                        </View>

                        {/* Main header content that scrolls */}
                        <ActivityHeader
                            activity={currentActivity}
                            isOwner={isOwner}
                            onBack={handleBack}
                            onEdit={() => setShowUpdateModal(true)}
                            onFinalize={handleFinalize}
                            onReport={handleReportActivity}
                            onActivityUpdate={(updatedActivity) => {
                                setCurrentActivity(updatedActivity)
                                setRefreshTrigger(prev => !prev)
                            }}
                        />

                        <View style={[styles.contentSection, pendingInvite && styles.blurred]}>
                            {/* Show Solo Activity Decision for solo activities in collecting phase */}
                            {currentActivity.is_solo && !currentActivity.voting && !currentActivity.finalized ? (
                                <SoloActivityDecision
                                    activity={currentActivity}
                                    onResponseModalOpen={handleSoloResponseModalOpen}
                                    onRecommendationsGenerated={handleSoloRecommendationsGenerated}
                                />
                            ) : (
                                <>
                                    <AIRecommendations
                                        activity={currentActivity}
                                        pinnedActivities={pinnedActivities}
                                        setPinnedActivities={setPinnedActivities}
                                        setPinned={setPinned}
                                        setRefreshTrigger={setRefreshTrigger}
                                        isOwner={isOwner}
                                        onEdit={() => handleFinalize()}
                                    />

                                    <ParticipantsSection
                                        activity={currentActivity}
                                        votes={currentActivity.activity_type === 'Meeting' ? pinned : pinnedActivities}
                                        isOwner={isOwner}
                                        onInvite={handleInvite}
                                        onRemoveParticipant={handleRemoveParticipant}
                                        externalShowInviteModal={showInviteModal}
                                        externalSetShowInviteModal={setShowInviteModal}
                                    />

                                    <CommentsSection
                                        activity={currentActivity}
                                        parentScrollRef={scrollViewRef}
                                    />

                                    {/* Delete/Leave Activity Button Section */}
                                    <View style={styles.deleteActivitySection}>
                                        {/* Report/Flag Activity Button */}
                                        <TouchableOpacity
                                            style={styles.reportActivityButton}
                                            onPress={handleReportActivity}
                                        >
                                            <Text style={styles.reportActivityButtonText}>
                                                Report
                                            </Text>
                                        </TouchableOpacity>

                                        {isOwner ? (
                                            <TouchableOpacity
                                                style={styles.deleteActivityButton}
                                                onPress={() => handleDelete(currentActivity.id)}
                                            >
                                                <Text style={styles.deleteActivityButtonText}>Delete</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            <TouchableOpacity
                                                style={styles.leaveActivityButton}
                                                onPress={handleLeaveActivity}
                                            >
                                                <Text style={styles.leaveActivityButtonText}>Leave</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </>
                            )}
                        </View>
                    </ScrollView>
                </KeyboardAvoidingView>
            )}

            {/* Loading Overlay */}
            {isUpdating && (
                <View style={styles.loadingOverlay}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#cc31e8" />
                        <Text style={styles.loadingText}>Updating activity...</Text>
                    </View>
                </View>
            )}

            {/* Pending Invite Overlay */}
            {pendingInvite && (
                <InvitePromptOverlay
                    activity={currentActivity}
                    onAccept={handleAcceptInvite}
                    onDecline={handleDeclineInvite}
                    onClose={handleBack}
                />
            )}

            {/* Update Details Modal */}
            <UpdateDetailsModal
                activity={currentActivity}
                visible={showUpdateModal}
                onClose={() => setShowUpdateModal(false)}
                onUpdate={(updatedActivity) => {
                    // Optimize: Only update if activity actually changed
                    if (JSON.stringify(updatedActivity) !== JSON.stringify(currentActivity)) {
                        // Update local state first for immediate feedback
                        setCurrentActivity(updatedActivity)
                        
                        // Then update user context in background
                        requestAnimationFrame(() => {
                            setUser(prevUser => ({
                                ...prevUser,
                                activities: prevUser.activities.map(act =>
                                    act.id === updatedActivity.id ? updatedActivity : act
                                ),
                                participant_activities: prevUser.participant_activities.map(p =>
                                    p.activity.id === updatedActivity.id
                                        ? { ...p, activity: updatedActivity }
                                        : p
                                ),
                            }))
                        })
                        
                        setRefreshTrigger(prev => !prev)
                    }
                }}
            />

            {/* Finalize Activity Modal */}
            <FinalizeActivityModal
                activity={currentActivity}
                visible={showFinalizeModal}
                onClose={() => setShowFinalizeModal(false)}
                onFinalize={handleFinalizeSuccess}
                pinnedActivities={pinnedActivities}
                pinned={pinned}
                onUpdate={(updatedActivity) => {
                    // Optimize: Only update if activity actually changed
                    if (JSON.stringify(updatedActivity) !== JSON.stringify(currentActivity)) {
                        // Update local state first for immediate feedback
                        setCurrentActivity(updatedActivity)
                        
                        // Then update user context in background
                        requestAnimationFrame(() => {
                            setUser(prevUser => ({
                                ...prevUser,
                                activities: prevUser.activities.map(act =>
                                    act.id === updatedActivity.id ? updatedActivity : act
                                ),
                                participant_activities: prevUser.participant_activities.map(p =>
                                    p.activity.id === updatedActivity.id
                                        ? { ...p, activity: updatedActivity }
                                        : p
                                ),
                            }))
                        })
                        
                        setRefreshTrigger(prev => !prev)
                    }
                }}
            />

            <ReportModal
                visible={showReportModal}
                onClose={() => setShowReportModal(false)}
                reportableType="Activity"
                reportableId={currentActivity?.id}
                reportableTitle={currentActivity?.activity_name}
                reportableContent={currentActivity?.welcome_message}
                onReportSubmitted={handleReportSubmitted}
            />

            {/* Solo Activity Response Modal */}
            {showSoloResponseModal && currentActivity && (
                <>
                    {renderResponseForm()}
                </>
            )}
        </SafeAreaView>
    )
}


function InvitePromptOverlay({ activity, onAccept, onDecline, onClose }) {
    const activityDetails = getActivityDetails(activity.activity_type);

    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.inviteOverlay}>
                <View style={styles.inviteCard}>
                    <TouchableOpacity style={styles.inviteCloseButton} onPress={onClose}>
                        <X stroke="#fff" width={18} height={18} />
                    </TouchableOpacity>

                    <Text style={styles.inviteTitle}>🎉 You're Invited!</Text>

                    <Text style={styles.hostInvite}>
                        <Text style={styles.hostName}>{activity.user?.name}</Text> invited you to{' '}
                        <Text style={styles.activityNameHighlight}>{activity.activity_name}</Text>
                    </Text>

                    <View style={styles.inviteButtons}>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                            <Text style={styles.acceptButtonText}>Join</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
                            <Text style={styles.declineButtonText}>Pass</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#201925',
    },

    fixedContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },

    mapViewContent: {
        flex: 1,
    },

    keyboardAvoidingView: {
        flex: 1,
    },

    scrollView: {
        flex: 1,
    },

    contentContainer: {
        paddingBottom: 0,
        flexGrow: 1,
    },

    // Error container styles
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    
    errorText: {
        color: '#fff',
        fontSize: 18,
        marginBottom: 20,
        textAlign: 'center',
    },
    
    errorBackButton: {
        backgroundColor: '#cc31e8',
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    
    errorBackButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    // Loading Styles
    loadingOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
    },
    
    loadingContainer: {
        backgroundColor: 'rgba(32, 25, 37, 0.95)',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },

    loadingText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 12,
    },

    // Content Section Styles
    contentSection: {
        flex: 1,
    },

    blurred: {
        opacity: 0.3,
    },

    mainContentPlaceholder: {
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 16,
        padding: 40,
        margin: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    commentsPlaceholder: {
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 16,
        padding: 40,
        margin: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    placeholderText: {
        color: '#ccc',
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
    },

    // Delete Activity Button Styles
    deleteActivitySection: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginTop: 24,
    },

    deleteActivityButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 8,
        marginHorizontal: 6,
    },

    deleteActivityButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },

    leaveActivityButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
        borderRadius: 8,
        marginHorizontal: 6,
    },

    leaveActivityButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },

    reportActivityButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        flex: 1,
        backgroundColor: 'rgba(255, 165, 0, 0.05)',
        borderRadius: 8,
        marginHorizontal: 6,
    },

    reportActivityButtonDisabled: {
        backgroundColor: 'rgba(255, 165, 0, 0.03)',
        borderColor: 'rgba(255, 165, 0, 0.1)',
        opacity: 0.5,
    },

    reportActivityButtonText: {
        color: '#FFA500',
        fontSize: 14,
        fontWeight: '600',
    },

    reportActivityButtonTextDisabled: {
        color: 'rgba(255, 165, 0, 0.5)',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContent: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        padding: 20,
        width: '100%',
        maxWidth: 400,
    },

    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },

    modalPlaceholder: {
        color: '#ccc',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 20,
        fontStyle: 'italic',
    },

    closeButton: {
        backgroundColor: '#cf38dd',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },

    closeButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },

    // Sleek Invite Overlay Styles
    inviteOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    inviteCard: {
        backgroundColor: '#2C1E33',
        borderRadius: 24,
        padding: 28,
        width: '90%',
        maxWidth: 350,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.12)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },

    inviteCloseButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    inviteTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        marginBottom: 20,
        textAlign: 'center',
    },

    hostInvite: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 17,
        textAlign: 'center',
        marginBottom: 16,
        lineHeight: 24,
    },

    hostName: {
        color: '#f39c12',
        fontWeight: '600',
    },

    activityNameHighlight: {
        color: '#CC31E8',
        fontWeight: '600',
    },

    funMessage: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 28,
        fontWeight: '500',
    },

    inviteButtons: {
        flexDirection: 'row',
        gap: SPACING.FORM_GAP,
        width: '100%',
    },

    acceptButton: {
        backgroundColor: '#cf38dd',
        minHeight: TOUCH_TARGETS.COMFORTABLE_SIZE,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#cf38dd',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    acceptButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
        textAlign: 'center',
    },

    declineButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        minHeight: TOUCH_TARGETS.COMFORTABLE_SIZE,
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },

    declineButtonText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
})