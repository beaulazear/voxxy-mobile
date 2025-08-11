import React, { useContext, useMemo, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  Modal,
  FlatList,
  SafeAreaView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../context/UserContext';
import { Bell, Users, Activity, X, ChevronRight, ChevronDown, ChevronUp, MapPin } from 'react-native-feather';
import { Hamburger, Martini, Dices } from 'lucide-react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { API_URL } from '../config';
import { getUserDisplayImage, avatarMap } from '../utils/avatarManager';
import { safeAuthApiCall } from '../utils/safeApiCall';
import PushNotificationService from '../services/PushNotificationService';

const { width: screenWidth } = Dimensions.get('window');
const NAVBAR_HEIGHT = 90;
const FULL_HEIGHT = 375;
const SCROLL_THRESHOLD = 250;

// Activity configuration matching HomeScreen
const ACTIVITY_CONFIG = {
  'Restaurant': {
    displayText: 'Food',
    emoji: '🍜',
    icon: Hamburger,
    iconColor: '#FF6B6B'
  },
  'Game Night': {
    displayText: 'Game Night',
    emoji: '🎮',
    icon: Dices,
    iconColor: '#A8E6CF'
  },
  'Cocktails': {
    displayText: 'Drinks',
    emoji: '🍸',
    icon: Martini,
    iconColor: '#4ECDC4'
  },
  'Meeting': {
    displayText: 'Lets Meet!',
    emoji: '👥',
    icon: Users,
    iconColor: '#4ECDC4'
  }
};

const getActivityDisplayInfo = (activityType) => {
  return ACTIVITY_CONFIG[activityType] || {
    displayText: 'Activity',
    emoji: '🎉',
    icon: Activity,
    iconColor: '#B8A5C4'
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

const formatSinceDate = (date) => {
  if (!date) return 'Recently';
  
  const now = new Date();
  const diffInMs = now - date;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
  if (diffInDays < 365) return `${Math.floor(diffInDays / 30)} months ago`;
  
  const years = Math.floor(diffInDays / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
};

export default function ProfileSnippet({ scrollY = new Animated.Value(0), onScrollToTop, setFilter, setMainTab, invitesCount = 0, inProgressCount = 0, pastCount = 0, userFavorites, onShowFavorites }) {
  const userContext = useContext(UserContext);
  const { user } = userContext;
  const navigation = useNavigation();
  const [isNavbarMode, setIsNavbarMode] = useState(false);
  const [showActivitiesModal, setShowActivitiesModal] = useState(false);
  const [showCommunityModal, setShowCommunityModal] = useState(false);
  const [localUnreadCount, setLocalUnreadCount] = useState(0);
  const [communitySort, setCommunitySort] = useState('activities'); // 'activities' or 'alphabetical'
  const [expandedMember, setExpandedMember] = useState(null); // Track which member's dropdown is expanded
  
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
        console.log('Could not fetch notification count:', error.message);
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
          console.log('Could not refresh notification count:', error.message);
        }
      };

      fetchUnreadCount();
    }, [user?.token])
  );

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
  const completedActivitiesList = useMemo(() => {
    const myActivities = user?.activities?.filter(a => a.completed) || [];
    const participantActivities = user?.participant_activities
      ?.filter(p => p.accepted && p.activity?.completed)
      .map(p => p.activity) || [];
    
    // Remove duplicates by activity id
    const uniqueCompleted = [...new Map([...myActivities, ...participantActivities].map(a => [a.id, a])).values()];
    return uniqueCompleted;
  }, [user]);

  const completedActivities = completedActivitiesList.length;

  // Get community members with activity count, first activity date, and shared activities
  const communityMembers = useMemo(() => {
    if (!user) return [];
    
    const allUsersMap = new Map();
    const userActivityCount = new Map();
    const userFirstActivity = new Map();
    const userSharedActivities = new Map(); // Track shared activities for each user
    
    // Process user's activities
    user.activities?.forEach(act => {
      act.participants?.forEach(p => {
        if (p.id !== user.id) {
          allUsersMap.set(p.id, p);
          userActivityCount.set(p.id, (userActivityCount.get(p.id) || 0) + 1);
          
          // Track first activity date
          const activityDate = new Date(act.created_at || Date.now());
          const existingDate = userFirstActivity.get(p.id);
          if (!existingDate || activityDate < existingDate) {
            userFirstActivity.set(p.id, activityDate);
          }
          
          // Track shared activities
          if (!userSharedActivities.has(p.id)) {
            userSharedActivities.set(p.id, []);
          }
          userSharedActivities.get(p.id).push({
            id: act.id,
            name: act.activity_name,
            type: act.activity_type,
            date: act.date_day,
            created_at: act.created_at
          });
        }
      });
    });
    
    // Process participant activities
    user.participant_activities?.forEach(pa => {
      const { activity: act } = pa;
      const host = act.user;
      
      // Add host if not self
      if (host?.id !== user.id) {
        allUsersMap.set(host.id, host);
        userActivityCount.set(host.id, (userActivityCount.get(host.id) || 0) + 1);
        
        // Track first activity date
        const activityDate = new Date(act.created_at || Date.now());
        const existingDate = userFirstActivity.get(host.id);
        if (!existingDate || activityDate < existingDate) {
          userFirstActivity.set(host.id, activityDate);
        }
        
        // Track shared activities with host
        if (!userSharedActivities.has(host.id)) {
          userSharedActivities.set(host.id, []);
        }
        userSharedActivities.get(host.id).push({
          id: act.id,
          name: act.activity_name,
          type: act.activity_type,
          date: act.date_day,
          created_at: act.created_at
        });
      }
      
      // Add other participants
      act.participants?.forEach(p => {
        if (p.id !== user.id) {
          allUsersMap.set(p.id, p);
          userActivityCount.set(p.id, (userActivityCount.get(p.id) || 0) + 1);
          
          // Track first activity date
          const activityDate = new Date(act.created_at || Date.now());
          const existingDate = userFirstActivity.get(p.id);
          if (!existingDate || activityDate < existingDate) {
            userFirstActivity.set(p.id, activityDate);
          }
          
          // Track shared activities with other participants
          if (!userSharedActivities.has(p.id)) {
            userSharedActivities.set(p.id, []);
          }
          userSharedActivities.get(p.id).push({
            id: act.id,
            name: act.activity_name,
            type: act.activity_type,
            date: act.date_day,
            created_at: act.created_at
          });
        }
      });
    });
    
    // Build the final array with enriched data
    return Array.from(allUsersMap.values()).map(member => {
      const sharedActivities = userSharedActivities.get(member.id) || [];
      // Remove duplicates by activity id and sort by most recent
      const uniqueSharedActivities = [...new Map(sharedActivities.map(a => [a.id, a])).values()]
        .sort((a, b) => new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01'));
      
      return {
        ...member,
        activitiesCount: userActivityCount.get(member.id) || 0,
        firstActivityDate: userFirstActivity.get(member.id) || new Date(),
        sharedActivities: uniqueSharedActivities,
      };
    });
  }, [user]);

  const communityCount = communityMembers.length;

  // Sort community members based on current filter
  const sortedCommunityMembers = useMemo(() => {
    const members = [...communityMembers];
    if (communitySort === 'alphabetical') {
      return members.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else {
      // Sort by activities count (most activities first)
      return members.sort((a, b) => b.activitiesCount - a.activitiesCount);
    }
  }, [communityMembers, communitySort]);

  // Helper to get member profile image
  const getMemberDisplayImage = (member) => {
    // Check for profile_pic_url first (uploaded image URL)
    if (member?.profile_pic_url) {
      const profilePicUrl = member.profile_pic_url.startsWith('http')
        ? member.profile_pic_url
        : `${API_URL}${member.profile_pic_url}`;
      return { uri: profilePicUrl };
    }
    
    // Check for avatar (selected preset avatar)
    if (member?.avatar && member.avatar !== 'default') {
      // Extract filename from path if it includes directory
      const avatarFilename = member.avatar.includes('/')
        ? member.avatar.split('/').pop()
        : member.avatar;

      // Check if we have this avatar in our mapping
      if (avatarMap[avatarFilename]) {
        return avatarMap[avatarFilename];
      }

      // If it's a full URL, use it
      if (member.avatar.startsWith('http')) {
        return { uri: member.avatar };
      }
    }

    // Fallback to default image
    return require('../assets/voxxy-triangle.png');
  };

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
    return require('../assets/voxxy-triangle.png');
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
    <>
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

      {/* Notifications Button */}
      <Animated.View
        style={[
          styles.notificationsButton,
          {
            transform: [{ translateY: settingsTranslateY }],
          }
        ]}
      >
        <TouchableOpacity 
          onPress={() => navigation.navigate('Notifications')}
          activeOpacity={0.7}
          style={styles.notificationsButtonTouch}
        >
          <Bell stroke="#fff" width={20} height={20} strokeWidth={2} />
          {localUnreadCount > 0 && (
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {localUnreadCount > 99 ? '99+' : localUnreadCount}
              </Text>
            </View>
          )}
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
            onPress={() => navigation.navigate('Profile')}
            activeOpacity={0.8}
          >
            <Animated.View
              style={{
                width: profilePicSize,
                height: profilePicSize,
                borderRadius: profilePicBorderRadius,
                borderWidth: 3,
                borderColor: 'rgba(255, 255, 255, 0.8)',
                backgroundColor: '#ffffff',
                overflow: 'hidden',
                shadowColor: 'rgba(0, 0, 0, 0.3)',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 1,
                shadowRadius: 8,
                justifyContent: 'center',
                alignItems: 'center',
              }}
            >
              <Image 
                source={getDisplayImage()} 
                style={[
                  styles.profilePic,
                  // Special styling for voxxy triangle
                  (getDisplayImage() === require('../assets/voxxy-triangle.png')) && {
                    width: '70%',
                    height: '70%',
                    resizeMode: 'contain',
                  }
                ]}
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
          
          {/* Location Display */}
          {user.city && (
            <Animated.View 
              style={[
                styles.locationContainer,
                { opacity: nameOpacity }
              ]}
            >
              <MapPin stroke="rgba(255, 255, 255, 0.7)" width={12} height={12} strokeWidth={2} />
              <Text style={styles.locationText}>
                {user.city}{user.state ? `, ${user.state}` : ''}
              </Text>
            </Animated.View>
          )}
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
        <TouchableOpacity 
          style={styles.statBox}
          onPress={onShowFavorites}
          activeOpacity={0.8}
        >
          <View style={styles.statIconContainer}>
            <Image 
              source={require('../assets/voxxy-triangle.png')} 
              style={styles.voxxyIcon}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.statNumber}>{userFavorites?.length || 0}</Text>
          <Text style={styles.statLabel}>Favorite{'\n'}Activities</Text>
          <View style={styles.statChevron}>
            <ChevronRight stroke="rgba(255, 255, 255, 0.6)" width={14} height={14} strokeWidth={2} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.statBox}
          onPress={() => setShowCommunityModal(true)}
          activeOpacity={0.8}
        >
          <View style={styles.statIconContainer}>
            <Users stroke="#6B4E7A" width={20} height={20} strokeWidth={2.5} />
          </View>
          <Text style={styles.statNumber}>{communityCount}</Text>
          <Text style={styles.statLabel}>Community{'\n'}Members</Text>
          <View style={styles.statChevron}>
            <ChevronRight stroke="rgba(255, 255, 255, 0.6)" width={14} height={14} strokeWidth={2} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    </LinearGradient>
    </Animated.View>

    {/* Completed Activities Modal */}
    <Modal
      visible={showActivitiesModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowActivitiesModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowActivitiesModal(false)}
          >
            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Completed Activities</Text>
          <View style={{ width: 40 }} />
        </View>
        
        <FlatList
          data={completedActivitiesList.sort((a, b) => new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01'))}
          keyExtractor={(item) => String(item.id)}
          renderItem={({ item }) => {
            const displayInfo = getActivityDisplayInfo(item.activity_type);
            return (
              <TouchableOpacity
                style={styles.pastActivityItem}
                onPress={() => {
                  setShowActivitiesModal(false);
                  navigation.navigate('ActivityDetails', { activityId: item.id });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.pastActivityIcon}>
                  {displayInfo.icon && (
                    <displayInfo.icon 
                      color={displayInfo.iconColor} 
                      size={24} 
                      strokeWidth={2}
                    />
                  )}
                </View>
                <View style={styles.pastActivityContent}>
                  <Text style={styles.pastActivityTitle}>{item.activity_name}</Text>
                  <Text style={styles.pastActivityMeta}>
                    {displayInfo.displayText} • {formatDate(item.date_day)}
                  </Text>
                  <View style={styles.pastActivityParticipants}>
                    <Users stroke="#B8A5C4" width={14} height={14} />
                    <Text style={styles.pastActivityParticipantText}>
                      {item.participants?.length || 0} participants
                    </Text>
                  </View>
                </View>
                <ChevronRight stroke="#B8A5C4" width={20} height={20} />
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={styles.modalListContent}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.pastActivitySeparator} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Activity stroke="#666" width={48} height={48} strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No Completed Activities</Text>
              <Text style={styles.emptyStateText}>
                Activities you've completed will appear here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>

    {/* Community Members Modal */}
    <Modal
      visible={showCommunityModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowCommunityModal(false)}
    >
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity 
            style={styles.modalCloseButton}
            onPress={() => setShowCommunityModal(false)}
          >
            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Community Members</Text>
          <View style={{ width: 40 }} />
        </View>

        {/* Sort Filter Buttons */}
        <View style={styles.sortContainer}>
          <TouchableOpacity
            style={[
              styles.sortButton,
              communitySort === 'activities' && styles.sortButtonActive
            ]}
            onPress={() => setCommunitySort('activities')}
          >
            <Text style={[
              styles.sortButtonText,
              communitySort === 'activities' && styles.sortButtonTextActive
            ]}>
              Best Friends
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.sortButton,
              communitySort === 'alphabetical' && styles.sortButtonActive
            ]}
            onPress={() => setCommunitySort('alphabetical')}
          >
            <Text style={[
              styles.sortButtonText,
              communitySort === 'alphabetical' && styles.sortButtonTextActive
            ]}>
              A-Z
            </Text>
          </TouchableOpacity>
        </View>
        
        <FlatList
          data={sortedCommunityMembers}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.modalListContent}
          renderItem={({ item }) => {
            const isExpanded = expandedMember === item.id;
            return (
              <View style={styles.memberCardContainer}>
                <TouchableOpacity 
                  style={styles.memberCard}
                  onPress={() => setExpandedMember(isExpanded ? null : item.id)}
                  activeOpacity={0.7}
                >
                  <View style={[
                    styles.memberAvatar,
                    (getMemberDisplayImage(item) === require('../assets/voxxy-triangle.png')) && {
                      backgroundColor: '#ffffff',
                      justifyContent: 'center',
                      alignItems: 'center',
                    }
                  ]}>
                    <Image 
                      source={getMemberDisplayImage(item)}
                      style={[
                        styles.memberAvatarImage,
                        // Special styling for voxxy triangle
                        (getMemberDisplayImage(item) === require('../assets/voxxy-triangle.png')) && {
                          width: '70%',
                          height: '70%',
                          resizeMode: 'contain',
                        }
                      ]}
                    />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{item.name || 'Unknown'}</Text>
                    <Text style={styles.memberSince}>
                      Since {formatSinceDate(item.firstActivityDate)}
                    </Text>
                    <Text style={styles.memberActivities}>
                      {item.activitiesCount} {item.activitiesCount === 1 ? 'activity' : 'activities'} together
                    </Text>
                  </View>
                  <View style={styles.memberExpandIcon}>
                    {isExpanded ? (
                      <ChevronUp stroke="rgba(255, 255, 255, 0.6)" width={20} height={20} />
                    ) : (
                      <ChevronDown stroke="rgba(255, 255, 255, 0.6)" width={20} height={20} />
                    )}
                  </View>
                </TouchableOpacity>
                
                {/* Expanded Activities Dropdown */}
                {isExpanded && (
                  <View style={styles.activitiesDropdown}>
                    <Text style={styles.dropdownTitle}>Shared Activities</Text>
                    {item.sharedActivities && item.sharedActivities.length > 0 ? (
                      item.sharedActivities.map((activity, index) => {
                        const displayInfo = getActivityDisplayInfo(activity.type);
                        return (
                          <TouchableOpacity
                            key={`${activity.id}-${index}`}
                            style={styles.dropdownActivityItem}
                            onPress={() => {
                              setShowCommunityModal(false);
                              setExpandedMember(null);
                              navigation.navigate('ActivityDetails', { activityId: activity.id });
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownActivityIcon}>
                              {displayInfo.icon && (
                                <displayInfo.icon 
                                  color={displayInfo.iconColor} 
                                  size={16} 
                                  strokeWidth={2}
                                />
                              )}
                            </View>
                            <View style={styles.dropdownActivityInfo}>
                              <Text style={styles.dropdownActivityName}>{activity.name}</Text>
                              <Text style={styles.dropdownActivityMeta}>
                                {displayInfo.displayText} • {formatDate(activity.date)}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <Text style={styles.noActivitiesText}>No shared activities</Text>
                    )}
                  </View>
                )}
              </View>
            );
          }}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Users stroke="#666" width={48} height={48} strokeWidth={1.5} />
              <Text style={styles.emptyStateTitle}>No Community Members</Text>
              <Text style={styles.emptyStateText}>
                People you've connected with will appear here
              </Text>
            </View>
          }
        />
      </SafeAreaView>
    </Modal>
    </>
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

  notificationsButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    paddingTop: 8,
  },

  notificationsButtonTouch: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },

  notificationBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
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
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },

  profileInfo: {
    alignItems: 'center',
    marginBottom: 24,
        paddingTop: 8,
  },

  profilePicContainer: {
    marginBottom: 10,
    paddingTop: 8,
    zIndex: 15,
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
  },

  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },

  locationText: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
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
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 5,
    transform: [{ scale: 1 }],
    position: 'relative',
    minHeight: 100,
  },

  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: 'rgba(0, 0, 0, 0.2)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },

  statNumber: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  statLabel: {
    color: 'rgba(255, 255, 255, 0.95)',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 15,
    marginBottom: 6,
  },

  statChevron: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 10,
  },

  voxxyIcon: {
    width: 24,
    height: 24,
    shadowColor: 'rgba(0, 0, 0, 0.25)',
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 3,
    elevation: 4,
  },

  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: '#201925',
  },

  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(64, 51, 71, 0.3)',
  },

  modalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },

  modalListContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },

  // HomeScreen-style Activity Styles
  pastActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.5)',
  },
  
  pastActivityIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(185, 84, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
  },

  pastActivityContent: {
    flex: 1,
    marginRight: 12,
  },
  
  pastActivityTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  pastActivityMeta: {
    color: '#B8A5C4',
    fontSize: 14,
    marginBottom: 4,
  },

  pastActivityParticipants: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pastActivityParticipantText: {
    color: '#B8A5C4',
    fontSize: 12,
    marginLeft: 4,
  },

  pastActivitySeparator: {
    height: 12,
  },

  // Member Card Styles
  memberCardContainer: {
    marginBottom: 8,
  },

  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },

  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    overflow: 'hidden',
  },

  memberAvatarImage: {
    width: '100%',
    height: '100%',
  },

  memberInfo: {
    flex: 1,
  },

  memberName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },

  memberSince: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginBottom: 2,
  },

  memberActivities: {
    color: '#B8A5C4',
    fontSize: 12,
  },

  memberExpandIcon: {
    padding: 4,
  },

  // Dropdown Styles
  activitiesDropdown: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(64, 51, 71, 0.3)',
  },

  dropdownTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(64, 51, 71, 0.3)',
  },

  dropdownActivityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },

  dropdownActivityIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(185, 84, 236, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    borderWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.2)',
  },

  dropdownActivityInfo: {
    flex: 1,
  },

  dropdownActivityName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 2,
  },

  dropdownActivityMeta: {
    color: '#B8A5C4',
    fontSize: 12,
  },

  noActivitiesText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontStyle: 'italic',
    textAlign: 'center',
    paddingVertical: 8,
  },

  // Empty State Styles
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },

  emptyStateTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyStateText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Sort Filter Styles
  sortContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 10,
    gap: 10,
  },

  sortButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
  },

  sortButtonActive: {
    backgroundColor: '#667eea',
  },

  sortButtonText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '600',
  },

  sortButtonTextActive: {
    color: '#fff',
  },
});