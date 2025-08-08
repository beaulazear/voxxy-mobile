import React, { useState, useContext } from 'react'
import {
    View,
    Text,
    TextInput,
    ScrollView,
    SafeAreaView,
    Modal,
    TouchableOpacity,
    Alert,
    Platform,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import {
    FormStyles,
    GradientButton,
    GradientCard,
    GradientTimeCard,
    gradientConfigs
} from '../styles/FormStyles'
import { LinearGradient } from 'expo-linear-gradient'
import {
    MapPin,
    Users,
    Clock,
    MessageSquare,
    Edit3,
    Search,
    ChevronRight,
    Home,
    UserPlus,
    Coffee,
    Sun,
    Sunset,
    Moon
} from 'lucide-react-native'
import * as Location from 'expo-location'
import { API_URL } from '../config'
import { logger } from '../utils/logger'
import SearchLocationModal from './SearchLocationModal'

export default function CocktailsChat({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)

    const [step, setStep] = useState(1)
    const totalSteps = 3

    const percent = (step / totalSteps) * 100

    // Step 1: Location
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [selectedLocationOption, setSelectedLocationOption] = useState('') // 'profile', 'current', 'custom'
    const [showSearchModal, setShowSearchModal] = useState(false)
    const [customLocation, setCustomLocation] = useState({
        neighborhood: '',
        city: '',
        state: '',
        latitude: null,
        longitude: null,
        formatted: ''
    })
    const [radius] = useState(10)

    // Step 2: Group Size
    const [groupSize, setGroupSize] = useState('')

    // Step 3: Time of Day
    const [timeOfDay, setTimeOfDay] = useState('')

    const headers = [
        {
            title: 'Activity Location',
            subtitle: 'Choose from your saved location, current location, or search for a new one.'
        },
        {
            title: 'How large is your group?',
            subtitle: 'Select one option.',
        },
        {
            title: 'When will it happen?',
            subtitle: 'Choose the vibe for your night out.',
        },
    ]

    const { title, subtitle } = headers[step - 1]

    const groupSizeOptions = [
        {
            value: '1-2',
            icon: Users,
            label: 'Intimate',
            subtitle: '1-2 people'
        },
        {
            value: '3-4',
            icon: Users,
            label: 'Small Group',
            subtitle: '3-4 people'
        },
        {
            value: '5-9',
            icon: UserPlus,
            label: 'Party',
            subtitle: '5-9 people'
        },
        {
            value: '10+',
            icon: UserPlus,
            label: 'Big Night Out',
            subtitle: '10+ people'
        }
    ]

    const timeOfDayOptions = [
        { value: 'brunch cocktails', label: 'Brunch Cocktails', icon: Coffee },
        { value: 'afternoon drinks', label: 'Afternoon Drinks', icon: Sun },
        { value: 'happy hour', label: 'Happy Hour', icon: Sunset },
        { value: 'late night cocktails', label: 'Late Night Cocktails', icon: Moon }
    ]

    // Auto-advance for smooth UX
    const handleGroupSizeSelect = (size) => {
        setGroupSize(size)
        // Auto-advance after a short delay for smooth UX
        setTimeout(() => {
            setStep(3)
        }, 300)
    }

    const handleTimeOfDaySelect = (time) => {
        setTimeOfDay(time)
        // Don't auto-advance since this is the last step now
    }

    const useCurrentLocation = async () => {
        setIsLocating(true)

        try {
            // Request permission to access location
            const { status } = await Location.requestForegroundPermissionsAsync()

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Permission to access location was denied. Please enable location services in your device settings.'
                )
                setIsLocating(false)
                return
            }

            // Get current position
            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 15000,
                distanceInterval: 10
            })

            // Reverse geocode to get address
            const [address] = await Location.reverseGeocodeAsync({
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
            })

            if (address) {
                const locationData = {
                    neighborhood: address.district || address.subregion || '',
                    city: address.city || '',
                    state: address.region || '',
                    formatted: `${address.city}, ${address.region}`,
                    latitude: location.coords.latitude,
                    longitude: location.coords.longitude
                }
                setCustomLocation(locationData)
                setLocation(locationData.formatted)
            }

            setCoords({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            })
            setSelectedLocationOption('current')
            setIsLocating(false)
        } catch (error) {
            logger.error('Location error:', error)
            Alert.alert('Location Error', 'Failed to get your current location. Please try another option.')
            setIsLocating(false)
        }
    }

    const handleLocationSelect = (locationData) => {
        setCustomLocation(locationData)
        setLocation(locationData.formatted)
        setSelectedLocationOption('custom')
        if (locationData.latitude && locationData.longitude) {
            setCoords({
                lat: locationData.latitude,
                lng: locationData.longitude,
            })
        }
    }

    const handleUseProfileLocation = () => {
        if (user?.city && user?.state) {
            const profileLocation = `${user.city}, ${user.state}`
            setLocation(profileLocation)
            setSelectedLocationOption('profile')
            // Use user's saved coordinates if available
            if (user?.latitude && user?.longitude) {
                setCoords({
                    lat: user.latitude,
                    lng: user.longitude,
                })
            }
        }
    }

    const isNextDisabled = () => {
        if (step === 1) return !selectedLocationOption || !location.trim()
        if (step === 2) return !groupSize
        if (step === 3) return !timeOfDay
        return false
    }

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1)
        } else {
            handleSubmit()
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSubmit = async () => {
        logger.debug('🍸 Starting cocktails activity creation...')

        const payload = {
            activity_type: 'Cocktails',
            emoji: '🥃',
            activity_location: (() => {
                // Determine the location string to send
                if (selectedLocationOption === 'current' && coords) {
                    return `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                } else if (selectedLocationOption === 'custom' && customLocation.latitude && customLocation.longitude) {
                    return `${customLocation.latitude.toFixed(6)}, ${customLocation.longitude.toFixed(6)}`
                } else if (selectedLocationOption === 'profile' && user?.latitude && user?.longitude) {
                    return `${user.latitude.toFixed(6)}, ${user.longitude.toFixed(6)}`
                }
                return location.trim()
            })(),
            radius,
            group_size: groupSize,
            // Always send 'TBD' for date/time, save timeOfDay as date_notes
            date_day: 'TBD',
            date_time: 'TBD',
            activity_name: 'Drinks',
            welcome_message: 'Someone wants you to submit your preferences! Help them plan the perfect night out with your group of friends.',
            allow_participant_time_selection: false,
            date_notes: timeOfDay,
            participants: [],
            collecting: true
        }

        logger.debug('🍸 Payload:', payload)

        try {
            const response = await fetch(`${API_URL}/activities`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`,
                },
                body: JSON.stringify({ activity: payload }),
            })

            if (!response.ok) {
                const errorData = await response.json()
                
                // Handle rate limiting with user-friendly message
                if (response.status === 429) {
                    throw new Error('Too many requests, try again later')
                }
                
                throw new Error(errorData.errors ? errorData.errors.join(', ') : 'Failed to create activity')
            }

            const data = await response.json()
            logger.debug('✅ Cocktails activity created successfully:', data)

            // Update user context with new activity
            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [] },
                ],
            }))

            logger.debug('🔄 Calling onClose with activity ID:', data.id)

            // Navigate to activity details - parent component handles this
            onClose(data.id)
        } catch (error) {
            logger.error('❌ Error creating cocktails activity:', error)
            Alert.alert('Error', error.message || 'Failed to create activity. Please try again.')
        }
    }

    const renderProgressBar = () => (
        <View style={FormStyles.progressBarContainer}>
            <LinearGradient
                {...gradientConfigs.primary}
                style={[FormStyles.progressBar, { width: `${percent}%` }]}
            />
        </View>
    )

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={FormStyles.section}>
                        {/* Current location display if selected */}
                        {selectedLocationOption && location && (
                            <View style={FormStyles.selectedLocationContainer}>
                                <MapPin color="#cc31e8" size={16} />
                                <Text style={FormStyles.selectedLocationText}>{location}</Text>
                            </View>
                        )}

                        {/* Profile Location Option */}
                        {user?.city && user?.state && (
                            <TouchableOpacity
                                style={[
                                    FormStyles.locationOptionButton,
                                    selectedLocationOption === 'profile' && FormStyles.locationOptionButtonSelected
                                ]}
                                onPress={handleUseProfileLocation}
                                activeOpacity={0.7}
                            >
                                <View style={FormStyles.locationButtonContent}>
                                    <Home color="#cc31e8" size={20} />
                                    <View style={FormStyles.locationButtonTextContainer}>
                                        <Text style={FormStyles.locationButtonText}>Use My Location</Text>
                                        <Text style={FormStyles.locationButtonSubtext}>
                                            {user.city}, {user.state}
                                        </Text>
                                    </View>
                                </View>
                                <ChevronRight color="#aaa" size={20} />
                            </TouchableOpacity>
                        )}

                        {/* Current Device Location Option */}
                        <TouchableOpacity
                            style={[
                                FormStyles.locationOptionButton,
                                selectedLocationOption === 'current' && FormStyles.locationOptionButtonSelected
                            ]}
                            onPress={useCurrentLocation}
                            disabled={isLocating}
                            activeOpacity={0.7}
                        >
                            <View style={FormStyles.locationButtonContent}>
                                <MapPin color="#cc31e8" size={20} />
                                <View style={FormStyles.locationButtonTextContainer}>
                                    <Text style={FormStyles.locationButtonText}>
                                        {isLocating ? 'Getting location...' : 'Use Current Location'}
                                    </Text>
                                    <Text style={FormStyles.locationButtonSubtext}>
                                        GPS location from your device
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#aaa" size={20} />
                        </TouchableOpacity>

                        {/* Search for Custom Location Option */}
                        <TouchableOpacity
                            style={[
                                FormStyles.locationOptionButton,
                                selectedLocationOption === 'custom' && FormStyles.locationOptionButtonSelected
                            ]}
                            onPress={() => setShowSearchModal(true)}
                            activeOpacity={0.7}
                        >
                            <View style={FormStyles.locationButtonContent}>
                                <Search color="#cc31e8" size={20} />
                                <View style={FormStyles.locationButtonTextContainer}>
                                    <Text style={FormStyles.locationButtonText}>Search for Location</Text>
                                    <Text style={FormStyles.locationButtonSubtext}>
                                        Find a specific city or neighborhood
                                    </Text>
                                </View>
                            </View>
                            <ChevronRight color="#aaa" size={20} />
                        </TouchableOpacity>

                        {/* Search Location Modal */}
                        <SearchLocationModal
                            visible={showSearchModal}
                            onClose={() => setShowSearchModal(false)}
                            onLocationSelect={handleLocationSelect}
                        />
                    </View>
                )

            case 2:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {groupSizeOptions.map((option) => (
                                <View key={option.value} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientCard
                                        selected={groupSize === option.value}
                                        onPress={() => handleGroupSizeSelect(option.value)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0, // Let aspectRatio control height
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <option.icon color="#fff" size={28} style={{ marginBottom: 6 }} />
                                        <Text style={[FormStyles.cardLabel, { fontSize: 14, marginBottom: 2 }]}>{option.label}</Text>
                                        <Text style={[FormStyles.cardSubtitle, { fontSize: 11 }]}>{option.subtitle}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                )

            case 3:
                // Time of day selection only
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {timeOfDayOptions.map((option) => (
                                <View key={option.value} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientTimeCard
                                        selected={timeOfDay === option.value}
                                        onPress={() => handleTimeOfDaySelect(option.value)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0, // Let aspectRatio control height
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <option.icon color="#fff" size={20} style={{ marginBottom: 6 }} />
                                        <Text style={[FormStyles.timeCardText, { fontSize: 14, textAlign: 'center' }]}>
                                            {option.label}
                                        </Text>
                                    </GradientTimeCard>
                                </View>
                            ))}
                        </View>
                        <Text style={[FormStyles.labelText, {
                            textAlign: 'center',
                            color: '#aaa',
                            fontSize: 14,
                            marginTop: 20,
                            lineHeight: 20
                        }]}>
                            📅 Specific date and time will be decided later
                        </Text>
                    </View>
                )

            default:
                return null
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => onClose(null)}
        >
            <SafeAreaView style={FormStyles.modalContainer}>
                {/* Progress Bar */}
                {renderProgressBar()}

                {/* Step Label */}
                <Text style={FormStyles.stepLabel}>
                    Step {step} of {totalSteps}
                </Text>

                {/* Header */}
                <View style={FormStyles.modalHeader}>
                    <Text style={FormStyles.title}>{title}</Text>
                    <Text style={FormStyles.subtitle}>{subtitle}</Text>
                </View>

                {/* Content */}
                <ScrollView
                    style={FormStyles.stepContent}
                    contentContainerStyle={FormStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderStepContent()}
                </ScrollView>

                {/* Button Row - Always visible */}
                <View style={FormStyles.buttonRow}>
                    <TouchableOpacity
                        style={step > 1 ? FormStyles.buttonSecondary : FormStyles.buttonSecondaryDisabled}
                        onPress={step > 1 ? handleBack : null}
                        activeOpacity={step > 1 ? 0.8 : 1}
                        disabled={step === 1}
                    >
                        <Text style={step > 1 ? FormStyles.buttonTextSecondary : FormStyles.buttonTextSecondaryDisabled}>
                            Back
                        </Text>
                    </TouchableOpacity>

                    <GradientButton
                        onPress={step < totalSteps ? handleNext : handleSubmit}
                        disabled={isNextDisabled()}
                        style={FormStyles.flex1}
                    >
                        <Text style={FormStyles.buttonTextPrimary}>
                            {step < totalSteps ? 'Next' : 'Create Night Out'}
                        </Text>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    )
}