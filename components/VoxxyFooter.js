import React, { useContext } from 'react';
import { View, TouchableOpacity, StyleSheet, Image, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';
import colors from '../styles/Colors';
import { API_URL } from '../config';

// Avatar mapping for relative paths
const avatarMap = {
    // Avatar series
    'Avatar1.jpg': require('../assets/Avatar1.jpg'),
    'Avatar2.jpg': require('../assets/Avatar2.jpg'),
    'Avatar3.jpg': require('../assets/Avatar3.jpg'),
    'Avatar4.jpg': require('../assets/Avatar4.jpg'),
    'Avatar5.jpg': require('../assets/Avatar5.jpg'),
    'Avatar6.jpg': require('../assets/Avatar6.jpg'),
    'Avatar7.jpg': require('../assets/Avatar7.jpg'),
    'Avatar8.jpg': require('../assets/Avatar8.jpg'),
    'Avatar9.jpg': require('../assets/Avatar9.jpg'),
    'Avatar10.jpg': require('../assets/Avatar10.jpg'),
    'Avatar11.jpg': require('../assets/Avatar11.jpg'),

    // Weird series
    'Weird1.jpg': require('../assets/Weird1.jpg'),
    'Weird2.jpg': require('../assets/Weird2.jpg'),
    'Weird3.jpg': require('../assets/Weird3.jpg'),
    'Weird4.jpg': require('../assets/Weird4.jpg'),
    'Weird5.jpg': require('../assets/Weird5.jpg'),
}

// Helper function to safely get avatar
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null
    } catch (error) {
        console.log(`⚠️ Avatar ${filename} not found in mapping`)
        return null
    }
}

export default function VoxxyFooter() {
    const navigation = useNavigation();
    const { user } = useContext(UserContext);
    console.log(user)

    // Comprehensive avatar handling function
    const getDisplayImage = (userObj) => {
        console.log(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        // Check for profile_pic_url first (full URL)
        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            console.log(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        // Check for avatar (relative path)
        if (userObj?.avatar && userObj.avatar !== Woman) {
            // Extract filename from path if it includes directory
            const avatarFilename = userObj.avatar.includes('/')
                ? userObj.avatar.split('/').pop()
                : userObj.avatar

            console.log(`🎭 Looking for avatar: ${avatarFilename}`)

            // Check if we have this avatar in our mapping
            const mappedAvatar = getAvatarFromMap(avatarFilename)
            if (mappedAvatar) {
                console.log(`✅ Found avatar in mapping: ${avatarFilename}`)
                return mappedAvatar
            }

            // If it's a full URL, use it
            if (userObj.avatar.startsWith('http')) {
                console.log(`🌐 Using avatar URL: ${userObj.avatar}`)
                return { uri: userObj.avatar }
            }
        }

        // Fallback to default icon
        console.log(`🔄 Using default icon`)
        return Woman
    }

    const handlePlusPress = () => {
        // Placeholder - does nothing for now
        console.log('Plus button pressed - coming soon!')
    }

    return (
        <View style={styles.container}>
            <View style={styles.topBorder} />

            <View style={styles.content}>
                <TouchableOpacity style={styles.iconButton} onPress={() => navigation.navigate('/')}>
                    <Ionicons name="home-outline" size={26} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.plusButton} onPress={() => navigation.navigate('TripDashboardScreen')}
                >
                    <Ionicons name="add" size={28} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.avatarButton}
                    onPress={() => navigation.navigate('Profile')}
                >
                    <Image
                        source={getDisplayImage(user)}
                        style={styles.avatar}
                        onError={() => console.log(`❌ Footer avatar failed to load for ${user?.name}`)}
                        onLoad={() => console.log(`✅ Footer avatar loaded for ${user?.name}`)}
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
    avatarButton: {
        width: 44,
        height: 44,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        padding: 2,
    },
    avatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#CC31E8',
    },
});