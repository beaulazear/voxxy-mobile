import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';
import colors from '../styles/Colors';

export default function VoxxyFooter() {
    const navigation = useNavigation();
    const { user } = useContext(UserContext);
    console.log(user)

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('/')}>
                <Ionicons visible name="home-outline" size={28} color="#fff" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                <Image  source={Woman} style={styles.avatar} />
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100,
        backgroundColor: '#201925',
        opacity: 2,
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
        borderColor: colors.primaryButton,
        backgroundColor: '#fff',
        paddingTop: 2,
    },
});