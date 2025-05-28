import React, { useEffect, useRef, useState, useContext } from 'react';
import {
    SafeAreaView,
    Text,
    StyleSheet,
    Animated,
    TouchableOpacity,
    Alert,
} from 'react-native';
import HeaderSvg from '../assets/header.svg';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AccountCreatedScreen() {
    const { user, setUser } = useContext(UserContext);
    const navigation = useNavigation();
    const [isSending, setIsSending] = useState(false);
    const [timer, setTimer] = useState(0);

    const opacity = useRef(new Animated.Value(0)).current;
    const translateY = useRef(new Animated.Value(50)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.timing(translateY, {
                toValue: 0,
                duration: 400,
                useNativeDriver: true,
            }),
        ]).start();
    }, [opacity, translateY]);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleResend = () => {
        if (isSending || timer > 0) return;
        setIsSending(true);
        setTimer(60);

        fetch(`${API_URL}/resend_verification`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: user.email }),
        })
            .then(res => res.json())
            .then(data => {
                Alert.alert(data.message || 'Verification email sent!');
            })
            .catch(() => {
                Alert.alert('An error occurred. Please try again.');
            })
            .finally(() => setIsSending(false));
    };

    const handleLogout = async () => {
        const token = await AsyncStorage.getItem('jwt');
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.log('Server logout failed, proceeding anyway:', error);
        } finally {
            await AsyncStorage.removeItem('jwt');
            setUser(null);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View
                style={[
                    styles.card,
                    { opacity, transform: [{ translateY }] },
                ]}
            >
                <HeaderSvg width={200} height={60} style={styles.logo} />

                <Text style={styles.message}>
                    {user.name}, We're happy to have you here! Please check {user.email} for a verification link from Team Voxxy. (Check spam too) Not your email? Log out and try again.
                </Text>

                <TouchableOpacity
                    onPress={handleResend}
                    disabled={isSending || timer > 0}
                    style={styles.linkContainer}
                >
                    <Text style={styles.linkText}>
                        {timer > 0 ? `Resend in ${timer}s` : 'Resend Verification'}
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Text style={styles.logoutButtonText}>Log Out</Text>
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
        alignItems: 'center',
    },
    card: {
        paddingVertical: 40,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    logo: {
        marginBottom: 24,
    },
    message: {
        color: '#fff',
        fontSize: 18,
        lineHeight: 24,
        textAlign: 'center',
        fontWeight: '500',
        marginBottom: 24,
    },
    linkContainer: {
        marginBottom: 32,
    },
    linkText: {
        color: '#ccc',
        fontSize: 14,
        textDecorationLine: 'underline',
    },
    logoutButton: {
        backgroundColor: '#cc31e8',
        paddingVertical: 14,
        borderRadius: 50,
        alignItems: 'center',
        width: 150,
    },
    logoutButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});