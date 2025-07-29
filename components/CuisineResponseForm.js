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
import {
    FormStyles,
    GradientButton,
    GradientCard,
    gradientConfigs
} from '../styles/FormStyles'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

const { width: screenWidth } = Dimensions.get('window')

// Minimalist icon components
const Utensils = () => <Text style={styles.miniIcon}>🍴</Text>
const MapPin = () => <Text style={styles.miniIcon}>📍</Text>
const DollarSign = () => <Text style={styles.miniIcon}>💰</Text>
const Heart = () => <Text style={styles.miniIcon}>❤️</Text>
const Plus = () => <Text style={styles.miniIcon}>+</Text>
const Calendar = () => <Text style={styles.miniIcon}>📅</Text>
const Clock = () => <Text style={styles.miniIcon}>🕐</Text>
const Users = () => <Text style={styles.miniIcon}>👥</Text>
const X = () => <Text style={styles.miniIcon}>×</Text>

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
    const [selectedCuisines, setSelectedCuisines] = useState(['Surprise me!'])
    const [otherCuisine, setOtherCuisine] = useState('')
    const [selectedAtmospheres, setSelectedAtmospheres] = useState([])
    const [otherAtmosphere, setOtherAtmosphere] = useState('')
    const [selectedBudget, setSelectedBudget] = useState('No preference')
    const [dietary, setDietary] = useState(guestMode ? '' : (user?.preferences || ''))
    const [availability, setAvailability] = useState({})
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTimes, setSelectedTimes] = useState([])

    // Compact options with better organization
    const cuisineOptions = [
        { label: 'Italian', emoji: '🍝' },
        { label: 'Mexican', emoji: '🌮' },
        { label: 'Chinese', emoji: '🥡' },
        { label: 'Japanese', emoji: '🍣' },
        { label: 'Indian', emoji: '🍛' },
        { label: 'Thai', emoji: '🥘' },
        { label: 'Mediterranean', emoji: '🫒' },
        { label: 'American', emoji: '🍔' },
        { label: 'Surprise me!', emoji: '🎲' }
    ]

    const atmosphereOptions = [
        { label: 'Casual', emoji: '👕' },
        { label: 'Trendy', emoji: '✨' },
        { label: 'Romantic', emoji: '❤️' },
        { label: 'Outdoor', emoji: '🌳' },
        { label: 'Family Friendly', emoji: '👨‍👩‍👧‍👦' },
        { label: 'Cozy', emoji: '🛋️' },
        { label: 'Rooftop', emoji: '🌆' },
        { label: 'Waterfront', emoji: '🌊' },
        { label: 'Historic', emoji: '🏛️' }
    ]

    const budgetOptions = [
        { label: 'No preference', emoji: '🤷', desc: 'Any price range' },
        { label: 'Budget-friendly', emoji: '💰', desc: 'Value dining' },
        { label: 'Prefer upscale', emoji: '🍾', desc: 'Fine dining' }
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

    // Cuisine handlers
    const toggleCuisine = (cuisine) => {
        if (cuisine === 'Surprise me!') {
            setSelectedCuisines(['Surprise me!'])
            setOtherCuisine('')
            return
        }
        const withoutSurprise = selectedCuisines.filter(c => c !== 'Surprise me!')
        if (withoutSurprise.includes(cuisine)) {
            setSelectedCuisines(withoutSurprise.filter(c => c !== cuisine))
        } else {
            setSelectedCuisines([...withoutSurprise, cuisine])
        }
    }

    const addCustomCuisine = () => {
        const trimmed = otherCuisine.trim()
        if (!trimmed) return
        const withoutSurprise = selectedCuisines.filter(c => c !== 'Surprise me!')
        if (!withoutSurprise.includes(trimmed)) {
            setSelectedCuisines([...withoutSurprise, trimmed])
        }
        setOtherCuisine('')
        Keyboard.dismiss()
    }

    // Atmosphere handlers
    const toggleAtmosphere = (atmosphere) => {
        setSelectedAtmospheres(prev =>
            prev.includes(atmosphere)
                ? prev.filter(a => a !== atmosphere)
                : [...prev, atmosphere]
        )
    }

    const addCustomAtmosphere = () => {
        const trimmed = otherAtmosphere.trim()
        if (!trimmed) return
        if (!selectedAtmospheres.includes(trimmed)) {
            setSelectedAtmospheres(prev => [...prev, trimmed])
        }
        setOtherAtmosphere('')
        Keyboard.dismiss()
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

    const removePill = (item, setter) => {
        setter(prev => prev.filter(i => i !== item))
    }

    // Validation
    const isNextDisabled = () => {
        if (step === 1) return selectedCuisines.length === 0
        if (step === 2) return selectedAtmospheres.length === 0
        if (step === 3) return !selectedBudget
        if (step === 4) return false
        if (step === 5 && activity?.allow_participant_time_selection) {
            return Object.keys(availability).length === 0
        }
        return false
    }

    // Navigation
    const handleNext = () => {
        const totalSteps = getTotalSteps()
        if (step < totalSteps) {
            fadeAnim.setValue(0)
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        if (step > 1) {
            fadeAnim.setValue(0)
            setStep(step - 1)
        }
    }

    // Submission
    const handleSubmit = async () => {
        const cuisinesText = selectedCuisines.join(', ')
        const atmosText = selectedAtmospheres.join(', ')
        const budgetText = selectedBudget
        const dietaryText = dietary || 'None'

        const notes = [
            `Cuisines: ${cuisinesText}`,
            `Atmospheres: ${atmosText}`,
            `Budget: ${budgetText}`,
            `Dietary Preferences: ${dietaryText}`,
        ].join('\n\n')

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

    const renderCompactPill = (item, onRemove) => (
        <View key={item} style={styles.compactPill}>
            <Text style={styles.compactPillText}>{item}</Text>
            <TouchableOpacity
                onPress={() => onRemove(item)}
                style={styles.compactPillRemove}
            >
                <X />
            </TouchableOpacity>
        </View>
    )

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {cuisineOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        selectedCuisines.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleCuisine(option.label)}
                                >
                                    <Text style={styles.compactEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.compactLabel,
                                        selectedCuisines.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.customSection}>
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={styles.customInput}
                                    placeholder="Add custom cuisine..."
                                    placeholderTextColor="#999"
                                    value={otherCuisine}
                                    onChangeText={setOtherCuisine}
                                    returnKeyType="done"
                                    onSubmitEditing={addCustomCuisine}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.customAddButton,
                                        !otherCuisine.trim() && styles.customAddButtonDisabled
                                    ]}
                                    onPress={addCustomCuisine}
                                    disabled={!otherCuisine.trim()}
                                >
                                    <Plus />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedCuisines.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected:</Text>
                                <View style={styles.compactPillContainer}>
                                    {selectedCuisines.map(cuisine =>
                                        renderCompactPill(cuisine, (item) => removePill(item, setSelectedCuisines))
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {atmosphereOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        selectedAtmospheres.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleAtmosphere(option.label)}
                                >
                                    <Text style={styles.compactEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.compactLabel,
                                        selectedAtmospheres.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.customSection}>
                            <View style={styles.customInputRow}>
                                <TextInput
                                    style={styles.customInput}
                                    placeholder="Add custom atmosphere..."
                                    placeholderTextColor="#999"
                                    value={otherAtmosphere}
                                    onChangeText={setOtherAtmosphere}
                                    returnKeyType="done"
                                    onSubmitEditing={addCustomAtmosphere}
                                />
                                <TouchableOpacity
                                    style={[
                                        styles.customAddButton,
                                        !otherAtmosphere.trim() && styles.customAddButtonDisabled
                                    ]}
                                    onPress={addCustomAtmosphere}
                                    disabled={!otherAtmosphere.trim()}
                                >
                                    <Plus />
                                </TouchableOpacity>
                            </View>
                        </View>

                        {selectedAtmospheres.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected:</Text>
                                <View style={styles.compactPillContainer}>
                                    {selectedAtmospheres.map(atmosphere =>
                                        renderCompactPill(atmosphere, (item) => removePill(item, setSelectedAtmospheres))
                                    )}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 3:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.budgetGrid}>
                            {budgetOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.budgetCard,
                                        selectedBudget === option.label && styles.budgetCardSelected
                                    ]}
                                    onPress={() => setSelectedBudget(option.label)}
                                >
                                    <Text style={styles.budgetEmoji}>{option.emoji}</Text>
                                    <Text style={[
                                        styles.budgetLabel,
                                        selectedBudget === option.label && styles.budgetLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.budgetDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </Animated.View>
                )

            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <TextInput
                            style={styles.dietaryInput}
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
        backgroundColor: '#1a1a1a',
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
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 3,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    progressText: {
        color: '#cc31e8',
        fontSize: 12,
        fontWeight: '600',
        minWidth: 40,
        textAlign: 'right',
    },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 16,
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

    dietaryInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 100,
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
        color: '#cc31e8',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    dateInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 14,
    },

    timeGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
        marginBottom: 12,
    },

    timeChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 6,
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
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    addTimeText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
    },

    availabilitySection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
    },

    availabilityItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 8,
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
        backgroundColor: 'rgba(255, 69, 69, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 69, 69, 0.3)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },

    closeButtonText: {
        color: '#ff4545',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },

    backButtonDisabled: {
        opacity: 0.5,
    },

    backButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        textAlign: 'center',
    },

    backButtonTextDisabled: {
        color: '#666',
    },

    nextButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },

    nextButtonDisabled: {
        opacity: 0.5,
    },

    nextButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    miniIcon: {
        fontSize: 12,
        color: '#cc31e8',
    },
})