// context/UserContext.js
import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true); // add loading flag

  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = await AsyncStorage.getItem('jwt');
        if (!token) return setLoading(false);

        const res = await fetch(`${API_URL}/me`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (res.ok) {
          const userData = await res.json();
          console.log(userData, token)
          setUser({ ...userData, token }); // ✅ reattach the token
        } else {
          await AsyncStorage.removeItem('jwt'); // invalid token
        }
      } catch (err) {
        console.error('Failed to auto-login:', err);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  return (
    <UserContext.Provider value={{ user, setUser, loading }}>
      {children}
    </UserContext.Provider>
  );
};