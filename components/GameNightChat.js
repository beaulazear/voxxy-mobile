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
    Users,
    Clock,
    MessageSquare,
    Edit3,
    Home,
    UserPlus,
    Sun,
    Sunset,
    Moon,
    Zap
} from 'lucide-react-native'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

export default function GameNightChat({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)

    const [step, setStep] = useState(1)
    const totalSteps = 2

    const percent = (step / totalSteps) * 100

    // Step 1: Group Size
    const [groupSize, setGroupSize] = useState('')

    // Step 2: Time of Day
    const [timeOfDay, setTimeOfDay] = useState('')

    const headers = [
        {
            title: 'How large is your group?',
            subtitle: 'Select one option.',
        },
        {
            title: 'When will it happen?',
            subtitle: 'Choose the vibe for your game night.',
        },
    ]

    const { title, subtitle } = headers[step - 1]

    const groupSizeOptions = [
        {
            value: '2-3',
            icon: Users,
            label: 'Small Group',
            subtitle: '2-3 people'
        },
        {
            value: '4-6',
            icon: Users,
            label: 'Perfect Size',
            subtitle: '4-6 people'
        },
        {
            value: '7-10',
            icon: UserPlus,
            label: 'Big Group',
            subtitle: '7-10 people'
        },
        {
            value: '10+',
            icon: UserPlus,
            label: 'Party Night',
            subtitle: '10+ people'
        }
    ]

    const timeOfDayOptions = [
        { value: 'morning game session', label: 'Morning Session', icon: Sun },
        { value: 'afternoon gaming', label: 'Afternoon Gaming', icon: Sunset },
        { value: 'evening game night', label: 'Evening Game Night', icon: Moon },
        { value: 'late night gaming', label: 'Late Night Gaming', icon: Zap }
    ]

    // Auto-advance for smooth UX
    const handleGroupSizeSelect = (size) => {
        setGroupSize(size)
        // Auto-advance after a short delay for smooth UX
        setTimeout(() => {
            setStep(2)
        }, 300)
    }

    const handleTimeOfDaySelect = (time) => {
        setTimeOfDay(time)
        // Don't auto-advance since this is the last step now
    }

    const isNextDisabled = () => {
        if (step === 1) return !groupSize
        if (step === 2) return !timeOfDay
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
        logger.debug('🎮 Starting game night activity creation...')

        const payload = {
            activity_type: 'Game Night',
            emoji: '🎲',
            activity_location: 'TBD',
            radius: 0, // Game nights don't use radius
            group_size: groupSize,
            // Always send 'TBD' for date/time, save timeOfDay as date_notes
            date_day: 'TBD',
            date_time: 'TBD',
            activity_name: 'Game Night',
            welcome_message: 'Someone wants you to submit your preferences! Help them plan the perfect game night with your group of friends.',
            allow_participant_time_selection: false,
            date_notes: timeOfDay,
            participants: [],
            collecting: true
        }

        logger.debug('🎮 Payload:', payload)

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
                throw new Error(errorData.errors ? errorData.errors.join(', ') : 'Failed to create activity')
            }

            const data = await response.json()
            logger.debug('✅ Game night activity created successfully:', data)

            // Update user context with new activity
            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [], comments: [] },
                ],
            }))

            logger.debug('🔄 Calling onClose with activity ID:', data.id)

            // Navigate to activity details - parent component handles this
            onClose(data.id)
        } catch (error) {
            logger.error('❌ Error creating game night activity:', error)
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

            case 2:
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
                            {step < totalSteps ? 'Next' : 'Create Game Night'}
                        </Text>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    )
}