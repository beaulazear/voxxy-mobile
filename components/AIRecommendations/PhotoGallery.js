import React from 'react';
import { View, Text, Image, FlatList } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import styles from '../../styles/AIRecommendationsStyles';

/**
 * PhotoGallery Component
 * Displays a horizontal scrollable gallery of photos
 * @param {Array} photos - Array of photo objects or URLs
 */
const PhotoGallery = ({ photos }) => {
    const validPhotos = photos.filter(photo =>
        photo.photo_url || (typeof photo === 'string' && photo.startsWith('http'))
    );

    if (validPhotos.length === 0) return null;

    return (
        <View style={styles.photoSection}>
            <View style={styles.sectionHeader}>
                <Icon name="camera" size={16} color="#fff" />
                <Text style={styles.sectionHeaderText}>Photos ({validPhotos.length})</Text>
            </View>
            <FlatList
                data={validPhotos}
                horizontal
                showsHorizontalScrollIndicator={false}
                keyExtractor={(item, index) => index.toString()}
                renderItem={({ item }) => (
                    <Image
                        source={{ uri: item.photo_url || item }}
                        style={styles.photo}
                        resizeMode="cover"
                    />
                )}
            />
        </View>
    );
};

export default PhotoGallery;
