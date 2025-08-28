# Understanding AsyncStorage in Your Voxxy App

## What is AsyncStorage?

AsyncStorage is React Native's built-in local storage solution - think of it as the mobile equivalent of localStorage in web browsers. It's a **client-side only** storage system that persists data on the user's device, completely separate from your Rails backend.

## How AsyncStorage Works with Your Rails API

Your app uses a **hybrid approach**:

### 1. **Rails API (Server-Side)**
- **Primary data source** - All user data, activities, preferences
- **Source of truth** - The authoritative data lives here
- **Persistent** - Data survives app reinstalls if user logs in again
- **Shared** - Data accessible from any device when logged in

### 2. **AsyncStorage (Client-Side)**
- **Local cache** - Temporary storage on the device
- **Session data** - JWT tokens, user preferences
- **UI state** - Remember user choices, consent status
- **Performance** - Reduce API calls for frequently accessed data

## Current AsyncStorage Usage in Your App

Here's what your app currently stores locally:

```javascript
// 1. Authentication Token (UserContext.js)
await AsyncStorage.setItem('jwt', token);
// Keeps user logged in between app sessions

// 2. Privacy Consent (PrivacyConsentModal.js)
await AsyncStorage.setItem('privacyConsentDate', new Date().toISOString());
await AsyncStorage.setItem('privacyConsentVersion', '1.0');
// Remembers that user accepted privacy policy

// 3. Rate Limiting (UserContext.js)
await AsyncStorage.setItem('lastRateLimit', Date.now().toString());
// Prevents hammering the API after rate limit
```

## How the Data Flow Works

```
App Launch → Check AsyncStorage → Has JWT? → Yes → Fetch user from Rails API
                                      ↓
                                     No → Show login screen
                                      ↓
                              User logs in → Rails API returns JWT
                                      ↓
                              Store JWT in AsyncStorage
                                      ↓
                              Future requests use this JWT
```

## Key Differences from Web Development

| Aspect | Web (localStorage) | React Native (AsyncStorage) |
|--------|-------------------|----------------------------|
| **Size Limit** | ~5-10MB | No hard limit (device dependent) |
| **Data Type** | Strings only | Strings only (use JSON.stringify) |
| **Synchronous** | Yes | No - Always async/await |
| **Persistence** | Until cleared | Survives app closes, not uninstalls |
| **Security** | Accessible via browser | Sandboxed per app |

## Common Use Cases in Mobile Apps

### ✅ Good for AsyncStorage:
- **JWT/Auth tokens** - Keep users logged in
- **User preferences** - Theme, language, notification settings
- **Onboarding status** - Has user seen tutorial?
- **Draft content** - Save form data temporarily
- **Cache API responses** - Reduce network calls
- **Privacy consent** - Remember user accepted terms

### ❌ NOT for AsyncStorage:
- **Sensitive data** - Use encrypted storage libraries
- **Large datasets** - Use SQLite or Realm
- **Critical business data** - Always sync with backend
- **Shared data** - Can't access from other devices

## Code Examples for Your App

### Storing User Preferences
```javascript
// Save a user preference locally
const savePreference = async (key, value) => {
  try {
    await AsyncStorage.setItem(
      `preference_${key}`,
      JSON.stringify(value)
    );
  } catch (error) {
    console.error('Failed to save preference:', error);
  }
};

// Usage
await savePreference('notifications', true);
await savePreference('location_sharing', false);
```

### Caching API Responses
```javascript
// Cache activities for offline viewing
const cacheActivities = async (activities) => {
  try {
    await AsyncStorage.setItem(
      'cached_activities',
      JSON.stringify({
        data: activities,
        timestamp: Date.now()
      })
    );
  } catch (error) {
    console.error('Failed to cache activities:', error);
  }
};

// Read from cache with expiration
const getCachedActivities = async () => {
  try {
    const cached = await AsyncStorage.getItem('cached_activities');
    if (!cached) return null;
    
    const { data, timestamp } = JSON.parse(cached);
    const ONE_HOUR = 60 * 60 * 1000;
    
    // Return cache if less than 1 hour old
    if (Date.now() - timestamp < ONE_HOUR) {
      return data;
    }
    return null;
  } catch (error) {
    return null;
  }
};
```

### Managing Multiple Values
```javascript
// Save multiple related items
const saveUserSession = async (userData) => {
  try {
    const multiSet = [
      ['jwt', userData.token],
      ['userId', userData.id.toString()],
      ['userName', userData.name],
      ['userEmail', userData.email]
    ];
    await AsyncStorage.multiSet(multiSet);
  } catch (error) {
    console.error('Failed to save session:', error);
  }
};

// Clear all user data on logout
const clearUserSession = async () => {
  try {
    const keys = ['jwt', 'userId', 'userName', 'userEmail'];
    await AsyncStorage.multiRemove(keys);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
};
```

## Privacy & App Store Considerations

### Important for App Store Review:
1. **AsyncStorage is considered "local storage"** - Not transmitted unless you explicitly send it
2. **Must disclose in privacy policy** if you store any user data locally
3. **Data persists until**:
   - User uninstalls app
   - User clears app data
   - You programmatically clear it

### Best Practices for Privacy:
```javascript
// Always provide a way to clear all local data
const clearAllUserData = async () => {
  try {
    // Get all keys
    const keys = await AsyncStorage.getAllKeys();
    
    // Filter user-specific keys (keep app settings)
    const userKeys = keys.filter(key => 
      key.startsWith('user_') || 
      key === 'jwt' || 
      key === 'privacyConsentDate'
    );
    
    // Remove them
    await AsyncStorage.multiRemove(userKeys);
  } catch (error) {
    console.error('Failed to clear user data:', error);
  }
};
```

## Architecture Recommendation for Voxxy

### Current Flow (Good ✅):
1. **Authentication**: JWT in AsyncStorage, user data from API
2. **Activities**: Always fetch from API (source of truth)
3. **Preferences**: Store locally + sync to backend

### Suggested Improvements:
1. **Add offline support**:
```javascript
// Try API first, fall back to cache
const getActivities = async () => {
  try {
    const activities = await fetchFromAPI();
    await cacheActivities(activities);
    return activities;
  } catch (error) {
    // If offline, use cache
    const cached = await getCachedActivities();
    if (cached) {
      return { ...cached, isFromCache: true };
    }
    throw error;
  }
};
```

2. **Implement secure storage for sensitive data**:
```javascript
import * as SecureStore from 'expo-secure-store';

// Use SecureStore for JWT instead of AsyncStorage
await SecureStore.setItemAsync('jwt', token);
const token = await SecureStore.getItemAsync('jwt');
```

3. **Add data expiration**:
```javascript
const setWithExpiry = async (key, value, ttl) => {
  const item = {
    value: value,
    expiry: Date.now() + ttl
  };
  await AsyncStorage.setItem(key, JSON.stringify(item));
};

const getWithExpiry = async (key) => {
  const itemStr = await AsyncStorage.getItem(key);
  if (!itemStr) return null;
  
  const item = JSON.parse(itemStr);
  if (Date.now() > item.expiry) {
    await AsyncStorage.removeItem(key);
    return null;
  }
  return item.value;
};
```

## Summary

AsyncStorage in your React Native app is like a browser's localStorage - it's a local, device-only storage that complements your Rails API backend. Your Rails API remains the primary source of truth for all user data, while AsyncStorage handles:
- Keeping users logged in (JWT storage)
- Remembering user preferences
- Caching data for performance
- Storing UI state and consent records

Think of it as a performance optimization and user experience enhancement layer, not a replacement for your backend database. All critical data should still be synced with your Rails API.