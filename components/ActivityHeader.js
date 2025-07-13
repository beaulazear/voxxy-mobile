import React, { useState, useEffect, useRef, useContext } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    Animated,
    Alert,
    ScrollView,
} from 'react-native'
import {
    ArrowLeft,
    Edit,
    Trash,
    LogOut,
    HelpCircle,
    X,
    Calendar,
    Clock,
    Star
} from 'react-native-feather'
import { useNavigation } from '@react-navigation/native'
import { UserContext } from '../context/UserContext'

import DefaultIcon from '../assets/icon.png'
import { API_URL } from '../config'

// Avatar mapping for relative paths (copied from ParticipantsSection)
const avatarMap = {
    // Avatar series
    'Avatar1.jpg': require('../assets/Avatar1.jpg'),
    'Avatar2.jpg': require('../assets/Avatar2.jpg'),
    'Avatar3.jpg': require('../assets/Avatar3.jpg'),
    'Avatar4.jpg': require('../assets/Avatar4.jpg'),
    'Avatar5.jpg': require('../assets/Avatar5.jpg'),
    'Avatar6.jpg': require('../assets/Avatar6.jpg'),
    'Avatar7.jpg': require('../assets/Avatar7.jpg'),
    'Avatar8.jpg': require('../assets/Avatar8.jpg'),
    'Avatar9.jpg': require('../assets/Avatar9.jpg'),
    'Avatar10.jpg': require('../assets/Avatar10.jpg'),
    'Avatar11.jpg': require('../assets/Avatar11.jpg'),

    // Weird series
    'Weird1.jpg': require('../assets/Weird1.jpg'),
    'Weird2.jpg': require('../assets/Weird2.jpg'),
    'Weird3.jpg': require('../assets/Weird3.jpg'),
    'Weird4.jpg': require('../assets/Weird4.jpg'),
    'Weird5.jpg': require('../assets/Weird5.jpg'),
}

// Activity type configuration for display and help steps
const ACTIVITY_CONFIG = {
    'Restaurant': {
        displayText: 'Lets Eat! 🍜',
        emoji: '🍜',
        usesAIRecommendations: true
    },
    'Meeting': {
        displayText: 'Lets Meet! 👥',
        emoji: '👥',
        usesAIRecommendations: true
    },
    'Cocktails': {
        displayText: 'Lets Go Out! 🌃',
        emoji: '🌃',
        usesAIRecommendations: true
    },
    'Game Night': {
        displayText: 'Game Time! 🎮',
        emoji: '🎮',
        usesAIRecommendations: false
    }
}

// Helper function to get activity display info
function getActivityDisplayInfo(activityType) {
    return ACTIVITY_CONFIG[activityType] || {
        displayText: 'Lets Meet! 👥',
        emoji: '👥',
        usesAIRecommendations: true
    }
}

// Helper function to safely get avatar (copied from ParticipantsSection)
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null
    } catch (error) {
        console.log(`⚠️ Avatar ${filename} not found in mapping`)
        return null
    }
}

export default function ActivityHeader({
    activity,
    isOwner,
    onBack,
    onEdit
}) {
    const { user, setUser } = useContext(UserContext)
    const navigation = useNavigation()
    const [helpVisible, setHelpVisible] = useState(false)
    const [helpStep, setHelpStep] = useState(0)
    const [isBouncing, setIsBouncing] = useState(true)

    // Get token for API calls
    const token = user?.token

    // Animation for help button bounce
    const bounceAnim = useRef(new Animated.Value(0)).current

    useEffect(() => {
        // Setup bounce animation for help button
        const bounceDuration = 3000
        const inactivityDelay = 10000
        let bounceTimeout, inactivityTimeout

        const stopBounce = () => {
            setIsBouncing(false)
            Animated.timing(bounceAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }

        const startBounce = () => {
            setIsBouncing(true)
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceAnim, {
                        toValue: -8,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceAnim, {
                        toValue: 0,
                        duration: 400,
                        useNativeDriver: true,
                    }),
                ]),
                { iterations: 3 }
            ).start()

            clearTimeout(bounceTimeout)
            bounceTimeout = setTimeout(stopBounce, bounceDuration)
        }

        const resetInactivity = () => {
            clearTimeout(inactivityTimeout)
            inactivityTimeout = setTimeout(startBounce, inactivityDelay)
        }

        startBounce()
        resetInactivity()

        return () => {
            clearTimeout(bounceTimeout)
            clearTimeout(inactivityTimeout)
        }
    }, [])

    const formatDate = (dateString) => {
        if (!dateString) return 'TBD'
        const [year, month, day] = dateString.split('-').map(Number)
        const date = new Date(year, month - 1, day)
        const monthName = date.toLocaleString('en-US', { month: 'long' })
        const dayNum = date.getDate()
        const getOrdinalSuffix = (day) => {
            if (day >= 11 && day <= 13) return 'th'
            switch (day % 10) {
                case 1: return 'st'
                case 2: return 'nd'
                case 3: return 'rd'
                default: return 'th'
            }
        }
        return `${monthName} ${dayNum}${getOrdinalSuffix(dayNum)}`
    }

    const formatTime = (timeString) => {
        if (!timeString) return 'TBD'
        const timePortion = timeString.split('T')[1]
        const [rawHour, rawMin] = timePortion.split(':')
        let hour = parseInt(rawHour, 10)
        const suffix = hour >= 12 ? 'pm' : 'am'
        hour = hour % 12 || 12
        return `${hour}:${rawMin} ${suffix}`
    }

    // Updated getDisplayImage function with comprehensive avatar handling
    const getDisplayImage = (userObj) => {
        console.log(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        // Check for profile_pic_url first (full URL)
        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            console.log(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        // Check for avatar (relative path)
        if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
            // Extract filename from path if it includes directory
            const avatarFilename = userObj.avatar.includes('/')
                ? userObj.avatar.split('/').pop()
                : userObj.avatar

            console.log(`🎭 Looking for avatar: ${avatarFilename}`)

            // Check if we have this avatar in our mapping
            const mappedAvatar = getAvatarFromMap(avatarFilename)
            if (mappedAvatar) {
                console.log(`✅ Found avatar in mapping: ${avatarFilename}`)
                return mappedAvatar
            }

            // If it's a full URL, use it
            if (userObj.avatar.startsWith('http')) {
                console.log(`🌐 Using avatar URL: ${userObj.avatar}`)
                return { uri: userObj.avatar }
            }
        }

        // Fallback to default icon
        console.log(`🔄 Using default icon`)
        return DefaultIcon
    }

    // Updated delete functionality with API call
    const handleDeleteActivity = async () => {
        Alert.alert(
            'Delete Activity',
            'Are you sure you want to delete this activity? This action is permanent and cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: performDelete
                }
            ]
        )
    }

    const performDelete = async () => {
        try {
            const response = await fetch(`${API_URL}/activities/${activity.id}`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
            })

            if (response.ok) {
                console.log(`Activity with ID ${activity.id} deleted successfully`)

                setUser(prevUser => ({
                    ...prevUser,
                    activities: prevUser.activities.filter(
                        activityItem => activityItem.id !== activity.id
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

    // Updated leave functionality with API call
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
            const response = await fetch(`${API_URL}/activity_participants/leave`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                credentials: 'include',
                body: JSON.stringify({ activity_id: activity.id }),
            })

            const data = await response.json()

            if (!response.ok) {
                Alert.alert('Error', data.error || 'Failed to leave activity.')
                return
            }

            setUser(prevUser => ({
                ...prevUser,
                participant_activities: prevUser.participant_activities.filter(
                    p => p.activity.id !== activity.id
                ),
            }))

            Alert.alert('Success', 'You have successfully left the activity.')
            navigation.goBack()
        } catch (error) {
            console.error('Error leaving activity:', error)
            Alert.alert('Error', 'Failed to leave activity.')
        }
    }

    // Help content based on activity type and whether it uses AI recommendations or time slots
    const aiRecommendationSteps = [
        {
            title: "1️⃣ Invite & Submit Preferences",
            desc: "Participants & organizer take the quiz and share their feedback to help tailor the group's recommendations."
        },
        {
            title: "2️⃣ Vote on Your Favorites!",
            desc: "Everyone (host + participants) casts their vote on their favorite AI-generated recommendations."
        },
        {
            title: "3️⃣ Organizer Confirms & Finalizes",
            desc: "Organizer locks in the winning option and finalizes the activity details."
        },
        {
            title: "4️⃣ Add to Calendar",
            desc: "Host shares a link with a one-click calendar option so no one misses the fun."
        }
    ]

    const timeSlotSteps = [
        {
            title: "1️⃣ Everyone Submits Availability",
            desc: "Both host and participants fill out when they're free so you can compare slots."
        },
        {
            title: "2️⃣ Participants Vote",
            desc: "All participants review overlapping slots and vote on their favorites."
        },
        {
            title: "3️⃣ Host Finalizes",
            desc: "Only the host can pick the winning time, share the final board, and send a calendar invite."
        }
    ]

    // Get activity configuration and determine which steps to show
    const activityInfo = getActivityDisplayInfo(activity.activity_type)
    const steps = activityInfo.usesAIRecommendations ? aiRecommendationSteps : timeSlotSteps

    console.log(activityInfo)

    const handleHelpClose = () => {
        setHelpStep(0)
        setHelpVisible(false)
    }

    return (
        <View style={styles.container}>
            {/* Top Actions */}
            <View style={styles.topActions}>
                <View style={styles.leftActions}>
                    <TouchableOpacity style={styles.actionButton} onPress={onBack}>
                        <ArrowLeft stroke="#fff" width={20} height={20} />
                    </TouchableOpacity>

                    <Animated.View style={[styles.helpButtonContainer, { transform: [{ translateY: bounceAnim }] }]}>
                        <TouchableOpacity
                            style={styles.helpButton}
                            onPress={() => setHelpVisible(true)}
                        >
                            <HelpCircle stroke="#fff" width={20} height={20} />
                        </TouchableOpacity>
                    </Animated.View>
                </View>

                <View style={styles.centerContent}>
                    <View style={styles.activityTypeChip}>
                        <Text style={styles.activityTypeText}>
                            {activityInfo.displayText}
                        </Text>
                    </View>
                </View>

                <View style={styles.rightActions}>
                    {isOwner ? (
                        <>
                            <TouchableOpacity style={styles.editButton} onPress={onEdit}>
                                <Edit stroke="#8b5cf6" width={20} height={20} />
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteActivity}>
                                <Trash stroke="#ef4444" width={20} height={20} />
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity style={styles.leaveButton} onPress={handleLeaveActivity}>
                            <LogOut stroke="#ef4444" width={18} height={18} />
                            <Text style={styles.leaveButtonText}>Leave</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Main Content */}
            <View style={styles.mainContent}>
                {/* Title Section */}
                <View style={styles.titleSection}>
                    <Text style={styles.activityTitle}>{activity.activity_name}</Text>

                    <View style={styles.dateTimeRow}>
                        <View style={styles.dateTimeItem}>
                            <Calendar stroke="#8b5cf6" width={16} height={16} />
                            <Text style={styles.dateTimeText}>{formatDate(activity.date_day)}</Text>
                        </View>
                        <View style={styles.dateTimeItem}>
                            <Clock stroke="#8b5cf6" width={16} height={16} />
                            <Text style={styles.dateTimeText}>{formatTime(activity.date_time)}</Text>
                        </View>
                    </View>
                </View>

                {/* Host Section */}
                <View style={styles.hostSection}>
                    <View style={styles.hostAvatar}>
                        <Image
                            source={getDisplayImage(activity.user)}
                            style={styles.hostImage}
                            defaultSource={DefaultIcon}
                            onError={() => console.log(`❌ Avatar failed to load for ${activity.user?.name}`)}
                            onLoad={() => console.log(`✅ Avatar loaded for ${activity.user?.name}`)}
                        />
                        <View style={styles.hostBadge}>
                            <Star stroke="#fff" width={12} height={12} fill="#fff" />
                        </View>
                    </View>

                    <View style={styles.hostInfo}>
                        <Text style={styles.hostName}>
                            Organized by {activity.user?.name || 'Unknown'}
                        </Text>
                        <Text style={styles.welcomeMessage}>
                            {activity.welcome_message || "Welcome to this activity! Let's make it amazing together 🎉"}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Help Modal */}
            <Modal
                visible={helpVisible}
                transparent={true}
                animationType="fade"
                onRequestClose={handleHelpClose}
            >
                <View style={styles.helpOverlay}>
                    <View style={styles.helpModal}>
                        <View style={styles.helpHeader}>
                            <Text style={styles.helpTitle}>How it works ✨</Text>
                            <TouchableOpacity onPress={handleHelpClose}>
                                <X stroke="#fff" width={20} height={20} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.helpContent}>
                            <Text style={styles.stepTitle}>{steps[helpStep].title}</Text>
                            <Text style={styles.stepDescription}>{steps[helpStep].desc}</Text>
                        </ScrollView>

                        <View style={styles.helpNavigation}>
                            <TouchableOpacity
                                style={[styles.navButton, helpStep === 0 && styles.navButtonDisabled]}
                                onPress={() => setHelpStep(s => Math.max(0, s - 1))}
                                disabled={helpStep === 0}
                            >
                                <Text style={[styles.navButtonText, helpStep === 0 && styles.navButtonTextDisabled]}>
                                    ← Previous
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.navButton}
                                onPress={() => {
                                    if (helpStep < steps.length - 1) {
                                        setHelpStep(s => s + 1)
                                    } else {
                                        handleHelpClose()
                                    }
                                }}
                            >
                                <Text style={styles.navButtonText}>
                                    {helpStep < steps.length - 1 ? 'Next →' : 'Got it!'}
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        padding: 16,
        paddingTop: 8,
    },

    // Top Actions Styles
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
        gap: 8,
        minHeight: 48, // Ensure minimum height
    },

    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 0.8, // Slightly smaller flex to give more room to center
    },

    centerContent: {
        flex: 1.4, // Give more space to the center content
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 8, // Add some padding to prevent squishing
    },

    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 0.8, // Slightly smaller flex to give more room to center
        justifyContent: 'flex-end',
    },

    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        borderWidth: 1,
        borderColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    helpButtonContainer: {
        // Container for animation
    },

    helpButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    activityTypeChip: {
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        paddingHorizontal: 14, // Slightly smaller padding
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        flexShrink: 0, // Prevent shrinking
        minWidth: 120, // Reduced minimum width
    },

    activityTypeText: {
        color: '#fff',
        fontSize: 11, // Slightly smaller to ensure it fits
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3, // Slightly tighter letter spacing
        flexShrink: 0, // Prevent text from shrinking
        textAlign: 'center',
    },

    editButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: '#ef4444',
        alignItems: 'center',
        justifyContent: 'center',
    },

    leaveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: '#ef4444',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        minWidth: 80,
        justifyContent: 'center',
    },

    leaveButtonText: {
        color: '#ef4444',
        fontSize: 12,
        fontWeight: '600',
    },

    // Main Content Styles
    mainContent: {
        gap: 20,
    },

    titleSection: {
        alignItems: 'center',
    },

    activityTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
        fontFamily: 'Montserrat_700Bold', // You might need to adjust this
    },

    dateTimeRow: {
        flexDirection: 'row',
        gap: 16,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },

    dateTimeItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    dateTimeText: {
        color: '#cbd5e1',
        fontSize: 14,
        fontWeight: '500',
    },

    // Host Section Styles
    hostSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    hostAvatar: {
        position: 'relative',
    },

    hostImage: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 3,
        borderColor: '#8b5cf6',
    },

    hostBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#201925',
    },

    hostInfo: {
        flex: 1,
        minWidth: 0,
    },

    hostName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'Montserrat_600SemiBold', // You might need to adjust this
    },

    welcomeMessage: {
        fontSize: 14,
        color: '#cbd5e1',
        lineHeight: 20,
        fontStyle: 'italic',
    },

    // Help Modal Styles
    helpOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    helpModal: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    helpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },

    helpTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'Montserrat_600SemiBold',
    },

    helpContent: {
        padding: 20,
        maxHeight: 300,
    },

    stepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },

    stepDescription: {
        fontSize: 14,
        color: '#cbd5e1',
        lineHeight: 20,
    },

    helpNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
        gap: 12,
    },

    navButton: {
        backgroundColor: '#8b5cf6',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 10,
        flex: 1,
        alignItems: 'center',
    },

    navButtonDisabled: {
        backgroundColor: '#64748b',
    },

    navButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    navButtonTextDisabled: {
        color: '#94a3b8',
    },
})