import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Globe, Search, Share2, Heart } from 'react-native-feather';
import { UserContext } from '../context/UserContext';
import CommunityFeedItem from './CommunityFeedItem';
import { fetchCommunityFavorites } from '../utils/api';
import { logger } from '../utils/logger';

const { height: screenHeight } = Dimensions.get('window');

export default function CommunityFeed({ communityMembers, onFavoritePress, limit = 30, showViewAll = false, onViewAll, isFirstTimeUser = false }) {
  const { user } = useContext(UserContext);
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Only show feed if user has at least 1 community member
  const shouldShowFeed = communityMembers && communityMembers.length >= 1;

  useEffect(() => {
    if (shouldShowFeed && user?.token) {
      loadFeed();
    } else {
      setLoading(false);
    }
  }, [shouldShowFeed, user?.token]);

  const loadFeed = async () => {
    try {
      setLoading(true);
      const data = await fetchCommunityFavorites(user.token);

      // Filter out invalid items (items without user or favorite data)
      const validData = (data || []).filter(item => {
        return item && item.user && item.favorite && item.favorite.title;
      });

      setFeedData(validData);
    } catch (error) {
      logger.error('Error loading community feed:', error);
      setFeedData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFeed();
    setRefreshing(false);
  };

  // Show helpful message for first-time users with no community
  if (!shouldShowFeed) {
    if (isFirstTimeUser) {
      return (
        <View style={styles.firstTimeUserContainer}>
          <LinearGradient
            colors={['rgba(185, 84, 236, 0.08)', 'rgba(185, 84, 236, 0.02)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.firstTimeUserGradient}
          >
            <View style={styles.firstTimeUserIconContainer}>
              <LinearGradient
                colors={['#B954EC', '#8B35C4']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.firstTimeUserIconGradient}
              >
                <Users color="#ffffff" size={32} strokeWidth={2.5} />
              </LinearGradient>
            </View>
            <Text style={styles.firstTimeUserTitle}>Build Your Community</Text>
            <Text style={styles.firstTimeUserText}>
              Once you create your first activity and invite friends, you'll see their favorite spots here!
            </Text>
            <View style={styles.firstTimeUserSteps}>
              <View style={styles.firstTimeUserStep}>
                <LinearGradient
                  colors={['#B954EC', '#8B35C4']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.firstTimeUserStepIcon}
                >
                  <Search color="#ffffff" size={18} strokeWidth={2.5} />
                </LinearGradient>
                <View style={styles.firstTimeUserStepContent}>
                  <Text style={styles.firstTimeUserStepTitle}>Search for Places</Text>
                  <Text style={styles.firstTimeUserStepText}>Tap the button above to find restaurants & bars</Text>
                </View>
              </View>
              <View style={styles.firstTimeUserStep}>
                <LinearGradient
                  colors={['#4ECDC4', '#3AB5AD']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.firstTimeUserStepIcon}
                >
                  <Share2 color="#ffffff" size={18} strokeWidth={2.5} />
                </LinearGradient>
                <View style={styles.firstTimeUserStepContent}>
                  <Text style={styles.firstTimeUserStepTitle}>Invite Friends</Text>
                  <Text style={styles.firstTimeUserStepText}>Share your plans with friends via invite link</Text>
                </View>
              </View>
              <View style={styles.firstTimeUserStep}>
                <LinearGradient
                  colors={['#FFE66D', '#FFC700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.firstTimeUserStepIcon}
                >
                  <Heart color="#ffffff" size={18} strokeWidth={2.5} />
                </LinearGradient>
                <View style={styles.firstTimeUserStepContent}>
                  <Text style={styles.firstTimeUserStepTitle}>Discover Together</Text>
                  <Text style={styles.firstTimeUserStepText}>See places your community loves</Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </View>
      );
    }
    return null;
  }

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color="#B954EC" />
        <Text style={styles.loadingText}>Loading community activity...</Text>
      </View>
    );
  }

  // Empty state
  if (feedData.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Users color="rgba(255, 255, 255, 0.3)" size={32} />
        <Text style={styles.emptyTitle}>No Recent Activity</Text>
        <Text style={styles.emptyText}>
          Your community hasn't saved any places recently
        </Text>
      </View>
    );
  }

  // Show up to specified limit most recent items
  const displayedItems = feedData.slice(0, limit);

  return (
    <View style={styles.container}>
      {/* Feed List */}
      <FlatList
        data={displayedItems}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <CommunityFeedItem item={item} onPress={onFavoritePress} />
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor="#B954EC"
            colors={['#B954EC']}
          />
        }
        scrollEnabled={false} // Disable scroll since it's nested
        ListFooterComponent={
          displayedItems.length > 0 ? (
            showViewAll && feedData.length > limit ? (
              <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
                <View style={styles.viewAllHeader}>
                  <Globe color="#fff" size={20} strokeWidth={2.5} />
                  <Text style={styles.viewAllText}>View All Community Activity</Text>
                </View>
                <Text style={styles.viewAllCount}>
                  {feedData.length} {feedData.length === 1 ? 'place' : 'places'} saved by your community
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.endOfFeedContainer}>
                <Text style={styles.endOfFeedText}>
                  {feedData.length > limit
                    ? `Showing ${limit} most recent • ${feedData.length - limit} more from your community`
                    : 'End of recent community activity'}
                </Text>
              </View>
            )
          ) : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 0,
  },
  firstTimeUserContainer: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.25)',
    overflow: 'hidden',
  },
  firstTimeUserGradient: {
    padding: 32,
    alignItems: 'center',
  },
  firstTimeUserIconContainer: {
    marginBottom: 20,
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 12,
  },
  firstTimeUserIconGradient: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  firstTimeUserTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    fontFamily: 'Montserrat_700Bold',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  firstTimeUserText: {
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    paddingHorizontal: 8,
  },
  firstTimeUserSteps: {
    width: '100%',
    gap: 14,
  },
  firstTimeUserStep: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    padding: 18,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    gap: 16,
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 4,
  },
  firstTimeUserStepIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    shadowColor: 'rgba(0, 0, 0, 0.3)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
  firstTimeUserStepContent: {
    flex: 1,
    flexShrink: 1,
  },
  firstTimeUserStepTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    marginBottom: 4,
    letterSpacing: 0.2,
    flexWrap: 'wrap',
  },
  firstTimeUserStepText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 13,
    lineHeight: 18,
    flexWrap: 'wrap',
    flexShrink: 1,
  },
  loadingContainer: {
    padding: 24,
    backgroundColor: 'rgba(42, 30, 46, 0.4)',
    borderRadius: 0,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.25)',
  },
  loadingText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    marginTop: 12,
  },
  emptyContainer: {
    padding: 24,
    backgroundColor: 'rgba(42, 30, 46, 0.4)',
    borderRadius: 0,
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.25)',
  },
  emptyTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  endOfFeedContainer: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: 'rgba(42, 30, 46, 0.3)',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.15)',
    alignItems: 'center',
  },
  endOfFeedText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  viewAllButton: {
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 20,
    padding: 20,
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.25)',
    alignItems: 'center',
  },
  viewAllHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 6,
  },
  viewAllText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  viewAllCount: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    fontWeight: '500',
  },
});
