import React, { useState, useRef, useEffect, useContext } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Animated,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { ArrowLeft, Shield } from 'lucide-react-native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { logger } from '../utils/logger';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';

export default function VerificationCodeScreen() {
    const { user, setUser } = useContext(UserContext);
    const navigation = useNavigation();
    
    const [code, setCode] = useState(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [timer, setTimer] = useState(0);
    const [error, setError] = useState('');
    
    const inputRefs = useRef([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;

    useEffect(() => {
        // Animation on mount
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
            }),
        ]).start();

        // Auto-focus first input
        setTimeout(() => {
            inputRefs.current[0]?.focus();
        }, 700);
    }, []);

    useEffect(() => {
        let interval;
        if (timer > 0) {
            interval = setInterval(() => setTimer(t => t - 1), 1000);
        }
        return () => clearInterval(interval);
    }, [timer]);

    const handleCodeChange = (index, value) => {
        // Handle paste of full code
        if (value.length > 1) {
            // Extract only digits from the pasted value
            const digits = value.replace(/\D/g, '').slice(0, 6);
            
            if (digits.length === 6) {
                // If we have exactly 6 digits, fill all inputs
                const newCode = digits.split('');
                setCode(newCode);
                setError('');
                
                // Focus the last input
                inputRefs.current[5]?.focus();
                
                // Auto-submit
                handleVerifyCode(digits);
            } else if (digits.length > 0) {
                // Partial paste
                const newCode = [...code];
                
                // Fill in the digits starting from the current index
                for (let i = 0; i < digits.length && index + i < 6; i++) {
                    newCode[index + i] = digits[i];
                }
                
                setCode(newCode);
                setError('');
                
                // Focus the next empty input or the last input if all are filled
                const nextEmptyIndex = newCode.findIndex((digit, idx) => idx > index && digit === '');
                if (nextEmptyIndex !== -1) {
                    inputRefs.current[nextEmptyIndex]?.focus();
                } else if (index + digits.length < 6) {
                    inputRefs.current[Math.min(index + digits.length, 5)]?.focus();
                } else {
                    inputRefs.current[5]?.focus();
                }
                
                // Auto-submit when all 6 digits are entered
                if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
                    handleVerifyCode(newCode.join(''));
                }
            }
            return;
        }
        
        // Handle single digit input
        if (!/^\d*$/.test(value)) return; // Only allow numbers
        
        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError('');

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all 6 digits are entered
        if (newCode.every(digit => digit !== '') && newCode.join('').length === 6) {
            handleVerifyCode(newCode.join(''));
        }
    };

    const handleKeyPress = (index, key) => {
        if (key === 'Backspace' && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleVerifyCode = async (codeString) => {
        setIsVerifying(true);
        setError('');

        try {
            const token = await AsyncStorage.getItem('jwt');
            const response = await fetch(`${API_URL}/verify_code`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token && { Authorization: `Bearer ${token}` }),
                },
                body: JSON.stringify({ code: codeString }),
            });

            const data = await response.json();

            if (response.ok) {
                // Update user context with verified status and response data
                const updatedUser = data.user || { ...user, confirmed_at: new Date().toISOString() };
                
                // Preserve the existing token or use the new one if provided
                if (data.token) {
                    updatedUser.token = data.token;
                } else if (user.token) {
                    // Make sure we preserve the existing token
                    updatedUser.token = user.token;
                }
                
                // Mark as newly verified to trigger policy modals
                updatedUser.isNewlyVerified = true;
                
                setUser(updatedUser);
                
                // Success animation then navigate
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                }).start(() => {
                    navigation.replace('/');
                });
            } else {
                setError(data.error || 'Invalid verification code');
                setCode(['', '', '', '', '', '']); // Clear code on error
                // Focus first input after error
                setTimeout(() => inputRefs.current[0]?.focus(), 100);
            }
        } catch (err) {
            logger.error('Verification error:', err);
            setError('Network error. Please check your connection and try again.');
            setCode(['', '', '', '', '', '']);
        } finally {
            setIsVerifying(false);
        }
    };

    const handleResend = async () => {
        if (isSending || timer > 0) return;
        
        setIsSending(true);
        setTimer(60);
        setError('');

        try {
            const response = await fetch(`${API_URL}/resend_verification`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: user.email }),
            });

            const data = await response.json();
            
            if (response.ok) {
                Alert.alert('Success', data.message || 'Verification code sent!');
            } else {
                setError(data.error || 'Failed to resend code');
                setTimer(0); // Reset timer on error
            }
        } catch (err) {
            logger.error('Resend error:', err);
            setError('Failed to resend code. Please try again.');
            setTimer(0);
        } finally {
            setIsSending(false);
        }
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
            logger.debug('Server logout failed, proceeding anyway:', error);
        } finally {
            await AsyncStorage.removeItem('jwt');
            setUser(null);
            navigation.replace('/');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity 
                    onPress={handleLogout} 
                    style={styles.backButton}
                >
                    <ArrowLeft size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            <KeyboardAvoidingView
                style={styles.content}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <Animated.View
                    style={[
                        styles.card,
                        {
                            opacity: fadeAnim,
                            transform: [{ translateY: slideAnim }],
                        },
                    ]}
                >
                    <View style={styles.iconWrapper}>
                        <Shield size={32} color="#fff" />
                    </View>

                    <Text style={styles.title}>Enter verification code</Text>
                    <Text style={styles.subtitle}>
                        We've sent a 6-digit code to {user?.email}
                    </Text>

                    <View style={styles.codeContainer}>
                        {code.map((digit, index) => (
                            <TextInput
                                key={index}
                                ref={(ref) => (inputRefs.current[index] = ref)}
                                style={[
                                    styles.codeInput,
                                    digit && styles.codeInputFilled,
                                    error && styles.codeInputError,
                                ]}
                                value={digit}
                                onChangeText={(value) => handleCodeChange(index, value)}
                                onKeyPress={({ nativeEvent }) => handleKeyPress(index, nativeEvent.key)}
                                keyboardType="numeric"
                                textAlign="center"
                                editable={!isVerifying}
                                selectTextOnFocus
                                // iOS SMS autofill
                                textContentType={index === 0 ? "oneTimeCode" : "none"}
                                // Android SMS autofill
                                autoComplete={index === 0 ? "sms-otp" : "off"}
                            />
                        ))}
                    </View>

                    {error ? (
                        <Animated.View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{error}</Text>
                        </Animated.View>
                    ) : null}

                    {isVerifying && (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="small" color="#9333EA" />
                            <Text style={styles.loadingText}>Verifying...</Text>
                        </View>
                    )}

                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            onPress={handleResend}
                            disabled={isSending || timer > 0 || isVerifying}
                            style={[
                                styles.resendButton,
                                (isSending || timer > 0 || isVerifying) && styles.resendButtonDisabled,
                            ]}
                        >
                            <Text style={[
                                styles.resendText,
                                (isSending || timer > 0 || isVerifying) && styles.resendTextDisabled,
                            ]}>
                                {timer > 0 ? `Resend in ${timer}s` : 'Resend code'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            onPress={handleLogout}
                            style={styles.logoutButton}
                            disabled={isVerifying}
                        >
                            <Text style={styles.logoutText}>Log out</Text>
                        </TouchableOpacity>
                    </View>
                </Animated.View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    header: {
        height: 60,
        paddingHorizontal: 16,
        justifyContent: 'center',
    },
    backButton: {
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    card: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    iconWrapper: {
        width: 70,
        height: 70,
        backgroundColor: '#9333EA',
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#9333EA',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    codeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        maxWidth: 340,
        alignSelf: 'center',
        marginBottom: 24,
        paddingHorizontal: 10,
    },
    codeInput: {
        width: 48,
        height: 60,
        borderWidth: 2,
        borderColor: 'rgba(157, 96, 248, 0.3)',
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#fff',
        fontSize: 24,
        fontWeight: 'bold',
        textAlign: 'center',
    },
    codeInputFilled: {
        borderColor: '#9333EA',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
    },
    codeInputError: {
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
    },
    errorContainer: {
        marginTop: -16,
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 20,
    },
    loadingText: {
        color: '#9333EA',
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '500',
    },
    buttonContainer: {
        width: '100%',
        gap: SPACING.FORM_GAP,
    },
    resendButton: {
        alignItems: 'center',
        minHeight: TOUCH_TARGETS.COMFORTABLE_SIZE,
        paddingVertical: 16,
    },
    resendButtonDisabled: {
        opacity: 0.5,
    },
    resendText: {
        color: '#9333EA',
        fontSize: 16,
        fontWeight: '600',
    },
    resendTextDisabled: {
        color: '#666',
    },
    logoutButton: {
        alignItems: 'center',
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        paddingVertical: 14,
    },
    logoutText: {
        color: '#ccc',
        fontSize: 14,
        fontWeight: '500',
    },
});