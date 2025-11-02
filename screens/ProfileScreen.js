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
    StatusBar,
    ActivityIndicator,
    Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import { ArrowLeft, Settings, Edit3, MapPin, Calendar, X, Activity, Users, ChevronRight } from 'react-native-feather';
import { Hamburger, Martini, Dices } from 'lucide-react-native';
import { logger } from '../utils/logger';
import { getUserDisplayImage } from '../utils/avatarManager';
import * as ImagePicker from 'expo-image-picker';
import colors from '../styles/Colors';
import PreferencesModal from '../components/PreferencesModal';
import ProfileHeaderCard from '../components/ProfileHeaderCard';
import ProfileCompletionBanner from '../components/ProfileCompletionBanner';
import FoodPreferencesSection from '../components/FoodPreferencesSection';
import CommunityMembersSection from '../components/CommunityMembersSection';
import PastActivitiesSection from '../components/PastActivitiesSection';

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
    const { user, setUser, updateUser } = useContext(UserContext);
    const navigation = useNavigation();
    const [showPastActivitiesModal, setShowPastActivitiesModal] = useState(false);
    const [showCommunityModal, setShowCommunityModal] = useState(false);
    const [showPreferencesModal, setShowPreferencesModal] = useState(false);

    // Profile editing states
    const [preferences, setPreferences] = useState(user?.preferences || '');
    const [favoriteFood, setFavoriteFood] = useState(user?.favorite_food || '');
    const [barPreferences, setBarPreferences] = useState(user?.bar_preferences || '');
    const [savingPreferences, setSavingPreferences] = useState(false);

    // Name editing states
    const [showEditNameModal, setShowEditNameModal] = useState(false);
    const [editedName, setEditedName] = useState(user?.name || '');
    const [savingName, setSavingName] = useState(false);

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

    // Calculate community members - unique users from all activities
    const communityMembers = useMemo(() => {
        const membersMap = new Map();

        // Process activities you created
        user?.activities?.forEach(activity => {
            if (!activity) return;

            // Add participants from your activities (using participants array)
            activity.participants?.forEach(p => {
                if (p.id !== user?.id) {
                    const userId = p.id;
                    if (!membersMap.has(userId)) {
                        membersMap.set(userId, {
                            id: userId,
                            name: p.name,
                            email: p.email,
                            avatar: p.avatar,
                            profile_image: p.profile_image,
                            profile_pic_url: p.profile_pic_url,
                            city: p.city,
                            state: p.state,
                            created_at: p.created_at,
                            activitiesTogether: 0
                        });
                    }
                    membersMap.get(userId).activitiesTogether += 1;
                }
            });
        });

        // Process activities where you're a participant
        user?.participant_activities?.forEach(pa => {
            const activity = pa.activity;
            if (!activity) return;

            // Add the host/owner of the activity
            if (activity.user && activity.user.id !== user?.id) {
                const userId = activity.user.id;
                if (!membersMap.has(userId)) {
                    membersMap.set(userId, {
                        id: userId,
                        name: activity.user.name,
                        email: activity.user.email,
                        avatar: activity.user.avatar,
                        profile_image: activity.user.profile_image,
                        profile_pic_url: activity.user.profile_pic_url,
                        city: activity.user.city,
                        state: activity.user.state,
                        created_at: activity.user.created_at,
                        activitiesTogether: 0
                    });
                }
                membersMap.get(userId).activitiesTogether += 1;
            }

            // Add other participants from these activities
            activity.participants?.forEach(p => {
                if (p.id !== user?.id) {
                    const userId = p.id;
                    if (!membersMap.has(userId)) {
                        membersMap.set(userId, {
                            id: userId,
                            name: p.name,
                            email: p.email,
                            avatar: p.avatar,
                            profile_image: p.profile_image,
                            profile_pic_url: p.profile_pic_url,
                            city: p.city,
                            state: p.state,
                            created_at: p.created_at,
                            activitiesTogether: 0
                        });
                    }
                    membersMap.get(userId).activitiesTogether += 1;
                }
            });
        });

        return Array.from(membersMap.values()).sort((a, b) =>
            b.activitiesTogether - a.activitiesTogether
        );
    }, [user?.activities, user?.participant_activities, user?.id]);

    // Calculate profile completion
    const profileCompletion = useMemo(() => {
        let completed = 0;
        const total = 6;

        if (user?.name) completed++;
        if (user?.email) completed++;
        if (user?.city && user?.state) completed++;
        if (user?.favorite_food) completed++;
        if (user?.preferences) completed++;
        if (user?.bar_preferences) completed++;

        const percentage = (completed / total) * 100;

        const missing = [];
        if (!user?.city || !user?.state) missing.push('Set your location');
        if (!user?.favorite_food) missing.push('Add favorite foods');
        if (!user?.preferences) missing.push('Set dietary preferences');
        if (!user?.bar_preferences) missing.push('Add bar preferences');

        return { completed, total, percentage, missing };
    }, [user]);

    const getDisplayImage = (userObj) => {
        return getUserDisplayImage(userObj, API_URL);
    };

    useEffect(() => {
        setPreferences(user?.preferences || '');
        setFavoriteFood(user?.favorite_food || '');
        setBarPreferences(user?.bar_preferences || '');
        setEditedName(user?.name || '');
    }, [user]);

    const handleSavePreferences = async (favoritesString, dietaryString, barPreferencesString) => {
        setSavingPreferences(true);

        try {
            logger.debug('Saving preferences:', { favoritesString, dietaryString, barPreferencesString });

            const updatedUser = await updateUser({
                preferences: dietaryString,
                favorite_food: favoritesString,
                bar_preferences: barPreferencesString,
            });

            logger.debug('Updated user response:', updatedUser);

            if (updatedUser) {
                setPreferences(updatedUser.preferences || '');
                setFavoriteFood(updatedUser.favorite_food || '');
                setBarPreferences(updatedUser.bar_preferences || '');

                logger.debug('Local state updated:', {
                    preferences: updatedUser.preferences,
                    favorite_food: updatedUser.favorite_food,
                    bar_preferences: updatedUser.bar_preferences
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

    const handleSaveName = async () => {
        if (!editedName.trim()) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }

        setSavingName(true);

        try {
            const updatedUser = await updateUser({ name: editedName.trim() });

            if (updatedUser) {
                setShowEditNameModal(false);
                Alert.alert('Success', 'Your name has been updated!');
            } else {
                Alert.alert('Error', 'Failed to update name. Please try again.');
            }
        } catch (error) {
            logger.error('Name update error:', error);
            Alert.alert('Error', 'Failed to update name. Please check your connection and try again.');
        } finally {
            setSavingName(false);
        }
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
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
                    <TouchableOpacity
                        style={styles.headerNameContainer}
                        onPress={() => {
                            setEditedName(user?.name || '');
                            setShowEditNameModal(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.headerTitle}>{user?.name || 'User'}</Text>
                        <View style={styles.editIconContainer}>
                            <Edit3 stroke="#B8A5C4" width={18} height={18} strokeWidth={2} />
                        </View>
                    </TouchableOpacity>
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
                {/* Profile Header Card */}
                <ProfileHeaderCard
                    user={user}
                    completedActivitiesCount={completedActivitiesList.length}
                    profileCompletion={profileCompletion}
                    userLocation={userLocation}
                    isEditingLocation={isEditingLocation}
                    uploadingPhoto={uploadingPhoto}
                    onPickImage={handlePickImage}
                    onLocationEditToggle={() => setIsEditingLocation(!isEditingLocation)}
                    onLocationSelect={handleLocationSelect}
                    onSaveLocation={handleSaveLocation}
                    onCancelLocationEdit={handleCancelLocationEdit}
                />

                {/* Profile Completion Banner */}
                <ProfileCompletionBanner profileCompletion={profileCompletion} />

                {/* Food & Bar Preferences Section */}
                <FoodPreferencesSection
                    favoriteFood={favoriteFood}
                    preferences={preferences}
                    barPreferences={barPreferences}
                    onPress={() => {
                        logger.debug('Opening preferences modal with:', { favoriteFood, preferences, barPreferences });
                        setShowPreferencesModal(true);
                    }}
                />

                {/* Community Members Section */}
                <CommunityMembersSection
                    communityMembers={communityMembers}
                    onPress={() => setShowCommunityModal(true)}
                />

                {/* Past Activities Section */}
                <PastActivitiesSection
                    completedActivitiesCount={completedActivitiesList.length}
                    onPress={() => setShowPastActivitiesModal(true)}
                />

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
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
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
                                        navigation.navigate('/', { openChat: true })
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

            {/* Community Members Modal */}
            <Modal
                visible={showCommunityModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowCommunityModal(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowCommunityModal(false)}
                        >
                            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Your Community</Text>
                        <View style={styles.modalHeaderSpacer} />
                    </View>

                    <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {communityMembers.length === 0 ? (
                            <View style={styles.modalCard}>
                                <Text style={styles.modalCardTitle}>No Community Members Yet</Text>
                                <Text style={styles.modalCardText}>
                                    Start creating activities and inviting friends to build your Voxxy community!
                                </Text>
                                <TouchableOpacity
                                    style={styles.modalButton}
                                    onPress={() => {
                                        setShowCommunityModal(false);
                                        navigation.navigate('/', { openChat: true });
                                    }}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.modalButtonText}>Create Your First Activity</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <View style={styles.modalListContainer}>
                                {communityMembers.map((member, index) => {
                                    const memberSince = member.created_at
                                        ? `Joined ${new Date(member.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}`
                                        : 'New member';

                                    const location = member.city && member.state
                                        ? `${member.city}, ${member.state}`
                                        : member.city || member.state || 'Location not set';

                                    return (
                                        <View
                                            key={member.id}
                                            style={[
                                                styles.communityMemberItem,
                                                index === communityMembers.length - 1 && { marginBottom: 0 }
                                            ]}
                                        >
                                            <Image
                                                source={getUserDisplayImage(member, API_URL)}
                                                style={styles.communityMemberAvatar}
                                            />
                                            <View style={styles.communityMemberContent}>
                                                <Text style={styles.communityMemberName}>{member.name}</Text>
                                                <View style={styles.communityMemberMeta}>
                                                    <MapPin stroke="#B8A5C4" width={12} height={12} />
                                                    <Text style={styles.communityMemberMetaText}>{location}</Text>
                                                </View>
                                                <View style={styles.communityMemberStats}>
                                                    <View style={styles.communityMemberStat}>
                                                        <Activity stroke="#FF6B6B" width={14} height={14} />
                                                        <Text style={styles.communityMemberStatText}>
                                                            {member.activitiesTogether} {member.activitiesTogether === 1 ? 'activity' : 'activities'} together
                                                        </Text>
                                                    </View>
                                                    <View style={styles.communityMemberStat}>
                                                        <Calendar stroke="#4ECDC4" width={14} height={14} />
                                                        <Text style={styles.communityMemberStatText}>
                                                            {memberSince}
                                                        </Text>
                                                    </View>
                                                </View>
                                            </View>
                                        </View>
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
                initialBarPreferences={barPreferences}
                saving={savingPreferences}
            />

            {/* Edit Name Modal */}
            <Modal
                visible={showEditNameModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowEditNameModal(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowEditNameModal(false)}
                        >
                            <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Edit Name</Text>
                        <View style={styles.modalHeaderSpacer} />
                    </View>

                    <View style={styles.editNameContent}>
                        <Text style={styles.editNameLabel}>Your Name</Text>
                        <TextInput
                            style={styles.editNameInput}
                            value={editedName}
                            onChangeText={setEditedName}
                            placeholder="Enter your name"
                            placeholderTextColor="#666"
                            autoFocus
                            returnKeyType="done"
                            onSubmitEditing={handleSaveName}
                        />
                        <Text style={styles.editNameHint}>
                            This is how your name will appear to other users
                        </Text>

                        <TouchableOpacity
                            style={[styles.saveNameButton, savingName && styles.saveNameButtonDisabled]}
                            onPress={handleSaveName}
                            disabled={savingName}
                            activeOpacity={0.8}
                        >
                            {savingName ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <Text style={styles.saveNameButtonText}>Save Name</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </Modal>
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

    settingsButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(146, 97, 229, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
        marginLeft: 16,
    },

    headerContent: {
        flex: 1,
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

    editIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(184, 165, 196, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(184, 165, 196, 0.3)',
    },

    headerSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    container: {
        paddingBottom: 20,
        backgroundColor: '#201925',
        flexGrow: 1,
        paddingHorizontal: 20,
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

    // Community Members Modal Styles
    communityMemberItem: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#2C1E33',
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.05)',
    },

    communityMemberAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        marginRight: 16,
        borderWidth: 2,
        borderColor: '#FF6B6B',
    },

    communityMemberContent: {
        flex: 1,
        justifyContent: 'center',
    },

    communityMemberName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },

    communityMemberMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },

    communityMemberMetaText: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '500',
    },

    communityMemberStats: {
        gap: 6,
    },

    communityMemberStat: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    communityMemberStatText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
        fontWeight: '500',
    },

    // Edit Name Modal Styles
    editNameContent: {
        padding: 24,
    },

    editNameLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
        fontFamily: 'Montserrat_600SemiBold',
    },

    editNameInput: {
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.3)',
        marginBottom: 12,
        fontFamily: 'Montserrat_500Medium',
    },

    editNameHint: {
        fontSize: 13,
        color: '#B8A5C4',
        marginBottom: 24,
        lineHeight: 18,
    },

    saveNameButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 52,
    },

    saveNameButtonDisabled: {
        opacity: 0.6,
    },

    saveNameButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
});
