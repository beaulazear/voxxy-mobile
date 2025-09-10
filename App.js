// App.js
import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider, UserContext } from './context/UserContext';
import * as Notifications from 'expo-notifications';
import { logger } from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import VerificationCodeScreen from './screens/VerificationCodeScreen';
import FAQScreen from './screens/FAQScreen';
import ProfileScreen from './screens/ProfileScreen';
import LandingScreen from './screens/LandingScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import FavoritesScreen from './screens/FavoritesScreen';
// TripDashboardScreen removed - now integrated as modal in HomeScreen
import TryVoxxScreen from './screens/TryVoxxScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SuspendedScreen from './screens/SuspendedScreen';
import EULAModal from './components/EULAModal';
import PrivacyConsentModal from './components/PrivacyConsentModal';

import { InvitationNotificationProvider } from './services/InvitationNotificationService';

import { ActivityIndicator, View } from 'react-native';

import {
  useFonts,
  Montserrat_400Regular,
  Montserrat_500Medium,
  Montserrat_600SemiBold,
  Montserrat_700Bold
} from '@expo-google-fonts/montserrat';

const Stack = createNativeStackNavigator();

// Create a global navigation reference
export const navigationRef = React.createRef();

export function navigate(name, params) {
  navigationRef.current?.navigate(name, params);
}

const AppNavigator = () => {
  const { user, loading, moderationStatus, refreshUser, needsPolicyAcceptance } = useContext(UserContext);
  const [showPrivacyConsent, setShowPrivacyConsent] = useState(false);
  const [showEULA, setShowEULA] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  // Check if privacy consent and EULA have been accepted
  useEffect(() => {
    const checkPolicies = async () => {
      // Only check for authenticated users with a valid token
      if (user && user.token) {
        // Check if we have user-specific policy acceptance
        const userPolicyKey = `user_${user.id}_policies_accepted`;
        const userPoliciesAccepted = await AsyncStorage.getItem(userPolicyKey);
        
        // If no user-specific policy acceptance, this is a new user
        if (!userPoliciesAccepted) {
          // Show privacy consent first for new users
          setShowPrivacyConsent(true);
          setPoliciesLoading(false);
          return;
        }
        
        // Check privacy consent first
        const privacyConsentDate = await AsyncStorage.getItem('privacyConsentDate');
        const privacyConsentVersion = await AsyncStorage.getItem('privacyConsentVersion');
        
        if (!privacyConsentDate || privacyConsentVersion !== '1.0.0') {
          // Show privacy consent first
          setShowPrivacyConsent(true);
          setPoliciesLoading(false);
          return;
        }
        
        // If privacy is accepted, check EULA
        // First check if backend says user needs to accept policies
        if (needsPolicyAcceptance) {
          setShowEULA(true);
          setPoliciesLoading(false);
          return;
        }
        
        // Also check local storage as fallback
        const eulaAccepted = await AsyncStorage.getItem('eulaAcceptedDate');
        const eulaVersion = await AsyncStorage.getItem('eulaVersion');
        const policiesAccepted = await AsyncStorage.getItem('policies_accepted');
        
        // Check if EULA needs to be shown (not accepted or old version)
        if (!eulaAccepted || eulaVersion !== '1.0.0') {
          // Also check new policies format
          if (!policiesAccepted) {
            setShowEULA(true);
          } else {
            // Check if policies need to be synced
            const policies = JSON.parse(policiesAccepted);
            if (policies.pending_sync && !policies.synced_with_backend) {
              // Policies were accepted locally but not synced, don't show modal
              setShowEULA(false);
            }
          }
        }
      }
      setPoliciesLoading(false);
    };
    
    checkPolicies();
  }, [user, user?.token, user?.id]);

  // Handle notification responses for navigation
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const { notification } = response;
      const data = notification.request.content.data;

      // Delay navigation slightly to ensure context is ready
      setTimeout(() => {
        // Handle different notification types
        if (data?.type === 'moderation_warning' || data?.type === 'suspension' || data?.type === 'ban') {
          // Refresh user context to get latest moderation status
          if (user?.token) {
            refreshUser();
          }
          // Navigate to home which will show suspended screen if needed
          navigate('/');
        } else if (data?.type === 'activity_invite' && data?.activityId) {
          navigate('ActivityDetails', { activityId: data.activityId, forceRefresh: true });
        } else if (data?.type === 'activity_update' && data?.activityId) {
          navigate('ActivityDetails', { activityId: data.activityId, forceRefresh: true });
        } else if (data?.type === 'comment' && data?.activityId) {
          navigate('ActivityDetails', { activityId: data.activityId, forceRefresh: true });
        } else if (data?.type === 'general') {
          navigate('/'); // Navigate to home
        }
      }, 500); // Give context time to load
    });

    return () => subscription.remove();
  }, []);

  if (loading || policiesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  const handlePrivacyAccept = async () => {
    // Privacy accepted, now show EULA
    setShowPrivacyConsent(false);
    // Check if EULA needs to be shown
    const eulaAccepted = await AsyncStorage.getItem('eulaAcceptedDate');
    const eulaVersion = await AsyncStorage.getItem('eulaVersion');
    if (!eulaAccepted || eulaVersion !== '1.0.0') {
      setShowEULA(true);
    }
  };

  const handlePrivacyDecline = async () => {
    // Log user out if they decline privacy policy
    await AsyncStorage.clear();
    setShowPrivacyConsent(false);
  };

  const handleEULAAccept = async () => {
    // Mark that this specific user has accepted policies
    if (user?.id) {
      const userPolicyKey = `user_${user.id}_policies_accepted`;
      await AsyncStorage.setItem(userPolicyKey, 'true');
    }
    setShowEULA(false);
  };

  const handleEULADecline = async () => {
    // Log user out if they decline EULA
    await AsyncStorage.clear();
    setShowEULA(false);
  };

  return (
    <>
      {showPrivacyConsent && (
        <PrivacyConsentModal
          visible={showPrivacyConsent}
          onAccept={handlePrivacyAccept}
          onDecline={handlePrivacyDecline}
          navigation={navigationRef.current}
        />
      )}
      {showEULA && (
        <EULAModal 
          visible={showEULA}
          onAccept={handleEULAAccept}
          onDecline={handleEULADecline}
        />
      )}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen
          name="/"
          component={
            user 
              ? (moderationStatus === 'suspended' || moderationStatus === 'banned' 
                  ? SuspendedScreen 
                  : HomeScreen)
              : LandingScreen
          }
          key={user ? (moderationStatus ? 'suspended' : 'home') : 'login'}
        />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
      <Stack.Screen name="TryVoxxy" component={TryVoxxScreen} />
      <Stack.Screen
        name="ActivityDetails"
        component={ActivityDetailsScreen}
        options={{ 
          headerShown: false,
          animation: 'slide_from_right',
          gestureDirection: 'horizontal'
        }}
      />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      {/* TripDashboardScreen removed - now integrated as modal in HomeScreen */}
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="AccountCreated" component={ProfileScreen} />
      </Stack.Navigator>
    </>
  );
};

export default function App() {
  // Disable console logs in production
  useEffect(() => {
    logger.disableConsoleInProduction();
  }, []);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_500Medium,
    Montserrat_600SemiBold,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <UserProvider>
        <InvitationNotificationProvider>
          <NavigationContainer ref={navigationRef}>
            <AppNavigator />
          </NavigationContainer>
        </InvitationNotificationProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}