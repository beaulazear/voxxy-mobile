import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    Linking,
    SafeAreaView,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Animated,
    ActivityIndicator,
} from 'react-native';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { safeApiCall, handleApiError } from '../utils/safeApiCall';
import { validateEmail, validateUserName, validatePassword } from '../utils/validation';
import { ArrowLeft, Eye, EyeOff, Check, X } from 'lucide-react-native';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';

export default function SignUpScreen() {
    const { setUser } = useContext(UserContext);
    const navigation = useNavigation();

    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
    
    // Animation refs
    const fadeAnim = useRef(new Animated.Value(1)).current;
    const slideAnim = useRef(new Animated.Value(0)).current;
    const inputRef = useRef(null);

    const labels = [
        "What should we call you?",
        "What's your email?",
        "Create a password",
        "Confirm your password",
    ];

    const inputs = [
        { value: name, onChange: setName, placeholder: 'Your name', secure: false, keyboard: 'default' },
        { value: email, onChange: setEmail, placeholder: 'you@example.com', secure: false, keyboard: 'email-address' },
        { value: password, onChange: setPassword, placeholder: '••••••••', secure: true, keyboard: 'default' },
        { value: confirmation, onChange: setConfirmation, placeholder: '••••••••', secure: true, keyboard: 'default' },
    ];

    // Real-time validation
    const currentValidation = useMemo(() => {
        switch (step) {
            case 0: return validateUserName(name);
            case 1: return validateEmail(email);
            case 2: return validatePassword(password);
            case 3: {
                const passwordValid = validatePassword(password);
                const confirmationValid = confirmation === password;
                return {
                    isValid: passwordValid.isValid && confirmationValid,
                    error: !confirmationValid ? 'Passwords do not match' : passwordValid.error,
                    strength: passwordValid.strength,
                    strengthText: passwordValid.strengthText
                };
            }
            default: return { isValid: false, error: null };
        }
    }, [step, name, email, password, confirmation]);

    // Animation effects
    useEffect(() => {
        // Slide in animation when step changes
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 150,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0, // Reset to 0 instead of accumulating
                duration: 0,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
        
        // Auto-focus input after animation
        setTimeout(() => {
            inputRef.current?.focus();
        }, 350);
    }, [step, fadeAnim, slideAnim]);

    const validateStep = () => currentValidation.isValid;

    const handleNext = () => {
        if (!validateStep()) {
            setValidationErrors({[step]: currentValidation.error});
            return;
        }
        setValidationErrors({});
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSignUp = async () => {
        if (!validateStep()) {
            setValidationErrors({[step]: currentValidation.error});
            return;
        }

        // Final validation with detailed error messages
        const nameValidation = validateUserName(name);
        const emailValidation = validateEmail(email);
        const passwordValidation = validatePassword(password);

        if (!nameValidation.isValid) {
            Alert.alert('Error', nameValidation.error);
            return;
        }
        if (!emailValidation.isValid) {
            Alert.alert('Error', emailValidation.error);
            return;
        }
        if (!passwordValidation.isValid) {
            Alert.alert('Error', passwordValidation.error);
            return;
        }

        setIsLoading(true);
        Keyboard.dismiss();

        try {
            const data = await safeApiCall(
                `${API_URL}/users`,
                {
                    method: 'POST',
                    headers: { 'X-Mobile-App': 'true' },
                    body: JSON.stringify({
                        user: { 
                            name: nameValidation.sanitized, 
                            email: emailValidation.sanitized, 
                            password: password, 
                            password_confirmation: confirmation
                        },
                    }),
                }
            );

            // Success animation before navigation
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 300,
                useNativeDriver: true,
            }).start(() => {
                setUser(data);
                navigation.replace('VerificationCode');
            });
        } catch (e) {
            // Display the actual error message from the server
            const errorMessage = e.message || handleApiError(e, 'Sign up failed. Please try again.');
            Alert.alert('Sign Up Error', errorMessage);
            setIsLoading(false);
        }
    };

    const { value, onChange, placeholder, secure, keyboard } = inputs[step];
    const isLast = step === inputs.length - 1;
    const canProceed = validateStep();
    
    // Get password strength info for display
    const passwordStrength = step === 2 ? validatePassword(password) : null;
    const showPasswordToggle = step === 2 || step === 3;

    // pick the right autofill hints per step
    const autoFillProps = (() => {
        switch (step) {
            case 1:
                return {
                    textContentType: 'emailAddress',   // credential autofill
                    autoComplete: 'email',         // Android/iOS
                    importantForAutofill: 'yes',
                };
            case 0:
                return {
                    textContentType: 'name',
                    autoComplete: 'name',
                    importantForAutofill: 'no',
                };
            case 2:
                return {
                    textContentType: 'newPassword',
                    autoComplete: 'off',
                    importantForAutofill: 'no',
                };
            case 3:
                return {
                    textContentType: 'password',
                    autoComplete: 'off',
                    importantForAutofill: 'no',
                };
            default:
                return {};
        }
    })();

    return (
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
            <SafeAreaView style={styles.container}>
                <View style={styles.nav}>
                    {step > 0 && (
                        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
                            <ArrowLeft size={24} color="#fff" />
                        </TouchableOpacity>
                    )}
                </View>

                <KeyboardAvoidingView
                    style={styles.content}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <Animated.View style={{
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }]
                    }}>
                        <Text style={styles.heading}>{labels[step]}</Text>

                        <View style={styles.inputContainer}>
                                <TextInput
                                    ref={inputRef}
                                    style={[
                                        styles.input,
                                        validationErrors[step] && styles.inputError,
                                        canProceed && value.length > 0 && styles.inputValid
                                    ]}
                                    value={value}
                                    onChangeText={(text) => {
                                        onChange(text);
                                        // Clear validation error when user starts typing
                                        if (validationErrors[step]) {
                                            setValidationErrors(prev => ({ ...prev, [step]: null }));
                                        }
                                    }}
                                    placeholder={placeholder}
                                    placeholderTextColor="#666"
                                    secureTextEntry={secure && (step === 2 ? !showPassword : !showConfirmation)}
                                    keyboardType={keyboard}
                                    autoCorrect={false}
                                    autoCapitalize="none"
                                    {...autoFillProps}
                                    returnKeyType={isLast ? 'done' : 'next'}
                                    onSubmitEditing={isLast ? handleSignUp : handleNext}
                                />
                                
                                {/* Password visibility toggle */}
                                {showPasswordToggle && (
                                    <TouchableOpacity
                                        style={styles.eyeButton}
                                        onPress={() => {
                                            if (step === 2) {
                                                setShowPassword(!showPassword);
                                            } else {
                                                setShowConfirmation(!showConfirmation);
                                            }
                                        }}
                                    >
                                        {(step === 2 ? showPassword : showConfirmation) ? (
                                            <EyeOff size={20} color="#666" />
                                        ) : (
                                            <Eye size={20} color="#666" />
                                        )}
                                    </TouchableOpacity>
                                )}
                                
                                {/* Validation status icon */}
                                {value.length > 0 && (
                                    <View style={styles.validationIcon}>
                                        {canProceed ? (
                                            <Check size={18} color="#28a745" />
                                        ) : (
                                            <X size={18} color="#dc3545" />
                                        )}
                                    </View>
                                )}
                            </View>
                        
                        {/* Validation error message */}
                        {validationErrors[step] && (
                            <Animated.View style={styles.errorContainer}>
                                <Text style={styles.errorText}>{validationErrors[step]}</Text>
                            </Animated.View>
                        )}
                        
                        {/* Password strength indicator */}
                        {step === 2 && password.length > 0 && passwordStrength && (
                            <View style={styles.strengthContainer}>
                                <View style={styles.strengthBar}>
                                    <View 
                                        style={[
                                            styles.strengthFill,
                                            { width: `${(passwordStrength.strength / 5) * 100}%` },
                                            passwordStrength.strength <= 2 && styles.strengthWeak,
                                            passwordStrength.strength === 3 && styles.strengthFair,
                                            passwordStrength.strength >= 4 && styles.strengthGood,
                                        ]}
                                    />
                                </View>
                                <Text style={[
                                    styles.strengthText,
                                    passwordStrength.strength <= 2 && styles.strengthTextWeak,
                                    passwordStrength.strength === 3 && styles.strengthTextFair,
                                    passwordStrength.strength >= 4 && styles.strengthTextGood,
                                ]}>
                                    {passwordStrength.strengthText}
                                </Text>
                            </View>
                        )}
                    </Animated.View>

                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            (!canProceed || (isLast && isLoading)) && styles.nextButtonDisabled,
                        ]}
                        onPress={isLast ? handleSignUp : handleNext}
                        disabled={!canProceed || (isLast && isLoading)}
                    >
                        {isLast && isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="small" color="#fff" />
                                <Text style={[styles.nextText, styles.loadingText]}>
                                    Creating your account…
                                </Text>
                            </View>
                        ) : (
                            <Text style={styles.nextText}>
                                {isLast ? 'Create Account' : 'Next'}
                            </Text>
                        )}
                    </TouchableOpacity>

                    {step === 0 && (
                        <View style={styles.linksContainer}>
                            <TouchableOpacity
                                style={styles.linkButton}
                                onPress={() => navigation.navigate('Login', { from: 'SignUp' })}
                            >
                                <Text style={styles.loginText}>
                                    Remember your account?{' '}
                                    <Text style={styles.textLinkAction}>Log in</Text>
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.backLinkButton}
                                onPress={() => navigation.navigate('/')}
                            >
                                <Text style={styles.backLinkText}>
                                    <Text style={styles.textLinkAction}>← Back to Landing</Text>
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {isLast && (
                        <Text style={styles.legalText}>
                            By continuing, you agree to our{' '}
                            <Text
                                onPress={() => Linking.openURL('https://www.voxxyai.com/#terms')}
                                style={styles.textLinkAction}
                            >
                                Terms of Service
                            </Text>{' '}
                            and{' '}
                            <Text
                                onPress={() => Linking.openURL('https://www.voxxyai.com/#/privacy')}
                                style={styles.textLinkAction}
                            >
                                Privacy Policy
                            </Text>.
                        </Text>
                    )}
                </KeyboardAvoidingView>
            </SafeAreaView>
        </TouchableWithoutFeedback>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#201925' },
    nav: { height: 60, justifyContent: 'center', paddingHorizontal: 16 },
    backButton: { 
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,
        paddingLeft: 8,
    },
    content: {
        flex: 1,
        justifyContent: 'flex-start',
        paddingHorizontal: 16,
        paddingTop: 40,
    },
    heading: {
        fontSize: 24,
        fontWeight: '600',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginBottom: 24,
    },
    inputContainer: {
        position: 'relative',
        marginBottom: SPACING.FORM_GAP,
    },
    input: {
        backgroundColor: '#211825',
        borderRadius: 12,
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 14,
        paddingHorizontal: 16,
        paddingRight: 96,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1.5,
        borderColor: '#592566',
        transition: 'all 0.2s ease',
    },
    inputError: {
        borderColor: '#dc3545',
        backgroundColor: 'rgba(220, 53, 69, 0.05)',
    },
    inputValid: {
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.05)',
    },
    eyeButton: {
        position: 'absolute',
        right: 48,
        top: '50%',
        transform: [{ translateY: -22 }],
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    validationIcon: {
        position: 'absolute',
        right: 8,
        top: '50%',
        transform: [{ translateY: -22 }],
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        marginTop: -12,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    errorText: {
        color: '#dc3545',
        fontSize: 14,
        fontWeight: '500',
    },
    strengthContainer: {
        marginTop: -8,
        marginBottom: 16,
        paddingHorizontal: 4,
    },
    strengthBar: {
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 2,
        marginBottom: 8,
        overflow: 'hidden',
    },
    strengthFill: {
        height: '100%',
        borderRadius: 2,
        transition: 'all 0.3s ease',
    },
    strengthWeak: {
        backgroundColor: '#dc3545',
    },
    strengthFair: {
        backgroundColor: '#ffc107',
    },
    strengthGood: {
        backgroundColor: '#28a745',
    },
    strengthText: {
        fontSize: 12,
        fontWeight: '500',
    },
    strengthTextWeak: {
        color: '#dc3545',
    },
    strengthTextFair: {
        color: '#ffc107',
    },
    strengthTextGood: {
        color: '#28a745',
    },
    nextButton: {
        backgroundColor: '#cc31e8',
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        marginBottom: SPACING.COMFORTABLE_GAP,
        marginTop: SPACING.MIN_GAP,
        shadowColor: '#cc31e8',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    nextButtonDisabled: {
        opacity: 0.5,
        shadowOpacity: 0,
        elevation: 0,
    },
    nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        marginLeft: 8,
    },
    linksContainer: { 
        marginTop: 24,
        alignItems: 'center',
        gap: 8,
    },
    linkButton: { 
        alignItems: 'center', 
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 4,
        justifyContent: 'center',
    },
    backLinkButton: { 
        alignItems: 'center', 
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 16,
        paddingHorizontal: 20,
        justifyContent: 'center',
    },
    loginText: { 
        fontSize: 18, 
        color: 'rgba(255, 255, 255, 0.8)', 
        textAlign: 'center',
        fontWeight: '500',
        lineHeight: 24,
    },
    backLinkText: { 
        fontSize: 17, 
        color: 'rgba(255, 255, 255, 0.7)', 
        textAlign: 'center',
        fontWeight: '600',
        lineHeight: 24,
    },
    textLinkAction: { 
        color: '#cc31e8', 
        fontWeight: '700',
        fontSize: 18,
    },
    legalText: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.6)',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 20,
        marginTop: 8,
    },
    skipButton: {
        alignItems: 'center',
        paddingVertical: 12,
        marginTop: 8,
    },
    skipText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '500',
    },
});