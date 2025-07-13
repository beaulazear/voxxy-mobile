import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Animated,
    StyleSheet,
    Alert,
    AppState,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import { API_URL } from '../config';

// Create notification context
const InvitationNotificationContext = createContext();

// Custom hook to use invitation notifications
export const useInvitationNotifications = () => {
    const context = useContext(InvitationNotificationContext);
    if (!context) {
        throw new Error('useInvitationNotifications must be used within InvitationNotificationProvider');
    }
    return context;
};

// Main provider component
export const InvitationNotificationProvider = ({ children }) => {
    const { user, setUser } = useContext(UserContext);
    const [pendingInvitations, setPendingInvitations] = useState([]);
    const [showInviteToast, setShowInviteToast] = useState(false);
    const [currentInviteData, setCurrentInviteData] = useState(null);

    const pollingRef = useRef(null);
    const toastAnim = useRef(new Animated.Value(-150)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    // Check for new invitations
    const checkForNewInvitations = async () => {
        if (!user?.token || !user?.id) return;

        try {
            console.log('🔍 Checking for new invitations...');

            const response = await fetch(`${API_URL}/users/${user.id}/pending_invitations`, {
                headers: {
                    'Authorization': `Bearer ${user.token}`,
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                const invitations = await response.json();
                console.log('📨 Current pending invitations:', invitations.length);

                // Check if we have new invitations compared to what we know about
                const currentInviteIds = new Set(
                    (user.participant_activities || [])
                        .filter(p => !p.accepted)
                        .map(p => p.activity.id)
                );

                const newInvitations = invitations.filter(
                    invite => !currentInviteIds.has(invite.activity.id)
                );

                if (newInvitations.length > 0) {
                    console.log('🎉 Found new invitations:', newInvitations.length);

                    // Update user context with new invitations
                    setUser(prevUser => ({
                        ...prevUser,
                        participant_activities: [
                            ...(prevUser.participant_activities || []),
                            ...newInvitations
                        ]
                    }));

                    // Show notification for the most recent invitation
                    const newestInvite = newInvitations[newInvitations.length - 1];
                    showInvitationToast(newestInvite, newInvitations.length);
                }
            }
        } catch (error) {
            console.log('⚠️ Error checking invitations (silent):', error.message);
        }
    };

    // Show invitation toast notification
    const showInvitationToast = (inviteData, count) => {
        setCurrentInviteData({ ...inviteData, count });
        setShowInviteToast(true);

        // Animate toast sliding down
        Animated.sequence([
            Animated.timing(toastAnim, {
                toValue: 20,
                duration: 400,
                useNativeDriver: true,
            }),
            Animated.delay(4000), // Show for 4 seconds for invitations
            Animated.timing(toastAnim, {
                toValue: -150,
                duration: 400,
                useNativeDriver: true,
            })
        ]).start(() => {
            setShowInviteToast(false);
            setCurrentInviteData(null);
        });

        // Pulse animation
        Animated.sequence([
            Animated.timing(pulseAnim, {
                toValue: 1.1,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            })
        ]).start();
    };

    // Handle accepting invitation from toast
    const handleQuickAccept = async () => {
        if (!currentInviteData) return;

        try {
            const response = await fetch(`${API_URL}/activity_participants/accept`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                },
                body: JSON.stringify({
                    email: user.email,
                    activity_id: currentInviteData.activity.id
                }),
            });

            if (response.ok) {
                const updatedActivity = await response.json();

                // Update user context
                setUser(prevUser => ({
                    ...prevUser,
                    participant_activities: prevUser.participant_activities.map(p =>
                        p.activity.id === updatedActivity.id
                            ? { ...p, accepted: true, activity: updatedActivity }
                            : p
                    ),
                }));

                // Hide toast and show success
                setShowInviteToast(false);
                Alert.alert('🎉 Success!', `Welcome to ${currentInviteData.activity.activity_name}!`);
            } else {
                Alert.alert('Error', 'Failed to accept invitation.');
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
            Alert.alert('Error', 'Failed to accept invitation.');
        }
    };

    // Dismiss toast
    const dismissToast = () => {
        Animated.timing(toastAnim, {
            toValue: -150,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setShowInviteToast(false);
            setCurrentInviteData(null);
        });
    };

    // Setup polling
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === 'active' && user?.token) {
                console.log('📱 App became active - starting invitation polling');
                if (!pollingRef.current) {
                    // Check immediately when app becomes active
                    checkForNewInvitations();
                    pollingRef.current = setInterval(checkForNewInvitations, 10000); // Every 10 seconds
                }
            } else {
                console.log('📱 App went to background - stopping invitation polling');
                if (pollingRef.current) {
                    clearInterval(pollingRef.current);
                    pollingRef.current = null;
                }
            }
        };

        // Start polling if app is active and user is logged in
        if (user?.token && AppState.currentState === 'active') {
            console.log('🚀 Starting invitation polling');
            checkForNewInvitations(); // Check immediately
            pollingRef.current = setInterval(checkForNewInvitations, 10000);
        }

        // Listen for app state changes
        const appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

        return () => {
            console.log('🛑 Stopping invitation polling');
            if (pollingRef.current) {
                clearInterval(pollingRef.current);
            }
            appStateSubscription?.remove();
        };
    }, [user?.token, user?.id]);

    const contextValue = {
        pendingInvitations,
        checkForNewInvitations,
        showInvitationToast,
    };

    return (
        <InvitationNotificationContext.Provider value={contextValue}>
            {children}

            {/* Invitation Toast Notification */}
            {showInviteToast && currentInviteData && (
                <Animated.View
                    style={[
                        styles.inviteToastContainer,
                        { transform: [{ translateY: toastAnim }, { scale: pulseAnim }] }
                    ]}
                >
                    <View style={styles.inviteToast}>
                        <TouchableOpacity style={styles.dismissButton} onPress={dismissToast}>
                            <Text style={styles.dismissText}>✕</Text>
                        </TouchableOpacity>

                        <View style={styles.inviteHeader}>
                            <Text style={styles.inviteIcon}>🎉</Text>
                            <View style={styles.inviteContent}>
                                <Text style={styles.inviteTitle}>
                                    {currentInviteData.count === 1 ? 'New Invitation!' : `${currentInviteData.count} New Invitations!`}
                                </Text>
                                <Text style={styles.inviteSubtitle}>
                                    You're invited to "{currentInviteData.activity.activity_name}"
                                </Text>
                                {currentInviteData.activity.user && (
                                    <Text style={styles.inviteFrom}>
                                        From {currentInviteData.activity.user.name}
                                    </Text>
                                )}
                            </View>
                        </View>

                        <View style={styles.inviteActions}>
                            <TouchableOpacity
                                style={styles.acceptButton}
                                onPress={handleQuickAccept}
                            >
                                <Text style={styles.acceptButtonText}>Accept</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.viewButton}
                                onPress={dismissToast}
                            >
                                <Text style={styles.viewButtonText}>View Later</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Animated.View>
            )}
        </InvitationNotificationContext.Provider>
    );
};

const styles = StyleSheet.create({
    inviteToastContainer: {
        position: 'absolute',
        top: 0,
        left: 16,
        right: 16,
        zIndex: 2000,
        alignItems: 'center',
    },
    inviteToast: {
        backgroundColor: 'rgba(42, 30, 46, 0.98)',
        borderRadius: 20,
        padding: 20,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.4)',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 8,
        },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 12,
        minWidth: 320,
        maxWidth: 360,
    },
    dismissButton: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1,
    },
    dismissText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '600',
    },
    inviteHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
    },
    inviteIcon: {
        fontSize: 32,
        marginRight: 12,
        marginTop: 4,
    },
    inviteContent: {
        flex: 1,
        paddingRight: 24,
    },
    inviteTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    inviteSubtitle: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        marginBottom: 4,
        lineHeight: 20,
    },
    inviteFrom: {
        color: 'rgba(204, 49, 232, 0.9)',
        fontSize: 12,
        fontWeight: '600',
    },
    inviteActions: {
        flexDirection: 'row',
        gap: 12,
    },
    acceptButton: {
        flex: 1,
        backgroundColor: '#cc31e8',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        shadowColor: '#cc31e8',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    viewButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    viewButtonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '600',
    },
});