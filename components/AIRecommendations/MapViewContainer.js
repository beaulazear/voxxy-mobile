import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Icons } from '../../constants/featherIcons';
import NativeMapView from '../NativeMapView';

/**
 * MapViewContainer Component
 *
 * A container component that wraps the NativeMapView and provides view mode toggle controls.
 * Displays recommendations on a map with ability to switch between map and card views.
 *
 * @param {Object} props
 * @param {Array} props.recommendations - Array of recommendation objects to display on map
 * @param {string} props.activityType - Type of activity (e.g., 'Restaurant', 'Bar')
 * @param {Function} props.onMarkerPress - Callback when a map marker is pressed
 * @param {string} props.viewMode - Current view mode ('map' or 'cards')
 * @param {Function} props.onViewModeChange - Callback when view mode is changed
 * @param {boolean} props.showViewToggle - Whether to show the view mode toggle (default: true)
 * @param {boolean} props.isGameNightActivity - Whether this is a Game Night activity (affects toggle visibility)
 */
export default function MapViewContainer({
    recommendations,
    activityType,
    onMarkerPress,
    viewMode,
    onViewModeChange,
    showViewToggle = true,
    isGameNightActivity = false
}) {
    const handleViewModeChange = (mode) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onViewModeChange(mode);
    };

    return (
        <View style={styles.mapViewContainer}>
            {/* Native Map View */}
            <NativeMapView
                recommendations={recommendations}
                activityType={activityType}
                onMarkerPress={onMarkerPress}
            />

            {/* View Mode Toggle overlay - only show if not Game Night */}
            {showViewToggle && !isGameNightActivity && (
                <View style={styles.viewModeToggleOverlay}>
                    <TouchableOpacity
                        style={[
                            styles.viewModeButton,
                            viewMode === 'map' && styles.viewModeButtonActive
                        ]}
                        onPress={() => handleViewModeChange('map')}
                    >
                        <Icons.Map color={viewMode === 'map' ? '#fff' : '#666'} size={18} />
                        <Text style={[
                            styles.viewModeButtonText,
                            viewMode === 'map' && styles.viewModeButtonTextActive
                        ]}>
                            Map
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.viewModeButton,
                            viewMode === 'cards' && styles.viewModeButtonActive
                        ]}
                        onPress={() => handleViewModeChange('cards')}
                    >
                        <Icons.Grid color={viewMode === 'cards' ? '#fff' : '#666'} size={18} />
                        <Text style={[
                            styles.viewModeButtonText,
                            viewMode === 'cards' && styles.viewModeButtonTextActive
                        ]}>
                            List
                        </Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    mapViewContainer: {
        flex: 1,
        position: 'relative',
    },
    viewModeToggleOverlay: {
        position: 'absolute',
        top: 12,
        left: '50%',
        transform: [{ translateX: -80 }],
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: 25,
        padding: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0, 0, 0, 0.05)',
        zIndex: 10,
    },
    viewModeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
    },
    viewModeButtonActive: {
        backgroundColor: '#cc31e8',
    },
    viewModeButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    viewModeButtonTextActive: {
        color: '#fff',
    },
});
