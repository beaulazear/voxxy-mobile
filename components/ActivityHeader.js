import React, { useState, useEffect, useRef, useContext } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Animated
} from 'react-native'
import {
    ArrowLeft,
    Edit,
    Trash,
    LogOut,
    Star,
    Clock,
    Flag
} from 'react-native-feather'
import {
    Hamburger,
    Martini,
    Users,
    Dices
} from 'lucide-react-native'
import { useNavigation } from '@react-navigation/native'
import { UserContext } from '../context/UserContext'

import DefaultIcon from '../assets/icon.png'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { avatarMap } from '../utils/avatarManager';

const ACTIVITY_CONFIG = {
    'Restaurant': {
        displayText: 'Food',
        emoji: '🍜',
        icon: Hamburger,
        iconColor: '#FF6B6B',
        usesAIRecommendations: true
    },
    'Meeting': {
        displayText: 'Lets Meet!',
        emoji: '👥',
        icon: Users,
        iconColor: '#4ECDC4',
        usesAIRecommendations: true
    },
    'Cocktails': {
        displayText: 'Drinks',
        emoji: '🍸',
        icon: Martini,
        iconColor: '#4ECDC4',
        usesAIRecommendations: true
    },
    'Game Night': {
        displayText: 'Game Night',
        emoji: '🎮',
        icon: Dices,
        iconColor: '#A8E6CF',
        usesAIRecommendations: false
    }
}

// Helper function to get activity display info
function getActivityDisplayInfo(activityType) {
    return ACTIVITY_CONFIG[activityType] || {
        displayText: 'Lets Meet!',
        emoji: '👥',
        icon: Users,
        iconColor: '#4ECDC4',
        usesAIRecommendations: true
    }
}

// Helper function to get activity status info
function getActivityStatusInfo(activity) {
    const { active, collecting, voting, finalized, completed } = activity;
    const activityInfo = getActivityDisplayInfo(activity.activity_type);

    // Base info with activity type's icon but phase-based text
    const baseInfo = {
        icon: activityInfo.icon,
        color: activityInfo.iconColor,
        bgColor: `rgba(${parseInt(activityInfo.iconColor.slice(1, 3), 16)}, ${parseInt(activityInfo.iconColor.slice(3, 5), 16)}, ${parseInt(activityInfo.iconColor.slice(5, 7), 16)}, 0.15)`
    };

    if (completed) {
        return {
            ...baseInfo,
            text: 'Completed',
            color: '#28a745',
            bgColor: 'rgba(40, 167, 69, 0.15)'
        };
    }

    if (finalized) {
        return {
            ...baseInfo,
            text: 'Finalized',
            color: '#f39c12',
            bgColor: 'rgba(243, 156, 18, 0.15)'
        };
    }

    if (voting) {
        return {
            ...baseInfo,
            text: 'Voxxy Picks',
            color: '#cc31e8',
            bgColor: 'rgba(204, 49, 232, 0.15)'
        };
    }

    if (collecting) {
        return {
            ...baseInfo,
            text: 'Collecting',
            color: '#4ECDC4',
            bgColor: 'rgba(78, 205, 196, 0.15)'
        };
    }

    // Default/draft state - show activity type
    return {
        ...baseInfo,
        text: activityInfo.displayText
    };
}

// Helper function to safely get avatar (copied from ParticipantsSection)
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null
    } catch (error) {
        logger.debug(`⚠️ Avatar ${filename} not found in mapping`)
        return null
    }
}

// Export sticky header component
export function ActivityStickyHeader({ activity, isOwner, onBack, onEdit, onDelete, onLeave, onReport }) {
    const { user } = useContext(UserContext)
    const [isBouncing, setIsBouncing] = useState(true)
    const bounceAnim = useRef(new Animated.Value(0)).current
    const navigation = useNavigation()

    const activityInfo = getActivityDisplayInfo(activity.activity_type)
    const statusInfo = getActivityStatusInfo(activity)

    // Generic steps for all activity types
    // Status logic based on activity states: collecting, voting, finalized, completed
    const getStepStatus = (stepIndex) => {
        if (activity.completed) {
            return "completed";
        }

        if (activity.finalized) {
            // Steps 1-3 are done, step 4 (share) is active
            return stepIndex < 3 ? "completed" : stepIndex === 3 ? "active" : "pending";
        }

        if (activity.voting) {
            // Step 1 is done, step 2 is active, rest pending
            return stepIndex === 0 ? "completed" : stepIndex === 1 ? "active" : "pending";
        }

        if (activity.collecting) {
            // Step 1 is active, rest pending
            return stepIndex === 0 ? "active" : "pending";
        }

        // Default: all pending
        return "pending";
    };

    const steps = [
        {
            step: "1",
            icon: "✨",
            title: "Share Your Preferences",
            desc: "Invite your friends to gather multiple preferences through a quick, fun quiz, or submit your own preferences and share the activity later. The AI will use these inputs to create personalized recommendations.",
            status: getStepStatus(0)
        },
        {
            step: "2",
            icon: "🤖",
            title: "Generate Recommendations",
            desc: "Based on everyone's preferences, our AI curates perfect options tailored to your group. The host can swipe through recommendations and save favorites.",
            status: getStepStatus(1)
        },
        {
            step: "3",
            icon: "🎯",
            title: "Finalize or Save",
            desc: "Save your favorite recommendations for future reference or finalize the activity by selecting the winning option. Once finalized, everyone can see the chosen plan with all its details.",
            status: getStepStatus(2)
        },
        {
            step: "4",
            icon: "📅",
            title: "Share",
            desc: "Share the final plan with everyone! Send calendar invites, location details, and get ready for an amazing time together.",
            status: getStepStatus(3)
        }
    ]

    useEffect(() => {
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


    return (
        <>
            <View style={styles.stickyContainer}>
                <View style={styles.topActions}>
                    <View style={styles.leftActions}>
                        <TouchableOpacity style={styles.actionButton} onPress={onBack}>
                            <ArrowLeft stroke="#fff" width={20} height={20} />
                        </TouchableOpacity>

                        {onReport && activity.finalized && (
                            <TouchableOpacity
                                style={styles.reportButtonLeft}
                                onPress={onReport}
                            >
                                <Flag stroke="#FFA500" width={20} height={20} />
                            </TouchableOpacity>
                        )}
                    </View>

                    <View style={styles.centerContent}>
                        <View style={[
                            styles.activityStatusChip,
                            {
                                backgroundColor: statusInfo.bgColor,
                                borderColor: statusInfo.color
                            }
                        ]}>
                            <statusInfo.icon
                                color={statusInfo.color}
                                size={16}
                                strokeWidth={2}
                                style={styles.statusIcon}
                            />
                            <Text style={[
                                styles.activityStatusText,
                                { color: statusInfo.color }
                            ]}>
                                {statusInfo.text}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.rightActions}>
                        {isOwner ? (
                            <>
                                <TouchableOpacity
                                    style={[
                                        styles.editButton,
                                        activity.completed && styles.editButtonDisabled
                                    ]}
                                    onPress={activity.completed ? undefined : onEdit}
                                    disabled={activity.completed}
                                >
                                    <Edit
                                        stroke={activity.completed ? "#6c757d" : "#8b5cf6"}
                                        width={20}
                                        height={20}
                                    />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
                                    <Trash stroke="#ef4444" width={20} height={20} />
                                </TouchableOpacity>
                            </>
                        ) : (
                            <>
                                <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
                                    <LogOut stroke="#ef4444" width={18} height={18} />
                                    <Text style={styles.leaveButtonText}>Leave</Text>
                                </TouchableOpacity>
                            </>
                        )}
                    </View>
                </View>
            </View>
        </>
    )
}

export default function ActivityHeader({
    activity,
    isOwner,
    onBack,
    onEdit,
    onActivityUpdate
}) {
    const { user, setUser } = useContext(UserContext)
    const navigation = useNavigation()
    const token = user?.token

    // Format date from YYYY-MM-DD to readable format
    const formatActivityDate = (dateString) => {
        if (!dateString) return null;
        const [year, month, day] = dateString.split('-');
        const date = new Date(year, month - 1, day);
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
            year: 'numeric'
        });
    };

    // Extract and format time from datetime string
    const formatActivityTime = (timeString) => {
        if (!timeString) return null;
        // Extract time portion (assuming format like "2000-01-01T17:30:20.000Z")
        const timePart = timeString.split('T')[1];
        if (!timePart) return null;

        // Extract hours and minutes
        const [hours, minutes] = timePart.split(':');
        const hour = parseInt(hours, 10);
        const minute = parseInt(minutes, 10);

        // Convert to 12-hour format
        const period = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;

        // Format with or without minutes
        if (minute === 0) {
            return `${hour12} ${period}`;
        }
        return `${hour12}:${minute.toString().padStart(2, '0')} ${period}`;
    };

    // Updated getDisplayImage function with comprehensive avatar handling
    const getDisplayImage = (userObj) => {
        logger.debug(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        // Check for profile_pic_url first (full URL)
        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            logger.debug(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        // Check for avatar (relative path)
        if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
            // Extract filename from path if it includes directory
            const avatarFilename = userObj.avatar.includes('/')
                ? userObj.avatar.split('/').pop()
                : userObj.avatar

            logger.debug(`🎭 Looking for avatar: ${avatarFilename}`)

            // Check if we have this avatar in our mapping
            const mappedAvatar = getAvatarFromMap(avatarFilename)
            if (mappedAvatar) {
                logger.debug(`✅ Found avatar in mapping: ${avatarFilename}`)
                return mappedAvatar
            }

            // If it's a full URL, use it
            if (userObj.avatar.startsWith('http')) {
                logger.debug(`🌐 Using avatar URL: ${userObj.avatar}`)
                return { uri: userObj.avatar }
            }
        }

        // Fallback to default icon
        logger.debug(`🔄 Using default icon`)
        return DefaultIcon
    }


    return (
        <>
            {/* Main Content - only the scrollable parts */}
            <View style={styles.container}>
                <View style={styles.mainContent}>
                    {/* Title Section - Hide when voting (map view) */}
                    {!activity.voting && (
                        <View style={styles.titleWrapper}>
                            <View style={styles.titleSection}>
                                <Text style={styles.activityTitle}>
                                    {activity.finalized ? 'Activity Finalized' :
                                        activity.collecting ? `${activity.responses?.length || 0} Response${activity.responses?.length === 1 ? '' : 's'} Submitted` :
                                            activity.activity_name}
                                </Text>
                            </View>
                            {/* Subtitle based on activity state */}
                            {activity.finalized ? (
                                <Text style={styles.collectingSubtitle}>
                                    We hope you have a great time! 🎉
                                </Text>
                            ) : activity.collecting ? (
                                <Text style={styles.collectingSubtitle}>
                                    Share your preferences to get personalized recommendations
                                </Text>
                            ) : null}
                        </View>
                    )}

                    {/* Finalized Date/Time Section */}
                    {activity.finalized && (activity.date_day || activity.date_time) && (
                        <View style={styles.finalizedDateSection}>
                            <View style={styles.dateTimeCard}>
                                <View style={styles.dateTimeIcon}>
                                    <Clock stroke="#A855F7" width={20} height={20} />
                                </View>
                                <View style={styles.dateTimeContent}>
                                    {activity.date_day && (
                                        <Text style={styles.finalizedDate}>{formatActivityDate(activity.date_day)}</Text>
                                    )}
                                    {activity.date_time && (
                                        <Text style={styles.finalizedTime}>{formatActivityTime(activity.date_time)}</Text>
                                    )}
                                </View>
                            </View>
                        </View>
                    )}

                    {/* Host Section - show welcome message when not collecting */}
                    {(!isOwner || activity.finalized) && !activity.collecting && (
                        <View style={styles.hostSection}>
                            <View style={styles.hostAvatarContainer}>
                                <View style={styles.hostAvatar}>
                                    <Image
                                        source={getDisplayImage(activity.user)}
                                        style={styles.hostImage}
                                        defaultSource={DefaultIcon}
                                        onError={() => logger.debug(`❌ Avatar failed to load for ${activity.user?.name}`)}
                                        onLoad={() => logger.debug(`✅ Avatar loaded for ${activity.user?.name}`)}
                                    />
                                    <View style={styles.hostBadge}>
                                        <Star stroke="#fff" width={12} height={12} fill="#fff" />
                                    </View>
                                </View>
                                <Text style={styles.hostNameSubtle}>
                                    {activity.user?.name || 'Host'}
                                </Text>
                            </View>

                            <View style={styles.hostInfo}>
                                <Text style={styles.welcomeMessageTitle}>Welcome message</Text>
                                <Text style={styles.welcomeMessage}>
                                    {activity.welcome_message || "Welcome to this activity! Let's make it amazing together 🎉"}
                                </Text>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingHorizontal: 8,
        paddingTop: 8,
        paddingBottom: 16,
    },

    stickyContainer: {
        paddingHorizontal: 12, // Reduced padding for more content space
        paddingTop: 10,
        paddingBottom: 14,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#201925',
    },

    // Top Actions Styles
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        minHeight: 52, // Increased for better mobile tap targets
    },

    leftActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 0.3, // Much smaller to give more room to center
    },

    centerContent: {
        flex: 1, // Main content area
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },

    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 0.3, // Much smaller to give more room to center
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

    reportButtonLeft: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    activityStatusChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 999,
        borderWidth: 1.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        alignSelf: 'center',
    },

    statusIcon: {
        marginRight: -2, // Slightly closer to text
    },

    activityStatusText: {
        fontSize: 12, // Slightly smaller to ensure it fits
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.3, // Slightly tighter letter spacing
        flexShrink: 0, // Prevent text from shrinking
        textAlign: 'center',
    },

    editButton: {
        width: 44, // Increased touch target
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    editButtonDisabled: {
        backgroundColor: 'rgba(108, 117, 125, 0.1)',
        borderColor: '#6c757d',
        opacity: 0.5,
    },

    deleteButton: {
        width: 44, // Increased touch target
        height: 44,
        borderRadius: 14,
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

    reportButton: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderWidth: 1,
        borderColor: '#FFA500',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 8,
    },

    // Main Content Styles
    mainContent: {
        paddingHorizontal: 12,
        paddingVertical: 0,
    },

    titleWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },

    activityTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold', // You might need to adjust this
    },
    collectingSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        textAlign: 'center',
        marginTop: 6,
        paddingHorizontal: 20,
        lineHeight: 20,
    },

    // Finalized Date/Time Styles
    finalizedDateSection: {
        alignItems: 'center',
        marginTop: 16,
        marginBottom: 8,
    },
    dateTimeCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(168, 85, 247, 0.2)',
        gap: 12,
    },
    dateTimeIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dateTimeContent: {
        alignItems: 'flex-start',
    },
    finalizedDate: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 2,
    },
    finalizedTime: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
    },

    // Host Section Styles
    hostSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 16,
        paddingHorizontal: 8,
    },

    hostAvatarContainer: {
        alignItems: 'center',
        gap: 8,
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

    hostNameSubtle: {
        fontSize: 12,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        letterSpacing: 0.3,
    },

    welcomeMessageTitle: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        fontWeight: '500',
    },
    welcomeMessage: {
        fontSize: 14,
        color: '#e2e8f0',
        lineHeight: 20,
        fontStyle: 'italic',
    },

    // Help Modal Styles
    helpOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    helpModal: {
        backgroundColor: '#1a1420',
        borderRadius: 24,
        width: '100%',
        maxWidth: 420,
        height: '90%',
        maxHeight: 700,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
        overflow: 'hidden',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },

    helpGradientHeader: {
        paddingTop: 24,
        paddingBottom: 20,
        paddingHorizontal: 24,
    },

    helpHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },

    helpTitleContainer: {
        flex: 1,
    },

    helpTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    helpSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '400',
    },

    helpCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 16,
    },

    helpContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 32,
        paddingHorizontal: 20,
    },

    progressWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    progressDot: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    progressDotActive: {
        backgroundColor: '#8b5cf6',
        borderColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 8,
        elevation: 5,
    },

    progressDotCompleted: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },

    progressNumber: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '600',
    },

    progressLine: {
        width: 40,
        height: 2,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        marginHorizontal: -4,
    },

    progressLineCompleted: {
        backgroundColor: '#10b981',
    },

    stepContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },

    stepIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },

    stepIconActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: '#8b5cf6',
    },

    stepIconCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
    },

    stepIcon: {
        fontSize: 36,
    },

    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },

    stepNumber: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    stepStatusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },

    statusBadgeActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        borderColor: '#8b5cf6',
    },

    statusBadgeCompleted: {
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        borderColor: '#10b981',
    },

    stepStatusText: {
        fontSize: 11,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.6)',
        textTransform: 'uppercase',
    },

    statusTextActive: {
        color: '#8b5cf6',
    },

    statusTextCompleted: {
        color: '#10b981',
    },

    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },

    stepDescription: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.8)',
        lineHeight: 22,
        textAlign: 'center',
        paddingHorizontal: 20,
    },

    allStepsContainer: {
        marginTop: 24,
        paddingTop: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.1)',
    },

    allStepsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
    },

    overviewStep: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.05)',
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },

    overviewStepActive: {
        backgroundColor: 'rgba(139, 92, 246, 0.15)',
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },

    overviewStepIcon: {
        fontSize: 20,
        marginRight: 12,
    },

    overviewStepTitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
    },

    helpNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(139, 92, 246, 0.1)',
        backgroundColor: 'rgba(26, 20, 32, 0.95)',
        gap: 12,
    },

    navButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        gap: 8,
    },

    navButtonPrimary: {
        backgroundColor: '#8b5cf6',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },

    navButtonSecondary: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
    },

    navButtonDisabled: {
        opacity: 0.5,
    },

    navButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },

    navButtonTextPrimary: {
        color: '#fff',
    },

    navButtonTextSecondary: {
        color: '#8b5cf6',
    },

    navButtonTextDisabled: {
        color: '#64748b',
    },

    stepIndicator: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
    },

    stepIndicatorText: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '500',
    },
})