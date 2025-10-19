import React, { useContext, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { Bell } from 'react-native-feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';
import { safeAuthApiCall } from '../utils/safeApiCall';
import PushNotificationService from '../services/PushNotificationService';
import { logger } from '../utils/logger';
import VoxxyLogo from '../assets/header.svg';

const HEADER_HEIGHT = 60;

export default function ProfileSnippet() {
  const userContext = useContext(UserContext);
  const { user } = userContext;
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [localUnreadCount, setLocalUnreadCount] = useState(0);

  // Use only the safe area inset without extra padding
  const HEADER_PADDING_TOP = insets.top;
  
  // Fetch unread notification count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      if (!user?.token) {
        setLocalUnreadCount(0);
        return;
      }
      
      try {
        const notifications = await safeAuthApiCall(
          `${API_URL}/notifications`, 
          user.token, 
          { method: 'GET' }
        );
        const unreadCount = (notifications || []).filter(n => !n.read).length;
        setLocalUnreadCount(unreadCount);
        // Sync system badge with actual unread count
        await PushNotificationService.setBadgeCount(unreadCount);
      } catch (error) {
        logger.debug('Could not fetch notification count:', error.message);
        setLocalUnreadCount(0);
        // Clear badge on error
        await PushNotificationService.clearBadge();
      }
    };

    // Add a small delay to prevent crashes during rapid navigation
    const timeoutId = setTimeout(() => {
      fetchUnreadCount();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [user?.token]);

  // Refresh notification count when screen comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      const fetchUnreadCount = async () => {
        if (!user?.token) {
          setLocalUnreadCount(0);
          return;
        }

        try {
          const notifications = await safeAuthApiCall(
            `${API_URL}/notifications`,
            user.token,
            { method: 'GET' }
          );
          const unreadCount = (notifications || []).filter(n => !n.read).length;
          setLocalUnreadCount(unreadCount);
          // Sync system badge with actual unread count
          await PushNotificationService.setBadgeCount(unreadCount);
        } catch (error) {
          logger.debug('Could not refresh notification count:', error.message);
        }
      };

      fetchUnreadCount();
    }, [user?.token])
  );

  if (!user) return null;

  return (
    <View style={[styles.wrapper, { paddingTop: HEADER_PADDING_TOP }]}>
      <View style={styles.container}>
        {/* Left: Voxxy Logo */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
          style={styles.logoContainer}
        >
          <View style={styles.logoWrapper}>
            <VoxxyLogo width={120} height={36} />
          </View>
        </TouchableOpacity>

        {/* Right: Notifications Button */}
        <TouchableOpacity
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
          style={styles.notificationsButton}
        >
          <Bell stroke="#fff" width={22} height={22} strokeWidth={2} />
          {localUnreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {localUnreadCount > 99 ? '99+' : localUnreadCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Glowing border line */}
      <LinearGradient
        colors={['#B954EC', '#667eea', '#B954EC']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.glowingBorder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: '#201925',
  },

  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: HEADER_HEIGHT,
    paddingHorizontal: 20,
    backgroundColor: '#201925',
  },

  glowingBorder: {
    height: 2,
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 8,
  },

  logoContainer: {
    flex: 1,
    justifyContent: 'center',
  },

  logoWrapper: {
    shadowColor: '#9f2fce',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 12,
  },

  notificationsButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    position: 'relative',
  },

  notificationBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#ef4444',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#201925',
  },

  notificationBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});