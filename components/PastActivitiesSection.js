import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Calendar, ChevronRight } from 'react-native-feather';

export default function PastActivitiesSection({ completedActivitiesCount, onPress }) {
    return (
        <TouchableOpacity
            style={styles.sectionCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.sectionHeader}>
                <Calendar stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
                <Text style={[styles.sectionTitle, { marginLeft: 12, flex: 1 }]}>Past Activities</Text>
                <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>{completedActivitiesCount}</Text>
                </View>
                <ChevronRight stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
            </View>
            <Text style={styles.sectionSubtitle}>
                View your activity history
            </Text>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    sectionCard: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.15)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        marginTop: 4,
    },
    activityBadge: {
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },
    activityBadgeText: {
        color: '#4ECDC4',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
});
