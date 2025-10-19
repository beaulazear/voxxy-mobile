import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ScrollView,
    StatusBar,
    ActivityIndicator,
    Modal,
    Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UserContext } from '../context/UserContext';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import NotificationSettings from '../components/NotificationSettings';
import { ArrowLeft, ChevronRight, LogOut, Trash2 } from 'react-native-feather';
import { Shield } from 'lucide-react-native';
import { logger } from '../utils/logger';
import colors from '../styles/Colors';
import BlockedUsersService from '../services/BlockedUsersService';

export default function SettingsScreen() {
    const { user, setUser, updateUser, logout } = useContext(UserContext);
    const navigation = useNavigation();
    const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
    const [blockedUsers, setBlockedUsers] = useState([]);
    const [loadingBlockedUsers, setLoadingBlockedUsers] = useState(false);

    const token = user?.token;

    const handleLogout = async () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        logger.debug("🚪 handleLogout called");
                        try {
                            await fetch(`${API_URL}/logout`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                        } catch (error) {
                            logger.debug("Server logout failed, proceeding anyway:", error);
                        } finally {
                            logger.debug("🧹 Logging out using context method");
                            await logout();
                            navigation.replace('/');
                        }
                    }
                }
            ]
        );
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Account',
            'Delete account? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            logger.debug('Delete account attempt:', {
                                userId: user.id,
                                hasToken: !!token,
                                tokenValue: token ? `${token.substring(0, 10)}...` : 'undefined',
                                userHasToken: !!user?.token
                            });

                            const res = await fetch(`${API_URL}/users/${user.id}`, {
                                method: 'DELETE',
                                headers: {
                                    'Content-Type': 'application/json',
                                    'Authorization': `Bearer ${token}`,
                                },
                            });

                            if (!res.ok) {
                                logger.error('Delete account failed:', {
                                    status: res.status,
                                    statusText: res.statusText
                                });
                                throw new Error('Failed to delete account');
                            }

                            await logout();
                            navigation.replace('/');

                        } catch (err) {
                            logger.error('Delete error:', err);
                            Alert.alert('Error', 'Failed to delete account. Please try again.');
                        }
                    },
                },
            ]
        );
    };

    const handleShowBlockedUsers = async () => {
        setLoadingBlockedUsers(true);
        setShowBlockedUsersModal(true);

        try {
            if (user?.token) {
                BlockedUsersService.setAuthToken(user.token);
            }

            const blockedUsersList = await BlockedUsersService.getBlockedUserDetails();
            setBlockedUsers(blockedUsersList);
        } catch (error) {
            logger.error('Failed to load blocked users:', error);
            Alert.alert('Error', 'Failed to load blocked users');
        } finally {
            setLoadingBlockedUsers(false);
        }
    };

    const handleUnblockUser = async (userId, userName) => {
        Alert.alert(
            'Unblock User',
            `Are you sure you want to unblock ${userName}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Unblock',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const success = await BlockedUsersService.unblockUser(userId);
                            if (success) {
                                const updatedList = await BlockedUsersService.getBlockedUserDetails();
                                setBlockedUsers(updatedList);

                                Alert.alert('Success', `${userName} has been unblocked`);
                            }
                        } catch (error) {
                            logger.error('Failed to unblock user:', error);
                            Alert.alert('Error', 'Failed to unblock user');
                        }
                    }
                }
            ]
        );
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Settings</Text>
                    <Text style={styles.headerSubtitle}>Manage your account preferences</Text>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                {/* Notifications Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <NotificationSettings />
                </View>

                {/* Legal & Privacy Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Legal & Privacy</Text>
                    <TouchableOpacity
                        style={styles.settingsCard}
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    >
                        <Text style={styles.settingsCardText}>Privacy Policy</Text>
                        <ChevronRight stroke="#9261E5" width={20} height={20} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.settingsCard}
                        onPress={handleShowBlockedUsers}
                    >
                        <View style={styles.settingsCardLeft}>
                            <Shield size={20} color="#9261E5" style={{ marginRight: 12 }} />
                            <Text style={styles.settingsCardText}>Blocked Users</Text>
                        </View>
                        <ChevronRight stroke="#9261E5" width={20} height={20} />
                    </TouchableOpacity>
                </View>

                {/* Account Actions Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Account Actions</Text>

                    <TouchableOpacity
                        style={styles.logoutCard}
                        onPress={handleLogout}
                        activeOpacity={0.8}
                    >
                        <LogOut stroke="#4ECDC4" width={20} height={20} strokeWidth={2} />
                        <Text style={styles.logoutCardText}>Log Out</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.deleteCard}
                        onPress={handleDelete}
                        activeOpacity={0.8}
                    >
                        <Trash2 stroke="#ef4444" width={20} height={20} strokeWidth={2} />
                        <Text style={styles.deleteCardText}>Delete Account</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>

            {/* Blocked Users Modal */}
            <Modal
                visible={showBlockedUsersModal}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setShowBlockedUsersModal(false)}
            >
                <SafeAreaView style={styles.modalContainer} edges={['top']}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.modalCloseButton}
                            onPress={() => setShowBlockedUsersModal(false)}
                        >
                            <ArrowLeft stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>Blocked Users</Text>
                        <View style={{ width: 30 }} />
                    </View>

                    {loadingBlockedUsers ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color="#9261E5" />
                            <Text style={styles.loadingText}>Loading blocked users...</Text>
                        </View>
                    ) : blockedUsers.length === 0 ? (
                        <View style={styles.centerContainer}>
                            <Shield size={48} color="#666" style={{ marginBottom: 16 }} />
                            <Text style={styles.emptyStateTitle}>No Blocked Users</Text>
                            <Text style={styles.emptyStateText}>
                                Users you block will appear here
                            </Text>
                        </View>
                    ) : (
                        <ScrollView style={styles.modalContent}>
                            {blockedUsers.map((blockedUser) => (
                                <View key={blockedUser.id} style={styles.blockedUserItem}>
                                    <View style={styles.blockedUserInfo}>
                                        <Image
                                            source={
                                                blockedUser.profilePic ?
                                                { uri: `${API_URL}${blockedUser.profilePic}` } :
                                                require('../assets/Weird5.jpg')
                                            }
                                            style={styles.blockedUserAvatar}
                                        />
                                        <View style={styles.blockedUserDetails}>
                                            <Text style={styles.blockedUserName}>
                                                {blockedUser.name}
                                            </Text>
                                            <Text style={styles.blockedUserEmail}>
                                                {blockedUser.email}
                                            </Text>
                                        </View>
                                    </View>
                                    <TouchableOpacity
                                        style={styles.unblockButton}
                                        onPress={() => handleUnblockUser(blockedUser.id, blockedUser.name)}
                                    >
                                        <Text style={styles.unblockButtonText}>Unblock</Text>
                                    </TouchableOpacity>
                                </View>
                            ))}
                        </ScrollView>
                    )}
                </SafeAreaView>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
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
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },

    headerContent: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        fontFamily: 'Montserrat_700Bold',
    },

    headerSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    container: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },

    section: {
        marginBottom: 32,
    },

    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        fontFamily: 'Montserrat_700Bold',
    },

    settingsCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: colors.cardBackground,
        paddingVertical: 18,
        paddingHorizontal: 20,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: colors.purple3,
    },

    settingsCardLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },

    settingsCardText: {
        color: colors.textPrimary,
        fontSize: 16,
        fontWeight: '500',
    },

    logoutCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(78, 205, 196, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 12,
    },

    logoutCardText: {
        color: '#4ECDC4',
        fontSize: 16,
        fontWeight: '600',
    },

    deleteCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(239, 68, 68, 0.3)',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 20,
        gap: 12,
    },

    deleteCardText: {
        color: '#ef4444',
        fontSize: 16,
        fontWeight: '600',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },

    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
        backgroundColor: '#201925',
    },

    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },

    modalCloseButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.3)',
    },

    modalContent: {
        flex: 1,
        backgroundColor: '#201925',
    },

    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },

    loadingText: {
        color: '#B8A5C4',
        fontSize: 16,
        marginTop: 12,
    },

    emptyStateTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },

    emptyStateText: {
        fontSize: 16,
        color: '#B8A5C4',
        textAlign: 'center',
    },

    // Blocked Users Styles
    blockedUserItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(146, 97, 229, 0.1)',
    },

    blockedUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },

    blockedUserAvatar: {
        width: 50,
        height: 50,
        borderRadius: 25,
        marginRight: 12,
    },

    blockedUserDetails: {
        flex: 1,
    },

    blockedUserName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 4,
    },

    blockedUserEmail: {
        fontSize: 14,
        color: '#B8A5C4',
    },

    unblockButton: {
        backgroundColor: 'rgba(146, 97, 229, 0.2)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
    },

    unblockButtonText: {
        color: '#9261E5',
        fontSize: 14,
        fontWeight: '600',
    },
});
