import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    Modal,
    StyleSheet,
    Animated,
    Easing,
    Dimensions,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

export default function AIGenerationLoader({ visible, isSolo = false }) {
    // Animation values
    const mainRotation = useRef(new Animated.Value(0)).current;
    const pulseScale = useRef(new Animated.Value(1)).current;
    const glowOpacity = useRef(new Animated.Value(0.3)).current;
    const particleAnimations = useRef([
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
        new Animated.Value(0),
    ]).current;
    const progressWidth = useRef(new Animated.Value(0)).current;
    const textFade = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Main rotation animation
            Animated.loop(
                Animated.timing(mainRotation, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();

            // Pulse scale animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseScale, {
                        toValue: 1.15,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseScale, {
                        toValue: 1,
                        duration: 1500,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Glow opacity animation
            Animated.loop(
                Animated.sequence([
                    Animated.timing(glowOpacity, {
                        toValue: 0.8,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(glowOpacity, {
                        toValue: 0.3,
                        duration: 1200,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                ])
            ).start();

            // Particle animations - stagger them
            particleAnimations.forEach((anim, index) => {
                Animated.loop(
                    Animated.sequence([
                        Animated.delay(index * 300),
                        Animated.timing(anim, {
                            toValue: 1,
                            duration: 2500,
                            easing: Easing.inOut(Easing.ease),
                            useNativeDriver: true,
                        }),
                        Animated.timing(anim, {
                            toValue: 0,
                            duration: 0,
                            useNativeDriver: true,
                        }),
                    ])
                ).start();
            });

            // Progress bar animation (simulated)
            Animated.timing(progressWidth, {
                toValue: 1,
                duration: 20000, // 20 seconds to match expected time
                easing: Easing.bezier(0.4, 0.0, 0.2, 1),
                useNativeDriver: false,
            }).start();

            // Text fade in
            Animated.timing(textFade, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }).start();
        } else {
            // Reset animations
            mainRotation.setValue(0);
            pulseScale.setValue(1);
            glowOpacity.setValue(0.3);
            particleAnimations.forEach(anim => anim.setValue(0));
            progressWidth.setValue(0);
            textFade.setValue(0);
        }
    }, [visible]);

    const rotationInterpolate = mainRotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const getParticleTransform = (index) => {
        const anim = particleAnimations[index];
        const angle = (index * 72) * (Math.PI / 180); // 360/5 = 72 degrees apart
        const radius = 120;

        return {
            translateX: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.cos(angle) * radius],
            }),
            translateY: anim.interpolate({
                inputRange: [0, 1],
                outputRange: [0, Math.sin(angle) * radius],
            }),
            scale: anim.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [1, 1.2, 0],
            }),
            opacity: anim.interpolate({
                inputRange: [0, 0.3, 0.7, 1],
                outputRange: [0, 1, 1, 0],
            }),
        };
    };

    const progressWidthInterpolate = progressWidth.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            statusBarTranslucent
        >
            <View style={styles.container}>
                {/* Gradient Background */}
                <LinearGradient
                    colors={['#1a0a2e', '#16213e', '#0f3460']}
                    style={styles.gradientBackground}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                />

                {/* Floating Particles */}
                {particleAnimations.map((_, index) => (
                    <Animated.View
                        key={index}
                        style={[
                            styles.particle,
                            {
                                transform: [
                                    { translateX: getParticleTransform(index).translateX },
                                    { translateY: getParticleTransform(index).translateY },
                                    { scale: getParticleTransform(index).scale },
                                ],
                                opacity: getParticleTransform(index).opacity,
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#667eea']}
                            style={styles.particleGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </Animated.View>
                ))}

                {/* Main Content Card */}
                <Animated.View style={[styles.contentCard, { opacity: textFade }]}>
                    {/* Outer glow effect */}
                    <Animated.View
                        style={[
                            styles.glowOuter,
                            {
                                opacity: glowOpacity,
                                transform: [{ scale: pulseScale }],
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={['rgba(204, 49, 232, 0.4)', 'rgba(102, 126, 234, 0.4)']}
                            style={styles.glowGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        />
                    </Animated.View>

                    {/* Glass card with blur effect */}
                    <View style={styles.glassCard}>
                        {/* Animated Voxxy Triangle */}
                        <View style={styles.logoContainer}>
                            <Animated.View
                                style={[
                                    styles.triangleWrapper,
                                    {
                                        transform: [
                                            { rotate: rotationInterpolate },
                                            { scale: pulseScale },
                                        ],
                                    },
                                ]}
                            >
                                <LinearGradient
                                    colors={['#cc31e8', '#667eea', '#f64f59']}
                                    style={styles.triangleBackground}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <Image
                                        source={require('../assets/voxxy-triangle.png')}
                                        style={styles.triangleImage}
                                        resizeMode="contain"
                                    />
                                </LinearGradient>
                            </Animated.View>

                            {/* Inner rotating ring */}
                            <Animated.View
                                style={[
                                    styles.rotatingRing,
                                    {
                                        transform: [
                                            { rotate: mainRotation.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0deg', '-360deg'],
                                            })},
                                        ],
                                    },
                                ]}
                            >
                                <LinearGradient
                                    colors={['transparent', 'rgba(204, 49, 232, 0.6)', 'transparent']}
                                    style={styles.ringGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                />
                            </Animated.View>
                        </View>

                        {/* Title */}
                        <View style={styles.titleContainer}>
                            <Text style={styles.title}>
                                {isSolo ? 'Crafting Your Personal Experience' : 'Crafting Your Perfect Experience'}
                            </Text>
                        </View>

                        {/* Subtitle */}
                        <Text style={styles.subtitle}>
                            Voxxy is analyzing venues and personalizing recommendations just for you...
                        </Text>

                        {/* Progress Bar */}
                        <View style={styles.progressContainer}>
                            <View style={styles.progressTrack}>
                                <Animated.View
                                    style={[
                                        styles.progressBar,
                                        { width: progressWidthInterpolate },
                                    ]}
                                >
                                    <LinearGradient
                                        colors={['#cc31e8', '#667eea', '#f64f59']}
                                        style={styles.progressGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    />
                                </Animated.View>
                            </View>
                        </View>

                        {/* Status indicators */}
                        <View style={styles.statusContainer}>
                            <View style={styles.statusRow}>
                                <Animated.View
                                    style={[
                                        styles.statusDot,
                                        {
                                            opacity: particleAnimations[0].interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.3, 1, 0.3],
                                            }),
                                        },
                                    ]}
                                />
                                <Text style={styles.statusText}>Analyzing preferences</Text>
                            </View>
                            <View style={styles.statusRow}>
                                <Animated.View
                                    style={[
                                        styles.statusDot,
                                        {
                                            opacity: particleAnimations[1].interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.3, 1, 0.3],
                                            }),
                                        },
                                    ]}
                                />
                                <Text style={styles.statusText}>Finding perfect matches</Text>
                            </View>
                            <View style={styles.statusRow}>
                                <Animated.View
                                    style={[
                                        styles.statusDot,
                                        {
                                            opacity: particleAnimations[2].interpolate({
                                                inputRange: [0, 0.5, 1],
                                                outputRange: [0.3, 1, 0.3],
                                            }),
                                        },
                                    ]}
                                />
                                <Text style={styles.statusText}>Personalizing results</Text>
                            </View>
                        </View>

                        {/* Time estimate */}
                        <View style={styles.timeContainer}>
                            <View style={styles.timeBadge}>
                                <Text style={styles.timeText}>⏱️ 10-20 seconds</Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    particle: {
        position: 'absolute',
        top: height / 2,
        left: width / 2,
        width: 20,
        height: 20,
        borderRadius: 10,
        overflow: 'hidden',
    },
    particleGradient: {
        flex: 1,
        borderRadius: 10,
    },
    contentCard: {
        width: width * 0.9,
        maxWidth: 400,
        alignItems: 'center',
        position: 'relative',
    },
    glowOuter: {
        position: 'absolute',
        width: '110%',
        height: '110%',
        borderRadius: 32,
        top: '-5%',
        left: '-5%',
    },
    glowGradient: {
        flex: 1,
        borderRadius: 32,
    },
    glassCard: {
        width: '100%',
        backgroundColor: 'rgba(32, 25, 37, 0.85)',
        borderRadius: 28,
        padding: 32,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.2)',
        alignItems: 'center',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    logoContainer: {
        width: 140,
        height: 140,
        marginBottom: 28,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    triangleWrapper: {
        width: 100,
        height: 100,
        borderRadius: 50,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    triangleBackground: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    triangleImage: {
        width: 60,
        height: 60,
        tintColor: '#ffffff',
    },
    rotatingRing: {
        position: 'absolute',
        width: 140,
        height: 140,
        borderRadius: 70,
        borderWidth: 3,
        borderColor: 'transparent',
        overflow: 'hidden',
    },
    ringGradient: {
        flex: 1,
        borderRadius: 70,
    },
    titleContainer: {
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '800',
        textAlign: 'center',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.75)',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    progressContainer: {
        width: '100%',
        marginBottom: 28,
    },
    progressTrack: {
        width: '100%',
        height: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressGradient: {
        flex: 1,
    },
    statusContainer: {
        width: '100%',
        gap: 12,
        marginBottom: 24,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#cc31e8',
    },
    statusText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.7)',
        fontWeight: '500',
    },
    timeContainer: {
        alignItems: 'center',
    },
    timeBadge: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },
    timeText: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.85)',
        fontWeight: '600',
    },
});
