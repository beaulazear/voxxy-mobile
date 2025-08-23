import React, { useState, useContext, useEffect, useRef } from 'react'
import {
    View,
    Text,
    ScrollView,
    SafeAreaView,
    Modal,
    TouchableOpacity,
    Alert,
    StyleSheet,
    Animated,
    Dimensions,
    ActivityIndicator,
    Easing,
    Image,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import { LinearGradient } from 'expo-linear-gradient'
import {
    MapPin,
    Users,
    Clock,
    Search,
    Coffee,
    Sun,
    Sunset,
    Moon,
    Wine,
    Martini,
    X
} from 'lucide-react-native'
import VoxxyLogo from '../assets/icon.png'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { API_URL } from '../config'
import { logger } from '../utils/logger'
import SearchLocationModal from './SearchLocationModal'

const { width: screenWidth } = Dimensions.get('window')

export default function CocktailsChatNew({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)
    
    const [step, setStep] = useState(1)
    const totalSteps = 2
    const percent = (step / totalSteps) * 100
    const [fadeAnim] = useState(new Animated.Value(0))
    const [successAnim] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))
    const progressAnim = useRef(new Animated.Value(0)).current
    const [showSuccess, setShowSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('Creating your activity...')

    // Step 1: Location
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false)
    const [showLocationSearch, setShowLocationSearch] = useState(false)
    const [savedLocationUsed, setSavedLocationUsed] = useState(false)
    
    // Check if user has saved location
    const hasSavedLocation = user?.city ? true : false
    
    // Format saved location text - avoid duplicates and handle reversed data
    const formatSavedLocation = () => {
        if (!user?.city) return null
        
        const parts = []
        const seen = new Set()
        
        // Check if data seems reversed (common borough names)
        const boroughs = ['brooklyn', 'manhattan', 'queens', 'bronx', 'staten island']
        const isReversed = user.neighborhood && boroughs.includes(user.neighborhood.toLowerCase())
        
        if (isReversed) {
            // Data is reversed - city is actually neighborhood, neighborhood is actually city/borough
            if (user.city && !seen.has(user.city.toLowerCase())) {
                parts.push(user.city) // This is actually the neighborhood
                seen.add(user.city.toLowerCase())
            }
            if (user.neighborhood && !seen.has(user.neighborhood.toLowerCase())) {
                parts.push(user.neighborhood) // This is actually the borough
                seen.add(user.neighborhood.toLowerCase())
            }
        } else {
            // Normal order
            if (user.neighborhood && !seen.has(user.neighborhood.toLowerCase())) {
                parts.push(user.neighborhood)
                seen.add(user.neighborhood.toLowerCase())
            }
            if (user.city && !seen.has(user.city.toLowerCase())) {
                parts.push(user.city)
                seen.add(user.city.toLowerCase())
            }
        }
        
        // Add state if unique and not already included (and not a borough name)
        if (user.state && !seen.has(user.state.toLowerCase()) && !boroughs.includes(user.state.toLowerCase())) {
            parts.push(user.state)
            seen.add(user.state.toLowerCase())
        }
        
        return parts.join(', ')
    }
    
    const savedLocationText = formatSavedLocation()

    // Step 2: Time of Day
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('')

    // Time of day options for cocktails
    const timeOfDayOptions = [
        { label: 'Brunch Cocktails', value: 'brunch cocktails', icon: Coffee, desc: 'Morning drinks' },
        { label: 'Afternoon Drinks', value: 'afternoon drinks', icon: Sun, desc: 'Day drinking' },
        { label: 'Happy Hour', value: 'happy hour', icon: Sunset, desc: 'After work drinks' },
        { label: 'Night Out', value: 'late night cocktails', icon: Moon, desc: 'Late night vibes' }
    ]

    // Pre-select saved location if available
    useEffect(() => {
        if (hasSavedLocation && savedLocationText && !location) {
            logger.debug('Pre-selecting saved location:', savedLocationText)
            setSavedLocationUsed(true)
            setLocation(savedLocationText)
            if (user?.latitude && user?.longitude) {
                setCoords({
                    lat: user.latitude,
                    lng: user.longitude
                })
            }
        }
    }, [hasSavedLocation, savedLocationText])

    // Animate step transitions
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [step])

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: percent,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
        }).start()
    }, [percent])

    // Pulse animation for loading
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start()
    }

    // Success animation
    const showSuccessAnimation = () => {
        setShowSuccess(true)
        Animated.spring(successAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start()
    }

    // Step content headers
    const getStepContent = () => {
        switch (step) {
            case 1:
                return {
                    title: 'Where are you planning to go?',
                    subtitle: 'Choose your location for cocktail bar recommendations'
                }
            case 2:
                return {
                    title: 'When are you going?',
                    subtitle: 'Select the time for your drinks'
                }
            default:
                return { title: '', subtitle: '' }
        }
    }

    const useCurrentLocation = async () => {
        setIsLocating(true)

        try {
            const { status } = await Location.requestForegroundPermissionsAsync()

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Permission to access location was denied. Please enable location services in your device settings.'
                )
                setIsLocating(false)
                return
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 15000,
                distanceInterval: 10
            })

            setCoords({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            })
            setCurrentLocationUsed(true)
            setLocation('Using current location')
            setIsLocating(false)
        } catch (error) {
            logger.error('Location error:', error)
            Alert.alert('Location Error', 'Failed to get your current location. Please enter it manually.')
            setIsLocating(false)
        }
    }

    // Validation
    const isNextDisabled = () => {
        if (isSubmitting) return true
        
        switch (step) {
            case 1:
                const hasTypedLocation = location && location.trim() && location !== 'Using current location'
                const hasCurrentLocation = currentLocationUsed && coords && coords.lat && coords.lng
                const hasSaved = savedLocationUsed && location
                return !hasTypedLocation && !hasCurrentLocation && !hasSaved
            case 2:
                return !selectedTimeOfDay
            default:
                return false
        }
    }

    // Navigation
    const handleNext = () => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        } catch (e) {
            // Haptics not available
        }
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

    // Loading messages rotation
    useEffect(() => {
        if (isSubmitting) {
            const messages = [
                'Creating your activity...',
                'Finding the best bars...',
                'Analyzing cocktail spots...',
                'Almost ready...'
            ]
            let index = 0
            const interval = setInterval(() => {
                index = (index + 1) % messages.length
                setLoadingMessage(messages[index])
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [isSubmitting])

    // Submit to create activity
    const handleSubmit = async () => {
        if (isSubmitting) return
        
        try {
            setIsSubmitting(true)
            startPulseAnimation()
            
            // Format location
            let activityLocation = location.trim()
            if (currentLocationUsed && coords) {
                activityLocation = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            } else if (savedLocationUsed && user?.latitude && user?.longitude) {
                activityLocation = `${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}`
            }
            
            logger.debug('Location details:', {
                savedLocationUsed,
                currentLocationUsed,
                location,
                coords,
                userLat: user?.latitude,
                userLng: user?.longitude,
                finalLocation: activityLocation
            })

            // Create responses string
            const responses = `Time: ${selectedTimeOfDay}`

            const payload = {
                activity_name: 'Drinks',  // Required field
                activity_type: 'Cocktails',
                activity_location: activityLocation,
                responses: responses,
                time_of_day: selectedTimeOfDay,
                date_notes: `Looking for ${selectedTimeOfDay}`,  // Required field
                radius: 10,
                emoji: '🥃',
                collecting: true  // Start in collecting phase
            }

            logger.debug('Creating activity with payload:', payload)

            const response = await fetch(`${API_URL}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`,
                },
                body: JSON.stringify({ activity: payload }),
            })

            if (!response.ok) {
                const errorText = await response.text()
                logger.error('Activity creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    payload: payload
                })
                throw new Error(`Failed to create activity: ${response.status} ${errorText}`)
            }

            const data = await response.json()

            // Update user context with new activity
            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [] },
                ],
            }))

            // Show success animation
            setIsSubmitting(false)
            showSuccessAnimation()
            
            logger.debug('Activity created successfully, ID:', data.id)
            
            // Navigate after success animation
            setTimeout(() => {
                logger.debug('Closing modal after success animation')
                // First hide the success overlay
                setShowSuccess(false)
                setIsSubmitting(false)
                
                // Give time for overlay to disappear before navigating
                setTimeout(() => {
                    // Reset form states
                    setLocation('')
                    setCoords(null)
                    setCurrentLocationUsed(false)
                    setSavedLocationUsed(false)
                    setSelectedTimeOfDay('')
                    setStep(1)
                    // Then close and navigate
                    onClose(data.id) // Pass activity ID to parent
                }, 100)
            }, 1500)

        } catch (error) {
            logger.error('Error creating activity:', error)
            Alert.alert('Error', 'Failed to create activity. Please try again.')
            setIsSubmitting(false)
            setShowSuccess(false)
        }
    }

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%']
                            })
                        }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                {isSubmitting ? 'Processing...' : `${step} of ${totalSteps}`}
            </Text>
        </View>
    )

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        {/* Show saved location option if user has one */}
                        {hasSavedLocation && (
                            <>
                                <TouchableOpacity
                                    style={[
                                        styles.savedLocationButton,
                                        savedLocationUsed && styles.savedLocationButtonActive
                                    ]}
                                    onPress={() => {
                                        setSavedLocationUsed(true)
                                        setCurrentLocationUsed(false)
                                        setLocation(savedLocationText)
                                        if (user?.latitude && user?.longitude) {
                                            setCoords({
                                                lat: user.latitude,
                                                lng: user.longitude
                                            })
                                        }
                                    }}
                                >
                                    <Users color={savedLocationUsed ? "#fff" : "#cc31e8"} size={20} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={[
                                            styles.savedLocationText,
                                            savedLocationUsed && styles.savedLocationTextActive
                                        ]}>
                                            Use your saved location
                                        </Text>
                                        <Text style={[
                                            styles.savedLocationSubtext,
                                            savedLocationUsed && styles.savedLocationSubtextActive
                                        ]}>
                                            {savedLocationText}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <View style={styles.orDivider}>
                                    <View style={styles.dividerLine} />
                                    <Text style={styles.orText}>OR</Text>
                                    <View style={styles.dividerLine} />
                                </View>
                            </>
                        )}

                        <TouchableOpacity
                            style={[
                                styles.searchLocationButton,
                                !savedLocationUsed && !currentLocationUsed && location && styles.searchLocationButtonActive
                            ]}
                            onPress={() => setShowLocationSearch(true)}
                        >
                            <Search color={!savedLocationUsed && !currentLocationUsed && location ? "#fff" : "#cc31e8"} size={20} />
                            <Text style={[
                                styles.searchLocationText,
                                !savedLocationUsed && !currentLocationUsed && location && styles.searchLocationTextActive
                            ]}>
                                {location && !currentLocationUsed && !savedLocationUsed
                                    ? location
                                    : 'Search for a location'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.orDivider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={[
                                styles.locationButton,
                                currentLocationUsed && styles.locationButtonActive
                            ]}
                            onPress={useCurrentLocation}
                            disabled={isLocating}
                        >
                            <MapPin color={currentLocationUsed ? "#fff" : "#cc31e8"} size={16} />
                            <Text style={[
                                styles.locationButtonText,
                                currentLocationUsed && styles.locationButtonTextActive
                            ]}>
                                {currentLocationUsed
                                    ? 'Using current location'
                                    : isLocating
                                        ? 'Locating…'
                                        : 'Use my current location'}
                            </Text>
                        </TouchableOpacity>

                        <SearchLocationModal
                            visible={showLocationSearch}
                            onClose={() => setShowLocationSearch(false)}
                            onLocationSelect={(selectedLocation) => {
                                const locationText = selectedLocation.formatted || selectedLocation.description || selectedLocation.formatted_address || ''
                                setLocation(locationText)
                                setCurrentLocationUsed(false)
                                setSavedLocationUsed(false)
                                setCoords(null)
                                setShowLocationSearch(false)
                            }}
                        />
                    </Animated.View>
                )

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.optionGrid}>
                            {timeOfDayOptions.map(option => (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.optionCard,
                                        selectedTimeOfDay === option.value && styles.optionCardSelected
                                    ]}
                                    onPress={() => {
                                        try {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                        } catch (e) {
                                            // Haptics not available
                                        }
                                        setSelectedTimeOfDay(option.value)
                                    }}
                                >
                                    <option.icon color="#fff" size={24} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.optionLabel,
                                        selectedTimeOfDay === option.value && styles.optionLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.optionDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
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
            onRequestClose={() => onClose()}
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

                {/* Full Screen Loading/Success Overlay */}
                {(isSubmitting || showSuccess) && (
                    <Modal
                        visible={isSubmitting || showSuccess}
                        transparent
                        animationType="fade"
                    >
                        <Animated.View
                            style={[
                                styles.fullScreenOverlay,
                                {
                                    opacity: isSubmitting ? 1 : successAnim,
                                }
                            ]}
                        >
                            {!showSuccess ? (
                                <Animated.View style={[styles.loadingContent, { transform: [{ scale: pulseAnim }] }]}>
                                    <View style={styles.loadingIconLarge}>
                                        <ActivityIndicator size="large" color="#cc31e8" />
                                    </View>
                                    <Text style={styles.loadingTitleLarge}>{loadingMessage}</Text>
                                    <Text style={styles.loadingSubtitleLarge}>Setting up your cocktail experience...</Text>
                                </Animated.View>
                            ) : (
                                <Animated.View
                                    style={[
                                        styles.successContent,
                                        {
                                            transform: [
                                                {
                                                    scale: successAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.3, 1]
                                                    })
                                                }
                                            ]
                                        }
                                    ]}
                                >
                                    <View style={styles.successIcon}>
                                        <Image source={VoxxyLogo} style={styles.successLogo} />
                                    </View>
                                    <Text style={styles.successTitle}>Activity Created!</Text>
                                    <Text style={styles.successSubtitle}>Get ready for amazing cocktail recommendations</Text>
                                </Animated.View>
                            )}
                        </Animated.View>
                    </Modal>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => onClose()}
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
                                {step < totalSteps ? 'Next' : 'Finish'}
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

    searchLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },

    searchLocationText: {
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },

    searchLocationButtonActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.25)',
        borderColor: '#cc31e8',
    },

    searchLocationTextActive: {
        color: '#fff',
    },

    orDivider: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },

    dividerLine: {
        flex: 1,
        height: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },

    orText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 12,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    locationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 12,
        padding: 16,
        gap: 8,
    },

    locationButtonText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
    },

    locationButtonActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.25)',
        borderColor: '#cc31e8',
    },

    locationButtonTextActive: {
        color: '#fff',
    },

    savedLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.2)',
        borderRadius: 12,
        padding: 16,
        gap: 12,
        marginBottom: 20,
    },

    savedLocationButtonActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.25)',
        borderColor: '#cc31e8',
    },

    savedLocationText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 2,
    },

    savedLocationTextActive: {
        color: '#fff',
    },

    savedLocationSubtext: {
        color: 'rgba(204, 49, 232, 0.7)',
        fontSize: 13,
    },

    savedLocationSubtextActive: {
        color: 'rgba(255, 255, 255, 0.8)',
    },

    optionGrid: {
        gap: 12,
    },

    optionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    optionCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    optionLabelSelected: {
        color: '#cc31e8',
    },

    optionDesc: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },

    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 30,
        gap: 12,
    },

    closeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 69, 69, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        minHeight: 52,
        justifyContent: 'center',
    },

    closeButtonText: {
        color: '#ff4545',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },

    backButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
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
        textAlign: 'center',
    },

    backButtonTextDisabled: {
        color: '#666',
    },

    nextButton: {
        flex: 1,
        borderRadius: 12,
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
    },

    fullScreenOverlay: {
        flex: 1,
        backgroundColor: '#0f0f14',
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingContent: {
        alignItems: 'center',
        padding: 32,
    },

    loadingIconLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.2)',
    },

    loadingTitleLarge: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },

    loadingSubtitleLarge: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
    },

    successContent: {
        alignItems: 'center',
        padding: 32,
    },

    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },

    successLogo: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },

    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },

    successSubtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
})