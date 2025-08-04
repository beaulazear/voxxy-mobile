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
import { safeApiCall, handleApiError } from '../utils/safeApiCall';
import { validateEmail } from '../utils/validation';
import HeaderSvg from '../assets/header.svg';

export default function LoginScreen() {
  const { setUser } = useContext(UserContext) || {};
  const navigation = useNavigation();
  const passwordRef = useRef();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('jwt').then(token => {
      if (token) navigation.replace('/');
    });
  }, []);

  // Auto-submit when both fields are filled (likely from autofill)
  useEffect(() => {
    if (email.trim() && password.trim() && !autoSubmitTriggered && !isLoading) {
      // Small delay to ensure autofill is complete
      const timer = setTimeout(() => {
        setAutoSubmitTriggered(true);
        handleLogin();
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [email, password, autoSubmitTriggered, isLoading]);

  const handleLogin = async () => {
    if (isLoading) return;
    
    // Input validation
    const emailTrimmed = email.toLowerCase().trim();
    if (!emailTrimmed || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    
    // Use proper email validation
    const emailValidation = validateEmail(emailTrimmed);
    if (!emailValidation.isValid) {
      Alert.alert('Error', emailValidation.error);
      return;
    }
    
    setIsLoading(true);
    Keyboard.dismiss();
    try {
      const data = await safeApiCall(
        `${API_URL}/login`,
        {
          method: 'POST',
          headers: {
            'X-Mobile-App': 'true',
          },
          body: JSON.stringify({
            email: emailValidation.sanitized,
            password,
          }),
        }
      );

      await AsyncStorage.setItem('jwt', data.token);
      setUser(data);
      navigation.replace('/');
    } catch (err) {
      const errorMessage = handleApiError(err, 'Invalid email or password. Please try again.');
      Alert.alert('Login Failed', errorMessage);
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
                {isLoading ? 'Logging in…' : 'Log in'}
              </Text>
            </TouchableOpacity>

            <View style={styles.linksContainer}>
              <TouchableOpacity
                onPress={() => navigation.navigate('SignUp')}
                style={styles.linkButton}
              >
                <Text style={styles.linkText}>
                  New here? <Text style={styles.linkAction}>Sign up</Text>
                </Text>
              </TouchableOpacity>

              <View style={styles.bottomLinks}>
                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL('https://www.voxxyai.com/#/forgot-password')
                  }
                  style={styles.linkButton}
                >
                  <Text style={styles.linkTextSmall}>
                    <Text style={styles.linkAction}>Forgot Password?</Text>
                  </Text>
                </TouchableOpacity>

                <Text style={styles.linkSeparator}>•</Text>

                <TouchableOpacity
                  onPress={() => navigation.navigate('/')}
                  style={styles.linkButton}
                >
                  <Text style={styles.linkTextSmall}>
                    <Text style={styles.linkAction}>Back to Landing</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
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
  linksContainer: {
    marginTop: 20,
  },
  linkButton: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  linkText: {
    color: '#888',
    fontSize: 14,
  },
  linkTextSmall: {
    color: '#888',
    fontSize: 13,
  },
  linkAction: {
    color: '#cc31e8',
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
  bottomLinks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
  },
  linkSeparator: {
    color: '#666',
    marginHorizontal: 12,
    fontSize: 12,
  },
});