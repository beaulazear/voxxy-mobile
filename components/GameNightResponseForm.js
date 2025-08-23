import React, { useState, useContext, useEffect } from 'react'
import {
    Modal,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    StyleSheet,
    Keyboard,
    Animated,
    Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import * as Haptics from 'expo-haptics'
import {
    FormStyles,
    GradientButton,
    GradientCard,
    gradientConfigs
} from '../styles/FormStyles'
import {
    Gamepad2,
    Dice6,
    CreditCard,
    Users,
    Brain,
    Shuffle,
    Trophy,
    Target,
    Smile,
    HandHeart,
    Zap,
    Clock3,
    Timer,
    Calendar,
    Monitor,
    Smartphone,
    Layers
} from 'lucide-react-native'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

const { width: screenWidth } = Dimensions.get('window')

const X = () => <Text style={styles.miniIcon}>×</Text>

export default function GameNightResponseForm({
    visible,
    onClose,
    activityId,
    onResponseComplete,
    guestMode = false,
    guestToken = null,
    guestEmail = null,
    guestActivity = null
}) {
    const { user, setUser } = useContext(UserContext)
    const [step, setStep] = useState(1)
    const [activity, setActivity] = useState(guestActivity)
    const [fadeAnim] = useState(new Animated.Value(0))

    // Dynamic total steps based on whether availability is needed
    const getTotalSteps = () => {
        return activity?.allow_participant_time_selection ? 6 : 5
    }

    const percent = (step / getTotalSteps()) * 100

    // Form state
    const [gameType, setGameType] = useState('')
    const [competitiveness, setCompetitiveness] = useState('')
    const [complexity, setComplexity] = useState('')
    const [duration, setDuration] = useState('')
    const [setup, setSetup] = useState('')
    const [availability, setAvailability] = useState({})
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTimes, setSelectedTimes] = useState([])

    // Game night options
    const gameTypeOptions = [
        { label: 'Video games', icon: Gamepad2, desc: 'Console, PC, mobile' },
        { label: 'Board games', icon: Dice6, desc: 'Traditional tabletop' },
        { label: 'Card games', icon: CreditCard, desc: 'Playing cards, poker' },
        { label: 'Party games', icon: Users, desc: 'Group party games' },
        { label: 'Trivia', icon: Brain, desc: 'Quiz and knowledge games' },
        { label: 'Mix of everything', icon: Shuffle, desc: 'Any type of game' }
    ]

    const competitivenessOptions = [
        { label: 'Ultra competitive - I play to win', icon: Trophy, desc: 'Victory is everything' },
        { label: 'Moderately competitive', icon: Target, desc: 'I like to win but have fun' },
        { label: 'Just for fun', icon: Smile, desc: 'Relaxed and casual' },
        { label: 'Prefer cooperative games', icon: HandHeart, desc: 'Work together, not compete' },
        { label: "Don't care about winning", icon: Zap, desc: 'Just here for the experience' }
    ]

    const complexityOptions = [
        { label: 'Simple and quick', icon: Zap, desc: 'Easy to learn and play' },
        { label: 'Medium complexity', icon: Target, desc: 'Some strategy involved' },
        { label: 'Complex strategy games', icon: Brain, desc: 'Deep thinking required' },
        { label: 'Mix of simple and complex', icon: Shuffle, desc: 'Variety throughout night' },
        { label: 'Whatever the group wants', icon: Users, desc: 'Go with the flow' }
    ]

    const durationOptions = [
        { label: 'Quick games (30 min)', icon: Zap, desc: 'Short and sweet' },
        { label: 'Medium sessions (1-2 hours)', icon: Clock3, desc: 'Standard gaming time' },
        { label: 'Long sessions (3+ hours)', icon: Timer, desc: 'Extended gameplay' },
        { label: 'All day gaming', icon: Calendar, desc: 'Epic gaming marathon' },
        { label: 'Flexible timing', icon: Shuffle, desc: 'Go with the flow' }
    ]

    const setupOptions = [
        { label: 'Console gaming', icon: Gamepad2, desc: 'Xbox, PlayStation, Nintendo' },
        { label: 'PC gaming', icon: Monitor, desc: 'Computer gaming setup' },
        { label: 'Mobile games', icon: Smartphone, desc: 'Phone and tablet games' },
        { label: 'Traditional tabletop', icon: Dice6, desc: 'Board games and cards' },
        { label: 'Mix of digital and physical', icon: Layers, desc: 'Best of both worlds' },
        { label: 'No preference', icon: Shuffle, desc: 'Open to anything' }
    ]


    // Evening time slots for game nights
    const timeSlots = [
        '6:00 PM', '6:30 PM', '7:00 PM', '7:30 PM', '8:00 PM', '8:30 PM',
        '9:00 PM', '9:30 PM', '10:00 PM', '10:30 PM', '11:00 PM'
    ]

    // Animate step transitions
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [step])

    // Fetch activity data
    useEffect(() => {
        if (guestMode && guestActivity) {
            setActivity(guestActivity)
            return
        }

        const fetchActivity = async () => {
            try {
                const response = await fetch(`${API_URL}/activities/${activityId}`, {
                    credentials: guestMode ? 'omit' : 'include'
                })
                const data = await response.json()

                let foundActivity = null
                if (data.participant_activities) {
                    foundActivity = data.participant_activities.find(pa => pa.id === parseInt(activityId))
                }
                if (!foundActivity && data.activities) {
                    foundActivity = data.activities.find(act => act.id === parseInt(activityId))
                }
                setActivity(foundActivity || data)
            } catch (error) {
                logger.error('Error fetching activity:', error)
            }
        }

        fetchActivity()
    }, [activityId, guestMode, guestActivity])

    // Step content
    const getStepContent = () => {
        switch (step) {
            case 1:
                return {
                    title: 'What type of games do you enjoy most?',
                    subtitle: 'Select your preferred game category'
                }
            case 2:
                return {
                    title: 'How competitive are you?',
                    subtitle: 'Tell us about your competitive spirit'
                }
            case 3:
                return {
                    title: "What's your preferred game complexity?",
                    subtitle: 'How complex do you like your games?'
                }
            case 4:
                return {
                    title: 'How long do you want to play?',
                    subtitle: 'What duration works best for you?'
                }
            case 5:
                return {
                    title: "What's your gaming setup preference?",
                    subtitle: 'Which platforms do you prefer?'
                }
            case 6:
                return {
                    title: 'Your Availability',
                    subtitle: 'When can you join the game night?'
                }
            default:
                return { title: '', subtitle: '' }
        }
    }

    // Handlers

    // Availability handlers
    const handleDateChange = (date) => {
        setSelectedDate(date)
        setSelectedTimes(availability[date] || [])
    }

    const handleTimeToggle = (time) => {
        const newTimes = selectedTimes.includes(time)
            ? selectedTimes.filter(t => t !== time)
            : [...selectedTimes, time]
        setSelectedTimes(newTimes)
    }

    const addAvailability = () => {
        if (selectedDate && selectedTimes.length > 0) {
            setAvailability(prev => ({
                ...prev,
                [selectedDate]: selectedTimes
            }))
            setSelectedDate('')
            setSelectedTimes([])
        }
    }

    const removeAvailability = (date) => {
        setAvailability(prev => {
            const newAvailability = { ...prev }
            delete newAvailability[date]
            return newAvailability
        })
    }


    // Validation
    const isNextDisabled = () => {
        switch (step) {
            case 1: return gameType === ''
            case 2: return competitiveness === ''
            case 3: return complexity === ''
            case 4: return duration === ''
            case 5: return setup === ''
            case 6: return activity?.allow_participant_time_selection && Object.keys(availability).length === 0
            default: return false
        }
    }

    // Navigation
    const handleNext = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        } catch (e) {
            // Haptics not available
        }
        const totalSteps = getTotalSteps()
        if (step < totalSteps) {
            fadeAnim.setValue(0)
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } catch (e) {
            // Haptics not available
        }
        if (step > 1) {
            fadeAnim.setValue(0)
            setStep(step - 1)
        }
    }

    // Submission
    const handleSubmit = async () => {
        const notes = `Game Night Preferences:
🎮 Game Type: ${gameType}
🏆 Competitiveness: ${competitiveness}
🎯 Game Complexity: ${complexity}
⏰ Session Duration: ${duration}
🖥️ Gaming Setup: ${setup}`.trim()

        try {
            let endpoint, requestOptions

            if (guestMode) {
                endpoint = `${API_URL}/activities/${activityId}/respond/${guestToken}`
                requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        response: {
                            notes,
                            ...(activity?.allow_participant_time_selection && { availability })
                        },
                    }),
                }
            } else {
                endpoint = `${API_URL}/responses`
                requestOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({
                        response: {
                            notes,
                            activity_id: activityId,
                            ...(activity?.allow_participant_time_selection && { availability })
                        },
                    }),
                }
            }

            const res = await fetch(endpoint, requestOptions)

            if (!res.ok) {
                const errorData = await res.json()
                logger.error('❌ Failed to save response:', errorData)
                Alert.alert('Error', 'Failed to submit response. Please try again.')
                return
            }

            const data = await res.json()

            // Update user state for authenticated users
            if (!guestMode && user) {
                const { response: newResponse, comment: newComment } = data

                setUser(prev => {
                    const activities = prev.activities.map(act => {
                        if (act.id === activityId) {
                            const filteredResponses = (act.responses || []).filter(
                                response => response.user_id !== user.id
                            )
                            const filteredComments = (act.comments || []).filter(
                                comment => comment.user_id !== user.id
                            )

                            return {
                                ...act,
                                responses: [...filteredResponses, newResponse],
                                comments: [...filteredComments, newComment],
                            }
                        }
                        return act
                    })

                    const participant_activities = prev.participant_activities.map(pa => {
                        if (pa.activity.id === activityId) {
                            const filteredResponses = (pa.activity.responses || []).filter(
                                response => response.user_id !== user.id
                            )
                            const filteredComments = (pa.activity.comments || []).filter(
                                comment => comment.user_id !== user.id
                            )

                            return {
                                ...pa,
                                activity: {
                                    ...pa.activity,
                                    responses: [...filteredResponses, newResponse],
                                    comments: [...filteredComments, newComment],
                                },
                            }
                        }
                        return pa
                    })

                    return {
                        ...prev,
                        activities,
                        participant_activities,
                    }
                })

                if (onResponseComplete) {
                    onResponseComplete(newResponse, newComment)
                }
            } else if (onResponseComplete) {
                onResponseComplete()
            }

            Alert.alert('Success!', 'Your game night preferences have been submitted!')
            onClose()

        } catch (error) {
            logger.error('❌ Error submitting response:', error)
            Alert.alert('Error', 'Failed to submit response. Please try again.')
        }
    }

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        { width: `${percent}%` }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                {step} of {getTotalSteps()}
            </Text>
        </View>
    )


    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {gameTypeOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        gameType === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setGameType(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        gameType === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {competitivenessOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        competitiveness === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setCompetitiveness(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        competitiveness === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 3:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {complexityOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        complexity === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setComplexity(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        complexity === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {durationOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        duration === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setDuration(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        duration === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 5:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {setupOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        setup === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setSetup(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        setup === option.label && styles.singleSelectLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.singleSelectDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 6:
                if (!activity?.allow_participant_time_selection) return null

                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.dateSection}>
                            <Text style={styles.sectionLabel}>Select Date</Text>
                            <TextInput
                                style={styles.dateInput}
                                value={selectedDate}
                                onChangeText={handleDateChange}
                                placeholder="YYYY-MM-DD"
                                placeholderTextColor="#999"
                            />
                        </View>

                        {selectedDate && (
                            <>
                                <View style={styles.timeSection}>
                                    <Text style={styles.sectionLabel}>
                                        Available Times ({new Date(selectedDate).toLocaleDateString()})
                                    </Text>
                                    <View style={styles.timeGrid}>
                                        {timeSlots.map(time => (
                                            <TouchableOpacity
                                                key={time}
                                                style={[
                                                    styles.timeChip,
                                                    selectedTimes.includes(time) && styles.timeChipSelected
                                                ]}
                                                onPress={() => handleTimeToggle(time)}
                                            >
                                                <Text style={[
                                                    styles.timeChipText,
                                                    selectedTimes.includes(time) && styles.timeChipTextSelected
                                                ]}>
                                                    {time}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {selectedTimes.length > 0 && (
                                        <TouchableOpacity
                                            style={styles.addTimeButton}
                                            onPress={addAvailability}
                                        >
                                            <Text style={styles.addTimeText}>
                                                Add Date ({selectedTimes.length} times)
                                            </Text>
                                        </TouchableOpacity>
                                    )}
                                </View>
                            </>
                        )}

                        {Object.keys(availability).length > 0 && (
                            <View style={styles.availabilitySection}>
                                <Text style={styles.sectionLabel}>Your Availability</Text>
                                {Object.entries(availability).map(([date, times]) => (
                                    <View key={date} style={styles.availabilityItem}>
                                        <View style={styles.availabilityInfo}>
                                            <Text style={styles.availabilityDate}>
                                                {new Date(date).toLocaleDateString()}
                                            </Text>
                                            <Text style={styles.availabilityTimes}>
                                                {times.join(', ')}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.removeButton}
                                            onPress={() => removeAvailability(date)}
                                        >
                                            <X />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}
                    </Animated.View>
                )

            default:
                return null
        }
    }

    const { title, subtitle } = getStepContent()

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {renderProgressBar()}

                <View style={styles.header}>
                    <Text style={styles.title}>{title}</Text>
                    <Text style={styles.subtitle}>{subtitle}</Text>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    keyboardDismissMode="on-drag"
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.backButton, step === 1 && styles.backButtonDisabled]}
                        onPress={step > 1 ? handleBack : null}
                        disabled={step === 1}
                    >
                        <Text style={[styles.backButtonText, step === 1 && styles.backButtonTextDisabled]}>
                            Back
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.nextButton, isNextDisabled() && styles.nextButtonDisabled]}
                        onPress={handleNext}
                        disabled={isNextDisabled()}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#9b1dbd']}
                            style={styles.nextButtonGradient}
                        >
                            <Text style={styles.nextButtonText}>
                                {step < getTotalSteps() ? 'Next' : 'Submit'}
                            </Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },

    progressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },

    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 2,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    progressText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '500',
        fontFamily: 'Montserrat_500Medium',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        minWidth: 40,
        textAlign: 'right',
    },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    title: {
        fontSize: 32,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        color: '#999',
        lineHeight: 22,
    },

    content: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    stepContainer: {
        flex: 1,
    },

    compactGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginHorizontal: -4,
        marginBottom: 20,
    },

    compactCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        width: (screenWidth - 64) / 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 75,
        marginHorizontal: 4,
        marginBottom: 8,
    },

    compactCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    compactEmoji: {
        fontSize: 20,
        marginBottom: 4,
    },

    compactLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 14,
    },

    compactLabelSelected: {
        color: '#cc31e8',
    },

    singleSelectGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },

    singleSelectCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        width: (screenWidth - 48 - 12) / 2, // 2 columns with gap
    },

    singleSelectCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderWidth: 2,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },


    singleSelectLabel: {
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    singleSelectLabelSelected: {
        color: '#cc31e8',
    },

    singleSelectDesc: {
        fontSize: 12,
        fontFamily: 'Montserrat_400Regular',
        color: '#999',
        textAlign: 'center',
    },

    customGameSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },

    customGameTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    customInputRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },

    customInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },

    customAddButton: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 8,
        width: 40,
        height: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },

    customAddButtonDisabled: {
        opacity: 0.5,
    },

    customGamesList: {
        gap: 6,
    },

    customGameItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 8,
    },

    customGameText: {
        color: '#fff',
        fontSize: 14,
        flex: 1,
    },

    removeGameButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.2)',
        borderRadius: 4,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    selectedContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },

    selectedTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    compactPillContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    compactPill: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 6,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    compactPillText: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '500',
    },

    compactPillRemove: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'rgba(204, 49, 232, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    durationGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 24,
    },

    durationCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        minWidth: (screenWidth - 72) / 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 60,
    },

    durationCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    durationEmoji: {
        fontSize: 18,
        marginBottom: 4,
    },

    durationLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 14,
    },

    durationLabelSelected: {
        color: '#cc31e8',
    },

    sectionSubtitle: {
        fontSize: 16,
        color: '#999',
        marginBottom: 16,
        textAlign: 'center',
    },

    notesInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 120,
        textAlignVertical: 'top',
    },

    dateSection: {
        marginBottom: 20,
    },

    timeSection: {
        marginBottom: 20,
    },

    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
        color: '#cc31e8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    dateInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },

    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },

    timeChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingHorizontal: 8,
        paddingVertical: 6,
    },

    timeChipSelected: {
        backgroundColor: '#cc31e8',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },

    timeChipText: {
        color: '#ccc',
        fontSize: 11,
        fontWeight: '500',
    },

    timeChipTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },

    addTimeButton: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
    },

    addTimeText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
    },

    availabilitySection: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
    },

    availabilityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderRadius: 16,
        padding: 12,
        marginBottom: 6,
    },

    availabilityInfo: {
        flex: 1,
    },

    availabilityDate: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },

    availabilityTimes: {
        color: '#ccc',
        fontSize: 12,
    },

    removeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.2)',
        borderRadius: 4,
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },

    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 8,
    },

    closeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.12)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 69, 69, 0.5)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        minHeight: 52,
        justifyContent: 'center',
    },

    closeButtonText: {
        color: '#ff4545',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },

    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        minHeight: 52,
        justifyContent: 'center',
    },

    backButtonDisabled: {
        opacity: 0.5,
    },

    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },

    backButtonTextDisabled: {
        color: '#666',
    },

    nextButton: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        minHeight: 52,
    },

    nextButtonDisabled: {
        opacity: 0.5,
    },

    nextButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },

    miniIcon: {
        fontSize: 12,
        color: '#cc31e8',
    },
})