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
} from 'react-native'
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native'
import { ArrowLeft, X } from 'react-native-feather'
import ActivityHeader from '../components/ActivityHeader'
import ParticipantsSection from '../components/ParticipantsSection'
import { API_URL } from '../config' // Import API_URL from config like ProfileScreen

export default function ActivityDetailsScreen({ route }) {
    const { activityId } = route.params
    const { user, setUser } = useContext(UserContext)
    const navigation = useNavigation()

    // Animation values for background
    const backgroundAnim = useRef(new Animated.Value(0)).current
    const smokeAnim1 = useRef(new Animated.Value(0)).current
    const smokeAnim2 = useRef(new Animated.Value(0)).current

    // State
    const [currentActivity, setCurrentActivity] = useState(null)
    const [refreshTrigger, setRefreshTrigger] = useState(false)
    const [showUpdateModal, setShowUpdateModal] = useState(false)
    const [pinnedActivities, setPinnedActivities] = useState([])
    const [pinned, setPinned] = useState([])

    // Token - match ProfileScreen pattern exactly
    const token = user?.token

    console.log('💬 User in ActivityDetailsScreen:', user?.id)
    console.log('💬 Token in ActivityDetailsScreen:', !!token)

    // Find the activity from user context
    const pendingInvite = user?.participant_activities?.find(
        p => p.activity.id === activityId && !p.accepted
    )

    useEffect(() => {
        // Start background animations
        const backgroundAnimation = Animated.loop(
            Animated.timing(backgroundAnim, {
                toValue: 1,
                duration: 25000,
                useNativeDriver: false,
            })
        )

        const smokeAnimation1 = Animated.loop(
            Animated.timing(smokeAnim1, {
                toValue: 1,
                duration: 40000,
                useNativeDriver: true,
            })
        )

        const smokeAnimation2 = Animated.loop(
            Animated.timing(smokeAnim2, {
                toValue: 1,
                duration: 55000,
                useNativeDriver: true,
            })
        )

        backgroundAnimation.start()
        smokeAnimation1.start()
        smokeAnimation2.start()

        return () => {
            backgroundAnimation.stop()
            smokeAnimation1.stop()
            smokeAnimation2.stop()
        }
    }, [])

    useEffect(() => {
        // Find current activity from user context
        const activity =
            user?.activities?.find(act => act.id === activityId) ||
            user?.participant_activities?.find(p => p.activity.id === activityId)?.activity

        if (activity) {
            setCurrentActivity(activity)

            // Fetch pinned activities for restaurants
            if (activity.activity_type === 'Restaurant') {
                console.log(`🍽️ Fetching pinned activities for activity ${activityId}`)
                fetch(`${API_URL}/activities/${activityId}/pinned_activities`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                })
                    .then((res) => {
                        console.log(`📊 Pinned activities response status: ${res.status}`)
                        if (!res.ok) throw new Error('Failed to fetch pinned activities')
                        return res.json()
                    })
                    .then((data) => {
                        console.log('✅ Pinned activities fetched successfully:', data.length)
                        setPinnedActivities(data)
                    })
                    .catch((err) => {
                        console.error('❌ Error fetching pinned activities:', err)
                    })
            }

            // Fetch time slots for meetings
            if (activity.activity_type === 'Meeting') {
                console.log(`🕐 Fetching time slots for activity ${activityId}`)
                fetch(`${API_URL}/activities/${activityId}/time_slots`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`,
                    },
                })
                    .then((res) => {
                        console.log(`📊 Time slots response status: ${res.status}`)
                        if (!res.ok) throw new Error('Failed to fetch time slots')
                        return res.json()
                    })
                    .then((data) => {
                        console.log('✅ Time slots fetched successfully:', data.length)
                        setPinned(data)
                    })
                    .catch((err) => {
                        console.error('❌ Error fetching time slots:', err)
                    })
            }
        }
    }, [user, activityId, refreshTrigger, token])

    const handleAcceptInvite = async () => {
        if (!pendingInvite) return

        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'
            const response = await fetch(`${API_URL}/activity_participants/accept`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: user.email,
                    activity_id: activityId
                }),
            })

            if (!response.ok) {
                Alert.alert('Error', 'Failed to accept invite.')
                return
            }

            const updatedActivity = await response.json()

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.map(p =>
                    p.activity.id === updatedActivity.id
                        ? { ...p, accepted: true, activity: updatedActivity }
                        : p
                ),
            }))

            Alert.alert('Success', 'Welcome to the board!')
            setRefreshTrigger(prev => !prev)
        } catch (error) {
            console.error('Error accepting invite:', error)
            Alert.alert('Error', 'Failed to accept invite.')
        }
    }

    const handleDeclineInvite = async () => {
        if (!pendingInvite) return

        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'
            const response = await fetch(`${API_URL}/activity_participants/decline`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    email: user.email,
                    activity_id: activityId
                }),
            })

            if (response.ok) {
                setUser(prevUser => ({
                    ...prevUser,
                    participant_activities: prevUser.participant_activities.filter(
                        p => p.activity.id !== activityId
                    ),
                }))
                Alert.alert('Success', 'Invite declined.')
                navigation.goBack()
            } else {
                Alert.alert('Error', 'Failed to decline invite.')
            }
        } catch (error) {
            console.error('Error declining invite:', error)
            Alert.alert('Error', 'Failed to decline invite.')
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
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'
            const response = await fetch(`${API_URL}/activities/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (response.ok) {
                console.log(`Activity with ID ${id} deleted successfully`)

                setUser(prevUser => ({
                    ...prevUser,
                    activities: prevUser.activities.filter(
                        activity => activity.id !== id
                    ),
                }))

                Alert.alert('Success', 'Activity deleted successfully.')
                navigation.goBack()
            } else {
                console.error('Failed to delete activity')
                Alert.alert('Error', 'Failed to delete activity.')
            }
        } catch (error) {
            console.error('Error deleting activity:', error)
            Alert.alert('Error', 'Failed to delete activity.')
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
        try {
            const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001'
            const response = await fetch(`${API_URL}/activity_participants/leave`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ activity_id: activityId }),
            })

            const data = await response.json()

            if (!response.ok) {
                Alert.alert('Error', data.error || 'Failed to leave activity.')
                return
            }

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.filter(
                    p => p.activity.id !== activityId
                ),
            }))

            Alert.alert('Success', 'You have successfully left the activity.')
            navigation.goBack()
        } catch (error) {
            console.error('Error leaving activity:', error)
            Alert.alert('Error', 'Failed to leave activity.')
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
            const response = await fetch(`${API_URL}/activity_participants/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ email: email, activity_id: currentActivity.id }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to send invitation')
            }

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
            console.error('Error sending invite:', error)
            Alert.alert('Error', error.message || 'Failed to send invitation.')
        }
    }

    const handleRemoveParticipant = async (participant) => {
        try {
            const url = new URL(`${API_URL}/activity_participants/remove`)
            url.searchParams.set('activity_id', currentActivity.id)
            url.searchParams.set('email', participant.email)

            const response = await fetch(url, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Remove failed')
            }

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
            console.error('Error removing participant:', error)
            Alert.alert('Error', error.message)
        }
    }

    if (!currentActivity) {
        return (
            <SafeAreaView style={styles.safe}>
                <StatusBar barStyle="light-content" />
                <AnimatedBackground
                    backgroundAnim={backgroundAnim}
                    smokeAnim1={smokeAnim1}
                    smokeAnim2={smokeAnim2}
                />
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        )
    }

    const isOwner = user?.id === currentActivity?.user_id || user?.id === currentActivity?.user?.id

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />

            {/* Animated Background */}
            <AnimatedBackground
                backgroundAnim={backgroundAnim}
                smokeAnim1={smokeAnim1}
                smokeAnim2={smokeAnim2}
            />

            {/* Main Content */}
            <ScrollView
                style={styles.container}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.contentContainer}
            >
                {/* Header Section - ActivityHeader component */}
                <ActivityHeader
                    activity={currentActivity}
                    isOwner={isOwner}
                    onBack={handleBack}
                    onEdit={() => setShowUpdateModal(true)}
                    onDelete={handleDelete}
                    onLeave={handleLeaveActivity}
                />

                {/* Content Section */}
                <View style={[styles.contentSection, pendingInvite && styles.blurred]}>
                    {/* ParticipantsSection */}
                    <ParticipantsSection
                        activity={currentActivity}
                        votes={currentActivity.activity_type === 'Meeting' ? pinned : pinnedActivities}
                        isOwner={isOwner}
                        onInvite={handleInvite}
                        onRemoveParticipant={handleRemoveParticipant}
                    />

                    {/* Placeholder for main content (AIRecommendations or TimeSlots) */}
                    <View style={styles.mainContentPlaceholder}>
                        <Text style={styles.placeholderText}>
                            {currentActivity.activity_type === 'Restaurant'
                                ? 'AI Recommendations Component Placeholder'
                                : 'Time Slots Component Placeholder'}
                        </Text>
                    </View>

                    {/* Placeholder for ActivityCommentSection */}
                    <View style={styles.commentsPlaceholder}>
                        <Text style={styles.placeholderText}>
                            Comments Section Placeholder
                        </Text>
                    </View>
                </View>
            </ScrollView>

            {/* Pending Invite Overlay */}
            {pendingInvite && (
                <InvitePromptOverlay
                    activity={currentActivity}
                    onAccept={handleAcceptInvite}
                    onDecline={handleDeclineInvite}
                    onClose={handleBack}
                />
            )}

            {/* Update Modal Placeholder */}
            <Modal
                visible={showUpdateModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowUpdateModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <Text style={styles.modalTitle}>Update Activity</Text>
                        <Text style={styles.modalPlaceholder}>
                            UpdateActivityModal Component Placeholder
                        </Text>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowUpdateModal(false)}
                        >
                            <Text style={styles.closeButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    )
}

// Animated Background Component
function AnimatedBackground({ backgroundAnim, smokeAnim1, smokeAnim2 }) {
    return (
        <View style={styles.backgroundContainer}>
            <Animated.View style={styles.background} />

            <Animated.View
                style={[
                    styles.smokeLayer1,
                    {
                        transform: [{
                            translateX: smokeAnim1.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [-20, 20, -20],
                            }),
                        }, {
                            translateY: smokeAnim1.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [-20, 20, -20],
                            }),
                        }],
                    }
                ]}
            />

            <Animated.View
                style={[
                    styles.smokeLayer2,
                    {
                        transform: [{
                            translateX: smokeAnim2.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [20, -20, 20],
                            }),
                        }, {
                            translateY: smokeAnim2.interpolate({
                                inputRange: [0, 0.5, 1],
                                outputRange: [-20, 20, -20],
                            }),
                        }],
                    }
                ]}
            />
        </View>
    )
}

// Invite Prompt Overlay Component
function InvitePromptOverlay({ activity, onAccept, onDecline, onClose }) {
    return (
        <Modal
            visible={true}
            transparent={true}
            animationType="fade"
        >
            <View style={styles.inviteOverlay}>
                <View style={styles.inviteCard}>
                    <TouchableOpacity style={styles.inviteCloseButton} onPress={onClose}>
                        <X stroke="#fff" width={20} height={20} />
                    </TouchableOpacity>

                    <Text style={styles.inviteTitle}>🎉 You're Invited!</Text>

                    <Text style={styles.inviteSubtitle}>
                        <Text style={styles.hostName}>{activity.user?.name}</Text> invited you to join{' '}
                        <Text style={styles.activityNameHighlight}>{activity.activity_name}</Text>
                    </Text>

                    {activity.welcome_message && (
                        <Text style={styles.welcomeMessage}>
                            "{activity.welcome_message}"
                        </Text>
                    )}

                    <View style={styles.inviteButtons}>
                        <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
                            <Text style={styles.acceptButtonText}>Accept Invite</Text>
                        </TouchableOpacity>

                        <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
                            <Text style={styles.declineButtonText}>Decline</Text>
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

    container: {
        flex: 1,
    },

    contentContainer: {
        paddingBottom: 20,
        flexGrow: 1,
    },

    // Background Styles
    backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: -1,
    },

    background: {
        flex: 1,
        backgroundColor: '#201925',
    },

    smokeLayer1: {
        position: 'absolute',
        top: -100,
        left: -100,
        right: -100,
        bottom: -100,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 200,
    },

    smokeLayer2: {
        position: 'absolute',
        top: -150,
        left: -150,
        right: -150,
        bottom: -150,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
        borderRadius: 300,
    },

    // Loading Styles
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
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

    // Invite Overlay Styles
    inviteOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    inviteCard: {
        backgroundColor: '#2C1E33',
        borderRadius: 20,
        padding: 30,
        width: '100%',
        maxWidth: 400,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    inviteCloseButton: {
        position: 'absolute',
        top: 15,
        right: 15,
        padding: 5,
    },

    inviteTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
    },

    inviteSubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
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

    welcomeMessage: {
        color: '#ccc',
        fontSize: 14,
        fontStyle: 'italic',
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },

    inviteButtons: {
        flexDirection: 'row',
        gap: 12,
    },

    acceptButton: {
        backgroundColor: '#cf38dd',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        flex: 1,
    },

    acceptButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },

    declineButton: {
        backgroundColor: '#e74c3c',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 12,
        flex: 1,
    },

    declineButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
})