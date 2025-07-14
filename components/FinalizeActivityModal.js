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
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import {
    X,
    CheckCircle,
    Clock,
    MapPin,
    MessageSquare,
    Users,
    Heart
} from 'react-native-feather'
import {
    FormStyles,
    GradientButton,
    gradientConfigs
} from '../styles/FormStyles'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

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
        welcome_message: activity.welcome_message || '',
    })

    const [errors, setErrors] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [selectedPinnedId, setSelectedPinnedId] = useState(null)
    const [selectedTimeSlotId, setSelectedTimeSlotId] = useState(null)

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
    const hasBasicDetails = activity.date_day && activity.date_time && activity.activity_location

    // Validation logic
    const timeSlotValid = !usesTimeSlots || selectedTimeSlotId != null
    const pinnedActivityValid = !usesPinnedActivities || selectedPinnedId != null
    const welcomeMessageValid = formData.welcome_message.trim()

    const canSubmit = hasBasicDetails && timeSlotValid && pinnedActivityValid && welcomeMessageValid

    console.log(activity)

    // Auto-select highest voted pinned activity
    useEffect(() => {
        if (pinnedActivities?.length) {
            const top = pinnedActivities.reduce(
                (prev, curr) => (curr.vote_count || 0) > (prev.vote_count || 0) ? curr : prev,
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

    const formatTo12h = (isoTimestamp) => {
        if (!isoTimestamp) return 'TBD'

        const timeHM = isoTimestamp.slice(11, 16)
        let [hour, minute] = timeHM.split(':').map(Number)

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

    const formatDate = (ds) => {
        if (!ds) return 'TBD'
        const [y, m, d] = ds.split('-').map(Number)
        const dt = new Date(y, m - 1, d)
        const mn = dt.toLocaleString('en-US', { month: 'long' })
        return `${mn} ${d}${getOrdinalSuffix(d)}`
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

            if (!hasBasicDetails) {
                msgs.push('Please set the date, time, and location for this activity before finalizing.')
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

        const payload = {
            welcome_message: formData.welcome_message,
            finalized: true,
        }

        if (usesPinnedActivities) {
            payload.selected_pinned_id = selectedPinnedId
        }

        try {
            const response = await fetch(`${API_URL}/activities/${activity.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({ activity: payload }),
            })

            const data = await response.json()

            if (!response.ok) {
                const errorMessages = data.errors || [data.error] || ['Unknown error']
                setErrors(errorMessages)
                Alert.alert('Error', errorMessages.join('\n'))
                return
            }

            // Success
            onUpdate(data)
            Alert.alert('Success!', 'Activity finalized successfully!')
            onClose()

        } catch (error) {
            console.error('Error updating activity:', error)
            const errorMessage = error.message || 'Failed to update activity'
            setErrors([errorMessage])
            Alert.alert('Error', errorMessage)
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderPinnedActivities = () => {
        if (!usesPinnedActivities || !pinnedActivities?.length) return null

        const sortedActivities = [...pinnedActivities]
            .sort((a, b) => (b.vote_count || 0) - (a.vote_count || 0))

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Users stroke="#cc31e8" width={20} height={20} />
                    <Text style={styles.sectionTitle}>
                        {getSectionTitle()}
                    </Text>
                </View>

                <ScrollView style={styles.optionList} showsVerticalScrollIndicator={false}>
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
                                <View style={styles.voteCount}>
                                    <Heart stroke="#dc267f" fill="#dc267f" width={14} height={14} />
                                    <Text style={styles.voteCountText}>{p.vote_count || 0} votes</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>
        )
    }

    const renderTimeSlots = () => {
        if (!usesTimeSlots || !pinned?.length) return null

        return (
            <View style={styles.section}>
                <View style={styles.sectionHeader}>
                    <Clock stroke="#cc31e8" width={20} height={20} />
                    <Text style={styles.sectionTitle}>Time Slot Selection</Text>
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
                                <View style={styles.voteCount}>
                                    <Heart stroke="#dc267f" fill="#dc267f" width={14} height={14} />
                                    <Text style={styles.voteCountText}>{slot.votes_count || 0} votes</Text>
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
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={FormStyles.modalContainer}>
                {/* Header */}
                <View style={FormStyles.modalHeader}>
                    <Text style={FormStyles.title}>Review & Finalize</Text>
                    <Text style={FormStyles.subtitle}>Complete your activity setup</Text>
                    <Text style={FormStyles.subtitle}>
                        {formatDate(activity.date_day)} at {formatTo12h(activity.date_time)} • {activity.activity_location}
                    </Text>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <X stroke="#fff" width={20} height={20} />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView
                    style={FormStyles.stepContent}
                    contentContainerStyle={FormStyles.scrollContent}
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

                    {renderPinnedActivities()}
                    {renderTimeSlots()}
                    {renderEmptyState()}

                    {/* Welcome Message */}
                    <View style={[styles.section, styles.lastSection]}>
                        <View style={styles.sectionHeader}>
                            <MessageSquare stroke="#cc31e8" width={20} height={20} />
                            <Text style={styles.sectionTitle}>Welcome Message</Text>
                        </View>
                        <TextInput
                            style={FormStyles.textarea}
                            placeholder="Write a welcome message for participants..."
                            placeholderTextColor="#aaa"
                            value={formData.welcome_message}
                            onChangeText={(value) => handleInputChange('welcome_message', value)}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                        />
                    </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={FormStyles.buttonRow}>
                    <TouchableOpacity
                        style={FormStyles.buttonSecondary}
                        onPress={onClose}
                    >
                        <Text style={[FormStyles.buttonText, FormStyles.buttonTextSecondary]}>
                            Cancel
                        </Text>
                    </TouchableOpacity>

                    <GradientButton
                        onPress={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                        style={[FormStyles.flex1, (!canSubmit || isSubmitting) && FormStyles.buttonDisabled]}
                    >
                        <View style={styles.buttonContent}>
                            <CheckCircle stroke="#fff" width={16} height={16} />
                            <Text style={[FormStyles.buttonText, FormStyles.buttonTextPrimary]}>
                                {isSubmitting ? 'Finalizing...' : 'Finalize & Share'}
                            </Text>
                        </View>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    closeButton: {
        position: 'absolute',
        top: 24,
        right: 24,
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        zIndex: 10,
    },

    section: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    lastSection: {
        marginBottom: 32,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 12,
    },

    optionList: {
        maxHeight: 300,
    },

    optionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'transparent',
    },

    optionItemSelected: {
        borderColor: '#cc31e8',
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
    },

    radioButton: {
        width: 18,
        height: 18,
        borderRadius: 9,
        borderWidth: 2,
        borderColor: '#ccc',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },

    radioSelected: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#cc31e8',
    },

    optionContent: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    optionTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },

    optionTitleSelected: {
        color: '#cc31e8',
    },

    voteCount: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(220, 38, 127, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },

    voteCountText: {
        fontSize: 12,
        color: '#dc267f',
        fontWeight: '600',
        marginLeft: 4,
    },

    emptyState: {
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyStateText: {
        color: '#ccc',
        fontSize: 16,
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 24,
    },

    errorContainer: {
        backgroundColor: 'rgba(220, 38, 127, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(220, 38, 127, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
    },

    errorText: {
        color: '#dc267f',
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 18,
    },

    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
})