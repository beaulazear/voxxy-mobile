import React, { useState, useContext, useEffect } from 'react';
import {
    SafeAreaView,
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    RefreshControl,
    ActivityIndicator,
    Alert,
    StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Bell, CheckCircle, User, Calendar, MessageCircle, X, Clock } from 'react-native-feather';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import PushNotificationService from '../services/PushNotificationService';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';

const NOTIFICATION_TYPES = {
    'activity_invite': {
        icon: User,
        color: '#8b5cf6',
        bgColor: 'rgba(139, 92, 246, 0.1)',
    },
    'activity_update': {
        icon: Bell,
        color: '#3b82f6',
        bgColor: 'rgba(59, 130, 246, 0.1)',
    },
    'activity_finalized': {
        icon: CheckCircle,
        color: '#10b981',
        bgColor: 'rgba(16, 185, 129, 0.1)',
    },
    'reminder': {
        icon: Calendar,
        color: '#f59e0b',
        bgColor: 'rgba(245, 158, 11, 0.1)',
    },
    'comment': {
        icon: MessageCircle,
        color: '#ec4899',
        bgColor: 'rgba(236, 72, 153, 0.1)',
    },
    'general': {
        icon: Bell,
        color: '#6b7280',
        bgColor: 'rgba(107, 114, 128, 0.1)',
    },
};

const formatTime = (dateString) => {
    if (!dateString) {
        console.log('⚠️ No timestamp provided for notification');
        return 'Recently';
    }
    
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = now - date;
    const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInDays === 1) return 'Yesterday';
    if (diffInDays < 7) return `${diffInDays}d ago`;
    
    // For older notifications, show date and time
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        ...(date.getFullYear() !== now.getFullYear() && { year: 'numeric' })
    });
};

const NotificationItem = ({ notification, onPress, onMarkAsRead, onDelete }) => {
    const typeConfig = NOTIFICATION_TYPES[notification.type] || NOTIFICATION_TYPES.general;
    const IconComponent = typeConfig.icon;
    
    return (
        <TouchableOpacity
            style={[
                styles.notificationItem,
                !notification.read && styles.unreadNotification
            ]}
            onPress={() => onPress(notification)}
            activeOpacity={0.7}
        >
            <View style={styles.notificationContent}>
                <View style={[styles.iconContainer, { backgroundColor: typeConfig.bgColor }]}>
                    <IconComponent color={typeConfig.color} size={20} />
                </View>
                
                <View style={styles.textContainer}>
                    <Text style={styles.notificationTitle} numberOfLines={2}>
                        {notification.title}
                    </Text>
                    <Text style={styles.notificationBody} numberOfLines={3}>
                        {notification.body}
                    </Text>
                    <View style={styles.timeContainer}>
                        <Clock color="#B8A5C4" size={12} style={{ marginRight: 4 }} />
                        <Text style={styles.notificationTime}>
                            {formatTime(notification.created_at || notification.createdAt)}
                        </Text>
                    </View>
                </View>
                
                {!notification.read && <View style={styles.unreadDot} />}
            </View>
            
            <View style={styles.actionButtons}>
                {!notification.read && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => onMarkAsRead(notification.id)}
                    >
                        <CheckCircle color="#10b981" size={18} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => onDelete(notification.id)}
                >
                    <X color="#ef4444" size={18} />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};


export default function NotificationsScreen() {
    const navigation = useNavigation();
    const userContext = useContext(UserContext);
    console.log('🔍 DEBUG: userContext keys:', userContext ? Object.keys(userContext) : 'null');
    console.log('🔍 DEBUG: setUnreadNotificationCount type:', typeof userContext?.setUnreadNotificationCount);
    
    const { user } = userContext;
    const unreadNotificationCount = userContext.unreadNotificationCount || 0;
    const setUnreadNotificationCount = userContext.setUnreadNotificationCount || (() => {
        console.warn('setUnreadNotificationCount function not available');
    });
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    // Clear system badge when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            // Clear the system badge count when viewing notifications
            PushNotificationService.clearBadge();
        }, [])
    );

    const fetchNotifications = async (isRefresh = false) => {
        try {
            if (!isRefresh) setLoading(true);
            
            const data = await safeAuthApiCall(`${API_URL}/notifications`, user.token, { method: 'GET' });
            
            // Debug: Check if timestamps are present
            if (data && data.length > 0) {
                console.log('🕒 Sample notification timestamp:', {
                    created_at: data[0].created_at,
                    createdAt: data[0].createdAt,
                    title: data[0].title
                });
            }
            
            setNotifications(data || []);
            
            // Count unread notifications
            const unreadCount = (data || []).filter(n => !n.read).length;
            setUnreadNotificationCount(unreadCount);
            
            // Auto-mark all notifications as read when visiting the screen (not on refresh)
            if (unreadCount > 0 && !isRefresh) {
                setTimeout(() => {
                    markAllAsReadSilently();
                }, 500); // Small delay to let the UI render first
            }
        } catch (error) {
            console.error('Error fetching notifications:', error);
            const userMessage = handleApiError(error, 'Failed to load notifications');
            if (!isRefresh) {
                Alert.alert('Error', userMessage);
            }
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const markAsRead = async (notificationId) => {
        try {
            await safeAuthApiCall(`${API_URL}/notifications/${notificationId}/mark_as_read`, user.token, { method: 'PUT' });
            
            setNotifications(prev => 
                prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, read: true }
                        : notif
                )
            );
            setUnreadNotificationCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error('Error marking notification as read:', error);
            Alert.alert('Error', 'Failed to mark notification as read');
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await safeAuthApiCall(`${API_URL}/notifications/${notificationId}`, user.token, { method: 'DELETE' });
            
            const deletedNotification = notifications.find(n => n.id === notificationId);
            setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
            
            if (deletedNotification && !deletedNotification.read) {
                setUnreadNotificationCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error('Error deleting notification:', error);
            Alert.alert('Error', 'Failed to delete notification');
        }
    };

    const markAllAsRead = async () => {
        if (unreadNotificationCount === 0) return;

        try {
            await safeAuthApiCall(`${API_URL}/notifications/mark_all_as_read`, user.token, { method: 'PUT' });
            
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, read: true }))
            );
            setUnreadNotificationCount(0);
        } catch (error) {
            console.error('Error marking all as read:', error);
            Alert.alert('Error', 'Failed to mark all notifications as read');
        }
    };

    // Silent version for auto-marking as read when visiting screen
    const markAllAsReadSilently = async () => {
        try {
            await safeAuthApiCall(`${API_URL}/notifications/mark_all_as_read`, user.token, { method: 'PUT' });
            
            setNotifications(prev => 
                prev.map(notif => ({ ...notif, read: true }))
            );
            setUnreadNotificationCount(0);
        } catch (error) {
            console.log('Could not auto-mark notifications as read:', error.message);
        }
    };

    const handleNotificationPress = (notification) => {
        console.log('🔍 DEBUG Notification pressed:', {
            title: notification.title,
            body: notification.body,
            type: notification.type,
            data: notification.data,
            hasActivityId: !!notification.data?.activityId
        });

        // Mark as read when pressed
        if (!notification.read) {
            markAsRead(notification.id);
        }

        // Navigate based on notification type with forceRefresh flag
        if (notification.data?.activityId) {
            navigation.navigate('ActivityDetails', { 
                activityId: notification.data.activityId,
                forceRefresh: true // Force refresh to get latest data
            });
        } else {
            console.warn('Cannot navigate - notification missing activityId:', notification);
        }
    };

    useEffect(() => {
        fetchNotifications();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        fetchNotifications(true);
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
                <Bell color="#6b7280" size={48} />
            </View>
            <Text style={styles.emptyTitle}>No notifications yet</Text>
            <Text style={styles.emptySubtitle}>
                You'll see activity invites, updates, and reminders here
            </Text>
        </View>
    );

    if (loading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                
                {/* Header with back button */}
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                        <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        <Text style={styles.headerSubtitle}>Stay updated with your activities</Text>
                    </View>
                </View>
                
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#8b5cf6" />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <View style={styles.titleRow}>
                        <Text style={styles.headerTitle}>Notifications</Text>
                        {unreadNotificationCount > 0 && (
                            <View style={styles.unreadBadge}>
                                <Text style={styles.unreadBadgeText}>{unreadNotificationCount}</Text>
                            </View>
                        )}
                    </View>
                    <Text style={styles.headerSubtitle}>Stay updated with your activities</Text>
                </View>
            </View>

            <FlatList
                data={notifications}
                keyExtractor={(item) => item.id.toString()}
                renderItem={({ item }) => (
                    <NotificationItem
                        notification={item}
                        onPress={handleNotificationPress}
                        onMarkAsRead={markAsRead}
                        onDelete={deleteNotification}
                    />
                )}
                contentContainerStyle={styles.listContainer}
                ListEmptyComponent={renderEmptyState}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#8b5cf6"
                        colors={['#8b5cf6']}
                    />
                }
                showsVerticalScrollIndicator={false}
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
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 20,
        backgroundColor: '#201925',
    },

    backButton: {
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },

    headerContent: {
        flex: 1,
    },

    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },

    headerSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    unreadBadge: {
        backgroundColor: '#ef4444',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },

    unreadBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },

    listContainer: {
        flexGrow: 1,
        paddingTop: 8,
    },

    notificationItem: {
        backgroundColor: '#2a1f36',
        marginHorizontal: 16,
        marginVertical: 6,
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(139, 92, 246, 0.1)',
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
    },

    unreadNotification: {
        backgroundColor: '#321f3d',
        borderColor: 'rgba(139, 92, 246, 0.3)',
        shadowColor: '#8b5cf6',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    notificationContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },

    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },

    textContainer: {
        flex: 1,
    },

    notificationTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
        lineHeight: 22,
    },

    notificationBody: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },

    timeContainer: {
        marginTop: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    notificationTime: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '600',
        fontFamily: 'Montserrat_400Regular',
    },

    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#8b5cf6',
        marginTop: 8,
        marginLeft: 8,
    },

    actionButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.COMFORTABLE_GAP,
        marginLeft: 12,
    },

    actionButton: {
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        width: TOUCH_TARGETS.MIN_SIZE,
        height: TOUCH_TARGETS.MIN_SIZE,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    emptyContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 32,
        paddingTop: 100,
    },

    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(107, 114, 128, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24,
    },

    emptyTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 8,
        textAlign: 'center',
    },

    emptySubtitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },
});