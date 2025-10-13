import React, { useState, useContext, useEffect, useMemo } from 'react';
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
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import NotificationSettings from '../components/NotificationSettings';
import { ArrowLeft, User, Settings, Edit3, Trash2, LogOut, Camera, MapPin, Calendar, X, Activity, Users, ChevronRight } from 'react-native-feather';
import { Hamburger, Martini, Dices, Shield } from 'lucide-react-native';
import { logger } from '../utils/logger';
import { getUserDisplayImage } from '../utils/avatarManager';
import * as ImagePicker from 'expo-image-picker';
import LocationPicker from '../components/LocationPicker';
import colors from '../styles/Colors';
import BlockedUsersService from '../services/BlockedUsersService';
import PreferencesModal from '../components/PreferencesModal';

const ACTIVITY_CONFIG = {
  'Restaurant': {
    displayText: 'Food',
    emoji: '🍜',
    icon: Hamburger,
    iconColor: '#FF6B6B'
  },
  'Game Night': {
    displayText: 'Game Night',
    emoji: '🎮',
    icon: Dices,
    iconColor: '#A8E6CF'
  },
  'Cocktails': {
    displayText: 'Drinks',
    emoji: '🍸',
    icon: Martini,
    iconColor: '#4ECDC4'
  },
  'Meeting': {
    displayText: 'Lets Meet!',
    emoji: '👥',
    icon: Users,
    iconColor: '#4ECDC4'
  }
};

const getActivityDisplayInfo = (activityType) => {
  return ACTIVITY_CONFIG[activityType] || {
    displayText: 'Activity',
    emoji: '🎉',
    icon: Activity,
    iconColor: '#B8A5C4'
  };
};

const formatDate = (dateString) => {
  if (!dateString) return 'TBD';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric'
  });
};

export default function ProfileScreen() {
    const { user, setUser, updateUser, logout } = useContext(UserContext);
    const navigation = useNavigation();
    const [showPastActivitiesModal, setShowPastActivitiesModal] = useState(false);
    const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);

    // Profile tab states
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [preferences, setPreferences] = useState(user?.preferences || '');
    const [favoriteFood, setFavoriteFood] = useState(user?.favorite_food || '');
    const [savingPreferences, setSavingPreferences] = useState(false);
    
    // Location state
    const [userLocation, setUserLocation] = useState(
        user?.city ? {
            neighborhood: user.neighborhood || '',
            city: user.city || '',
            state: user.state || '',
            formatted: `${user.city}${user.state ? ', ' + user.state : ''}`,
            latitude: user.latitude || null,
            longitude: user.longitude || null
        } : null
    );
    const [isEditingLocation, setIsEditingLocation] = useState(false);

    // Settings tab states
    const [textNotifications, setTextNotifications] = useState(user?.text_notifications ?? true);
    const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true);
    const [pushNotifications, setPushNotifications] = useState(user?.push_notifications ?? true);

    // Tab state
    const [activeTab, setActiveTab] = useState('profile');
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const token = user?.token;

    // Calculate completed activities (same logic as ProfileSnippet)
    const completedActivitiesList = useMemo(() => {
        const myActivities = user?.activities?.filter(a => a.completed) || [];
        const participantActivities = user?.participant_activities
            ?.filter(p => p.accepted && p.activity?.completed)
            .map(p => p.activity) || [];

        // Remove duplicates by activity id
        const uniqueCompleted = [...new Map([...myActivities, ...participantActivities].map(a => [a.id, a])).values()];
        return uniqueCompleted;
    }, [user]);

    // Calculate profile completion
    const profileCompletion = useMemo(() => {
        let completed = 0;
        const total = 5;

        if (user?.name) completed++;
        if (user?.email) completed++;
        if (user?.city && user?.state) completed++;
        if (user?.favorite_food) completed++;
        if (user?.preferences) completed++;

        const percentage = (completed / total) * 100;

        // Determine missing items
        const missing = [];
        if (!user?.city || !user?.state) missing.push('Set your location');
        if (!user?.favorite_food) missing.push('Add favorite foods');
        if (!user?.preferences) missing.push('Set dietary preferences');

        return { completed, total, percentage, missing };
    }, [user]);


    // Comprehensive avatar handling function
    const getDisplayImage = (userObj) => {
        return getUserDisplayImage(userObj, API_URL);
    };


    useEffect(() => {
        setNewName(user?.name || '');
        setPreferences(user?.preferences || '');
        setFavoriteFood(user?.favorite_food || '');
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
                            logger.debug("🧹 Logging out using context method");
                            await logout(); // Use context logout which handles cleanup
                            navigation.replace('/'); // Use replace for clean navigation
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

    const handleSavePreferences = async (favoritesString, dietaryString) => {
        setSavingPreferences(true);

        try {
            logger.debug('Saving preferences:', { favoritesString, dietaryString });

            const updatedUser = await updateUser({
                preferences: dietaryString,
                favorite_food: favoritesString,
            });

            logger.debug('Updated user response:', updatedUser);

            if (updatedUser) {
                // Update local state with values from server
                setPreferences(updatedUser.preferences || '');
                setFavoriteFood(updatedUser.favorite_food || '');

                logger.debug('Local state updated:', {
                    preferences: updatedUser.preferences,
                    favorite_food: updatedUser.favorite_food
                });

                setShowPreferencesModal(false);
                Alert.alert('Success', 'Preferences saved!');
            } else {
                Alert.alert('Error', 'Failed to save preferences. Please try again.');
            }
        } catch (err) {
            logger.error('Update error:', err);
            Alert.alert('Error', 'Failed to save preferences. Please check your connection and try again.');
        } finally {
            setSavingPreferences(false);
        }
    };

    // Location handlers
    const handleLocationSelect = (locationData) => {
        setUserLocation(locationData);
    };

    const handleSaveLocation = () => {
        const locationUpdate = {
            neighborhood: userLocation?.neighborhood || '',
            city: userLocation?.city || '',
            state: userLocation?.state || '',
            latitude: userLocation?.latitude || null,
            longitude: userLocation?.longitude || null
        };

        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(locationUpdate),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update location');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, ...locationUpdate });
                setIsEditingLocation(false);
                Alert.alert('Success', 'Location updated successfully!');
            })
            .catch((err) => {
                logger.error('Location error:', err);
                Alert.alert('Error', 'Failed to update location.');
            });
    };

    const handleCancelLocationEdit = () => {
        // Reset to original user location
        setUserLocation(
            user?.city ? {
                neighborhood: user.neighborhood || '',
                city: user.city || '',
                state: user.state || '',
                formatted: `${user.city}${user.state ? ', ' + user.state : ''}`,
                latitude: user.latitude || null,
                longitude: user.longitude || null
            } : null
        );
        setIsEditingLocation(false);
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
                    onPress: async () => {
                        try {
                            logger.debug('Delete account attempt:', {
                                userId: user.id,
                                hasToken: !!token,
                                tokenValue: token ? `${token.substring(0, 10)}...` : 'undefined',
                                userHasToken: !!user?.token
                            });
                            
                            const res = await fetch(`${API_URL}/users/${user.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                            });
                            
                            if (!res.ok) {
                                logger.error('Delete account failed:', {
                                    status: res.status,
                                    statusText: res.statusText
                                });
                                throw new Error('Failed to delete account');
                            }
                            
                            // Use the logout method from context which handles all cleanup
                            await logout();
                            
                            // Navigate to landing screen using replace for clean navigation
                            navigation.replace('/');
                            
                        } catch (err) {
                            logger.error('Delete error:', err);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleShowBlockedUsers = async () => {
        setLoadingBlockedUsers(true);
        setShowBlockedUsersModal(true);
        
        try {
            // Initialize service with token if needed
            if (user?.token) {
                BlockedUsersService.setAuthToken(user.token);
            }
            
            // Get blocked users with details
            const blockedUsersList = await BlockedUsersService.getBlockedUserDetails();
            setBlockedUsers(blockedUsersList);
        } catch (error) {
            logger.error('Failed to load blocked users:', error);
            Alert.alert('Error', 'Failed to load blocked users');
        } finally {
            setLoadingBlockedUsers(false);
        }
    };

    const handleUnblockUser = async (userId, userName) => {
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${userName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await BlockedUsersService.unblockUser(userId);
                            if (success) {
                                // Refresh the list
                                const updatedList = await BlockedUsersService.getBlockedUserDetails();
                                setBlockedUsers(updatedList);
                                
                                Alert.alert('Success', `${userName} has been unblocked`);
                            }
                        } catch (error) {
                            logger.error('Failed to unblock user:', error);
                            Alert.alert('Error', 'Failed to unblock user');
                        }
                    }
                }
            ]
        );
    };

    const renderProfileTab = () => (
        <View>
            {/* Profile Completion Banner */}
            {profileCompletion.percentage < 100 && (
                <View style={styles.completionBanner}>
                    <View style={styles.completionHeader}>
                        <Text style={styles.completionTitle}>
                            Complete Your Profile ({profileCompletion.completed}/{profileCompletion.total})
                        </Text>
                        <Text style={styles.completionSubtitle}>
                            Get better recommendations for your groups!
                        </Text>
                    </View>

                    {/* Progress bar */}
                    <View style={styles.completionBarContainer}>
                        <View style={styles.completionBar}>
                            <View
                                style={[
                                    styles.completionFill,
                                    { width: `${profileCompletion.percentage}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.completionPercentage}>
                            {Math.round(profileCompletion.percentage)}%
                        </Text>
                    </View>

                    {/* Missing items */}
                    {profileCompletion.missing.length > 0 && (
                        <View style={styles.missingItems}>
                            {profileCompletion.missing.map((item, index) => (
                                <View key={index} style={styles.missingItem}>
                                    <Text style={styles.missingItemBullet}>•</Text>
                                    <Text style={styles.missingItemText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    )}
                </View>
            )}

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

            {/* Location Section */}
            <View style={styles.locationSection}>
                <Text style={styles.sectionTitle}>Location</Text>
                
                {!isEditingLocation ? (
                    <View style={styles.locationDisplay}>
                        <View style={styles.locationInfo}>
                            <MapPin stroke="#B8A5C4" width={16} height={16} strokeWidth={2} />
                            <Text style={styles.locationText}>
                                {userLocation?.formatted || 'No location set'}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={styles.editButton}
                            onPress={() => setIsEditingLocation(true)}
                        >
                            <Edit3 stroke="#B8A5C4" width={16} height={16} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    <View style={styles.locationEditContainer}>
                        <LocationPicker
                            onLocationSelect={handleLocationSelect}
                            currentLocation={userLocation}
                        />
                        <View style={styles.buttonGroup}>
                            <TouchableOpacity 
                                style={styles.saveButton} 
                                onPress={handleSaveLocation}
                                disabled={!userLocation}
                            >
                                <Text style={styles.buttonText}>Save Location</Text>
                            </TouchableOpacity>
                            <TouchableOpacity 
                                style={styles.cancelButton} 
                                onPress={handleCancelLocationEdit}
                            >
                                <Text style={styles.buttonText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
            </View>

            {/* Preferences Section */}
            <View style={styles.preferencesSection}>
                <Text style={styles.sectionTitle}>Food Preferences</Text>

                <TouchableOpacity
                    style={styles.preferencesCard}
                    onPress={() => {
                        logger.debug('Opening preferences modal with:', { favoriteFood, preferences });
                        setShowPreferencesModal(true);
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.preferencesCardContent}>
                        {favoriteFood || preferences ? (
                            <>
                                {favoriteFood && (
                                    <View style={styles.preferencesRow}>
                                        <Text style={styles.preferencesLabel}>Favorites:</Text>
                                        <Text style={styles.preferencesValue} numberOfLines={2}>
                                            {favoriteFood}
                                        </Text>
                                    </View>
                                )}
                                {preferences && (
                                    <View style={styles.preferencesRow}>
                                        <Text style={styles.preferencesLabel}>Dietary:</Text>
                                        <Text style={styles.preferencesValue} numberOfLines={2}>
                                            {preferences}
                                        </Text>
                                    </View>
                                )}
                            </>
                        ) : (
                            <Text style={styles.preferencesPlaceholder}>
                                Tap to set your food preferences
                            </Text>
                        )}
                    </View>
                    <ChevronRight stroke="#9261E5" width={20} height={20} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            {/* Past Activities Button */}
            <TouchableOpacity
                style={styles.pastActivitiesButton}
                onPress={() => setShowPastActivitiesModal(true)}
                activeOpacity={0.8}
            >
                <Calendar stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
                <View style={styles.pastActivitiesButtonContent}>
                    <Text style={styles.pastActivitiesButtonText}>View Past Activities</Text>
                    <Text style={styles.pastActivitiesButtonCount}>
                        {completedActivitiesList.length} {completedActivitiesList.length === 1 ? 'activity' : 'activities'} completed
                    </Text>
                </View>
                <ChevronRight stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
            </TouchableOpacity>
        </View>
    );

    const renderSettingsTab = () => (
        <View>
            <NotificationSettings />

            {/* Legal & Privacy */}
            <View style={styles.section}>
                <Text style={styles.headerSubtitle}>Legal & Privacy</Text>
                <TouchableOpacity
                    style={styles.privacyButton}
                    onPress={() => navigation.navigate('PrivacyPolicy')}
                >
                    <Text style={styles.privacyButtonText}>Privacy Policy</Text>
                    <ChevronRight stroke="#9261E5" width={20} height={20} />
                </TouchableOpacity>
                <TouchableOpacity 
                    style={[styles.privacyButton, { marginTop: 12 }]}
                    onPress={handleShowBlockedUsers}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Shield size={20} color="#9261E5" style={{ marginRight: 8 }} />
                        <Text style={styles.privacyButtonText}>Blocked Users</Text>
                    </View>
                    <ChevronRight stroke="#9261E5" width={20} height={20} />
                </TouchableOpacity>
            </View>

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

            {/* Past Activities Modal */}
            <Modal
                visible={showPastActivitiesModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowPastActivitiesModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowPastActivitiesModal(false)}
                        >
                            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>All Past Activities</Text>
                        <View style={styles.modalHeaderSpacer} />
                    </View>
                    
                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {completedActivitiesList.length === 0 ? (
                            <View style={styles.modalCard}>
                                <Text style={styles.modalCardTitle}>No Past Activities</Text>
                                <Text style={styles.modalCardText}>
                                    You haven't completed any activities yet. Start creating activities to build your history!
                                </Text>
                                <TouchableOpacity 
                                    style={styles.modalButton}
                                    onPress={() => {
                                        setShowPastActivitiesModal(false)
                                        navigation.navigate('Home')
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalButtonText}>Start Creating Activities</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.modalListContainer}>
                                {completedActivitiesList
                                    .sort((a, b) => new Date(b.created_at || '1970-01-01') - new Date(a.created_at || '1970-01-01'))
                                    .map((item, index) => {
                                        const displayInfo = getActivityDisplayInfo(item.activity_type);
                                        return (
                                            <TouchableOpacity
                                                key={String(item.id)}
                                                style={[
                                                    styles.pastActivityItem,
                                                    index === completedActivitiesList.length - 1 && { marginBottom: 0 }
                                                ]}
                                                onPress={() => {
                                                    setShowPastActivitiesModal(false);
                                                    navigation.navigate('ActivityDetails', { activityId: item.id });
                                                }}
                                                activeOpacity={0.7}
                                            >
                                                <View style={styles.pastActivityIcon}>
                                                    {displayInfo.icon && (
                                                        <displayInfo.icon 
                                                            color={displayInfo.iconColor} 
                                                            size={24} 
                                                            strokeWidth={2}
                                                        />
                                                    )}
                                                </View>
                                                <View style={styles.pastActivityContent}>
                                                    <Text style={styles.pastActivityTitle}>{item.activity_name}</Text>
                                                    <Text style={styles.pastActivityMeta}>
                                                        {displayInfo.displayText} • {formatDate(item.date_day)}
                                                    </Text>
                                                    <View style={styles.pastActivityParticipants}>
                                                        <Users stroke="#B8A5C4" width={14} height={14} />
                                                        <Text style={styles.pastActivityParticipantText}>
                                                            {item.participants?.length || 0} participants
                                                        </Text>
                                                    </View>
                                                </View>
                                                <ChevronRight stroke="#B8A5C4" width={20} height={20} />
                                            </TouchableOpacity>
                                        );
                                    })}
                            </View>
                        )}
                    </ScrollView>
                </SafeAreaView>
            </Modal>

            {/* Blocked Users Modal */}
            <Modal
                visible={showBlockedUsersModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowBlockedUsersModal(false)}
            >
                <SafeAreaView style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowBlockedUsersModal(false)}
                        >
                            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Blocked Users</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    {loadingBlockedUsers ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#9261E5" />
                            <Text style={styles.loadingText}>Loading blocked users...</Text>
                        </View>
                    ) : blockedUsers.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Shield size={48} color="#666" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyStateTitle}>No Blocked Users</Text>
                            <Text style={styles.emptyStateText}>
                                Users you block will appear here
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.modalContent}>
                            {blockedUsers.map((blockedUser) => (
                                <View key={blockedUser.id} style={styles.blockedUserItem}>
                                    <View style={styles.blockedUserInfo}>
                                        <Image 
                                            source={
                                                blockedUser.profilePic ? 
                                                { uri: `${API_URL}${blockedUser.profilePic}` } :
                                                require('../assets/Weird5.jpg')
                                            }
                                            style={styles.blockedUserAvatar}
                                        />
                                        <View style={styles.blockedUserDetails}>
                                            <Text style={styles.blockedUserName}>
                                                {blockedUser.name}
                                            </Text>
                                            <Text style={styles.blockedUserEmail}>
                                                {blockedUser.email}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.unblockButton}
                                        onPress={() => handleUnblockUser(blockedUser.id, blockedUser.name)}
                                    >
                                        <Text style={styles.unblockButtonText}>Unblock</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>

            {/* Preferences Modal */}
            <PreferencesModal
                visible={showPreferencesModal}
                onClose={() => setShowPreferencesModal(false)}
                onSave={handleSavePreferences}
                initialFavorites={favoriteFood}
                initialDietary={preferences}
                saving={savingPreferences}
            />
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
    locationSection: {
        marginBottom: 24,
    },
    locationDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingVertical: 8,
    },
    locationInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    locationText: {
        color: '#fff',
        fontSize: 16,
        marginLeft: 8,
        fontWeight: '500',
    },
    locationEditContainer: {
        marginTop: 12,
    },
    preferencesSection: {
        marginBottom: 24,
    },
    preferencesCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: colors.purple3,
    },
    preferencesCardContent: {
        flex: 1,
        marginRight: 12,
    },
    preferencesRow: {
        marginBottom: 8,
    },
    preferencesLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9261E5',
        marginBottom: 4,
    },
    preferencesValue: {
        fontSize: 14,
        color: '#fff',
        fontWeight: '500',
        lineHeight: 20,
    },
    preferencesPlaceholder: {
        fontSize: 14,
        color: '#B8A5C4',
        fontStyle: 'italic',
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
        backgroundColor: '#9333EA',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    disabledButton: {
        backgroundColor: '#6b6b6b',
        opacity: 0.5,
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
    pastActivitiesButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(78, 205, 196, 0.3)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 20,
        gap: 12,
    },

    pastActivitiesButtonContent: {
        flex: 1,
    },

    pastActivitiesButtonText: {
        color: '#4ECDC4',
        fontSize: 16,
        fontWeight: '600',
    },

    pastActivitiesButtonCount: {
        color: '#4ECDC4',
        fontSize: 12,
        fontWeight: '500',
        opacity: 0.8,
        marginTop: 2,
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
    privacyButton: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: colors.cardBackground,
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        marginTop: 10,
        borderWidth: 1,
        borderColor: colors.purple3,
    },
    privacyButtonText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
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
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: '#201925',
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

    // Modal content styles
    modalCard: {
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 16,
        padding: 20,
        margin: 16,
        borderWidth: 1,
        borderColor: 'rgba(78, 205, 196, 0.3)',
        alignItems: 'center',
    },

    modalCardTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },

    modalCardText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 20,
    },

    modalButton: {
        backgroundColor: '#4ECDC4',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 12,
        alignItems: 'center',
    },

    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },

    modalListContainer: {
        padding: 16,
    },

    pastActivityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.5)',
    },

    pastActivityIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(185, 84, 236, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
    },

    pastActivityContent: {
        flex: 1,
        marginRight: 12,
    },

    pastActivityTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },

    pastActivityMeta: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '500',
        marginBottom: 6,
    },

    pastActivityParticipants: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    pastActivityParticipantText: {
        color: '#B8A5C4',
        fontSize: 12,
        fontWeight: '500',
    },

    modalHeaderSpacer: {
        width: 40,
    },

    modalContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },

    modalContent: {
        flex: 1,
        backgroundColor: '#201925',
    },

    // Blocked Users Modal Styles
    blockedUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(146, 97, 229, 0.1)',
    },
    blockedUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    blockedUserAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },
    blockedUserDetails: {
        flex: 1,
    },
    blockedUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },
    blockedUserEmail: {
        fontSize: 14,
        color: '#B8A5C4',
    },
    unblockButton: {
        backgroundColor: 'rgba(146, 97, 229, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
    },
    unblockButtonText: {
        color: '#9261E5',
        fontSize: 14,
        fontWeight: '600',
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    loadingText: {
        color: '#B8A5C4',
        fontSize: 16,
        marginTop: 12,
    },
    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#B8A5C4',
        textAlign: 'center',
    },

    // Profile Completion Banner Styles
    completionBanner: {
        backgroundColor: 'rgba(185, 84, 236, 0.12)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        borderWidth: 2,
        borderColor: 'rgba(185, 84, 236, 0.3)',
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 4,
    },

    completionHeader: {
        marginBottom: 16,
    },

    completionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },

    completionSubtitle: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        fontWeight: '500',
        lineHeight: 20,
    },

    completionBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },

    completionBar: {
        flex: 1,
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 4,
        overflow: 'hidden',
    },

    completionFill: {
        height: '100%',
        backgroundColor: '#B954EC',
        borderRadius: 4,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 4,
    },

    completionPercentage: {
        fontSize: 16,
        fontWeight: '700',
        color: '#B954EC',
        minWidth: 45,
        textAlign: 'right',
        fontFamily: 'Montserrat_700Bold',
    },

    missingItems: {
        gap: 8,
    },

    missingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    missingItemBullet: {
        color: '#FFE66D',
        fontSize: 18,
        lineHeight: 20,
        fontWeight: '700',
    },

    missingItemText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '500',
        flex: 1,
    },
});