import React, { useState, useEffect, useContext } from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    Modal,
    ScrollView,
    TextInput,
    Alert,
    FlatList,
} from 'react-native'
import {
    Users,
    Plus,
    Eye,
    X,
    CheckCircle,
    XCircle,
    Clock,
    Star
} from 'react-native-feather'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

import DefaultIcon from '../assets/icon.png'

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

export default function ParticipantsSection({
    activity,
    votes = [],
    isOwner,
    onInvite,
    onRemoveParticipant
}) {
    const { user } = useContext(UserContext)
    const [showInviteModal, setShowInviteModal] = useState(false)
    const [showAllParticipants, setShowAllParticipants] = useState(false)
    const [manualInput, setManualInput] = useState('')
    const [manualEmails, setManualEmails] = useState([])

    const { responses = [] } = activity

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
        if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
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
        return DefaultIcon
    }

    // Build participants arrays
    const participantsArray = Array.isArray(activity.participants) ? activity.participants : []
    const pendingInvitesArray = Array.isArray(activity.activity_participants)
        ? activity.activity_participants.filter(p => !p.accepted)
        : []

    const hostParticipant = {
        name: `${activity.user?.name || "Unknown"}`,
        email: activity.user?.email || "N/A",
        confirmed: true,
        avatar: DefaultIcon,
        profile_pic_url: activity.user?.profile_pic_url,
        created_at: activity.user?.created_at,
        apId: activity.user?.id,
        isHost: true
    }

    const allParticipants = [
        hostParticipant,
        ...participantsArray
            .filter(p => p.email)
            .map(p => ({
                name: p.name || p.email,
                email: p.email,
                confirmed: true,
                avatar: p.avatar || DefaultIcon,
                profile_pic_url: p.profile_pic_url,
                created_at: p.created_at,
                apId: p.id,
                isHost: false
            })),
        ...pendingInvitesArray.map(p => ({
            name: 'Invite Pending',
            email: p.invited_email,
            confirmed: false,
            avatar: DefaultIcon,
            profile_pic_url: null,
            created_at: null,
            apId: p.id,
            isHost: false
        })),
    ]

    // Debug logging
    console.log('📊 ParticipantsSection Debug:', {
        activityId: activity.id,
        totalParticipants: allParticipants.length,
        confirmedParticipants: allParticipants.filter(p => p.confirmed).length,
        pendingInvites: allParticipants.filter(p => !p.confirmed).length,
        participants: allParticipants.map(p => ({
            name: p.name,
            email: p.email,
            avatar: p.avatar,
            profile_pic_url: p.profile_pic_url
        }))
    })

    // Helper functions for tracking responses and votes
    const hasVoted = (participant) => {
        if (!participant.confirmed || !participant.apId) return false

        if (activity.activity_type === 'Meeting') {
            return votes.some(slot => slot.voter_ids && slot.voter_ids.includes(participant.apId))
        }

        if (activity.activity_type === 'Restaurant') {
            return votes.some(restaurant =>
                restaurant.voters && restaurant.voters.some(voter => voter.id === participant.apId)
            )
        }

        return false
    }

    const hasResponded = (participant) =>
        participant.confirmed && responses.some(r => r.user_id === participant.apId)

    const totalToRespond = allParticipants.length
    const responsesCount = allParticipants.filter(p =>
        responses.some(r => r.user_id === p.apId)
    ).length
    const votesCount = allParticipants.filter(p => hasVoted(p)).length

    // Auto-show invite modal if no participants
    useEffect(() => {
        if (!isOwner) return
        const hasParticipants = participantsArray.length > 0 || pendingInvitesArray.length > 0
        if (!hasParticipants) {
            const timer = setTimeout(() => {
                setShowInviteModal(true)
            }, 500)
            return () => clearTimeout(timer)
        }
    }, [isOwner, participantsArray.length, pendingInvitesArray.length])

    const handleInviteClick = () => {
        setManualInput('')
        setManualEmails([])
        setShowInviteModal(true)
    }

    const handleAddEmail = () => {
        const email = manualInput.trim().toLowerCase()
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            Alert.alert('Invalid Email', 'Please enter a valid email address.')
            return
        }
        if (manualEmails.includes(email)) {
            Alert.alert('Duplicate Email', "You've already added that email.")
            return
        }
        setManualEmails(prev => [...prev, email])
        setManualInput('')
    }

    const handleRemoveEmail = (index) => {
        setManualEmails(prev => prev.filter((_, i) => i !== index))
    }

    const handleInviteSubmit = () => {
        if (manualEmails.length === 0) {
            Alert.alert('No Emails', 'Please add at least one email address.')
            return
        }

        manualEmails.forEach(email => {
            onInvite(email)
        })

        Alert.alert('Success', 'Invitation(s) sent!')
        setShowInviteModal(false)
    }

    const handleRemoveParticipant = (participant) => {
        Alert.alert(
            'Remove Participant',
            `Are you sure you want to remove ${participant.name} from this activity?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Remove',
                    style: 'destructive',
                    onPress: () => onRemoveParticipant(participant)
                }
            ]
        )
    }

    const renderParticipantAvatar = ({ item, index }) => {
        return (
            <View style={[styles.participantAvatar, item.isHost && styles.hostAvatar, !item.confirmed && styles.pendingAvatar]}>
                <Image
                    source={getDisplayImage(item)}  // ✅ Fixed: was getImageSource(item)
                    style={styles.avatarImage}
                    onError={() => console.log(`❌ Avatar failed to load for ${item.name}`)}
                    onLoad={() => console.log(`✅ Avatar loaded for ${item.name}`)}
                    defaultSource={DefaultIcon}
                />

                {item.isHost && (
                    <View style={styles.hostIndicator}>
                        <Star stroke="#fff" width={10} height={10} fill="#fff" />
                    </View>
                )}

                {item.confirmed && hasResponded(item) && (
                    <View style={styles.responseIndicator}>
                        <CheckCircle stroke="#fff" width={12} height={12} />
                    </View>
                )}

                {!item.confirmed && (
                    <View style={styles.pendingIndicator}>
                        <Clock stroke="#fff" width={10} height={10} />
                    </View>
                )}
            </View>
        )
    }

    const renderParticipantListItem = ({ item, index }) => {
        console.log(`🧑‍🤝‍🧑 Rendering participant ${index}:`, item.name, item.email)

        return (
            <View style={styles.participantItem}>
                <View style={styles.participantInfo}>
                    <View style={styles.participantCircle}>
                        <Image
                            source={getDisplayImage(item)}  // ✅ Fixed: was getImageSource(item)
                            style={styles.participantImage}
                            onError={() => console.log(`❌ Failed to load image for ${item.name}`)}
                            onLoad={() => console.log(`✅ Image loaded for ${item.name}`)}
                            defaultSource={DefaultIcon}
                        />
                        {item.isHost && (
                            <View style={styles.hostIndicatorLarge}>
                                <Star stroke="#fff" width={12} height={12} fill="#fff" />
                            </View>
                        )}
                    </View>

                    <View style={styles.participantDetails}>
                        <Text style={styles.participantName}>
                            {item.name}{item.isHost && ' (Organizer)'}
                        </Text>

                        <View style={styles.statusRow}>
                            {hasResponded(item) ? (
                                <CheckCircle stroke="#10b981" width={14} height={14} />
                            ) : (
                                <XCircle stroke="#6b7280" width={14} height={14} />
                            )}
                            <Text style={styles.statusText}>
                                {hasResponded(item) ? 'Response submitted' : 'Waiting for response'}
                            </Text>

                            {hasVoted(item) ? (
                                <CheckCircle stroke="#8b5cf6" width={14} height={14} />
                            ) : (
                                <XCircle stroke="#6b7280" width={14} height={14} />
                            )}
                            <Text style={styles.statusText}>
                                {hasVoted(item) ? 'Vote cast' : 'No vote yet'}
                            </Text>
                        </View>
                    </View>
                </View>

                {isOwner && !item.isHost && (
                    <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => handleRemoveParticipant(item)}
                    >
                        <X stroke="#ef4444" width={16} height={16} />
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    return (
        <View style={styles.container}>
            {/* Participants Header */}
            <View style={styles.participantsHeader}>
                <View style={styles.participantsTitle}>
                    <Users stroke="#8b5cf6" width={20} height={20} />
                    <Text style={styles.participantsTitleText}>
                        {allParticipants.length} {allParticipants.length === 1 ? 'Attendee' : 'Attendees'}
                    </Text>
                </View>

                {(responsesCount > 0 || votesCount > 0) && (
                    <View style={styles.responseBadge}>
                        <CheckCircle stroke="#10b981" width={12} height={12} />
                        <Text style={styles.responseBadgeText}>
                            {responsesCount}/{totalToRespond} responses
                            {votesCount > 0 && ` • ${votesCount}/${totalToRespond} votes`}
                        </Text>
                    </View>
                )}
            </View>

            {/* Participants Grid */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.participantsGrid}
            >
                {/* Invite Button */}
                {isOwner && (
                    <TouchableOpacity style={styles.inviteButton} onPress={handleInviteClick}>
                        <Plus stroke="#fff" width={24} height={24} />
                        <Text style={styles.inviteButtonText}>Invite</Text>
                    </TouchableOpacity>
                )}

                {/* View All Button */}
                <TouchableOpacity style={styles.viewAllButton} onPress={() => setShowAllParticipants(true)}>
                    <Eye stroke="#fff" width={24} height={24} />
                    <Text style={styles.viewAllButtonText}>View</Text>
                </TouchableOpacity>

                {/* Confirmed Participants */}
                {allParticipants
                    .filter(p => p.confirmed)
                    .slice(0, 8)
                    .map((participant, index) => (
                        <View key={`confirmed-${index}`}>
                            {renderParticipantAvatar({ item: participant, index })}
                        </View>
                    ))}

                {/* Pending Invites (for owners only) */}
                {isOwner &&
                    allParticipants
                        .filter(p => !p.confirmed)
                        .slice(0, 3)
                        .map((participant, index) => (
                            <View key={`pending-${index}`}>
                                {renderParticipantAvatar({ item: participant, index })}
                            </View>
                        ))}
            </ScrollView>

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.inviteModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Invite Participants</Text>
                            <TouchableOpacity onPress={() => setShowInviteModal(false)}>
                                <X stroke="#fff" width={20} height={20} />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.inputSection}>
                            <View style={styles.inputGroup}>
                                <TextInput
                                    style={styles.emailInput}
                                    placeholder="Enter email address..."
                                    placeholderTextColor="#64748b"
                                    value={manualInput}
                                    onChangeText={setManualInput}
                                    onSubmitEditing={handleAddEmail}
                                    keyboardType="email-address"
                                    autoCapitalize="none"
                                />
                                <TouchableOpacity style={styles.addButton} onPress={handleAddEmail}>
                                    <Plus stroke="#fff" width={18} height={18} />
                                </TouchableOpacity>
                            </View>

                            {manualEmails.length > 0 && (
                                <ScrollView style={styles.emailsContainer}>
                                    {manualEmails.map((email, index) => (
                                        <View key={index} style={styles.emailPill}>
                                            <Text style={styles.emailPillText}>{email}</Text>
                                            <TouchableOpacity onPress={() => handleRemoveEmail(index)}>
                                                <X stroke="#8b5cf6" width={14} height={14} />
                                            </TouchableOpacity>
                                        </View>
                                    ))}
                                </ScrollView>
                            )}
                        </View>

                        <View style={styles.modalActions}>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.cancelButton]}
                                onPress={() => setShowInviteModal(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionButton, styles.inviteSubmitButton]}
                                onPress={handleInviteSubmit}
                            >
                                <Text style={styles.inviteSubmitButtonText}>Send Invites</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* View All Participants Modal */}
            <Modal
                visible={showAllParticipants}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowAllParticipants(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.viewAllModal}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>All Participants</Text>
                            <TouchableOpacity onPress={() => setShowAllParticipants(false)}>
                                <X stroke="#fff" width={20} height={20} />
                            </TouchableOpacity>
                        </View>

                        {allParticipants.length > 0 && (
                            <View style={styles.progressContainer}>
                                <Text style={styles.progressText}>
                                    {responsesCount}/{totalToRespond} preferences collected
                                </Text>
                                <View style={styles.progressBarContainer}>
                                    <View
                                        style={[
                                            styles.progressBar,
                                            { width: `${(responsesCount / totalToRespond) * 100}%` }
                                        ]}
                                    />
                                </View>
                            </View>
                        )}

                        <View style={styles.participantsListContainer}>
                            {allParticipants.length > 0 ? (
                                <FlatList
                                    data={allParticipants}
                                    renderItem={renderParticipantListItem}
                                    keyExtractor={(item, index) => `participant-${item.email || index}`}
                                    style={styles.participantsList}
                                    contentContainerStyle={styles.participantsListContent}
                                    showsVerticalScrollIndicator={true}
                                    scrollIndicatorInsets={{ right: 1 }}
                                    bounces={true}
                                    removeClippedSubviews={false} // Ensure all items render
                                    nestedScrollEnabled={true} // Enable nested scrolling in modal
                                />
                            ) : (
                                <View style={styles.emptyState}>
                                    <Text style={styles.emptyStateText}>No participants found</Text>
                                </View>
                            )}
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        margin: 16,
    },

    // Header Styles
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        flexWrap: 'wrap',
        gap: 8,
    },

    participantsTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    participantsTitleText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'Montserrat_600SemiBold',
    },

    responseBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 999,
    },

    responseBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#10b981',
    },

    // Grid Styles
    participantsGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingVertical: 8,
    },

    inviteButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        borderStyle: 'dashed',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },

    inviteButtonText: {
        fontSize: 8,
        fontWeight: '600',
        color: '#fff',
    },

    viewAllButton: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },

    viewAllButtonText: {
        fontSize: 8,
        fontWeight: '600',
        color: '#fff',
    },

    // Avatar Styles
    participantAvatar: {
        position: 'relative',
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    hostAvatar: {
        borderColor: '#8b5cf6',
        borderWidth: 3,
    },

    pendingAvatar: {
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderStyle: 'dashed',
        opacity: 0.6,
    },

    avatarImage: {
        width: '100%',
        height: '100%',
        borderRadius: 30,
    },

    hostIndicator: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#201925',
    },

    responseIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#10b981',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#201925',
    },

    pendingIndicator: {
        position: 'absolute',
        top: 2,
        right: 2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#f59e0b',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#201925',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        paddingTop: 60, // Account for status bar
        paddingBottom: 60, // Account for bottom safe area
    },

    inviteModal: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        width: '100%',
        maxWidth: 400,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    viewAllModal: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        height: '80%', // Fixed height instead of maxHeight
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        overflow: 'hidden', // Prevent content from spilling out
        display: 'flex',
        flexDirection: 'column',
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16, // Reduced padding
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#2C1E33', // Ensure consistent background
        flexShrink: 0, // Don't shrink this header
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'Montserrat_600SemiBold',
    },

    // Input Styles
    inputSection: {
        padding: 20,
    },

    inputGroup: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 12,
    },

    emailInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#fff',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 10,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 14,
    },

    addButton: {
        backgroundColor: '#8b5cf6',
        width: 40,
        height: 40,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emailsContainer: {
        maxHeight: 120,
    },

    emailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 999,
        marginBottom: 8,
    },

    emailPillText: {
        color: '#8b5cf6',
        fontSize: 12,
        flex: 1,
    },

    // Action Buttons
    modalActions: {
        flexDirection: 'row',
        gap: 12,
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
    },

    actionButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },

    cancelButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },

    cancelButtonText: {
        color: '#64748b',
        fontSize: 14,
        fontWeight: '600',
    },

    inviteSubmitButton: {
        backgroundColor: '#8b5cf6',
    },

    inviteSubmitButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    // Progress Styles
    progressContainer: {
        padding: 16, // Reduced padding
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#2C1E33', // Ensure consistent background
        flexShrink: 0, // Don't shrink this section
    },

    progressText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#cbd5e1',
        marginBottom: 8,
    },

    progressBarContainer: {
        height: 6,
        backgroundColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 3,
    },

    progressBar: {
        height: '100%',
        backgroundColor: '#8b5cf6',
        borderRadius: 3,
    },

    // Participants List Styles
    participantsListContainer: {
        flex: 1, // Take remaining space in modal
        backgroundColor: '#2C1E33', // Same as modal background
        overflow: 'hidden', // Prevent overflow
    },

    participantsList: {
        flex: 1,
        backgroundColor: '#2C1E33', // Same as modal background
    },

    participantsListContent: {
        padding: 12,
        paddingBottom: 20, // Extra padding at bottom
        flexGrow: 1, // Allow content to grow
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    emptyStateText: {
        color: '#64748b',
        fontSize: 16,
        textAlign: 'center',
    },

    participantItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        padding: 12,
        borderRadius: 10,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        width: '100%', // Ensure full width
        alignSelf: 'stretch', // Stretch to container width
    },

    participantInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },

    participantCircle: {
        position: 'relative',
        width: 40,
        height: 40,
        borderRadius: 20,
    },

    participantImage: {
        width: '100%',
        height: '100%',
        borderRadius: 20,
    },

    hostIndicatorLarge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 2,
        borderColor: '#2C1E33',
    },

    participantDetails: {
        flex: 1,
    },

    participantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    statusText: {
        fontSize: 11,
        color: '#64748b',
        marginRight: 8,
    },

    removeButton: {
        padding: 8,
        borderRadius: 8,
    },
})