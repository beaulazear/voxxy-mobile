// components/NoCommunityMembers.js
import React from 'react'
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native'
import SmallTriangle from '../assets/voxxy-triangle.png'
import colors from '../styles/Colors'

export default function NoCommunityMembers({ onInvitePress }) {
    return (
        <View style={styles.container}>
            <Image source={SmallTriangle} style={styles.image} />
            <Text style={styles.title}>No Voxxy Crew Yet 🎭</Text>
            <Text style={styles.subtitle}>
                It looks like you haven’t Voxxed with anyone yet. Invite your friends to start planning together!
            </Text>
            {onInvitePress && (
                <TouchableOpacity style={styles.button} onPress={onInvitePress}>
                    <Text style={styles.buttonText}>Invite Friends</Text>
                </TouchableOpacity>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        padding: 24,
        marginTop: 40,
    },
    image: {
        width: 80,
        height: 80,
        marginBottom: 16,
        opacity: 0.7,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 20,
        maxWidth: 280,
    },
    button: {
        backgroundColor: colors.primaryButton,
        paddingVertical: 10,
        paddingHorizontal: 24,
        borderRadius: 20,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
})