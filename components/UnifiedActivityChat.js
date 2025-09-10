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
    Utensils,
    Sun,
    Moon,
    X,
    ChefHat,
    Wine,
    Hamburger,
    Martini,
    Dices,
    Film,
    Book,
    Edit,
    RotateCcw,
    ArrowLeft,
    ArrowRight,
} from 'lucide-react-native'
import * as Location from 'expo-location'
import * as Haptics from 'expo-haptics'
import { API_URL } from '../config'
import { logger } from '../utils/logger'
import SearchLocationModal from './SearchLocationModal'
import VoxxyLogo from '../assets/voxxy-triangle.png'

const { width: screenWidth } = Dimensions.get('window')

export default function UnifiedActivityChat({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)
    
    const [step, setStep] = useState(1)
    const [totalSteps, setTotalSteps] = useState(3) // Will adjust based on activity type
    const [fadeAnim] = useState(new Animated.Value(0))
    const [successAnim] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))
    const progressAnim = useRef(new Animated.Value(0)).current
    const [showSuccess, setShowSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('Creating your plan...')

    // Step 1: Activity Type Selection
    const [selectedActivity, setSelectedActivity] = useState('')
    
    // Step 2: Location (for all activities)
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false)
    const [showLocationSearch, setShowLocationSearch] = useState(false)
    const [savedLocationUsed, setSavedLocationUsed] = useState(false)
    
    // Step 3: Activity-specific options
    const [selectedTimeOfDay, setSelectedTimeOfDay] = useState('')
    const [selectedGroupSize, setSelectedGroupSize] = useState('')

    // Restaurant & Bar options
    const activities = [
        {
            type: 'Restaurant',
            name: 'Restaurant',
            icon: Hamburger,
            iconColor: '#FF6B6B',
            description: 'Find the perfect restaurant'
        },
        {
            type: 'Cocktails',
            name: 'Bar',
            icon: Martini,
            iconColor: '#4ECDC4',
            description: 'Discover great bars & lounges'
        },
    ]

    // Time of day options for Food
    const foodTimeOptions = [
        { label: 'Brunch', value: 'brunch', icon: Coffee, desc: 'Late morning feast' },
        { label: 'Lunch', value: 'lunch', icon: Sun, desc: 'Midday meal' },
        { label: 'Dinner', value: 'dinner', icon: ChefHat, desc: 'Evening dining' },
        { label: 'Late Night', value: 'late-night', icon: Moon, desc: 'Midnight munchies' }
    ]

    // Time of day options for Drinks
    const drinksTimeOptions = [
        { label: 'Day Drinks', value: 'brunch', icon: Coffee, desc: 'Afternoon mimosas' },
        { label: 'Happy Hour', value: 'lunch', icon: Sun, desc: 'After work vibes' },
        { label: 'Evening', value: 'dinner', icon: Wine, desc: 'Cocktail hour' },
        { label: 'Night Out', value: 'late-night', icon: Moon, desc: 'Late night drinks' }
    ]


    // Group size options (for dining)
    const groupSizeOptions = [
        { label: '2', value: '2', icon: Users, desc: 'Intimate dining' },
        { label: '3-4', value: '3-4', icon: Users, desc: 'Small group' },
        { label: '5-8', value: '5-8', icon: Users, desc: 'Medium party' },
        { label: '9+', value: '9+', icon: Users, desc: 'Large group' }
    ]

    // All restaurant/bar venues need location and time
    useEffect(() => {
        setTotalSteps(3) // Type, Location, Time - same for both Restaurant and Bar
    }, [selectedActivity])

    // Calculate progress
    const percent = (step / totalSteps) * 100

    // Reset when modal opens/closes
    useEffect(() => {
        if (visible) {
            // Reset all state when opening
            setStep(1)
            setSelectedActivity('')
            setLocation('')
            setCoords(null)
            setSelectedTimeOfDay('')
            setSelectedGroupSize('')
            setCurrentLocationUsed(false)
            setSavedLocationUsed(false)
            setShowSuccess(false)
            setIsSubmitting(false)
            fadeAnim.setValue(0)
            successAnim.setValue(0)
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        } else {
            // Clean up when closing
            setShowSuccess(false)
            setIsSubmitting(false)
            successAnim.setValue(0)
        }
    }, [visible])

    // Animate step transitions
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [step])

    // Check if user has saved location
    const hasSavedLocation = user?.city ? true : false
    const formatSavedLocation = () => {
        if (!user?.city) return null
        const parts = []
        if (user.neighborhood) parts.push(user.neighborhood)
        if (user.city) parts.push(user.city)
        if (user.state) parts.push(user.state)
        return parts.join(', ')
    }
    const savedLocationText = formatSavedLocation()

    // Pre-select saved location if available
    useEffect(() => {
        if (hasSavedLocation && savedLocationText && !location && step === 2) {
            setSavedLocationUsed(true)
            setLocation(savedLocationText)
            if (user?.latitude && user?.longitude) {
                setCoords({
                    lat: user.latitude,
                    lng: user.longitude
                })
            }
        }
    }, [hasSavedLocation, savedLocationText, step])

    // Get current location
    const getCurrentLocation = async () => {
        setIsLocating(true)
        try {
            const { status } = await Location.requestForegroundPermissionsAsync()
            if (status !== 'granted') {
                Alert.alert('Permission Denied', 'Location permission is required')
                setIsLocating(false)
                return
            }

            const location = await Location.getCurrentPositionAsync({})
            setCoords({
                lat: location.coords.latitude,
                lng: location.coords.longitude
            })
            setLocation('Using current location')
            setCurrentLocationUsed(true)
            setSavedLocationUsed(false)
        } catch (error) {
            Alert.alert('Error', 'Could not get your location')
        } finally {
            setIsLocating(false)
        }
    }

    // Get step content
    const getStepContent = () => {
        switch (step) {
            case 1:
                return {
                    title: "What's the vibe?",
                    subtitle: 'Pick your scene for tonight'
                }
            case 2:
                return {
                    title: 'Where are we looking?',
                    subtitle: 'Set your location'
                }
            case 3:
                if (selectedActivity === 'Restaurant') {
                    return {
                        title: 'When are we dining?',
                        subtitle: 'Pick the perfect time'
                    }
                } else if (selectedActivity === 'Cocktails') {
                    return {
                        title: 'When are we going out?',
                        subtitle: 'Choose your time'
                    }
                }
                break
        }
        return { title: '', subtitle: '' }
    }

    // Render step content
    const renderStepContent = () => {
        return (
            <Animated.View style={{ opacity: fadeAnim }}>
                {step === 1 && (
                    <View style={styles.activityButtonsContainer}>
                        {/* Restaurant Button */}
                        <TouchableOpacity
                            style={styles.activityOption}
                            onPress={() => {
                                setSelectedActivity('Restaurant')
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={selectedActivity === 'Restaurant' 
                                    ? ['#B954EC', '#9C3FCC'] 
                                    : ['rgba(185, 84, 236, 0.08)', 'rgba(185, 84, 236, 0.04)']}
                                style={[
                                    styles.activityGradient,
                                    selectedActivity === 'Restaurant' && styles.selectedActivityGradient
                                ]}
                            >
                                <View style={styles.activityIconCircle}>
                                    <Hamburger
                                        color={selectedActivity === 'Restaurant' ? '#fff' : '#FF6B6B'}
                                        size={36}
                                        strokeWidth={1.5}
                                    />
                                </View>
                                <Text style={[
                                    styles.activityButtonTitle,
                                    selectedActivity === 'Restaurant' && styles.selectedActivityTitle
                                ]}>Dining</Text>
                                {selectedActivity === 'Restaurant' && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>

                        {/* Bar Button */}
                        <TouchableOpacity
                            style={styles.activityOption}
                            onPress={() => {
                                setSelectedActivity('Cocktails')
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                            }}
                            activeOpacity={0.9}
                        >
                            <LinearGradient
                                colors={selectedActivity === 'Cocktails' 
                                    ? ['#B954EC', '#9C3FCC'] 
                                    : ['rgba(185, 84, 236, 0.08)', 'rgba(185, 84, 236, 0.04)']}
                                style={[
                                    styles.activityGradient,
                                    selectedActivity === 'Cocktails' && styles.selectedActivityGradient
                                ]}
                            >
                                <View style={styles.activityIconCircle}>
                                    <Martini
                                        color={selectedActivity === 'Cocktails' ? '#fff' : '#4ECDC4'}
                                        size={36}
                                        strokeWidth={1.5}
                                    />
                                </View>
                                <Text style={[
                                    styles.activityButtonTitle,
                                    selectedActivity === 'Cocktails' && styles.selectedActivityTitle
                                ]}>Drinks</Text>
                                {selectedActivity === 'Cocktails' && (
                                    <View style={styles.checkmark}>
                                        <Text style={styles.checkmarkText}>✓</Text>
                                    </View>
                                )}
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                )}

                {step === 2 && selectedActivity !== 'Game Night' && (
                    <View style={styles.locationContainer}>
                        {savedLocationUsed ? (
                            <View style={styles.savedLocationCard}>
                                <View style={styles.savedLocationHeader}>
                                    <View style={styles.locationIconBadge}>
                                        <MapPin color="#fff" size={18} strokeWidth={2.5} />
                                    </View>
                                    <Text style={styles.savedLocationLabel}>Using saved location</Text>
                                </View>
                                <Text style={styles.savedLocationText}>{location}</Text>
                                <TouchableOpacity 
                                    onPress={() => {
                                        setSavedLocationUsed(false)
                                        setLocation('')
                                        setCoords(null)
                                    }}
                                    style={styles.changeLocationButton}
                                >
                                    <Text style={styles.changeLocationText}>Change location</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.locationOptions}>
                                <TouchableOpacity
                                    style={[
                                        styles.locationOptionCard,
                                        currentLocationUsed && styles.locationOptionCardActive
                                    ]}
                                    onPress={getCurrentLocation}
                                    disabled={isLocating}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.locationOptionIcon,
                                        currentLocationUsed && styles.locationOptionIconActive
                                    ]}>
                                        {isLocating ? (
                                            <ActivityIndicator color="#cc31e8" size="small" />
                                        ) : (
                                            <MapPin 
                                                color={currentLocationUsed ? '#fff' : '#cc31e8'} 
                                                size={22} 
                                                strokeWidth={2.5}
                                            />
                                        )}
                                    </View>
                                    <View style={styles.locationOptionContent}>
                                        <Text style={[
                                            styles.locationOptionTitle,
                                            currentLocationUsed && styles.locationOptionTitleActive
                                        ]}>
                                            Current Location
                                        </Text>
                                        <Text style={[
                                            styles.locationOptionDesc,
                                            currentLocationUsed && styles.locationOptionDescActive
                                        ]}>
                                            {currentLocationUsed ? 'Using GPS location' : 'Use your GPS location'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[
                                        styles.locationOptionCard,
                                        location && !currentLocationUsed && styles.locationOptionCardActive
                                    ]}
                                    onPress={() => setShowLocationSearch(true)}
                                    activeOpacity={0.7}
                                >
                                    <View style={[
                                        styles.locationOptionIcon,
                                        location && !currentLocationUsed && styles.locationOptionIconActive
                                    ]}>
                                        <Search 
                                            color={location && !currentLocationUsed ? '#fff' : '#B8A5C4'} 
                                            size={22} 
                                            strokeWidth={2.5}
                                        />
                                    </View>
                                    <View style={styles.locationOptionContent}>
                                        <Text style={[
                                            styles.locationOptionTitle,
                                            location && !currentLocationUsed && styles.locationOptionTitleActive
                                        ]}>
                                            Search Location
                                        </Text>
                                        <Text style={[
                                            styles.locationOptionDesc,
                                            location && !currentLocationUsed && styles.locationOptionDescActive
                                        ]}>
                                            {location && !currentLocationUsed ? location : 'Enter a specific address'}
                                        </Text>
                                    </View>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                )}

                {step === 3 && selectedActivity === 'Restaurant' && (
                    <View style={styles.optionsGrid}>
                        {foodTimeOptions.map((option) => {
                            const IconComponent = option.icon
                            const isSelected = selectedTimeOfDay === option.value
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.timeOption,
                                        isSelected && styles.timeOptionSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedTimeOfDay(option.value)
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    }}
                                >
                                    <IconComponent 
                                        color={isSelected ? '#fff' : '#B8A5C4'} 
                                        size={24} 
                                        strokeWidth={2}
                                    />
                                    <Text style={[
                                        styles.optionLabel,
                                        isSelected && styles.optionLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.optionDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}

                {step === 3 && selectedActivity === 'Cocktails' && (
                    <View style={styles.optionsGrid}>
                        {drinksTimeOptions.map((option) => {
                            const IconComponent = option.icon
                            const isSelected = selectedTimeOfDay === option.value
                            return (
                                <TouchableOpacity
                                    key={option.value}
                                    style={[
                                        styles.timeOption,
                                        isSelected && styles.timeOptionSelected
                                    ]}
                                    onPress={() => {
                                        setSelectedTimeOfDay(option.value)
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    }}
                                >
                                    <IconComponent 
                                        color={isSelected ? '#fff' : '#B8A5C4'} 
                                        size={24} 
                                        strokeWidth={2}
                                    />
                                    <Text style={[
                                        styles.optionLabel,
                                        isSelected && styles.optionLabelSelected
                                    ]}>
                                        {option.label}
                                    </Text>
                                    <Text style={styles.optionDesc}>{option.desc}</Text>
                                </TouchableOpacity>
                            )
                        })}
                    </View>
                )}


            </Animated.View>
        )
    }

    // Validation
    const isNextDisabled = () => {
        if (isSubmitting) return true
        
        switch (step) {
            case 1:
                return !selectedActivity
            case 2:
                const hasTypedLocation = location && location.trim() && location !== 'Using current location'
                const hasCurrentLocation = currentLocationUsed && coords && coords.lat && coords.lng
                const hasSaved = savedLocationUsed && location
                return !hasTypedLocation && !hasCurrentLocation && !hasSaved
            case 3:
                if (selectedActivity === 'Restaurant' || selectedActivity === 'Cocktails') {
                    return !selectedTimeOfDay
                }
                return false
            default:
                return false
        }
    }

    // Navigation
    const handleNext = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        if (step < totalSteps) {
            fadeAnim.setValue(0)
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        if (step > 1) {
            fadeAnim.setValue(0)
            setStep(step - 1)
        }
    }

    // Submit
    const handleSubmit = async () => {
        if (isSubmitting) return
        
        try {
            setIsSubmitting(true)
            
            // Format location for restaurant/bar
            let activityLocation = location.trim()
            if (currentLocationUsed && coords) {
                activityLocation = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
            } else if (savedLocationUsed && user?.latitude && user?.longitude) {
                activityLocation = `${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}`
            }

            // Build payload based on activity type
            let payload = {
                activity_name: activities.find(a => a.type === selectedActivity)?.name || selectedActivity,
                activity_type: selectedActivity,
                activity_location: activityLocation,
                radius: 10,
                collecting: true
            }

            // Add venue-specific fields
            if (selectedActivity === 'Restaurant') {
                payload.time_of_day = selectedTimeOfDay
                payload.responses = `Time of day: ${selectedTimeOfDay}`
                payload.date_notes = `Looking for ${selectedTimeOfDay} restaurants`
            } else if (selectedActivity === 'Cocktails') {
                payload.time_of_day = selectedTimeOfDay
                payload.responses = `Time: ${selectedTimeOfDay}`
                payload.date_notes = `Looking for ${selectedTimeOfDay} bars and lounges`
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
                throw new Error(`Failed to create activity: ${response.status} ${errorText}`)
            }

            const data = await response.json()

            // Update user context
            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [] },
                ],
            }))

            // Success!
            setIsSubmitting(false)
            showSuccessAnimation()
            
            setTimeout(() => {
                setShowSuccess(false)
                successAnim.setValue(0) // Reset animation
                setTimeout(() => {
                    onClose(data.id) // Pass activity ID back after animation cleanup
                }, 100)
            }, 1500)
            
        } catch (error) {
            logger.error('Error creating activity:', error)
            Alert.alert('Error', 'Failed to create plan. Please try again.')
            setIsSubmitting(false)
        }
    }

    // Success animation
    const showSuccessAnimation = () => {
        setShowSuccess(true)
        Animated.timing(successAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
        }).start()
    }

    // Progress bar
    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        { width: `${percent}%` }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                {isSubmitting ? 'Processing...' : `${step} of ${totalSteps}`}
            </Text>
        </View>
    )

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
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={styles.footer}>
                    <View style={styles.buttonContainer}>
                        {step > 1 ? (
                            <TouchableOpacity
                                style={styles.backButton}
                                onPress={handleBack}
                                disabled={isSubmitting}
                            >
                                <ArrowLeft color="#B8A5C4" size={20} />
                                <Text style={styles.backButtonText}>Back</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={{ flex: 1 }} />
                        )}

                        <TouchableOpacity
                            style={[
                                styles.nextButton,
                                isNextDisabled() && styles.nextButtonDisabled
                            ]}
                            onPress={handleNext}
                            disabled={isNextDisabled()}
                        >
                            <LinearGradient
                                colors={['#cc31e8', '#9b1dbd']}
                                style={styles.nextButtonGradient}
                            >
                                <Text style={styles.nextButtonText}>
                                    {step < totalSteps ? 'Next' : 'Start Planning'}
                                </Text>
                                <ArrowRight color="#fff" size={20} />
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Loading/Success Overlay - Using absolute positioning instead of nested modal */}
                {(isSubmitting || showSuccess) && (
                    <View style={[styles.fullScreenOverlay, { position: 'absolute' }]}>
                        {isSubmitting ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color="#cc31e8" />
                                <Text style={styles.loadingText}>{loadingMessage}</Text>
                            </View>
                        ) : (
                            <Animated.View style={[styles.successContainer, { opacity: successAnim }]}>
                                <Animated.View 
                                    style={[
                                        styles.successLogoContainer,
                                        {
                                            transform: [
                                                {
                                                    scale: successAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.8, 1]
                                                    })
                                                }
                                            ]
                                        }
                                    ]}
                                >
                                    <Image 
                                        source={VoxxyLogo} 
                                        style={styles.successLogo}
                                        resizeMode="contain"
                                    />
                                </Animated.View>
                                <Text style={styles.successText}>Plan Created!</Text>
                            </Animated.View>
                        )}
                    </View>
                )}

                {/* Location Search Modal */}
                <SearchLocationModal
                    visible={showLocationSearch}
                    onClose={() => setShowLocationSearch(false)}
                    onLocationSelect={(loc) => {
                        // Use formatted address or construct from parts
                        const locationText = loc.formatted || 
                            [loc.neighborhood, loc.city, loc.state].filter(Boolean).join(', ')
                        
                        setLocation(locationText)
                        
                        // Set coordinates if available
                        if (loc.latitude && loc.longitude) {
                            setCoords({
                                lat: loc.latitude,
                                lng: loc.longitude
                            })
                        }
                        
                        setCurrentLocationUsed(false)
                        setSavedLocationUsed(false)
                        setShowLocationSearch(false)
                    }}
                />
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    
    // Activity selection button styles
    activityButtonsContainer: {
        paddingHorizontal: 20,
        gap: 16,
        marginTop: 40,
        flex: 1,
        justifyContent: 'center',
    },
    
    activityOption: {
        width: '100%',
        borderRadius: 20,
        overflow: 'hidden',
        marginBottom: 8,
    },
    
    activityGradient: {
        paddingVertical: 28,
        paddingHorizontal: 32,
        borderRadius: 24,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: 'rgba(185, 84, 236, 0.15)',
        position: 'relative',
        minHeight: 110,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 2,
    },
    
    selectedActivityGradient: {
        borderColor: 'rgba(185, 84, 236, 0.6)',
        borderWidth: 2,
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 4,
    },
    
    activityIconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.12)',
    },
    
    activityButtonTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
        flex: 1,
    },
    
    selectedActivityTitle: {
        color: '#fff',
    },
    
    activityButtonDesc: {
        fontSize: 15,
        color: 'rgba(184, 165, 196, 0.8)',
        fontFamily: 'Montserrat_500Medium',
        position: 'absolute',
        bottom: 26,
        left: 104,
    },
    
    selectedActivityDesc: {
        color: 'rgba(255, 255, 255, 0.8)',
    },
    
    checkmark: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    
    checkmarkText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressContainer: {
        paddingHorizontal: 24,
        paddingTop: 24,
        paddingBottom: 16,
    },
    progressBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 2,
    },
    progressText: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        marginTop: 10,
        textAlign: 'center',
        fontFamily: 'Montserrat_500Medium',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    header: {
        paddingHorizontal: 24,
        paddingTop: 8,
        paddingBottom: 24,
        alignItems: 'center',
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 10,
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        fontFamily: 'Montserrat_400Regular',
        lineHeight: 22,
    },
    content: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 24,
    },
    optionsGrid: {
        gap: 12,
    },
    activityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    activityCard: {
        width: '47%',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        alignItems: 'center',
        minHeight: 145,
        justifyContent: 'center',
    },
    activityCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderWidth: 2,
    },
    activityIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    activityIconContainerSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.25)',
    },
    activityLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Montserrat_600SemiBold',
        letterSpacing: 0.2,
    },
    activityLabelSelected: {
        color: '#fff',
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    timeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 12,
        gap: 14,
    },
    timeOptionSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderWidth: 2,
    },
    groupOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        marginBottom: 12,
        gap: 14,
    },
    groupOptionSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderWidth: 2,
    },
    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
        fontFamily: 'Montserrat_600SemiBold',
    },
    optionLabelSelected: {
        color: '#fff',
    },
    optionDesc: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Montserrat_400Regular',
    },
    locationContainer: {
        flex: 1,
    },
    locationOptions: {
        gap: 16,
    },
    locationOptionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1.5,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 16,
    },
    locationOptionCardActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderColor: 'rgba(204, 49, 232, 0.5)',
        borderWidth: 2,
    },
    locationOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.06)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    locationOptionIconActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.25)',
    },
    locationOptionContent: {
        flex: 1,
    },
    locationOptionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        fontFamily: 'Montserrat_600SemiBold',
    },
    locationOptionTitleActive: {
        color: '#fff',
    },
    locationOptionDesc: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Montserrat_400Regular',
    },
    locationOptionDescActive: {
        color: 'rgba(255, 255, 255, 0.7)',
    },
    savedLocationCard: {
        backgroundColor: 'rgba(204, 49, 232, 0.12)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.5)',
    },
    savedLocationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 12,
    },
    locationIconBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#cc31e8',
        alignItems: 'center',
        justifyContent: 'center',
    },
    savedLocationLabel: {
        fontSize: 12,
        color: 'rgba(255, 255, 255, 0.7)',
        fontFamily: 'Montserrat_500Medium',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    savedLocationText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        fontFamily: 'Montserrat_600SemiBold',
    },
    changeLocationButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    changeLocationText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    footer: {
        paddingHorizontal: 24,
        paddingTop: 16,
        paddingBottom: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.08)',
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    backButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        gap: 8,
    },
    backButtonText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    nextButton: {
        flex: 1,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    nextButtonDisabled: {
        opacity: 0.4,
        elevation: 0,
    },
    nextButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.3,
    },
    fullScreenOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
    },
    loadingContainer: {
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        color: '#fff',
        fontSize: 16,
        marginTop: 16,
    },
    successContainer: {
        alignItems: 'center',
        gap: 20,
    },
    successLogoContainer: {
        width: 100,
        height: 100,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderRadius: 50,
        padding: 20,
    },
    successLogo: {
        width: 60,
        height: 60,
        tintColor: '#cc31e8',
    },
    successText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginTop: 8,
    },
})