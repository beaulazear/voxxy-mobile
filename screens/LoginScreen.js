import React, { useState, useContext, useRef, useEffect } from 'react';
import {
    View,
    Text,
    Linking,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    ScrollView
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TestImage from '../components/TestImage';

export default function LoginScreen() {
    const { setUser } = useContext(UserContext);
    const navigation = useNavigation();
    const passwordRef = useRef();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    useEffect(() => {
        AsyncStorage.getItem('jwt').then(token => {
            if (token) navigation.replace('Home');
        });
    }, []);

    const handleLogin = async () => {
        Keyboard.dismiss();
        try {
            const response = await fetch(`${API_URL}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Mobile-App': 'true',
                },
                body: JSON.stringify({
                    email: email.toLowerCase().trim(),
                    password,
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.error || 'Login failed');
            await AsyncStorage.setItem('jwt', data.token);
            setUser(data);
            navigation.replace('/');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.select({ ios: 60, android: 20 })}
        >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                <ScrollView
                    contentContainerStyle={styles.container}
                    keyboardShouldPersistTaps="handled"
                >
                    <TestImage />

                    <View style={styles.header}>
                        <Text style={styles.headerTitle}>Log in to Voxxy Beta ✨</Text>
                        <Text style={styles.headerSubtitle}>
                            You’re getting full access to the Voxxy experience and your feedback shapes our product.
                        </Text>
                    </View>

                    <View style={styles.form}>
                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Email</Text>
                            <TextInput
                                value={email}
                                onChangeText={setEmail}
                                style={styles.input}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                returnKeyType="next"
                                onSubmitEditing={() => passwordRef.current?.focus()}
                                blurOnSubmit={false}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.label}>Password</Text>
                            <TextInput
                                ref={passwordRef}
                                value={password}
                                onChangeText={setPassword}
                                style={styles.input}
                                secureTextEntry
                                returnKeyType="go"
                                onSubmitEditing={handleLogin}
                            />
                        </View>

                        <TouchableOpacity style={styles.submitButton} onPress={handleLogin}>
                            <Text style={styles.submitButtonText}>Log in</Text>
                        </TouchableOpacity>

                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text style={styles.textLink}>
                                New here? <Text style={styles.textLinkAction}>Sign up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.footer}>
                        <Text
                            style={[styles.footerLink, styles.forgot]}
                            onPress={() => navigation.navigate('ForgotPassword')}
                        >
                            Forgot Password?
                        </Text>
                    </View>
                </ScrollView>
            </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#201925',
        paddingHorizontal: 30,
        paddingVertical: 10,
        justifyContent: 'center',
    },
    header: {
        marginBottom: 32,
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 20,
    },
    form: {
        paddingHorizontal: 8,
    },
    heading: {
        fontSize: 22,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        color: '#fff',
        marginBottom: 4,
        fontWeight: '500',
    },
    input: {
        width: '100%',
        backgroundColor: '#211825',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1.5,
        borderColor: '#592566',
    },
    submitButton: {
        marginTop: 8,
        backgroundColor: '#cc31e8',
        paddingVertical: 14,
        borderRadius: 50,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    textLink: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        marginTop: 16,
    },
    textLinkAction: {
        color: '#cc31e8',
        textDecorationLine: 'underline',
        fontWeight: '500',
    },
    footer: {
        marginTop: 32,
        alignItems: 'center',
    },
    footerLink: {
        color: '#cc31e8',
        textDecorationLine: 'underline',
    },
    forgot: {
        marginTop: 8,
    },
});