import React, { useState, useContext, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    ScrollView,
    Image,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Activity, CheckCircle, Mail, Zap, User, MapPin } from 'react-native-feather';
import { Hamburger, Martini } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../config';
import { getUserDisplayImage } from '../utils/avatarManager';

const ACTIVITY_CONFIG = {
    'Restaurant': {
        displayText: 'Restaurant',
        emoji: '🍜',
        icon: Hamburger,
        iconColor: '#FF6B6B'
    },
    'Cocktails': {
        displayText: 'Bar',
        emoji: '🍸',
        icon: Martini,
        iconColor: '#4ECDC4'
    },
    'Game Night': {
        displayText: 'Game Night',
        emoji: '🎮',
        icon: Activity,
        iconColor: '#A8E6CF'
    },
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
    const [year, month, day] = dateString.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const monthName = d.toLocaleString('en-US', { month: 'long' });
    const dayNum = d.getDate();
    const getOrdinalSuffix = (day) => {
        if (day >= 11 && day <= 13) return 'th';
        switch (day % 10) {
            case 1: return 'st';
            case 2: return 'nd';
            case 3: return 'rd';
            default: return 'th';
        }
    };
    return `${monthName} ${dayNum}${getOrdinalSuffix(dayNum)}`;
};

const parseLocation = (locationString) => {
    if (!locationString) return 'Location TBD';

    // If it's coordinates (lat, lng format), return generic text
    if (locationString.match(/^-?\d+\.\d+,\s*-?\d+\.\d+$/)) {
        return 'Near you';
    }

    // Otherwise, try to extract city/neighborhood
    // Format might be: "123 Main St, New York, NY" or just "Brooklyn"
    const parts = locationString.split(',').map(s => s.trim());

    // Return the last meaningful part (usually city or neighborhood)
    if (parts.length >= 2) {
        return parts[parts.length - 2] || parts[0]; // City is usually second to last
    }

    return parts[0] || 'Location set';
};

const getEventDateTime = (activity) => {
    if (!activity.date_day || !activity.date_time) return null;
    const [Y, M, D] = activity.date_day.split('-').map(Number);
    const rawTime = activity.date_time.slice(11, 19);
    const [h, m, s] = rawTime.split(':').map(Number);
    return new Date(Y, M - 1, D, h, m, s).getTime();
};

export default function ActivitiesScreen() {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();
    const [filter, setFilter] = useState('groups'); // 'groups', 'solo', 'finalized'

    // Calculate activities
    const activities = useMemo(() => {
        if (!user) return [];

        const isValidActivity = (activity) => {
            return activity && (
                activity.activity_type !== undefined ||
                activity.participants !== undefined ||
                activity.responses !== undefined ||
                activity.user_id !== undefined
            ) && !activity.email;
        };

        const mine = (user?.activities || []).filter(isValidActivity);
        const theirs = user?.participant_activities
            ?.filter(p => p.accepted && p.activity && isValidActivity(p.activity))
            .map(p => p.activity) || [];

        return [...new Map([...mine, ...theirs].map(a => [a.id, a])).values()];
    }, [user]);

    const inProgress = activities.filter(a => !a.completed);
    const soloActivities = inProgress.filter(a => !a.finalized && a.is_solo);
    const finalizedActivities = inProgress.filter(a => a.finalized);

    // Get pending invites
    const invites = user?.participant_activities
        ?.filter(p => {
            const isValidActivity = p.activity && (
                p.activity.activity_type !== undefined ||
                p.activity.participants !== undefined ||
                p.activity.responses !== undefined ||
                p.activity.user_id !== undefined
            ) && !p.activity.email;
            return !p.accepted && isValidActivity;
        })
        .map(p => p.activity) || [];

    // Group activities include all non-finalized non-solo activities
    const groupActivities = inProgress.filter(a => !a.finalized && !a.is_solo);

    // Filter activities based on selected filter
    const filteredActivities = useMemo(() => {
        const data = filter === 'solo'
            ? soloActivities
            : filter === 'finalized'
                ? finalizedActivities
                : [...invites, ...groupActivities]; // Invites at the top of groups tab

        return data.sort((a, b) => {
            const aUserResponse = a.responses?.find(r => r.user_id === user?.id);
            const bUserResponse = b.responses?.find(r => r.user_id === user?.id);
            const aIsHost = a.user_id === user?.id;
            const bIsHost = b.user_id === user?.id;

            const aActionNeeded = !aIsHost && !aUserResponse;
            const bActionNeeded = !bIsHost && !bUserResponse;

            if (aActionNeeded && !bActionNeeded) return -1;
            if (!aActionNeeded && bActionNeeded) return 1;

            const dateA = new Date(a.date_day || '9999-12-31');
            const dateB = new Date(b.date_day || '9999-12-31');
            return dateA - dateB;
        });
    }, [filter, groupActivities, soloActivities, finalizedActivities, invites, user?.id]);

    const renderActivityItem = ({ item, index }) => {
        const firstName = item.user?.name?.split(' ')[0] || '';
        const isInvite = invites.some(invite => invite.id === item.id);
        const displayInfo = getActivityDisplayInfo(item.activity_type);
        const isUserHost = item.user?.id === user?.id;

        // Get all members (host + participants)
        const allMembers = [item.user, ...(item.participants || [])].filter(Boolean);
        // Remove duplicates by id
        const uniqueMembers = [...new Map(allMembers.map(m => [m.id, m])).values()];

        const countdownTs = item.finalized && item.date_day && item.date_time
            ? getEventDateTime(item)
            : null;

        let statusText = 'Planning...';
        let statusColor = '#B8A5C4';
        let statusIcon = Activity;

        if (isInvite) {
            statusText = 'NEW INVITE';
            statusColor = '#d394f5';
            statusIcon = Mail;
        } else if (item.completed) {
            statusText = 'COMPLETED';
            statusColor = '#4ECDC4';
            statusIcon = CheckCircle;
        } else if (countdownTs) {
            const timeLeft = Math.max(countdownTs - Date.now(), 0);
            const days = Math.floor(timeLeft / (24 * 3600000));
            const hrs = Math.floor((timeLeft % (24 * 3600000)) / 3600000);
            const mins = Math.floor((timeLeft % 3600000) / 60000);

            if (timeLeft <= 0) {
                statusText = 'STARTED';
                statusColor = '#4ECDC4';
            } else {
                statusText = `${days > 0 ? days + 'd ' : ''}${hrs}h ${mins}m`;
                statusColor = '#FFE66D';
            }
        } else {
            const userResponse = item.responses?.find(r => r.user_id === user?.id);
            const isHost = item.user_id === user?.id;

            if (isHost) {
                statusText = 'WAITING FOR RESPONSES';
                statusColor = '#B954EC';
                statusIcon = Users;
            } else if (userResponse) {
                statusText = 'SUBMITTED';
                statusColor = '#4ECDC4';
                statusIcon = CheckCircle;
            } else {
                statusText = 'ACTION NEEDED';
                statusColor = '#FFE66D';
                statusIcon = Zap;
            }
        }

        return (
            <TouchableOpacity
                style={[
                    styles.listItem,
                    isInvite && styles.listItemInvite,
                    isUserHost && styles.userOwnedListItem,
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('ActivityDetails', { activityId: item.id });
                }}
                activeOpacity={0.7}
            >
                {/* Invite badge */}
                {isInvite && (
                    <View style={styles.inviteBadge}>
                        <Mail color="#fff" size={16} strokeWidth={2.5} />
                    </View>
                )}

                <View style={styles.listItemContent}>
                    <Text style={[
                        styles.listItemTitle,
                        !item.finalized && { color: 'rgba(255, 255, 255, 0.6)' }
                    ]} numberOfLines={1}>
                        {item.finalized
                            ? item.activity_name
                            : item.activity_name || 'Planning...'}
                    </Text>
                    <View style={styles.listItemMeta}>
                        <MapPin color="#B8A5C4" size={12} strokeWidth={2} />
                        <Text style={styles.listItemLocation} numberOfLines={1}>
                            {parseLocation(item.activity_location)}
                        </Text>
                    </View>

                    {/* Avatars row - for all activities */}
                    <View style={styles.participantsRow}>
                        {item.is_solo ? (
                            // Solo: just show current user
                            <>
                                <Image
                                    source={getUserDisplayImage(user, API_URL)}
                                    style={styles.soloAvatar}
                                />
                                <Text style={styles.participantCount}>Just you</Text>
                            </>
                        ) : uniqueMembers && uniqueMembers.length > 0 ? (
                            // Group: show stacked avatars
                            <>
                                <View style={styles.avatarStack}>
                                    {uniqueMembers.slice(0, 4).map((member, idx) => (
                                        <Image
                                            key={member.id}
                                            source={getUserDisplayImage(member, API_URL)}
                                            style={[
                                                styles.stackedAvatar,
                                                { marginLeft: idx === 0 ? 0 : -10 }
                                            ]}
                                        />
                                    ))}
                                    {uniqueMembers.length > 4 && (
                                        <View style={[styles.stackedAvatar, styles.avatarCount, { marginLeft: -10 }]}>
                                            <Text style={styles.avatarCountText}>
                                                +{uniqueMembers.length - 4}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={styles.participantCount}>
                                    {uniqueMembers.length} {uniqueMembers.length === 1 ? 'person' : 'people'}
                                </Text>
                            </>
                        ) : null}
                    </View>
                </View>

                {/* Right side - either countdown or icon */}
                {countdownTs ? (
                    <View style={styles.countdownContainer}>
                        <Text style={styles.countdownText}>
                            {(() => {
                                const timeLeft = Math.max(countdownTs - Date.now(), 0);
                                if (timeLeft <= 0) {
                                    return 'Started';
                                }
                                const days = Math.floor(timeLeft / (24 * 3600000));
                                const hrs = Math.floor((timeLeft % (24 * 3600000)) / 3600000);
                                const mins = Math.floor((timeLeft % 3600000) / 60000);

                                if (days > 0) {
                                    return `${days}d ${hrs}h ${mins}m`;
                                } else if (hrs > 0) {
                                    return `${hrs}h ${mins}m`;
                                } else {
                                    return `${mins}m`;
                                }
                            })()}
                        </Text>
                    </View>
                ) : (
                    <View style={styles.listItemIcon}>
                        {displayInfo.icon && (
                            <displayInfo.icon
                                color={displayInfo.iconColor}
                                size={24}
                                strokeWidth={2.5}
                            />
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft color="#fff" size={20} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Activities</Text>
                <View style={styles.headerRight}>
                    <Text style={styles.activitiesCount}>{filteredActivities.length}</Text>
                </View>
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterContainer}>
                <TouchableOpacity
                    style={[styles.filterTab, filter === 'groups' && styles.filterTabActive]}
                    onPress={() => setFilter('groups')}
                >
                    <Text style={[styles.filterTabText, filter === 'groups' && styles.filterTabTextActive]}>
                        Groups
                    </Text>
                    <View style={[styles.filterBadge, filter === 'groups' && styles.filterBadgeActive]}>
                        <Text style={styles.filterBadgeText}>{groupActivities.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterTab, filter === 'solo' && styles.filterTabActive]}
                    onPress={() => setFilter('solo')}
                >
                    <Text style={[styles.filterTabText, filter === 'solo' && styles.filterTabTextActive]}>
                        Solo
                    </Text>
                    <View style={[styles.filterBadge, filter === 'solo' && styles.filterBadgeActive]}>
                        <Text style={styles.filterBadgeText}>{soloActivities.length}</Text>
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.filterTab, filter === 'finalized' && styles.filterTabActive]}
                    onPress={() => setFilter('finalized')}
                >
                    <Text style={[styles.filterTabText, filter === 'finalized' && styles.filterTabTextActive]}>
                        Finalized
                    </Text>
                    <View style={[styles.filterBadge, filter === 'finalized' && styles.filterBadgeActive]}>
                        <Text style={styles.filterBadgeText}>{finalizedActivities.length}</Text>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Activities List */}
            <FlatList
                data={filteredActivities}
                keyExtractor={(item) => String(item.id)}
                renderItem={renderActivityItem}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
                ListEmptyComponent={() => (
                    <View style={styles.emptyContainer}>
                        <Activity stroke="#666" width={48} height={48} strokeWidth={1.5} />
                        <Text style={styles.emptyText}>No activities yet</Text>
                        <Text style={styles.emptySubtext}>
                            {filter === 'solo'
                                ? 'No solo activities in planning'
                                : filter === 'finalized'
                                    ? 'No finalized activities yet'
                                    : 'No group activities in planning'}
                        </Text>
                    </View>
                )}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },
    headerRight: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activitiesCount: {
        color: '#CC31E8',
        fontSize: 16,
        fontWeight: '600',
    },
    filterContainer: {
        flexDirection: 'row',
        marginHorizontal: 20,
        marginVertical: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 4,
        gap: 6,
    },
    filterTab: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
        borderRadius: 8,
        gap: 6,
    },
    filterTabActive: {
        backgroundColor: 'rgba(204, 49, 232, 0.2)',
    },
    filterTabText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: '600',
    },
    filterTabTextActive: {
        color: '#fff',
    },
    filterBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 10,
        minWidth: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 6,
    },
    filterBadgeActive: {
        backgroundColor: '#CC31E8',
    },
    filterBadgeText: {
        color: '#ffffff',
        fontSize: 11,
        fontWeight: '700',
    },
    listContainer: {
        padding: 20,
        flexGrow: 1,
    },
    listItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
        minHeight: 100,
    },
    listItemInvite: {
        borderColor: 'rgba(211, 148, 245, 0.6)',
        borderWidth: 2,
        backgroundColor: 'rgba(211, 148, 245, 0.08)',
        shadowColor: 'rgba(211, 148, 245, 0.5)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
    inviteBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#d394f5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#201925',
        shadowColor: '#d394f5',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.6,
        shadowRadius: 8,
        elevation: 10,
        zIndex: 10,
    },
    userOwnedListItem: {
        borderColor: 'rgba(139, 92, 246, 0.5)',
        borderWidth: 2,
        backgroundColor: 'rgba(139, 92, 246, 0.03)',
        shadowColor: '#8B5CF6',
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    listItemIcon: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    listItemContent: {
        flex: 1,
    },
    listItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },
    soloBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 230, 109, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 109, 0.3)',
    },
    soloBadgeText: {
        color: '#FFE66D',
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    groupBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(185, 84, 236, 0.15)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.3)',
    },
    groupBadgeText: {
        color: '#B954EC',
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    listItemLocation: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '500',
        flexShrink: 1,
    },
    metaSeparator: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '500',
        marginHorizontal: 2,
    },
    participantsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
    },
    soloAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2.5,
        borderColor: '#2A1E30',
        backgroundColor: '#2A1E30',
    },
    avatarStack: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stackedAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        borderWidth: 2.5,
        borderColor: '#2A1E30',
        backgroundColor: '#2A1E30',
    },
    avatarCount: {
        backgroundColor: '#B954EC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarCountText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    participantCount: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
    countdownContainer: {
        minWidth: 80,
        backgroundColor: 'rgba(255, 230, 109, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 109, 0.3)',
        marginLeft: 16,
    },
    countdownText: {
        color: '#FFE66D',
        fontSize: 12,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
    },
    listItemStatus: {
        alignItems: 'flex-end',
        justifyContent: 'center',
        minWidth: 80,
        gap: 4,
    },
    listItemStatusIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    listItemStatusText: {
        fontSize: 12,
        fontWeight: '700',
        textAlign: 'right',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listItemInviteStatusText: {
        fontSize: 13,
        fontWeight: '800',
        shadowColor: 'currentColor',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    listSeparator: {
        height: 12,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 18,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptySubtext: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 40,
    },
});
