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
} from 'react-native-feather'
import * as Contacts from 'expo-contacts'
import { UserContext } from '../context/UserContext'
import { API_URL } from '../config'

import DefaultIcon from '../assets/icon.png'

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')

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
    const [selectedCrewMembers, setSelectedCrewMembers] = useState([])
    const [selectedContacts, setSelectedContacts] = useState([])
    const [phoneContacts, setPhoneContacts] = useState([])
    const [contactsLoading, setContactsLoading] = useState(false)
    const [inviteMode, setInviteMode] = useState('selection') // 'selection', 'crew', 'manual', 'contacts'

    const { responses = [] } = activity

    const getDisplayImage = (userObj) => {
        console.log(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            console.log(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        if (userObj?.avatar && userObj.avatar !== DefaultIcon) {
            const avatarFilename = userObj.avatar.includes('/')
                ? userObj.avatar.split('/').pop()
                : userObj.avatar

            console.log(`🎭 Looking for avatar: ${avatarFilename}`)

            const mappedAvatar = getAvatarFromMap(avatarFilename)
            if (mappedAvatar) {
                console.log(`✅ Found avatar in mapping: ${avatarFilename}`)
                return mappedAvatar
            }

            if (userObj.avatar.startsWith('http')) {
                console.log(`🌐 Using avatar URL: ${userObj.avatar}`)
                return { uri: userObj.avatar }
            }
        }

        console.log(`🔄 Using default icon`)
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
            console.error('Error loading contacts:', error)
            Alert.alert('Error', 'Failed to load contacts.')
        }
        setContactsLoading(false)
    }

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
        setSelectedCrewMembers([])
        setSelectedContacts([])
        setInviteMode('selection')
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
        return (
            <View style={[styles.participantAvatar, item.isHost && styles.hostAvatar, !item.confirmed && styles.pendingAvatar]}>
                <Image
                    source={getDisplayImage(item)}
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
                            {getDisplayName()}
                        </Text>

                        {getDisplaySubtitle() && (
                            <Text style={styles.participantEmail}>
                                {getDisplaySubtitle()}
                            </Text>
                        )}

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
                            onError={() => console.log(`❌ Failed to load image for ${item.user.name}`)}
                            onLoad={() => console.log(`✅ Image loaded for ${item.user.name}`)}
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
            <View style={styles.modeHeader}>
                <Text style={styles.modeTitle}>Invite Participants</Text>
                <Text style={styles.modeSubtitle}>Choose how you'd like to invite people</Text>
            </View>

            {availableCrewMembers.length > 0 && (
                <TouchableOpacity
                    style={styles.modeOption}
                    onPress={() => setInviteMode('crew')}
                    activeOpacity={0.8}
                >
                    <View style={styles.modeOptionIcon}>
                        <Users stroke="#8b5cf6" width={24} height={24} />
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
                    <Phone stroke="#8b5cf6" width={24} height={24} />
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
                    <Mail stroke="#8b5cf6" width={24} height={24} />
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
                return 'Round Up the Crew 🎉'
            case 'crew':
                return 'Select Crew Members'
            case 'contacts':
                return 'Select Contacts'
            case 'manual':
                return 'Add by Email'
            default:
                return 'Round Up the Crew 🎉'
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

            {/* Modern Full-Screen Invite Modal */}
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
                                    <ArrowLeft stroke="#8b5cf6" width={20} height={20} />
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
                                <X stroke="#8b5cf6" width={20} height={20} />
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
                                    removeClippedSubviews={false}
                                    nestedScrollEnabled={true}
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
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },

    modeSubtitle: {
        fontSize: 16,
        color: '#8b5cf6',
        textAlign: 'center',
    },

    modeOption: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 2,
        borderColor: 'rgba(139, 92, 246, 0.3)',
        borderRadius: 20,
        padding: 24,
        marginBottom: 16,
    },

    modeOptionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(139, 92, 246, 0.2)',
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
        color: '#fff',
        marginBottom: 4,
    },

    modeOptionDescription: {
        fontSize: 14,
        color: '#8b5cf6',
        lineHeight: 20,
    },

    modeOptionArrow: {
        marginLeft: 12,
    },

    arrow: {
        fontSize: 20,
        color: '#8b5cf6',
        fontWeight: '600',
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
        color: '#cbd5e1',
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
        color: '#cbd5e1',
        fontStyle: 'italic',
    },

    emptyContactsState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    emptyContactsText: {
        color: '#64748b',
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