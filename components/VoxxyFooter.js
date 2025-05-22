import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';

export default function VoxxyFooter() {
    const navigation = useNavigation();
    const { user } = useContext(UserContext);
    console.log(user)

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('/')}>
                <Ionicons name="home-outline" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Image source={Woman} style={styles.avatar} />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 32,
        paddingVertical: Platform.OS === 'ios' ? 20 : 14,
        backgroundColor: 'rgba(13,11,31,0.95)',
        borderTopWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 25,
        borderColor: '#000',
        backgroundColor: '#fff',
    },
});