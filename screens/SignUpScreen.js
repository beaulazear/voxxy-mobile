import React, { useState, useContext } from 'react';
import { ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, Linking } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';

export default function SignUpScreen() {
    const { setUser } = useContext(UserContext);
    const navigation = useNavigation();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmation, setConfirmation] = useState('');

    const handleSignUp = async () => {
        if (password !== confirmation) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        try {
            const response = await fetch(`https://voxxyapi.onrender.com/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    user: {
                        name,
                        email,
                        password,
                        password_confirmation: confirmation,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.errors?.join(', ') || 'Sign up failed');
            setUser(data);
            navigation.navigate('Home');
        } catch (error) {
            Alert.alert('Error', error.message);
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Be one of the first to experience Voxxy! 🎉</Text>
                <Text style={styles.headerSubtitle}>
                    As a beta user, you’ll get early access to new features, special perks, and a direct line to share feedback. Help shape the future of group planning as we grow together.
                </Text>
            </View>

            <View style={styles.form}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>What should we call you?</Text>
                    <TextInput
                        value={name}
                        onChangeText={setName}
                        style={styles.input}
                        autoCapitalize="words"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Email</Text>
                    <TextInput
                        value={email}
                        onChangeText={setEmail}
                        style={styles.input}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Create a password</Text>
                    <TextInput
                        value={password}
                        onChangeText={setPassword}
                        style={styles.input}
                        secureTextEntry
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Confirm your password</Text>
                    <TextInput
                        value={confirmation}
                        onChangeText={setConfirmation}
                        style={styles.input}
                        secureTextEntry
                    />
                </View>

                <TouchableOpacity style={styles.submitButton} onPress={handleSignUp}>
                    <Text style={styles.submitButtonText}>Create account</Text>
                </TouchableOpacity>

                <TouchableOpacity >
                    <Text onPress={() => navigation.navigate('/')} style={styles.textLink}>
                        Already have an account? <Text style={styles.textLinkAction}>Log in</Text>
                    </Text>
                </TouchableOpacity>
                <TouchableOpacity>
                    <Text style={styles.textLink}>
                        By continuing, you agree to our{' '}
                        <Text onPress={() => Linking.openURL('https://www.voxxyai.com/#terms')} style={styles.textLinkAction}>Terms of Service</Text> and{' '}
                        <Text onPress={() => Linking.openURL('https://www.voxxyai.com/#/privacy')} style={styles.textLinkAction}>Privacy Policy</Text>.
                    </Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: '#201925',
        paddingHorizontal: 16,
        paddingVertical: 32,
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
        backgroundColor: 'transparent',
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
});