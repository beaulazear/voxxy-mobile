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
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationSettings from '../components/NotificationSettings';
import { ArrowLeft, User, Settings, Edit3, Trash2, LogOut, Camera } from 'react-native-feather';
import PushNotificationService from '../services/PushNotificationService'
import { logger } from '../utils/logger';
import { getUserDisplayImage } from '../utils/avatarManager';
import * as ImagePicker from 'expo-image-picker';

export default function ProfileScreen() {
    const { user, setUser, updateUser } = useContext(UserContext);
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
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const token = user?.token;


    // Comprehensive avatar handling function
    const getDisplayImage = (userObj) => {
        return getUserDisplayImage(userObj, API_URL);
    };


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
                        logger.debug("🚪 handleLogout called");
                        try {
                            await fetch(`${API_URL}/logout`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                        } catch (error) {
                            logger.debug("Server logout failed, proceeding anyway:", error);
                        } finally {
                            logger.debug("🧹 Removing token and logging out");
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
                logger.error('Update error:', err);
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
                logger.error('Update error:', err);
                Alert.alert('Error', 'Failed to save preferences.');
            });
    };

    const handleSaveNotifications = async () => {
        try {
            // Use updateUser from context to properly handle push token registration
            const updatedUser = await updateUser({
                text_notifications: textNotifications,
                email_notifications: emailNotifications,
                push_notifications: pushNotifications,
            });
            
            if (updatedUser) {
                Alert.alert('Success', 'Notification settings updated!');
                
                // Update local state with the response
                setTextNotifications(updatedUser.text_notifications ?? textNotifications);
                setEmailNotifications(updatedUser.email_notifications ?? emailNotifications);
                setPushNotifications(updatedUser.push_notifications ?? pushNotifications);
            } else {
                Alert.alert('Error', 'Failed to update notifications.');
            }
        } catch (err) {
            logger.error('Update error:', err);
            Alert.alert('Error', 'Failed to update notifications.');
        }
    };

    const handlePickImage = async () => {
        Alert.alert(
            'Choose Photo',
            'Select a photo from your library or take a new one',
            [
                {
                    text: 'Camera',
                    onPress: handleTakePhoto,
                },
                {
                    text: 'Photo Library',
                    onPress: handleChooseFromLibrary,
                },
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
            ],
            { cancelable: true }
        );
    };

    const handleTakePhoto = async () => {
        const cameraPermission = await ImagePicker.requestCameraPermissionsAsync();
        
        if (cameraPermission.granted === false) {
            Alert.alert('Permission Required', 'Please allow access to your camera to take a profile picture.');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            base64: false,
            exif: false,
        });

        if (!result.canceled) {
            uploadProfilePicture(result.assets[0]);
        }
    };

    const handleChooseFromLibrary = async () => {
        const libraryPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        
        if (libraryPermission.granted === false) {
            Alert.alert('Permission Required', 'Please allow access to your photos to upload a profile picture.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
            allowsMultipleSelection: false,
            base64: false,
            exif: false,
        });

        if (!result.canceled) {
            uploadProfilePicture(result.assets[0]);
        }
    };

    const uploadProfilePicture = async (image) => {
        setUploadingPhoto(true);
        
        // Get file extension
        const uriParts = image.uri.split('.');
        const fileType = uriParts[uriParts.length - 1];
        
        const formData = new FormData();
        formData.append('user[profile_pic]', {
            uri: image.uri,
            type: `image/${fileType}`,
            name: `profile_photo.${fileType}`,
        });

        try {
            const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    // Don't set Content-Type header - let the browser set it with boundary
                },
                body: formData,
            });

            const json = await response.json();
            
            if (response.ok) {
                updateUser(json);
                Alert.alert(
                    'Success! 🎉', 
                    'Your profile photo has been updated.',
                    [{ text: 'OK', style: 'default' }]
                );
            } else {
                Alert.alert(
                    'Upload Failed', 
                    'Unable to update your profile photo. Please try again.',
                    [{ text: 'OK', style: 'default' }]
                );
            }
        } catch (error) {
            logger.error('Upload error:', error);
            Alert.alert(
                'Connection Error', 
                'Please check your internet connection and try again.',
                [{ text: 'OK', style: 'default' }]
            );
        } finally {
            setUploadingPhoto(false);
        }
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
                                logger.error('Delete error:', err);
                                Alert.alert('Error', 'Deletion failed.');
                            });
                    },
                },
            ]
        );
    };

    const renderProfileTab = () => (
        <View>
            {/* Avatar and Name Card */}
            <View style={styles.profileCard}>
                <TouchableOpacity
                    style={styles.avatarContainer}
                    onPress={handlePickImage}
                    disabled={uploadingPhoto}
                >
                    <Image
                        source={getDisplayImage(user)}
                        style={styles.avatar}
                        onError={() => logger.debug(`❌ Photo failed to load for ${user?.name}`)}
                        onLoad={() => logger.debug(`✅ Photo loaded for ${user?.name}`)}
                    />
                    <View style={styles.avatarEditIndicator}>
                        {uploadingPhoto ? (
                            <Text style={styles.uploadingText}>...</Text>
                        ) : (
                            <Camera stroke="#fff" width={12} height={12} strokeWidth={2} />
                        )}
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
                                <Edit3 stroke="#B8A5C4" width={16} height={16} strokeWidth={2} />
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

            {/* Preferences Section - No card */}
            <View style={styles.preferencesSection}>
                <Text style={styles.sectionTitle}>Preferences</Text>
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
        <View>
            <NotificationSettings />

            {/* Account Actions */}
            <View style={styles.section}>
                <Text style={styles.headerSubtitle}>Account Actions</Text>
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
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Profile Settings</Text>
                    <Text style={styles.headerSubtitle}>Manage your personal information and preferences</Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.container}>
                {/* Tab Navigation - Outside card */}
                <View style={styles.tabContainer}>
                    <View style={styles.tabBar}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                            onPress={() => setActiveTab('profile')}
                        >
                            <View style={styles.tabContent}>
                                <User 
                                    stroke={activeTab === 'profile' ? '#fff' : '#B8A5C4'} 
                                    width={16} 
                                    height={16} 
                                    strokeWidth={activeTab === 'profile' ? 2.5 : 2}
                                />
                                <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
                                    Profile
                                </Text>
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
                            onPress={() => setActiveTab('settings')}
                        >
                            <View style={styles.tabContent}>
                                <Settings 
                                    stroke={activeTab === 'settings' ? '#fff' : '#B8A5C4'} 
                                    width={16} 
                                    height={16} 
                                    strokeWidth={activeTab === 'settings' ? 2.5 : 2}
                                />
                                <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
                                    Settings
                                </Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Content Area */}
                <View style={styles.contentArea}>
                    {activeTab === 'profile' ? renderProfileTab() : renderSettingsTab()}
                </View>

                {/* Upload Loading Modal */}
                <Modal
                    visible={uploadingPhoto}
                    transparent
                    animationType="fade"
                >
                    <View style={styles.loadingOverlay}>
                        <View style={styles.loadingBox}>
                            <ActivityIndicator size="large" color="#CF38DD" />
                            <Text style={styles.loadingText}>Uploading photo...</Text>
                            <Text style={styles.loadingSubtext}>This may take a moment</Text>
                        </View>
                    </View>
                </Modal>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#201925',
    },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 20,
        backgroundColor: '#201925',
    },
    
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    
    headerContent: {
        flex: 1,
    },
    
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        fontFamily: 'Montserrat_700Bold',
    },
    
    headerSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    container: {
        paddingBottom: 80,
        backgroundColor: '#201925',
        flexGrow: 1,
    },
    
    // Tab styles matching HomePage
    tabContainer: {
        paddingHorizontal: 16,
        marginBottom: 24,
    },
    
    tabBar: {
        flexDirection: 'row',
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        borderRadius: 18,
        padding: 4,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
        shadowColor: 'rgba(185, 84, 236, 0.15)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
    },
    
    tab: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 14,
        position: 'relative',
        minHeight: 44,
        justifyContent: 'center',
    },
    
    activeTab: {
        backgroundColor: 'rgba(185, 84, 236, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.3)',
        shadowColor: 'rgba(185, 84, 236, 0.4)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },
    
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    
    tabText: {
        color: '#B8A5C4',
        fontSize: 14,
        fontWeight: '500',
    },
    
    activeTabText: {
        color: '#fff',
        fontWeight: '600',
    },
    
    // Content area
    contentArea: {
        paddingHorizontal: 20,
    },
    
    profileCard: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
        flexDirection: 'row',
        alignItems: 'flex-start',
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
    
    uploadingText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: 'bold',
    },
    
    loadingOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    loadingBox: {
        backgroundColor: '#2C2438',
        padding: 30,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#CF38DD',
    },
    
    loadingText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
        marginTop: 16,
        fontFamily: 'Montserrat-SemiBold',
    },
    
    loadingSubtext: {
        color: '#999',
        fontSize: 14,
        marginTop: 4,
        fontFamily: 'Montserrat-Regular',
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
    preferencesSection: {
        marginBottom: 24,
    },
    
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    
    section: {
        marginTop: 24,
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
    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.3)',
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