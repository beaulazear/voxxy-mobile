import React, { useEffect, useRef } from 'react';
import {
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Animated,
} from 'react-native';
import HeaderSvg from '../assets/header.svg';
import { useNavigation } from '@react-navigation/native';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';

export default function LandingScreen() {
    const navigation = useNavigation();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            })
        ]).start();
    }, []);

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View style={[styles.top, {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
            }]}>
                <HeaderSvg width={280} height={65} />
                <Text style={styles.subtitle}>
                    Less chaos, more memories ✨
                </Text>
            </Animated.View>

            <Animated.View style={[styles.menu, {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
            }]}>
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => navigation.navigate('SignUp')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.primaryButtonText}>Get Started →</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => navigation.navigate('Login')}
                    activeOpacity={0.8}
                >
                    <Text style={styles.secondaryButtonText}>Sign In</Text>
                </TouchableOpacity>
            </Animated.View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    top: {
        alignItems: 'center',
        marginBottom: 40,
    },
    subtitle: {
        marginTop: 25,
        fontSize: 18,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
        fontWeight: '500',
    },
    menu: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
        gap: SPACING.COMFORTABLE_GAP,
    },
    primaryButton: {
        width: '100%',
        backgroundColor: '#9333EA',
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 18,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        shadowColor: '#9333EA',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 19,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    secondaryButton: {
        width: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 18,
        borderRadius: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 8,
        borderWidth: 1.5,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});