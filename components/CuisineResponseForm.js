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
    Utensils,
    Coffee,
    Wine,
    ChefHat,
    Beef,
    Fish,
    Pizza,
    Cherry,
    Heart,
    Trees,
    Users,
    Home,
    Building,
    Waves,
    Landmark,
    DollarSign,
    CreditCard,
    Crown,
    Target,
    X
} from 'lucide-react-native'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

const { width: screenWidth } = Dimensions.get('window')


export default function CuisineResponseForm({
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
        return activity?.allow_participant_time_selection ? 5 : 4
    }

    const percent = (step / getTotalSteps()) * 100

    // Form state
    const [selectedCuisine, setSelectedCuisine] = useState('')
    const [selectedAtmosphere, setSelectedAtmosphere] = useState('')
    const [selectedBudget, setSelectedBudget] = useState('')
    const [dietary, setDietary] = useState(guestMode ? '' : (user?.preferences || ''))
    const [useSavedPreferences, setUseSavedPreferences] = useState(true)
    const [availability, setAvailability] = useState({})
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTimes, setSelectedTimes] = useState([])

    // Cuisine options with icons
    const cuisineOptions = [
        { label: 'Italian', icon: Pizza, desc: 'Pasta, pizza, risotto' },
        { label: 'Mexican', icon: ChefHat, desc: 'Tacos, burritos, quesadillas' },
        { label: 'Chinese', icon: Utensils, desc: 'Stir-fry, dim sum, noodles' },
        { label: 'Japanese', icon: Fish, desc: 'Sushi, ramen, tempura' },
        { label: 'Indian', icon: ChefHat, desc: 'Curry, naan, biryani' },
        { label: 'Thai', icon: Cherry, desc: 'Pad thai, curry, spring rolls' },
        { label: 'Mediterranean', icon: Cherry, desc: 'Hummus, falafel, kebabs' },
        { label: 'American', icon: Beef, desc: 'Burgers, steaks, BBQ' },
        { label: 'Surprise me!', icon: Target, desc: 'Any cuisine preference' }
    ]

    const atmosphereOptions = [
        { label: 'Casual', icon: Coffee, desc: 'Relaxed & comfortable' },
        { label: 'Trendy', icon: Wine, desc: 'Modern & stylish' },
        { label: 'Romantic', icon: Heart, desc: 'Intimate & cozy' },
        { label: 'Outdoor', icon: Trees, desc: 'Patio & garden seating' },
        { label: 'Family Friendly', icon: Users, desc: 'Great for all ages' },
        { label: 'Cozy', icon: Home, desc: 'Warm & inviting' },
        { label: 'Rooftop', icon: Building, desc: 'City views & fresh air' },
        { label: 'Waterfront', icon: Waves, desc: 'Ocean or lake views' },
        { label: 'Historic', icon: Landmark, desc: 'Classic & traditional' }
    ]

    const budgetOptions = [
        { label: 'No preference', icon: Target, desc: 'Any price range' },
        { label: 'Budget-friendly', icon: DollarSign, desc: 'Value dining' },
        { label: 'Mid-range', icon: CreditCard, desc: 'Nice sit-down meals' },
        { label: 'Prefer upscale', icon: Crown, desc: 'Fine dining experience' }
    ]

    const timeSlots = [
        '8:00 AM', '9:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
        '1:00 PM', '2:00 PM', '3:00 PM', '4:00 PM', '5:00 PM',
        '6:00 PM', '7:00 PM', '8:00 PM', '9:00 PM', '10:00 PM'
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
                    title: 'Cuisine Preferences',
                    subtitle: 'What flavors are calling to you?'
                }
            case 2:
                return {
                    title: 'Dining Atmosphere',
                    subtitle: 'Set the mood for your experience'
                }
            case 3:
                return {
                    title: 'Budget Range',
                    subtitle: 'What works for your wallet?'
                }
            case 4:
                return {
                    title: 'Dietary Needs',
                    subtitle: 'Any special requirements? (optional)'
                }
            case 5:
                return {
                    title: 'Your Availability',
                    subtitle: 'When can you join the feast?'
                }
            default:
                return { title: '', subtitle: '' }
        }
    }

    // Handlers
    const handleCuisineSelect = (cuisine) => {
        setSelectedCuisine(cuisine)
    }

    const handleAtmosphereSelect = (atmosphere) => {
        setSelectedAtmosphere(atmosphere)
    }

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
        if (step === 1) return !selectedCuisine
        if (step === 2) return !selectedAtmosphere
        if (step === 3) return !selectedBudget
        if (step === 4) return false
        if (step === 5 && activity?.allow_participant_time_selection) {
            return Object.keys(availability).length === 0
        }
        return false
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
        // Use saved preferences if the user hasn't changed them
        const finalDietary = useSavedPreferences && user?.preferences ? user.preferences : dietary
        
        const notes = `Dining Preferences:
🍽️ Cuisine: ${selectedCuisine}
🏠 Atmosphere: ${selectedAtmosphere}
💰 Budget: ${selectedBudget}
🥗 Dietary Needs: ${finalDietary || 'None'}`.trim()

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

            Alert.alert('Success!', 'Your response has been submitted!')
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
                            {cuisineOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        selectedCuisine === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => handleCuisineSelect(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        selectedCuisine === option.label && styles.singleSelectLabelSelected
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
                            {atmosphereOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        selectedAtmosphere === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => handleAtmosphereSelect(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        selectedAtmosphere === option.label && styles.singleSelectLabelSelected
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
                            {budgetOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        selectedBudget === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => setSelectedBudget(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        selectedBudget === option.label && styles.singleSelectLabelSelected
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
                        {user?.preferences && !guestMode && useSavedPreferences ? (
                            <View style={styles.savedPreferencesContainer}>
                                <View style={styles.savedPreferencesHeader}>
                                    <Text style={styles.savedPreferencesTitle}>Using saved preferences</Text>
                                </View>
                                <View style={styles.savedPreferencesContent}>
                                    <Text style={styles.savedPreferencesText}>{user.preferences}</Text>
                                </View>
                                <View style={styles.preferencesActions}>
                                    <TouchableOpacity 
                                        style={styles.changePreferencesButton}
                                        onPress={() => {
                                            setUseSavedPreferences(false)
                                            setDietary('')
                                        }}
                                    >
                                        <Text style={styles.changePreferencesText}>Change preferences</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity 
                                        style={styles.noPreferencesButton}
                                        onPress={() => {
                                            setUseSavedPreferences(false)
                                            setDietary('No dietary restrictions')
                                        }}
                                    >
                                        <Text style={styles.noPreferencesText}>No preferences</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <TextInput
                                style={styles.notesInput}
                                placeholder="e.g., Vegetarian, No nuts, Gluten-free, Keto..."
                                placeholderTextColor="#999"
                                value={dietary}
                                onChangeText={setDietary}
                                multiline
                                numberOfLines={4}
                                textAlignVertical="top"
                                returnKeyType="done"
                                onSubmitEditing={() => Keyboard.dismiss()}
                            />
                        )}
                    </Animated.View>
                )

            case 5:
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
                                            <X color="#cc31e8" size={12} />
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
        gap: 8,
        marginBottom: 20,
    },

    compactCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        minWidth: (screenWidth - 72) / 3,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 70,
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
        width: (screenWidth - 48 - 12) / 2, // Calculate width for 2 columns with gap
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
        fontSize: 14,
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

    budgetGrid: {
        gap: 12,
    },

    budgetCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    budgetCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    budgetEmoji: {
        fontSize: 24,
        marginBottom: 8,
    },

    budgetLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },

    budgetLabelSelected: {
        color: '#cc31e8',
    },

    budgetDesc: {
        fontSize: 12,
        color: '#999',
    },

    customSection: {
        marginBottom: 20,
    },

    customInputRow: {
        flexDirection: 'row',
        gap: 8,
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

    notesInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        fontFamily: 'Montserrat_400Regular',
        minHeight: 120,
        textAlignVertical: 'top',
    },

    savedPreferencesContainer: {
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        padding: 16,
    },

    savedPreferencesHeader: {
        marginBottom: 12,
    },

    savedPreferencesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#A855F7',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    savedPreferencesContent: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 16,
    },

    savedPreferencesText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        fontFamily: 'Montserrat_400Regular',
    },

    preferencesActions: {
        flexDirection: 'row',
        gap: 12,
    },

    changePreferencesButton: {
        flex: 1,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },

    changePreferencesText: {
        color: '#A855F7',
        fontSize: 14,
        fontWeight: '600',
    },

    noPreferencesButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        paddingVertical: 12,
        alignItems: 'center',
    },

    noPreferencesText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '600',
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

})