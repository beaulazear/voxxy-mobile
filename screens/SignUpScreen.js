import React, { useState, useContext, useMemo } from 'react';
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
} from 'react-native';
import { API_URL } from '../config';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { ArrowLeft } from 'lucide-react-native';

export default function SignUpScreen() {
    const { setUser } = useContext(UserContext);
    const navigation = useNavigation();

    const [step, setStep] = useState(0);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');
    const [isLoading, setIsLoading] = useState(false);

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

    const emailRegex = useMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]+$/, []);
    
    const validatePassword = (pwd) => {
        // At least 8 characters, 1 uppercase, 1 lowercase, 1 number
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;
        return passwordRegex.test(pwd);
    };

    const validateStep = () => {
        switch (step) {
            case 0: return name.trim().length > 0;
            case 1: return emailRegex.test(email);
            case 2: return validatePassword(password);
            case 3: return confirmation === password && validatePassword(password);
            default: return false;
        }
    };

    const handleNext = () => {
        if (!validateStep()) {
            Alert.alert('Error', 'Please enter a valid value before continuing');
            return;
        }
        setStep(step + 1);
    };

    const handleBack = () => setStep(step - 1);

    const handleSignUp = async () => {
        if (!validateStep()) {
            Alert.alert('Error', 'Please confirm your password correctly');
            return;
        }
        setIsLoading(true);
        Keyboard.dismiss();

        try {
            const resp = await fetch(`${API_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Mobile-App': 'true' },
                body: JSON.stringify({
                    user: { name, email, password, password_confirmation: confirmation },
                }),
            });
            const data = await resp.json();
            if (!resp.ok) throw new Error(data.errors?.join(', ') || 'Sign up failed');
            setUser(data);
            navigation.replace('/');
        } catch (e) {
            Alert.alert('Error', e.message);
            setIsLoading(false);
        }
    };

    const { value, onChange, placeholder, secure, keyboard } = inputs[step];
    const isLast = step === inputs.length - 1;
    const canProceed = validateStep();

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
                    <Text style={styles.heading}>{labels[step]}</Text>

                    <TextInput
                        style={styles.input}
                        value={value}
                        onChangeText={onChange}
                        placeholder={placeholder}
                        placeholderTextColor="#666"
                        secureTextEntry={secure}
                        keyboardType={keyboard}
                        autoCorrect={false}
                        autoCapitalize="none"
                        {...autoFillProps}
                        autoFocus
                    />

                    <TouchableOpacity
                        style={[
                            styles.nextButton,
                            (!canProceed || (isLast && isLoading)) && styles.nextButtonDisabled,
                        ]}
                        onPress={isLast ? handleSignUp : handleNext}
                        disabled={!canProceed || (isLast && isLoading)}
                    >
                        <Text style={styles.nextText}>
                            {isLast
                                ? isLoading
                                    ? 'Checking your itinerary…'
                                    : 'Create Account'
                                : 'Next'}
                        </Text>
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
    backButton: { width: 32 },
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
    input: {
        backgroundColor: '#211825',
        borderRadius: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1.5,
        borderColor: '#592566',
        marginBottom: 16,
    },
    nextButton: {
        backgroundColor: '#cc31e8',
        paddingVertical: 14,
        borderRadius: 50,
        alignItems: 'center',
        marginBottom: 12,
    },
    nextButtonDisabled: {
        opacity: 0.5,
    },
    nextText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    linksContainer: { marginTop: 8 },
    linkButton: { 
        alignItems: 'center', 
        paddingVertical: 8,
        marginBottom: 8,
    },
    backLinkButton: { 
        alignItems: 'center', 
        paddingVertical: 6,
    },
    loginText: { fontSize: 14, color: '#ccc', textAlign: 'center' },
    backLinkText: { fontSize: 13, color: '#aaa', textAlign: 'center' },
    textLinkAction: { color: '#cc31e8', fontWeight: '500' },
    legalText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        lineHeight: 16,
        paddingHorizontal: 20,
    },
});