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
import ActivitiesScreen from './screens/ActivitiesScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import TryVoxxScreen from './screens/TryVoxxScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SuspendedScreen from './screens/SuspendedScreen';
const WelcomeScreen = React.lazy(() => import('./screens/WelcomeScreen'));

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
  const { user, loading, moderationStatus, refreshUser } = useContext(UserContext);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [policiesLoading, setPoliciesLoading] = useState(true);

  // Check if user needs onboarding (policy acceptance)
  useEffect(() => {
    const checkOnboarding = async () => {
      // Use backend as single source of truth for policy status
      if (user && user.token && user.confirmed_at) {
        // Backend provides all_policies_accepted field
        setNeedsOnboarding(!user.all_policies_accepted);
      } else {
        setNeedsOnboarding(false);
      }
      setPoliciesLoading(false);
    };

    checkOnboarding();
  }, [user?.all_policies_accepted, user?.confirmed_at]);

  // Handle onboarding completion
  const handleOnboardingComplete = async () => {
    // Just update local state - backend is the source of truth
    setNeedsOnboarding(false);
    // Refresh user data to get updated policy status from backend
    if (refreshUser) {
      await refreshUser();
    }
  };

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

  // Determine the initial route based on user state
  const getInitialRouteName = () => {
    if (needsOnboarding) {
      return 'Welcome';
    }
    return '/';
  };

  return (
    <Stack.Navigator
      screenOptions={{ headerShown: false }}
      initialRouteName={getInitialRouteName()}
    >
      {/* Onboarding Screen */}
      <Stack.Screen name="Welcome">
        {(props) => (
          <React.Suspense fallback={
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
              <ActivityIndicator size="large" color="#8e44ad" />
            </View>
          }>
            <WelcomeScreen {...props} onComplete={needsOnboarding ? handleOnboardingComplete : undefined} />
          </React.Suspense>
        )}
      </Stack.Screen>

      {/* Main Home Screen */}
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

      {/* Authentication Screens */}
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="VerificationCode" component={VerificationCodeScreen} />
      <Stack.Screen name="TryVoxxy" component={TryVoxxScreen} />

      {/* Main App Screens */}
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
      <Stack.Screen name="Profile" component={ProfileScreen} />
      <Stack.Screen name="Activities" component={ActivitiesScreen} />
      <Stack.Screen name="Favorites" component={FavoritesScreen} />
      <Stack.Screen name="Notifications" component={NotificationsScreen} />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
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