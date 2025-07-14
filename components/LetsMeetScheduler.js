import React, { useState, useContext, useMemo } from 'react'
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

const { width: screenWidth } = Dimensions.get('window')

// Minimalist icon components
const Calendar = () => <Text style={styles.miniIcon}>📅</Text>
const Clock = () => <Text style={styles.miniIcon}>🕐</Text>
const Users = () => <Text style={styles.miniIcon}>👥</Text>
const X = () => <Text style={styles.miniIcon}>×</Text>
const CheckCircle = () => <Text style={styles.miniIcon}>✅</Text>

// Date utilities (simplified versions of date-fns)
const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })
}

const formatDateShort = (date) => {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    })
}

const formatDateKey = (date) => {
    return date.toISOString().split('T')[0] // YYYY-MM-DD
}

const parseISODate = (dateStr) => {
    return new Date(dateStr + 'T00:00:00')
}

const formatTime = (timeStr) => {
    const [hour] = timeStr.split(':')
    const hourNum = parseInt(hour)
    const ampm = hourNum >= 12 ? 'PM' : 'AM'
    const displayHour = hourNum === 0 ? 12 : hourNum > 12 ? hourNum - 12 : hourNum
    return `${displayHour}:00 ${ampm}`
}

export default function LetsMeetScheduler({
    visible,
    activityId,
    currentActivity,
    responseSubmitted,
    onClose,
    isUpdate = false,
    onAvailabilityUpdate,
    // Guest mode props
    guestMode = false,
    guestToken = null,
    guestEmail = null,
    onChatComplete = null
}) {
    const { user, setUser } = useContext(UserContext)
    const [fadeAnim] = useState(new Animated.Value(0))

    // Handle both user and guest modes for finding existing response
    const existingResponse = useMemo(() => {
        if (!currentActivity.responses) return null

        return currentActivity.responses.find(r => {
            if (r.notes !== "LetsMeetAvailabilityResponse") return false

            if (guestMode) {
                return r.email === guestEmail
            } else {
                return r.user_id === user?.id
            }
        })
    }, [currentActivity.responses, guestMode, guestEmail, user?.id])

    // Parse date constraints from activity notes
    const { disabledDays, availableLabel, availableDates, dateSelectionType } = useMemo(() => {
        const note = currentActivity.date_notes
        const today = new Date()

        // Handle date range: "YYYY-MM-DD to YYYY-MM-DD"
        const rangeMatch = note.match(/^(\d{4}-\d{2}-\d{2}) to (\d{4}-\d{2}-\d{2})$/)
        if (rangeMatch) {
            const [, startStr, endStr] = rangeMatch
            const start = parseISODate(startStr)
            const end = parseISODate(endStr)

            // Generate array of dates in range
            const dates = []
            const current = new Date(start)
            while (current <= end) {
                dates.push(new Date(current))
                current.setDate(current.getDate() + 1)
            }

            return {
                disabledDays: null,
                availableLabel: `Select dates between ${formatDateShort(start)} and ${formatDateShort(end)}`,
                availableDates: dates,
                dateSelectionType: 'range'
            }
        }

        // Handle single date: "YYYY-MM-DD"
        const singleMatch = note.match(/^\d{4}-\d{2}-\d{2}$/)
        if (singleMatch) {
            const only = parseISODate(note)
            return {
                disabledDays: null,
                availableLabel: `Meeting scheduled for ${formatDate(only)}`,
                availableDates: [only],
                dateSelectionType: 'single'
            }
        }

        // Handle multiple dates: "YYYY-MM-DD, YYYY-MM-DD, YYYY-MM-DD"
        const multipleDates = note.split(',').map(d => d.trim()).filter(d => d.match(/^\d{4}-\d{2}-\d{2}$/))
        if (multipleDates.length > 1) {
            const dates = multipleDates.map(d => parseISODate(d)).filter(d => !isNaN(d))
            const sortedDates = dates.sort((a, b) => a - b)

            return {
                disabledDays: null,
                availableLabel: 'Choose from the available meeting dates',
                availableDates: sortedDates,
                dateSelectionType: 'multiple'
            }
        }

        // Fallback - generate next 30 days
        const dates = []
        for (let i = 0; i < 30; i++) {
            const date = new Date(today)
            date.setDate(today.getDate() + i)
            dates.push(date)
        }

        return {
            disabledDays: null,
            availableLabel: "Select your available dates",
            availableDates: dates,
            dateSelectionType: 'open'
        }
    }, [currentActivity.date_notes])

    const [selectedDates, setSelectedDates] = useState(() => {
        if (!isUpdate || !existingResponse?.availability) return []

        return Object.keys(existingResponse.availability)
            .map(dateStr => parseISODate(dateStr))
            .filter(date => !isNaN(date))
    })

    const [slotsByDate, setSlotsByDate] = useState(() => {
        if (!isUpdate || !existingResponse?.availability) return {}
        return existingResponse.availability
    })

    // Generate time slots (9 AM to 9 PM)
    const timeSlots = Array.from({ length: 13 }, (_, i) => {
        const hour24 = 9 + i
        return `${String(hour24).padStart(2, "0")}:00`
    })

    // Animate on mount
    React.useEffect(() => {
        if (visible) {
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }).start()
        }
    }, [visible])

    const handleDateSelect = (date) => {
        const dateKey = formatDateKey(date)
        const isSelected = selectedDates.some(d => formatDateKey(d) === dateKey)

        if (dateSelectionType === 'single') {
            // For single date, don't allow deselection
            return
        }

        let newSelectedDates
        if (isSelected) {
            newSelectedDates = selectedDates.filter(d => formatDateKey(d) !== dateKey)
            // Remove from slots when date is deselected
            setSlotsByDate(prev => {
                const newSlots = { ...prev }
                delete newSlots[dateKey]
                return newSlots
            })
        } else {
            newSelectedDates = [...selectedDates, date]
            // Initialize slots for new date
            setSlotsByDate(prev => ({
                ...prev,
                [dateKey]: []
            }))
        }

        setSelectedDates(newSelectedDates)
    }

    const toggleSlot = (date, time) => {
        const dateKey = typeof date === 'string' ? date : formatDateKey(date)
        setSlotsByDate(prev => {
            const times = prev[dateKey] || []
            return {
                ...prev,
                [dateKey]: times.includes(time)
                    ? times.filter(t => t !== time)
                    : [...times, time]
            }
        })
    }

    const handleSubmit = async () => {
        // Only track for logged-in users
        if (!guestMode && process.env.NODE_ENV === "production" && user?.name) {
            // mixpanel tracking if needed
        }

        const availability = slotsByDate;
        const notes = "LetsMeetAvailabilityResponse";

        // Validate that we have availability data
        if (!availability || Object.keys(availability).length === 0) {
            Alert.alert('Error', 'Please select at least one time slot.');
            return;
        }

        try {
            let endpoint, requestOptions;

            if (guestMode) {
                // Guest mode - same pattern as working NightOutResponseForm
                endpoint = `${API_URL}/activities/${activityId}/respond/${guestToken}`;
                requestOptions = {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        response: {
                            notes,
                            availability
                        },
                    }),
                };
            } else {
                // User mode - same pattern as working NightOutResponseForm
                endpoint = `${API_URL}/responses`;
                requestOptions = {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${user?.token}`,
                    },
                    body: JSON.stringify({
                        response: {
                            notes,
                            activity_id: activityId,
                            availability
                        },
                    }),
                };
            }

            const res = await fetch(endpoint, requestOptions);

            if (!res.ok) {
                const errorData = await res.json();
                console.error('❌ Failed to save availability:', errorData);
                Alert.alert('Error', 'Failed to submit availability. Please try again.');
                return;
            }

            const data = await res.json();

            // Update user state for authenticated users - same pattern as working version
            if (!guestMode && user) {
                const { response: newResponse, comment: newComment } = data;

                setUser(prev => {
                    const updateActivityResponses = (activity) => {
                        if (activity.id !== activityId) return activity;

                        // Remove old availability response and add new one
                        const otherResponses = activity.responses?.filter(r =>
                            !(r.notes === "LetsMeetAvailabilityResponse" && r.user_id === user.id)
                        ) || [];

                        return {
                            ...activity,
                            responses: [...otherResponses, newResponse],
                            comments: [...(activity.comments || []), newComment]
                        };
                    };

                    const updActs = prev.activities.map(updateActivityResponses);
                    const updPart = prev.participant_activities.map((part) => ({
                        ...part,
                        activity: updateActivityResponses(part.activity)
                    }));

                    return { ...prev, activities: updActs, participant_activities: updPart };
                });

                if (onAvailabilityUpdate) {
                    onAvailabilityUpdate(newResponse, newComment);
                }
            } else {
                // Guest mode
                if (onChatComplete) {
                    onChatComplete();
                }
            }

            Alert.alert('Success!', 'Your availability has been submitted!');
            onClose();

        } catch (err) {
            console.error('❌ Error saving availability:', err);
            Alert.alert('Error', 'Failed to submit availability. Please try again.');
        }
    };

    const canSubmit = (dateSelectionType === 'single' || selectedDates.length > 0) &&
        Object.values(slotsByDate).some(times => times.length > 0)

    const renderSuccessView = () => (
        <View style={styles.successContainer}>
            <View style={styles.successIcon}>
                <CheckCircle />
            </View>
            <Text style={styles.successTitle}>Availability Submitted!</Text>
            <Text style={styles.successText}>
                Your time preferences have been saved. The organizer will use this information to find the best meeting times for everyone.
            </Text>
        </View>
    )

    const renderDateGrid = () => (
        <View style={styles.dateSection}>
            <Text style={styles.sectionLabel}>
                {dateSelectionType === 'single' ? 'Meeting Date' : 'Select Available Dates'}
            </Text>
            <View style={styles.dateGrid}>
                {availableDates.map((date, index) => {
                    const dateKey = formatDateKey(date)
                    const isSelected = selectedDates.some(d => formatDateKey(d) === dateKey) ||
                        dateSelectionType === 'single'

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dateCard,
                                isSelected && styles.dateCardSelected,
                                dateSelectionType === 'single' && styles.dateCardDisabled
                            ]}
                            onPress={() => handleDateSelect(date)}
                            disabled={dateSelectionType === 'single'}
                        >
                            <Text style={[
                                styles.dateDayText,
                                isSelected && styles.dateDayTextSelected
                            ]}>
                                {date.toLocaleDateString('en-US', { weekday: 'short' })}
                            </Text>
                            <Text style={[
                                styles.dateNumberText,
                                isSelected && styles.dateNumberTextSelected
                            ]}>
                                {date.getDate()}
                            </Text>
                            <Text style={[
                                styles.dateMonthText,
                                isSelected && styles.dateMonthTextSelected
                            ]}>
                                {date.toLocaleDateString('en-US', { month: 'short' })}
                            </Text>
                        </TouchableOpacity>
                    )
                })}
            </View>
        </View>
    )

    const renderTimeSlots = () => {
        const datesToShow = dateSelectionType === 'single' ? availableDates : selectedDates

        if (datesToShow.length === 0) {
            return (
                <View style={styles.emptyState}>
                    <Text style={styles.emptyStateText}>
                        Select dates above to choose your available times
                    </Text>
                </View>
            )
        }

        return (
            <View style={styles.timeSlotsSection}>
                <Text style={styles.sectionLabel}>Select Your Available Times</Text>
                {datesToShow.map(date => {
                    const dateKey = formatDateKey(date)
                    return (
                        <View key={dateKey} style={styles.timeSlotGroup}>
                            <Text style={styles.timeSlotDateTitle}>
                                {formatDate(date)}
                            </Text>
                            <View style={styles.timeSlotGrid}>
                                {timeSlots.map(time => (
                                    <TouchableOpacity
                                        key={time}
                                        style={[
                                            styles.timeSlotChip,
                                            slotsByDate[dateKey]?.includes(time) && styles.timeSlotChipSelected
                                        ]}
                                        onPress={() => toggleSlot(dateKey, time)}
                                    >
                                        <Text style={[
                                            styles.timeSlotText,
                                            slotsByDate[dateKey]?.includes(time) && styles.timeSlotTextSelected
                                        ]}>
                                            {formatTime(time)}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </View>
                    )
                })}
            </View>
        )
    }

    if (responseSubmitted && !isUpdate) {
        return (
            <Modal
                visible={visible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={onClose}
            >
                <SafeAreaView style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Availability Submitted</Text>
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X />
                        </TouchableOpacity>
                    </View>
                    {renderSuccessView()}
                </SafeAreaView>
            </Modal>
        )
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.progressContainer}>
                    <View style={styles.progressTrack}>
                        <View style={[styles.progressFill, { width: '100%' }]} />
                    </View>
                    <Text style={styles.progressText}>Availability</Text>
                </View>

                <View style={styles.header}>
                    <Text style={styles.title}>Submit Your Availability</Text>
                    <Text style={styles.subtitle}>{availableLabel}</Text>
                </View>

                <ScrollView
                    style={styles.content}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                        <View style={styles.infoCard}>
                            <Calendar />
                            <View style={styles.infoTextContainer}>
                                <Text style={styles.infoText}>{availableLabel}</Text>
                                {dateSelectionType === 'multiple' && availableDates.length > 0 && (
                                    <View style={styles.dateChips}>
                                        {availableDates.slice(0, 5).map((date, index) => (
                                            <View key={index} style={styles.dateChip}>
                                                <Text style={styles.dateChipText}>
                                                    {formatDateShort(date)}
                                                </Text>
                                            </View>
                                        ))}
                                        {availableDates.length > 5 && (
                                            <View style={styles.dateChip}>
                                                <Text style={styles.dateChipText}>
                                                    +{availableDates.length - 5} more
                                                </Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>

                        {renderDateGrid()}
                        {renderTimeSlots()}
                    </Animated.View>
                </ScrollView>

                <View style={styles.buttonRow}>
                    <TouchableOpacity style={styles.closeButtonBottom} onPress={onClose}>
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.submitButton, !canSubmit && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={!canSubmit}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#9b1dbd']}
                            style={styles.submitButtonGradient}
                        >
                            <CheckCircle />
                            <Text style={styles.submitButtonText}>
                                {isUpdate ? 'Update Availability' : 'Submit Availability'}
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
        minWidth: 80,
        textAlign: 'right',
    },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
        position: 'relative',
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    subtitle: {
        fontSize: 16,
        color: '#999',
        lineHeight: 22,
        textAlign: 'center',
    },

    closeButton: {
        position: 'absolute',
        top: -10,
        right: 24,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
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

    infoCard: {
        flexDirection: 'row',
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 24,
        alignItems: 'flex-start',
        gap: 12,
    },

    infoTextContainer: {
        flex: 1,
    },

    infoText: {
        color: '#cc31e8',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },

    dateChips: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    dateChip: {
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    dateChipText: {
        color: '#cc31e8',
        fontSize: 11,
        fontWeight: '600',
    },

    dateSection: {
        marginBottom: 24,
    },

    sectionLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#cc31e8',
        marginBottom: 16,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        textAlign: 'center',
    },

    dateGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        paddingHorizontal: 8,
    },

    dateCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 12,
        width: (screenWidth - 80) / 4, // Exactly 4 per row with consistent spacing
        alignItems: 'center',
        justifyContent: 'center',
        height: 75,
        marginBottom: 8,
    },

    dateCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8, // Android shadow
        transform: [{ scale: 1.02 }], // Slight scale up when selected
    },

    dateCardDisabled: {
        opacity: 1,
    },

    dateDayText: {
        fontSize: 9,
        fontWeight: '500',
        color: '#999',
        marginBottom: 2,
        textAlign: 'center',
    },

    dateDayTextSelected: {
        color: '#cc31e8',
        fontWeight: '600',
    },

    dateNumberText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 2,
        textAlign: 'center',
    },

    dateNumberTextSelected: {
        color: '#cc31e8',
    },

    dateMonthText: {
        fontSize: 9,
        fontWeight: '500',
        color: '#999',
        textAlign: 'center',
    },

    dateMonthTextSelected: {
        color: '#cc31e8',
        fontWeight: '600',
    },

    // Alternative grid style for smaller screens
    dateGridCompact: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
        alignItems: 'center',
        paddingHorizontal: 4,
    },

    dateCardCompact: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        padding: 8,
        width: (screenWidth - 60) / 5, // 5 per row for smaller cards
        alignItems: 'center',
        justifyContent: 'center',
        height: 65,
        marginBottom: 6,
        marginHorizontal: 2,
    },

    timeSlotsSection: {
        marginBottom: 24,
    },

    timeSlotGroup: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },

    timeSlotDateTitle: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },

    timeSlotGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 6,
    },

    timeSlotChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 8,
        minWidth: 70,
        alignItems: 'center',
    },

    timeSlotChipSelected: {
        backgroundColor: '#cc31e8',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.4,
        shadowRadius: 6,
    },

    timeSlotText: {
        color: '#ccc',
        fontSize: 11,
        fontWeight: '500',
    },

    timeSlotTextSelected: {
        color: '#fff',
        fontWeight: '600',
    },

    emptyState: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        marginBottom: 24,
    },

    emptyStateText: {
        color: '#999',
        fontSize: 14,
        textAlign: 'center',
    },

    successContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
    },

    successIcon: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },

    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#28a745',
        marginBottom: 12,
        textAlign: 'center',
    },

    successText: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 24,
    },

    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        gap: 12,
    },

    closeButtonBottom: {
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

    submitButton: {
        flex: 1,
        borderRadius: 8,
        overflow: 'hidden',
    },

    submitButtonDisabled: {
        opacity: 0.5,
    },

    submitButtonGradient: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },

    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    miniIcon: {
        fontSize: 16,
        color: '#cc31e8',
    },
})