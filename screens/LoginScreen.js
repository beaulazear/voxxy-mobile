import React, { useState, useContext, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  SafeAreaView,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderSvg from '../assets/header.svg';

export default function LoginScreen() {
  const { setUser } = useContext(UserContext) || {};
  const navigation = useNavigation();
  const passwordRef = useRef();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    AsyncStorage.getItem('jwt').then(token => {
      if (token) navigation.replace('Home');
    });
  }, []);

  const handleLogin = async () => {
    if (isLoading) return;
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      const res = await fetch(`${API_URL}/login`, {
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
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Login failed');
      await AsyncStorage.setItem('jwt', data.token);
      setUser(data);
      navigation.replace('/');  // Redirect to home ("/")
    } catch (err) {
      Alert.alert('Error', err.message);
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          {/* HEADER */}
          <View style={styles.header}>
            <HeaderSvg width={260} height={60} />
            <Text style={styles.loginTitle}>Welcome Back ✨</Text>
          </View>

          {/* FORM */}
          <View style={styles.form}>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#888"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoFocus
              returnKeyType="next"
              textContentType="emailAddress"
              onSubmitEditing={() => passwordRef.current?.focus()}
            />

            <TextInput
              ref={passwordRef}
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="#888"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              returnKeyType="go"
              textContentType="password"
              onSubmitEditing={handleLogin}
            />

            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              <Text style={styles.submitText}>
                {isLoading ? 'Checking your itinerary…' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('SignUp')}
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                New here? <Text style={styles.linkAction}>Sign up</Text>
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() =>
                Linking.openURL('https://www.voxxyai.com/#/forgot-password')
              }
              style={styles.linkRow}
            >
              <Text style={styles.linkText}>
                <Text style={styles.linkAction}>Forgot Password?</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 40 : 20,
    marginBottom: 30,
  },
  loginTitle: {
    marginTop: 12,
    color: '#ccc',
    fontSize: 18,
    fontWeight: '500',
  },
  form: {
    width: '100%',
  },
  input: {
    width: '100%',
    backgroundColor: '#211825',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    fontSize: 16,
    color: '#fff',
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#592566',
  },
  submitButton: {
    backgroundColor: '#cc31e8',
    paddingVertical: 14,
    borderRadius: 50,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linkRow: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#888',
    fontSize: 14,
  },
  linkAction: {
    color: '#cc31e8',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});