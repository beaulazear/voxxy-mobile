// components/NotificationSettings.js
import React, { useContext, useState } from 'react';
import { View, Text, Switch, StyleSheet, Alert, TouchableOpacity, ActivityIndicator } from 'react-native';
import { UserContext } from '../context/UserContext';
import { logger } from '../utils/logger';
import { API_URL } from '../config';

const NotificationSettings = () => {
    const { user, updateUser } = useContext(UserContext);
    const [updating, setUpdating] = useState(false);
    const [testingSending, setTestingSending] = useState(false);

    const sendTestNotification = async () => {
        if (testingSending) return;
        
        setTestingSending(true);
        try {
            const response = await fetch(`${API_URL}/send_test_to_self`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${user.token}`,
                },
            });

            const data = await response.json();
            
            if (response.ok && data.success) {
                Alert.alert(
                    '✅ Test Sent!', 
                    'Check your device for the notification.',
                    [{ text: 'OK' }]
                );
                if (__DEV__) {
                    logger.debug('Test notification sent', data.debug_info);
                }
            } else {
                const debugInfo = __DEV__ && data.debug_info ? 
                    `\n\nDebug Info:\n${JSON.stringify(data.debug_info, null, 2)}` : '';
                
                Alert.alert(
                    '❌ Test Failed',
                    `${data.message || 'Could not send test notification'}${debugInfo}`,
                    [{ text: 'OK' }]
                );
                if (__DEV__) {
                    logger.error('Test notification failed', data);
                }
            }
        } catch (error) {
            Alert.alert('Error', 'Network error. Please try again.');
            if (__DEV__) {
                logger.error('Test notification error:', error);
            }
        } finally {
            setTestingSending(false);
        }
    };

    const updateNotificationSetting = async (type, value) => {
        if (updating) return;

        setUpdating(true);

        try {
            // Update on backend first
            const response = await fetch(`${API_URL}/users/${user.id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    // Add your auth headers here
                    'Authorization': `Bearer ${user.token}`, // or however you handle auth
                },
                body: JSON.stringify({
                    user: {
                        [type]: value
                    }
                }),
            });

            if (response.ok) {
                const updatedUser = await response.json();
                await updateUser(updatedUser);

                if (type === 'push_notifications' && value) {
                    Alert.alert(
                        'Push Notifications Enabled',
                        'You will now receive push notifications for activity updates and invites!'
                    );
                }
            } else {
                Alert.alert('Error', 'Failed to update notification settings');
            }
        } catch (error) {
            logger.error('Error updating notification settings:', error);
            Alert.alert('Error', 'Failed to update notification settings');
        } finally {
            setUpdating(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.sectionTitle}>Notification Preferences</Text>

            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Push Notifications</Text>
                    <Text style={styles.settingDescription}>
                        Get notified about activity invites and updates
                    </Text>
                </View>
                <Switch
                    value={user?.push_notifications || false}
                    onValueChange={(value) => updateNotificationSetting('push_notifications', value)}
                    disabled={updating}
                    trackColor={{ false: '#767577', true: '#d394f5' }}
                    thumbColor={user?.push_notifications ? '#cf38dd' : '#f4f3f4'}
                />
            </View>

            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Email Notifications</Text>
                    <Text style={styles.settingDescription}>
                        Receive email updates about your activities
                    </Text>
                </View>
                <Switch
                    value={user?.email_notifications || false}
                    onValueChange={(value) => updateNotificationSetting('email_notifications', value)}
                    disabled={updating}
                    trackColor={{ false: '#767577', true: '#4ECDC4' }}
                    thumbColor={user?.email_notifications ? '#4ECDC4' : '#f4f3f4'}
                />
            </View>

            <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                    <Text style={styles.settingLabel}>Text Notifications</Text>
                    <Text style={styles.settingDescription}>
                        Get SMS updates for important activity changes
                    </Text>
                </View>
                <Switch
                    value={user?.text_notifications || false}
                    onValueChange={(value) => updateNotificationSetting('text_notifications', value)}
                    disabled={updating}
                    trackColor={{ false: '#767577', true: '#FFE66D' }}
                    thumbColor={user?.text_notifications ? '#FFE66D' : '#f4f3f4'}
                />
            </View>

            {/* Test Notification Button */}
            {user?.push_notifications && (
                <TouchableOpacity 
                    style={styles.testButton}
                    onPress={sendTestNotification}
                    disabled={testingSending}
                >
                    {testingSending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.testButtonText}>🔔 Send Test Notification</Text>
                            <Text style={styles.testButtonSubtext}>Verify push notifications are working</Text>
                        </>
                    )}
                </TouchableOpacity>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: 'rgba(42, 30, 46, 0.95)',
        borderRadius: 16,
        padding: 20,
        margin: 16,
        borderWidth: 1,
        borderColor: 'rgba(64, 51, 71, 0.5)',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        marginBottom: 20,
        fontFamily: 'Montserrat_700Bold',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },
    settingInfo: {
        flex: 1,
        marginRight: 15,
    },
    settingLabel: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    settingDescription: {
        color: '#B8A5C4',
        fontSize: 13,
        lineHeight: 18,
    },
    testButton: {
        backgroundColor: '#9261E5',
        padding: 16,
        borderRadius: 12,
        marginTop: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    testButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    testButtonSubtext: {
        color: '#E8D9F2',
        fontSize: 13,
    },
});

export default NotificationSettings;