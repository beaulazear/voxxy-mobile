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
    Dimensions,
} from 'react-native'
import {
    Users,
    Plus,
    Eye,
    X,
    CheckCircle,
    XCircle,
    Clock,
    Star,
    Check,
    Calendar,
    ArrowLeft,
    Mail,
    Phone,
    Heart,
    AlertTriangle,
    Zap,
} from 'react-native-feather'
import { LinearGradient } from 'expo-linear-gradient'
import * as Contacts from 'expo-contacts'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

import DefaultIcon from '../assets/pfp-placeholder.png'
import { logger } from '../utils/logger';
import { avatarMap, getUserDisplayImage, getAvatarSource } from '../utils/avatarManager';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

// Avatar mapping for relative paths
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null
    } catch (error) {
        logger.debug(`⚠️ Avatar ${filename} not found in mapping`)
        return null
    }
}

export default function ParticipantsSection({
    activity,
    votes = [],
    isOwner,
    onInvite,
    onRemoveParticipant,
    footerButton,
    externalShowInviteModal,
    externalSetShowInviteModal
}) {
    const { user } = useContext(UserContext)
    // Use external state if provided, otherwise use internal state
    const [internalShowInviteModal, setInternalShowInviteModal] = useState(false)
    const showInviteModal = externalShowInviteModal !== undefined ? externalShowInviteModal : internalShowInviteModal
    const setShowInviteModal = externalSetShowInviteModal !== undefined ? externalSetShowInviteModal : setInternalShowInviteModal
    const [showAllParticipants, setShowAllParticipants] = useState(false)
    const [manualInput, setManualInput] = useState('')
    const [manualEmails, setManualEmails] = useState([])
    const [selectedCrewMembers, setSelectedCrewMembers] = useState([])
    const [selectedContacts, setSelectedContacts] = useState([])
    const [phoneContacts, setPhoneContacts] = useState([])
    const [contactsLoading, setContactsLoading] = useState(false)
    const [inviteMode, setInviteMode] = useState('selection') // 'selection', 'crew', 'manual', 'contacts'

    const { responses = [] } = activity

    const getDisplayImage = (userObj) => {
        logger.debug(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            logger.debug(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
            const avatarFilename = userObj.avatar.includes('/')
                ? userObj.avatar.split('/').pop()
                : userObj.avatar

            logger.debug(`🎭 Looking for avatar: ${avatarFilename}`)

            const mappedAvatar = getAvatarFromMap(avatarFilename)
            if (mappedAvatar) {
                logger.debug(`✅ Found avatar in mapping: ${avatarFilename}`)
                return mappedAvatar
            }

            if (userObj.avatar.startsWith('http')) {
                logger.debug(`🌐 Using avatar URL: ${userObj.avatar}`)
                return { uri: userObj.avatar }
            }
        }

        logger.debug(`🔄 Using default icon`)
        return DefaultIcon
    }

    const buildVoxxyCrew = () => {
        if (!user) return []

        const allUsersMap = new Map()

        user.activities?.forEach(act => {
            act.participants?.forEach(p => {
                if (p.id !== user.id) {
                    const existing = allUsersMap.get(p.id) || {
                        user: p,
                        lastDate: null,
                        lastName: '',
                        count: 0,
                        sharedActivities: [],
                        firstActivity: null
                    }
                    existing.count += 1
                    existing.sharedActivities.push({
                        name: act.activity_name,
                        type: act.activity_type,
                        emoji: act.emoji,
                        date: act.date_day
                    })

                    const date = new Date(act.date_day)
                    if (!existing.lastDate || date > existing.lastDate) {
                        existing.lastDate = date
                        existing.lastName = act.activity_name
                    }
                    if (!existing.firstActivity || date < new Date(existing.firstActivity)) {
                        existing.firstActivity = act.date_day
                    }
                    allUsersMap.set(p.id, existing)
                }
            })
        })

        // Process participant activities
        user.participant_activities?.forEach(pa => {
            const { activity: act } = pa
            const host = act.user
            if (host?.id !== user.id) {
                const existing = allUsersMap.get(host.id) || {
                    user: host,
                    lastDate: null,
                    lastName: '',
                    count: 0,
                    sharedActivities: [],
                    firstActivity: null
                }
                existing.count += 1
                existing.sharedActivities.push({
                    name: act.activity_name,
                    type: act.activity_type,
                    emoji: act.emoji,
                    date: act.date_day
                })

                const date = new Date(act.date_day)
                if (!existing.lastDate || date > existing.lastDate) {
                    existing.lastDate = date
                    existing.lastName = act.activity_name
                }
                if (!existing.firstActivity || date < new Date(existing.firstActivity)) {
                    existing.firstActivity = act.date_day
                }
                allUsersMap.set(host.id, existing)
            }

            act.participants?.forEach(p => {
                if (p.id !== user.id) {
                    const existing = allUsersMap.get(p.id) || {
                        user: p,
                        lastDate: null,
                        lastName: '',
                        count: 0,
                        sharedActivities: [],
                        firstActivity: null
                    }
                    existing.count += 1
                    existing.sharedActivities.push({
                        name: act.activity_name,
                        type: act.activity_type,
                        emoji: act.emoji,
                        date: act.date_day
                    })

                    const date = new Date(act.date_day)
                    if (!existing.lastDate || date > existing.lastDate) {
                        existing.lastDate = date
                        existing.lastName = act.activity_name
                    }
                    if (!existing.firstActivity || date < new Date(existing.firstActivity)) {
                        existing.firstActivity = act.date_day
                    }
                    allUsersMap.set(p.id, existing)
                }
            })
        })

        return Array.from(allUsersMap.values())
            .sort((a, b) => b.count - a.count || a.user.name.localeCompare(b.user.name))
    }

    const voxxyCrew = buildVoxxyCrew()

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

    // Filter out crew members who are already participants
    const availableCrewMembers = voxxyCrew.filter(crewMember =>
        !allParticipants.some(participant =>
            participant.email === crewMember.user.email
        )
    )

    // Function to load contacts using Expo Contacts
    const loadContacts = async () => {
        setContactsLoading(true)
        try {
            const { status } = await Contacts.requestPermissionsAsync()
            if (status === 'granted') {
                const { data } = await Contacts.getContactsAsync({
                    fields: [Contacts.Fields.Name, Contacts.Fields.Emails, Contacts.Fields.Image],
                })

                // Filter contacts that have email addresses and aren't already participants
                const contactsWithEmails = data
                    .filter(contact => contact.emails && contact.emails.length > 0)
                    .filter(contact =>
                        !allParticipants.some(participant =>
                            contact.emails.some(email => email.email === participant.email)
                        )
                    )
                    .map(contact => ({
                        id: contact.id,
                        name: contact.name || 'Unknown',
                        emails: contact.emails.map(email => email.email),
                        primaryEmail: contact.emails[0].email,
                        image: contact.image,
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name))

                setPhoneContacts(contactsWithEmails)
            } else {
                Alert.alert('Permission Denied', 'Cannot access contacts without permission.')
            }
        } catch (error) {
            logger.error('Error loading contacts:', error)
            Alert.alert('Error', 'Failed to load contacts.')
        }
        setContactsLoading(false)
    }

    // Helper functions for tracking responses
    const hasResponded = (participant) =>
        participant.confirmed && responses.some(r => r.user_id === participant.apId)

    // Helper function to check if user has profile preferences saved
    const hasProfilePreferences = (participant) => {
        if (!participant.confirmed || !participant.apId) return false

        // Get the full user object from context if available
        const participantUser = participant.apId === user?.id
            ? user
            : activity.participants?.find(p => p.id === participant.apId)

        if (!participantUser) return false

        // Check if user has either favorite_food or any dietary preferences set
        const hasFavoriteFood = participantUser.favorite_food && participantUser.favorite_food.trim().length > 0
        const hasDietaryPreferences = participantUser.dairy_free === true ||
            participantUser.gluten_free === true ||
            participantUser.vegan === true ||
            participantUser.vegetarian === true ||
            participantUser.kosher === true

        return hasFavoriteFood || hasDietaryPreferences
    }

    const totalToRespond = allParticipants.length
    const responsesCount = allParticipants.filter(p =>
        responses.some(r => r.user_id === p.apId)
    ).length

    // Removed auto-show invite modal - users can manually click to invite friends when they want

    // Cleanup modals on unmount to prevent stuck modals
    useEffect(() => {
        return () => {
            setShowInviteModal(false)
            setShowAllParticipants(false)
        }
    }, [])

    const handleInviteClick = () => {
        setManualInput('')
        setManualEmails([])
        setSelectedCrewMembers([])
        setSelectedContacts([])
        setInviteMode('selection')
        setShowInviteModal(true)
    }

    const handleSkipInviting = () => {
        setShowInviteModal(false)
        // You can add navigation logic here or just close the modal
        // The user can now browse recommendations and save favorites
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

    const handleToggleCrewMember = (crewMember) => {
        setSelectedCrewMembers(prev => {
            const isSelected = prev.some(member => member.user.id === crewMember.user.id)
            if (isSelected) {
                return prev.filter(member => member.user.id !== crewMember.user.id)
            } else {
                return [...prev, crewMember]
            }
        })
    }

    const handleToggleContact = (contact) => {
        setSelectedContacts(prev => {
            const isSelected = prev.some(c => c.id === contact.id)
            if (isSelected) {
                return prev.filter(c => c.id !== contact.id)
            } else {
                return [...prev, contact]
            }
        })
    }

    const handleInviteSubmit = () => {
        const totalInvites = manualEmails.length + selectedCrewMembers.length + selectedContacts.length

        if (totalInvites === 0) {
            Alert.alert('No Invites', 'Please select crew members, contacts, or add email addresses.')
            return
        }

        // Send manual email invites
        manualEmails.forEach(email => {
            onInvite(email)
        })

        // Send crew member invites (using their email)
        selectedCrewMembers.forEach(crewMember => {
            onInvite(crewMember.user.email)
        })

        // Send contact invites (using their primary email)
        selectedContacts.forEach(contact => {
            onInvite(contact.primaryEmail)
        })

        Alert.alert('Success', `${totalInvites} invitation(s) sent!`)
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

    const formatDate = (dateString) => {
        if (!dateString) return ''
        const d = new Date(dateString)
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    }

    const renderParticipantAvatar = ({ item, index }) => {
        // Check if user has completed at least one requirement (response OR preferences)
        const hasCompletedRequirement = item.confirmed && (hasResponded(item) || hasProfilePreferences(item))

        return (
            <View style={[styles.participantAvatar, item.isHost && styles.hostAvatar, !item.confirmed && styles.pendingAvatar]}>
                <Image
                    source={getDisplayImage(item)}
                    style={styles.avatarImage}
                    onError={() => logger.debug(`❌ Avatar failed to load for ${item.name}`)}
                    onLoad={() => logger.debug(`✅ Avatar loaded for ${item.name}`)}
                    defaultSource={DefaultIcon}
                />

                {item.isHost && (
                    <View style={styles.hostIndicator}>
                        <Star stroke="#fff" width={10} height={10} fill="#fff" />
                    </View>
                )}

                {hasCompletedRequirement && (
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
        // Display logic for participant name
        const getDisplayName = () => {
            if (item.isHost) {
                return `${item.name} (Organizer)`
            }

            // If it's a pending invite and the current user is the owner, show the email
            if (!item.confirmed && isOwner) {
                return item.email || 'Invite Pending'
            }

            // For confirmed participants or non-owners viewing pending invites
            return item.name
        }

        // Display logic for participant subtitle (email for confirmed users, status for pending)
        const getDisplaySubtitle = () => {
            if (item.confirmed && !item.isHost && isOwner) {
                return item.email
            }
            if (!item.confirmed && isOwner) {
                return 'Pending invitation'
            }
            if (!item.confirmed) {
                return 'Invitation pending'
            }
            return null
        }

        return (
            <View style={styles.participantItem}>
                <View style={styles.participantInfo}>
                    <View style={styles.participantCircle}>
                        <Image
                            source={getDisplayImage(item)}
                            style={styles.participantImage}
                            onError={() => logger.debug(`❌ Failed to load image for ${item.name}`)}
                            onLoad={() => logger.debug(`✅ Image loaded for ${item.name}`)}
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
                            {getDisplayName()}
                        </Text>

                        {getDisplaySubtitle() && (
                            <Text style={styles.participantEmail}>
                                {getDisplaySubtitle()}
                            </Text>
                        )}

                        <View style={styles.statusColumn}>
                            <View style={styles.statusRow}>
                                {hasResponded(item) ? (
                                    <CheckCircle stroke="#10b981" width={14} height={14} />
                                ) : (
                                    <XCircle stroke="#6b7280" width={14} height={14} />
                                )}
                                <Text style={styles.statusText}>
                                    {hasResponded(item) ? 'Response submitted' : 'Waiting for response'}
                                </Text>
                            </View>

                            <View style={styles.statusRow}>
                                {hasProfilePreferences(item) ? (
                                    <CheckCircle stroke="#10b981" width={14} height={14} />
                                ) : (
                                    <XCircle stroke="#6b7280" width={14} height={14} />
                                )}
                                <Text style={styles.statusText}>
                                    {hasProfilePreferences(item) ? 'Preferences saved' : 'No preferences saved'}
                                </Text>
                            </View>
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

    const renderCrewMemberCard = ({ item, index }) => {
        const isSelected = selectedCrewMembers.some(member => member.user.id === item.user.id)

        return (
            <TouchableOpacity
                style={[styles.crewCard, isSelected && styles.crewCardSelected]}
                onPress={() => handleToggleCrewMember(item)}
                activeOpacity={0.8}
            >
                <View style={styles.crewCardHeader}>
                    <View style={styles.crewAvatarContainer}>
                        <Image
                            source={getDisplayImage(item.user)}
                            style={styles.crewAvatar}
                            onError={() => logger.debug(`❌ Failed to load image for ${item.user.name}`)}
                            onLoad={() => logger.debug(`✅ Image loaded for ${item.user.name}`)}
                            defaultSource={DefaultIcon}
                        />
                        {isSelected && (
                            <View style={styles.crewSelectedOverlay}>
                                <Check stroke="#fff" width={20} height={20} strokeWidth={3} />
                            </View>
                        )}
                    </View>

                    <View style={styles.crewInfo}>
                        <Text style={styles.crewName}>{item.user.name}</Text>
                        <View style={styles.crewStats}>
                            <Text style={styles.crewActivityCount}>{item.count} activities together</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.crewLastActivity}>
                    <Calendar stroke="#8b5cf6" width={14} height={14} />
                    <Text style={styles.crewLastActivityText} numberOfLines={1}>
                        Last: {item.lastName}
                    </Text>
                </View>
            </TouchableOpacity>
        )
    }

    const renderContactCard = ({ item }) => {
        const isSelected = selectedContacts.some(contact => contact.id === item.id)

        return (
            <TouchableOpacity
                style={[styles.contactCard, isSelected && styles.contactCardSelected]}
                onPress={() => handleToggleContact(item)}
                activeOpacity={0.8}
            >
                <View style={styles.contactCardHeader}>
                    <View style={styles.contactAvatarContainer}>
                        {item.image ? (
                            <Image
                                source={{ uri: item.image.uri }}
                                style={styles.contactAvatar}
                                defaultSource={DefaultIcon}
                            />
                        ) : (
                            <View style={styles.contactAvatarPlaceholder}>
                                <Text style={styles.contactAvatarText}>
                                    {item.name.charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                        {isSelected && (
                            <View style={styles.contactSelectedOverlay}>
                                <Check stroke="#fff" width={20} height={20} strokeWidth={3} />
                            </View>
                        )}
                    </View>

                    <View style={styles.contactInfo}>
                        <Text style={styles.contactName}>{item.name}</Text>
                        <Text style={styles.contactEmail}>{item.primaryEmail}</Text>
                        {item.emails.length > 1 && (
                            <Text style={styles.contactEmailCount}>
                                +{item.emails.length - 1} more email{item.emails.length > 2 ? 's' : ''}
                            </Text>
                        )}
                    </View>
                </View>
            </TouchableOpacity>
        )
    }

    const renderModeSelection = () => (
        <View style={styles.modeSelectionContainer}>
            <View style={styles.topPadding} />

            {availableCrewMembers.length > 0 && (
                <TouchableOpacity
                    style={styles.modeOption}
                    onPress={() => setInviteMode('crew')}
                    activeOpacity={0.8}
                >
                    <View style={styles.modeOptionIcon}>
                        <Users stroke="#cc31e8" width={24} height={24} />
                    </View>
                    <View style={styles.modeOptionContent}>
                        <Text style={styles.modeOptionTitle}>Invite Voxxy Crew</Text>
                        <Text style={styles.modeOptionDescription}>
                            Select from {availableCrewMembers.length} people you've done activities with
                        </Text>
                    </View>
                    <View style={styles.modeOptionArrow}>
                        <Text style={styles.arrow}>→</Text>
                    </View>
                </TouchableOpacity>
            )}

            <TouchableOpacity
                style={styles.modeOption}
                onPress={() => {
                    setInviteMode('contacts')
                    loadContacts()
                }}
                activeOpacity={0.8}
            >
                <View style={styles.modeOptionIcon}>
                    <Phone stroke="#cc31e8" width={24} height={24} />
                </View>
                <View style={styles.modeOptionContent}>
                    <Text style={styles.modeOptionTitle}>Invite from Contacts</Text>
                    <Text style={styles.modeOptionDescription}>
                        Select friends from your phone's contacts
                    </Text>
                </View>
                <View style={styles.modeOptionArrow}>
                    <Text style={styles.arrow}>→</Text>
                </View>
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.modeOption}
                onPress={() => setInviteMode('manual')}
                activeOpacity={0.8}
            >
                <View style={styles.modeOptionIcon}>
                    <Mail stroke="#cc31e8" width={24} height={24} />
                </View>
                <View style={styles.modeOptionContent}>
                    <Text style={styles.modeOptionTitle}>Add by Email</Text>
                    <Text style={styles.modeOptionDescription}>
                        Manually enter email addresses to invite new people
                    </Text>
                </View>
                <View style={styles.modeOptionArrow}>
                    <Text style={styles.arrow}>→</Text>
                </View>
            </TouchableOpacity>
        </View>
    )

    const renderCrewSelection = () => (
        <View style={styles.crewSelectionContainer}>
            {selectedCrewMembers.length > 0 && (
                <View style={styles.selectionSummary}>
                    <Text style={styles.selectionSummaryText}>
                        {selectedCrewMembers.length} member{selectedCrewMembers.length !== 1 ? 's' : ''} selected
                    </Text>
                </View>
            )}

            <FlatList
                data={availableCrewMembers}
                renderItem={renderCrewMemberCard}
                keyExtractor={(item) => item.user.id.toString()}
                style={styles.crewList}
                contentContainerStyle={styles.crewListContent}
                showsVerticalScrollIndicator={false}
                numColumns={1}
            />
        </View>
    )

    const renderContactsSelection = () => (
        <View style={styles.contactsSelectionContainer}>
            {contactsLoading ? (
                <View style={styles.loadingContainer}>
                    <Text style={styles.loadingText}>Loading contacts...</Text>
                </View>
            ) : (
                <>
                    {selectedContacts.length > 0 && (
                        <View style={styles.selectionSummary}>
                            <Text style={styles.selectionSummaryText}>
                                {selectedContacts.length} contact{selectedContacts.length !== 1 ? 's' : ''} selected
                            </Text>
                        </View>
                    )}

                    {phoneContacts.length > 0 ? (
                        <FlatList
                            data={phoneContacts}
                            renderItem={renderContactCard}
                            keyExtractor={(item) => item.id.toString()}
                            style={styles.contactsList}
                            contentContainerStyle={styles.contactsListContent}
                            showsVerticalScrollIndicator={false}
                        />
                    ) : (
                        <View style={styles.emptyContactsState}>
                            <Text style={styles.emptyContactsText}>
                                No contacts with email addresses found
                            </Text>
                        </View>
                    )}
                </>
            )}
        </View>
    )

    const renderManualEntry = () => (
        <View style={styles.manualEntryContainer}>
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
                        <Plus stroke="#fff" width={20} height={20} />
                    </TouchableOpacity>
                </View>

                {manualEmails.length > 0 && (
                    <ScrollView style={styles.emailsContainer} showsVerticalScrollIndicator={false}>
                        {manualEmails.map((email, index) => (
                            <View key={index} style={styles.emailPill}>
                                <Text style={styles.emailPillText}>{email}</Text>
                                <TouchableOpacity onPress={() => handleRemoveEmail(index)}>
                                    <X stroke="#8b5cf6" width={16} height={16} />
                                </TouchableOpacity>
                            </View>
                        ))}
                    </ScrollView>
                )}
            </View>
        </View>
    )

    const renderModalContent = () => {
        switch (inviteMode) {
            case 'selection':
                return renderModeSelection()
            case 'crew':
                return renderCrewSelection()
            case 'contacts':
                return renderContactsSelection()
            case 'manual':
                return renderManualEntry()
            default:
                return renderModeSelection()
        }
    }

    const getHeaderTitle = () => {
        switch (inviteMode) {
            case 'selection':
                return 'Invite Your Friends'
            case 'crew':
                return 'Select Crew Members'
            case 'contacts':
                return 'Select Contacts'
            case 'manual':
                return 'Add by Email'
            default:
                return 'Invite Your Friends'
        }
    }

    const getSubmitButtonText = () => {
        const totalSelected = selectedCrewMembers.length + manualEmails.length + selectedContacts.length
        return `Send ${totalSelected} Invite${totalSelected !== 1 ? 's' : ''}`
    }

    const isSubmitDisabled = () => {
        return selectedCrewMembers.length === 0 && manualEmails.length === 0 && selectedContacts.length === 0
    }

    return (
        <View style={{ marginHorizontal: 16, marginBottom: 20 }}>
            <LinearGradient
                colors={['#cc31e8', '#667eea', '#cc31e8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBorder}
            >
                <View style={styles.container}>
                    {/* Participants Header */}
                    <View style={styles.participantsHeader}>
                        <View style={styles.participantsTitle}>
                            <View style={styles.iconWrapper}>
                                <Users stroke="#9333ea" width={20} height={20} />
                            </View>
                            <Text style={styles.participantsTitleText}>
                                {allParticipants.length === 1 ? 'Invite Your Friends' : `${allParticipants.length} Community Member${allParticipants.length === 1 ? '' : 's'}`}
                            </Text>
                        </View>
                        {/* Invite Button - only show during collecting phase */}
                        {isOwner && !activity?.finalized && !activity?.completed && !activity?.voting && (
                            <TouchableOpacity style={styles.inviteButtonCompact} onPress={handleInviteClick}>
                                <Plus stroke="#8b5cf6" width={18} height={18} />
                                <Text style={styles.inviteButtonCompactText}>Invite</Text>
                            </TouchableOpacity>
                        )}
                    </View>

            {/* All Participants List - Show all members inline */}
            <View style={styles.participantsListInline}>
                {allParticipants.map((participant, index) => {
                    // Determine the user's status
                    const hasResponse = hasResponded(participant)
                    const hasPreferences = hasProfilePreferences(participant)

                    let statusConfig
                    if (hasResponse) {
                        // Priority 1: Response submitted
                        statusConfig = {
                            icon: <CheckCircle stroke="#10b981" width={14} height={14} />,
                            text: 'Response submitted',
                            style: styles.statusBadgeSuccess
                        }
                    } else if (hasPreferences) {
                        // Priority 2: Using profile preferences
                        statusConfig = {
                            icon: <CheckCircle stroke="#10b981" width={14} height={14} />,
                            text: 'Using profile',
                            style: styles.statusBadgeSuccess
                        }
                    } else {
                        // Priority 3: No data available
                        statusConfig = {
                            icon: <AlertTriangle stroke="#f59e0b" width={14} height={14} />,
                            text: 'No preferences',
                            style: styles.statusBadgeWarning
                        }
                    }

                    return (
                        <View key={`participant-${index}`} style={styles.participantRowInline}>
                            <View style={styles.participantLeftSection}>
                                {/* Avatar */}
                                <Image
                                    source={getDisplayImage(participant)}
                                    style={styles.participantAvatarInline}
                                    onError={() => logger.debug(`❌ Avatar failed to load for ${participant.name}`)}
                                    onLoad={() => logger.debug(`✅ Avatar loaded for ${participant.name}`)}
                                    defaultSource={DefaultIcon}
                                />

                                {/* Name */}
                                <View style={styles.participantNameSection}>
                                    {!participant.confirmed ? (
                                        // Show email for pending invites
                                        <>
                                            <Text style={styles.participantNameInline}>
                                                {participant.email || 'Pending Invite'}
                                            </Text>
                                            <Text style={styles.pendingLabel}>Pending invite</Text>
                                        </>
                                    ) : (
                                        // Show name and status for confirmed users
                                        <>
                                            <Text style={styles.participantNameInline}>
                                                {participant.isHost ? `${participant.name} (Host)` : participant.name}
                                            </Text>
                                            <View style={[styles.statusBadge, statusConfig.style]}>
                                                {statusConfig.icon}
                                                <Text style={styles.statusBadgeText}>{statusConfig.text}</Text>
                                            </View>
                                        </>
                                    )}
                                </View>
                            </View>

                            {/* Remove button for owner */}
                            {isOwner && !participant.isHost && (
                                <TouchableOpacity
                                    style={styles.removeButtonInline}
                                    onPress={() => handleRemoveParticipant(participant)}
                                >
                                    <X stroke="#ef4444" width={14} height={14} />
                                </TouchableOpacity>
                            )}
                        </View>
                    )
                })}
            </View>

                    {/* Custom Footer Button */}
                    {footerButton && (
                        <View style={styles.footerButtonContainer}>
                            {footerButton}
                        </View>
                    )}
                </View>
            </LinearGradient>

            {/* Invite Modal */}
            <Modal
                visible={showInviteModal}
                transparent={true}
                animationType="slide"
                onRequestClose={() => setShowInviteModal(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modernModal}>
                        {/* Unified Header */}
                        <View style={styles.unifiedHeader}>
                            {inviteMode !== 'selection' ? (
                                <TouchableOpacity
                                    style={styles.headerButton}
                                    onPress={() => setInviteMode('selection')}
                                >
                                    <ArrowLeft stroke="#cc31e8" width={20} height={20} />
                                </TouchableOpacity>
                            ) : (
                                <View style={styles.headerSpacer} />
                            )}

                            <Text style={styles.headerTitle}>
                                {getHeaderTitle()}
                            </Text>

                            <TouchableOpacity
                                style={styles.headerButton}
                                onPress={() => setShowInviteModal(false)}
                            >
                                <X stroke="#cc31e8" width={20} height={20} />
                            </TouchableOpacity>
                        </View>

                        {/* Dynamic Content Based on Mode */}
                        {renderModalContent()}

                        {/* Action Buttons */}
                        {(inviteMode === 'crew' || inviteMode === 'manual' || inviteMode === 'contacts') && (
                            <View style={styles.actionBar}>
                                <TouchableOpacity
                                    style={[
                                        styles.submitButton,
                                        isSubmitDisabled() && styles.submitButtonDisabled
                                    ]}
                                    onPress={handleInviteSubmit}
                                    disabled={isSubmitDisabled()}
                                >
                                    <Text style={styles.submitButtonText}>
                                        {getSubmitButtonText()}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    gradientBorder: {
        borderRadius: 24,
        padding: 2,
        shadowColor: 'rgba(147, 51, 234, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
    container: {
        backgroundColor: 'rgba(32, 25, 37, 0.95)',
        padding: 20,
        borderRadius: 22,
    },
    iconWrapper: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Header Styles
    participantsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        flexWrap: 'wrap',
        gap: 8,
    },

    participantsTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },

    participantsTitleText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#ffffff',
        fontFamily: 'Montserrat_700Bold',
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

    inviteButtonCompact: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
    },

    inviteButtonCompactText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#8b5cf6',
    },

    // Inline Participants List Styles
    participantsListInline: {
        gap: 8,
    },

    participantRowInline: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.2)',
    },

    participantLeftSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },

    participantAvatarInline: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#8b5cf6',
    },

    participantNameSection: {
        flex: 1,
    },

    participantNameInline: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 2,
    },

    pendingLabel: {
        fontSize: 11,
        color: '#f59e0b',
        fontWeight: '500',
    },

    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
        marginTop: 4,
        alignSelf: 'flex-start',
    },

    statusBadgeSuccess: {
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },

    statusBadgeWarning: {
        backgroundColor: 'rgba(245, 158, 11, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(245, 158, 11, 0.3)',
    },

    statusBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },

    participantStatusSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginRight: 8,
    },

    removeButtonInline: {
        padding: 6,
        borderRadius: 8,
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
    },

    footerButtonContainer: {
        marginTop: 16,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
    },

    // Grid Styles (legacy - keeping for invite modal)
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

    // Modern Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        justifyContent: 'flex-end',
    },

    modernModal: {
        backgroundColor: '#1a1025',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        height: screenHeight * 0.9,
        width: '100%',
        position: 'relative',
    },

    // Unified Header Styles
    unifiedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 20,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },

    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        textAlign: 'center',
        flex: 1,
        marginHorizontal: 16,
    },

    headerSpacer: {
        width: 40,
    },

    // Mode Selection Styles
    modeSelectionContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },

    modeHeader: {
        alignItems: 'center',
        marginBottom: 48,
        marginTop: 40,
    },

    modeTitle: {
        fontSize: 28,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },

    modeSubtitle: {
        fontSize: 16,
        fontFamily: 'Montserrat_500Medium',
        color: '#cc31e8',
        textAlign: 'center',
    },

    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
    },

    modeOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 20,
    },

    modeOptionContent: {
        flex: 1,
    },

    modeOptionTitle: {
        fontSize: 18,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
        color: '#fff',
        marginBottom: 4,
    },

    modeOptionDescription: {
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
        color: '#cc31e8',
        lineHeight: 20,
    },

    modeOptionArrow: {
        marginLeft: 12,
    },

    arrow: {
        fontSize: 20,
        color: '#cc31e8',
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },

    skipOption: {
        backgroundColor: 'rgba(204, 49, 232, 0.08)',
        borderColor: 'rgba(204, 49, 232, 0.4)',
    },

    topPadding: {
        height: 32,
    },

    // Crew Selection Styles
    crewSelectionContainer: {
        flex: 1,
        marginTop: 10,
    },

    selectionSummary: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 24,
        marginBottom: 20,
        marginTop: 20,
    },

    selectionSummaryText: {
        fontSize: 14,
        color: '#8b5cf6',
        fontWeight: '600',
        textAlign: 'center',
    },

    crewList: {
        flex: 1,
        paddingHorizontal: 24,
    },

    crewListContent: {
        paddingBottom: 100,
    },

    crewCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },

    crewCardSelected: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: '#8b5cf6',
        borderWidth: 2,
    },

    crewCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    crewAvatarContainer: {
        position: 'relative',
        marginRight: 16,
    },

    crewAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },

    crewSelectedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },

    crewInfo: {
        flex: 1,
    },

    crewName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    crewStats: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    crewActivityCount: {
        fontSize: 14,
        color: '#8b5cf6',
        fontWeight: '500',
    },

    crewLastActivity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    crewLastActivityText: {
        fontSize: 14,
        color: '#ffffff',
        flex: 1,
    },

    // Contacts Selection Styles
    contactsSelectionContainer: {
        flex: 1,
        marginTop: 10,
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    loadingText: {
        color: '#8b5cf6',
        fontSize: 16,
        fontWeight: '500',
    },

    contactsList: {
        flex: 1,
        paddingHorizontal: 24,
    },

    contactsListContent: {
        paddingBottom: 100,
    },

    contactCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },

    contactCardSelected: {
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderColor: '#8b5cf6',
        borderWidth: 2,
    },

    contactCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    contactAvatarContainer: {
        position: 'relative',
        marginRight: 16,
    },

    contactAvatar: {
        width: 56,
        height: 56,
        borderRadius: 28,
    },

    contactAvatarPlaceholder: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    contactAvatarText: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '600',
    },

    contactSelectedOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(139, 92, 246, 0.8)',
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },

    contactInfo: {
        flex: 1,
    },

    contactName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },

    contactEmail: {
        fontSize: 14,
        color: '#8b5cf6',
        fontWeight: '500',
        marginBottom: 2,
    },

    contactEmailCount: {
        fontSize: 12,
        color: '#ffffff',
        fontStyle: 'italic',
    },

    emptyContactsState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    emptyContactsText: {
        color: '#e2e8f0',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },

    // Manual Entry Styles
    manualEntryContainer: {
        flex: 1,
    },

    inputSection: {
        paddingHorizontal: 24,
        paddingTop: 20,
    },

    inputGroup: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },

    emailInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        color: '#fff',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderRadius: 16,
        paddingHorizontal: 20,
        paddingVertical: 16,
        fontSize: 16,
    },

    addButton: {
        backgroundColor: '#8b5cf6',
        width: 56,
        height: 56,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
    },

    emailsContainer: {
        maxHeight: 200,
    },

    emailPill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 999,
        marginBottom: 12,
    },

    emailPillText: {
        color: '#8b5cf6',
        fontSize: 14,
        flex: 1,
        fontWeight: '500',
    },

    // Action Bar Styles
    actionBar: {
        padding: 24,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#1a1025',
    },

    submitButton: {
        backgroundColor: '#8b5cf6',
        borderRadius: 16,
        paddingVertical: 18,
        alignItems: 'center',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },

    submitButtonDisabled: {
        backgroundColor: 'rgba(139, 92, 246, 0.3)',
        shadowOpacity: 0,
        elevation: 0,
    },

    submitButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },

    // View All Modal Styles
    viewAllModal: {
        backgroundColor: '#2C1E33',
        borderRadius: 16,
        width: '100%',
        maxWidth: 500,
        height: '80%',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#2C1E33',
        flexShrink: 0,
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        fontFamily: 'Montserrat_600SemiBold',
    },

    progressContainer: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#2C1E33',
        flexShrink: 0,
    },

    progressText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ffffff',
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

    participantsListContainer: {
        flex: 1,
        backgroundColor: '#2C1E33',
        overflow: 'hidden',
    },

    participantsList: {
        flex: 1,
        backgroundColor: '#2C1E33',
    },

    participantsListContent: {
        padding: 12,
        paddingBottom: 20,
        flexGrow: 1,
    },

    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    emptyStateText: {
        color: '#e2e8f0',
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
        width: '100%',
        alignSelf: 'stretch',
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
        marginBottom: 2,
    },

    participantEmail: {
        fontSize: 12,
        color: '#8b5cf6',
        marginBottom: 6,
        fontStyle: 'italic',
    },

    statusColumn: {
        flexDirection: 'column',
        gap: 6,
    },

    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    statusText: {
        fontSize: 11,
        color: '#e2e8f0',
        marginRight: 8,
    },

    removeButton: {
        padding: 8,
        borderRadius: 8,
    },
})