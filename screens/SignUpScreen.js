import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
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
        <View style={styles.container}>
            <Text style={styles.heading}>Create an account</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>What should we call you?</Text>
                <TextInput value={name} onChangeText={setName} style={styles.input} />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput value={email} onChangeText={setEmail} style={styles.input} keyboardType="email-address" autoCapitalize="none" />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Create a password</Text>
                <TextInput value={password} onChangeText={setPassword} style={styles.input} secureTextEntry />
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm your password</Text>
                <TextInput value={confirmation} onChangeText={setConfirmation} style={styles.input} secureTextEntry />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSignUp}>
                <Text style={styles.buttonText}>Create account</Text>
            </TouchableOpacity>

            <Text style={styles.linkText} onPress={() => navigation.navigate('Login')}>
                Already have an account? <Text style={styles.link}>Log in</Text>
            </Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        padding: 24,
        backgroundColor: '#fff',
        flex: 1,
        justifyContent: 'center',
    },
    heading: {
        fontSize: 22,
        fontWeight: '500',
        marginBottom: 32,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        marginBottom: 6,
        color: '#444',
    },
    input: {
        backgroundColor: '#f9f9f9',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#ddd',
    },
    button: {
        backgroundColor: '#8e44ad',
        padding: 16,
        borderRadius: 50,
        alignItems: 'center',
        marginTop: 20,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
    },
    linkText: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 24,
    },
    link: {
        color: '#6c63ff',
        textDecorationLine: 'underline',
    },
});