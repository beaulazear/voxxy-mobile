import React, { useContext, useMemo, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../context/UserContext';
import { Settings, Users, Activity } from 'react-native-feather';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import { avatarMap, getUserDisplayImage, getAvatarSource } from '../utils/avatarManager';

const { width: screenWidth } = Dimensions.get('window');
const NAVBAR_HEIGHT = 90;
const FULL_HEIGHT = 333;
const SCROLL_THRESHOLD = 250;

export default function ProfileSnippet({ scrollY = new Animated.Value(0), onScrollToTop }) {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();
  const [isNavbarMode, setIsNavbarMode] = useState(false);

  // Listen to scroll changes to update navbar mode
  useEffect(() => {
    const listener = scrollY.addListener(({ value }) => {
      setIsNavbarMode(value > SCROLL_THRESHOLD * 0.5);
    });

    return () => {
      scrollY.removeListener(listener);
    };
  }, [scrollY]);

  const membershipDuration = useMemo(() => {
    if (!user?.created_at) return 'New member';
    
    const createdDate = new Date(user.created_at);
    const now = new Date();
    const diffInMs = now - createdDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return 'Joined today';
    if (diffInDays === 1) return '1 day on Voxxy';
    if (diffInDays < 30) return `${diffInDays} days on Voxxy`;
    if (diffInDays < 60) return '1 month on Voxxy';
    
    const months = Math.floor(diffInDays / 30);
    if (months < 12) return `${months} months on Voxxy`;
    
    const years = Math.floor(months / 12);
    return years === 1 ? '1 year on Voxxy' : `${years} years on Voxxy`;
  }, [user?.created_at]);

  // Calculate completed activities
  const completedActivities = useMemo(() => {
    const myActivities = user?.activities?.filter(a => a.completed) || [];
    const participantActivities = user?.participant_activities
      ?.filter(p => p.accepted && p.activity?.completed)
      .map(p => p.activity) || [];
    
    // Remove duplicates by activity id
    const uniqueCompleted = [...new Map([...myActivities, ...participantActivities].map(a => [a.id, a])).values()];
    return uniqueCompleted.length;
  }, [user]);

  // Count community members using the same logic as YourCommunity
  const communityCount = useMemo(() => {
    if (!user) return 0;
    
    const allUsersMap = new Map();
    
    // Process user's activities
    user.activities?.forEach(act => {
      act.participants?.forEach(p => {
        if (p.id !== user.id) {
          allUsersMap.set(p.id, true);
        }
      });
    });
    
    // Process participant activities
    user.participant_activities?.forEach(pa => {
      const { activity: act } = pa;
      const host = act.user;
      
      // Add host if not self
      if (host?.id !== user.id) {
        allUsersMap.set(host.id, true);
      }
      
      // Add other participants
      act.participants?.forEach(p => {
        if (p.id !== user.id) {
          allUsersMap.set(p.id, true);
        }
      });
    });
    
    return allUsersMap.size;
  }, [user]);

  // Get profile image or use default - matching ProfileScreen logic
  const getDisplayImage = () => {
    // Check for profile_pic_url first (uploaded image URL)
    if (user?.profile_pic_url) {
      const profilePicUrl = user.profile_pic_url.startsWith('http')
        ? user.profile_pic_url
        : `${API_URL}${user.profile_pic_url}`;
      return { uri: profilePicUrl };
    }
    
    // Check for avatar (selected preset avatar)
    if (user?.avatar) {
      // Avatar mapping for preset avatars
      // Extract filename if it's a path
      const avatarFilename = user.avatar.includes('/') 
        ? user.avatar.split('/').pop() 
        : user.avatar;
      
      if (avatarMap[avatarFilename]) {
        return avatarMap[avatarFilename];
      }
      
      // If avatar is a URL
      if (user.avatar.startsWith('http')) {
        return { uri: user.avatar };
      }
    }
    
    // Default avatar
    return require('../assets/Avatar1.jpg');
  };

  if (!user) return null;

  // Animation interpolations
  const containerHeight = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [FULL_HEIGHT, NAVBAR_HEIGHT],
    extrapolate: 'clamp',
  });

  const profilePicSize = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [64, 36],
    extrapolate: 'clamp',
  });

  const profilePicBorderRadius = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [32, 18],
    extrapolate: 'clamp',
  });

  const profilePicTranslateX = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -screenWidth/2 + 60],
    extrapolate: 'clamp',
  });

  const profilePicTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -20],
    extrapolate: 'clamp',
  });

  const settingsTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -15],
    extrapolate: 'clamp',
  });

  const statsOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD * 0.6],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const membershipOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const nameTranslateY = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [0, -35],
    extrapolate: 'clamp',
  });

  const nameFontSize = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD],
    outputRange: [18, 16],
    extrapolate: 'clamp',
  });

  const nameOpacity = scrollY.interpolate({
    inputRange: [0, SCROLL_THRESHOLD * 0.4],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const voxxyHeaderOpacity = scrollY.interpolate({
    inputRange: [SCROLL_THRESHOLD * 0.6, SCROLL_THRESHOLD],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  return (
    <Animated.View style={[styles.wrapper, { height: containerHeight }]}>
      <LinearGradient
      colors={['#6B73FF', '#9D50BB', '#6B4E7A']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Voxxy Header - fades in when scrolling */}
      <Animated.View 
        style={[
          styles.voxxyHeader,
          { opacity: voxxyHeaderOpacity }
        ]}
      >
        <Text style={styles.voxxyHeaderText}>Voxxy</Text>
      </Animated.View>

      {/* Settings Button */}
      <Animated.View
        style={[
          styles.settingsButton,
          {
            transform: [{ translateY: settingsTranslateY }],
          }
        ]}
      >
        <TouchableOpacity 
          onPress={() => navigation.navigate('Profile')}
          activeOpacity={0.7}
          style={styles.settingsButtonTouch}
        >
          <Settings stroke="#fff" width={20} height={20} strokeWidth={2} />
        </TouchableOpacity>
      </Animated.View>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Animated.View
          style={[
            styles.profilePicContainer,
            {
              transform: [
                { translateX: profilePicTranslateX },
                { translateY: profilePicTranslateY }
              ],
            }
          ]}
        >
          <TouchableOpacity
            onPress={onScrollToTop}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                width: profilePicSize,
                height: profilePicSize,
                borderRadius: profilePicBorderRadius,
                borderWidth: 3,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                overflow: 'hidden',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 8,
              }}
            >
              <Image 
                source={getDisplayImage()} 
                style={styles.profilePic}
              />
            </Animated.View>
          </TouchableOpacity>
        </Animated.View>
        
        <Animated.View
          style={[
            styles.nameContainer,
            {
              transform: [{ translateY: nameTranslateY }],
            }
          ]}
        >
          <Animated.Text 
            style={[
              styles.userName,
              { 
                fontSize: nameFontSize,
                opacity: nameOpacity
              }
            ]}
          >
            {user.name}
          </Animated.Text>
        </Animated.View>
        
        <Animated.Text 
          style={[
            styles.membershipDuration,
            { opacity: membershipOpacity }
          ]}
        >
          {membershipDuration}
        </Animated.Text>
      </View>

      {/* Stats Boxes */}
      <Animated.View style={[styles.statsContainer, { opacity: statsOpacity }]}>
        <View style={styles.statBox}>
          <View style={styles.statIconContainer}>
            <Activity stroke="#4ECDC4" width={18} height={18} strokeWidth={2.5} />
          </View>
          <Text style={styles.statNumber}>{completedActivities}</Text>
          <Text style={styles.statLabel}>Activities{'\n'}Completed</Text>
        </View>

        <View style={styles.statBox}>
          <View style={styles.statIconContainer}>
            <Users stroke="#fff" width={18} height={18} strokeWidth={2.5} />
          </View>
          <Text style={styles.statNumber}>{communityCount}</Text>
          <Text style={styles.statLabel}>Community{'\n'}Members</Text>
        </View>
      </Animated.View>
    </LinearGradient>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },

  container: {
    flex: 1,
    paddingTop: 50,
    paddingBottom: 10,
    paddingHorizontal: 20,
  },

  voxxyHeader: {
    position: 'absolute',
    top: 58,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 5,
  },

  voxxyHeaderText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  settingsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingTop: 8,
  },

  settingsButtonTouch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },

  profilePicContainer: {
    marginBottom: 10,
    paddingTop: 15,
  },

  profilePic: {
    width: '100%',
    height: '100%',
  },

  nameContainer: {
    alignItems: 'center',
  },

  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },

  membershipDuration: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 13,
    fontWeight: '500',
  },

  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },

  statBox: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },

  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  statNumber: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 2,
  },

  statLabel: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 14,
  },
});