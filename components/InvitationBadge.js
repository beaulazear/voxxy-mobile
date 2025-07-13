// components/InvitationBadge.js - Optional badge to show pending invitations
import React, { useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { UserContext } from '../context/UserContext';

const InvitationBadge = ({ onPress, style }) => {
    const { user } = useContext(UserContext);

    // Count pending invitations
    const pendingCount = user?.participant_activities?.filter(
        p => !p.accepted
    ).length || 0;

    if (pendingCount === 0) return null;

    return (
        <TouchableOpacity
            style={[styles.badge, style]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <Text style={styles.badgeText}>
                {pendingCount > 9 ? '9+' : pendingCount}
            </Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    badge: {
        backgroundColor: '#e74c3c',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
        borderWidth: 2,
        borderColor: '#fff',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 4,
    },
    badgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default InvitationBadge;

// Example usage in your header or navigation:
// import InvitationBadge from './components/InvitationBadge';
// 
// <View style={{ position: 'relative' }}>
//   <TouchableOpacity onPress={() => navigation.navigate('Invitations')}>
//     <Text>📧 Invitations</Text>
//   </TouchableOpacity>
//   <InvitationBadge 
//     style={{ position: 'absolute', top: -8, right: -8 }}
//     onPress={() => navigation.navigate('Invitations')}
//   />
// </View>