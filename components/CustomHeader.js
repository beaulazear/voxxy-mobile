import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';
import VoxxyLogo from '../assets/header.svg'; // ✅ SVG component
import { HelpCircle } from 'react-native-feather'

export default function CustomHeader() {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <View style={styles.left}>
                {navigation.canGoBack() ? (
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={24} color="#6c63ff" />
                    </TouchableOpacity>
                ) : null}
                <TouchableOpacity onPress={() => navigation.navigate('/')}>
                    <VoxxyLogo height={36} width={120} />
                </TouchableOpacity>
            </View>

            <View style={styles.right}>
                {user ? (
                    <>
                        <TouchableOpacity onPress={() => navigation.navigate('FAQ')}>
                            <HelpCircle style={styles.link}>Help</HelpCircle>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => navigation.navigate('FAQ')}>
                            <Text style={styles.link}>Help</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 16,
        backgroundColor: '#201925',
        borderBottomWidth: 1,
        borderColor: '#3c2f4c',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    left: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    logo: {
        height: 32,
        width: 100,
        resizeMode: 'contain',
    },
    right: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    link: {
        color: '#cfc1e2',
        fontSize: 14,
        fontWeight: '500',
        paddingHorizontal: 8,
    },
    logout: {
        color: '#ff6b6b',
        fontSize: 14,
        fontWeight: '500',
        paddingHorizontal: 8,
    },
});