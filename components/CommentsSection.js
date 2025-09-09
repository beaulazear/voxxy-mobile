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
    Modal,
    KeyboardAvoidingView,
    Platform,
    Keyboard,
} from 'react-native';
import * as Feather from 'react-native-feather';
import { Flag, MoreVertical } from 'lucide-react-native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';
import { logger } from '../utils/logger';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import { TOUCH_TARGETS, SPACING } from '../styles/AccessibilityStyles';
import BlockedUsersService from '../services/BlockedUsersService';
import ContentFilterService from '../services/ContentFilterService';

const { width: screenWidth } = Dimensions.get('window');

// Helper function to get proper display image (prioritizing profile_pic_url over avatar)
const getDisplayImage = (user) => {
    if (!user) return require('../assets/Weird5.jpg');

    // Check profile_pic_url first (full URL)
    if (user.profile_pic_url) {
        const profilePicUrl = user.profile_pic_url.startsWith('http')
            ? user.profile_pic_url
            : `${API_URL}${user.profile_pic_url}`;
        return { uri: profilePicUrl };
    }

    // Check if user has avatar (relative path) - only as fallback
    if (user.avatar) {
        // If it's already a full URL
        if (user.avatar.startsWith('http')) {
            return { uri: user.avatar };
        }
        // If it's a local reference, construct full URL
        if (user.avatar.startsWith('/') || user.avatar.includes('uploads')) {
            return { uri: `${API_URL}${user.avatar.startsWith('/') ? '' : '/'}${user.avatar}` };
        }
        // If it's just a filename, assume it's in uploads
        return { uri: `${API_URL}/uploads/${user.avatar}` };
    }

    // Fallback to default stock image
    return require('../assets/Weird5.jpg');
};

// Icon components using stylish icons
const Icons = {
    MessageCircle: ({ size = 20, color = "#cc31e8" }) => <Feather.MessageCircle size={size} color={color} />,
    Send: ({ size = 20, color = "#cc31e8" }) => <Feather.Send size={size} color={color} />,
    X: ({ size = 20, color = "#fff" }) => <Feather.X size={size} color={color} />,
    ChevronUp: ({ size = 16, color = "#cc31e8" }) => <Feather.ChevronUp size={size} color={color} />,
};

const CommentsSection = ({ activity }) => {
    const [comments, setComments] = useState(activity.comments || []);
    const [newComment, setNewComment] = useState('');
    const [showNewMessageToast, setShowNewMessageToast] = useState(false);
    const [newMessageCount, setNewMessageCount] = useState(0);
    const [lastNewCommentId, setLastNewCommentId] = useState(null);
    const [isMounted, setIsMounted] = useState(true);
    const [showAllCommentsModal, setShowAllCommentsModal] = useState(false);
    const [modalNewComment, setModalNewComment] = useState('');
    const [reportModalVisible, setReportModalVisible] = useState(false);
    const [selectedComment, setSelectedComment] = useState(null);
    const [reportReason, setReportReason] = useState('');
    const [customReportReason, setCustomReportReason] = useState('');
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [showBlockConfirm, setShowBlockConfirm] = useState(false);
    const [userToBlock, setUserToBlock] = useState(null);
    const [wasCommentsModalOpen, setWasCommentsModalOpen] = useState(false);
    
    // Refs
    const modalScrollViewRef = useRef(null);
    const modalInputRef = useRef(null);

    // Load blocked users on mount and set auth token
    useEffect(() => {
        const initializeBlockedUsers = async () => {
            // Set auth token if available
            if (user?.token) {
                BlockedUsersService.setAuthToken(user.token);
            }
            // Backend now filters blocked users, but we keep local list for UI
            const blocked = await BlockedUsersService.getBlockedUsers();
            setBlockedUsers(blocked);
        };
        initializeBlockedUsers();
    }, [user]);

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

    // Polling for new comments with proper duplicate prevention and race condition handling
    useEffect(() => {
        let pollingActive = true;
        
        const pollForNewComments = async () => {
            // Check if component is still mounted and polling is active
            if (!isMounted || !pollingActive || !user?.token) {
                return;
            }

            try {
                // Get the timestamp of the most recent comment we have
                const mostRecentComment = comments[comments.length - 1];
                const sinceTime = mostRecentComment ? mostRecentComment.created_at : lastUpdateTime;

                logger.debug('🔄 Polling for comments since:', sinceTime);

                const newComments = await safeAuthApiCall(
                    `${API_URL}/activities/${activity.id}/comments?since=${sinceTime}`,
                    user.token,
                    { method: 'GET' }
                );

                // Double-check component is still mounted before updating state
                if (!isMounted || !pollingActive) {
                    return;
                }

                logger.debug('📥 Received new comments:', newComments.length);

                if (newComments && newComments.length > 0) {
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
            } catch (error) {
                logger.debug('⚠️ Polling error (silent):', error.message);
                // Fail silently - don't spam user with errors
                // Only log if it's not a common network error
                if (!error.message.includes('Network connection failed') && !error.message.includes('timeout')) {
                    logger.debug('Unexpected polling error:', error);
                }
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
            pollingActive = false;
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
                pollingRef.current = null;
            }
            appStateSubscription?.remove();
        };
    }, [activity.id, user?.token, comments, isMounted]); // Added isMounted to dependencies

    // Component cleanup effect
    useEffect(() => {
        return () => {
            setIsMounted(false);
        };
    }, []);

    // Scroll to bottom on first render
    useEffect(() => {
        const timer = setTimeout(() => {
            if (scrollViewRef.current) {
                scrollViewRef.current.scrollToEnd({ animated: false });
            }
        }, 200);
        return () => clearTimeout(timer);
    }, []);

    // Handle keyboard events for modal scrolling
    useEffect(() => {
        if (!showAllCommentsModal) return;

        const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
            setTimeout(() => {
                if (modalScrollViewRef.current) {
                    modalScrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 100);
        });

        const keyboardWillShowListener = Keyboard.addListener('keyboardWillShow', () => {
            setTimeout(() => {
                if (modalScrollViewRef.current) {
                    modalScrollViewRef.current.scrollToEnd({ animated: true });
                }
            }, 0);
        });

        return () => {
            keyboardDidShowListener?.remove();
            keyboardWillShowListener?.remove();
        };
    }, [showAllCommentsModal]);

    // Post a new comment
    const handleCommentSubmit = async (commentText = null) => {
        const textToSubmit = commentText || newComment.trim();
        if (!textToSubmit || !user?.token) return;

        // Validate comment for profanity and spam
        const validation = ContentFilterService.validateComment(textToSubmit);
        if (!validation.isValid) {
            Alert.alert('Cannot Post Comment', validation.reason);
            return;
        }

        if (!commentText) {
            setNewComment(''); // Clear input immediately for better UX only if using main input
        }

        try {
            logger.debug('📝 Posting new comment');
            const comment = await safeAuthApiCall(
                `${API_URL}/activities/${activity.id}/comments`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({ comment: { content: validation.cleanedText || textToSubmit } }),
                }
            );

            logger.debug('✅ Comment posted successfully');

            // Check if component is still mounted before updating state
            if (!isMounted) return;

            // Check if comment already exists (in case polling caught it)
            const commentExists = comments.some(c => c.id === comment.id);
            if (!commentExists) {
                setComments(prev => [...prev, comment]);
            }

            // Update timestamp to prevent polling from fetching this comment again
            setLastUpdateTime(comment.created_at);
        } catch (error) {
            logger.error('💥 Error posting comment:', {
                message: error.message,
                status: error.status,
                name: error.name
            });
            if (!commentText) {
                setNewComment(textToSubmit); // Restore comment on failure only if using main input
            }
            
            // Handle content filtering rejection from server
            if (error.status === 422) {
                Alert.alert(
                    'Content Not Allowed',
                    'Your comment was rejected by our content filter. Please revise and try again.',
                    [{ text: 'OK' }]
                );
            } else {
                const userMessage = handleApiError(error, 'Failed to add comment.');
                Alert.alert('Error', userMessage);
            }
        }
    };

    // Helpers to format
    const formatTime = (timestamp) => {
        if (!timestamp) return '';
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return 'Unknown Date';
        const date = new Date(timestamp);
        return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
    };

    // Group comments by date, filtering out invalid comments and blocked users
    const groupedComments = comments
        .filter(comment => comment && comment.created_at && !blockedUsers.includes(comment.user.id))
        .reduce((acc, comment) => {
            const date = formatDate(comment.created_at);
            if (!acc[date]) acc[date] = [];
            acc[date].push(comment);
            return acc;
        }, {});

    const closeReportModal = () => {
        console.log('closeReportModal called - Stack trace:', new Error().stack);
        logger.debug('Closing report modal and resetting state');
        setReportModalVisible(false);
        setSelectedComment(null);
        setReportReason('');
        setCustomReportReason('');
        setShowBlockConfirm(false);
        setUserToBlock(null);
        
        // Reopen comments modal if it was open before
        if (wasCommentsModalOpen) {
            setTimeout(() => {
                setShowAllCommentsModal(true);
                setWasCommentsModalOpen(false);
            }, 300);
        }
    };

    const handleReportComment = (comment) => {
        logger.debug('Opening report modal for comment:', { 
            commentId: comment.id, 
            userId: comment.user?.id,
            userName: comment.user?.name,
            currentUserId: user?.id 
        });
        setSelectedComment(comment);
        setReportReason('');
        setCustomReportReason('');
        
        // Remember if comments modal was open and close it first
        if (showAllCommentsModal) {
            setWasCommentsModalOpen(true);
            setShowAllCommentsModal(false);
            // Wait for modal to close before opening report modal
            setTimeout(() => {
                setReportModalVisible(true);
            }, 300);
        } else {
            setWasCommentsModalOpen(false);
            // If comments modal isn't open, just show report modal
            setReportModalVisible(true);
        }
    };

    const handleBlockUser = async (userId, userName) => {
        console.log('handleBlockUser called with:', { userId, userName });
        logger.debug('Block button pressed:', { userId, userName });
        
        const userToBlockData = { id: userId, name: userName };
        console.log('Setting userToBlock to:', userToBlockData);
        setUserToBlock(userToBlockData);
        
        // Close report modal first so block modal can show on top
        console.log('Closing report modal to show block confirmation');
        setReportModalVisible(false);
        
        // Small delay to ensure report modal closes before showing block modal
        setTimeout(() => {
            console.log('Setting showBlockConfirm to true after delay');
            setShowBlockConfirm(true);
        }, 100);
        
        logger.debug('Block confirm modal should be visible now');
    };

    const confirmBlockUser = async () => {
        if (!userToBlock) {
            logger.error('No user to block');
            return;
        }
        
        logger.debug('Confirming block for user:', userToBlock);
        
        try {
            // Call backend API through service
            const success = await BlockedUsersService.blockUser(userToBlock.id, userToBlock.name);
            
            logger.debug('Block API response:', { success });
            
            if (success) {
                // Refresh blocked users list
                const blocked = await BlockedUsersService.getBlockedUsers();
                setBlockedUsers(blocked);
                
                // Note: Backend now filters blocked users, so comments will be filtered on next fetch
                // Comments will be refreshed when the activity is reloaded
                
                Alert.alert(
                    'User Blocked',
                    `${userToBlock.name} has been blocked. Their content will no longer be visible to you.`,
                    [{ text: 'OK' }]
                );
                
                // Close both modals
                setShowBlockConfirm(false);
                setUserToBlock(null);
                closeReportModal();
            } else {
                logger.error('Block API returned false');
                Alert.alert(
                    'Error', 
                    'Failed to block user. Please try again.',
                    [{ text: 'OK' }]
                );
            }
        } catch (error) {
            logger.error('Failed to block user:', error);
            Alert.alert(
                'Error',
                error.message || 'Failed to block user. Please try again.',
                [{ text: 'OK' }]
            );
        } finally {
            // Always close the confirmation modal
            setShowBlockConfirm(false);
            setUserToBlock(null);
        }
    };

    const submitReport = async () => {
        if (!reportReason && !customReportReason.trim()) {
            Alert.alert('Error', 'Please select or enter a reason for reporting');
            return;
        }

        const reason = reportReason === 'other' ? customReportReason : reportReason;

        try {
            await safeAuthApiCall(
                `${API_URL}/reports`,
                user.token,
                {
                    method: 'POST',
                    body: JSON.stringify({
                        report: {
                            reportable_type: 'Comment',
                            reportable_id: selectedComment.id,
                            reason: reason,
                            reporter_id: user.id,
                            activity_id: activity.id,
                            reported_content: selectedComment.content,
                            description: reportReason === 'other' ? customReportReason : `Reported comment: "${selectedComment.content}"`
                        }
                    })
                }
            );

            Alert.alert(
                'Report Submitted',
                'Thank you for helping keep our community safe. We will review this report within 24 hours.',
                [{ text: 'OK' }]
            );
            closeReportModal();
        } catch (error) {
            logger.error('Error submitting report:', error);
            Alert.alert('Error', 'Failed to submit report. Please try again.');
        }
    };

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
                            source={getDisplayImage(comment.user)}
                            style={styles.avatar}
                            onError={() => {
                                logger.debug('🖼️ Profile image failed to load for user:', comment.user.name);
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
                    {!isMe && (
                        <TouchableOpacity
                            style={styles.reportButton}
                            onPress={() => handleReportComment(comment)}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <MoreVertical size={18} color="rgba(255, 255, 255, 0.8)" />
                        </TouchableOpacity>
                    )}
                    <Text style={[styles.messageText, !isMe && { paddingRight: 35 }]}>{comment.content}</Text>
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
                            source={getDisplayImage(user)}
                            style={styles.avatar}
                            onError={() => {
                                logger.debug('🖼️ User profile image failed to load');
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
                        <Icons.MessageCircle />
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
                    {comments.length > 3 && (
                        <TouchableOpacity 
                            style={styles.viewAllButton}
                            onPress={() => setShowAllCommentsModal(true)}
                        >
                            <Icons.ChevronUp size={16} color="#cc31e8" />
                            <Text style={styles.viewAllText}>
                                View all {comments.length} updates
                            </Text>
                        </TouchableOpacity>
                    )}

                    {comments.length === 0 && (
                        <View style={styles.emptyState}>
                            <Icons.MessageCircle size={20} color="rgba(255, 255, 255, 0.4)" />
                            <Text style={styles.emptyStateText}>No messages yet. Start the conversation!</Text>
                        </View>
                    )}

                    {Object.entries(groupedComments).slice(-2).map(([date, msgs]) => (
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
                    <TouchableOpacity 
                        style={styles.fakeInputFull}
                        onPress={() => {
                            // Open modal when fake input is pressed
                            setShowAllCommentsModal(true);
                            // Focus modal input after a delay
                            setTimeout(() => {
                                if (modalInputRef.current) {
                                    modalInputRef.current.focus();
                                }
                            }, 400);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.fakeInputText}>Type a message…</Text>
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
                        <Icons.MessageCircle size={16} color="#cc31e8" />
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

            {/* All Comments Modal */}
            <Modal
                visible={showAllCommentsModal}
                animationType="slide"
                presentationStyle="fullScreen"
                onRequestClose={() => setShowAllCommentsModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{activity.activity_name}</Text>
                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={() => setShowAllCommentsModal(false)}
                        >
                            <Icons.X size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>
                    
                    <KeyboardAvoidingView 
                        style={styles.modalKeyboardContainer}
                        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
                    >
                        <ScrollView 
                            ref={modalScrollViewRef}
                            style={styles.modalScrollView} 
                            contentContainerStyle={styles.modalContent}
                            keyboardShouldPersistTaps="handled"
                            showsVerticalScrollIndicator={false}
                            onContentSizeChange={() => {
                                if (modalScrollViewRef.current && showAllCommentsModal) {
                                    modalScrollViewRef.current.scrollToEnd({ animated: true });
                                }
                            }}
                        >
                            {comments.length === 0 ? (
                                <View style={styles.modalEmptyState}>
                                    <View style={styles.modalEmptyIcon}>
                                        <Icons.MessageCircle size={48} color="rgba(255, 255, 255, 0.3)" />
                                    </View>
                                    <Text style={styles.modalEmptyTitle}>No updates yet</Text>
                                    <Text style={styles.modalEmptySubtitle}>
                                        Be the first to share an update or ask a question about this activity!
                                    </Text>
                                    <View style={styles.modalEmptyHint}>
                                        <Text style={styles.modalEmptyHintText}>💬 Start typing below to get the conversation going</Text>
                                    </View>
                                </View>
                            ) : (
                                Object.entries(groupedComments).map(([date, msgs]) => (
                                    <View key={date}>
                                        <View style={styles.dateSeparator}>
                                            <Text style={styles.dateSeparatorText}>{date}</Text>
                                        </View>
                                        {msgs.map(renderMessage)}
                                    </View>
                                ))
                            )}
                        </ScrollView>

                        {/* Modal Composer */}
                        <View style={styles.modalComposer}>
                            <TextInput
                                ref={modalInputRef}
                                style={styles.modalInput}
                                placeholder="Type a message…"
                                placeholderTextColor="#cbd5e1"
                                value={modalNewComment}
                                onChangeText={setModalNewComment}
                                onSubmitEditing={() => {
                                    if (modalNewComment.trim()) {
                                        handleCommentSubmit(modalNewComment.trim());
                                        setModalNewComment('');
                                    }
                                }}
                                multiline
                                maxLength={500}
                                returnKeyType="send"
                                blurOnSubmit={false}
                                autoFocus={false}
                            />
                            <TouchableOpacity
                                style={[
                                    styles.modalSendButton,
                                    modalNewComment.trim() ? styles.modalSendButtonActive : styles.modalSendButtonDisabled
                                ]}
                                onPress={() => {
                                    if (modalNewComment.trim()) {
                                        handleCommentSubmit(modalNewComment.trim());
                                        setModalNewComment('');
                                    }
                                }}
                                disabled={!modalNewComment.trim()}
                            >
                                <Icons.Send size={18} color={modalNewComment.trim() ? "#fff" : "#666"} />
                            </TouchableOpacity>
                        </View>
                    </KeyboardAvoidingView>
                </View>
            </Modal>

            {/* Report Modal - Moved outside of comments modal to ensure proper layering */}
            <Modal
                visible={reportModalVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={closeReportModal}
            >
                <View style={styles.reportModalOverlay}>
                    <View style={styles.reportModalContainer}>
                        <View style={styles.reportModalHeader}>
                            <Text style={styles.reportModalTitle}>Report Comment</Text>
                            <TouchableOpacity 
                                onPress={closeReportModal}
                                style={styles.reportModalClose}
                            >
                                <Icons.X size={24} color="#fff" />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.reportModalSubtitle}>
                            Why are you reporting this comment?
                        </Text>

                        <ScrollView style={styles.reportReasonsContainer}>
                            {selectedComment && selectedComment.user && selectedComment.user.id !== user?.id ? (
                                <TouchableOpacity
                                    style={styles.blockUserButton}
                                    onPress={() => {
                                        console.log('===== BLOCK BUTTON PRESSED =====');
                                        console.log('User to block:', selectedComment.user);
                                        logger.debug('Block button tapped in modal');
                                        handleBlockUser(selectedComment.user.id, selectedComment.user.name);
                                    }}
                                >
                                    <Text style={styles.blockUserButtonText}>
                                        🚫 Block {selectedComment.user.name?.split(' ')[0] || 'User'}
                                    </Text>
                                </TouchableOpacity>
                            ) : null}

                            {[
                                { value: 'spam', label: 'Spam or misleading' },
                                { value: 'harassment', label: 'Harassment or bullying' },
                                { value: 'hate', label: 'Hate speech or discrimination' },
                                { value: 'inappropriate', label: 'Inappropriate or offensive' },
                                { value: 'violence', label: 'Violence or dangerous content' },
                                { value: 'other', label: 'Other' }
                            ].map(reason => (
                                <TouchableOpacity
                                    key={reason.value}
                                    style={[
                                        styles.reportReasonItem,
                                        reportReason === reason.value && styles.reportReasonSelected
                                    ]}
                                    onPress={() => setReportReason(reason.value)}
                                >
                                    <View style={[
                                        styles.reportRadio,
                                        reportReason === reason.value && styles.reportRadioSelected
                                    ]}>
                                        {reportReason === reason.value && (
                                            <View style={styles.reportRadioInner} />
                                        )}
                                    </View>
                                    <Text style={styles.reportReasonText}>{reason.label}</Text>
                                </TouchableOpacity>
                            ))}

                            {reportReason === 'other' && (
                                <TextInput
                                    style={styles.reportCustomInput}
                                    placeholder="Please describe the issue..."
                                    placeholderTextColor="#cbd5e1"
                                    value={customReportReason}
                                    onChangeText={setCustomReportReason}
                                    multiline
                                    maxLength={200}
                                />
                            )}
                        </ScrollView>

                        <View style={styles.reportModalButtons}>
                            <TouchableOpacity
                                style={styles.reportCancelButton}
                                onPress={closeReportModal}
                            >
                                <Text style={styles.reportCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[
                                    styles.reportSubmitButton,
                                    (!reportReason || (reportReason === 'other' && !customReportReason.trim())) 
                                        && styles.reportSubmitDisabled
                                ]}
                                onPress={submitReport}
                                disabled={!reportReason || (reportReason === 'other' && !customReportReason.trim())}
                            >
                                <Text style={styles.reportSubmitText}>Submit Report</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* Block User Confirmation Modal */}
            {console.log('Block confirm modal render check:', { showBlockConfirm, userToBlock })}
            <Modal
                visible={showBlockConfirm}
                animationType="fade"
                transparent={true}
                onRequestClose={() => {
                    setShowBlockConfirm(false);
                    setUserToBlock(null);
                }}
            >
                <View style={styles.blockModalOverlay}>
                    <View style={styles.blockModalContainer}>
                        <Text style={styles.blockModalTitle}>Block User?</Text>
                        <Text style={styles.blockModalText}>
                            Are you sure you want to block {userToBlock?.name}?{'\n\n'}
                            You will no longer see their comments or activities.
                        </Text>
                        <View style={styles.blockModalButtons}>
                            <TouchableOpacity
                                style={styles.blockCancelButton}
                                onPress={() => {
                                    setShowBlockConfirm(false);
                                    setUserToBlock(null);
                                }}
                            >
                                <Text style={styles.blockCancelText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.blockConfirmButton}
                                onPress={confirmBlockUser}
                            >
                                <Text style={styles.blockConfirmText}>Block</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        width: '100%',
        paddingHorizontal: 16,
        paddingVertical: 16,
        position: 'relative',  // Ensure the wrapper is the positioning context
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
        gap: 12,
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
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 40,
        gap: 8,
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
        maxWidth: 72,
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
    fakeInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        marginRight: 12,
        justifyContent: 'center',
    },
    fakeInputText: {
        fontSize: 14,
        color: '#cbd5e1',
    },
    fakeInputFull: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
        justifyContent: 'center',
    },
    sendButton: {
        minWidth: TOUCH_TARGETS.COMFORTABLE_SIZE,
        minHeight: TOUCH_TARGETS.COMFORTABLE_SIZE,
        width: TOUCH_TARGETS.COMFORTABLE_SIZE,
        height: TOUCH_TARGETS.COMFORTABLE_SIZE,
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
        top: -60,  // Position above the component to avoid being covered
        left: 0,
        right: 0,
        zIndex: 99999,  // Increased to ensure it appears above all modals
        elevation: 999,  // For Android
        alignItems: 'center',
    },
    toast: {
        backgroundColor: 'rgba(32, 25, 37, 0.98)',  // More opaque background
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.5)',  // Changed to match app theme
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.5,  // Stronger shadow
        shadowRadius: 12,
        elevation: 10,
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
        backgroundColor: '#cc31e8',  // Changed to match app's primary color
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
    // View all comments button
    viewAllButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 8,
        alignSelf: 'center',
    },
    viewAllText: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    // Modal styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalScrollView: {
        flex: 1,
    },
    modalContent: {
        paddingHorizontal: 20,
        paddingVertical: 16,
    },
    modalEmptyState: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 60,
        paddingHorizontal: 40,
    },
    modalEmptyIcon: {
        marginBottom: 24,
        opacity: 0.6,
    },
    modalEmptyTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '600',
        textAlign: 'center',
        marginBottom: 12,
    },
    modalEmptySubtitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },
    modalEmptyHint: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    modalEmptyHintText: {
        color: '#cc31e8',
        fontSize: 14,
        textAlign: 'center',
        fontWeight: '500',
    },
    modalKeyboardContainer: {
        flex: 1,
    },
    modalComposer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 24 : 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
        backgroundColor: '#201925',
        gap: 12,
    },
    modalInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 16,
        color: '#fff',
        maxHeight: 100,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    modalSendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 2,
    },
    modalSendButtonActive: {
        backgroundColor: '#cc31e8',
    },
    modalSendButtonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    // Report button styles
    reportButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        padding: 4,
        zIndex: 1,
    },
    // Report modal styles
    reportModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        elevation: 9999,
    },
    reportModalContainer: {
        backgroundColor: '#201925',
        borderRadius: 16,
        width: '90%',
        maxWidth: 400,
        maxHeight: '80%',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    reportModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },
    reportModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    reportModalClose: {
        padding: 4,
    },
    reportModalSubtitle: {
        fontSize: 16,
        color: '#e2e8f0',
        padding: 20,
        paddingBottom: 10,
    },
    reportReasonsContainer: {
        maxHeight: 300,
        paddingHorizontal: 20,
    },
    reportReasonItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        marginBottom: 8,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    reportReasonSelected: {
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderColor: '#cc31e8',
    },
    reportRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.5)',
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    reportRadioSelected: {
        borderColor: '#cc31e8',
    },
    reportRadioInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#cc31e8',
    },
    reportReasonText: {
        fontSize: 15,
        color: '#fff',
        flex: 1,
    },
    reportCustomInput: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 8,
        padding: 12,
        marginTop: 8,
        marginBottom: 12,
        fontSize: 15,
        color: '#fff',
        minHeight: 80,
        textAlignVertical: 'top',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    reportModalButtons: {
        flexDirection: 'row',
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(64, 51, 71, 0.3)',
        gap: 12,
    },
    reportCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    reportCancelText: {
        fontSize: 16,
        color: '#e2e8f0',
        fontWeight: '500',
    },
    reportSubmitButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#cc31e8',
    },
    reportSubmitDisabled: {
        opacity: 0.5,
    },
    reportSubmitText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
    // Block user button
    blockUserButton: {
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 16,
        marginBottom: 16,
        marginHorizontal: 20,
        alignItems: 'center',
    },
    blockUserButtonText: {
        color: '#FF6B6B',
        fontSize: 15,
        fontWeight: '600',
    },
    // Block confirmation modal
    blockModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    blockModalContainer: {
        backgroundColor: '#201925',
        borderRadius: 16,
        padding: 24,
        width: '85%',
        maxWidth: 350,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    blockModalTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    blockModalText: {
        fontSize: 15,
        color: '#e2e8f0',
        lineHeight: 22,
        marginBottom: 24,
    },
    blockModalButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    blockCancelButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.3)',
    },
    blockCancelText: {
        fontSize: 16,
        color: '#e2e8f0',
        fontWeight: '500',
    },
    blockConfirmButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        backgroundColor: '#FF6B6B',
    },
    blockConfirmText: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '600',
    },
});

export default CommentsSection;