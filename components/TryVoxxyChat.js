import React, { useState, useEffect } from 'react'
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
    X
} from 'lucide-react-native'
import * as Location from 'expo-location'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { API_URL } from '../config'
import { logger } from '../utils/logger'

const { width: screenWidth } = Dimensions.get('window')

export default function TryVoxxyChat({ visible, onClose, onChatComplete }) {
    const [step, setStep] = useState(1)
    const totalSteps = 5
    const percent = (step / totalSteps) * 100
    const [fadeAnim] = useState(new Animated.Value(0))

    // Form state
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false)
    const [selectedOutingType, setSelectedOutingType] = useState('')
    const [selectedCuisines, setSelectedCuisines] = useState([])
    const [selectedVibes, setSelectedVibes] = useState([])
    const [selectedBudget, setSelectedBudget] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    
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
        { label: 'Mexican', icon: ChefHat, desc: 'Tacos, burritos, quesadillas' },
        { label: 'Chinese', icon: Utensils, desc: 'Stir-fry, dim sum, noodles' },
        { label: 'Japanese', icon: Fish, desc: 'Sushi, ramen, tempura' },
        { label: 'American', icon: Beef, desc: 'Burgers, steaks, BBQ' },
        { label: 'Indian', icon: ChefHat, desc: 'Curry, naan, biryani' },
        { label: 'Thai', icon: Cherry, desc: 'Pad thai, curry, spring rolls' },
        { label: 'Mediterranean', icon: Cherry, desc: 'Hummus, falafel, kebabs' },
        { label: 'Something New', icon: Target, desc: 'Surprise me!' }
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
        setSelectedCuisines(prev => 
            prev.includes(cuisine) 
                ? prev.filter(c => c !== cuisine)
                : [...prev, cuisine]
        )
    }

    const toggleVibe = (vibe) => {
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
                const hasTypedLocation = location.trim() && location !== 'Using current location'
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
        if (isSubmitting) return // Prevent double submission
        
        try {
            setIsSubmitting(true)
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
                if (errorData.should_retry) {
                    Alert.alert(
                        'Error',
                        errorMessage,
                        [
                            { text: 'Cancel', style: 'cancel' },
                            { text: 'Try Again', onPress: () => handleSubmit() }
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
            
            onChatComplete(data.recommendations || [])
        } catch (error) {
            logger.error('💥 Final error in handleSubmit:', {
                errorMessage: error.message,
                errorStack: error.stack
            })
            Alert.alert('Error', error.message || 'Failed to get recommendations. Please try again.')
            onChatComplete([])
        } finally {
            setIsSubmitting(false)
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
                {step} of {totalSteps}
            </Text>
        </View>
    )

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <TextInput
                            style={styles.notesInput}
                            value={location}
                            onChangeText={(text) => {
                                setLocation(text)
                                setCurrentLocationUsed(false)
                            }}
                            placeholder={
                                currentLocationUsed
                                    ? 'Using current location'
                                    : 'Enter city or neighborhood (e.g. San Francisco, CA)'
                            }
                            placeholderTextColor="#999"
                            editable={!currentLocationUsed}
                        />

                        <TouchableOpacity
                            style={styles.locationButton}
                            onPress={useCurrentLocation}
                            disabled={isLocating || currentLocationUsed}
                        >
                            <MapPin color="#cc31e8" size={16} />
                            <Text style={styles.locationButtonText}>
                                {currentLocationUsed
                                    ? 'Using current location'
                                    : isLocating
                                        ? 'Locating…'
                                        : 'Use my current location'}
                            </Text>
                        </TouchableOpacity>
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
                                    onPress={() => setSelectedOutingType(option.label)}
                                >
                                    <option.icon color="#fff" size={24} style={{ marginBottom: 8 }} />
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
                                                <X color="#cc31e8" size={10} />
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
                                                <X color="#cc31e8" size={10} />
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
                                    onPress={() => setSelectedBudget(option.label)}
                                >
                                    <option.icon color="#fff" size={24} style={{ marginBottom: 8 }} />
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
                            {isSubmitting ? (
                                <View style={styles.loadingContainer}>
                                    <ActivityIndicator size="small" color="#fff" />
                                    <Text style={styles.loadingText}>Getting Recommendations...</Text>
                                </View>
                            ) : (
                                <Text style={styles.nextButtonText}>
                                    {step < totalSteps ? 'Next' : 'Get Recommendations'}
                                </Text>
                            )}
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
        gap: 12,
    },

    singleSelectCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },

    singleSelectCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
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
        color: '#cc31e8',
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
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
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
})