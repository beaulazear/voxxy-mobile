// App.js
import React, { useContext, useRef, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider, UserContext } from './context/UserContext';
import * as Notifications from 'expo-notifications';
import { logger } from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import VerificationCodeScreen from './screens/VerificationCodeScreen';
import FAQScreen from './screens/FAQScreen';
import ProfileScreen from './screens/ProfileScreen';
import LandingScreen from './screens/LandingScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import TripDashboardScreen from './screens/TripDashboardScreen';
import TryVoxxScreen from './screens/TryVoxxScreen';

import { InvitationNotificationProvider } from './services/InvitationNotificationService';

import { ActivityIndicator, View } from 'react-native';

import {
  useFonts,
  Montserrat_400Regular,
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

  // Handle notification responses for navigation
  useEffect(() => {
    const subscription = Notifications.addNotificationResponseReceivedListener(response => {
      const { notification } = response;
      const data = notification.request.content.data;

      // Handle different notification types
      if (data?.type === 'activity_invite' && data?.activityId) {
        navigate('ActivityDetails', { activityId: data.activityId });
      } else if (data?.type === 'activity_update' && data?.activityId) {
        navigate('ActivityDetails', { activityId: data.activityId });
      } else if (data?.type === 'general') {
        navigate('/'); // Navigate to home
      }
    });

    return () => subscription.remove();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  return (
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
        options={{ headerShown: false }}
      />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="TripDashboardScreen" component={TripDashboardScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="AccountCreated" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  // Disable console logs in production
  useEffect(() => {
    logger.disableConsoleInProduction();
  }, []);

  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
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