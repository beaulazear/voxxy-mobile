import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { Users, ChevronRight } from 'react-native-feather';
import { getUserDisplayImage } from '../utils/avatarManager';
import { API_URL } from '../config';

export default function CommunityMembersSection({ communityMembers, onPress }) {
    return (
        <TouchableOpacity
            style={styles.sectionCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.sectionHeader}>
                <Users stroke="#FF6B6B" width={20} height={20} strokeWidth={2} />
                <Text style={[styles.sectionTitle, { marginLeft: 12, flex: 1 }]}>Your Community</Text>
                <View style={styles.activityBadge}>
                    <Text style={styles.activityBadgeText}>{communityMembers.length}</Text>
                </View>
                {communityMembers.length > 0 && (
                    <View style={styles.avatarPreviewContainer}>
                        {communityMembers.slice(0, 3).map((member, index) => (
                            <Image
                                key={member.id}
                                source={getUserDisplayImage(member, API_URL)}
                                style={[styles.avatarPreview, { marginLeft: index > 0 ? -8 : 0 }]}
                            />
                        ))}
                    </View>
                )}
                <ChevronRight stroke="#FF6B6B" width={20} height={20} strokeWidth={2} />
            </View>
            <Text style={styles.sectionSubtitle}>
                See everyone you've connected with on Voxxy
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
    avatarPreviewContainer: {
        flexDirection: 'row',
        marginLeft: 8,
        marginRight: 8,
    },
    avatarPreview: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2,
        borderColor: '#201925',
    },
});
