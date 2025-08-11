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
  KeyboardAvoidingView,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeApiCall, handleApiError } from '../utils/safeApiCall';
import { validateEmail } from '../utils/validation';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react-native';
import HeaderSvg from '../assets/header.svg';

export default function LoginScreen() {
  const { setUser } = useContext(UserContext) || {};
  const navigation = useNavigation();
  const passwordRef = useRef();
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [autoSubmitTriggered, setAutoSubmitTriggered] = useState(false);
  const [isAutoFilling, setIsAutoFilling] = useState(false);
  const autoSubmitTimeoutRef = useRef(null);

  useEffect(() => {
    AsyncStorage.getItem('jwt').then(token => {
      if (token) navigation.replace('/');
    });
  }, []);

  // Auto-submit when both fields are filled (from autofill)
  useEffect(() => {
    // Clear any existing timeout
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
    
    if (email.trim() && password.trim() && !autoSubmitTriggered && !isLoading) {
      // Show loading immediately when both fields are populated
      setIsAutoFilling(true);
      
      // Very short delay (50ms) just to ensure autofill is complete
      autoSubmitTimeoutRef.current = setTimeout(() => {
        setAutoSubmitTriggered(true);
        handleLogin();
      }, 50);
    }
    
    return () => {
      if (autoSubmitTimeoutRef.current) {
        clearTimeout(autoSubmitTimeoutRef.current);
      }
    };
  }, [email, password]);

  // Simple change handlers - autofill will populate both fields at once
  const handleEmailChange = (text) => {
    setEmail(text);
    // Cancel auto-submit if user is manually typing (fields won't both be filled instantly)
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
    // Cancel auto-submit if user is manually typing
    if (autoSubmitTimeoutRef.current) {
      clearTimeout(autoSubmitTimeoutRef.current);
    }
  };

  const handleLogin = async () => {
    if (isLoading) return;
    
    // Input validation
    const emailTrimmed = email.toLowerCase().trim();
    if (!emailTrimmed || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      setIsAutoFilling(false);
      return;
    }
    
    // Use proper email validation
    const emailValidation = validateEmail(emailTrimmed);
    if (!emailValidation.isValid) {
      Alert.alert('Error', emailValidation.error);
      setIsAutoFilling(false);
      return;
    }
    
    setIsLoading(true);
    setIsAutoFilling(false);
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
      setIsAutoFilling(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScrollView
            contentContainerStyle={styles.scrollContainer}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.inner, { opacity: fadeAnim }]}>
              {/* Back Button */}
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => navigation.navigate('/')}
                activeOpacity={0.7}
              >
                <ArrowLeft color="#fff" size={24} strokeWidth={2} />
              </TouchableOpacity>

              {/* HEADER */}
              <View style={styles.header}>
                <HeaderSvg width={260} height={60} />
                <Text style={styles.loginSubtitle}>Sign in to continue your journey</Text>
              </View>

              <View style={styles.form}>
              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Email</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your email"
                  placeholderTextColor="rgba(255, 255, 255, 0.4)"
                  value={email}
                  onChangeText={handleEmailChange}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoFocus
                  returnKeyType="next"
                  textContentType="emailAddress"
                  onSubmitEditing={() => passwordRef.current?.focus()}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Password</Text>
                <View style={styles.passwordContainer}>
                  <TextInput
                    ref={passwordRef}
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Enter your password"
                    placeholderTextColor="rgba(255, 255, 255, 0.4)"
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    returnKeyType="go"
                    textContentType="password"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowPassword(!showPassword)}
                    activeOpacity={0.7}
                  >
                    {showPassword ? (
                      <EyeOff color="rgba(255, 255, 255, 0.6)" size={20} strokeWidth={2} />
                    ) : (
                      <Eye color="rgba(255, 255, 255, 0.6)" size={20} strokeWidth={2} />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.submitButton, (isLoading || isAutoFilling) && styles.submitButtonDisabled]}
                onPress={handleLogin}
                disabled={isLoading || isAutoFilling}
                activeOpacity={0.8}
              >
                {(isLoading || isAutoFilling) ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <ActivityIndicator color="#fff" size="small" />
                    <Text style={[styles.submitText, { marginLeft: 10 }]}>Signing in...</Text>
                  </View>
                ) : (
                  <Text style={styles.submitText}>Sign In</Text>
                )}
              </TouchableOpacity>

              <View style={styles.linksContainer}>
                <TouchableOpacity
                  onPress={() => navigation.navigate('SignUp')}
                  style={styles.linkButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.linkText}>
                    New to Voxxy? <Text style={styles.linkAction}>Create account</Text>
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() =>
                    Linking.openURL('https://www.voxxyai.com/#/forgot-password')
                  }
                  style={styles.linkButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.forgotPasswordText}>Forgot password?</Text>
                </TouchableOpacity>
              </View>
            </View>
            </Animated.View>
          </ScrollView>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    minHeight: '100%',
  },
  inner: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'flex-start',
    minHeight: '100%',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 10 : 5,
    marginBottom: 10,
    alignSelf: 'flex-start',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  loginTitle: {
    marginTop: 16,
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  loginSubtitle: {
    marginTop: 8,
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontWeight: '400',
    textAlign: 'center',
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    fontFamily: 'Montserrat_600SemiBold',
  },
  input: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 20,
    fontSize: 16,
    color: '#fff',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    fontWeight: '500',
  },
  passwordContainer: {
    position: 'relative',
  },
  passwordInput: {
    paddingRight: 50,
  },
  eyeButton: {
    position: 'absolute',
    right: 16,
    top: 16,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#667eea',
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    shadowColor: '#667eea',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
  },
  submitButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  linksContainer: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkButton: {
    paddingVertical: 12,
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '500',
  },
  linkAction: {
    color: '#667eea',
    fontWeight: '600',
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
});