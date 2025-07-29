import React, { useState, useContext } from 'react'
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
import { X, Save, Edit3, MapPin, MessageSquare } from 'react-native-feather'
import {
    FormStyles,
    GradientButton,
    gradientConfigs
} from '../styles/FormStyles'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';

export default function UpdateDetailsModal({ activity, visible, onClose, onUpdate }) {
    const { user } = useContext(UserContext)

    // State for form fields
    const [name, setName] = useState(activity.activity_name || '')
    const [location, setLocation] = useState(activity.activity_location || '')
    const [welcomeMessage, setWelcomeMessage] = useState(activity.welcome_message || '')
    const [errors, setErrors] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Location state
    const [usingCurrentLocation, setUsingCurrentLocation] = useState(false)

    // Check if location contains coordinates on mount
    React.useEffect(() => {
        if (activity.activity_location) {
            // Check if location looks like coordinates (lat, lng format)
            const coordPattern = /^-?\d+\.\d+,\s*-?\d+\.\d+$/
            if (coordPattern.test(activity.activity_location.trim())) {
                setUsingCurrentLocation(true)
            }
        }
    }, [activity.activity_location])

    const token = user?.token

    // Helper function to determine what fields to show based on activity type
    const getEditableFields = () => {
        const activityType = activity.activity_type

        switch (activityType) {
            case 'Restaurant':
            case 'Cocktails':
                return {
                    name: true,
                    location: true,
                    welcomeMessage: true
                }
            case 'Meeting':
                return {
                    name: true,
                    location: false,
                    welcomeMessage: true
                }
            case 'Game Night':
                return {
                    name: true,
                    location: false,
                    welcomeMessage: true
                }
            default:
                return {
                    name: true,
                    location: false,
                    welcomeMessage: true
                }
        }
    }

    const editableFields = getEditableFields()

    const canSave = () => Boolean(name.trim())

    const handleClearLocation = () => {
        setUsingCurrentLocation(false)
        setLocation('')
    }

    const handleSubmit = async () => {
        if (!canSave()) return

        setIsSubmitting(true)
        setErrors([])

        const payload = {
            activity_name: name.trim(),
            welcome_message: welcomeMessage.trim(),
        }

        // Add location for applicable activity types
        if (editableFields.location) {
            payload.activity_location = usingCurrentLocation
                ? activity.activity_location  // Keep original coordinates
                : location.trim()
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
                setErrors(data.errors || [data.error] || ['Unknown error'])
                return
            }

            // Success
            onUpdate(data)
            Alert.alert('Success!', 'Activity updated successfully!')
            onClose()

        } catch (error) {
            logger.error('Error updating activity:', error)
            setErrors([error.message || 'Failed to update activity'])
        } finally {
            setIsSubmitting(false)
        }
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
                    <Text style={FormStyles.title}>Edit Activity Details</Text>
                    <Text style={FormStyles.subtitle}>Update your activity information</Text>
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
                    {/* Debug Info */}
                    {logger.debug('Rendering modal content, activity type:', activity.activity_type)}
                    {logger.debug('Editable fields:', editableFields)}
                    {logger.debug('FormStyles available:', !!FormStyles)}
                    {logger.debug('GradientButton available:', !!GradientButton)}

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

                    {/* Activity Name */}
                    <View style={FormStyles.section}>
                        <View style={styles.iconRow}>
                            <Edit3 stroke="#cc31e8" width={16} height={16} />
                            <Text style={styles.sectionTitle}>Activity Name</Text>
                        </View>
                        <TextInput
                            style={FormStyles.input}
                            placeholder="Activity Name"
                            placeholderTextColor="#aaa"
                            value={name}
                            onChangeText={setName}
                            autoCapitalize="words"
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                            blurOnSubmit={true}
                        />
                    </View>

                    <View style={FormStyles.section}>
                        <View style={styles.iconRow}>
                            <MessageSquare stroke="#cc31e8" width={16} height={16} />
                            <Text style={styles.sectionTitle}>Welcome Message</Text>
                        </View>
                        <TextInput
                            style={FormStyles.textarea}
                            placeholder="Welcome message..."
                            placeholderTextColor="#aaa"
                            value={welcomeMessage}
                            onChangeText={setWelcomeMessage}
                            multiline
                            numberOfLines={4}
                            textAlignVertical="top"
                            autoCapitalize="sentences"
                            returnKeyType="done"
                            onSubmitEditing={() => Keyboard.dismiss()}
                            blurOnSubmit={true}
                        />
                    </View>

                    {/* Location (for Restaurant & Cocktails) */}
                    {editableFields.location && (
                        <View style={[FormStyles.section, FormStyles.lastSection]}>
                            <View style={styles.iconRow}>
                                <MapPin stroke="#cc31e8" width={16} height={16} />
                                <Text style={styles.sectionTitle}>Location</Text>
                            </View>

                            {usingCurrentLocation ? (
                                <View style={styles.currentLocationContainer}>
                                    <View style={styles.currentLocationInfo}>
                                        <MapPin stroke="#10b981" width={16} height={16} />
                                        <Text style={styles.currentLocationText}>
                                            Using current location
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.clearLocationButton}
                                        onPress={handleClearLocation}
                                    >
                                        <X stroke="#ef4444" width={16} height={16} />
                                        <Text style={styles.clearLocationText}>Clear</Text>
                                    </TouchableOpacity>
                                </View>
                            ) : (
                                <TextInput
                                    style={FormStyles.input}
                                    placeholder="Enter location"
                                    placeholderTextColor="#aaa"
                                    value={location}
                                    onChangeText={setLocation}
                                    autoCapitalize="words"
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                    blurOnSubmit={true}
                                />
                            )}
                        </View>
                    )}
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
                        disabled={!canSave() || isSubmitting}
                        style={[FormStyles.flex1, !canSave() && FormStyles.buttonDisabled]}
                    >
                        <View style={styles.buttonContent}>
                            <Save stroke="#fff" width={16} height={16} />
                            <Text style={[FormStyles.buttonText, FormStyles.buttonTextPrimary]}>
                                {isSubmitting ? 'Saving...' : 'Save'}
                            </Text>
                        </View>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal >
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

    iconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginLeft: 8,
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

    currentLocationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
    },

    currentLocationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },

    currentLocationText: {
        color: '#10b981',
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },

    clearLocationButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 8,
    },

    clearLocationText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },

    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
})