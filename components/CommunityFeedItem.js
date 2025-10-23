import React from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { MapPin } from 'react-native-feather';
import { getUserDisplayImage } from '../utils/avatarManager';
import { timeAgo } from '../utils/timeAgo';
import { API_URL } from '../config';

export default function CommunityFeedItem({ item, onPress }) {
  const { user, favorite, created_at } = item;

  // Safety checks for required data
  if (!user || !favorite) {
    return null;
  }

  // Determine place type based on activity_type
  const getPlaceType = () => {
    const activityType = favorite?.activity_type;
    if (activityType === 'Cocktails') {
      return 'bar';
    } else if (activityType === 'Restaurant' || activityType === 'Brunch') {
      return 'restaurant';
    }
    return 'place'; // fallback
  };

  const placeType = getPlaceType();

  return (
    <TouchableOpacity
      style={styles.feedItem}
      onPress={() => onPress(favorite)}
      activeOpacity={0.7}
    >
      {/* User Avatar */}
      <Image
        source={getUserDisplayImage(user, API_URL)}
        style={styles.avatar}
      />

      {/* Content */}
      <View style={styles.content}>
        {/* Header: "John Doe saved a new bar" */}
        <Text style={styles.headerText}>
          <Text style={styles.userName}>{user?.name || 'Someone'}</Text>
          <Text style={styles.actionText}> saved a new {placeType}</Text>
        </Text>

        {/* Place Name */}
        <Text style={styles.placeName} numberOfLines={1}>
          {favorite?.title || 'Unnamed Place'}
        </Text>

        {/* Address */}
        {favorite.address && (
          <View style={styles.addressRow}>
            <MapPin color="rgba(255, 255, 255, 0.5)" size={12} />
            <Text style={styles.address} numberOfLines={1}>
              {favorite.address.split(',').slice(0, 2).join(',')}
            </Text>
          </View>
        )}

        {/* Timestamp */}
        <Text style={styles.timestamp}>{timeAgo(created_at)}</Text>
      </View>

      {/* Price Tag (if available) */}
      {favorite.price_range && (
        <View style={styles.priceTag}>
          <Text style={styles.priceText}>{favorite.price_range}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  feedItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(42, 30, 46, 0.6)',
    borderRadius: 0,
    padding: 16,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderColor: 'rgba(185, 84, 236, 0.25)',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    borderWidth: 2,
    borderColor: '#B954EC',
  },
  content: {
    flex: 1,
    marginRight: 8,
  },
  headerText: {
    marginBottom: 6,
  },
  userName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    fontFamily: 'Montserrat_700Bold',
  },
  actionText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  placeName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
    fontFamily: 'Montserrat_700Bold',
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  address: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 13,
    flex: 1,
  },
  timestamp: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
    marginTop: 4,
  },
  priceTag: {
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  priceText: {
    color: '#fbbf24',
    fontSize: 12,
    fontWeight: '700',
  },
});
