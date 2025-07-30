import React, { useContext, useState } from 'react'
import {
    View,
    Text,
    Image,
    TouchableOpacity,
    Modal,
    ScrollView,
    StyleSheet,
    Dimensions,
    FlatList,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import { Users, Calendar, MapPin, Utensils, Clock, Star, X, ChevronRight, Plus } from 'react-native-feather'
import SmallTriangle from '../assets/voxxy-triangle.png'
import { API_URL } from '../config'
import { logger } from '../utils/logger';
import { avatarMap, getUserDisplayImage, getAvatarSource } from '../utils/avatarManager';

// Avatar mapping for relative paths
// Helper function to safely get avatar
const getAvatarFromMap = (filename) => {
    try {
        return avatarMap[filename] || null
    } catch (error) {
        logger.debug(`⚠️ Avatar ${filename} not found in mapping`)
        return null
    }
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window')
const CARD_WIDTH = (screenWidth - 48) / 2 // 2 columns with padding
const CARD_HEIGHT = 200
const CARD_MARGIN = 8

export default function YourCommunity({ showInvitePopup, onSelectUser, onCreateBoard }) {
    const { user } = useContext(UserContext)
    const [selectedPeer, setSelectedPeer] = useState(null)

    if (!user) return null

    // Comprehensive avatar handling function
    const getDisplayImage = (userObj) => {
        logger.debug(`🖼️ Getting image for user:`, {
            name: userObj?.name,
            profile_pic_url: userObj?.profile_pic_url,
            avatar: userObj?.avatar
        })

        // Check for profile_pic_url first (full URL)
        if (userObj?.profile_pic_url) {
            const profilePicUrl = userObj.profile_pic_url.startsWith('http')
                ? userObj.profile_pic_url
                : `${API_URL}${userObj.profile_pic_url}`
            logger.debug(`📸 Using profile pic URL: ${profilePicUrl}`)
            return { uri: profilePicUrl }
        }

        // Check for avatar (relative path)
        if (userObj?.avatar && typeof userObj.avatar === 'string') {
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

        // Fallback to default avatar
        logger.debug(`🔄 Using default avatar`)
        return require('../assets/Avatar1.jpg')
    }

    const allUsersMap = new Map()

    // Process user's activities
    user.activities?.forEach(act => {
        act.participants?.forEach(p => {
            if (p.id !== user.id) {
                const existing = allUsersMap.get(p.id) || {
                    user: p,
                    lastDate: null,
                    lastName: '',
                    count: 0,
                    sharedActivities: [],
                    recentRestaurants: [],
                    firstActivity: null
                }
                existing.count += 1
                existing.sharedActivities.push({
                    name: act.activity_name,
                    type: act.activity_type,
                    emoji: act.emoji,
                    date: act.date_day
                })

                const selectedPin = act.pinned_activities?.find(pin => pin.selected)
                if (selectedPin && act.activity_type === 'Dining') {
                    existing.recentRestaurants.push({
                        name: selectedPin.name,
                        rating: selectedPin.rating,
                        date: act.date_day
                    })
                }

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
                recentRestaurants: [],
                firstActivity: null
            }
            existing.count += 1
            existing.sharedActivities.push({
                name: act.activity_name,
                type: act.activity_type,
                emoji: act.emoji,
                date: act.date_day
            })

            const selectedPin = act.pinned_activities?.find(pin => pin.selected)
            if (selectedPin && act.activity_type === 'Dining') {
                existing.recentRestaurants.push({
                    name: selectedPin.name,
                    rating: selectedPin.rating,
                    date: act.date_day
                })
            }

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
                    recentRestaurants: [],
                    firstActivity: null
                }
                existing.count += 1
                existing.sharedActivities.push({
                    name: act.activity_name,
                    type: act.activity_type,
                    emoji: act.emoji,
                    date: act.date_day
                })

                const selectedPin = act.pinned_activities?.find(pin => pin.selected)
                if (selectedPin && act.activity_type === 'Dining') {
                    existing.recentRestaurants.push({
                        name: selectedPin.name,
                        rating: selectedPin.rating,
                        date: act.date_day
                    })
                }

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

    function formatSince(dateString) {
        if (!dateString) return 'Recently'
        const d = new Date(dateString)
        return d.toLocaleString('en-US', { month: 'short', year: 'numeric' })
    }

    function formatDate(dateString) {
        if (!dateString) return ''
        const d = new Date(dateString)
        return d.toLocaleString('en-US', { month: 'short', day: 'numeric' })
    }

    const community = Array.from(allUsersMap.values())
        .sort((a, b) => b.count - a.count || a.user.name.localeCompare(b.user.name))

    const openModal = (peerData) => {
        setSelectedPeer(peerData)
    }

    const closeModal = () => {
        setSelectedPeer(null)
    }

    function handleCardPress(peerData) {
        if (showInvitePopup && onSelectUser) {
            onSelectUser(peerData.user)
        } else {
            openModal(peerData)
        }
    }

    // Empty state for vertical layout
    if (community.length === 0) {
        return (
            <View style={styles.section}>
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyCard}>
                        <View style={styles.emptyCardGlow} />
                        <View style={styles.emptyCardContent}>
                            <View style={styles.emptyIconContainer}>
                                <Users stroke="#4ECDC4" width={32} height={32} strokeWidth={2.5} />
                            </View>
                            <Text style={styles.emptyTitle}>No Community Yet</Text>
                            <Text style={styles.emptySubtitle}>Start an activity and invite friends to build your crew!</Text>
                            {onCreateBoard && (
                                <TouchableOpacity
                                    style={styles.emptyButton}
                                    onPress={onCreateBoard}
                                    activeOpacity={0.8}
                                >
                                    <Plus stroke="#fff" width={16} height={16} strokeWidth={2.5} />
                                    <Text style={styles.emptyButtonText}>Start Your First Activity</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        )
    }

    const renderUserCard = ({ item: peerData, index }) => (
        <TouchableOpacity
            style={styles.userCard}
            onPress={() => handleCardPress(peerData)}
            activeOpacity={0.9}
        >
            {/* Header with adventure count */}
            <View style={styles.cardHeader}>
                <View style={styles.adventureBadge}>
                    <Text style={styles.adventureNumber}>{peerData.count}</Text>
                </View>
            </View>

            {/* Avatar section */}
            <View style={styles.avatarSection}>
                <Image
                    source={getDisplayImage(peerData.user)}
                    style={styles.avatar}
                    onError={() => logger.debug(`❌ Avatar failed to load for ${peerData.user?.name}`)}
                    onLoad={() => logger.debug(`✅ Avatar loaded for ${peerData.user?.name}`)}
                />
            </View>

            {/* User info */}
            <View style={styles.userInfo}>
                <Text style={styles.userName} numberOfLines={1}>{peerData.user.name}</Text>
                <View style={styles.metaInfo}>
                    <Calendar stroke="#B8A5C4" width={10} height={10} />
                    <Text style={styles.metaText}>Since {formatSince(peerData.firstActivity)}</Text>
                </View>
                <Text style={styles.adventureLabel}>
                    {peerData.count} adventure{peerData.count !== 1 ? 's' : ''} together
                </Text>
            </View>
        </TouchableOpacity>
    )

    return (
        <View style={styles.section}>
            <FlatList
                data={community}
                renderItem={renderUserCard}
                keyExtractor={(item) => item.user.id.toString()}
                numColumns={2}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.gridContainer}
                columnWrapperStyle={styles.row}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
            />

            {/* Simple Modal */}
            <Modal
                visible={!!selectedPeer}
                transparent
                animationType="slide"
                onRequestClose={closeModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.modalBackground}
                        activeOpacity={1}
                        onPress={closeModal}
                    />

                    <View style={styles.modalContent}>
                        {/* Modal header */}
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={closeModal}
                                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                            >
                                <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                            </TouchableOpacity>
                        </View>

                        {selectedPeer && (
                            <>
                                {/* User profile section */}
                                <View style={styles.modalProfile}>
                                    <View style={styles.modalAvatarContainer}>
                                        <Image
                                            source={getDisplayImage(selectedPeer.user)}
                                            style={[
                                                styles.modalAvatar,
                                                selectedPeer.user.avatar || selectedPeer.user.profile_pic_url
                                                    ? styles.avatarWithImage
                                                    : styles.avatarDefault
                                            ]}
                                        />
                                        <View style={styles.modalAvatarRing} />
                                    </View>

                                    <Text style={styles.modalUserName}>{selectedPeer.user.name}</Text>

                                    <View style={styles.modalStats}>
                                        <View style={styles.statItem}>
                                            <Users stroke="#d394f5" width={16} height={16} />
                                            <Text style={styles.statValue}>{selectedPeer.count}</Text>
                                            <Text style={styles.statLabel}>Adventures</Text>
                                        </View>
                                        <View style={styles.statDivider} />
                                        <View style={styles.statItem}>
                                            <Calendar stroke="#d394f5" width={16} height={16} />
                                            <Text style={styles.statValue}>{formatSince(selectedPeer.firstActivity)}</Text>
                                            <Text style={styles.statLabel}>Since</Text>
                                        </View>
                                    </View>
                                </View>

                                {/* Content sections */}
                                <ScrollView
                                    style={styles.modalScrollView}
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.scrollContent}
                                >
                                    {/* Last Activity */}
                                    <View style={styles.modalSection}>
                                        <View style={styles.sectionHeader}>
                                            <Clock stroke="#cf38dd" width={18} height={18} />
                                            <Text style={styles.sectionTitle}>Last Activity</Text>
                                        </View>
                                        <View style={styles.lastActivityCard}>
                                            <Text style={styles.lastActivityName}>{selectedPeer.lastName}</Text>
                                            <Text style={styles.lastActivityDate}>
                                                {formatDate(selectedPeer.lastDate?.toISOString()?.split('T')[0] || '')}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Recent restaurants */}
                                    {selectedPeer.recentRestaurants.length > 0 && (
                                        <View style={styles.modalSection}>
                                            <View style={styles.sectionHeader}>
                                                <Utensils stroke="#cf38dd" width={18} height={18} />
                                                <Text style={styles.sectionTitle}>Recent Spots</Text>
                                            </View>

                                            <View style={styles.restaurantGrid}>
                                                {selectedPeer.recentRestaurants
                                                    .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                    .slice(0, 3)
                                                    .map((restaurant, idx) => (
                                                        <View key={idx} style={styles.restaurantCard}>
                                                            <Text style={styles.restaurantName} numberOfLines={1}>
                                                                {restaurant.name}
                                                            </Text>
                                                            <View style={styles.restaurantMeta}>
                                                                {restaurant.rating && (
                                                                    <View style={styles.ratingBadge}>
                                                                        <Star stroke="#FFD700" fill="#FFD700" width={10} height={10} />
                                                                        <Text style={styles.ratingValue}>{restaurant.rating}</Text>
                                                                    </View>
                                                                )}
                                                                <Text style={styles.restaurantDate}>
                                                                    {formatDate(restaurant.date)}
                                                                </Text>
                                                            </View>
                                                        </View>
                                                    ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Shared activities */}
                                    <View style={styles.modalSection}>
                                        <View style={styles.sectionHeader}>
                                            <Calendar stroke="#cf38dd" width={18} height={18} />
                                            <Text style={styles.sectionTitle}>
                                                Shared Adventures ({selectedPeer.count})
                                            </Text>
                                        </View>

                                        <View style={styles.activitiesGrid}>
                                            {selectedPeer.sharedActivities
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .slice(0, 6)
                                                .map((activity, idx) => (
                                                    <View key={idx} style={styles.activityCard}>
                                                        <Text style={styles.activityEmoji}>{activity.emoji}</Text>
                                                        <View style={styles.activityDetails}>
                                                            <Text style={styles.activityName} numberOfLines={1}>
                                                                {activity.name}
                                                            </Text>
                                                            <Text style={styles.activityMeta}>
                                                                {activity.type} • {formatDate(activity.date)}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                ))}
                                        </View>

                                        {selectedPeer.sharedActivities.length > 6 && (
                                            <Text style={styles.moreActivities}>
                                                +{selectedPeer.sharedActivities.length - 6} more adventures
                                            </Text>
                                        )}
                                    </View>
                                </ScrollView>
                            </>
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    )
}

const styles = StyleSheet.create({
    section: {
        flex: 1,
        paddingBottom: 20,
    },

    // Grid layout styles
    gridContainer: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 20,
    },

    row: {
        justifyContent: 'space-between',
        paddingHorizontal: 0,
    },

    separator: {
        height: 16,
    },

    // Empty state styles
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 60,
    },

    emptyCard: {
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        borderRadius: 24,
        borderWidth: 2,
        borderColor: 'rgba(78, 205, 196, 0.4)',
        borderStyle: 'dashed',
        padding: 40,
        alignItems: 'center',
        width: '100%',
        maxWidth: 320,
        shadowColor: 'rgba(78, 205, 196, 0.2)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 1,
        shadowRadius: 16,
        position: 'relative',
        overflow: 'hidden',
    },

    emptyCardGlow: {
        position: 'absolute',
        top: -30,
        left: -30,
        right: -30,
        bottom: -30,
        backgroundColor: 'rgba(78, 205, 196, 0.05)',
        borderRadius: 60,
    },

    emptyCardContent: {
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        zIndex: 1,
    },

    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(78, 205, 196, 0.15)',
        borderWidth: 2,
        borderColor: 'rgba(78, 205, 196, 0.4)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        shadowColor: 'rgba(78, 205, 196, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
    },

    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 26,
    },

    emptySubtitle: {
        color: '#B8A5C4',
        fontSize: 15,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
        opacity: 0.8,
        marginBottom: 8,
    },

    emptyButton: {
        backgroundColor: '#4ECDC4',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(78, 205, 196, 0.6)',
        shadowColor: 'rgba(78, 205, 196, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },

    emptyButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        textAlign: 'center',
    },

    // User card styles for grid layout
    userCard: {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: 'rgba(42, 30, 46, 0.95)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.5)',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
        overflow: 'hidden',
        padding: 16,
    },

    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginBottom: 8,
    },

    adventureBadge: {
        backgroundColor: 'rgba(207, 56, 221, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.4)',
    },

    adventureNumber: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
        textAlign: 'center',
    },

    avatarSection: {
        alignItems: 'center',
        marginBottom: 12,
    },

    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        borderWidth: 2,
        borderColor: '#CC31E8',
    },

    userInfo: {
        flex: 1,
        alignItems: 'center',
    },

    userName: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 6,
        lineHeight: 20,
    },

    metaInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
        gap: 4,
    },

    metaText: {
        color: '#B8A5C4',
        fontSize: 10,
        fontWeight: '500',
    },

    adventureLabel: {
        color: '#d394f5',
        fontSize: 10,
        fontWeight: '500',
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 14,
    },


    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
    },

    modalBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },

    modalContent: {
        backgroundColor: 'rgba(42, 30, 46, 0.98)',
        borderRadius: 28,
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.4)',
        width: screenWidth - 32,
        maxWidth: 400,
        maxHeight: screenHeight * 0.85,
        shadowColor: 'rgba(207, 56, 221, 0.4)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 40,
        overflow: 'hidden',
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        padding: 20,
        paddingBottom: 0,
    },

    closeButton: {
        backgroundColor: 'rgba(207, 56, 221, 0.2)',
        borderRadius: 20,
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.4)',
    },

    modalProfile: {
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingBottom: 24,
    },

    modalAvatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },

    modalAvatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f4f0f5',
    },

    modalAvatarRing: {
        position: 'absolute',
        top: -4,
        left: -4,
        right: -4,
        bottom: -4,
        borderRadius: 44,
        borderWidth: 3,
        borderColor: 'rgba(207, 56, 221, 0.4)',
    },

    modalUserName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#ffffff',
        marginBottom: 16,
        textAlign: 'center',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        letterSpacing: 0.5,
        fontFamily: 'Montserrat_700Bold',
    },

    modalStats: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.2)',
    },

    statItem: {
        alignItems: 'center',
        flex: 1,
        gap: 4,
    },

    statValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f4f0f5',
    },

    statLabel: {
        fontSize: 11,
        color: '#d8cce2',
        opacity: 0.8,
    },

    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: 'rgba(207, 56, 221, 0.3)',
        marginHorizontal: 16,
    },

    modalScrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingHorizontal: 24,
        paddingBottom: 32,
    },

    modalSection: {
        marginBottom: 24,
    },

    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },

    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f4f0f5',
    },

    lastActivityCard: {
        backgroundColor: 'rgba(185, 84, 236, 0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
    },

    lastActivityName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f4f0f5',
        marginBottom: 4,
    },

    lastActivityDate: {
        fontSize: 12,
        color: '#b954ec',
        opacity: 0.8,
    },

    restaurantGrid: {
        gap: 12,
    },

    restaurantCard: {
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.2)',
    },

    restaurantName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f4f0f5',
        marginBottom: 6,
    },

    restaurantMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },

    ratingValue: {
        fontSize: 11,
        color: '#FFD700',
        fontWeight: '600',
    },

    restaurantDate: {
        fontSize: 11,
        color: '#d8cce2',
        opacity: 0.8,
    },

    activitiesGrid: {
        gap: 12,
    },

    activityCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(64, 51, 71, 0.5)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.1)',
        gap: 12,
    },

    activityEmoji: {
        fontSize: 20,
    },

    activityDetails: {
        flex: 1,
        minWidth: 0,
    },

    activityName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f4f0f5',
        marginBottom: 2,
    },

    activityMeta: {
        fontSize: 11,
        color: '#d8cce2',
        opacity: 0.8,
    },

    moreActivities: {
        textAlign: 'center',
        fontSize: 12,
        color: '#cf38dd',
        fontStyle: 'italic',
        marginTop: 8,
        opacity: 0.8,
    },
})