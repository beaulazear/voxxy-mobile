// screens/RateLimitScreen.js
import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';

const RateLimitScreen = () => {
  const {
    rateLimitBackoffTime,
    clearRateLimit,
    isRateLimited,
    autoLoginError,
    retryAutoLogin,
    loading
  } = useContext(UserContext);
  const [countdown, setCountdown] = useState(rateLimitBackoffTime);
  const navigation = useNavigation();

  useEffect(() => {
    setCountdown(rateLimitBackoffTime);
  }, [rateLimitBackoffTime]);

  useEffect(() => {
    if (isRateLimited && countdown > 0) {
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [countdown, isRateLimited]);

  const handleClearAndLogin = () => {
    Alert.alert(
      'Clear Session',
      'This will clear your current session and allow you to sign in fresh. Continue?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Clear & Sign In',
          onPress: async () => {
            await clearRateLimit();
            navigation.replace('Login');
          }
        }
      ]
    );
  };

  const handleRetry = async () => {
    await retryAutoLogin();
  };

  // Determine error type and show appropriate UI
  const errorType = autoLoginError?.type || 'rate_limit';
  const isServerError = errorType === 'server_error';

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isServerError ? '⚠️' : '⏱️'}</Text>
        <Text style={styles.title}>
          {isServerError ? 'Connection Error' : 'Rate Limit Reached'}
        </Text>
        <Text style={styles.message}>
          {autoLoginError?.message || 'Unable to sign in automatically. Please try again.'}
        </Text>

        {autoLoginError?.details && (
          <Text style={styles.errorDetails}>
            Error {autoLoginError.status}: {autoLoginError.details}
          </Text>
        )}

        {isRateLimited && countdown > 0 && (
          <View style={styles.countdownContainer}>
            <Text style={styles.countdownLabel}>Retry available in:</Text>
            <Text style={styles.countdown}>{countdown}s</Text>
          </View>
        )}

        {isServerError && (
          <TouchableOpacity
            style={[styles.clearButton, styles.retryButton]}
            onPress={handleRetry}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.clearButtonText}>Retry Connection</Text>
            )}
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={[styles.clearButton, isServerError && styles.secondaryButton]}
          onPress={handleClearAndLogin}
          disabled={loading}
        >
          <Text style={styles.clearButtonText}>
            {isServerError ? 'Sign In Fresh' : 'Clear & Sign In Now'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.hint}>
          {isServerError
            ? 'There may be a temporary server issue. Try retrying or signing in fresh.'
            : 'This usually happens during development testing. Clearing will remove your stored session.'}
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#201925',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  icon: {
    fontSize: 64,
    marginBottom: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
    fontFamily: 'Montserrat_700Bold',
  },
  message: {
    fontSize: 16,
    color: '#d4c5d8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
    fontFamily: 'Montserrat_400Regular',
  },
  countdownContainer: {
    backgroundColor: '#2d1f2a',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
    borderWidth: 1,
    borderColor: '#8e44ad',
  },
  countdownLabel: {
    fontSize: 14,
    color: '#d4c5d8',
    marginBottom: 8,
    fontFamily: 'Montserrat_500Medium',
  },
  countdown: {
    fontSize: 48,
    fontWeight: '700',
    color: '#8e44ad',
    fontFamily: 'Montserrat_700Bold',
  },
  clearButton: {
    backgroundColor: '#8e44ad',
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    marginBottom: 16,
  },
  clearButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    fontFamily: 'Montserrat_600SemiBold',
  },
  hint: {
    fontSize: 12,
    color: '#8d7991',
    textAlign: 'center',
    fontStyle: 'italic',
    fontFamily: 'Montserrat_400Regular',
  },
  errorDetails: {
    fontSize: 12,
    color: '#ff6b6b',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 16,
    fontFamily: 'Montserrat_400Regular',
    backgroundColor: '#2d1f2a',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  retryButton: {
    backgroundColor: '#27ae60',
  },
  secondaryButton: {
    backgroundColor: '#2d1f2a',
    borderWidth: 1,
    borderColor: '#8e44ad',
  },
});

export default RateLimitScreen;
