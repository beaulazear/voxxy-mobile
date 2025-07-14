import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
    Switch,
    Modal,
    FlatList,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../components/CustomHeader';
import NotificationSettings from '../components/NotificationSettings';
import PushNotificationService from '../services/PushNotificationService'

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

export default function ProfileScreen() {
    const { user, setUser } = useContext(UserContext);
    const navigation = useNavigation();

    // Profile tab states
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [preferences, setPreferences] = useState(user?.preferences || '');

    // Settings tab states
    const [textNotifications, setTextNotifications] = useState(user?.text_notifications ?? true);
    const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true);
    const [pushNotifications, setPushNotifications] = useState(user?.push_notifications ?? true);

    // Tab state
    const [activeTab, setActiveTab] = useState('profile');
    const [showAvatarModal, setShowAvatarModal] = useState(false);

    const token = user?.token;

    console.log('💬 User in ProfileScreen:', user);
    console.log('💬 Token in ProfileScreen:', token);

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

    useEffect(() => {
        setNewName(user?.name || '');
        setPreferences(user?.preferences || '');
        setTextNotifications(user?.text_notifications ?? true);
        setEmailNotifications(user?.email_notifications ?? true);
        setPushNotifications(user?.push_notifications ?? true);
    }, [user]);

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        console.log("🚪 handleLogout called");
                        try {
                            await fetch(`${API_URL}/logout`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                        } catch (error) {
                            console.log("Server logout failed, proceeding anyway:", error);
                        } finally {
                            console.log("🧹 Removing token and logging out");
                            await AsyncStorage.removeItem('jwt');
                            setUser(null);
                            navigation.navigate('/');
                        }
                    }
                }
            ]
        );
    };

    const handleSaveName = () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }

        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: newName }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update user');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, name: updatedUser.name });
                setIsEditingName(false);
                Alert.alert('Success', 'Name updated!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update name.');
            });
    };

    const handleCancelEdit = () => {
        setNewName(user?.name || '');
        setIsEditingName(false);
    };

    const handleSavePreferences = () => {
        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ preferences }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update preferences');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, preferences: updatedUser.preferences });
                Alert.alert('Success', 'Preferences saved!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to save preferences.');
            });
    };

    const handleSaveNotifications = () => {
        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                text_notifications: textNotifications,
                email_notifications: emailNotifications,
                push_notifications: pushNotifications,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update notifications');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({
                    ...user,
                    text_notifications: updatedUser.text_notifications,
                    email_notifications: updatedUser.email_notifications,
                    push_notifications: updatedUser.push_notifications,
                });
                Alert.alert('Success', 'Notification settings updated!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update notifications.');
            });
    };

    const handleSaveAvatar = (selectedAvatar) => {
        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ avatar: selectedAvatar }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update avatar');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, avatar: updatedUser.avatar });
                setShowAvatarModal(false);
                Alert.alert('Success', 'Avatar updated!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update avatar.');
            });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Account',
            'Delete account? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        fetch(`${API_URL}/users/${user.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                        })
                            .then((res) => {
                                if (!res.ok) throw new Error('Failed to delete account');
                                setUser(null);
                            })
                            .catch((err) => {
                                console.error('Delete error:', err);
                                Alert.alert('Error', 'Deletion failed.');
                            });
                    },
                },
            ]
        );
    };

    const renderProfileTab = () => (
        <View style={styles.tabContent}>
            {/* Avatar and Name Section */}
            <View style={styles.profileSection}>
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={() => setShowAvatarModal(true)}
                >
                    <Image
                        source={getDisplayImage(user)}
                        style={styles.avatar}
                        onError={() => console.log(`❌ Avatar failed to load for ${user?.name}`)}
                        onLoad={() => console.log(`✅ Avatar loaded for ${user?.name}`)}
                    />
                    <View style={styles.avatarEditIndicator}>
                        <Text style={styles.avatarEditText}>✏️</Text>
                    </View>
                </TouchableOpacity>

                <View style={styles.nameContainer}>
                    {!isEditingName ? (
                        <View style={styles.nameDisplay}>
                            <Text style={styles.name}>{user?.name || 'User'}</Text>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setIsEditingName(true)}
                            >
                                <Text style={styles.editButtonText}>✏️</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={styles.input}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter new name"
                                placeholderTextColor="#bbb"
                            />
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.emailContainer}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.emailText}>{user?.email}</Text>
                    </View>
                </View>
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
                <Text style={styles.subtitle}>Preferences</Text>
                <Text style={styles.label}>Allergies or Restrictions</Text>
                <TextInput
                    style={styles.textArea}
                    value={preferences}
                    onChangeText={setPreferences}
                    placeholder="e.g. Vegan, Gluten-free, None"
                    placeholderTextColor="#bbb"
                    multiline
                    numberOfLines={3}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleSavePreferences}>
                    <Text style={styles.buttonText}>Save Preferences</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSettingsTab = () => (
        <View style={styles.tabContent}>
            <NotificationSettings />

            {/* Account Actions */}
            <View style={styles.section}>
                <Text style={styles.subtitle}>Account Actions</Text>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Text style={styles.buttonText}>Delete Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.buttonText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <>
            <CustomHeader />
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Profile Settings</Text>
                    <Text style={styles.headerSubtitle}>Manage your personal information and preferences</Text>
                </View>

                {/* Card Container */}
                <View style={styles.card}>
                    {/* Tab Navigation */}
                    <View style={styles.tabNavigation}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                            onPress={() => setActiveTab('profile')}
                        >
                            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
                                👤 Profile
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
                            onPress={() => setActiveTab('settings')}
                        >
                            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
                                ⚙️ Settings
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'profile' ? renderProfileTab() : renderSettingsTab()}
                </View>

                {/* Avatar Selection Modal */}
                <Modal
                    visible={showAvatarModal}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setShowAvatarModal(false)}
                >
                    <View style={styles.modalOverlay}>
                        <View style={styles.avatarModal}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>Choose Your Avatar</Text>
                                <TouchableOpacity onPress={() => setShowAvatarModal(false)}>
                                    <Text style={styles.modalCloseText}>✕</Text>
                                </TouchableOpacity>
                            </View>

                            <FlatList
                                data={Object.keys(avatarMap)}
                                numColumns={3}
                                keyExtractor={(item) => item}
                                contentContainerStyle={styles.avatarGrid}
                                renderItem={({ item }) => (
                                    <TouchableOpacity
                                        style={styles.avatarOption}
                                        onPress={() => handleSaveAvatar(item)}
                                    >
                                        <Image source={avatarMap[item]} style={styles.avatarOptionImage} />
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 30,
        paddingBottom: 80,
        paddingHorizontal: 20,
        backgroundColor: '#201925',
        flexGrow: 1,
    },
    headerContainer: {
        marginBottom: 32,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#FAF9FA',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    tabNavigation: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#322338',
        borderRightWidth: 1,
        borderRightColor: '#444',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#3d2c44',
        borderBottomWidth: 2,
        borderBottomColor: '#CC31E8',
    },
    tabText: {
        color: '#ddd',
        fontSize: 16,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    tabContent: {
        padding: 20,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 20,
    },
    avatarContainer: {
        alignItems: 'center',
        position: 'relative',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#CC31E8',
    },
    avatarEditIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#CC31E8',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#201925',
    },
    avatarEditText: {
        fontSize: 12,
        color: '#fff',
    },
    nameContainer: {
        flex: 1,
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginRight: 12,
    },
    editButton: {
        padding: 4,
    },
    editButtonText: {
        fontSize: 16,
    },
    editContainer: {
        marginBottom: 16,
    },
    emailContainer: {
        marginTop: 8,
    },
    emailText: {
        color: '#fff',
        fontSize: 16,
    },
    section: {
        marginTop: 24,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#ddd',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ddd',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#241928',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    textArea: {
        backgroundColor: '#241928',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    switchLabel: {
        color: '#fff',
        fontSize: 16,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    primaryButton: {
        backgroundColor: '#CC31E8',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButton: {
        backgroundColor: '#44617b',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6b6b6b',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#d11a2a',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    logoutButton: {
        backgroundColor: '#6b6b6b',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
        textAlign: 'center',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    avatarModal: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 20,
        width: '90%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: '#444',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    modalCloseText: {
        fontSize: 18,
        color: '#CC31E8',
        fontWeight: '600',
    },
    avatarGrid: {
        justifyContent: 'center',
        gap: 16,
    },
    avatarOption: {
        width: 70,
        height: 70,
        borderRadius: 35,
        borderWidth: 2,
        borderColor: '#444',
        margin: 8,
        overflow: 'hidden',
    },
    avatarOptionImage: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
});