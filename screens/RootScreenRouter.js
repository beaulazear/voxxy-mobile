import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import VerificationCodeScreen from './VerificationCodeScreen';

export default function RootScreenRouter() {
    const { user } = useContext(UserContext);
    
    if (!user) {
        return <LoginScreen />;
    }
    
    // If user is logged in but not verified, show verification screen
    if (user && !user.confirmed_at) {
        return <VerificationCodeScreen />;
    }
    
    // User is logged in and verified
    return <HomeScreen />;
}