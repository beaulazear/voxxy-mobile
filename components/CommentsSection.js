import React, { useState, useEffect, useContext, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Image,
    StyleSheet,
    Dimensions,
    Alert,
    Animated,
    AppState,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

const { width: screenWidth } = Dimensions.get('window');

// Default avatar - you can replace with your default image
const defaultAvatar = 'https://via.placeholder.com/32x32/667eea/ffffff?text=👤';

// Helper function to get proper avatar URL
const getAvatarUrl = (user) => {
    if (!user) return defaultAvatar;

    // Check if user has avatar
    if (user.avatar) {
        // If it's already a full URL (AWS S3, etc.)
        if (user.avatar.startsWith('http')) {
            return user.avatar;
        }
        // If it's a local reference, construct full URL
        if (user.avatar.startsWith('/') || user.avatar.includes('uploads')) {
            return `${API_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}`;
        }
        // If it's just a filename, assume it's in uploads
        return `${API_URL}/uploads/${user.avatar}`;
    }

    // Check profile_pic_url field (alternative field name)
    if (user.profile_pic_url) {
        if (user.profile_pic_url.startsWith('http')) {
            return user.profile_pic_url;
        }
        return `${API_URL}${user.profile_pic_url.startsWith('/') ? '' : '/'}${user.profile_pic_url}`;
    }

    // Generate avatar based on user ID or name
    if (user.id) {
        const colors = ['667eea', 'cc31e8', '28a745', 'dc3545', 'ffc107', '17a2b8'];
        const colorIndex = user.id % colors.length;
        const initials = user.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
        return `https://via.placeholder.com/64x64/${colors[colorIndex]}/ffffff?text=${initials}`;
    }

    return defaultAvatar;
};

// Icon components using emoji
const Icons = {
    NotepadText: () => <Text style={styles.iconText}>📝</Text>,
    Send: () => <Text style={styles.iconText}>📤</Text>,
};

const CommentsSection = ({ activity }) => {
    const [comments, setComments] = useState(activity.comments || []);
    const [newComment, setNewComment] = useState('');
    const [showNewMessageToast, setShowNewMessageToast] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [lastNewCommentId, setLastNewCommentId] = useState(null);

    // Initialize lastUpdateTime based on existing comments or a past time
    const [lastUpdateTime, setLastUpdateTime] = useState(() => {
        const existingComments = activity.comments || [];
        if (existingComments.length > 0) {
            // Use the most recent comment's timestamp, but check if it exists and has created_at
            const lastComment = existingComments[existingComments.length - 1];
            if (lastComment && lastComment.created_at) {
                return lastComment.created_at;
            }
        }
        // If no comments or no valid timestamp, use a time 1 hour ago to catch any new ones
        return new Date(Date.now() - 60 * 60 * 1000).toISOString();
    });

    const { user } = useContext(UserContext);
    const scrollViewRef = useRef(null);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const pollingRef = useRef(null);

    // Toast animation values
    const toastAnim = useRef(new Animated.Value(-100)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Show toast notification for new messages
    const showToast = (count, authorName) => {
        setNewMessageCount(count);
        setShowNewMessageToast(true);

        // Animate toast sliding down
        Animated.sequence([
            Animated.timing(toastAnim, {
                toValue: 20,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.delay(2000),
            Animated.timing(toastAnim, {
                toValue: -100,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowNewMessageToast(false);
        });

        // Pulse animation for the live indicator
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.2,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 200,
                useNativeDriver: true,
            })
        ]).start();
    };
    useEffect(() => {
        if (scrollViewRef.current && comments.length > 0) {
            setTimeout(() => {
                scrollViewRef.current?.scrollToEnd({ animated: true });
            }, 100);
        }
    }, [comments]);

    // Fade in animation
    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 400,
            useNativeDriver: true,
        }).start();
    }, []);

    // Polling for new comments with proper duplicate prevention
    useEffect(() => {
        const pollForNewComments = async () => {
            try {
                // Get the timestamp of the most recent comment we have
                const mostRecentComment = comments[comments.length - 1];
                const sinceTime = mostRecentComment ? mostRecentComment.created_at : lastUpdateTime;

                logger.debug('🔄 Polling for comments since:', sinceTime);

                const response = await fetch(
                    `${API_URL}/activities/${activity.id}/comments?since=${sinceTime}`,
                    {
                        headers: {
                            'Authorization': `Bearer ${user?.token}`,
                        },
                    }
                );

                if (response.ok) {
                    const newComments = await response.json();
                    logger.debug('📥 Received new comments:', newComments.length);

                    if (newComments.length > 0) {
                        // Filter out any comments we already have (prevent duplicates)
                        const existingCommentIds = new Set(comments.map(c => c.id));
                        const trulyNewComments = newComments.filter(c => !existingCommentIds.has(c.id));

                        if (trulyNewComments.length > 0) {
                            logger.debug('✅ Adding truly new comments:', trulyNewComments.length);
                            setComments(prev => [...prev, ...trulyNewComments]);

                            // Update lastUpdateTime to the most recent comment's timestamp
                            const newestComment = trulyNewComments[trulyNewComments.length - 1];
                            setLastUpdateTime(newestComment.created_at);
                            setLastNewCommentId(newestComment.id);

                            // Show toast notification for new messages (but not from current user)
                            const otherUsersComments = trulyNewComments.filter(c => c.user.id !== user?.id);
                            if (otherUsersComments.length > 0) {
                                const lastComment = otherUsersComments[otherUsersComments.length - 1];
                                const authorName = lastComment.user.name?.split(' ')[0] || 'Someone';
                                showToast(otherUsersComments.length, authorName);
                            }
                        }
                    }
                } else {
                    logger.debug('❌ Polling response not ok:', response.status);
                }
            } catch (error) {
                logger.debug('⚠️ Polling error (silent):', error.message);
                // Fail silently - don't spam user with errors
            }
        };

        // Handle app state changes - pause polling when app is in background
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active' && user?.token) {
                logger.debug('📱 App became active - resuming polling');
                // Resume polling when app becomes active
                if (!pollingRef.current) {
                    pollingRef.current = setInterval(pollForNewComments, 4000);
                }
            } else {
                logger.debug('📱 App went to background - pausing polling');
                // Pause polling when app goes to background
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        };

        // Start polling immediately if app is active
        if (user?.token && AppState.currentState === 'active') {
            logger.debug('🚀 Starting comment polling');
            pollingRef.current = setInterval(pollForNewComments, 4000);
        }

        // Listen for app state changes
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            logger.debug('🛑 Stopping comment polling');
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
            appStateSubscription?.remove();
        };
    }, [activity.id, user?.token, comments]); // Changed dependency to comments array

    // Scroll to bottom on first render
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: false });
            }
        }, 200);
        return () => clearTimeout(timer);
    }, []);


    // Post a new comment
    const handleCommentSubmit = async () => {
        if (!newComment.trim()) return;

        const tempComment = newComment.trim();
        setNewComment(''); // Clear input immediately for better UX

        try {
            logger.debug('📝 Posting new comment');
            const response = await fetch(`${API_URL}/activities/${activity.id}/comments`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user?.token}`,
                },
                body: JSON.stringify({ comment: { content: tempComment } }),
            });

            if (response.ok) {
                const comment = await response.json();
                logger.debug('✅ Comment posted successfully');

                // Check if comment already exists (in case polling caught it)
                const commentExists = comments.some(c => c.id === comment.id);
                if (!commentExists) {
                    setComments(prev => [...prev, comment]);
                }

                // Update timestamp to prevent polling from fetching this comment again
                setLastUpdateTime(comment.created_at);
            } else {
                logger.debug('❌ Failed to post comment:', response.status);
                setNewComment(tempComment); // Restore comment on failure
                Alert.alert('Error', 'Failed to add comment.');
            }
        } catch (error) {
            logger.error('💥 Error posting comment:', error);
            setNewComment(tempComment); // Restore comment on failure
            Alert.alert('Error', 'Failed to add comment.');
        }
    };

    // Helpers to format
    const formatTime = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        const date = new Date(timestamp);
        return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Group comments by date
    const groupedComments = comments.reduce((acc, comment) => {
        const date = formatDate(comment.created_at);
        if (!acc[date]) acc[date] = [];
        acc[date].push(comment);
        return acc;
    }, {});

    const renderMessage = (comment) => {
        const isMe = comment.user.id === user?.id;
        const isNewMessage = comment.id === lastNewCommentId;

        return (
            <Animated.View
                key={comment.id}
                style={[
                    styles.messageRow,
                    isMe && styles.messageRowMe,
                    isNewMessage && {
                        transform: [{ scale: isNewMessage ? 1.02 : 1 }]
                    }
                ]}
            >
                {!isMe && (
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: getAvatarUrl(comment.user) }}
                            style={styles.avatar}
                            onError={() => {
                                logger.debug('🖼️ Avatar failed to load for user:', comment.user.name);
                            }}
                        />
                        <Text style={styles.userName}>
                            {comment.user.name ? comment.user.name.split(' ')[0] : 'User'}
                        </Text>
                    </View>
                )}

                <View style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                    isNewMessage && styles.newMessageBubble
                ]}>
                    <Text style={styles.messageText}>{comment.content}</Text>
                    <Text style={[styles.timestamp, isMe ? styles.timestampMe : styles.timestampOther]}>
                        {formatTime(comment.created_at)}
                    </Text>
                    {isNewMessage && !isMe && (
                        <View style={styles.newBadge}>
                            <Text style={styles.newBadgeText}>NEW</Text>
                        </View>
                    )}
                </View>

                {isMe && (
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: getAvatarUrl(user) }}
                            style={styles.avatar}
                            onError={() => {
                                logger.debug('🖼️ User avatar failed to load');
                            }}
                        />
                        <Text style={styles.userName}>
                            {user?.name ? user.name.split(' ')[0] : 'You'}
                        </Text>
                    </View>
                )}
            </Animated.View>
        );
    };

    return (
        <Animated.View style={[styles.wrapper, { opacity: fadeAnim }]}>
            <View style={styles.chatPanel}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Icons.NotepadText />
                        <Text style={styles.title}>Activity Updates</Text>
                        {/* Show live indicator when polling is active */}
                        {pollingRef.current && (
                            <Animated.View style={[
                                styles.liveIndicator,
                                { transform: [{ scale: pulseAnim }] }
                            ]}>
                                <View style={styles.liveDot} />
                                <Text style={styles.liveText}>Live</Text>
                            </Animated.View>
                        )}
                    </View>
                </View>

                {/* Messages */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.messages}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                    onContentSizeChange={() => {
                        if (scrollViewRef.current) {
                            scrollViewRef.current.scrollToEnd({ animated: true });
                        }
                    }}
                    keyboardShouldPersistTaps="handled"
                >
                    {comments.length === 0 && (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No messages yet. Say hi! 👋</Text>
                        </View>
                    )}

                    {Object.entries(groupedComments).map(([date, msgs]) => (
                        <View key={date}>
                            <View style={styles.dateSeparator}>
                                <Text style={styles.dateSeparatorText}>{date}</Text>
                            </View>
                            {msgs.map(renderMessage)}
                        </View>
                    ))}
                </ScrollView>

                {/* Composer */}
                <View style={styles.composer}>
                    <TextInput
                        style={styles.input}
                        placeholder="Type a message…"
                        placeholderTextColor="#cbd5e1"
                        value={newComment}
                        onChangeText={setNewComment}
                        onSubmitEditing={handleCommentSubmit}
                        multiline
                        maxLength={500}
                        returnKeyType="send"
                        blurOnSubmit={false}
                        onFocus={() => {
                            // Scroll to bottom when input is focused
                            setTimeout(() => {
                                if (scrollViewRef.current) {
                                    scrollViewRef.current.scrollToEnd({ animated: true });
                                }
                            }, 100);
                        }}
                    />
                    <TouchableOpacity
                        style={[
                            styles.sendButton,
                            newComment.trim() ? styles.sendButtonActive : styles.sendButtonDisabled
                        ]}
                        onPress={handleCommentSubmit}
                        disabled={!newComment.trim()}
                    >
                        <Icons.Send />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Toast Notification for New Messages */}
            {showNewMessageToast && (
                <Animated.View
                    style={[
                        styles.toastContainer,
                        { transform: [{ translateY: toastAnim }] }
                    ]}
                >
                    <View style={styles.toast}>
                        <Text style={styles.toastIcon}>💬</Text>
                        <View style={styles.toastContent}>
                            <Text style={styles.toastTitle}>
                                {newMessageCount === 1 ? 'New Message' : `${newMessageCount} New Messages`}
                            </Text>
                            <Text style={styles.toastSubtitle}>
                                Someone just commented!
                            </Text>
                        </View>
                        <View style={styles.toastBadge}>
                            <Text style={styles.toastBadgeText}>{newMessageCount}</Text>
                        </View>
                    </View>
                </Animated.View>
            )}
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 16,
    },
    chatPanel: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        overflow: 'hidden',
        maxWidth: 650,
        alignSelf: 'center',
        width: '100%',
    },
    header: {
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconText: {
        fontSize: 18,
        color: '#cc31e8',
        marginRight: 12,
    },
    title: {
        fontFamily: 'System',
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
    // Live indicator styles
    liveIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(40, 167, 69, 0.4)',
    },
    liveDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#28a745',
        marginRight: 4,
    },
    liveText: {
        color: '#28a745',
        fontSize: 11,
        fontWeight: '600',
    },
    messages: {
        maxHeight: 400,
        minHeight: 200,
    },
    messagesContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        flexGrow: 1,
    },
    emptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyStateText: {
        color: '#e2e8f0',
        fontSize: 14,
        fontStyle: 'italic',
    },
    dateSeparator: {
        alignSelf: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        paddingHorizontal: 16,
        paddingVertical: 6,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        marginVertical: 16,
    },
    dateSeparatorText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500',
    },
    messageRow: {
        flexDirection: 'row',
        marginBottom: 16,
        alignItems: 'flex-end',
    },
    messageRowMe: {
        flexDirection: 'row-reverse',
    },
    avatarContainer: {
        alignItems: 'center',
        marginHorizontal: 8,
    },
    avatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.1)', // Fallback background
    },
    userName: {
        color: '#e2e8f0',
        fontSize: 11,
        fontWeight: '500',
        textAlign: 'center',
        maxWidth: 48,
    },
    bubble: {
        maxWidth: '75%',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 18,
        position: 'relative',
        // Add subtle shadow to bubbles
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    bubbleMe: {
        backgroundColor: '#cc31e8',
        borderBottomRightRadius: 6,
    },
    bubbleOther: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderBottomLeftRadius: 6,
    },
    newMessageBubble: {
        borderWidth: 2,
        borderColor: '#28a745',
        backgroundColor: 'rgba(40, 167, 69, 0.1)',
    },
    newBadge: {
        position: 'absolute',
        top: -8,
        right: -8,
        backgroundColor: '#28a745',
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 2,
        borderColor: '#fff',
    },
    newBadgeText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    messageText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '400',
    },
    timestamp: {
        fontSize: 11,
        fontWeight: '500',
        marginTop: 4,
        opacity: 0.7,
    },
    timestampMe: {
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'right',
    },
    timestampOther: {
        color: '#e2e8f0',
        textAlign: 'left',
    },
    composer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: 'transparent',
        alignItems: 'flex-end',
    },
    input: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        color: '#fff',
        fontSize: 14,
        maxHeight: 100,
        marginRight: 12,
        textAlignVertical: 'top',
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
        paddingLeft: 11,
        paddingBottom: 4,
        
    },
    sendButtonActive: {
        backgroundColor: '#cc31e8',
        // Add subtle glow effect
        shadowColor: '#cc31e8',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.4,
        shadowRadius: 4,
        elevation: 4,
    },
    sendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    // Toast notification styles
    toastContainer: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 1000,
        alignItems: 'center',
    },
    toast: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(40, 167, 69, 0.3)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        minWidth: 280,
        maxWidth: 320,
    },
    toastIcon: {
        fontSize: 24,
        marginRight: 12,
    },
    toastContent: {
        flex: 1,
    },
    toastTitle: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 2,
    },
    toastSubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 12,
    },
    toastBadge: {
        backgroundColor: '#28a745',
        borderRadius: 12,
        minWidth: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    toastBadgeText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
});

export default CommentsSection;