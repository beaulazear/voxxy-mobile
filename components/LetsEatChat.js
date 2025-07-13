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
    Edit3
} from 'react-native-feather'
import Slider from '@react-native-community/slider'
import * as Location from 'expo-location'
import { API_URL } from '../config'

export default function LetsEatChat({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)

    const [step, setStep] = useState(1)
    const totalSteps = 5

    const percent = (step / totalSteps) * 100

    // Step 1: Location
    const [location, setLocation] = useState('')
    const [coords, setCoords] = useState(null)
    const [isLocating, setIsLocating] = useState(false)
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false)
    const [radius, setRadius] = useState(10)

    // Step 2: Group Size
    const [groupSize, setGroupSize] = useState('')

    // Step 3: Time of Day
    const [timeOfDay, setTimeOfDay] = useState('')

    // Step 4: Event Details
    const [eventName, setEventName] = useState('')
    const [welcomeMessage, setWelcomeMessage] = useState('')

    const headers = [
        {
            title: 'Where to meet?',
            subtitle: 'City/neighborhood or use current, then choose radius.',
        },
        {
            title: 'How large is your group?',
            subtitle: 'Select one option.',
        },
        {
            title: 'When will it happen?',
            subtitle: 'Choose a general time of day for your meal.',
        },
        {
            title: 'Event Name',
            subtitle: 'Give your event a name.',
        },
        {
            title: 'Welcome Message',
            subtitle: 'Leave a detailed message for your group explaining the activity!',
        },
    ]

    const { title, subtitle } = headers[step - 1]

    const groupSizeOptions = [
        {
            value: '1-2',
            icon: '👥',
            label: 'Intimate',
            subtitle: '1-2 people'
        },
        {
            value: '3-4',
            icon: '👪',
            label: 'Small Group',
            subtitle: '3-4 people'
        },
        {
            value: '5-9',
            icon: '🎉',
            label: 'Party',
            subtitle: '5-9 people'
        },
        {
            value: '10+',
            icon: '🎊',
            label: 'Big Celebration',
            subtitle: '10+ people'
        }
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
        // Auto-advance after a short delay for smooth UX
        setTimeout(() => {
            setStep(4)
        }, 300)
    }

    const timeOfDayOptions = [
        { value: 'breakfast', label: 'Breakfast 🥞' },
        { value: 'brunch', label: 'Brunch 🥂' },
        { value: 'lunch', label: 'Lunch 🥗' },
        { value: 'dinner', label: 'Dinner 🥘' }
    ]

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

            setCoords({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            })
            setCurrentLocationUsed(true)
            setLocation('')
            setIsLocating(false)
        } catch (error) {
            console.error('Location error:', error)
            Alert.alert('Location Error', 'Failed to get your current location. Please enter it manually.')
            setIsLocating(false)
        }
    }

    const isNextDisabled = () => {
        if (step === 1) return !location.trim() && !currentLocationUsed
        if (step === 2) return !groupSize
        if (step === 3) return !timeOfDay
        if (step === 4) return !eventName.trim()
        if (step === 5) return !welcomeMessage.trim()
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
        const payload = {
            activity_type: 'Restaurant',
            emoji: '🍜',
            activity_location: currentLocationUsed
                ? `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`
                : location.trim(),
            radius,
            group_size: groupSize,
            // Always TBD for specific date/time
            date_day: 'TBD',
            date_time: 'TBD',
            activity_name: eventName.trim(),
            welcome_message: welcomeMessage.trim(),
            allow_participant_time_selection: false,
            date_notes: timeOfDay, // Save the selected time of day
            participants: [],
            collecting: true
        }

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
                throw new Error('Failed to create activity')
            }

            const data = await response.json()

            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [] },
                ],
            }))

            Alert.alert('Success!', 'Your restaurant activity has been created!')
            onClose(data.id)
        } catch (error) {
            console.error('Error creating activity:', error)
            Alert.alert('Error', 'Failed to create activity. Please try again.')
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
                        <TextInput
                            style={FormStyles.input}
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
                            placeholderTextColor="#aaa"
                            editable={!currentLocationUsed}
                        />

                        <TouchableOpacity
                            style={FormStyles.useLocationButton}
                            onPress={useCurrentLocation}
                            disabled={isLocating || currentLocationUsed}
                        >
                            <MapPin stroke="#cc31e8" width={16} height={16} />
                            <Text style={FormStyles.useLocationButtonText}>
                                {currentLocationUsed
                                    ? 'Using current location'
                                    : isLocating
                                        ? 'Locating…'
                                        : 'Use my current location'}
                            </Text>
                        </TouchableOpacity>

                        <Text style={FormStyles.rangeLabel}>
                            Search Radius: {radius} miles
                        </Text>
                        <View style={FormStyles.sliderContainer}>
                            <Slider
                                style={FormStyles.slider}
                                minimumValue={1}
                                maximumValue={50}
                                value={radius}
                                onValueChange={setRadius}
                                step={1}
                                minimumTrackTintColor="#cc31e8"
                                maximumTrackTintColor="rgba(255, 255, 255, 0.1)"
                                thumbStyle={{ backgroundColor: '#cc31e8' }}
                            />
                        </View>
                        <Text style={FormStyles.rangeValue}>{radius} miles</Text>
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
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 6 }]}>{option.icon}</Text>
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

            case 4:
                // Event name step
                return (
                    <View style={FormStyles.section}>
                        <TextInput
                            style={FormStyles.input}
                            value={eventName}
                            onChangeText={setEventName}
                            placeholder="Enter event name (e.g. Friday Feast)"
                            placeholderTextColor="#aaa"
                            returnKeyType="next"
                            onSubmitEditing={() => {
                                if (eventName.trim()) {
                                    setStep(5)
                                }
                            }}
                        />
                    </View>
                )

            case 5:
                // Welcome message step
                return (
                    <View style={FormStyles.section}>
                        <TextInput
                            style={FormStyles.textarea}
                            value={welcomeMessage}
                            onChangeText={setWelcomeMessage}
                            placeholder="Write a welcome message for your group explaining the activity..."
                            placeholderTextColor="#aaa"
                            multiline
                            numberOfLines={4}
                            returnKeyType="done"
                            blurOnSubmit={true}
                        />
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
                            {step < totalSteps ? 'Next' : 'Create Activity'}
                        </Text>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    )
}