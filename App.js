// App.js
import React, { useContext, useRef, useEffect, useState } from 'react';
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
// TripDashboardScreen removed - now integrated as modal in HomeScreen
import TryVoxxScreen from './screens/TryVoxxScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import EULAModal from './components/EULAModal';

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
  const { user, loading } = useContext(UserContext);
  const [showEULA, setShowEULA] = useState(false);
  const [eulaLoading, setEulaLoading] = useState(true);

  // Check if EULA has been accepted
  useEffect(() => {
    const checkEULA = async () => {
      if (user) {
        const eulaAccepted = await AsyncStorage.getItem('eulaAcceptedDate');
        const eulaVersion = await AsyncStorage.getItem('eulaVersion');
        
        // Check if EULA needs to be shown (not accepted or old version)
        if (!eulaAccepted || eulaVersion !== '1.1') {
          setShowEULA(true);
        }
      }
      setEulaLoading(false);
    };
    
    checkEULA();
  }, [user]);

  // Handle notification responses for navigation
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(async response => {
      const { notification } = response;
      const data = notification.request.content.data;

      // Delay navigation slightly to ensure context is ready
      setTimeout(() => {
        // Handle different notification types
        if (data?.type === 'activity_invite' && data?.activityId) {
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

  if (loading || eulaLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  const handleEULAAccept = () => {
    setShowEULA(false);
  };

  const handleEULADecline = async () => {
    // Log user out if they decline EULA
    await AsyncStorage.clear();
    setShowEULA(false);
    // Force reload to log out
    window.location.reload();
  };

  return (
    <>
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
          component={user ? HomeScreen : LandingScreen}
          key={user ? 'home' : 'login'}
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