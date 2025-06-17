import React, { useState, useContext, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
    Switch,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import CustomHeader from '../components/CustomHeader';

export default function ProfileScreen() {
    const { user, setUser } = useContext(UserContext);
    const navigation = useNavigation();

    // Profile tab states
    const [isEditingName, setIsEditingName] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');
    const [preferences, setPreferences] = useState(user?.preferences || '');

    // Settings tab states
    const [textNotifications, setTextNotifications] = useState(user?.text_notifications ?? true);
    const [emailNotifications, setEmailNotifications] = useState(user?.email_notifications ?? true);
    const [pushNotifications, setPushNotifications] = useState(user?.push_notifications ?? true);

    // Tab state
    const [activeTab, setActiveTab] = useState('profile');

    const token = user?.token;

    console.log('💬 User in ProfileScreen:', user);
    console.log('💬 Token in ProfileScreen:', token);

    useEffect(() => {
        setNewName(user?.name || '');
        setPreferences(user?.preferences || '');
        setTextNotifications(user?.text_notifications ?? true);
        setEmailNotifications(user?.email_notifications ?? true);
        setPushNotifications(user?.push_notifications ?? true);
    }, [user]);

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
                        console.log("🚪 handleLogout called");
                        try {
                            await fetch(`${API_URL}/logout`, {
                                method: 'DELETE',
                                headers: {
                                    'Authorization': `Bearer ${token}`,
                                    'Content-Type': 'application/json',
                                },
                            });
                        } catch (error) {
                            console.log("Server logout failed, proceeding anyway:", error);
                        } finally {
                            console.log("🧹 Removing token and logging out");
                            await AsyncStorage.removeItem('jwt');
                            setUser(null);
                            navigation.navigate('/');
                        }
                    }
                }
            ]
        );
    };

    const handleSaveName = () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }

        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ name: newName }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update user');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, name: updatedUser.name });
                setIsEditingName(false);
                Alert.alert('Success', 'Name updated!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update name.');
            });
    };

    const handleCancelEdit = () => {
        setNewName(user?.name || '');
        setIsEditingName(false);
    };

    const handleSavePreferences = () => {
        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ preferences }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update preferences');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, preferences: updatedUser.preferences });
                Alert.alert('Success', 'Preferences saved!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to save preferences.');
            });
    };

    const handleSaveNotifications = () => {
        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
                text_notifications: textNotifications,
                email_notifications: emailNotifications,
                push_notifications: pushNotifications,
            }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update notifications');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({
                    ...user,
                    text_notifications: updatedUser.text_notifications,
                    email_notifications: updatedUser.email_notifications,
                    push_notifications: updatedUser.push_notifications,
                });
                Alert.alert('Success', 'Notification settings updated!');
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update notifications.');
            });
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
                    onPress: () => {
                        fetch(`${API_URL}/users/${user.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`,
                            },
                        })
                            .then((res) => {
                                if (!res.ok) throw new Error('Failed to delete account');
                                setUser(null);
                            })
                            .catch((err) => {
                                console.error('Delete error:', err);
                                Alert.alert('Error', 'Deletion failed.');
                            });
                    },
                },
            ]
        );
    };

    const renderProfileTab = () => (
        <View style={styles.tabContent}>
            {/* Avatar and Name Section */}
            <View style={styles.profileSection}>
                <View style={styles.avatarContainer}>
                    <Image source={Woman} style={styles.avatar} />
                </View>

                <View style={styles.nameContainer}>
                    {!isEditingName ? (
                        <View style={styles.nameDisplay}>
                            <Text style={styles.name}>{user?.name || 'User'}</Text>
                            <TouchableOpacity
                                style={styles.editButton}
                                onPress={() => setIsEditingName(true)}
                            >
                                <Text style={styles.editButtonText}>✏️</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={styles.input}
                                value={newName}
                                onChangeText={setNewName}
                                placeholder="Enter new name"
                                placeholderTextColor="#bbb"
                            />
                            <View style={styles.buttonGroup}>
                                <TouchableOpacity style={styles.saveButton} onPress={handleSaveName}>
                                    <Text style={styles.buttonText}>Save</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit}>
                                    <Text style={styles.buttonText}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    <View style={styles.emailContainer}>
                        <Text style={styles.label}>Email:</Text>
                        <Text style={styles.emailText}>{user?.email}</Text>
                    </View>
                </View>
            </View>

            {/* Preferences Section */}
            <View style={styles.section}>
                <Text style={styles.subtitle}>Preferences</Text>
                <Text style={styles.label}>Allergies or Restrictions</Text>
                <TextInput
                    style={styles.textArea}
                    value={preferences}
                    onChangeText={setPreferences}
                    placeholder="e.g. Vegan, Gluten-free, None"
                    placeholderTextColor="#bbb"
                    multiline
                    numberOfLines={3}
                />
                <TouchableOpacity style={styles.primaryButton} onPress={handleSavePreferences}>
                    <Text style={styles.buttonText}>Save Preferences</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const renderSettingsTab = () => (
        <View style={styles.tabContent}>
            <View style={styles.section}>
                <Text style={styles.subtitle}>Notification Preferences</Text>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Email Notifications</Text>
                    <Switch
                        value={emailNotifications}
                        onValueChange={setEmailNotifications}
                        trackColor={{ false: '#444', true: '#CC31E8' }}
                        thumbColor={emailNotifications ? '#fff' : '#ccc'}
                    />
                </View>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>SMS Alerts</Text>
                    <Switch
                        value={textNotifications}
                        onValueChange={setTextNotifications}
                        trackColor={{ false: '#444', true: '#CC31E8' }}
                        thumbColor={textNotifications ? '#fff' : '#ccc'}
                    />
                </View>

                <View style={styles.switchContainer}>
                    <Text style={styles.switchLabel}>Push Notifications</Text>
                    <Switch
                        value={pushNotifications}
                        onValueChange={setPushNotifications}
                        trackColor={{ false: '#444', true: '#CC31E8' }}
                        thumbColor={pushNotifications ? '#fff' : '#ccc'}
                    />
                </View>

                <TouchableOpacity style={styles.primaryButton} onPress={handleSaveNotifications}>
                    <Text style={styles.buttonText}>Save Notification Settings</Text>
                </TouchableOpacity>
            </View>

            {/* Account Actions */}
            <View style={styles.section}>
                <Text style={styles.subtitle}>Account Actions</Text>
                <View style={styles.buttonGroup}>
                    <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                        <Text style={styles.buttonText}>Delete Account</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
                        <Text style={styles.buttonText}>Log Out</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    return (
        <>
            <CustomHeader />
            <ScrollView contentContainerStyle={styles.container}>
                {/* Header */}
                <View style={styles.headerContainer}>
                    <Text style={styles.headerTitle}>Profile Settings</Text>
                    <Text style={styles.headerSubtitle}>Manage your personal information and preferences</Text>
                </View>

                {/* Card Container */}
                <View style={styles.card}>
                    {/* Tab Navigation */}
                    <View style={styles.tabNavigation}>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'profile' && styles.activeTab]}
                            onPress={() => setActiveTab('profile')}
                        >
                            <Text style={[styles.tabText, activeTab === 'profile' && styles.activeTabText]}>
                                👤 Profile
                            </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.tab, activeTab === 'settings' && styles.activeTab]}
                            onPress={() => setActiveTab('settings')}
                        >
                            <Text style={[styles.tabText, activeTab === 'settings' && styles.activeTabText]}>
                                ⚙️ Settings
                            </Text>
                        </TouchableOpacity>
                    </View>

                    {activeTab === 'profile' ? renderProfileTab() : renderSettingsTab()}
                </View>
            </ScrollView>
        </>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 30,
        paddingBottom: 80,
        paddingHorizontal: 20,
        backgroundColor: '#201925',
        flexGrow: 1,
    },
    headerContainer: {
        marginBottom: 32,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        textAlign: 'center',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#FAF9FA',
        textAlign: 'center',
    },
    card: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        shadowColor: '#000',
        shadowOpacity: 0.15,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 6 },
        elevation: 10,
    },
    tabNavigation: {
        flexDirection: 'row',
        borderBottomWidth: 1,
        borderBottomColor: '#444',
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: '#322338',
        borderRightWidth: 1,
        borderRightColor: '#444',
        alignItems: 'center',
    },
    activeTab: {
        backgroundColor: '#3d2c44',
        borderBottomWidth: 2,
        borderBottomColor: '#CC31E8',
    },
    tabText: {
        color: '#ddd',
        fontSize: 16,
        fontWeight: '500',
    },
    activeTabText: {
        color: '#fff',
    },
    tabContent: {
        padding: 20,
    },
    profileSection: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 24,
        gap: 20,
    },
    avatarContainer: {
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 2,
        borderColor: '#444',
    },
    nameContainer: {
        flex: 1,
    },
    nameDisplay: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    name: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginRight: 12,
    },
    editButton: {
        padding: 4,
    },
    editButtonText: {
        fontSize: 16,
    },
    editContainer: {
        marginBottom: 16,
    },
    emailContainer: {
        marginTop: 8,
    },
    emailText: {
        color: '#fff',
        fontSize: 16,
    },
    section: {
        marginTop: 24,
    },
    subtitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#ddd',
        marginBottom: 16,
    },
    label: {
        fontSize: 14,
        fontWeight: '500',
        color: '#ddd',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#241928',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 12,
    },
    textArea: {
        backgroundColor: '#241928',
        color: '#fff',
        borderWidth: 1,
        borderColor: '#444',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        marginBottom: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    switchContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
    },
    switchLabel: {
        color: '#fff',
        fontSize: 16,
    },
    buttonGroup: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
    },
    primaryButton: {
        backgroundColor: '#CC31E8',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 16,
    },
    saveButton: {
        backgroundColor: '#44617b',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#6b6b6b',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    deleteButton: {
        backgroundColor: '#d11a2a',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    logoutButton: {
        backgroundColor: '#6b6b6b',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        flex: 1,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
});