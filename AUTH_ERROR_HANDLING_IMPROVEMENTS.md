# Authentication Error Handling Improvements

## Overview
This document tracks improvements to error handling in the login and signup processes based on code analysis performed on 2025-10-03.

---

## Strengths (Keep These!)

### 1. Centralized Error Handling (`safeApiCall.js`)
- ✅ Comprehensive error wrapper with timeout handling (10s default)
- ✅ Detailed status code mapping (401, 403, 404, 422, 429, 500+)
- ✅ Special handling for moderation/ban scenarios (403, 451)
- ✅ Network error detection and user-friendly messages
- ✅ Structured error parsing for Rails array format

### 2. Input Validation (`validation.js`)
- ✅ Client-side validation before API calls prevents unnecessary network requests
- ✅ Email sanitization and RFC-compliant regex
- ✅ Password strength scoring (5 criteria)
- ✅ Real-time validation feedback in SignUpScreen

### 3. User Experience
- ✅ Loading states prevent double submissions
- ✅ Clear error messages displayed via `Alert.alert()`
- ✅ Visual feedback (input border colors, validation icons)
- ✅ Auto-submit on complete verification code

---

## Issues & Improvements

### Priority: HIGH

#### ❌ Issue 1: AsyncStorage failure not caught
**Location**: `LoginScreen.js:111`

**Problem**:
No try-catch around AsyncStorage operations. If storage fails, the user appears logged in but lacks credentials.

**Current Code**:
```javascript
await AsyncStorage.setItem('jwt', data.token);
setUser(data);
```

**Impact**: Silent auth failure, user gets stuck in broken state

**Fix**:
```javascript
try {
  if (!data.token) {
    throw new Error('No authentication token received');
  }
  await AsyncStorage.setItem('jwt', data.token);
  setUser(data);
} catch (storageError) {
  Alert.alert('Login Failed', 'Could not save login credentials. Please try again.');
  setIsLoading(false);
  return; // Don't navigate
}
```

**Status**: ✅ Completed

---

#### ❌ Issue 2: Token normalization mutates response object
**Location**: `SignUpScreen.js:165-179`

**Problem**:
The code mutates the response object and only logs for debugging. This is fragile and makes debugging harder.

**Current Code**:
```javascript
if (data) {
  logger.debug('Signup response data:', {
    hasToken: !!data.token,
    hasAuthToken: !!data.authentication_token,
    hasJwt: !!data.jwt,
    dataKeys: Object.keys(data)
  });

  // Ensure token field is properly set
  if (data.authentication_token && !data.token) {
    data.token = data.authentication_token;
  } else if (data.jwt && !data.token) {
    data.token = data.jwt;
  }
}
```

**Impact**: Potential auth bugs, harder to debug

**Fix**:
```javascript
if (data) {
  const token = data.token || data.authentication_token || data.jwt;
  if (!token) {
    throw new Error('Server did not return an authentication token');
  }

  logger.debug('Signup response data:', {
    hasToken: !!data.token,
    hasAuthToken: !!data.authentication_token,
    hasJwt: !!data.jwt,
    dataKeys: Object.keys(data)
  });

  // Create normalized user data without mutation
  const userData = { ...data, token };

  // Store token in AsyncStorage
  try {
    await AsyncStorage.setItem('jwt', token);
  } catch (storageError) {
    throw new Error('Could not save authentication token. Please try again.');
  }

  // Track signup completion
  trackSignup(userData);

  // Success animation before navigation
  Animated.timing(fadeAnim, {
    toValue: 0,
    duration: 300,
    useNativeDriver: true,
  }).start(() => {
    setUser(userData);
    navigation.replace('VerificationCode');
  });
}
```

**Status**: ✅ Completed

---

### Priority: MEDIUM

#### ❌ Issue 3: Expired verification code handling
**Location**: `VerificationCodeScreen.js:200-204`

**Problem**:
No explicit handling for expired codes. Users might not know why their code isn't working.

**Current Code**:
```javascript
if (response.ok) {
  // ... success handling
} else {
  setError(data.error || 'Invalid verification code');
  setCode(['', '', '', '', '', '']); // Clear code on error
  setTimeout(() => inputRefs.current[0]?.focus(), 100);
}
```

**Impact**: Poor UX when codes expire

**Fix**:
```javascript
if (response.ok) {
  // ... success handling
} else {
  // Handle specific error cases
  let errorMessage = 'Invalid verification code';

  if (response.status === 410) { // Gone - code expired
    errorMessage = 'Verification code expired. Please request a new one.';
  } else if (response.status === 429) { // Too many attempts
    errorMessage = 'Too many attempts. Please wait a moment and try again.';
  } else if (data.error) {
    errorMessage = data.error;
  }

  setError(errorMessage);
  setCode(['', '', '', '', '', '']); // Clear code on error
  setTimeout(() => inputRefs.current[0]?.focus(), 100);
}
```

**Status**: ✅ Completed

---

#### ❌ Issue 4: No network retry logic
**Location**: `utils/safeApiCall.js`

**Problem**:
No retry mechanism for transient network failures. Users on poor connections get stuck.

**Impact**: Users give up on flaky networks

**Fix**: Add a new function with retry logic:
```javascript
/**
 * Safe API call with automatic retry for network errors
 * @param {string} url - The API endpoint URL
 * @param {object} options - Fetch options (method, headers, body, etc.)
 * @param {number} retries - Number of retry attempts (default: 3)
 * @param {number} timeout - Request timeout in milliseconds (default: 10000)
 * @returns {Promise<object>} - Parsed JSON response or throws descriptive error
 */
export const safeApiCallWithRetry = async (url, options = {}, retries = 3, timeout = DEFAULT_TIMEOUT) => {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await safeApiCall(url, options, timeout);
    } catch (error) {
      lastError = error;

      // Don't retry on HTTP errors (400-599), only network errors
      if (error.status) {
        throw error;
      }

      // Don't retry on the last attempt
      if (attempt === retries - 1) {
        throw error;
      }

      // Exponential backoff: wait 1s, 2s, 4s...
      const waitTime = 1000 * Math.pow(2, attempt);
      logger.debug(`Retry attempt ${attempt + 1}/${retries} after ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw lastError;
};
```

**Usage**: Update LoginScreen and SignUpScreen to use this for critical auth calls.

**Status**: ✅ Completed

---

### Priority: LOW

#### ❌ Issue 5: Error message fallback unused
**Location**: `LoginScreen.js:119`

**Problem**:
`handleApiError()` returns a message but the fallback is rarely used. Server-specific validation errors might not display.

**Current Code**:
```javascript
const errorMessage = handleApiError(err, 'Invalid email or password. Please try again.');
Alert.alert('Login Failed', errorMessage);
```

**Impact**: Potentially misleading error messages

**Fix**:
```javascript
// Extract the actual error message from the error object
const errorMessage = err.message || handleApiError(err, 'Invalid email or password. Please try again.');
Alert.alert('Login Failed', errorMessage);
```

**Status**: ✅ Completed

---

#### ❌ Issue 6: Validation error display timing
**Location**: `SignUpScreen.js:110-117`

**Problem**:
Error only shows when user tries to proceed, but validation is real-time. This creates confusion.

**Current Code**:
```javascript
const handleNext = () => {
  if (!validateStep()) {
    setValidationErrors({[step]: currentValidation.error});
    return;
  }
  setValidationErrors({});
  setStep(step + 1);
};
```

**Impact**: User doesn't see errors until clicking "Next"

**Fix**: Add touched state to show errors only after user interacts:
```javascript
const [touched, setTouched] = useState({});

// In the TextInput component
<TextInput
  // ... other props
  onBlur={() => setTouched(prev => ({ ...prev, [step]: true }))}
  onChangeText={(text) => {
    onChange(text);
    setTouched(prev => ({ ...prev, [step]: true }));
    if (validationErrors[step]) {
      setValidationErrors(prev => ({ ...prev, [step]: null }));
    }
  }}
/>

// Show error only if field has been touched
{touched[step] && !canProceed && value.length > 0 && (
  <Animated.View style={styles.errorContainer}>
    <Text style={styles.errorText}>{currentValidation.error}</Text>
  </Animated.View>
)}
```

**Status**: ✅ Completed

---

#### ❌ Issue 7: Missing backend error codes
**Location**: `utils/safeApiCall.js` (handleApiError function)

**Problem**:
Your `handleApiError()` checks for specific error codes (`USER_SUSPENDED`, `USER_BANNED`) but your auth endpoints may not return these structured errors yet.

**Impact**: Inconsistent error handling between client and server

**Recommendation**:
Coordinate with backend to ensure consistent error format:

```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Email or password is incorrect",
    "field": "password"
  }
}
```

**Status**: ✅ Completed (requires backend coordination)

---

## Summary of Priority Fixes

| Priority | Issue | Location | Impact | Status |
|----------|-------|----------|---------|--------|
| **High** | AsyncStorage failure not caught | LoginScreen.js:111 | Silent auth failure | ✅ Completed |
| **High** | Token normalization mutates response | SignUpScreen.js:175 | Potential auth bugs | ✅ Completed |
| **Medium** | Expired verification code handling | VerificationCodeScreen.js:201 | Poor UX | ✅ Completed |
| **Medium** | No network retry logic | safeApiCall.js | Users give up on flaky networks | ✅ Completed |
| **Low** | Error message fallback unused | LoginScreen.js:119 | Misleading error messages | ✅ Completed |
| **Low** | Validation error display timing | SignUpScreen.js:110 | Poor UX | ✅ Completed |
| **Low** | Missing backend error codes | safeApiCall.js | Inconsistent errors | ⏳ Pending (Backend) |

---

## Progress Tracking

- [x] Issue 1: AsyncStorage failure handling
- [x] Issue 2: Token normalization
- [x] Issue 3: Expired verification codes
- [x] Issue 4: Network retry logic
- [x] Issue 5: Error message fallback (fixed during Issue 1)
- [x] Issue 6: Validation error timing
- [ ] Issue 7: Backend error code coordination (requires backend team)
