import React, { useContext, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { UserContext } from '../context/UserContext';
import { Settings, Users, Activity } from 'react-native-feather';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';

export default function ProfileSnippet() {
  const { user } = useContext(UserContext);
  const navigation = useNavigation();

  // Calculate how long user has been on Voxxy
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
      const avatarMap = {
        'Avatar1.jpg': require('../assets/Avatar1.jpg'),
        'Avatar2.jpg': require('../assets/Avatar2.jpg'),
        'Avatar3.jpg': require('../assets/Avatar3.jpg'),
        'Avatar4.jpg': require('../assets/Avatar4.jpg'),
        'Avatar5.jpg': require('../assets/Avatar5.jpg'),
        'Avatar6.jpg': require('../assets/Avatar6.jpg'),
        'Avatar7.jpg': require('../assets/Avatar7.jpg'),
        'Avatar8.jpg': require('../assets/Avatar8.jpg'),
        'Avatar9.jpg': require('../assets/Avatar9.jpg'),
        'Avatar10.jpg': require('../assets/Avatar10.jpg'),
        'Avatar11.jpg': require('../assets/Avatar11.jpg'),
      };
      
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

  return (
    <LinearGradient
      colors={['#B954EC', '#CF38DD', '#8e44ad']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.container}
    >
      {/* Settings Button */}
      <TouchableOpacity 
        style={styles.settingsButton}
        onPress={() => navigation.navigate('Profile')}
        activeOpacity={0.7}
      >
        <Settings stroke="#fff" width={20} height={20} strokeWidth={2} />
      </TouchableOpacity>

      {/* Profile Info */}
      <View style={styles.profileInfo}>
        <Image source={getDisplayImage()} style={styles.profilePic} />
        <Text style={styles.userName}>{user.name}</Text>
        <Text style={styles.membershipDuration}>{membershipDuration}</Text>
      </View>

      {/* Stats Boxes */}
      <View style={styles.statsContainer}>
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
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 45,
    paddingBottom: 16,
    paddingHorizontal: 20,
  },

  settingsButton: {
    position: 'absolute',
    top: 45,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    zIndex: 10,
  },

  profileInfo: {
    alignItems: 'center',
    marginBottom: 20,
  },

  profilePic: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    marginBottom: 10,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
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