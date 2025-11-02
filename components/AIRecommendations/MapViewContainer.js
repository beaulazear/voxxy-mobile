import React from 'react';
import { View, StyleSheet } from 'react-native';
import NativeMapView from '../NativeMapView';

/**
 * MapViewContainer Component
 *
 * A container component that wraps the NativeMapView.
 * Displays recommendations on a map.
 *
 * @param {Object} props
 * @param {Array} props.recommendations - Array of recommendation objects to display on map
 * @param {string} props.activityType - Type of activity (e.g., 'Restaurant', 'Bar')
 * @param {Function} props.onMarkerPress - Callback when a map marker is pressed
 */
export default function MapViewContainer({
    recommendations,
    activityType,
    onMarkerPress,
}) {
    return (
        <View style={styles.mapViewContainer}>
            {/* Native Map View */}
            <NativeMapView
                recommendations={recommendations}
                activityType={activityType}
                onMarkerPress={onMarkerPress}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mapViewContainer: {
        flex: 1,
        position: 'relative',
    },
});
