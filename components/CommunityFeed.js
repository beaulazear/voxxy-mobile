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
import { Users } from 'react-native-feather';
import { UserContext } from '../context/UserContext';
import CommunityFeedItem from './CommunityFeedItem';
import { fetchCommunityFavorites } from '../utils/api';
import { logger } from '../utils/logger';

const { height: screenHeight } = Dimensions.get('window');

export default function CommunityFeed({ communityMembers, onFavoritePress }) {
  const { user } = useContext(UserContext);
  const [feedData, setFeedData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Only show feed if user has at least 3 community members
  const shouldShowFeed = communityMembers && communityMembers.length >= 3;

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

  // Don't render if user doesn't have enough community members
  if (!shouldShowFeed) {
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

  return (
    <View style={styles.container}>
      {/* Feed List */}
      <FlatList
        data={feedData.slice(0, 3)} // Show only first 3 items
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
          feedData.length > 3 ? (
            <TouchableOpacity
              style={styles.seeAllButton}
              onPress={() => {
                // TODO: Navigate to full feed screen
                logger.debug('See all feed items');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.seeAllText}>
                See All Activity ({feedData.length})
              </Text>
            </TouchableOpacity>
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
  seeAllButton: {
    padding: 16,
    backgroundColor: 'rgba(185, 84, 236, 0.08)',
    borderRadius: 0,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.3)',
    alignItems: 'center',
  },
  seeAllText: {
    color: '#B954EC',
    fontSize: 14,
    fontWeight: '600',
  },
});
