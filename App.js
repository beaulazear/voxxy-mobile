// App.js
import React, { useContext, useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider, UserContext } from './context/UserContext';
import * as Notifications from 'expo-notifications';
import * as Linking from 'expo-linking';
import { logger } from './utils/logger';
import ErrorBoundary from './components/ErrorBoundary';
import AsyncStorage from '@react-native-async-storage/async-storage';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import VerificationCodeScreen from './screens/VerificationCodeScreen';
import FAQScreen from './screens/FAQScreen';
import ProfileScreen from './screens/ProfileScreen';
import SettingsScreen from './screens/SettingsScreen';
import LandingScreen from './screens/LandingScreen';
import ActivityDetailsScreen from './screens/ActivityDetailsScreen';
import ActivitiesScreen from './screens/ActivitiesScreen';
import FavoritesScreen from './screens/FavoritesScreen';
import NotificationsScreen from './screens/NotificationsScreen';
import PrivacyPolicyScreen from './screens/PrivacyPolicyScreen';
import SuspendedScreen from './screens/SuspendedScreen';
import ComingSoonScreen from './screens/ComingSoonScreen';
import ExploreScreen from './screens/ExploreScreen';
import RateLimitScreen from './screens/RateLimitScreen';
const WelcomeScreen = React.lazy(() => import('./screens/WelcomeScreen'));

import { InvitationNotificationProvider } from './services/InvitationNotificationService';

import { ActivityIndicator, View, Text, StyleSheet } from 'react-native';
import { IS_PRODUCTION, API_URL, APP_ENV_VALUE } from './config';

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
  const { user, loading, moderationStatus, refreshUser, isRateLimited, autoLoginError } = useContext(UserContext);
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

  // Handle deep links for shared favorites
  useEffect(() => {
    const handleDeepLink = (event) => {
      const { path, queryParams } = Linking.parse(event.url);

      logger.info('Deep link received:', { path, queryParams });

      // Handle share/favorite deep links
      if (path === 'share/favorite' || path?.includes('share/favorite')) {
        // Extract favorite ID from path or query params
        const favoriteId = queryParams?.id || path.split('/').pop();

        // Navigate to Favorites screen with the shared favorite
        // The FavoritesScreen can show a modal with the favorite details
        setTimeout(() => {
          navigate('Favorites', {
            sharedFavorite: {
              id: favoriteId,
              name: queryParams?.name,
              address: queryParams?.address,
              latitude: queryParams?.lat,
              longitude: queryParams?.lng,
            },
          });
        }, 500);
      }
    };

    // Handle deep links when app is already open
    const linkingSubscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep links when app opens from a link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      linkingSubscription.remove();
    };
  }, []);

  if (loading || policiesLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#201925' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  // Show error screen if there's an auto-login error and no user
  if (autoLoginError && !user) {
    return (
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="RateLimit" component={RateLimitScreen} />
        <Stack.Screen name="Login" component={LoginScreen} />
      </Stack.Navigator>
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
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        animationDuration: 200
      }}
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
      <Stack.Screen
        name="FAQ"
        component={FAQScreen}
        options={{
          animation: 'fade',
          animationDuration: 150
        }}
      />
      <Stack.Screen
        name="ComingSoon"
        component={ComingSoonScreen}
        options={{
          animation: 'fade',
          animationDuration: 150
        }}
      />
      <Stack.Screen
        name="Explore"
        component={ExploreScreen}
        options={{
          animation: 'fade',
          animationDuration: 150
        }}
      />
      <Stack.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureDirection: 'horizontal'
        }}
      />
      <Stack.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureDirection: 'horizontal'
        }}
      />
      <Stack.Screen
        name="Activities"
        component={ActivitiesScreen}
        options={{
          animation: 'fade',
          animationDuration: 150
        }}
      />
      <Stack.Screen
        name="Favorites"
        component={FavoritesScreen}
        options={{
          animation: 'fade',
          animationDuration: 150
        }}
      />
      <Stack.Screen
        name="Notifications"
        component={NotificationsScreen}
        options={{
          animation: 'slide_from_right',
          animationDuration: 250,
          gestureDirection: 'horizontal'
        }}
      />
      <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} />
      <Stack.Screen name="AccountCreated" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

// Environment Indicator Banner Component
const EnvironmentBanner = () => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!IS_PRODUCTION) {
      const timer = setTimeout(() => {
        setIsVisible(false);
      }, 3000); // Hide after 3 seconds

      return () => clearTimeout(timer);
    }
  }, []);

  if (IS_PRODUCTION || !isVisible) return null;

  return (
    <View style={styles.environmentBanner}>
      <Text style={styles.environmentText}>
        {APP_ENV_VALUE.toUpperCase()} MODE
      </Text>
      <Text style={styles.apiText}>
        API: {API_URL}
      </Text>
    </View>
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
          <View style={{ flex: 1 }}>
            <EnvironmentBanner />
            <NavigationContainer ref={navigationRef}>
              <AppNavigator />
            </NavigationContainer>
          </View>
        </InvitationNotificationProvider>
      </UserProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  environmentBanner: {
    backgroundColor: '#ff9800',
    paddingVertical: 8,
    paddingHorizontal: 12,
    paddingTop: 40, // Extra padding for status bar
    alignItems: 'center',
    zIndex: 9999,
  },
  environmentText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
    fontFamily: 'Montserrat_700Bold',
  },
  apiText: {
    color: '#fff',
    fontSize: 10,
    marginTop: 2,
    fontFamily: 'Montserrat_400Regular',
  },
});