import React, { useState, useEffect, useRef } from 'react'
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
    Animated,
    Dimensions,
    ActivityIndicator,
    Easing,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
    MapPin,
    Coffee,
    Utensils,
    Pizza,
    Fish,
    ChefHat,
    Cherry,
    Beef,
    Target,
    Wine,
    Heart,
    Trees,
    Users,
    Home,
    Building,
    Waves,
    DollarSign,
    CreditCard,
    Crown,
    X,
    Search
} from 'lucide-react-native'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../config'
import { logger } from '../utils/logger'
import SearchLocationModal from './SearchLocationModal'

const { width: screenWidth } = Dimensions.get('window')

export default function TryVoxxyChat({ visible, onClose, onChatComplete }) {
    const [step, setStep] = useState(1)
    const totalSteps = 5
    const percent = (step / totalSteps) * 100
    const [fadeAnim] = useState(new Animated.Value(0))
    const [successAnim] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))
    const progressAnim = useRef(new Animated.Value(0)).current
    const [showSuccess, setShowSuccess] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('Analyzing your preferences...')

    // Form state
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false)
    const [showLocationSearch, setShowLocationSearch] = useState(false)
    const [selectedOutingType, setSelectedOutingType] = useState('')
    const [selectedCuisines, setSelectedCuisines] = useState([])
    const [selectedVibes, setSelectedVibes] = useState([])
    const [selectedBudget, setSelectedBudget] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [pressedCard, setPressedCard] = useState(null)
    
    // Outing type options
    const outingTypeOptions = [
        { label: 'Brunch', icon: Coffee, desc: 'Weekend morning vibes' },
        { label: 'Lunch', icon: Utensils, desc: 'Midday dining' },
        { label: 'Dinner', icon: ChefHat, desc: 'Evening experience' },
        { label: 'Late-night drinks', icon: Wine, desc: 'After hours fun' }
    ]

    // Cuisine options with icons
    const cuisineOptions = [
        { label: 'Italian', icon: Pizza, desc: 'Pasta, pizza, risotto' },
        { label: 'Mexican', icon: Beef, desc: 'Tacos, burritos, quesadillas' },
        { label: 'Chinese', icon: Utensils, desc: 'Stir-fry, dim sum, noodles' },
        { label: 'Japanese', icon: Fish, desc: 'Sushi, ramen, tempura' },
        { label: 'American', icon: Coffee, desc: 'Burgers, steaks, BBQ' },
        { label: 'Indian', icon: Cherry, desc: 'Curry, naan, biryani' },
        { label: 'Thai', icon: ChefHat, desc: 'Pad thai, curry, spring rolls' },
        { label: 'Mediterranean', icon: Wine, desc: 'Hummus, falafel, kebabs' }
    ]

    const vibeOptions = [
        { label: 'Casual', icon: Coffee, desc: 'Relaxed & comfortable' },
        { label: 'Trendy', icon: Wine, desc: 'Modern & stylish' },
        { label: 'Romantic', icon: Heart, desc: 'Intimate & cozy' },
        { label: 'Outdoor', icon: Trees, desc: 'Patio & garden seating' },
        { label: 'Family Friendly', icon: Users, desc: 'Great for all ages' },
        { label: 'Cozy', icon: Home, desc: 'Warm & inviting' },
        { label: 'Rooftop', icon: Building, desc: 'City views & fresh air' },
        { label: 'Waterfront', icon: Waves, desc: 'Ocean or lake views' }
    ]

    const budgetOptions = [
        { label: 'Budget-friendly', icon: DollarSign, desc: 'Value dining ($-$$)' },
        { label: 'Mid-range', icon: CreditCard, desc: 'Nice sit-down meals ($$-$$$)' },
        { label: 'Upscale', icon: Crown, desc: 'Fine dining experience ($$$-$$$$)' }
    ]

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

    // Step content
    const getStepContent = () => {
        switch (step) {
            case 1:
                return {
                    title: 'Where are you?',
                    subtitle: 'Help us find dining options in your area'
                }
            case 2:
                return {
                    title: 'What time of day?',
                    subtitle: 'When are you planning to go out?'
                }
            case 3:
                return {
                    title: 'Food & drink mood?',
                    subtitle: 'What are you craving today?'
                }
            case 4:
                return {
                    title: 'What\'s the vibe?',
                    subtitle: 'Tell us about the atmosphere you\'re looking for'
                }
            case 5:
                return {
                    title: 'Budget range?',
                    subtitle: 'What\'s your spending comfort zone?'
                }
            default:
                return { title: '', subtitle: '' }
        }
    }

    const getOrCreateSessionToken = async () => {
        try {
            let token = await AsyncStorage.getItem('voxxy_token')
            if (!token) {
                token = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
                await AsyncStorage.setItem('voxxy_token', token)
            }
            return token
        } catch (error) {
            return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
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

    // Toggle functions for multi-select
    const toggleCuisine = (cuisine) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } catch (e) {
            // Haptics not available
        }
        setSelectedCuisines(prev => 
            prev.includes(cuisine) 
                ? prev.filter(c => c !== cuisine)
                : [...prev, cuisine]
        )
    }

    const toggleVibe = (vibe) => {
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        } catch (e) {
            // Haptics not available
        }
        setSelectedVibes(prev => 
            prev.includes(vibe) 
                ? prev.filter(v => v !== vibe)
                : [...prev, vibe]
        )
    }

    // Validation
    const isNextDisabled = () => {
        if (isSubmitting) return true
        
        switch (step) {
            case 1:
                const hasTypedLocation = location && location.trim() && location !== 'Using current location'
                const hasCurrentLocation = currentLocationUsed && coords && coords.lat && coords.lng
                return !hasTypedLocation && !hasCurrentLocation
            case 2:
                return !selectedOutingType
            case 3:
                return selectedCuisines.length === 0
            case 4:
                return selectedVibes.length === 0
            case 5:
                return !selectedBudget
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
                'Analyzing your preferences...',
                'Finding perfect matches...',
                'Curating recommendations...',
                'Almost there...'
            ]
            let index = 0
            const interval = setInterval(() => {
                index = (index + 1) % messages.length
                setLoadingMessage(messages[index])
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [isSubmitting])

    // Submission
    const handleSubmit = async () => {
        if (isSubmitting) return // Prevent double submission
        
        try {
            setIsSubmitting(true)
            startPulseAnimation()
            const token = await getOrCreateSessionToken()
            logger.debug('🚀 Starting handleSubmit with token:', token.substring(0, 10) + '...')
            
            // Format responses similar to the web app format
            const cuisineText = selectedCuisines.length > 0 ? selectedCuisines.join(', ') : 'Open to anything'
            const vibeText = selectedVibes.length > 0 ? selectedVibes.join(', ') : 'No preference'
            
            const responses = [
                `What's the food & drink mood? Are we craving anything specific or open to surprises?\nAnswer: ${cuisineText}`,
                `What's the vibe? Fancy, casual, outdoor seating, rooftop views, good music…?\nAnswer: ${vibeText}`,
                `Budget range: low, mid, high?\nAnswer: ${selectedBudget}`
            ].join('\n\n')
            
            // Format location properly
            let locationToSend
            if (currentLocationUsed && coords && coords.lat && coords.lng) {
                locationToSend = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            } else if (location && location.trim() && location !== 'Using current location') {
                locationToSend = location.trim()
            } else {
                locationToSend = ''
            }

            // Validate request parameters
            const requestData = {
                responses,
                activity_location: locationToSend,
                date_notes: selectedOutingType || 'restaurant visit'
            }
            
            logger.debug('📤 Sending API request:', {
                url: `${API_URL}/try_voxxy_recommendations`,
                responses: responses.substring(0, 100) + '...',
                activity_location: locationToSend,
                date_notes: requestData.date_notes
            })
            
            // Validate required fields
            if (!responses || responses.trim().length === 0) {
                throw new Error('Responses cannot be empty')
            }
            if (!locationToSend || locationToSend.toString().trim().length === 0) {
                logger.error('❌ Location validation failed - returning to step 1')
                Alert.alert('Location Required', 'Please enter a location or use your current location before proceeding.')
                setStep(1)
                return
            }
            if (!requestData.date_notes || requestData.date_notes.trim().length === 0) {
                throw new Error('Date notes cannot be empty')
            }

            const response = await fetch(`${API_URL}/try_voxxy_recommendations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': token
                },
                body: JSON.stringify(requestData)
            })
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                logger.error('🚨 API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorData
                })
                
                // Handle rate limiting with retry information
                if (response.status === 429) {
                    const retryAfter = errorData.retry_after || response.headers.get('Retry-After')
                    const minutes = retryAfter ? Math.ceil(retryAfter / 60) : 60
                    
                    Alert.alert(
                        'Rate Limited',
                        `You've reached the demo limit. Please try again in ${minutes} minute${minutes === 1 ? '' : 's'} or create an account for unlimited access.`,
                        [
                            { text: 'OK', style: 'cancel' },
                            { 
                                text: 'Create Account', 
                                onPress: () => {
                                    onClose()
                                    // Navigate to signup will be handled by parent
                                }
                            }
                        ]
                    )
                    setIsSubmitting(false)
                    return
                }
                
                // Handle other errors
                let errorMessage = 'Failed to get recommendations'
                if (response.status === 500) {
                    errorMessage = 'Server error - this has been logged for investigation'
                } else if (response.status === 401) {
                    errorMessage = 'Invalid session. Please restart the app.'
                } else if (response.status === 422) {
                    errorMessage = errorData.error || 'Invalid request parameters'
                } else if (errorData.error) {
                    errorMessage = errorData.error
                }
                
                // Check if we should allow retry
                if (errorData.should_retry || response.status >= 500) {
                    Alert.alert(
                        'Error',
                        errorMessage,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { 
                                text: 'Try Again', 
                                onPress: () => {
                                    setIsSubmitting(false)
                                    setTimeout(() => handleSubmit(), 100)
                                }
                            }
                        ]
                    )
                } else {
                    throw new Error(`API Error ${response.status}: ${errorMessage}`)
                }
                
                setIsSubmitting(false)
                return
            }

            const data = await response.json()
            
            // Check if we got rate limited but with cached data
            if (data.rate_limited && data.recommendations) {
                Alert.alert(
                    'Using Cached Results',
                    'You\'ve reached the demo limit, but here are your previous recommendations.',
                    [{ text: 'OK' }]
                )
            }
            
            // Show success animation before completing
            if (data.recommendations && data.recommendations.length > 0) {
                showSuccessAnimation()
                setTimeout(() => {
                    setShowSuccess(false)
                    setIsSubmitting(false)
                    onChatComplete(data.recommendations)
                }, 2000)
            } else {
                setIsSubmitting(false)
                onChatComplete(data.recommendations || [])
            }
        } catch (error) {
            logger.error('💥 Final error in handleSubmit:', {
                errorMessage: error.message,
                errorStack: error.stack
            })
            Alert.alert('Error', error.message || 'Failed to get recommendations. Please try again.')
            setIsSubmitting(false)
            setShowSuccess(false)
            onChatComplete([])
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
                        <TouchableOpacity
                            style={styles.searchLocationButton}
                            onPress={() => setShowLocationSearch(true)}
                            disabled={currentLocationUsed}
                        >
                            <Search color="#9333EA" size={20} />
                            <Text style={styles.searchLocationText}>
                                {location && !currentLocationUsed
                                    ? location
                                    : currentLocationUsed
                                        ? 'Using current location'
                                        : 'Search for a location'}
                            </Text>
                        </TouchableOpacity>

                        <View style={styles.orDivider}>
                            <View style={styles.dividerLine} />
                            <Text style={styles.orText}>OR</Text>
                            <View style={styles.dividerLine} />
                        </View>

                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={useCurrentLocation}
                            disabled={isLocating || currentLocationUsed}
                        >
                            <MapPin color="#9333EA" size={16} />
                            <Text style={styles.locationButtonText}>
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
                                logger.debug('TryVoxxyChat onLocationSelect:', selectedLocation)
                                const locationText = selectedLocation.formatted || selectedLocation.description || selectedLocation.formatted_address || ''
                                setLocation(locationText)
                                setCurrentLocationUsed(false)
                                setCoords(null) // Clear coords since we're using a text location
                                setShowLocationSearch(false)
                            }}
                        />
                    </Animated.View>
                )

            case 2:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.singleSelectGrid}>
                            {outingTypeOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.singleSelectCard,
                                        selectedOutingType === option.label && styles.singleSelectCardSelected
                                    ]}
                                    onPress={() => {
                                        try {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                        } catch (e) {
                                            // Haptics not available
                                        }
                                        setSelectedOutingType(option.label)
                                    }}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 8 }} />
                                    <Text style={[
                                        styles.singleSelectLabel,
                                        selectedOutingType === option.label && styles.singleSelectLabelSelected
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
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 4 }} />
                                    <Text style={[
                                        styles.compactLabel,
                                        selectedCuisines.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        
                        {selectedCuisines.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected Cuisines</Text>
                                <View style={styles.compactPillContainer}>
                                    {selectedCuisines.map(cuisine => (
                                        <View key={cuisine} style={styles.compactPill}>
                                            <Text style={styles.compactPillText}>{cuisine}</Text>
                                            <TouchableOpacity
                                                style={styles.compactPillRemove}
                                                onPress={() => toggleCuisine(cuisine)}
                                            >
                                                <X color="#9333EA" size={10} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 4:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.compactGrid}>
                            {vibeOptions.map(option => (
                                <TouchableOpacity
                                    key={option.label}
                                    style={[
                                        styles.compactCard,
                                        selectedVibes.includes(option.label) && styles.compactCardSelected
                                    ]}
                                    onPress={() => toggleVibe(option.label)}
                                >
                                    <option.icon color="#fff" size={20} style={{ marginBottom: 4 }} />
                                    <Text style={[
                                        styles.compactLabel,
                                        selectedVibes.includes(option.label) && styles.compactLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedVibes.length > 0 && (
                            <View style={styles.selectedContainer}>
                                <Text style={styles.selectedTitle}>Selected Vibes</Text>
                                <View style={styles.compactPillContainer}>
                                    {selectedVibes.map(vibe => (
                                        <View key={vibe} style={styles.compactPill}>
                                            <Text style={styles.compactPillText}>{vibe}</Text>
                                            <TouchableOpacity
                                                style={styles.compactPillRemove}
                                                onPress={() => toggleVibe(vibe)}
                                            >
                                                <X color="#9333EA" size={10} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        )}
                    </Animated.View>
                )

            case 5:
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
                                    onPress={() => {
                                        try {
                                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                        } catch (e) {
                                            // Haptics not available
                                        }
                                        setSelectedBudget(option.label)
                                    }}
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
                                        <ActivityIndicator size="large" color="#9333EA" />
                                    </View>
                                    <Text style={styles.loadingTitleLarge}>{loadingMessage}</Text>
                                    <Text style={styles.loadingSubtitleLarge}>Finding the perfect spots for you...</Text>
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
                                        <Text style={styles.successEmoji}>🎉</Text>
                                    </View>
                                    <Text style={styles.successTitle}>Your recommendations are here!</Text>
                                    <Text style={styles.successSubtitle}>We found amazing spots for you</Text>
                                </Animated.View>
                            )}
                        </Animated.View>
                    </Modal>
                )}

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
                            colors={['#9333EA', '#9b1dbd']}
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 2,
        overflow: 'hidden',
    },

    progressFill: {
        height: '100%',
        backgroundColor: '#9333EA',
        borderRadius: 2,
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 4,
    },

    progressText: {
        color: '#9333EA',
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
        gap: 12,
        marginBottom: 20,
        justifyContent: 'space-between',
    },

    compactCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 16,
        padding: 16,
        width: (screenWidth - 48 - 12) / 2, // 2 columns with gap - matching response forms
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 90,
    },

    compactCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#9333EA',
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    compactLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 16,
        marginTop: 4,
    },

    compactLabelSelected: {
        color: '#9333EA',
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
        width: (screenWidth - 48 - 12) / 2, // 2 columns with gap - matching response forms
        alignItems: 'center',
    },

    singleSelectCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#9333EA',
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    singleSelectLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    singleSelectLabelSelected: {
        color: '#9333EA',
    },

    singleSelectDesc: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
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
        color: '#9333EA',
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
        color: '#9333EA',
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
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        color: '#fff',
        fontSize: 16,
        minHeight: 80,
        textAlignVertical: 'top',
        marginBottom: 16,
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
        color: '#9333EA',
        fontSize: 14,
        fontWeight: '600',
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

    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    loadingText: {
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

    successEmoji: {
        fontSize: 50,
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