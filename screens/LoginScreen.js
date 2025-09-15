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
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { safeApiCall, handleApiError } from '../utils/safeApiCall';
import { validateEmail } from '../utils/validation';
import { Eye, EyeOff } from 'lucide-react-native';
import { TOUCH_TARGETS } from '../styles/AccessibilityStyles';

export default function LoginScreen() {
  const { setUser } = useContext(UserContext) || {};
  const navigation = useNavigation();
  const passwordRef = useRef();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;
  const emailInputRef = useRef();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem('jwt').then(token => {
      if (token) navigation.replace('/');
    });
  }, []);

  // Initial slide-in animation
  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      })
    ]).start();
    
    // Auto-focus email input after animation
    setTimeout(() => {
      emailInputRef.current?.focus();
    }, 450);
  }, []);

  // Simple change handlers
  const handleEmailChange = (text) => {
    setEmail(text);
  };

  const handlePasswordChange = (text) => {
    setPassword(text);
  };

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
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <SafeAreaView style={styles.container}>

        <KeyboardAvoidingView 
          style={styles.content}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Animated.View style={{ 
            opacity: fadeAnim,
            transform: [{ translateX: slideAnim }]
          }}>
            {/* HEADER */}
            <Text style={styles.heading}>Welcome back ✨</Text>

            <View style={styles.inputContainer}>
              <Text style={styles.inputLabel}>Email</Text>
              <TextInput
                ref={emailInputRef}
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="rgba(255, 255, 255, 0.4)"
                value={email}
                onChangeText={handleEmailChange}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="email"
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
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
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
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.8}
            >
              {isLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator color="#fff" size="small" />
                  <Text style={[styles.submitText, styles.loadingText]}>Signing in...</Text>
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

              <TouchableOpacity
                onPress={() => navigation.navigate('/')}
                style={styles.linkButton}
                activeOpacity={0.7}
              >
                <Text style={styles.backLinkText}>
                  <Text style={styles.linkAction}>← Back to Landing</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingHorizontal: 16,
    paddingTop: 60,
  },
  heading: {
    fontSize: 24,
    fontWeight: '600',
    fontFamily: 'Montserrat_700Bold',
    color: '#fff',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 20,
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
    minHeight: TOUCH_TARGETS.LARGE_SIZE,
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
    paddingRight: 60,
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    top: '50%',
    transform: [{ translateY: -22 }],
    width: TOUCH_TARGETS.MIN_SIZE,
    height: TOUCH_TARGETS.MIN_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: '#9333EA',
    minHeight: TOUCH_TARGETS.LARGE_SIZE,
    paddingVertical: 16,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    marginBottom: 20,
    shadowColor: '#9333EA',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.5,
    shadowOpacity: 0,
    elevation: 0,
  },
  submitText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  linksContainer: {
    marginTop: 32,
    alignItems: 'center',
    gap: 8,
  },
  linkButton: {
    minHeight: TOUCH_TARGETS.LARGE_SIZE,
    paddingVertical: 16,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  linkText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 24,
  },
  linkAction: {
    color: '#9333EA',
    fontWeight: '700',
    fontSize: 18,
  },
  forgotPasswordText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 17,
    fontWeight: '600',
    textDecorationLine: 'underline',
    lineHeight: 24,
  },
  backLinkText: {
    fontSize: 17,
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 24,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    marginLeft: 10,
  },
});