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
    Platform,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
    ArrowLeft,
    Edit,
    Trash,
    LogOut,
    HelpCircle,
    X,
    Star,
    Clock,
    CheckCircle,
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
import FinalizeActivityModal from './FinalizeActivityModal'

import DefaultIcon from '../assets/icon.png'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { avatarMap, getUserDisplayImage, getAvatarSource } from '../utils/avatarManager';

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
    
    if (completed) {
        return {
            text: 'Completed',
            icon: CheckCircle,
            color: '#28a745',
            bgColor: 'rgba(40, 167, 69, 0.15)'
        };
    }
    
    if (finalized) {
        return {
            text: 'Finalized',
            icon: Flag,
            color: '#f39c12',
            bgColor: 'rgba(243, 156, 18, 0.15)'
        };
    }
    
    if (voting) {
        return {
            text: 'Voting',
            icon: CheckCircle,
            color: '#cc31e8',
            bgColor: 'rgba(204, 49, 232, 0.15)'
        };
    }
    
    if (collecting) {
        return {
            text: 'Collecting',
            icon: Users,
            color: '#4ECDC4',
            bgColor: 'rgba(78, 205, 196, 0.15)'
        };
    }
    
    // Default/draft state
    return {
        text: 'Draft',
        icon: Clock,
        color: '#6c757d',
        bgColor: 'rgba(108, 117, 125, 0.15)'
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
export function ActivityStickyHeader({ activity, isOwner, onBack, onEdit, onDelete, onLeave }) {
    const { user } = useContext(UserContext)
    const [helpVisible, setHelpVisible] = useState(false)
    const [helpStep, setHelpStep] = useState(0)
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
            desc: "Everyone shares their preferences through a quick, fun quiz. Tell us what you like and the AI will use these inputs to create personalized recommendations for your group.",
            status: getStepStatus(0)
        },
        {
            step: "2",
            icon: "🤖",
            title: "Generate Recommendations",
            desc: "Based on everyone's preferences, our AI curates perfect options tailored to your group. The host can swipe through recommendations, save favorites, and regenerate if needed.",
            status: getStepStatus(1)
        },
        {
            step: "3",
            icon: "🎯",
            title: "Finalize Your Choice",
            desc: "The host selects the winning option from the AI recommendations. Once finalized, everyone can see the chosen plan with all its details.",
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

    const handleHelpClose = () => {
        setHelpStep(0)
        setHelpVisible(false)
    }

    return (
        <>
            <View style={styles.stickyContainer}>
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
                            <TouchableOpacity style={styles.leaveButton} onPress={onLeave}>
                                <LogOut stroke="#ef4444" width={18} height={18} />
                                <Text style={styles.leaveButtonText}>Leave</Text>
                            </TouchableOpacity>
                        )}
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
                        <LinearGradient
                            colors={['#8b5cf6', '#7c3aed']}
                            style={styles.helpGradientHeader}
                        >
                            <View style={styles.helpHeader}>
                                <View style={styles.helpTitleContainer}>
                                    <Text style={styles.helpTitle}>How It Works</Text>
                                    <Text style={styles.helpSubtitle}>Your journey to the perfect plan</Text>
                                </View>
                                <TouchableOpacity style={styles.helpCloseButton} onPress={handleHelpClose}>
                                    <X stroke="#fff" width={20} height={20} />
                                </TouchableOpacity>
                            </View>
                        </LinearGradient>

                        <ScrollView style={styles.helpContent} showsVerticalScrollIndicator={false}>
                            {/* Progress Indicator */}
                            <View style={styles.progressContainer}>
                                {steps.map((_, index) => (
                                    <View key={index} style={styles.progressWrapper}>
                                        <TouchableOpacity
                                            style={[
                                                styles.progressDot,
                                                index === helpStep && styles.progressDotActive,
                                                index < helpStep && styles.progressDotCompleted
                                            ]}
                                            onPress={() => setHelpStep(index)}
                                        >
                                            {index < helpStep ? (
                                                <CheckCircle stroke="#fff" width={12} height={12} />
                                            ) : (
                                                <Text style={styles.progressNumber}>{index + 1}</Text>
                                            )}
                                        </TouchableOpacity>
                                        {index < steps.length - 1 && (
                                            <View style={[
                                                styles.progressLine,
                                                index < helpStep && styles.progressLineCompleted
                                            ]} />
                                        )}
                                    </View>
                                ))}
                            </View>

                            {/* Current Step Content */}
                            <View style={styles.stepContainer}>
                                <View style={[
                                    styles.stepIconContainer,
                                    steps[helpStep].status === 'active' && styles.stepIconActive,
                                    steps[helpStep].status === 'completed' && styles.stepIconCompleted
                                ]}>
                                    <Text style={styles.stepIcon}>{steps[helpStep].icon}</Text>
                                </View>
                                
                                <View style={styles.stepHeader}>
                                    <Text style={styles.stepNumber}>Step {steps[helpStep].step}</Text>
                                    <View style={[
                                        styles.stepStatusBadge,
                                        steps[helpStep].status === 'active' && styles.statusBadgeActive,
                                        steps[helpStep].status === 'completed' && styles.statusBadgeCompleted
                                    ]}>
                                        <Text style={[
                                            styles.stepStatusText,
                                            steps[helpStep].status === 'active' && styles.statusTextActive,
                                            steps[helpStep].status === 'completed' && styles.statusTextCompleted
                                        ]}>
                                            {steps[helpStep].status === 'active' ? 'Current' : 
                                             steps[helpStep].status === 'completed' ? 'Done' : 'Upcoming'}
                                        </Text>
                                    </View>
                                </View>
                                
                                <Text style={styles.stepTitle}>{steps[helpStep].title}</Text>
                                <Text style={styles.stepDescription}>{steps[helpStep].desc}</Text>
                            </View>

                            {/* All Steps Overview */}
                            <View style={styles.allStepsContainer}>
                                <Text style={styles.allStepsTitle}>Quick Overview</Text>
                                {steps.map((step, index) => (
                                    <TouchableOpacity
                                        key={index}
                                        style={[
                                            styles.overviewStep,
                                            index === helpStep && styles.overviewStepActive
                                        ]}
                                        onPress={() => setHelpStep(index)}
                                    >
                                        <Text style={styles.overviewStepIcon}>{step.icon}</Text>
                                        <Text style={styles.overviewStepTitle}>{step.title}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </ScrollView>

                        <View style={styles.helpNavigation}>
                            <TouchableOpacity
                                style={[styles.navButton, styles.navButtonSecondary, helpStep === 0 && styles.navButtonDisabled]}
                                onPress={() => setHelpStep(s => Math.max(0, s - 1))}
                                disabled={helpStep === 0}
                            >
                                <ArrowLeft stroke={helpStep === 0 ? '#64748b' : '#8b5cf6'} width={18} height={18} />
                                <Text style={[styles.navButtonText, styles.navButtonTextSecondary, helpStep === 0 && styles.navButtonTextDisabled]}>
                                    Back
                                </Text>
                            </TouchableOpacity>

                            <View style={styles.stepIndicator}>
                                <Text style={styles.stepIndicatorText}>{helpStep + 1} of {steps.length}</Text>
                            </View>

                            <TouchableOpacity
                                style={[styles.navButton, styles.navButtonPrimary]}
                                onPress={() => {
                                    if (helpStep < steps.length - 1) {
                                        setHelpStep(s => s + 1)
                                    } else {
                                        handleHelpClose()
                                    }
                                }}
                            >
                                <Text style={[styles.navButtonText, styles.navButtonTextPrimary]}>
                                    {helpStep < steps.length - 1 ? 'Next' : 'Got it!'}
                                </Text>
                                {helpStep < steps.length - 1 && (
                                    <ArrowLeft 
                                        stroke="#fff" 
                                        width={18} 
                                        height={18} 
                                        style={{ transform: [{ rotate: '180deg' }] }}
                                    />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
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
                    {/* Title Section */}
                    <View style={styles.titleSection}>
                        {ACTIVITY_CONFIG[activity.activity_type] && (() => {
                            const IconComponent = ACTIVITY_CONFIG[activity.activity_type].icon;
                            return (
                                <IconComponent
                                    color={ACTIVITY_CONFIG[activity.activity_type].iconColor}
                                    size={24}
                                    strokeWidth={2}
                                />
                            );
                        })()}
                        <Text style={styles.activityTitle}>{activity.activity_name}</Text>
                    </View>

                    {/* Host Section - only show to participants during collecting/voting phases */}
                    {(!isOwner || activity.finalized) && (
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
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#201925',
    },

    // Top Actions Styles
    topActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
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
        width: 40,
        height: 40,
        borderRadius: 12,
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
        gap: 32,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    titleSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },

    activityTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold', // You might need to adjust this
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