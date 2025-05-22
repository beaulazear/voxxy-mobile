// App.js
import React, { useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { UserProvider, UserContext } from './context/UserContext';

import HomeScreen from './screens/HomeScreen';
import LoginScreen from './screens/LoginScreen';
import SignUpScreen from './screens/SignUpScreen';
import FAQScreen from './screens/FAQScreen';
import ProfileScreen from './screens/ProfileScreen';
import CustomHeader from './components/CustomHeader';

import { ActivityIndicator, View } from 'react-native';

const Stack = createNativeStackNavigator();

const AppNavigator = () => {
  const { user, loading } = useContext(UserContext);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#8e44ad" />
      </View>
    );
  }

  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen
        name="/"
        component={user ? HomeScreen : LoginScreen}
        key={user ? 'home' : 'login'} // ✅ Forces remount when user changes
      />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="FAQ" component={FAQScreen} />
      <Stack.Screen name="Profile" component={ProfileScreen} />
    </Stack.Navigator>
  );
};

export default function App() {
  return (
    <UserProvider>
      <NavigationContainer>
        <CustomHeader />
        <AppNavigator />
      </NavigationContainer>
    </UserProvider>
  );
}