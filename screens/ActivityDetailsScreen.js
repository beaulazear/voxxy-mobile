import React, { useState, useEffect, useContext, useRef } from 'react'
import {
    SafeAreaView,
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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeft, X } from 'react-native-feather'
import ActivityHeader, { ActivityStickyHeader } from '../components/ActivityHeader'
import ParticipantsSection from '../components/ParticipantsSection'
import AIRecommendations from '../components/AIRecommendations'
import CommentsSection from '../components/CommentsSection'
import UpdateDetailsModal from '../components/UpdateDetailsModal'
import FinalizeActivityModal from '../components/FinalizeActivityModal'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

const adventures = [
    {
        name: 'Food',
        emoji: '🍜',
        active: true,
        description: 'Schedule your next group meal together.'
    },
    {
        name: 'Drinks',
        emoji: '🍸',
        active: true,
        description: 'Plan your perfect night out with friends.'
    },
    {
        name: 'Lets Meet',
        emoji: '⏰',
        active: true,
        description: 'Find a time that works for everyone.'
    },
    {
        name: 'Game Night',
        emoji: '🎮',
        active: true,
        description: 'Set up a memorable game night.'
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
    const { activityId } = route.params
    const { user, setUser } = useContext(UserContext)
    const navigation = useNavigation()


    // State
    const [currentActivity, setCurrentActivity] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [showFinalizeModal, setShowFinalizeModal] = useState(false)
    const [pinnedActivities, setPinnedActivities] = useState([])
    const [isUpdating, setIsUpdating] = useState(false)
    
    // Refs
    const scrollViewRef = useRef(null)
    const [pinned, setPinned] = useState([])
    const [loadingPinned, setLoadingPinned] = useState(false)
    const [loadingTimeSlots, setLoadingTimeSlots] = useState(false)

    // Token - match ProfileScreen pattern exactly
    const token = user?.token

    logger.debug('💬 User in ActivityDetailsScreen:', user?.id)
    logger.debug('💬 Token in ActivityDetailsScreen:', !!token)

    // Find the activity from user context
    const pendingInvite = user?.participant_activities?.find(
        p => p.activity.id === activityId && !p.accepted
    )


    useEffect(() => {
        // Find current activity from user context
        const activity =
            user?.activities?.find(act => act.id === activityId) ||
            user?.participant_activities?.find(p => p.activity.id === activityId)?.activity

        if (activity) {
            setCurrentActivity(activity)
            
            logger.debug(`🔍 Activity state - Type: ${activity.activity_type}, Voting: ${activity.voting}, Finalized: ${activity.finalized}`)
            logger.debug(`🔍 Pinned activities in context: ${activity.pinned_activities?.length || 0}`)

            // Fetch pinned activities for activity types that use them (Restaurant, Cocktails, Game Night)
            // Only fetch if activity is in voting phase or has pinned activities (not during preference collection phase)
            if (['Restaurant', 'Cocktails', 'Game Night'].includes(activity.activity_type) && (activity.voting || activity.finalized)) {
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
            } else if (['Restaurant', 'Cocktails', 'Game Night'].includes(activity.activity_type)) {
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
        }
    }, [user, activityId, refreshTrigger, token])

    // Auto-scroll to bottom when keyboard opens
    useEffect(() => {
        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => {
                if (scrollViewRef.current) {
                    scrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100);
        });

        return () => {
            keyboardDidShowListener?.remove();
        };
    }, []);

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
                activities: prev.activities.map(a => {
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

    if (!currentActivity) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar backgroundColor="#201925" barStyle="light-content" />
                
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        )
    }

    // Use loose comparison to handle string/number type differences
    const isOwner = (user?.id == currentActivity?.user_id) || (user?.id == currentActivity?.user?.id)
    
    // Debug logging for owner check
    console.log('🔍 DEBUG: Owner check in ActivityDetailsScreen');
    console.log('- user.id:', user?.id, '(type:', typeof user?.id, ')');
    console.log('- currentActivity.user_id:', currentActivity?.user_id, '(type:', typeof currentActivity?.user_id, ')');
    console.log('- currentActivity.user?.id:', currentActivity?.user?.id, '(type:', typeof currentActivity?.user?.id, ')');
    console.log('- currentActivity object keys:', currentActivity ? Object.keys(currentActivity) : 'none');
    console.log('- currentActivity.user object:', currentActivity?.user);
    console.log('- isOwner result:', isOwner);
    console.log('- First check (user.id === currentActivity.user_id):', user?.id === currentActivity?.user_id);
    console.log('- Second check (user.id === currentActivity.user?.id):', user?.id === currentActivity?.user?.id);

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar backgroundColor="#201925" barStyle="light-content" />
            
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
                        />
                    </View>

                    {/* Main header content that scrolls */}
                    <ActivityHeader
                        activity={currentActivity}
                        isOwner={isOwner}
                        onBack={handleBack}
                        onEdit={() => setShowUpdateModal(true)}
                        onFinalize={handleFinalize}
                        onActivityUpdate={(updatedActivity) => {
                            setCurrentActivity(updatedActivity)
                            setRefreshTrigger(prev => !prev)
                        }}
                    />

                    <View style={[styles.contentSection, pendingInvite && styles.blurred]}>
                        {console.log('🔍 DEBUG: Passing isOwner to AIRecommendations:', isOwner)}
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
                        />

                        <CommentsSection activity={currentActivity} />
                    </View>
                </ScrollView>
            </KeyboardAvoidingView>

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

    keyboardAvoidingView: {
        flex: 1,
    },

    scrollView: {
        flex: 1,
    },

    contentContainer: {
        paddingBottom: 20,
        flexGrow: 1,
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
        top: 12,
        right: 12,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
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
        gap: 14,
        width: '100%',
    },

    acceptButton: {
        backgroundColor: '#cf38dd',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        flex: 1,
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
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 16,
        flex: 1,
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