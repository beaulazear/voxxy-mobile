import React, { useState, useEffect, useContext } from 'react'
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
    Platform,
    Image,
    KeyboardAvoidingView,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import DateTimePicker from '@react-native-community/datetimepicker'
import {
    X,
    CheckCircle,
    Clock,
    MapPin,
    MessageSquare,
    Users,
    Heart,
    Calendar,
    Edit3
} from 'react-native-feather'
import { modalStyles, modalColors } from '../styles/modalStyles'
import VoxxyTriangle from '../assets/voxxy-triangle.png'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

// Activity Type Logic:
// - Meeting: Uses time slots (pinned) for scheduling
// - Restaurant/Cocktails/Game Night: Uses pinned activities for venue/game selection
// - All types require welcome message
// - Activity must have date/time/location set before finalization can occur

export default function FinalizeActivityModal({
    activity,
    visible,
    onClose,
    onUpdate,
    pinnedActivities = [],
    pinned = []
}) {
    const { user } = useContext(UserContext)

    const [formData, setFormData] = useState({
        activity_name: activity.activity_name || '',
        welcome_message: activity.welcome_message || '',
        date_day: activity.date_day ? new Date(activity.date_day + 'T00:00:00') : new Date(),
        date_time: activity.date_time ? new Date(activity.date_time) : new Date(),
        activity_location: activity.activity_location || '',
    })

    const [errors, setErrors] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')
    const [selectedPinnedId, setSelectedPinnedId] = useState(null)
    
    const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(null)
    const [showDatePicker, setShowDatePicker] = useState(false)
    const [showTimePicker, setShowTimePicker] = useState(false)
    const [tempDate, setTempDate] = useState(null)
    const [tempTime, setTempTime] = useState(null)

    const token = user?.token

    // Activity type logic
    const isMeeting = activity.activity_type === 'Meeting'
    const isRestaurant = activity.activity_type === 'Restaurant'
    const isCocktails = activity.activity_type === 'Cocktails'
    const isGameNight = activity.activity_type === 'Game Night'

    // Meetings use time slots (pinned), others use pinned activities
    const usesTimeSlots = isMeeting
    const usesPinnedActivities = isRestaurant || isCocktails || isGameNight

    // Check if basic activity details are set (required before finalization)
    const hasBasicDetails = formData.date_day && formData.date_time

    // Validation logic
    const timeSlotValid = !usesTimeSlots || selectedTimeSlotId != null
    const pinnedActivityValid = !usesPinnedActivities || selectedPinnedId != null
    const activityNameValid = formData.activity_name.trim()
    const welcomeMessageValid = formData.welcome_message.trim()

    const canSubmit = hasBasicDetails && timeSlotValid && pinnedActivityValid && activityNameValid && welcomeMessageValid

    logger.debug(activity)

    // Auto-select highest priority pinned activity (favorited > liked > first)
    useEffect(() => {
        if (pinnedActivities?.length) {
            const top = pinnedActivities.reduce(
                (prev, curr) => {
                    const prevScore = (prev.is_favorited ? 100 : 0) + (prev.is_liked ? 10 : 0)
                    const currScore = (curr.is_favorited ? 100 : 0) + (curr.is_liked ? 10 : 0)
                    return currScore > prevScore ? curr : prev
                },
                pinnedActivities[0]
            )
            setSelectedPinnedId(top.id)
        }
    }, [pinnedActivities])

    // Auto-select first time slot if only one option
    useEffect(() => {
        if (pinned?.length === 1) {
            handleTimeSlotChange(pinned[0].id)
        }
    }, [pinned])


    const handleTimeSlotChange = (timeSlotId) => {
        setSelectedTimeSlotId(timeSlotId)
    }

    const handleInputChange = (field, value) => {
        setFormData({ ...formData, [field]: value })
    }

    const handleDateChange = (event, selectedDate) => {
        if (Platform.OS === 'ios') {
            setTempDate(selectedDate || formData.date_day)
        } else {
            // Android automatically confirms
            const currentDate = selectedDate || formData.date_day
            setShowDatePicker(false)
            setFormData({ ...formData, date_day: currentDate })
        }
    }

    const handleTimeChange = (event, selectedTime) => {
        if (Platform.OS === 'ios') {
            setTempTime(selectedTime || formData.date_time)
        } else {
            // Android automatically confirms
            const currentTime = selectedTime || formData.date_time
            setShowTimePicker(false)
            setFormData({ ...formData, date_time: currentTime })
        }
    }

    const confirmDateChange = () => {
        if (tempDate) {
            setFormData({ ...formData, date_day: tempDate })
        }
        setShowDatePicker(false)
        setTempDate(null)
    }

    const confirmTimeChange = () => {
        if (tempTime) {
            setFormData({ ...formData, date_time: tempTime })
        }
        setShowTimePicker(false)
        setTempTime(null)
    }

    const cancelDateChange = () => {
        setShowDatePicker(false)
        setTempDate(null)
    }

    const cancelTimeChange = () => {
        setShowTimePicker(false)
        setTempTime(null)
    }

    const formatTo12h = (timeInput) => {
        if (!timeInput) return 'TBD'

        let hour, minute
        
        if (timeInput instanceof Date) {
            hour = timeInput.getHours()
            minute = timeInput.getMinutes()
        } else {
            // Handle ISO timestamp string
            const timeHM = timeInput.slice(11, 16)
            ;[hour, minute] = timeHM.split(':').map(Number)
        }

        const isPM = hour >= 12
        const suffix = isPM ? 'pm' : 'am'

        hour = hour % 12 || 12

        return `${hour}:${minute.toString().padStart(2, '0')}${suffix}`
    }

    const getOrdinalSuffix = (d) => {
        if (d >= 11 && d <= 13) return 'th'
        switch (d % 10) {
            case 1: return 'st'
            case 2: return 'nd'
            case 3: return 'rd'
            default: return 'th'
        }
    }

    const formatDate = (dateInput) => {
        if (!dateInput) return 'TBD'
        
        let dt
        if (dateInput instanceof Date) {
            dt = dateInput
        } else {
            // Handle date string format YYYY-MM-DD
            const [y, m, d] = dateInput.split('-').map(Number)
            dt = new Date(y, m - 1, d)
        }
        
        const day = dt.getDate()
        const mn = dt.toLocaleString('en-US', { month: 'long' })
        return `${mn} ${day}${getOrdinalSuffix(day)}`
    }

    const getSelectionTypeName = () => {
        switch (activity.activity_type) {
            case 'Restaurant': return 'restaurant'
            case 'Cocktails': return 'cocktail venue'
            case 'Game Night': return 'game'
            default: return 'option'
        }
    }

    const getSectionTitle = () => {
        switch (activity.activity_type) {
            case 'Restaurant': return 'Restaurant Selection'
            case 'Cocktails': return 'Venue Selection'
            case 'Game Night': return 'Game Selection'
            default: return 'Selection'
        }
    }

    const handleSubmit = async () => {
        if (!canSubmit) {
            const msgs = []

            if (!formData.date_day) {
                msgs.push('Please select an activity date.')
            }
            if (!formData.date_time) {
                msgs.push('Please select an activity time.')
            }
            if (!formData.activity_name.trim()) {
                msgs.push('Please enter an activity name.')
            }
            if (usesTimeSlots && selectedTimeSlotId == null)
                msgs.push('Please choose a time slot.')
            if (usesPinnedActivities && selectedPinnedId == null)
                msgs.push(`Please choose a ${getSelectionTypeName()}.`)
            if (!formData.welcome_message.trim())
                msgs.push('Please add a welcome message.')

            setErrors(msgs)
            Alert.alert('Cannot Finalize', msgs.join('\n'))
            return
        }

        setIsSubmitting(true)
        setErrors([])
        setLoadingMessage('Finalizing activity...')

        // Format date and time for API
        const formatDateForAPI = (date) => {
            const year = date.getFullYear()
            const month = String(date.getMonth() + 1).padStart(2, '0')
            const day = String(date.getDate()).padStart(2, '0')
            return `${year}-${month}-${day}`
        }

        const formatTimeForAPI = (date) => {
            const hours = String(date.getHours()).padStart(2, '0')
            const minutes = String(date.getMinutes()).padStart(2, '0')
            const seconds = String(date.getSeconds()).padStart(2, '0')
            return `${hours}:${minutes}:${seconds}`
        }

        const payload = {
            activity_name: formData.activity_name,
            welcome_message: formData.welcome_message,
            date_day: formatDateForAPI(formData.date_day),
            date_time: formatTimeForAPI(formData.date_time),
            activity_location: formData.activity_location,
            finalized: true,
        }

        if (usesPinnedActivities) {
            payload.selected_pinned_id = selectedPinnedId
        }

        try {
            setLoadingMessage('Sending updates...')
            const data = await safeAuthApiCall(
                `${API_URL}/activities/${activity.id}`,
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ activity: payload }),
                }
            )

            // Success
            setLoadingMessage('Finalization complete!')
            onUpdate(data)
            setTimeout(() => {
                Alert.alert('Success!', 'Activity finalized successfully!')
                onClose()
            }, 300)

        } catch (error) {
            logger.error('Error updating activity:', error)
            const userMessage = handleApiError(error, 'Failed to finalize activity')
            setErrors([userMessage])
            Alert.alert('Error', userMessage)
        } finally {
            setIsSubmitting(false)
            setLoadingMessage('')
        }
    }

    const renderPinnedActivities = () => {
        if (!usesPinnedActivities || !pinnedActivities?.length) return null

        const sortedActivities = [...pinnedActivities]
            .sort((a, b) => {
                // Sort by favorited first, then liked, then by ID for consistency
                const aScore = (a.is_favorited ? 100 : 0) + (a.is_liked ? 10 : 0)
                const bScore = (b.is_favorited ? 100 : 0) + (b.is_liked ? 10 : 0)
                if (aScore !== bScore) return bScore - aScore
                return a.id - b.id
            })

        return (
            <View style={modalStyles.modernProgressSection}>
                <View style={styles.sectionHeader}>
                    <View style={modalStyles.usersIconWrapper}>
                        <Users stroke={modalColors.purple500} width={16} height={16} />
                    </View>
                    <Text style={modalStyles.progressLabel}>
                        {getSectionTitle()}
                    </Text>
                </View>

                <View style={styles.optionList}>
                    {sortedActivities.map(p => (
                        <TouchableOpacity
                            key={p.id}
                            style={[
                                styles.optionItem,
                                selectedPinnedId === p.id && styles.optionItemSelected
                            ]}
                            onPress={() => setSelectedPinnedId(p.id)}
                        >
                            <View style={styles.radioButton}>
                                {selectedPinnedId === p.id && <View style={styles.radioSelected} />}
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={[
                                    styles.optionTitle,
                                    selectedPinnedId === p.id && styles.optionTitleSelected
                                ]}>
                                    {p.title}
                                </Text>
                                <View style={styles.statusIndicators}>
                                    {p.is_liked && (
                                        <View style={styles.statusBadge}>
                                            <Heart stroke="#dc267f" fill="#dc267f" width={12} height={12} />
                                            <Text style={styles.statusText}>Liked</Text>
                                        </View>
                                    )}
                                    {p.is_favorited && (
                                        <View style={[styles.statusBadge, styles.favoriteBadge]}>
                                            <Text style={styles.statusText}>⭐ Favorited</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        )
    }

    const renderTimeSlots = () => {
        if (!usesTimeSlots || !pinned?.length) return null

        return (
            <View style={modalStyles.modernProgressSection}>
                <View style={styles.sectionHeader}>
                    <View style={modalStyles.usersIconWrapper}>
                        <Clock stroke={modalColors.purple500} width={16} height={16} />
                    </View>
                    <Text style={modalStyles.progressLabel}>Time Slot Selection</Text>
                </View>

                <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
                    {pinned.map(slot => (
                        <TouchableOpacity
                            key={slot.id}
                            style={[
                                styles.optionItem,
                                selectedTimeSlotId === slot.id && styles.optionItemSelected
                            ]}
                            onPress={() => handleTimeSlotChange(slot.id)}
                        >
                            <View style={styles.radioButton}>
                                {selectedTimeSlotId === slot.id && <View style={styles.radioSelected} />}
                            </View>
                            <View style={styles.optionContent}>
                                <Text style={[
                                    styles.optionTitle,
                                    selectedTimeSlotId === slot.id && styles.optionTitleSelected
                                ]}>
                                    {formatDate(slot.date)} @ {formatTo12h(slot.time)}
                                </Text>
                                <View style={styles.statusIndicators}>
                                    {slot.is_liked && (
                                        <View style={styles.statusBadge}>
                                            <Heart stroke="#dc267f" fill="#dc267f" width={12} height={12} />
                                            <Text style={styles.statusText}>Liked</Text>
                                        </View>
                                    )}
                                    {slot.is_favorited && (
                                        <View style={[styles.statusBadge, styles.favoriteBadge]}>
                                            <Text style={styles.statusText}>⭐ Favorited</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )
    }

    const renderEmptyState = () => {
        if (usesTimeSlots && pinned?.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        You cannot finalize this activity until someone has pinned a time slot.
                    </Text>
                </View>
            )
        }

        if (usesPinnedActivities && pinnedActivities?.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        You cannot finalize this activity until someone has pinned a {getSelectionTypeName()}.
                    </Text>
                </View>
            )
        }

        return null
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={modalStyles.modalOverlay}>
                <KeyboardAvoidingView
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
                >
                <View style={modalStyles.modalContainer}>
                    {/* Gradient Background */}
                    <LinearGradient
                        colors={modalColors.headerGradient}
                        style={modalStyles.modalGradientBackground}
                    />
                    
                    {/* Close Button */}
                    <TouchableOpacity
                        style={modalStyles.modernCloseBtn}
                        onPress={onClose}
                    >
                        <View style={modalStyles.closeBtnCircle}>
                            <X stroke="#fff" width={18} height={18} />
                        </View>
                    </TouchableOpacity>

                    {/* Logo */}
                    <View style={styles.logoWrapper}>
                        <View style={styles.logoCircle}>
                            <Image 
                                source={VoxxyTriangle} 
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Content */}
                    <View style={modalStyles.modalContent}>
                        <Text style={modalStyles.modernTitle}>Share Your Plans</Text>
                        <Text style={modalStyles.modernDescription}>Already made a reservation? Add your details here and we'll notify the group!</Text>

                        {/* Scrollable Content */}
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {/* Error Display */}
                            {errors.length > 0 && (
                                <View style={styles.errorContainer}>
                                    {errors.map((error, index) => (
                                        <Text key={index} style={styles.errorText}>
                                            • {error}
                                        </Text>
                                    ))}
                                </View>
                            )}

                            {/* Activity Name Input */}
                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <Edit3 stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Activity Name</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Enter activity name..."
                                    placeholderTextColor={modalColors.textDim}
                                    value={formData.activity_name}
                                    onChangeText={(value) => handleInputChange('activity_name', value)}
                                />
                            </View>

                            {/* Welcome Message */}
                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <MessageSquare stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Welcome Message</Text>
                                </View>
                                <TextInput
                                    style={styles.textarea}
                                    placeholder="Write a welcome message for participants..."
                                    placeholderTextColor={modalColors.textDim}
                                    value={formData.welcome_message}
                                    onChangeText={(value) => handleInputChange('welcome_message', value)}
                                    multiline
                                    numberOfLines={4}
                                    textAlignVertical="top"
                                />
                            </View>

                            {/* Date Selection */}
                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <Calendar stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Activity Date</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => {
                                        setTempDate(formData.date_day)
                                        setShowDatePicker(true)
                                    }}
                                >
                                    <Text style={styles.dateTimeButtonText}>
                                        {formatDate(formData.date_day)}
                                    </Text>
                                </TouchableOpacity>
                                {showDatePicker && (
                                    <View>
                                        <DateTimePicker
                                            value={tempDate || formData.date_day}
                                            mode="date"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleDateChange}
                                            minimumDate={new Date()}
                                            textColor="#FFFFFF"
                                            themeVariant="dark"
                                        />
                                        {Platform.OS === 'ios' && (
                                            <View style={styles.pickerButtons}>
                                                <TouchableOpacity 
                                                    style={[styles.pickerButton, styles.cancelButton]} 
                                                    onPress={cancelDateChange}
                                                >
                                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.pickerButton, styles.confirmButton]} 
                                                    onPress={confirmDateChange}
                                                >
                                                    <Text style={styles.confirmButtonText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>

                            {/* Time Selection */}
                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <Clock stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Activity Time</Text>
                                </View>
                                <TouchableOpacity
                                    style={styles.dateTimeButton}
                                    onPress={() => {
                                        setTempTime(formData.date_time)
                                        setShowTimePicker(true)
                                    }}
                                >
                                    <Text style={styles.dateTimeButtonText}>
                                        {formatTo12h(formData.date_time)}
                                    </Text>
                                </TouchableOpacity>
                                {showTimePicker && (
                                    <View>
                                        <DateTimePicker
                                            value={tempTime || formData.date_time}
                                            mode="time"
                                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                                            onChange={handleTimeChange}
                                            textColor="#FFFFFF"
                                            themeVariant="dark"
                                        />
                                        {Platform.OS === 'ios' && (
                                            <View style={styles.pickerButtons}>
                                                <TouchableOpacity 
                                                    style={[styles.pickerButton, styles.cancelButton]} 
                                                    onPress={cancelTimeChange}
                                                >
                                                    <Text style={styles.cancelButtonText}>Cancel</Text>
                                                </TouchableOpacity>
                                                <TouchableOpacity 
                                                    style={[styles.pickerButton, styles.confirmButton]} 
                                                    onPress={confirmTimeChange}
                                                >
                                                    <Text style={styles.confirmButtonText}>Done</Text>
                                                </TouchableOpacity>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>


                            {renderPinnedActivities()}
                            {renderTimeSlots()}
                            {renderEmptyState()}
                        </ScrollView>

                        {/* Footer Buttons */}
                        <View style={modalStyles.buttonContainer}>
                            <TouchableOpacity
                                style={modalStyles.secondaryButton}
                                onPress={onClose}
                            >
                                <Text style={modalStyles.secondaryButtonText}>
                                    Cancel
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={modalStyles.primaryButton}
                                onPress={handleSubmit}
                                disabled={!canSubmit || isSubmitting}
                            >
                                <LinearGradient
                                    colors={modalColors.buttonGradient}
                                    style={modalStyles.primaryButtonGradient}
                                >
                                    <CheckCircle stroke="#fff" width={16} height={16} />
                                    <Text style={modalStyles.primaryButtonText}>
                                        {isSubmitting ? (loadingMessage || 'Finalizing...') : 'Finalize & Share'}
                                    </Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
                </KeyboardAvoidingView>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    logoWrapper: {
        alignSelf: 'center',
        marginTop: 35,
        marginBottom: -35,
        zIndex: 5,
    },

    logoCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 10,
    },

    logo: {
        width: 55,
        height: 55,
    },

    scrollView: {
        width: '100%',
        maxHeight: 400,
    },

    scrollContent: {
        paddingBottom: 20,
    },

    inputSection: {
        marginBottom: 20,
    },

    inputHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },

    iconWrapper: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },

    inputLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: modalColors.textMuted,
    },

    input: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: modalColors.textWhite,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },

    textarea: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 14,
        fontSize: 15,
        color: modalColors.textWhite,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        minHeight: 100,
        textAlignVertical: 'top',
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    optionList: {
        marginTop: 12,
    },

    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.08)',
        padding: 16,
        borderRadius: 14,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },

    optionItemSelected: {
        borderColor: modalColors.purple500,
        backgroundColor: 'rgba(168, 85, 247, 0.15)',
    },

    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: modalColors.textDim,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: modalColors.purple500,
    },

    optionContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    optionTitle: {
        fontSize: 17,
        fontWeight: '700',
        color: modalColors.textWhite,
        flex: 1,
        marginBottom: 4,
    },

    optionTitleSelected: {
        color: modalColors.purple500,
    },

    statusIndicators: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 127, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },

    favoriteBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
    },

    statusText: {
        fontSize: 12,
        color: '#dc267f',
        fontWeight: '600',
        marginLeft: 4,
    },

    emptyState: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },

    emptyStateText: {
        color: modalColors.warningYellow,
        fontSize: 14,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 22,
    },

    errorContainer: {
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },

    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 18,
    },

    dateTimeButton: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 12,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },

    dateTimeButtonText: {
        color: modalColors.textWhite,
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },

    pickerButtons: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 10,
        backgroundColor: 'rgba(147, 51, 234, 0.05)',
        borderRadius: 12,
        marginTop: 10,
    },

    pickerButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 8,
        minWidth: 80,
        alignItems: 'center',
    },

    cancelButton: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
    },

    confirmButton: {
        backgroundColor: modalColors.purple700,
    },

    cancelButtonText: {
        color: modalColors.textMuted,
        fontSize: 16,
        fontWeight: '600',
    },

    confirmButtonText: {
        color: modalColors.textWhite,
        fontSize: 16,
        fontWeight: '600',
    },
})