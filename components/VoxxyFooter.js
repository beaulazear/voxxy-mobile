import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Platform, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { avatarMap } from '../utils/avatarManager';

export default function VoxxyFooter({ onPlusPress }) {
    const navigation = useNavigation();
    const { user } = useContext(UserContext);

    // Get profile image - matching ProfileSnippet logic
    const getDisplayImage = () => {
        if (user?.profile_pic_url) {
            const profilePicUrl = user.profile_pic_url.startsWith('http')
                ? user.profile_pic_url
                : `${API_URL}${user.profile_pic_url}`;
            return { uri: profilePicUrl };
        }

        if (user?.avatar) {
            const avatarFilename = user.avatar.includes('/')
                ? user.avatar.split('/').pop()
                : user.avatar;

            if (avatarMap[avatarFilename]) {
                return avatarMap[avatarFilename];
            }

            if (user.avatar.startsWith('http')) {
                return { uri: user.avatar };
            }
        }

        return require('../assets/voxxy-triangle.png');
    };

    return (
        <View style={styles.container}>
            <View style={styles.topBorder} />

            <View style={styles.content}>
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('FAQ')}>
                    <Ionicons name="help-circle-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Activities')}>
                    <Ionicons name="flash-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.plusButton}
                    onPress={onPlusPress || (() => navigation.navigate('TripDashboardScreen'))}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('Favorites')}>
                    <Ionicons name="heart-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.profileButton}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Image
                        source={getDisplayImage()}
                        style={[
                            styles.profileImage,
                            // Special styling for voxxy triangle
                            (getDisplayImage() === require('../assets/voxxy-triangle.png')) && {
                                width: '70%',
                                height: '70%',
                                resizeMode: 'contain',
                            }
                        ]}
                    />
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
        paddingHorizontal: 20,
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
    profileButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.6)',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        overflow: 'hidden',
        shadowColor: 'rgba(204, 49, 232, 0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 4,
    },
    profileImage: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
});