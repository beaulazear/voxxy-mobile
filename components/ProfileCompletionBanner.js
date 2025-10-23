import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ProfileCompletionBanner({ profileCompletion }) {
    if (profileCompletion.percentage >= 100) {
        return null;
    }

    return (
        <View style={styles.completionBanner}>
            <View style={styles.completionHeader}>
                <Text style={styles.completionTitle}>
                    Complete Your Profile
                </Text>
                <Text style={styles.completionSubtitle}>
                    Get better recommendations for your groups!
                </Text>
            </View>

            {/* Progress bar */}
            <View style={styles.completionBarContainer}>
                <View style={styles.completionBar}>
                    <View
                        style={[
                            styles.completionFill,
                            { width: `${profileCompletion.percentage}%` }
                        ]}
                    />
                </View>
            </View>

            {/* Missing items */}
            {profileCompletion.missing.length > 0 && (
                <View style={styles.missingItems}>
                    {profileCompletion.missing.map((item, index) => (
                        <View key={index} style={styles.missingItem}>
                            <Text style={styles.missingItemBullet}>•</Text>
                            <Text style={styles.missingItemText}>{item}</Text>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    completionBanner: {
        backgroundColor: 'rgba(255, 230, 109, 0.08)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 230, 109, 0.3)',
    },
    completionHeader: {
        marginBottom: 16,
    },
    completionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFE66D',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },
    completionSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        lineHeight: 20,
    },
    completionBarContainer: {
        marginBottom: 16,
    },
    completionBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 4,
        overflow: 'hidden',
    },
    completionFill: {
        height: '100%',
        backgroundColor: '#FFE66D',
        borderRadius: 4,
    },
    missingItems: {
        gap: 8,
    },
    missingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    missingItemBullet: {
        color: '#FFE66D',
        fontSize: 18,
        lineHeight: 20,
        fontWeight: '700',
    },
    missingItemText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
});
