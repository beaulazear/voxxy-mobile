# Voxxy Favorite Share Links - Frontend Implementation Guide

## ⚠️ Important: Domain Configuration

**Staging vs Production domains:**
- **Staging backend**: `voxxyai.com` (for testing)
- **Production backend**: `heyvoxxy.com` (final deployment)

The code examples use `__DEV__` to automatically switch between staging and production URLs. Deep linking will only work fully in production when using `heyvoxxy.com` since that's what's configured in `app.config.js`.

## Overview
This guide will help you implement shareable links for favorite restaurants in the Voxxy mobile app. The backend is already set up to handle these links and display beautiful web previews.

## Backend Share Link Format

The Rails backend expects share links in this format:

**Staging (for testing):**
```
https://www.voxxyai.com/share/favorite/{id}?name=...&address=...&lat=...&lng=...
```

**Production (when ready):**
```
https://www.heyvoxxy.com/share/favorite/{id}?name=...&address=...&lat=...&lng=...
```

## Frontend Implementation Steps

### 1. Add Share Functionality to Favorites

Add a share button/action to your favorite restaurants UI. This could be in:
- The favorite restaurant detail screen
- A long-press menu on favorite items
- A share icon in the favorites list

### 2. Generate Share Links

Create a utility function to generate share links:

```javascript
// utils/shareUtils.js
import * as Sharing from 'expo-sharing';
import * as Clipboard from 'expo-clipboard';

/**
 * Generate a shareable link for a favorite restaurant
 * @param {Object} favorite - The favorite restaurant object
 * @param {string} favorite.id - The UserActivity ID
 * @param {string} favorite.title - Restaurant name
 * @param {string} favorite.address - Restaurant address
 * @param {number} favorite.latitude - Latitude coordinate
 * @param {number} favorite.longitude - Longitude coordinate
 * @returns {string} The shareable URL
 */
export const generateFavoriteShareLink = (favorite) => {
  // Use environment-based URL
  // For staging: https://www.voxxyai.com
  // For production: https://www.heyvoxxy.com
  const baseUrl = __DEV__
    ? 'https://www.voxxyai.com/share/favorite'  // Staging
    : 'https://www.heyvoxxy.com/share/favorite'; // Production

  const params = new URLSearchParams({
    name: favorite.title || favorite.name || '',
    address: favorite.address || '',
    lat: favorite.latitude || '',
    lng: favorite.longitude || ''
  });

  return `${baseUrl}/${favorite.id}?${params.toString()}`;
};

/**
 * Share a favorite restaurant
 * @param {Object} favorite - The favorite restaurant object
 */
export const shareFavorite = async (favorite) => {
  const shareUrl = generateFavoriteShareLink(favorite);
  const message = `Check out ${favorite.title || favorite.name} on Voxxy!`;

  try {
    // Check if sharing is available
    const isAvailable = await Sharing.isAvailableAsync();

    if (isAvailable) {
      await Sharing.shareAsync(shareUrl, {
        dialogTitle: message,
        mimeType: 'text/plain'
      });
    } else {
      // Fallback to clipboard if sharing not available
      await Clipboard.setStringAsync(shareUrl);
      alert('Link copied to clipboard!');
    }
  } catch (error) {
    console.error('Error sharing favorite:', error);
    // Fallback to clipboard
    try {
      await Clipboard.setStringAsync(shareUrl);
      alert('Link copied to clipboard!');
    } catch (clipboardError) {
      console.error('Error copying to clipboard:', clipboardError);
      alert('Unable to share at this time');
    }
  }
};
```

### 3. Add Share Button to UI

Example integration in a favorite detail screen:

```javascript
// screens/FavoriteDetailScreen.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share2 } from 'lucide-react-native'; // or your icon library
import { shareFavorite } from '../utils/shareUtils';

const FavoriteDetailScreen = ({ route }) => {
  const { favorite } = route.params;

  const handleShare = async () => {
    await shareFavorite(favorite);
  };

  return (
    <View style={styles.container}>
      {/* Your existing favorite detail UI */}

      <TouchableOpacity
        style={styles.shareButton}
        onPress={handleShare}
      >
        <Share2 size={20} color="#fff" />
        <Text style={styles.shareButtonText}>Share</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  shareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#9333EA',
    padding: 14,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  shareButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default FavoriteDetailScreen;
```

### 4. Add Share Option to Favorites List

You can also add a share option to individual items in your favorites list:

```javascript
// components/FavoriteCard.js
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Share2 } from 'lucide-react-native';
import { shareFavorite } from '../utils/shareUtils';

const FavoriteCard = ({ favorite }) => {
  const handleShare = async () => {
    await shareFavorite(favorite);
  };

  return (
    <View style={styles.card}>
      {/* Your existing card content */}
      <Text style={styles.title}>{favorite.title}</Text>
      <Text style={styles.address}>{favorite.address}</Text>

      <TouchableOpacity
        style={styles.shareIcon}
        onPress={handleShare}
      >
        <Share2 size={18} color="#9333EA" />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1A1625',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    position: 'relative',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.6)',
  },
  shareIcon: {
    position: 'absolute',
    top: 16,
    right: 16,
    padding: 8,
  },
});

export default FavoriteCard;
```

### 5. Handle Deep Links (Incoming Share Links)

Update your deep link handling to receive share links when users click them:

```javascript
// App.js or navigation setup
import * as Linking from 'expo-linking';
import { useEffect } from 'react';

const App = () => {
  useEffect(() => {
    const handleDeepLink = (event) => {
      const { path, queryParams } = Linking.parse(event.url);

      // Handle favorite share links
      if (path === 'share/favorite') {
        const favoriteData = {
          id: queryParams.id || path.split('/').pop(), // Get ID from path
          name: queryParams.name,
          address: queryParams.address,
          latitude: parseFloat(queryParams.lat),
          longitude: parseFloat(queryParams.lng),
        };

        // Navigate to favorite detail or show modal
        navigation.navigate('FavoriteDetail', { favorite: favoriteData });

        // Optional: Show a toast message
        // Toast.show('Opening shared favorite...');
      }
    };

    // Handle deep links when app is already open
    const subscription = Linking.addEventListener('url', handleDeepLink);

    // Handle deep links when app opens from link
    Linking.getInitialURL().then((url) => {
      if (url) {
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Your app component
  return (
    // ...
  );
};
```

### 6. Update app.config.js (If Not Already Done)

Ensure your app.config.js has the correct deep linking configuration:

```javascript
// app.config.js
export default {
  // ... other config
  ios: {
    // ... other iOS config
    associatedDomains: [
      "applinks:heyvoxxy.com",
      "applinks:www.heyvoxxy.com"
    ],
    bundleIdentifier: "com.voxxy.app"
  },
  android: {
    // ... other Android config
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: "https",
            host: "*.heyvoxxy.com",
            pathPrefix: "/share"
          }
        ],
        category: ["BROWSABLE", "DEFAULT"]
      }
    ],
    package: "com.voxxy.app"
  },
  scheme: "voxxy"
};
```

## Example User Flow

1. **User favorites a restaurant** → Restaurant saved with coordinates and details
2. **User taps "Share" button** → Share sheet appears with link
3. **User shares via iMessage/WhatsApp** → Recipient sees rich preview with restaurant name and address
4. **Recipient taps link** →
   - If app installed: Opens directly in app
   - If app not installed: Shows beautiful web page with "Get Directions" and "Learn About Voxxy" buttons

## Testing Checklist

- [ ] Share button appears on favorite detail screen
- [ ] Tapping share opens native share sheet
- [ ] Share link includes all required parameters (name, address, lat, lng)
- [ ] Web preview displays correctly when pasted in iMessage
- [ ] Deep link opens app when installed
- [ ] Web fallback works when app not installed
- [ ] "Get Directions" button works on web preview
- [ ] Share icon appears on favorites list items (optional)

## Data Structure Requirements

Make sure your favorite objects have these fields:

```javascript
{
  id: "123",              // UserActivity ID (required for URL)
  title: "Restaurant Name", // or 'name' (required)
  address: "123 Main St",  // Full address (required for preview)
  latitude: 40.7128,       // Number (optional but recommended)
  longitude: -74.0060,     // Number (optional but recommended)
  // ... other fields like description, price_range, etc.
}
```

## Integration with Existing Code

Look for where you're already handling activities share (likely in `ActivityDetailsPage.js` or similar). You can follow the same pattern but use the `shareFavorite` function instead.

Example from your existing final plan share:
```javascript
// Similar to how you handle activity sharing
const shareUrl = generateFavoriteShareLink(favorite);
// Then use your existing modal or share logic
```

## Optional Enhancements

### Add Share Analytics
Track when users share favorites:
```javascript
export const shareFavorite = async (favorite) => {
  // ... existing share code

  // Track analytics
  await analytics.track('favorite_shared', {
    favorite_id: favorite.id,
    restaurant_name: favorite.title,
    share_method: 'native'
  });
};
```

### Add Copy Link Option
Provide an alternative to share:
```javascript
import * as Clipboard from 'expo-clipboard';

export const copyFavoriteLink = async (favorite) => {
  const shareUrl = generateFavoriteShareLink(favorite);
  await Clipboard.setStringAsync(shareUrl);
  // Show success toast/message
  Toast.show('Link copied to clipboard!');
};
```

### Add QR Code Generation
For in-person sharing:
```javascript
import QRCode from 'react-native-qrcode-svg';

const FavoriteQRCode = ({ favorite }) => {
  const shareUrl = generateFavoriteShareLink(favorite);

  return (
    <QRCode
      value={shareUrl}
      size={200}
      backgroundColor="white"
      color="black"
    />
  );
};
```

## Troubleshooting

### Share not working on iOS
- Ensure `expo-sharing` is installed: `npm install expo-sharing`
- Check iOS permissions in Info.plist

### Share not working on Android
- Verify package name matches in app.config.js
- Check Android intent filters are properly configured

### Deep links not opening app
- Verify associated domains in app.config.js
- Test with `npx uri-scheme open "voxxy://share/favorite/123?name=Test" --ios`
- Make sure app is installed on test device

### Web preview not showing image
- Verify `/icon.png` exists in Rails public folder
- Check Open Graph meta tags are properly set in backend

## Questions?

If you run into any issues during implementation, check:
1. The backend route is working:
   - Staging: `https://www.voxxyai.com/share/favorite/123?name=Test&address=123 Main St`
   - Production: `https://www.heyvoxxy.com/share/favorite/123?name=Test&address=123 Main St`
2. Your favorite objects have all required fields
3. Deep linking is properly configured in app.config.js
4. The navigation stack includes a route that can handle the favorite detail screen

Happy coding! 🎉
