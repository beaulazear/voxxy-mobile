import React, { useEffect, useState, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    Animated,
    Modal,
    Image,
    Dimensions,
} from 'react-native'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

import HEADER from '../assets/header.svg'

const messages = [
    "Analyzing your preferences...",
    "Processing your data...",
    "Working some magic...",
    "Crafting perfect recommendations...",
    "Almost ready...",
    "Putting the finishing touches..."
]

// Floating Dot Component
const FloatingDot = ({ duration, delay, position }) => {
    const animatedValue = useRef(new Animated.Value(0)).current
    const rotationValue = useRef(new Animated.Value(0)).current
    const opacityValue = useRef(new Animated.Value(0.7)).current

    useEffect(() => {
        const floatAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(animatedValue, {
                    toValue: 1,
                    duration: duration * 1000,
                    useNativeDriver: true,
                }),
            ])
        )

        const rotationAnimation = Animated.loop(
            Animated.timing(rotationValue, {
                toValue: 1,
                duration: duration * 1000,
                useNativeDriver: true,
            })
        )

        const opacityAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(opacityValue, {
                    toValue: 1,
                    duration: (duration * 1000) / 3,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 0.8,
                    duration: (duration * 1000) / 3,
                    useNativeDriver: true,
                }),
                Animated.timing(opacityValue, {
                    toValue: 0.7,
                    duration: (duration * 1000) / 3,
                    useNativeDriver: true,
                }),
            ])
        )

        // Delay the start
        setTimeout(() => {
            floatAnimation.start()
            rotationAnimation.start()
            opacityAnimation.start()
        }, delay * 1000)

        return () => {
            floatAnimation.stop()
            rotationAnimation.stop()
            opacityAnimation.stop()
        }
    }, [animatedValue, rotationValue, opacityValue, duration, delay])

    const translateY = animatedValue.interpolate({
        inputRange: [0, 0.33, 0.66, 1],
        outputRange: [0, -10, -5, 0],
    })

    const rotate = rotationValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    })

    return (
        <Animated.View
            style={[
                styles.floatingDot,
                position,
                {
                    transform: [{ translateY }, { rotate }],
                    opacity: opacityValue,
                },
            ]}
        />
    )
}

// Progress Bar Component
const ProgressBar = ({ progress }) => {
    const shimmerValue = useRef(new Animated.Value(0)).current

    useEffect(() => {
        const shimmerAnimation = Animated.loop(
            Animated.timing(shimmerValue, {
                toValue: 1,
                duration: 2000,
                useNativeDriver: false,
            })
        )
        shimmerAnimation.start()

        return () => shimmerAnimation.stop()
    }, [shimmerValue])

    const translateX = shimmerValue.interpolate({
        inputRange: [0, 1],
        outputRange: [-200, 200],
    })

    return (
        <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { width: `${progress}%` }]}>
                <Animated.View
                    style={[
                        styles.shimmer,
                        {
                            transform: [{ translateX }],
                        },
                    ]}
                />
            </View>
        </View>
    )
}

// Main Modal Component
const ModalContainer = ({ children }) => {
    const breatheValue = useRef(new Animated.Value(1)).current

    useEffect(() => {
        const breatheAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(breatheValue, {
                    toValue: 1.01,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(breatheValue, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        )
        breatheAnimation.start()

        return () => breatheAnimation.stop()
    }, [breatheValue])

    return (
        <Animated.View
            style={[
                styles.modal,
                {
                    transform: [{ scale: breatheValue }],
                },
            ]}
        >
            {children}
        </Animated.View>
    )
}

// Logo Component with Pulse Animation
const LogoComponent = () => {
    const pulseValue = useRef(new Animated.Value(0.8)).current

    useEffect(() => {
        const pulseAnimation = Animated.loop(
            Animated.sequence([
                Animated.timing(pulseValue, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseValue, {
                    toValue: 0.8,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        )
        pulseAnimation.start()

        return () => pulseAnimation.stop()
    }, [pulseValue])

    return (
        <Animated.View
            style={[
                styles.logoContainer,
                {
                    opacity: pulseValue,
                    transform: [{ scale: pulseValue }],
                },
            ]}
        >
            <Image source={HEADER} style={styles.logo} />
            <View style={styles.logoPlaceholder}>
                <Text style={styles.logoText}>VOXXY</Text>
            </View>
        </Animated.View>
    )
}

export default function LoadingScreenUser({ onComplete, autoDismiss = true }) {
    const [currentMessage, setCurrentMessage] = useState(0)
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        // Progress animation
        const progressInterval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95 // Stop at 95% to avoid completing before actual process
                return prev + Math.random() * 3 + 1
            })
        }, 200)

        // Message rotation
        const messageInterval = setInterval(() => {
            setCurrentMessage(prev => (prev + 1) % messages.length)
        }, 2500)

        // Auto dismiss
        let dismissTimer
        if (autoDismiss && onComplete) {
            dismissTimer = setTimeout(() => {
                onComplete()
            }, 2000)
        }

        return () => {
            clearInterval(progressInterval)
            clearInterval(messageInterval)
            if (dismissTimer) clearTimeout(dismissTimer)
        }
    }, [onComplete, autoDismiss])

    return (
        <Modal visible={true} transparent={true} animationType="fade">
            <View style={styles.backdrop}>
                <ModalContainer>
                    {/* Floating Dots */}
                    <FloatingDot
                        duration={4}
                        delay={0}
                        position={{ position: 'absolute', top: '20%', left: '15%' }}
                    />
                    <FloatingDot
                        duration={5}
                        delay={1}
                        position={{ position: 'absolute', top: '30%', right: '20%' }}
                    />
                    <FloatingDot
                        duration={3.5}
                        delay={2}
                        position={{ position: 'absolute', bottom: '25%', left: '25%' }}
                    />
                    <FloatingDot
                        duration={4.5}
                        delay={0.5}
                        position={{ position: 'absolute', bottom: '35%', right: '15%' }}
                    />
                    <FloatingDot
                        duration={3}
                        delay={1.5}
                        position={{ position: 'absolute', top: '50%', left: '10%' }}
                    />
                    <FloatingDot
                        duration={5.5}
                        delay={2.5}
                        position={{ position: 'absolute', top: '60%', right: '10%' }}
                    />

                    {/* Logo */}
                    <LogoComponent />

                    {/* Title */}
                    <Text style={styles.title}>Gathering your recommendations</Text>

                    {/* Subtitle */}
                    <Text style={styles.subtitle}>This may take a few moments...</Text>

                    {/* Progress Bar */}
                    <ProgressBar progress={progress} />

                    {/* Loading Message */}
                    <Text style={styles.loadingText}>{messages[currentMessage]}</Text>
                </ModalContainer>
            </View>
        </Modal>
    )
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    modal: {
        backgroundColor: '#2A1E30',
        paddingVertical: 40,
        paddingHorizontal: 45,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.2)',
        width: Math.min(460, screenWidth * 0.9),
        position: 'relative',
        overflow: 'hidden',
        // Shadow for iOS
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        // Elevation for Android
        elevation: 10,
    },
    floatingDot: {
        width: 6,
        height: 6,
        backgroundColor: 'rgba(204, 49, 232, 0.6)',
        borderRadius: 3,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 25,
    },
    logo: {
        width: 110,
        height: 60, // Adjust based on your logo aspect ratio
        resizeMode: 'contain',
    },
    logoPlaceholder: {
        width: 110,
        height: 60,
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.4)',
    },
    logoText: {
        color: '#cc31e8',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: 2,
    },
    title: {
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 8,
        color: '#cc31e8',
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        fontSize: 15,
        color: '#a0a0a0',
        marginBottom: 30,
        textAlign: 'center',
        opacity: 0.8,
    },
    progressContainer: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
        marginBottom: 20,
    },
    progressBar: {
        height: '100%',
        backgroundColor: '#cc31e8',
        borderRadius: 3,
        position: 'relative',
        overflow: 'hidden',
    },
    shimmer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        width: 200,
    },
    loadingText: {
        fontSize: 14,
        color: '#b0b0b0',
        fontStyle: 'italic',
        textAlign: 'center',
        minHeight: 20,
    },
})