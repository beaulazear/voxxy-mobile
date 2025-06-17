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
} from 'react-native'
import { UserContext } from '../context/UserContext'
import { Users, Calendar, MapPin, Utensils, Clock } from 'react-native-feather'
import SmallTriangle from '../assets/voxxy-triangle.png'

const { width: screenWidth } = Dimensions.get('window')

export default function YourCommunity({ showInvitePopup, onSelectUser, onCreateBoard }) {
    const { user } = useContext(UserContext)
    const [showAll, setShowAll] = useState(false)
    const [selectedPeer, setSelectedPeer] = useState(null)

    if (!user) return null

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

    if (community.length === 0) {
        return (
            <View style={styles.noCommunityContainer}>
                <Image source={SmallTriangle} style={styles.noCommunityAvatar} />
                <Text style={styles.noCommunityTitle}>No Voxxy Crew Yet</Text>
                <Text style={styles.noCommunitySubtitle}>
                    Start an activity and invite friends to build your crew!
                </Text>
                {onCreateBoard && (
                    <TouchableOpacity style={styles.createButton} onPress={onCreateBoard}>
                        <Text style={styles.createButtonText}>Get Started Now</Text>
                    </TouchableOpacity>
                )}
            </View>
        )
    }

    const displayed = showAll ? community : community.slice(0, 3)

    function handleCardClick(peerData) {
        if (showInvitePopup && onSelectUser) {
            onSelectUser(peerData.user)
        } else {
            setSelectedPeer(peerData)
        }
    }

    return (
        <View style={styles.wrapper}>
            <View style={styles.header}>
                <Text style={styles.titleText}>Your Voxxy Crew 🎭</Text>
                <Text style={styles.subtitle}>Friends you've gone on adventures with</Text>
            </View>

            <ScrollView style={styles.scrollArea} showsVerticalScrollIndicator={false}>
                <View style={styles.grid}>
                    {displayed.map(peerData => (
                        <TouchableOpacity
                            key={peerData.user.id}
                            style={styles.card}
                            onPress={() => handleCardClick(peerData)}
                            activeOpacity={0.8}
                        >
                            <View style={styles.cardHeader}>
                                <Image
                                    source={peerData.user.avatar ? { uri: peerData.user.avatar } : SmallTriangle}
                                    style={[
                                        styles.avatar,
                                        peerData.user.avatar ? styles.avatarWithImage : styles.avatarDefault
                                    ]}
                                />
                                <View style={styles.userInfo}>
                                    <Text style={styles.peerName}>{peerData.user.name}</Text>
                                    <View style={styles.joinDate}>
                                        <Calendar stroke="#d8cce2" width={12} height={12} />
                                        <Text style={styles.joinDateText}>
                                            On Voxxy since {formatSince(peerData.firstActivity)}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.activityBadge}>
                                    <Text style={styles.badgeCount}>{peerData.count}</Text>
                                    <Text style={styles.badgeLabel}>Activities</Text>
                                </View>
                            </View>

                            {peerData.recentRestaurants.length > 0 && (
                                <View style={styles.recentVenue}>
                                    <MapPin stroke="#cf38dd" width={12} height={12} />
                                    <Text style={styles.recentVenueText} numberOfLines={1}>
                                        Recent: {peerData.recentRestaurants[peerData.recentRestaurants.length - 1].name}
                                    </Text>
                                    {peerData.recentRestaurants[peerData.recentRestaurants.length - 1].rating && (
                                        <Text style={styles.rating}>
                                            ⭐ {peerData.recentRestaurants[peerData.recentRestaurants.length - 1].rating}
                                        </Text>
                                    )}
                                </View>
                            )}

                            <View style={styles.lastActivity}>
                                <Clock stroke="#b954ec" width={12} height={12} />
                                <Text style={styles.lastActivityText} numberOfLines={1}>
                                    Last: <Text style={styles.lastActivityName}>{peerData.lastName}</Text>
                                </Text>
                            </View>

                            <View style={styles.activityCountTag}>
                                <Text style={styles.activityCountTagText}>
                                    {peerData.count}+ activities
                                </Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {community.length > 3 && (
                <TouchableOpacity
                    style={styles.toggle}
                    onPress={() => setShowAll(v => !v)}
                    activeOpacity={0.8}
                >
                    <Text style={styles.toggleText}>
                        {showAll ? 'Show Less' : `View All ${community.length} Members`}
                    </Text>
                </TouchableOpacity>
            )}

            {selectedPeer && !showInvitePopup && (
                <Modal
                    visible={true}
                    transparent={true}
                    animationType="fade"
                    onRequestClose={() => setSelectedPeer(null)}
                >
                    <TouchableOpacity
                        style={styles.modalOverlay}
                        activeOpacity={1}
                        onPress={() => setSelectedPeer(null)}
                    >
                        <View style={styles.modalContent}>
                            <TouchableOpacity
                                style={styles.closeButton}
                                onPress={() => setSelectedPeer(null)}
                            >
                                <Text style={styles.closeButtonText}>×</Text>
                            </TouchableOpacity>

                            <View style={styles.modalHeader}>
                                <Image
                                    source={selectedPeer.user.avatar ? { uri: selectedPeer.user.avatar } : SmallTriangle}
                                    style={[
                                        styles.modalAvatar,
                                        selectedPeer.user.avatar ? styles.avatarWithImage : styles.avatarDefault
                                    ]}
                                />
                                <View style={styles.userDetails}>
                                    <Text style={styles.modalPeerName}>{selectedPeer.user.name}</Text>
                                    <View style={styles.modalJoinDate}>
                                        <Calendar stroke="#d8cce2" width={14} height={14} />
                                        <Text style={styles.modalJoinDateText}>
                                            Voxxing since {formatSince(selectedPeer.firstActivity)}
                                        </Text>
                                    </View>
                                    <View style={styles.activityCount}>
                                        <Users stroke="#d394f5" width={14} height={14} />
                                        <Text style={styles.activityCountText}>
                                            {selectedPeer.count} shared activities
                                        </Text>
                                    </View>
                                </View>
                            </View>

                            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                                {selectedPeer.recentRestaurants.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionTitle}>
                                            <Utensils stroke="#cf38dd" width={16} height={16} />
                                            <Text style={styles.sectionTitleText}>Recent Restaurant Picks</Text>
                                        </View>
                                        <View style={styles.restaurantList}>
                                            {selectedPeer.recentRestaurants
                                                .sort((a, b) => new Date(b.date) - new Date(a.date))
                                                .slice(0, 3)
                                                .map((restaurant, idx) => (
                                                    <View key={idx} style={styles.restaurantItem}>
                                                        <Text style={styles.restaurantName}>{restaurant.name}</Text>
                                                        <View style={styles.restaurantMeta}>
                                                            {restaurant.rating && (
                                                                <Text style={styles.restaurantRating}>⭐ {restaurant.rating}</Text>
                                                            )}
                                                            <Text style={styles.restaurantDate}>{formatDate(restaurant.date)}</Text>
                                                        </View>
                                                    </View>
                                                ))}
                                        </View>
                                    </View>
                                )}

                                <View style={styles.section}>
                                    <View style={styles.sectionTitle}>
                                        <Calendar stroke="#cf38dd" width={16} height={16} />
                                        <Text style={styles.sectionTitleText}>
                                            Shared Activities ({selectedPeer.count})
                                        </Text>
                                    </View>
                                    <View style={styles.activitiesList}>
                                        {selectedPeer.sharedActivities
                                            .sort((a, b) => new Date(b.date) - new Date(a.date))
                                            .slice(0, 5)
                                            .map((activity, idx) => (
                                                <View key={idx} style={styles.activityItem}>
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
                                        {selectedPeer.sharedActivities.length > 5 && (
                                            <Text style={styles.moreActivities}>
                                                +{selectedPeer.sharedActivities.length - 5} more activities
                                            </Text>
                                        )}
                                    </View>
                                </View>
                            </ScrollView>
                        </View>
                    </TouchableOpacity>
                </Modal>
            )}
        </View>
    )
}

const styles = StyleSheet.create({
    wrapper: {
        paddingBottom: 20,
    },

    header: {
        paddingHorizontal: 16,
        paddingTop: 48,
        paddingBottom: 16,
    },

    titleText: {
        fontFamily: 'Montserrat_700Bold',
        fontSize: Math.min(screenWidth * 0.06, 28),
        fontWeight: '700',
        color: '#f4f0f5',
        marginBottom: 8,
    },

    subtitle: {
        fontFamily: 'Inter_400Regular',
        fontSize: Math.min(screenWidth * 0.04, 18),
        color: '#d8cce2',
    },

    scrollArea: {
        paddingHorizontal: 16,
    },

    grid: {
        gap: 16,
    },

    card: {
        backgroundColor: 'rgba(42, 30, 46, 0.9)',
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.3)',
        borderRadius: 16,
        padding: 16,
        shadowColor: 'rgba(207, 56, 221, 0.2)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },

    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
        gap: 16,
    },

    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f4f0f5',
    },

    avatarWithImage: {
        borderWidth: 3,
        borderColor: 'rgba(207, 56, 221, 0.6)',
    },

    avatarDefault: {
        borderWidth: 4,
        borderColor: '#cf38dd',
    },

    userInfo: {
        flex: 1,
        minWidth: 0,
    },

    peerName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#f4f0f5',
        marginBottom: 4,
        textShadowColor: 'rgba(0, 0, 0, 0.3)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    joinDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },

    joinDateText: {
        fontSize: 12,
        color: '#d8cce2',
    },

    activityBadge: {
        backgroundColor: '#cf38dd',
        borderRadius: 10,
        paddingVertical: 6,
        paddingHorizontal: 10,
        alignItems: 'center',
        minWidth: 55,
        borderWidth: 2,
        borderColor: 'rgba(244, 240, 245, 0.2)',
    },

    badgeCount: {
        fontSize: 16,
        fontWeight: '800',
        color: '#f4f0f5',
        textShadowColor: 'rgba(0, 0, 0, 0.5)',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 2,
    },

    badgeLabel: {
        fontSize: 9,
        color: 'rgba(244, 240, 245, 0.9)',
        textTransform: 'uppercase',
        fontWeight: '600',
    },

    recentVenue: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        padding: 6,
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.2)',
    },

    recentVenueText: {
        flex: 1,
        fontSize: 13,
        color: '#d394f5',
        fontWeight: '500',
    },

    rating: {
        fontSize: 11,
        color: '#d394f5',
    },

    lastActivity: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    lastActivityText: {
        flex: 1,
        fontSize: 12,
        color: '#d8cce2',
    },

    lastActivityName: {
        color: '#cf38dd',
        fontWeight: '500',
        fontStyle: 'italic',
    },

    toggle: {
        alignSelf: 'center',
        marginTop: 32,
        marginBottom: 16,
        backgroundColor: '#cf38dd',
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.6)',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 999,
        shadowColor: 'rgba(207, 56, 221, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },

    toggleText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#f4f0f5',
    },

    activityCountTag: {
        marginTop: 8,
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(185, 84, 236, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.4)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 4,
    },

    activityCountTagText: {
        fontSize: 11,
        color: '#b954ec',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // No Community Styles
    noCommunityContainer: {
        alignItems: 'center',
        padding: 48,
        marginVertical: 24,
    },

    noCommunityAvatar: {
        width: 80,
        height: 80,
        marginBottom: 24,
        opacity: 0.6,
    },

    noCommunityTitle: {
        fontSize: 24,
        color: '#f4f0f5',
        fontWeight: '700',
        marginBottom: 12,
        textAlign: 'center',
    },

    noCommunitySubtitle: {
        color: '#d8cce2',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        paddingHorizontal: 32,
        lineHeight: 22,
    },

    createButton: {
        backgroundColor: '#cf38dd',
        paddingHorizontal: 32,
        paddingVertical: 16,
        borderRadius: 999,
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.6)',
        shadowColor: 'rgba(207, 56, 221, 0.4)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
    },

    createButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 16,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 16,
    },

    modalContent: {
        backgroundColor: 'rgba(42, 30, 46, 0.95)',
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.4)',
        borderRadius: 20,
        padding: 32,
        width: '100%',
        maxWidth: 480,
        maxHeight: '80%',
        position: 'relative',
        shadowColor: 'rgba(207, 56, 221, 0.3)',
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 40,
    },

    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        backgroundColor: 'rgba(207, 56, 221, 0.2)',
        borderWidth: 2,
        borderColor: 'rgba(207, 56, 221, 0.4)',
        borderRadius: 18,
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },

    closeButtonText: {
        fontSize: 20,
        color: '#f4f0f5',
        fontWeight: '600',
    },

    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 32,
        gap: 16,
    },

    modalAvatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#f4f0f5',
    },

    userDetails: {
        flex: 1,
    },

    modalPeerName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#f4f0f5',
        marginBottom: 4,
    },

    modalJoinDate: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
    },

    modalJoinDateText: {
        fontSize: 14,
        color: '#d8cce2',
    },

    activityCount: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },

    activityCountText: {
        fontSize: 14,
        color: '#d394f5',
    },

    modalScrollView: {
        maxHeight: 400,
    },

    section: {
        marginBottom: 24,
    },

    sectionTitle: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 16,
    },

    sectionTitleText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#f4f0f5',
    },

    restaurantList: {
        gap: 12,
    },

    restaurantItem: {
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.2)',
        borderRadius: 8,
        padding: 12,
    },

    restaurantName: {
        fontWeight: '600',
        color: '#f4f0f5',
        marginBottom: 4,
        fontSize: 14,
    },

    restaurantMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },

    restaurantRating: {
        fontSize: 12,
        color: '#d8cce2',
    },

    restaurantDate: {
        fontSize: 12,
        color: '#d8cce2',
    },

    activitiesList: {
        gap: 12,
    },

    activityItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: 12,
        backgroundColor: 'rgba(64, 51, 71, 0.5)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.1)',
    },

    activityEmoji: {
        fontSize: 24,
    },

    activityDetails: {
        flex: 1,
        minWidth: 0,
    },

    activityName: {
        fontWeight: '600',
        color: '#f4f0f5',
        marginBottom: 4,
        fontSize: 14,
    },

    activityMeta: {
        fontSize: 12,
        color: '#d8cce2',
    },

    moreActivities: {
        textAlign: 'center',
        fontSize: 13,
        color: '#cf38dd',
        fontStyle: 'italic',
        padding: 8,
    },
})