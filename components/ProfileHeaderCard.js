import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    ActivityIndicator,
    TextInput,
} from 'react-native';
import { Camera, Edit3, Check, X } from 'react-native-feather';
import LocationPicker from './LocationPicker';
import { logger } from '../utils/logger';
import { getUserDisplayImage } from '../utils/avatarManager';
import { API_URL } from '../config';

export default function ProfileHeaderCard({
    user,
    completedActivitiesCount,
    profileCompletion,
    userLocation,
    isEditingLocation,
    uploadingPhoto,
    onPickImage,
    onLocationEditToggle,
    onLocationSelect,
    onSaveLocation,
    onCancelLocationEdit,
    editedName,
    onNameChange,
    onSaveName,
    savingName,
}) {
    const [isEditingName, setIsEditingName] = useState(false);
    const getDisplayImage = (userObj) => {
        return getUserDisplayImage(userObj, API_URL);
    };

    return (
        <View style={styles.profileHeaderCard}>
            <View style={styles.profileInfo}>
                {/* Info Row with Avatar and Details */}
                <View style={styles.profileInfoRow}>
                    {/* Avatar */}
                    <TouchableOpacity
                        style={styles.avatarContainerInline}
                        onPress={onPickImage}
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

                    {/* Name, Email and Location */}
                    <View style={styles.profileDetails}>
                        {/* Name Row */}
                        {isEditingName ? (
                            <View style={styles.nameEditRow}>
                                <TextInput
                                    style={styles.nameInput}
                                    value={editedName}
                                    onChangeText={onNameChange}
                                    placeholder="Enter your name"
                                    placeholderTextColor="#666"
                                    autoFocus
                                />
                                <View style={styles.nameEditActions}>
                                    <TouchableOpacity
                                        style={styles.nameActionButton}
                                        onPress={() => {
                                            onSaveName();
                                            setIsEditingName(false);
                                        }}
                                        disabled={savingName}
                                    >
                                        {savingName ? (
                                            <ActivityIndicator size="small" color="#4ECDC4" />
                                        ) : (
                                            <Check stroke="#4ECDC4" width={16} height={16} strokeWidth={2.5} />
                                        )}
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={styles.nameActionButton}
                                        onPress={() => {
                                            onNameChange(user?.name || '');
                                            setIsEditingName(false);
                                        }}
                                        disabled={savingName}
                                    >
                                        <X stroke="#FF6B6B" width={16} height={16} strokeWidth={2.5} />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.nameRow}>
                                <Text style={styles.nameText}>{user?.name || 'Add name'}</Text>
                                <TouchableOpacity
                                    style={styles.nameEditButton}
                                    onPress={() => setIsEditingName(true)}
                                    activeOpacity={0.7}
                                >
                                    <Edit3 stroke="#9261E5" width={16} height={16} strokeWidth={2} />
                                </TouchableOpacity>
                            </View>
                        )}

                        {/* Email */}
                        <View style={styles.detailItem}>
                            <Text style={styles.detailText}>{user?.email}</Text>
                        </View>

                        {/* Location Row */}
                        <View style={styles.locationRow}>
                            {userLocation?.formatted ? (
                                <Text style={styles.detailText}>{userLocation.formatted}</Text>
                            ) : (
                                <Text style={[styles.detailText, { color: '#9261E5' }]}>Add location</Text>
                            )}
                            <TouchableOpacity
                                style={styles.locationEditButton}
                                onPress={onLocationEditToggle}
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
                            onLocationSelect={onLocationSelect}
                            currentLocation={userLocation}
                        />
                        <View style={styles.locationEditorActions}>
                            <TouchableOpacity
                                style={styles.locationSaveButton}
                                onPress={onSaveLocation}
                                disabled={!userLocation}
                            >
                                <Text style={styles.locationSaveText}>Save</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.locationCancelButton}
                                onPress={onCancelLocationEdit}
                            >
                                <Text style={styles.locationCancelText}>Cancel</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Stats Row */}
                <View style={styles.statsRow}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>{completedActivitiesCount}</Text>
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
    );
}

const styles = StyleSheet.create({
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
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    nameText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        flexShrink: 1,
        flexWrap: 'wrap',
    },
    nameEditButton: {
        padding: 4,
    },
    nameEditRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flexShrink: 1,
    },
    nameInput: {
        flex: 1,
        backgroundColor: 'rgba(42, 30, 46, 0.8)',
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.3)',
        fontFamily: 'Montserrat_600SemiBold',
    },
    nameEditActions: {
        flexDirection: 'row',
        gap: 6,
    },
    nameActionButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
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
});
