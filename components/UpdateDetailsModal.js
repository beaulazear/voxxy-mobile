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
    Animated,
    Image,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { X, Save, Edit3, MapPin, MessageSquare } from 'react-native-feather'
import { modalStyles, modalColors } from '../styles/modalStyles'
import VoxxyTriangle from '../assets/voxxy-triangle.png'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';

export default function UpdateDetailsModal({ activity, visible, onClose, onUpdate }) {
    const { user } = useContext(UserContext)

    // State for form fields
    const [name, setName] = useState(activity.activity_name || '')
    const [location, setLocation] = useState(activity.activity_location || '')
    const [welcomeMessage, setWelcomeMessage] = useState(activity.welcome_message || '')
    const [errors, setErrors] = useState([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('')

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
        setLoadingMessage('Updating activity...')

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
            const data = await safeAuthApiCall(
                `${API_URL}/activities/${activity.id}`,
                token,
                {
                    method: 'PATCH',
                    body: JSON.stringify({ activity: payload }),
                }
            )

            // Success
            setLoadingMessage('Update complete!')
            onUpdate(data)
            setTimeout(() => {
                Alert.alert('Success!', 'Activity updated successfully!')
                onClose()
            }, 200)

        } catch (error) {
            logger.error('Error updating activity:', error)
            const userMessage = handleApiError(error, 'Failed to update activity')
            setErrors([userMessage])
        } finally {
            setIsSubmitting(false)
            setLoadingMessage('')
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <SafeAreaView style={modalStyles.modalOverlay}>
                <Animated.View style={modalStyles.modalContainer}>
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
                        <Text style={modalStyles.modernTitle}>Edit Activity Details</Text>
                        <Text style={modalStyles.modernDescription}>Update your activity information</Text>

                        {/* Scrollable Content */}
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={false}
                            keyboardShouldPersistTaps="handled"
                            keyboardDismissMode="on-drag"
                        >
                            {/* Debug Info */}
                            {logger.debug('Rendering modal content, activity type:', activity.activity_type)}
                            {logger.debug('Editable fields:', editableFields)}

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
                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <Edit3 stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Activity Name</Text>
                                </View>
                                <TextInput
                                    style={styles.input}
                                    placeholder="Activity Name"
                                    placeholderTextColor={modalColors.textDim}
                                    value={name}
                                    onChangeText={setName}
                                    autoCapitalize="words"
                                    returnKeyType="done"
                                    onSubmitEditing={() => Keyboard.dismiss()}
                                    blurOnSubmit={true}
                                />
                            </View>

                            <View style={styles.inputSection}>
                                <View style={styles.inputHeader}>
                                    <View style={styles.iconWrapper}>
                                        <MessageSquare stroke={modalColors.purple500} width={16} height={16} />
                                    </View>
                                    <Text style={styles.inputLabel}>Welcome Message</Text>
                                </View>
                                <TextInput
                                    style={styles.textarea}
                                    placeholder="Welcome message..."
                                    placeholderTextColor={modalColors.textDim}
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
                                <View style={styles.inputSection}>
                                    <View style={styles.inputHeader}>
                                        <View style={styles.iconWrapper}>
                                            <MapPin stroke={modalColors.purple500} width={16} height={16} />
                                        </View>
                                        <Text style={styles.inputLabel}>Location</Text>
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
                                            style={styles.input}
                                            placeholder="Enter location"
                                            placeholderTextColor={modalColors.textDim}
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
                                disabled={!canSave() || isSubmitting}
                            >
                                <LinearGradient
                                    colors={modalColors.buttonGradient}
                                    style={modalStyles.primaryButtonGradient}
                                >
                                    {isSubmitting ? (
                                        <Text style={modalStyles.primaryButtonText}>
                                            {loadingMessage || 'Saving...'}
                                        </Text>
                                    ) : (
                                        <>
                                            <Save stroke="#fff" width={16} height={16} />
                                            <Text style={modalStyles.primaryButtonText}>
                                                Save
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
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
        width: 90,
        height: 90,
        borderRadius: 45,
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
        width: 75,
        height: 75,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
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

})