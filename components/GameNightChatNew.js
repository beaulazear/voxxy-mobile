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
import { Users, UserPlus, Gamepad2, Dice1 } from 'lucide-react-native'
import VoxxyLogo from '../assets/icon.png'
import * as Haptics from 'expo-haptics'
import { API_URL } from '../config'
import { logger } from '../utils/logger'

const { width: screenWidth } = Dimensions.get('window')

export default function GameNightChatNew({ visible, onClose }) {
    const { user, setUser } = useContext(UserContext)
    
    const [step, setStep] = useState(1)
    const totalSteps = 1
    const percent = 100 // Always 100% for single step
    const [fadeAnim] = useState(new Animated.Value(0))
    const [successAnim] = useState(new Animated.Value(0))
    const [pulseAnim] = useState(new Animated.Value(1))
    const progressAnim = useRef(new Animated.Value(0)).current
    const [showSuccess, setShowSuccess] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [loadingMessage, setLoadingMessage] = useState('Creating your activity...')

    // Step 1: Group Size
    const [selectedGroupSize, setSelectedGroupSize] = useState('')

    // Group size options
    const groupSizeOptions = [
        { label: 'Small Group', value: '2-3', icon: Users, desc: '2-3 players' },
        { label: 'Perfect Size', value: '4-6', icon: Users, desc: '4-6 players' },
        { label: 'Big Group', value: '7-10', icon: UserPlus, desc: '7-10 players' },
        { label: 'Party Night', value: '10+', icon: UserPlus, desc: '10+ players' }
    ]

    // Animate step transitions
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }, [])

    // Animate progress bar
    useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: percent,
            duration: 500,
            easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            useNativeDriver: false,
        }).start()
    }, [percent])

    // Pulse animation for loading
    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        ).start()
    }

    // Success animation
    const showSuccessAnimation = () => {
        setShowSuccess(true)
        Animated.spring(successAnim, {
            toValue: 1,
            friction: 4,
            tension: 40,
            useNativeDriver: true,
        }).start()
    }

    // Step content headers
    const getStepContent = () => {
        return {
            title: 'How many players?',
            subtitle: 'Choose your group size for the perfect game night'
        }
    }

    // Validation
    const isNextDisabled = () => {
        return isSubmitting || !selectedGroupSize
    }

    // Loading messages rotation
    useEffect(() => {
        if (isSubmitting) {
            const messages = [
                'Creating your activity...',
                'Setting up game night...',
                'Finding the best games...',
                'Almost ready...'
            ]
            let index = 0
            const interval = setInterval(() => {
                index = (index + 1) % messages.length
                setLoadingMessage(messages[index])
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [isSubmitting])

    // Submit to create activity
    const handleSubmit = async () => {
        if (isSubmitting) return
        
        try {
            setIsSubmitting(true)
            startPulseAnimation()
            
            const payload = {
                activity_name: 'Game Night',  // Required field
                activity_type: 'Game Night',
                activity_location: 'TBD',
                group_size: selectedGroupSize,
                responses: `Group size: ${selectedGroupSize}`,
                date_notes: 'Planning a game night',  // Required field
                radius: 0,  // Game nights don't use radius
                emoji: '🎲',
                collecting: true  // Start in collecting phase
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
                logger.error('Activity creation failed:', {
                    status: response.status,
                    statusText: response.statusText,
                    errorText: errorText,
                    payload: payload
                })
                throw new Error(`Failed to create activity: ${response.status} ${errorText}`)
            }

            const data = await response.json()

            // Update user context with new activity
            setUser((prev) => ({
                ...prev,
                activities: [
                    ...(prev.activities || []),
                    { ...data, user: prev, responses: [] },
                ],
            }))

            // Show success animation
            setIsSubmitting(false)
            showSuccessAnimation()
            
            logger.debug('Activity created successfully, ID:', data.id)
            
            // Navigate after success animation
            setTimeout(() => {
                logger.debug('Closing modal after success animation')
                // First hide the success overlay
                setShowSuccess(false)
                setIsSubmitting(false)
                
                // Give time for overlay to disappear before navigating
                setTimeout(() => {
                    // Reset form states
                    setSelectedGroupSize('')
                    setStep(1)
                    // Then close and navigate
                    onClose(data.id) // Pass activity ID to parent
                }, 100)
            }, 1500)

        } catch (error) {
            logger.error('Error creating activity:', error)
            Alert.alert('Error', 'Failed to create activity. Please try again.')
            setIsSubmitting(false)
            setShowSuccess(false)
        }
    }

    const renderProgressBar = () => (
        <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
                <Animated.View
                    style={[
                        styles.progressFill,
                        {
                            width: progressAnim.interpolate({
                                inputRange: [0, 100],
                                outputRange: ['0%', '100%']
                            })
                        }
                    ]}
                />
            </View>
            <Text style={styles.progressText}>
                {isSubmitting ? 'Processing...' : `${step} of ${totalSteps}`}
            </Text>
        </View>
    )

    const renderStepContent = () => {
        return (
            <Animated.View style={[styles.stepContainer, { opacity: fadeAnim }]}>
                <View style={styles.optionGrid}>
                    {groupSizeOptions.map(option => (
                        <TouchableOpacity
                            key={option.value}
                            style={[
                                styles.optionCard,
                                selectedGroupSize === option.value && styles.optionCardSelected
                            ]}
                            onPress={() => {
                                try {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                } catch (e) {
                                    // Haptics not available
                                }
                                setSelectedGroupSize(option.value)
                            }}
                        >
                            <option.icon color="#fff" size={24} style={{ marginBottom: 8 }} />
                            <Text style={[
                                styles.optionLabel,
                                selectedGroupSize === option.value && styles.optionLabelSelected
                            ]}>
                                {option.label}
                            </Text>
                            <Text style={styles.optionDesc}>{option.desc}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                
                <View style={styles.infoContainer}>
                    <Gamepad2 color="#cc31e8" size={20} />
                    <Text style={styles.infoText}>
                        Date, time, and games will be decided together
                    </Text>
                </View>
            </Animated.View>
        )
    }

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
                    keyboardDismissMode="on-drag"
                >
                    {renderStepContent()}
                </ScrollView>

                {/* Full Screen Loading/Success Overlay */}
                {(isSubmitting || showSuccess) && (
                    <Modal
                        visible={isSubmitting || showSuccess}
                        transparent
                        animationType="fade"
                    >
                        <Animated.View
                            style={[
                                styles.fullScreenOverlay,
                                {
                                    opacity: isSubmitting ? 1 : successAnim,
                                }
                            ]}
                        >
                            {!showSuccess ? (
                                <Animated.View style={[styles.loadingContent, { transform: [{ scale: pulseAnim }] }]}>
                                    <View style={styles.loadingIconLarge}>
                                        <ActivityIndicator size="large" color="#cc31e8" />
                                    </View>
                                    <Text style={styles.loadingTitleLarge}>{loadingMessage}</Text>
                                    <Text style={styles.loadingSubtitleLarge}>Setting up your game night...</Text>
                                </Animated.View>
                            ) : (
                                <Animated.View
                                    style={[
                                        styles.successContent,
                                        {
                                            transform: [
                                                {
                                                    scale: successAnim.interpolate({
                                                        inputRange: [0, 1],
                                                        outputRange: [0.3, 1]
                                                    })
                                                }
                                            ]
                                        }
                                    ]}
                                >
                                    <View style={styles.successIcon}>
                                        <Image source={VoxxyLogo} style={styles.successLogo} />
                                    </View>
                                    <Text style={styles.successTitle}>Activity Created!</Text>
                                    <Text style={styles.successSubtitle}>Get ready for an epic game night</Text>
                                </Animated.View>
                            )}
                        </Animated.View>
                    </Modal>
                )}

                <View style={styles.buttonRow}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => onClose()}
                    >
                        <Text style={styles.closeButtonText}>Close</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.nextButton, isNextDisabled() && styles.nextButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={isNextDisabled()}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#9b1dbd']}
                            style={styles.nextButtonGradient}
                        >
                            <Text style={styles.nextButtonText}>
                                Create Game Night
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
        minWidth: 40,
        textAlign: 'right',
    },

    header: {
        paddingHorizontal: 24,
        paddingBottom: 20,
    },

    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    subtitle: {
        fontSize: 16,
        color: '#999',
        lineHeight: 22,
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

    optionGrid: {
        gap: 12,
    },

    optionCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
    },

    optionCardSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        borderColor: '#cc31e8',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },

    optionLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },

    optionLabelSelected: {
        color: '#cc31e8',
    },

    optionDesc: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
    },

    infoContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        gap: 12,
    },

    infoText: {
        flex: 1,
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
    },

    buttonRow: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 30,
        gap: 12,
    },

    closeButton: {
        backgroundColor: 'rgba(255, 69, 69, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(255, 69, 69, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        minHeight: 52,
        justifyContent: 'center',
    },

    closeButtonText: {
        color: '#ff4545',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },

    nextButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        minHeight: 52,
    },

    nextButtonDisabled: {
        opacity: 0.5,
    },

    nextButtonGradient: {
        paddingVertical: 16,
        paddingHorizontal: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },

    nextButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    fullScreenOverlay: {
        flex: 1,
        backgroundColor: '#0f0f14',
        justifyContent: 'center',
        alignItems: 'center',
    },

    loadingContent: {
        alignItems: 'center',
        padding: 32,
    },

    loadingIconLarge: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.2)',
    },

    loadingTitleLarge: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },

    loadingSubtitleLarge: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
    },

    successContent: {
        alignItems: 'center',
        padding: 32,
    },

    successIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },

    successLogo: {
        width: 60,
        height: 60,
        resizeMode: 'contain',
    },

    successTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },

    successSubtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
    },
})