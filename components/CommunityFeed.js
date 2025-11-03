import React, { useState, useEffect, useContext, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, Globe, Search, Share2, Heart } from 'react-native-feather';
import * as Haptics from 'expo-haptics';
import { UserContext } from '../context/UserContext';
import CommunityFeedItem from './CommunityFeedItem';
import { fetchCommunityFavorites } from '../utils/api';
import { logger } from '../utils/logger';

const { height: screenHeight } = Dimensions.get('window');

// Shimmer Animation Component
function ShimmerIcon({ children, delay = 0 }) {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const shimmerLoop = Animated.loop(
      Animated.sequence([
        Animated.delay(delay),
        Animated.parallel([
          Animated.sequence([
            Animated.timing(shimmerAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(shimmerAnim, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(scaleAnim, {
              toValue: 1.08,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(scaleAnim, {
              toValue: 1,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ])
    );

    shimmerLoop.start();

    return () => shimmerLoop.stop();
  }, [delay]);

  const opacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.7, 1],
  });

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }], opacity }}>
      {children}
    </Animated.View>
  );
}

export default function CommunityFeed({ communityMembers, onFavoritePress, limit = 30, showViewAll = false, onViewAll, isFirstTimeUser = false, onStartSearch }) {
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
            colors={['rgba(185, 84, 236, 0.12)', 'rgba(78, 205, 196, 0.08)', 'rgba(255, 230, 109, 0.08)']}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.firstTimeUserGradient}
          >
            <View style={styles.firstTimeUserContent}>
              <View style={styles.firstTimeUserHeroSection}>
                <View style={styles.firstTimeUserIconCircle}>
                  <LinearGradient
                    colors={['#B954EC', '#8B35C4']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.firstTimeUserIconGradient}
                  >
                    <Users color="#ffffff" size={32} strokeWidth={2.5} />
                  </LinearGradient>
                </View>
                <Text style={styles.firstTimeUserTitle}>Build Your Community! 🎉</Text>
                <Text style={styles.firstTimeUserSubtitle}>
                  Your adventure starts here
                </Text>
              </View>

              <View style={styles.firstTimeUserStepsContainer}>
                <View style={styles.firstTimeUserSteps}>
                  <TouchableOpacity
                    style={styles.firstTimeUserStep}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onStartSearch?.();
                    }}
                    activeOpacity={0.6}
                  >
                    <ShimmerIcon delay={0}>
                      <LinearGradient
                        colors={['#B954EC', '#8B35C4']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.firstTimeUserStepIcon}
                      >
                        <Search color="#ffffff" size={20} strokeWidth={2.5} />
                      </LinearGradient>
                    </ShimmerIcon>
                    <View style={styles.firstTimeUserStepBadge}>
                      <Text style={styles.firstTimeUserStepBadgeText}>1</Text>
                    </View>
                    <Text style={styles.firstTimeUserStepTitle}>Search 🔍</Text>
                    <Text style={styles.firstTimeUserStepText}>Find amazing spots</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.firstTimeUserStep}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onStartSearch?.();
                    }}
                    activeOpacity={0.6}
                  >
                    <ShimmerIcon delay={500}>
                      <LinearGradient
                        colors={['#4ECDC4', '#3AB5AD']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.firstTimeUserStepIcon}
                      >
                        <Share2 color="#ffffff" size={20} strokeWidth={2.5} />
                      </LinearGradient>
                    </ShimmerIcon>
                    <View style={styles.firstTimeUserStepBadge}>
                      <Text style={styles.firstTimeUserStepBadgeText}>2</Text>
                    </View>
                    <Text style={styles.firstTimeUserStepTitle}>Invite 👋</Text>
                    <Text style={styles.firstTimeUserStepText}>Bring your friends</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.firstTimeUserStep}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                      onStartSearch?.();
                    }}
                    activeOpacity={0.6}
                  >
                    <ShimmerIcon delay={1000}>
                      <LinearGradient
                        colors={['#FFE66D', '#FFC700']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.firstTimeUserStepIcon}
                      >
                        <Heart color="#ffffff" size={20} strokeWidth={2.5} />
                      </LinearGradient>
                    </ShimmerIcon>
                    <View style={styles.firstTimeUserStepBadge}>
                      <Text style={styles.firstTimeUserStepBadgeText}>3</Text>
                    </View>
                    <Text style={styles.firstTimeUserStepTitle}>Discover 💫</Text>
                    <Text style={styles.firstTimeUserStepText}>Save & share</Text>
                  </TouchableOpacity>
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
    borderColor: 'rgba(185, 84, 236, 0.3)',
    overflow: 'hidden',
  },
  firstTimeUserGradient: {
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  firstTimeUserContent: {
    gap: 32,
  },
  firstTimeUserHeroSection: {
    alignItems: 'center',
    gap: 12,
  },
  firstTimeUserIconCircle: {
    marginBottom: 8,
  },
  firstTimeUserIconGradient: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#B954EC',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  firstTimeUserTitle: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
    letterSpacing: 0.5,
    textAlign: 'center',
    textShadowColor: 'rgba(185, 84, 236, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  firstTimeUserSubtitle: {
    color: 'rgba(255, 255, 255, 0.85)',
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  firstTimeUserStepsContainer: {
    // Container for the steps
  },
  firstTimeUserSteps: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    gap: 12,
  },
  firstTimeUserStep: {
    flex: 1,
    alignItems: 'center',
    gap: 10,
    position: 'relative',
  },
  firstTimeUserStepIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: 'rgba(0, 0, 0, 0.5)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 10,
  },
  firstTimeUserStepBadge: {
    position: 'absolute',
    top: -4,
    right: '28%',
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B6B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#fff',
    shadowColor: '#FF6B6B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.6,
    shadowRadius: 4,
    elevation: 8,
    zIndex: 10,
  },
  firstTimeUserStepBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '800',
    fontFamily: 'Montserrat_700Bold',
  },
  firstTimeUserStepTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
    fontFamily: 'Montserrat_700Bold',
  },
  firstTimeUserStepText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 16,
    fontWeight: '500',
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
