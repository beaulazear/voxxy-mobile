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
    gradientConfigs
} from '../styles/FormStyles'
import { LinearGradient } from 'expo-linear-gradient'
import {
    Calendar,
    MessageSquare,
    Edit3,
    ChevronLeft,
    ChevronRight,
    X
} from 'react-native-feather'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

export default function LetsMeetChat({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)

    const [step, setStep] = useState(1)
    const totalSteps = 2

    const percent = (step / totalSteps) * 100

    // Step 1: Basic Info
    const [activityName, setActivityName] = useState('')
    const [welcomeMessage, setWelcomeMessage] = useState('')

    // Step 2: Date Selection
    const [tab, setTab] = useState('single')
    const [singleDate, setSingleDate] = useState('')
    const [rangeStart, setRangeStart] = useState('')
    const [rangeEnd, setRangeEnd] = useState('')
    const [multipleDates, setMultipleDates] = useState([])
    const [rangeStartTemp, setRangeStartTemp] = useState('')
    const [error, setError] = useState('')

    // Calendar state
    const [calendarDate, setCalendarDate] = useState(new Date())

    const today = new Date().toISOString().split('T')[0]

    const headers = [
        {
            title: 'Tell us about your meeting',
            subtitle: 'Basic information to help coordinate with your group.',
        },
        {
            title: 'Choose your preferred dates',
            subtitle: 'Select when you\'d like to meet with your group.',
        },
    ]

    const { title, subtitle } = headers[step - 1]

    // Helper functions
    const formatDate = (date) => {
        return date.toISOString().split('T')[0]
    }

    const formatDateForDisplay = (dateStr) => {
        const [year, month, day] = dateStr.split('-')
        const date = new Date(year, month - 1, day)
        return date.toLocaleDateString()
    }

    const isDateInPast = (dateStr) => {
        return dateStr < today
    }

    const isDateValid = (dateStr) => {
        if (!dateStr) return false
        return dateStr >= today
    }

    const isDateRangeValid = (start, end) => {
        if (!start || !end) return false
        if (start < today || end < today) return false
        const startDate = new Date(start)
        const endDate = new Date(end)
        const diffTime = endDate - startDate
        const diffDays = diffTime / (1000 * 60 * 60 * 24)
        return diffDays >= 1
    }

    const getDaysInMonth = (date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        const firstDay = new Date(year, month, 1)
        const lastDay = new Date(year, month + 1, 0)
        const daysInMonth = lastDay.getDate()
        const startingDayOfWeek = firstDay.getDay()

        const days = []

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            days.push(null)
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            days.push(new Date(year, month, day))
        }

        return days
    }

    const dateNotes = () => {
        if (tab === 'single') return singleDate
        if (tab === 'range') return `${rangeStart} to ${rangeEnd}`
        if (tab === 'multiple') return multipleDates.join(', ')
        return ''
    }

    // Calendar handlers
    const handleCalendarDateClick = (date) => {
        const dateStr = formatDate(date)

        if (isDateInPast(dateStr)) return

        setError('')

        if (tab === 'single') {
            setSingleDate(dateStr)
        } else if (tab === 'range') {
            if (!rangeStartTemp) {
                // First click - set start date
                setRangeStartTemp(dateStr)
                setRangeStart('')
                setRangeEnd('')
            } else if (dateStr === rangeStartTemp) {
                // Clicking same date - clear selection
                setRangeStartTemp('')
                setRangeStart('')
                setRangeEnd('')
            } else {
                // Second click - set range
                const start = rangeStartTemp < dateStr ? rangeStartTemp : dateStr
                const end = rangeStartTemp < dateStr ? dateStr : rangeStartTemp

                if (isDateRangeValid(start, end)) {
                    setRangeStart(start)
                    setRangeEnd(end)
                    setRangeStartTemp('')
                } else {
                    setError('Date range must be at least one day apart')
                }
            }
        } else if (tab === 'multiple') {
            const newDates = multipleDates.includes(dateStr)
                ? multipleDates.filter(d => d !== dateStr)
                : [...multipleDates, dateStr].sort()
            setMultipleDates(newDates)
        }
    }

    const removeMultipleDate = (dateToRemove) => {
        setMultipleDates(multipleDates.filter(date => date !== dateToRemove))
    }

    const handleTabChange = (newTab) => {
        setTab(newTab)
        setError('')
        setRangeStartTemp('')
    }

    const isNextDisabled = () => {
        if (step === 1) return !activityName.trim() || !welcomeMessage.trim()
        if (step === 2) {
            if (tab === 'single') return !singleDate
            if (tab === 'range') return !rangeStart || !rangeEnd
            if (tab === 'multiple') return multipleDates.length === 0
        }
        return false
    }

    const handleNext = () => {
        if (step === 2) {
            // Validate dates before submitting
            if (tab === 'single' && !isDateValid(singleDate)) {
                setError('Please select a valid date (today or in the future)')
                return
            }
            if (tab === 'range' && !isDateRangeValid(rangeStart, rangeEnd)) {
                setError('Please select a valid date range (at least one day apart, not in the past)')
                return
            }
            if (tab === 'multiple' && multipleDates.length === 0) {
                setError('Please select at least one date')
                return
            }
            if (tab === 'multiple' && multipleDates.some(date => isDateInPast(date))) {
                setError('All selected dates must be today or in the future')
                return
            }

            handleSubmit()
        } else {
            setStep(step + 1)
        }
    }

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1)
        }
    }

    const handleSubmit = async () => {
        logger.debug('👥 Starting meeting activity creation...')

        const basePayload = {
            activity_type: 'Meeting',
            activity_location: 'TBD',
            activity_name: activityName.trim(),
            welcome_message: welcomeMessage.trim(),
            date_notes: dateNotes(),
            participants: [],
            group_size: 1,
            emoji: '👥',
            collecting: true
        }

        const payload = {
            ...basePayload,
            ...(tab === 'single' && { date_day: singleDate }),
        }

        logger.debug('👥 Payload:', payload)

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
            logger.debug('✅ Meeting activity created successfully:', data)

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
            logger.error('❌ Error creating meeting activity:', error)
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

    const renderCalendar = () => {
        const days = getDaysInMonth(calendarDate)
        const monthNames = [
            'January', 'February', 'March', 'April', 'May', 'June',
            'July', 'August', 'September', 'October', 'November', 'December'
        ]
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

        const isDateSelected = (date) => {
            if (!date) return false
            const dateStr = formatDate(date)

            if (tab === 'single') {
                return dateStr === singleDate
            } else if (tab === 'range') {
                return dateStr === rangeStart || dateStr === rangeEnd || dateStr === rangeStartTemp
            } else if (tab === 'multiple') {
                return multipleDates.includes(dateStr)
            }
            return false
        }

        const isDateInRange = (date) => {
            if (!date || tab !== 'range') return false
            const dateStr = formatDate(date)

            if (!rangeStart || !rangeEnd) return false
            return dateStr > rangeStart && dateStr < rangeEnd
        }

        return (
            <View style={{
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                borderWidth: 1,
                borderColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: 12,
                padding: 16,
                marginTop: 16,
            }}>
                {/* Calendar Header */}
                <View style={{
                    flexDirection: 'row',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 16,
                }}>
                    <TouchableOpacity
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            padding: 8,
                        }}
                        onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1))}
                    >
                        <ChevronLeft stroke="#fff" width={16} height={16} />
                    </TouchableOpacity>

                    <Text style={{
                        fontWeight: '600',
                        color: '#fff',
                        fontSize: 16,
                    }}>
                        {monthNames[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                    </Text>

                    <TouchableOpacity
                        style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                            borderRadius: 8,
                            padding: 8,
                        }}
                        onPress={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1))}
                    >
                        <ChevronRight stroke="#fff" width={16} height={16} />
                    </TouchableOpacity>
                </View>

                {/* Calendar Grid */}
                <View style={{
                    flexDirection: 'row',
                    flexWrap: 'wrap',
                    marginBottom: 16,
                }}>
                    {/* Day Headers */}
                    {dayNames.map(day => (
                        <View key={day} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 8 }}>
                            <Text style={{
                                textAlign: 'center',
                                fontSize: 12,
                                fontWeight: '600',
                                color: '#aaa',
                            }}>
                                {day}
                            </Text>
                        </View>
                    ))}

                    {/* Calendar Days */}
                    {days.map((date, index) => {
                        const dateStr = date ? formatDate(date) : ''
                        const isDisabled = !date || isDateInPast(dateStr)
                        const isSelected = isDateSelected(date)
                        const isInRange = isDateInRange(date)
                        const isToday = date && formatDate(date) === formatDate(new Date())

                        return (
                            <View key={index} style={{ width: '14.28%', alignItems: 'center', paddingVertical: 2 }}>
                                <TouchableOpacity
                                    style={{
                                        width: 32,
                                        height: 32,
                                        borderRadius: 8,
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backgroundColor:
                                            isDisabled ? 'rgba(255, 255, 255, 0.02)' :
                                                isSelected ? '#cc31e8' :
                                                    isInRange ? 'rgba(204, 49, 232, 0.3)' :
                                                        isToday ? 'rgba(255, 255, 255, 0.1)' :
                                                            'rgba(255, 255, 255, 0.05)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(255, 255, 255, 0.1)',
                                    }}
                                    onPress={() => date && handleCalendarDateClick(date)}
                                    disabled={isDisabled}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{
                                        color:
                                            isDisabled ? '#555' :
                                                isSelected ? '#fff' :
                                                    '#ccc',
                                        fontSize: 14,
                                        fontWeight: isSelected ? '600' : '400',
                                    }}>
                                        {date ? date.getDate() : ''}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )
                    })}
                </View>

                {/* Error Message */}
                {error && (
                    <View style={{
                        backgroundColor: 'rgba(255, 99, 132, 0.1)',
                        borderWidth: 1,
                        borderColor: 'rgba(255, 99, 132, 0.3)',
                        borderRadius: 8,
                        padding: 12,
                        marginTop: 8,
                    }}>
                        <Text style={{
                            color: '#ff6384',
                            fontSize: 14,
                        }}>
                            {error}
                        </Text>
                    </View>
                )}
            </View>
        )
    }

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <>
                        <View style={FormStyles.section}>
                            <TextInput
                                style={FormStyles.input}
                                value={activityName}
                                onChangeText={setActivityName}
                                placeholder="Enter meeting name (e.g. Team Sync)"
                                placeholderTextColor="#aaa"
                                returnKeyType="next"
                                onSubmitEditing={() => {
                                    if (activityName.trim() && welcomeMessage.trim()) {
                                        setStep(2)
                                    }
                                }}
                            />
                        </View>

                        <View style={FormStyles.section}>
                            <TextInput
                                style={FormStyles.textarea}
                                value={welcomeMessage}
                                onChangeText={setWelcomeMessage}
                                placeholder="A quick blurb so everyone knows why we're meeting..."
                                placeholderTextColor="#aaa"
                                multiline
                                numberOfLines={3}
                                returnKeyType="done"
                                blurOnSubmit={true}
                            />
                        </View>
                    </>
                )

            case 2:
                return (
                    <View style={FormStyles.section}>
                        {/* Tab Selector */}
                        <View style={{
                            flexDirection: 'row',
                            gap: 4,
                            marginBottom: 24,
                            backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            borderRadius: 8,
                            padding: 4,
                            borderWidth: 1,
                            borderColor: 'rgba(255, 255, 255, 0.1)',
                        }}>
                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    backgroundColor: tab === 'single' ? '#cc31e8' : 'transparent',
                                    borderRadius: 4,
                                    alignItems: 'center',
                                }}
                                onPress={() => handleTabChange('single')}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    color: tab === 'single' ? 'white' : '#ccc',
                                    fontSize: 13,
                                    fontWeight: '600',
                                }}>
                                    Single Date
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    backgroundColor: tab === 'range' ? '#cc31e8' : 'transparent',
                                    borderRadius: 4,
                                    alignItems: 'center',
                                }}
                                onPress={() => handleTabChange('range')}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    color: tab === 'range' ? 'white' : '#ccc',
                                    fontSize: 13,
                                    fontWeight: '600',
                                }}>
                                    Date Range
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={{
                                    flex: 1,
                                    paddingVertical: 8,
                                    paddingHorizontal: 12,
                                    backgroundColor: tab === 'multiple' ? '#cc31e8' : 'transparent',
                                    borderRadius: 4,
                                    alignItems: 'center',
                                }}
                                onPress={() => handleTabChange('multiple')}
                                activeOpacity={0.7}
                            >
                                <Text style={{
                                    color: tab === 'multiple' ? 'white' : '#ccc',
                                    fontSize: 13,
                                    fontWeight: '600',
                                }}>
                                    Multiple Dates
                                </Text>
                            </TouchableOpacity>
                        </View>

                        {/* Selected Dates Display */}
                        {tab === 'range' && rangeStart && rangeEnd && (
                            <View style={{ marginBottom: 16 }}>
                                <View style={{
                                    backgroundColor: 'rgba(204, 49, 232, 0.2)',
                                    borderWidth: 1,
                                    borderColor: 'rgba(204, 49, 232, 0.4)',
                                    borderRadius: 8,
                                    padding: 12,
                                    alignItems: 'center',
                                }}>
                                    <Text style={{
                                        color: '#fff',
                                        fontSize: 14,
                                        fontWeight: '600',
                                    }}>
                                        {formatDateForDisplay(rangeStart)} - {formatDateForDisplay(rangeEnd)}
                                    </Text>
                                </View>
                            </View>
                        )}

                        {tab === 'multiple' && multipleDates.length > 0 && (
                            <View style={{
                                flexDirection: 'row',
                                flexWrap: 'wrap',
                                gap: 8,
                                marginBottom: 16,
                            }}>
                                {multipleDates.map((date) => (
                                    <View key={date} style={{
                                        backgroundColor: 'rgba(204, 49, 232, 0.2)',
                                        borderWidth: 1,
                                        borderColor: 'rgba(204, 49, 232, 0.4)',
                                        borderRadius: 8,
                                        padding: 8,
                                        flexDirection: 'row',
                                        alignItems: 'center',
                                        gap: 8,
                                    }}>
                                        <Text style={{
                                            color: '#fff',
                                            fontSize: 14,
                                        }}>
                                            {formatDateForDisplay(date)}
                                        </Text>
                                        <TouchableOpacity
                                            onPress={() => removeMultipleDate(date)}
                                            style={{
                                                width: 16,
                                                height: 16,
                                                borderRadius: 8,
                                                backgroundColor: 'rgba(204, 49, 232, 0.3)',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                            }}
                                        >
                                            <X stroke="#cc31e8" width={12} height={12} />
                                        </TouchableOpacity>
                                    </View>
                                ))}
                            </View>
                        )}

                        {renderCalendar()}
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

                {/* Button Row */}
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
                        onPress={handleNext}
                        disabled={isNextDisabled()}
                        style={FormStyles.flex1}
                    >
                        <Text style={FormStyles.buttonTextPrimary}>
                            {step < totalSteps ? 'Next' : 'Create Meeting'}
                        </Text>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    )
}