import React, { useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
    const { setUser } = useContext(UserContext);
    const navigation = useNavigation();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');


    const handleLogin = async () => {
        try {
          const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Mobile-App': 'true',
            },
            body: JSON.stringify({ email, password }),
          });
      
          const data = await response.json();
      
          if (!response.ok) throw new Error(data.error || 'Login failed');
      
          await AsyncStorage.setItem('jwt', data.token);
          setUser(data.user);
          navigation.navigate('Home');
        } catch (error) {
          Alert.alert('Error', error.message);
        }
      };

    return (
        <View style={styles.container}>
            <Text style={styles.heading}>Log in to your account</Text>

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
                <Text style={styles.label}>Password</Text>
                <TextInput
                    value={password}
                    onChangeText={setPassword}
                    style={styles.input}
                    secureTextEntry
                />
            </View>

            <TouchableOpacity style={styles.button} onPress={handleLogin}>
                <Text style={styles.buttonText}>Log in</Text>
            </TouchableOpacity>

            <Text style={styles.linkText} onPress={() => navigation.navigate('SignUp')}>
                Don't have an account? <Text style={styles.link}>Sign up</Text>
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