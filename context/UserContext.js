// context/UserContext.js
import React, { createContext, useState } from 'react';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};

// This is an example from Chat GPT on how to grab your JWT token for API requests.
// const token = await AsyncStorage.getItem('jwt');

// fetch(`${API_URL}/protected`, {
//   headers: {
//     'Authorization': `Bearer ${token}`,
//     'Content-Type': 'application/json',
//   },
// });