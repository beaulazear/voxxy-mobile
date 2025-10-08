import React, { useState, useContext, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    FlatList,
    ScrollView,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft, Users, Activity, CheckCircle, Mail, Zap } from 'react-native-feather';
import { Hamburger, Martini } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

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
    const [filter, setFilter] = useState('active'); // 'active', 'finalized', 'invites'

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
    const activeActivities = inProgress.filter(a => !a.finalized);
    const finalizedActivities = inProgress.filter(a => a.finalized);
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

    // Filter activities based on selected filter
    const filteredActivities = useMemo(() => {
        const data = filter === 'invites'
            ? invites
            : filter === 'finalized'
                ? finalizedActivities
                : activeActivities;

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
    }, [filter, activeActivities, finalizedActivities, invites, user?.id]);

    const renderActivityItem = ({ item, index }) => {
        const firstName = item.user?.name?.split(' ')[0] || '';
        const isInvite = invites.some(invite => invite.id === item.id);
        const displayInfo = getActivityDisplayInfo(item.activity_type);
        const isUserHost = item.user?.id === user?.id;

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
                <View style={styles.listItemIcon}>
                    {displayInfo.icon && (
                        <displayInfo.icon
                            color={displayInfo.iconColor}
                            size={24}
                            strokeWidth={2.5}
                        />
                    )}
                </View>

                <View style={styles.listItemContent}>
                    <Text style={[
                        styles.listItemTitle,
                        !item.finalized && { color: 'rgba(255, 255, 255, 0.6)' }
                    ]} numberOfLines={1}>
                        {item.finalized
                            ? item.activity_name
                            : item.voting
                                ? 'Choosing Venue'
                                : 'Collecting'}
                    </Text>
                    <View style={styles.listItemMeta}>
                        <Text style={styles.listItemType}>{displayInfo.displayText}</Text>
                        <Text style={styles.listItemHost}>by {isUserHost ? 'you' : firstName}</Text>
                        {item.finalized && item.date_day && (
                            <Text style={styles.listItemDate}>{formatDate(item.date_day)}</Text>
                        )}
                    </View>
                </View>

                <View style={styles.listItemStatus}>
                    {isInvite && statusIcon && (
                        <View style={[styles.listItemStatusIcon, { backgroundColor: statusColor + '20' }]}>
                            {React.createElement(statusIcon, { color: statusColor, size: 16, strokeWidth: 2.5 })}
                        </View>
                    )}
                    <Text style={[
                        styles.listItemStatusText,
                        { color: statusColor },
                        isInvite && styles.listItemInviteStatusText
                    ]}>
                        {statusText}
                    </Text>
                </View>
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
                    style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
                    onPress={() => setFilter('active')}
                >
                    <Text style={[styles.filterTabText, filter === 'active' && styles.filterTabTextActive]}>
                        Active
                    </Text>
                    <View style={[styles.filterBadge, filter === 'active' && styles.filterBadgeActive]}>
                        <Text style={styles.filterBadgeText}>{activeActivities.length}</Text>
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

                <TouchableOpacity
                    style={[styles.filterTab, filter === 'invites' && styles.filterTabActive]}
                    onPress={() => setFilter('invites')}
                >
                    <Text style={[styles.filterTabText, filter === 'invites' && styles.filterTabTextActive]}>
                        Invites
                    </Text>
                    <View style={[styles.filterBadge, filter === 'invites' && styles.filterBadgeActive]}>
                        <Text style={styles.filterBadgeText}>{invites.length}</Text>
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
                            {filter === 'invites'
                                ? 'No pending invites'
                                : filter === 'finalized'
                                    ? 'No finalized activities yet'
                                    : 'No active activities in planning'}
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
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.2)',
        shadowColor: 'rgba(0, 0, 0, 0.3)',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 4,
        elevation: 3,
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
        marginRight: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    listItemContent: {
        flex: 1,
        marginRight: 12,
    },
    listItemTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },
    listItemMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    listItemType: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listItemHost: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        fontWeight: '500',
        fontStyle: 'italic',
    },
    listItemDate: {
        color: '#4ECDC4',
        fontSize: 13,
        fontWeight: '500',
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
