import React, { useState, useContext, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Image,
    ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { Users, Activity, CheckCircle, Mail, Zap, MapPin, Plus, Calendar } from 'react-native-feather';
import { Hamburger, Martini } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { API_URL } from '../config';
import { getUserDisplayImage } from '../utils/avatarManager';
import VoxxyFooter from '../components/VoxxyFooter';
import UnifiedActivityChat from '../components/UnifiedActivityChat';
import VoxxyLogo from '../assets/header.svg';

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

const formatCreatedDate = (createdAt) => {
    if (!createdAt) return 'Recently created';
    const date = new Date(createdAt);
    const monthName = date.toLocaleString('en-US', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    const currentYear = new Date().getFullYear();

    // Only show year if it's not the current year
    if (year !== currentYear) {
        return `Created ${monthName} ${day}, ${year}`;
    }
    return `Created ${monthName} ${day}`;
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

// Avatar component with loading state
const AvatarWithLoader = ({ source, style, isStacked = false, index = 0 }) => {
    const [loading, setLoading] = useState(true);

    return (
        <View style={{ position: 'relative' }}>
            {loading && (
                <View style={[style, styles.avatarPlaceholder, { position: 'absolute' }]}>
                    <View style={styles.avatarShimmer} />
                </View>
            )}
            <Image
                source={source}
                style={style}
                onLoadStart={() => setLoading(true)}
                onLoad={() => setLoading(false)}
                onError={() => setLoading(false)}
            />
        </View>
    );
};

export default function ActivitiesScreen() {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();
    const [filter, setFilter] = useState('groups'); // 'groups', 'solo', 'finalized'
    const [showActivityCreation, setShowActivityCreation] = useState(false);

    // Handle activity creation completion
    const handleActivityCreated = (newActivityId) => {
        if (newActivityId) {
            setShowActivityCreation(false);
            navigation.navigate('ActivityDetails', { activityId: newActivityId });
        } else {
            setShowActivityCreation(false);
        }
    };

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
            // For finalized activities, sort by start date (soonest first)
            if (filter === 'finalized') {
                const dateA = new Date(a.date_day || '9999-12-31');
                const dateB = new Date(b.date_day || '9999-12-31');
                return dateA - dateB;
            }

            // For non-finalized activities (groups and solo)
            // First, prioritize invites and action needed items
            const aUserResponse = a.responses?.find(r => r.user_id === user?.id);
            const bUserResponse = b.responses?.find(r => r.user_id === user?.id);
            const aIsHost = a.user_id === user?.id;
            const bIsHost = b.user_id === user?.id;

            const aIsInvite = invites.some(invite => invite.id === a.id);
            const bIsInvite = invites.some(invite => invite.id === b.id);
            const aActionNeeded = !aIsHost && !aUserResponse;
            const bActionNeeded = !bIsHost && !bUserResponse;

            // Invites come first
            if (aIsInvite && !bIsInvite) return -1;
            if (!aIsInvite && bIsInvite) return 1;

            // Then action needed items
            if (aActionNeeded && !bActionNeeded) return -1;
            if (!aActionNeeded && bActionNeeded) return 1;

            // Finally, sort by created_at date (newest first)
            const createdA = new Date(a.created_at || '1970-01-01');
            const createdB = new Date(b.created_at || '1970-01-01');
            return createdB - createdA; // Descending order (newest first)
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
        let StatusIcon = Activity;

        if (isInvite) {
            statusText = 'NEW INVITE';
            statusColor = '#d394f5';
            StatusIcon = Mail;
        } else if (item.completed) {
            statusText = 'COMPLETED';
            statusColor = '#4ECDC4';
            StatusIcon = CheckCircle;
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
                StatusIcon = Users;
            } else if (userResponse) {
                statusText = 'SUBMITTED';
                statusColor = '#4ECDC4';
                StatusIcon = CheckCircle;
            } else {
                statusText = 'ACTION NEEDED';
                statusColor = '#FFE66D';
                StatusIcon = Zap;
            }
        }

        return (
            <TouchableOpacity
                style={[
                    styles.listItem,
                    isInvite && styles.listItemInvite,
                ]}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    navigation.navigate('ActivityDetails', { activityId: item.id });
                }}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={
                        isInvite
                            ? ['rgba(211, 148, 245, 0.15)', 'rgba(185, 84, 236, 0.1)']
                            : isUserHost
                            ? ['rgba(139, 92, 246, 0.12)', 'rgba(139, 92, 246, 0.05)']
                            : ['rgba(42, 30, 46, 0.8)', 'rgba(32, 25, 37, 0.9)']
                    }
                    style={styles.listItemGradient}
                >
                    {/* Invite badge */}
                    {isInvite && (
                        <View style={styles.inviteBadge}>
                            <Mail color="#fff" size={16} strokeWidth={2.5} />
                        </View>
                    )}

                    <View style={styles.listItemContent}>
                        {/* Title and Status Badge */}
                        <View style={styles.listItemHeader}>
                            <View style={styles.titleContainer}>
                                <Text style={[
                                    styles.listItemTitle,
                                    !item.finalized && { color: 'rgba(255, 255, 255, 0.7)' }
                                ]} numberOfLines={1}>
                                    {item.finalized
                                        ? item.activity_name
                                        : item.activity_name || 'Planning...'}
                                </Text>
                            </View>
                        </View>

                        {/* Location and Date Row */}
                        <View style={styles.metaRow}>
                            <View style={styles.metaItem}>
                                <MapPin color="rgba(255, 255, 255, 0.5)" size={14} strokeWidth={2} />
                                <Text style={styles.metaText} numberOfLines={1}>
                                    {parseLocation(item.activity_location)}
                                </Text>
                            </View>
                            {item.date_day && (
                                <View style={styles.metaItem}>
                                    <Calendar color="rgba(255, 255, 255, 0.5)" size={14} strokeWidth={2} />
                                    <Text style={styles.metaText}>
                                        {formatDate(item.date_day)}
                                    </Text>
                                </View>
                            )}
                        </View>

                        {/* Status Badge - only show for invites */}
                        {isInvite && (
                            <View style={[styles.statusBadge, { backgroundColor: `${statusColor}20` }]}>
                                <StatusIcon color={statusColor} size={14} strokeWidth={2.5} />
                                <Text style={[styles.statusText, { color: statusColor }]}>
                                    {statusText}
                                </Text>
                            </View>
                        )}

                        {/* Avatars row - for all activities */}
                        <View style={styles.participantsRow}>
                            {item.is_solo ? (
                                // Solo: show creation date
                                <Text style={styles.createdDateText}>
                                    {formatCreatedDate(item.created_at)}
                                </Text>
                            ) : uniqueMembers && uniqueMembers.length > 0 ? (
                                // Group: show stacked avatars
                                <>
                                    <View style={styles.avatarStack}>
                                        {uniqueMembers.slice(0, 4).map((member, idx) => (
                                            <AvatarWithLoader
                                                key={member.id}
                                                source={getUserDisplayImage(member, API_URL)}
                                                style={[
                                                    styles.stackedAvatar,
                                                    { marginLeft: idx === 0 ? 0 : -10 }
                                                ]}
                                                isStacked={true}
                                                index={idx}
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

                        {/* Created date for group activities */}
                        {!item.is_solo && (
                            <Text style={[styles.createdDateText, styles.groupCreatedDate]}>
                                {formatCreatedDate(item.created_at)}
                            </Text>
                        )}
                    </View>

                    {/* Right side - activity icon or countdown */}
                    <View style={styles.rightSection}>
                        {countdownTs ? (
                            <View style={styles.countdownContainer}>
                                <Text style={styles.countdownLabel}>Starts in</Text>
                                <Text style={styles.countdownText}>
                                    {(() => {
                                        const timeLeft = Math.max(countdownTs - Date.now(), 0);
                                        if (timeLeft <= 0) {
                                            return 'Now';
                                        }
                                        const days = Math.floor(timeLeft / (24 * 3600000));
                                        const hrs = Math.floor((timeLeft % (24 * 3600000)) / 3600000);
                                        const mins = Math.floor((timeLeft % 3600000) / 60000);

                                        if (days > 0) {
                                            return `${days}d ${hrs}h`;
                                        } else if (hrs > 0) {
                                            return `${hrs}h ${mins}m`;
                                        } else {
                                            return `${mins}m`;
                                        }
                                    })()}
                                </Text>
                            </View>
                        ) : (
                            <View style={[styles.activityIconContainer, { backgroundColor: `${displayInfo.iconColor}20` }]}>
                                {displayInfo.icon && (
                                    <displayInfo.icon
                                        color={displayInfo.iconColor}
                                        size={28}
                                        strokeWidth={2}
                                    />
                                )}
                            </View>
                        )}
                    </View>
                </LinearGradient>
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoGlow}>
                            <VoxxyLogo height={36} width={120} />
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.headerRight}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            setShowActivityCreation(true);
                        }}
                        activeOpacity={0.7}
                    >
                        <Plus color="#fff" size={22} strokeWidth={2.5} />
                    </TouchableOpacity>
                </View>
                <LinearGradient
                    colors={['#B954EC', '#667eea', '#B954EC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerBorder}
                />
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

            <VoxxyFooter hasPendingInvites={invites.length > 0} />

            {/* Unified Activity Creation Modal */}
            <UnifiedActivityChat
                visible={showActivityCreation}
                onClose={handleActivityCreated}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    headerContainer: {
        backgroundColor: '#201925',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        paddingHorizontal: 20,
        backgroundColor: '#201925',
    },
    headerBorder: {
        height: 2,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },
    logoContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    logoGlow: {
        shadowColor: '#9f2fce',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 12,
    },
    headerRight: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(204, 49, 232, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.5)',
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
        paddingBottom: 100, // Add padding for fixed footer
        flexGrow: 1,
    },
    listItem: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    listItemGradient: {
        flexDirection: 'row',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: 16,
        minHeight: 110,
    },
    listItemInvite: {
        borderWidth: 2,
        shadowColor: 'rgba(211, 148, 245, 0.5)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 8,
    },
    inviteBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
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
    listItemContent: {
        flex: 1,
    },
    listItemHeader: {
        marginBottom: 8,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    listItemTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
    },
    soloTag: {
        backgroundColor: 'rgba(255, 230, 109, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 230, 109, 0.3)',
    },
    soloTagText: {
        color: '#FFE66D',
        fontSize: 10,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
        gap: 12,
        flexWrap: 'wrap',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 6,
        marginBottom: 10,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    rightSection: {
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 16,
    },
    activityIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    participantsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        gap: 10,
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
    avatarPlaceholder: {
        top: 0,
        left: 0,
        backgroundColor: 'rgba(184, 165, 196, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
    },
    avatarShimmer: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(184, 165, 196, 0.3)',
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
    createdDateText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 12,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    groupCreatedDate: {
        marginTop: 8,
    },
    countdownContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 70,
    },
    countdownLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 10,
        fontWeight: '600',
        marginBottom: 4,
        textAlign: 'center',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    countdownText: {
        color: '#FFE66D',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
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
