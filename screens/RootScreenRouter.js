import React, { useContext } from 'react';
import { UserContext } from '../context/UserContext';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';

export default function RootScreenRouter() {
    const { user } = useContext(UserContext);
    return user ? <HomeScreen /> : <LoginScreen />;
}