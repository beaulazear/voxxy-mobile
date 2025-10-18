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
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import { ArrowLeft, Settings, Edit3, Camera, MapPin, Calendar, X, Activity, Users, ChevronRight } from 'react-native-feather';
import { Hamburger, Martini, Dices, Pizza, Coffee, Beef, Fish, Salad, Soup, Sandwich } from 'lucide-react-native';
import { logger } from '../utils/logger';
import { getUserDisplayImage } from '../utils/avatarManager';
import * as ImagePicker from 'expo-image-picker';
import LocationPicker from '../components/LocationPicker';
import colors from '../styles/Colors';
import PreferencesModal from '../components/PreferencesModal';

// Food options with icons (matching PreferencesModal)
const FOOD_OPTIONS = [
    { label: 'Pizza', value: 'Pizza', icon: Pizza, color: '#FF6B6B' },
    { label: 'Sushi', value: 'Sushi', icon: Fish, color: '#4ECDC4' },
    { label: 'Burgers', value: 'Burgers', icon: Sandwich, color: '#FFD93D' },
    { label: 'Tacos', value: 'Tacos', icon: Soup, color: '#FF9A3D' },
    { label: 'Pasta', value: 'Pasta', icon: Coffee, color: '#A8E6CF' },
    { label: 'Steak', value: 'Steak', icon: Beef, color: '#FF6B9D' },
    { label: 'Thai', value: 'Thai', icon: Soup, color: '#F4A460' },
    { label: 'Chinese', value: 'Chinese', icon: Coffee, color: '#FF7F50' },
    { label: 'Indian', value: 'Indian', icon: Soup, color: '#FFA500' },
    { label: 'Salads', value: 'Salads', icon: Salad, color: '#90EE90' },
    { label: 'BBQ', value: 'BBQ', icon: Beef, color: '#8B4513' },
    { label: 'Seafood', value: 'Seafood', icon: Fish, color: '#4682B4' },
];

const DIETARY_OPTIONS = [
    { label: 'Vegan', value: 'Vegan', color: '#90EE90' },
    { label: 'Vegetarian', value: 'Vegetarian', color: '#A8E6CF' },
    { label: 'Gluten-Free', value: 'Gluten-Free', color: '#FFD93D' },
    { label: 'Dairy-Free', value: 'Dairy-Free', color: '#4ECDC4' },
    { label: 'Nut Allergy', value: 'Nut Allergy', color: '#FF9A3D' },
    { label: 'Shellfish Allergy', value: 'Shellfish Allergy', color: '#FF6B9D' },
    { label: 'Kosher', value: 'Kosher', color: '#B8A5C4' },
    { label: 'Halal', value: 'Halal', color: '#9261E5' },
    { label: 'Pescatarian', value: 'Pescatarian', color: '#4682B4' },
    { label: 'Keto', value: 'Keto', color: '#FF6B6B' },
    { label: 'Paleo', value: 'Paleo', color: '#A0522D' },
    { label: 'Low-Carb', value: 'Low-Carb', color: '#DDA15E' },
];

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

// Helper to match preference strings (case-insensitive, ignores hyphens/spaces)
const matchesOption = (input, optionValue) => {
    const normalizedInput = input.toLowerCase().trim();
    const normalizedOption = optionValue.toLowerCase().trim();
    if (normalizedInput === normalizedOption) return true;
    const inputNoSpaces = normalizedInput.replace(/[-\s]/g, '');
    const optionNoSpaces = normalizedOption.replace(/[-\s]/g, '');
    return inputNoSpaces === optionNoSpaces;
};

// Parse comma-separated preferences into structured items
const parsePreferences = (prefsString, optionsArray) => {
    if (!prefsString) return { matched: [], custom: [] };

    const items = prefsString.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const matched = [];
    const custom = [];

    items.forEach(item => {
        const matchedOption = optionsArray.find(opt => matchesOption(item, opt.value));
        if (matchedOption) {
            matched.push(matchedOption);
        } else {
            custom.push(item);
        }
    });

    return { matched, custom };
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
    const { user, setUser, updateUser } = useContext(UserContext);
    const navigation = useNavigation();
    const [showPastActivitiesModal, setShowPastActivitiesModal] = useState(false);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);

    // Profile editing states
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
    const [uploadingPhoto, setUploadingPhoto] = useState(false);

    const token = user?.token;

    // Calculate completed activities
    const completedActivitiesList = useMemo(() => {
        const myActivities = user?.activities?.filter(a => a.completed) || [];
        const participantActivities = user?.participant_activities
            ?.filter(p => p.accepted && p.activity?.completed)
            .map(p => p.activity) || [];

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

        const missing = [];
        if (!user?.city || !user?.state) missing.push('Set your location');
        if (!user?.favorite_food) missing.push('Add favorite foods');
        if (!user?.preferences) missing.push('Set dietary preferences');

        return { completed, total, percentage, missing };
    }, [user]);

    const getDisplayImage = (userObj) => {
        return getUserDisplayImage(userObj, API_URL);
    };

    useEffect(() => {
        setNewName(user?.name || '');
        setPreferences(user?.preferences || '');
        setFavoriteFood(user?.favorite_food || '');
    }, [user]);

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
                },
                body: formData,
            });

            const json = await response.json();

            if (response.ok) {
                updateUser(json);
                Alert.alert(
                    'Success',
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

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />

            {/* Header with back and settings button */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    {!isEditingName ? (
                        <View style={styles.headerNameContainer}>
                            <Text style={styles.headerTitle}>{user?.name || 'User'}</Text>
                            <TouchableOpacity
                                style={styles.headerEditButton}
                                onPress={() => setIsEditingName(true)}
                                activeOpacity={0.7}
                            >
                                <Edit3 stroke="#9261E5" width={20} height={20} strokeWidth={2} />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.headerEditContainer}>
                            <TextInput
                                style={styles.headerNameInput}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter your name"
                                placeholderTextColor="#666"
                                autoFocus
                            />
                            <View style={styles.headerEditActions}>
                                <TouchableOpacity
                                    style={styles.headerSaveButton}
                                    onPress={handleSaveName}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.headerSaveText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={styles.headerCancelButton}
                                    onPress={handleCancelEdit}
                                    activeOpacity={0.7}
                                >
                                    <Text style={styles.headerCancelText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </View>
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('Settings')}
                    activeOpacity={0.7}
                >
                    <Settings stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header Card - LinkedIn style */}
                <View style={styles.profileHeaderCard}>
                    {/* Profile Info */}
                    <View style={styles.profileInfo}>
                        {/* Info Row with Avatar and Details */}
                        <View style={styles.profileInfoRow}>
                            {/* Avatar */}
                            <TouchableOpacity
                                style={styles.avatarContainerInline}
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
                                        <Camera stroke="#fff" width={14} height={14} strokeWidth={2} />
                                    )}
                                </View>
                            </TouchableOpacity>

                            {/* Email and Location */}
                            <View style={styles.profileDetails}>
                                <View style={styles.detailItem}>
                                    <Text style={styles.detailText}>{user?.email}</Text>
                                </View>
                                <View style={styles.locationRow}>
                                    {userLocation?.formatted ? (
                                        <View style={styles.detailItem}>
                                            <MapPin stroke="#B8A5C4" width={14} height={14} strokeWidth={2} />
                                            <Text style={styles.detailText}>{userLocation.formatted}</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.detailItem}>
                                            <MapPin stroke="#9261E5" width={14} height={14} strokeWidth={2} />
                                            <Text style={[styles.detailText, { color: '#9261E5' }]}>Add location</Text>
                                        </View>
                                    )}
                                    <TouchableOpacity
                                        style={styles.locationEditButton}
                                        onPress={() => setIsEditingLocation(!isEditingLocation)}
                                        activeOpacity={0.7}
                                    >
                                        <Edit3 stroke="#9261E5" width={16} height={16} strokeWidth={2} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>

                        {/* Location Editor Dropdown - Below entire row */}
                        {isEditingLocation && (
                            <View style={styles.locationEditorDropdown}>
                                <LocationPicker
                                    onLocationSelect={handleLocationSelect}
                                    currentLocation={userLocation}
                                />
                                <View style={styles.locationEditorActions}>
                                    <TouchableOpacity
                                        style={styles.locationSaveButton}
                                        onPress={() => {
                                            handleSaveLocation();
                                        }}
                                        disabled={!userLocation}
                                    >
                                        <Text style={styles.locationSaveText}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.locationCancelButton}
                                        onPress={handleCancelLocationEdit}
                                    >
                                        <Text style={styles.locationCancelText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}

                        {/* Stats Row */}
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{completedActivitiesList.length}</Text>
                                <Text style={styles.statLabel}>Activities</Text>
                            </View>
                            <View style={styles.statDivider} />
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>{Math.round(profileCompletion.percentage)}%</Text>
                                <Text style={styles.statLabel}>Complete</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Profile Completion Banner */}
                {profileCompletion.percentage < 100 && (
                    <View style={styles.completionBanner}>
                        <View style={styles.completionHeader}>
                            <Text style={styles.completionTitle}>
                                Complete Your Profile
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

                {/* About Section */}
                <View style={styles.sectionCard}>
                    <Text style={styles.sectionTitle}>About</Text>

                    {/* Location */}
                    <View style={styles.aboutItem}>
                        <MapPin stroke="#9261E5" width={20} height={20} strokeWidth={2} />
                        {!isEditingLocation ? (
                            <View style={styles.aboutItemContent}>
                                <Text style={styles.aboutItemLabel}>Location</Text>
                                <Text style={styles.aboutItemValue}>
                                    {userLocation?.formatted || 'Not set'}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.locationEditContainer}>
                                <LocationPicker
                                    onLocationSelect={handleLocationSelect}
                                    currentLocation={userLocation}
                                />
                                <View style={styles.editButtonGroup}>
                                    <TouchableOpacity
                                        style={styles.saveButton}
                                        onPress={handleSaveLocation}
                                        disabled={!userLocation}
                                    >
                                        <Text style={styles.saveButtonText}>Save</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.cancelButton}
                                        onPress={handleCancelLocationEdit}
                                    >
                                        <Text style={styles.cancelButtonText}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                        {!isEditingLocation && (
                            <TouchableOpacity
                                style={styles.editIconButton}
                                onPress={() => setIsEditingLocation(true)}
                            >
                                <Edit3 stroke="#9261E5" width={16} height={16} strokeWidth={2} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Food Preferences Section */}
                <TouchableOpacity
                    style={styles.sectionCard}
                    onPress={() => {
                        logger.debug('Opening preferences modal with:', { favoriteFood, preferences });
                        setShowPreferencesModal(true);
                    }}
                    activeOpacity={0.8}
                >
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Food Preferences</Text>
                        <ChevronRight stroke="#9261E5" width={20} height={20} strokeWidth={2} />
                    </View>

                    {favoriteFood || preferences ? (
                        <>
                            {favoriteFood && (() => {
                                const { matched, custom } = parsePreferences(favoriteFood, FOOD_OPTIONS);
                                return (
                                    <View style={styles.preferenceSection}>
                                        <Text style={styles.preferenceSectionLabel}>Favorites</Text>
                                        <View style={styles.preferencePillsContainer}>
                                            {matched.map((option, index) => {
                                                const IconComponent = option.icon;
                                                return (
                                                    <View
                                                        key={`food-${index}`}
                                                        style={[styles.preferencePill, { borderColor: option.color }]}
                                                    >
                                                        {IconComponent && (
                                                            <IconComponent
                                                                color={option.color}
                                                                size={16}
                                                                strokeWidth={2}
                                                            />
                                                        )}
                                                        <Text style={styles.preferencePillText}>{option.label}</Text>
                                                    </View>
                                                );
                                            })}
                                            {custom.map((item, index) => (
                                                <View
                                                    key={`custom-food-${index}`}
                                                    style={[styles.preferencePill, styles.customPreferencePill]}
                                                >
                                                    <Text style={styles.preferencePillText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })()}
                            {preferences && (() => {
                                const { matched, custom } = parsePreferences(preferences, DIETARY_OPTIONS);
                                return (
                                    <View style={[styles.preferenceSection, favoriteFood && { marginTop: 16 }]}>
                                        <Text style={styles.preferenceSectionLabel}>Dietary</Text>
                                        <View style={styles.preferencePillsContainer}>
                                            {matched.map((option, index) => (
                                                <View
                                                    key={`dietary-${index}`}
                                                    style={[styles.preferencePill, { borderColor: option.color }]}
                                                >
                                                    <Text style={styles.preferencePillText}>{option.label}</Text>
                                                </View>
                                            ))}
                                            {custom.map((item, index) => (
                                                <View
                                                    key={`custom-dietary-${index}`}
                                                    style={[styles.preferencePill, styles.customPreferencePill]}
                                                >
                                                    <Text style={styles.preferencePillText}>{item}</Text>
                                                </View>
                                            ))}
                                        </View>
                                    </View>
                                );
                            })()}
                        </>
                    ) : (
                        <Text style={styles.preferencesPlaceholder}>
                            Tap to set your food preferences
                        </Text>
                    )}
                </TouchableOpacity>

                {/* Past Activities Section */}
                <TouchableOpacity
                    style={styles.sectionCard}
                    onPress={() => setShowPastActivitiesModal(true)}
                    activeOpacity={0.8}
                >
                    <View style={styles.sectionHeader}>
                        <Calendar stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
                        <Text style={[styles.sectionTitle, { marginLeft: 12, flex: 1 }]}>Past Activities</Text>
                        <View style={styles.activityBadge}>
                            <Text style={styles.activityBadgeText}>{completedActivitiesList.length}</Text>
                        </View>
                        <ChevronRight stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
                    </View>
                    <Text style={styles.sectionSubtitle}>
                        View your activity history
                    </Text>
                </TouchableOpacity>

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
    },

    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(146, 97, 229, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
    },

    headerContent: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerNameContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },

    headerEditButton: {
        padding: 4,
    },

    headerEditContainer: {
        width: '100%',
        alignItems: 'center',
        gap: 8,
    },

    headerNameInput: {
        backgroundColor: 'rgba(0, 0, 0, 0.2)',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#9261E5',
        borderRadius: 8,
        padding: 8,
        fontSize: 18,
        textAlign: 'center',
        width: '80%',
        fontFamily: 'Montserrat_700Bold',
    },

    headerEditActions: {
        flexDirection: 'row',
        gap: 8,
    },

    headerSaveButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
    },

    headerSaveText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },

    headerCancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 6,
        paddingHorizontal: 16,
        borderRadius: 8,
    },

    headerCancelText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },

    container: {
        paddingBottom: 20,
        backgroundColor: '#201925',
        flexGrow: 1,
        paddingHorizontal: 20,
    },

    // LinkedIn-style Profile Header Card
    profileHeaderCard: {
        backgroundColor: '#2A1E30',
        borderRadius: 20,
        marginBottom: 20,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 12,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
    },


    avatarContainerInline: {
        position: 'relative',
        marginRight: 16,
    },

    avatar: {
        width: 100,
        height: 100,
        borderRadius: 50,
        borderWidth: 4,
        borderColor: '#2A1E30',
    },

    avatarEditIndicator: {
        position: 'absolute',
        bottom: 2,
        right: 2,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#9261E5',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 3,
        borderColor: '#2A1E30',
    },

    uploadingText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: 'bold',
    },

    profileInfo: {
        paddingTop: 12,
        paddingHorizontal: 20,
        paddingBottom: 20,
    },

    profileInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },

    profileDetails: {
        flex: 1,
        gap: 8,
        justifyContent: 'center',
    },

    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flexShrink: 1,
    },

    detailText: {
        color: '#B8A5C4',
        fontSize: 14,
        fontWeight: '500',
        flexShrink: 1,
        flexWrap: 'wrap',
    },

    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },

    locationEditButton: {
        padding: 4,
    },

    locationEditorDropdown: {
        marginTop: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: '#9261E5',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    locationEditorActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },

    locationSaveButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },

    locationSaveText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    locationCancelButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 8,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },

    locationCancelText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },

    statsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },

    statItem: {
        flex: 1,
        alignItems: 'center',
    },

    statNumber: {
        fontSize: 20,
        fontWeight: '700',
        color: '#9261E5',
        marginBottom: 4,
        fontFamily: 'Montserrat_700Bold',
    },

    statLabel: {
        fontSize: 13,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },

    // Section Cards
    sectionCard: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.15)',
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },

    sectionSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        marginTop: 4,
    },

    // About Section
    aboutItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
    },

    aboutItemContent: {
        flex: 1,
        marginLeft: 12,
    },

    aboutItemLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9261E5',
        marginBottom: 4,
    },

    aboutItemValue: {
        fontSize: 15,
        color: '#fff',
        fontWeight: '500',
    },

    locationEditContainer: {
        flex: 1,
        marginLeft: 12,
    },

    // Preferences - New Pill Style
    preferenceSection: {
        marginTop: 8,
    },

    preferenceSectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9261E5',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    preferencePillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },

    preferencePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(146, 97, 229, 0.12)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#9261E5',
        gap: 6,
    },

    customPreferencePill: {
        backgroundColor: 'rgba(184, 165, 196, 0.15)',
        borderColor: '#B8A5C4',
    },

    preferencePillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },

    preferencesPlaceholder: {
        fontSize: 14,
        color: '#B8A5C4',
        fontStyle: 'italic',
    },

    // Activity Badge
    activityBadge: {
        backgroundColor: 'rgba(78, 205, 196, 0.2)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginRight: 8,
    },

    activityBadgeText: {
        color: '#4ECDC4',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },

    // Profile Completion Banner
    completionBanner: {
        backgroundColor: 'rgba(255, 230, 109, 0.08)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 2,
        borderColor: 'rgba(255, 230, 109, 0.3)',
    },

    completionHeader: {
        marginBottom: 16,
    },

    completionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFE66D',
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
        marginBottom: 16,
    },

    completionBar: {
        height: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 4,
        overflow: 'hidden',
    },

    completionFill: {
        height: '100%',
        backgroundColor: '#FFE66D',
        borderRadius: 4,
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

    // Loading Overlay
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
        fontFamily: 'Montserrat_600SemiBold',
    },

    loadingSubtext: {
        color: '#999',
        fontSize: 14,
        marginTop: 4,
        fontFamily: 'Montserrat_400Regular',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#201925',
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

    modalHeaderSpacer: {
        width: 40,
    },

    modalContent: {
        flex: 1,
        backgroundColor: '#201925',
    },

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
});
