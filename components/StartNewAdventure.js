import React, { useState, useEffect, useRef } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    Dimensions,
    Animated,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { 
    ArrowLeft, 
    Utensils,
    Wine,
    Coffee,
    Sparkles,
} from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const { width: screenWidth } = Dimensions.get('window')

export default function StartNewAdventure({ onTripSelect, onBack }) {
    const [selected, setSelected] = useState(null)
    const scaleRestaurant = useRef(new Animated.Value(1)).current
    const scaleBar = useRef(new Animated.Value(1)).current
    const rotateRestaurant = useRef(new Animated.Value(0)).current
    const rotateBar = useRef(new Animated.Value(0)).current

    // Fun entrance animation
    useEffect(() => {
        Animated.parallel([
            Animated.spring(scaleRestaurant, {
                toValue: 1,
                from: 0.8,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
                delay: 100,
            }),
            Animated.spring(scaleBar, {
                toValue: 1,
                from: 0.8,
                tension: 50,
                friction: 5,
                useNativeDriver: true,
                delay: 200,
            }),
        ]).start()
    }, [])

    const handleSelection = (type) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        setSelected(type)
        
        // Bounce animation on selection
        const scale = type === 'Restaurant' ? scaleRestaurant : scaleBar
        const rotate = type === 'Restaurant' ? rotateRestaurant : rotateBar
        
        Animated.parallel([
            Animated.sequence([
                Animated.timing(scale, {
                    toValue: 1.05,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.spring(scale, {
                    toValue: 1,
                    friction: 3,
                    tension: 40,
                    useNativeDriver: true,
                }),
            ]),
            Animated.sequence([
                Animated.timing(rotate, {
                    toValue: 0.03,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: -0.03,
                    duration: 100,
                    useNativeDriver: true,
                }),
                Animated.timing(rotate, {
                    toValue: 0,
                    duration: 100,
                    useNativeDriver: true,
                }),
            ]),
        ]).start()

        // Navigate after animation
        setTimeout(() => {
            onTripSelect(type === 'Restaurant' ? 'Restaurant' : 'Cocktails')
        }, 400)
    }

    const rotateRestaurantInterpolate = rotateRestaurant.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-30deg', '30deg'],
    })

    const rotateBarInterpolate = rotateBar.interpolate({
        inputRange: [-1, 1],
        outputRange: ['-30deg', '30deg'],
    })

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <ArrowLeft color="#fff" size={20} />
                </TouchableOpacity>
                <View style={styles.titleContainer}>
                    <Text style={styles.title}>Pick Your Vibe</Text>
                    <View style={styles.sparkleContainer}>
                        <Sparkles color="#FFE66D" size={24} />
                    </View>
                </View>
            </View>

            <Text style={styles.subtitle}>What sounds good tonight?</Text>

            {/* Two Big Buttons */}
            <View style={styles.buttonsContainer}>
                {/* Restaurant Button */}
                <Animated.View style={[
                    styles.buttonWrapper,
                    {
                        transform: [
                            { scale: scaleRestaurant },
                            { rotate: rotateRestaurantInterpolate }
                        ]
                    }
                ]}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleSelection('Restaurant')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={selected === 'Restaurant' 
                                ? ['#FF6B6B', '#FF5252'] 
                                : ['#FF6B6B', '#FF8787']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.gradientButton,
                                selected === 'Restaurant' && styles.selectedButton
                            ]}
                        >
                            <View style={styles.iconCircle}>
                                <Utensils color="#fff" size={40} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.buttonTitle}>Restaurant</Text>
                            <Text style={styles.buttonDescription}>
                                Great food awaits
                            </Text>
                            {selected === 'Restaurant' && (
                                <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedText}>✓ Selected</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>

                {/* Bar Button */}
                <Animated.View style={[
                    styles.buttonWrapper,
                    {
                        transform: [
                            { scale: scaleBar },
                            { rotate: rotateBarInterpolate }
                        ]
                    }
                ]}>
                    <TouchableOpacity
                        style={styles.optionButton}
                        onPress={() => handleSelection('Bar')}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={selected === 'Bar' 
                                ? ['#4ECDC4', '#44A39F'] 
                                : ['#4ECDC4', '#6DD5CE']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                                styles.gradientButton,
                                selected === 'Bar' && styles.selectedButton
                            ]}
                        >
                            <View style={styles.iconCircle}>
                                <Wine color="#fff" size={40} strokeWidth={1.5} />
                            </View>
                            <Text style={styles.buttonTitle}>Bar</Text>
                            <Text style={styles.buttonDescription}>
                                Cocktails, beer, and good vibes
                            </Text>
                            {selected === 'Bar' && (
                                <View style={styles.selectedBadge}>
                                    <Text style={styles.selectedText}>✓ Selected</Text>
                                </View>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>

            {/* Coming Soon Section */}
            <View style={styles.comingSoonSection}>
                <Text style={styles.comingSoonTitle}>More Coming Soon</Text>
                <View style={styles.comingSoonGrid}>
                    <View style={styles.comingSoonItem}>
                        <Coffee color="rgba(255, 255, 255, 0.4)" size={20} />
                        <Text style={styles.comingSoonText}>Coffee</Text>
                    </View>
                    <View style={styles.comingSoonItem}>
                        <Text style={styles.comingSoonEmoji}>🥐</Text>
                        <Text style={styles.comingSoonText}>Brunch</Text>
                    </View>
                    <View style={styles.comingSoonItem}>
                        <Text style={styles.comingSoonEmoji}>🍰</Text>
                        <Text style={styles.comingSoonText}>Dessert</Text>
                    </View>
                </View>
            </View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    titleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 40, // Balance the back button
    },

    title: {
        fontSize: 32,
        fontWeight: '800',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
        marginRight: 12,
    },

    sparkleContainer: {
        transform: [{ rotate: '15deg' }],
    },

    subtitle: {
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        marginBottom: 40,
        fontFamily: 'Montserrat_500Medium',
    },

    buttonsContainer: {
        flex: 1,
        paddingHorizontal: 20,
        gap: 20,
        justifyContent: 'center',
        paddingBottom: 40,
    },

    buttonWrapper: {
        width: '100%',
    },

    optionButton: {
        width: '100%',
        borderRadius: 24,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },

    gradientButton: {
        padding: 28,
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'transparent',
        position: 'relative',
    },

    selectedButton: {
        borderColor: 'rgba(255, 255, 255, 0.4)',
        borderWidth: 3,
    },

    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    buttonTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
        textShadowColor: 'rgba(0, 0, 0, 0.2)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },

    buttonDescription: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.9)',
        fontFamily: 'Montserrat_500Medium',
        textAlign: 'center',
    },

    selectedBadge: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    selectedText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },

    comingSoonSection: {
        padding: 20,
        paddingTop: 0,
    },

    comingSoonTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.4)',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        fontFamily: 'Montserrat_600SemiBold',
        textAlign: 'center',
    },

    comingSoonGrid: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 16,
    },

    comingSoonItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        paddingVertical: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },

    comingSoonEmoji: {
        fontSize: 20,
    },

    comingSoonText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.5)',
        fontFamily: 'Montserrat_500Medium',
    },
})