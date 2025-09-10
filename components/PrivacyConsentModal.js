import React, { useState, useContext } from 'react';
import {
    Modal,
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    Linking,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { Shield, MapPin, Users, Bell, Brain, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/Colors';
import { API_URL } from '../config';
import { UserContext } from '../context/UserContext';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import { logger } from '../utils/logger';

export default function PrivacyConsentModal({ visible, onAccept, onDecline, navigation }) {
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useContext(UserContext);

    const PRIVACY_VERSION = '1.0.0'; // Match EULA version format

    const handleAccept = async () => {
        if (!agreedToTerms) {
            Alert.alert('Required', 'Please agree to the Privacy Policy to continue');
            return;
        }
        
        setSubmitting(true);

        try {
            // If user is logged in, sync with backend
            if (user && user.token) {
                const policyEndpoint = `${API_URL}/accept_policies`;
                logger.debug('========== PRIVACY POLICY ACCEPTANCE DEBUG ==========');
                logger.debug('Attempting to sync privacy policy acceptance with backend');
                logger.debug('Full API URL:', policyEndpoint);
                logger.debug('Token present:', !!user.token);
                logger.debug('User ID:', user?.id);
                logger.debug('Policy being accepted:', {
                    privacy: true,
                    version: PRIVACY_VERSION
                });
                logger.debug('====================================================');
                
                const response = await safeAuthApiCall(
                    policyEndpoint,
                    user.token,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            accept_privacy: true,
                            privacy_version: PRIVACY_VERSION
                        })
                    }
                );

                if (response) {
                    logger.debug('Privacy policy accepted on backend successfully:', response);
                    
                    // Store locally as backup with successful sync flag
                    await AsyncStorage.setItem('privacy_policy_accepted', JSON.stringify({
                        timestamp: new Date().toISOString(),
                        privacy_version: PRIVACY_VERSION,
                        synced_with_backend: true
                    }));
                    
                    // Also store old keys for backward compatibility
                    await AsyncStorage.setItem('privacyConsentDate', new Date().toISOString());
                    await AsyncStorage.setItem('privacyConsentVersion', PRIVACY_VERSION);
                    
                    logger.debug('Privacy policy successfully synced with backend and stored locally');
                } else {
                    throw new Error('Invalid response from policy acceptance endpoint');
                }
            } else {
                // For users not logged in yet (during signup), store locally
                await AsyncStorage.setItem('privacy_policy_accepted', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    privacy_version: PRIVACY_VERSION,
                    synced_with_backend: false,
                    pending_sync: true
                }));
                
                // Also store old keys for backward compatibility
                await AsyncStorage.setItem('privacyConsentDate', new Date().toISOString());
                await AsyncStorage.setItem('privacyConsentVersion', PRIVACY_VERSION);
                
                logger.debug('Privacy policy stored locally (user not logged in)');
            }

            setSubmitting(false);
            onAccept();
        } catch (error) {
            logger.error('Failed to accept privacy policy:', {
                error: error.message,
                status: error.status,
                stack: error.stack
            });
            
            // Check if it's a network/connection error
            const isNetworkError = !error.status || error.message?.includes('Network') || error.message?.includes('timeout');
            
            // Still allow user to proceed if backend fails (store locally)
            await AsyncStorage.setItem('privacy_policy_accepted', JSON.stringify({
                timestamp: new Date().toISOString(),
                privacy_version: PRIVACY_VERSION,
                synced_with_backend: false,
                pending_sync: true,
                error: error.message
            }));

            // Also store old keys for backward compatibility
            await AsyncStorage.setItem('privacyConsentDate', new Date().toISOString());
            await AsyncStorage.setItem('privacyConsentVersion', PRIVACY_VERSION);

            if (isNetworkError) {
                Alert.alert(
                    'Connection Issue',
                    'Privacy policy accepted locally. We\'ll sync with our servers when connection is restored.',
                    [{ text: 'OK', onPress: onAccept }]
                );
            } else {
                // For actual API errors, just proceed without showing an alert
                logger.debug('Privacy policy sync failed but allowing user to continue');
                onAccept();
            }
            
            setSubmitting(false);
        }
    };

    const handleViewPrivacy = () => {
        navigation.navigate('PrivacyPolicy');
    };

    const DataItem = ({ icon: Icon, title, description }) => (
        <View style={styles.dataItem}>
            <Icon size={24} color="#9261E5" style={styles.dataIcon} />
            <View style={styles.dataContent}>
                <Text style={styles.dataTitle}>{title}</Text>
                <Text style={styles.dataDescription}>{description}</Text>
            </View>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={() => {}}
        >
            <SafeAreaView style={styles.container}>
                <ScrollView 
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Shield size={48} color="#9261E5" />
                        <Text style={styles.title}>Welcome to Voxxy</Text>
                        <Text style={styles.subtitle}>
                            Your privacy is important to us
                        </Text>
                    </View>

                    <View style={styles.introSection}>
                        <Text style={styles.introText}>
                            Before you start using Voxxy, we want you to understand how we handle your data.
                            We believe in transparency and giving you control over your information.
                        </Text>
                    </View>

                    <View style={styles.dataSection}>
                        <Text style={styles.sectionTitle}>Data We Collect & Why</Text>
                        
                        <DataItem
                            icon={MapPin}
                            title="Location (Optional)"
                            description="To recommend nearby restaurants and activities. Shared with AI for personalized suggestions."
                        />
                        
                        <DataItem
                            icon={Users}
                            title="Contacts (Optional)"
                            description="To help you find friends on Voxxy. We don't store your full contact list."
                        />
                        
                        <DataItem
                            icon={Bell}
                            title="Notifications (Optional)"
                            description="To send activity updates and reminders. You control what notifications you receive."
                        />
                        
                        <DataItem
                            icon={Brain}
                            title="AI Recommendations"
                            description="Your preferences are shared with OpenAI to generate personalized suggestions."
                        />
                    </View>

                    <View style={styles.commitmentSection}>
                        <Text style={styles.sectionTitle}>Our Commitment</Text>
                        <View style={styles.commitmentItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.commitmentText}>We never sell your personal data</Text>
                        </View>
                        <View style={styles.commitmentItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.commitmentText}>You can delete your account anytime</Text>
                        </View>
                        <View style={styles.commitmentItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.commitmentText}>You control your privacy settings</Text>
                        </View>
                        <View style={styles.commitmentItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.commitmentText}>All permissions are optional</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.privacyLink}
                        onPress={handleViewPrivacy}
                    >
                        <Text style={styles.privacyLinkText}>
                            Read Full Privacy Policy →
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.agreementSection}>
                        <TouchableOpacity
                            style={styles.checkbox}
                            onPress={() => setAgreedToTerms(!agreedToTerms)}
                        >
                            <View style={[styles.checkboxInner, agreedToTerms && styles.checkboxChecked]}>
                                {agreedToTerms && <Check size={16} color="#fff" />}
                            </View>
                            <Text style={styles.checkboxText}>
                                I have read and agree to the Privacy Policy
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.acceptButton, (!agreedToTerms || submitting) && styles.disabledButton]}
                        onPress={handleAccept}
                        disabled={!agreedToTerms || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptButtonText}>Accept & Continue</Text>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.declineButton}
                        onPress={onDecline}
                    >
                        <Text style={styles.declineButtonText}>Not Now</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 200, // Increased to ensure checkbox is visible above buttons
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 15,
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 8,
    },
    introSection: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 12,
        marginBottom: 25,
    },
    introText: {
        fontSize: 15,
        color: colors.textPrimary,
        lineHeight: 22,
    },
    dataSection: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 15,
    },
    dataItem: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: colors.cardBackground,
        padding: 15,
        borderRadius: 10,
    },
    dataIcon: {
        marginRight: 15,
    },
    dataContent: {
        flex: 1,
    },
    dataTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    dataDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    commitmentSection: {
        backgroundColor: colors.cardBackground,
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    commitmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    commitmentText: {
        fontSize: 15,
        color: colors.textPrimary,
        marginLeft: 10,
    },
    privacyLink: {
        alignItems: 'center',
        marginVertical: 20,
    },
    privacyLinkText: {
        fontSize: 16,
        color: '#9261E5',
        fontWeight: '600',
    },
    agreementSection: {
        marginTop: 10,
    },
    checkbox: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    checkboxInner: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#9261E5',
        borderRadius: 4,
        marginRight: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    checkboxChecked: {
        backgroundColor: '#9261E5',
    },
    checkboxText: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingBottom: 50, // Increased for better safe area coverage
        borderTopWidth: 1,
        borderTopColor: colors.purple3,
    },
    acceptButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        marginBottom: 10,
    },
    disabledButton: {
        opacity: 0.5,
    },
    acceptButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    declineButton: {
        paddingVertical: 15,
        borderRadius: 10,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.purple3,
    },
    declineButtonText: {
        color: colors.textSecondary,
        fontSize: 16,
        fontWeight: '500',
    },
});