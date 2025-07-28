import React from 'react';
import { View, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

export default function VoxxyFooter() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.topBorder} />

            <View style={styles.content}>
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('FAQ')}>
                    <Ionicons name="help-circle-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.plusButton} onPress={() => navigation.navigate('TripDashboardScreen')}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('/')}>
                    <Ionicons name="home-outline" size={26} color="#fff" />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    topBorder: {
        height: 1,
        backgroundColor: 'rgba(204, 49, 232, 0.4)',
        shadowColor: '#CC31E8',
        shadowOffset: { width: 0, height: -1 },
        shadowOpacity: 0.6,
        shadowRadius: 3,
        elevation: 5,
    },
    content: {
        paddingHorizontal: 32,
        paddingVertical: Platform.OS === 'ios' ? 18 : 14,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'rgba(32, 25, 37, 0.95)', // Semi-transparent
        backdropFilter: 'blur(10px)', // Glass effect (iOS)
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 12,
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    plusButton: {
        width: 50,
        height: 50,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 25,
        backgroundColor: '#CC31E8',
        shadowColor: '#CC31E8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 8,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
});