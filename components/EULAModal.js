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
import { Shield, AlertTriangle, Users, FileText, Check } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/Colors';
import { API_URL } from '../config';
import { UserContext } from '../context/UserContext';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import { logger } from '../utils/logger';

export default function EULAModal({ visible, onAccept, onDecline }) {
    const [agreedToTerms, setAgreedToTerms] = useState(false);
    const [agreedToContent, setAgreedToContent] = useState(false);
    const [agreedToPrivacy, setAgreedToPrivacy] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const { user } = useContext(UserContext);

    const POLICY_VERSION = '1.0.0'; // Match backend version

    const handleAccept = async () => {
        if (!agreedToTerms || !agreedToContent) {
            Alert.alert('Required', 'Please agree to both the Terms of Service and Community Guidelines to continue');
            return;
        }
        
        setSubmitting(true);

        try {
            // If user is logged in, sync with backend
            if (user && user.token) {
                const policyEndpoint = `${API_URL}/accept_policies`;
                logger.debug('========== POLICY ACCEPTANCE DEBUG ==========');
                logger.debug('Attempting to sync policy acceptance with backend');
                logger.debug('Full API URL:', policyEndpoint);
                logger.debug('Token present:', !!user.token);
                logger.debug('API_URL base:', API_URL);
                logger.debug('User ID:', user?.id);
                logger.debug('Policies being accepted:', {
                    terms: agreedToTerms,
                    privacy: true, // Always true since we're not showing privacy checkbox separately
                    guidelines: agreedToContent
                });
                logger.debug('===========================================');
                
                const response = await safeAuthApiCall(
                    policyEndpoint,
                    user.token,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            accept_terms: agreedToTerms,
                            accept_privacy: true, // Always accept privacy since it's bundled with terms
                            accept_guidelines: agreedToContent,
                            terms_version: POLICY_VERSION,
                            privacy_version: POLICY_VERSION,
                            guidelines_version: POLICY_VERSION
                        })
                    }
                );

                if (response) {
                    logger.debug('Policies accepted on backend successfully:', response);
                    
                    // Store locally as backup with successful sync flag
                    await AsyncStorage.setItem('policies_accepted', JSON.stringify({
                        timestamp: new Date().toISOString(),
                        terms_version: POLICY_VERSION,
                        privacy_version: POLICY_VERSION,
                        guidelines_version: POLICY_VERSION,
                        synced_with_backend: true
                    }));
                    
                    // Also store old keys for backward compatibility
                    await AsyncStorage.setItem('eulaAcceptedDate', new Date().toISOString());
                    await AsyncStorage.setItem('eulaVersion', POLICY_VERSION);
                    
                    logger.debug('Policies successfully synced with backend and stored locally');
                } else {
                    throw new Error('Invalid response from policy acceptance endpoint');
                }
            } else {
                // For users not logged in yet (during signup), store locally
                await AsyncStorage.setItem('policies_accepted', JSON.stringify({
                    timestamp: new Date().toISOString(),
                    terms_version: POLICY_VERSION,
                    privacy_version: POLICY_VERSION,
                    guidelines_version: POLICY_VERSION,
                    synced_with_backend: false,
                    pending_sync: true
                }));
                
                // Also store old keys for backward compatibility
                await AsyncStorage.setItem('eulaAcceptedDate', new Date().toISOString());
                await AsyncStorage.setItem('eulaVersion', POLICY_VERSION);
                await AsyncStorage.setItem('contentGuidelinesAccepted', 'true');
            }

            setSubmitting(false);
            onAccept();
        } catch (error) {
            // Only log non-404 errors (404 is expected during signup before backend deployment)
            if (error.status !== 404) {
                logger.error('Failed to accept policies:', {
                    error: error.message,
                    status: error.status,
                    stack: error.stack
                });
            } else {
                logger.debug('Policy endpoint not found (expected during signup) - saving locally');
            }
            
            // Check if it's a network/connection error or actual API error
            const isNetworkError = !error.status || error.message?.includes('Network') || error.message?.includes('timeout');
            
            // Still allow user to proceed if backend fails (store locally)
            await AsyncStorage.setItem('policies_accepted', JSON.stringify({
                timestamp: new Date().toISOString(),
                terms_version: POLICY_VERSION,
                privacy_version: POLICY_VERSION,
                guidelines_version: POLICY_VERSION,
                synced_with_backend: false,
                pending_sync: true,
                error: error.message
            }));

            if (isNetworkError) {
                Alert.alert(
                    'Connection Issue',
                    'Policies accepted locally. We\'ll sync with our servers when connection is restored.',
                    [{ text: 'OK', onPress: onAccept }]
                );
            } else {
                // For actual API errors (including 404), don't show confusing message
                if (error.status !== 404) {
                    logger.debug('Policy sync failed but allowing user to continue');
                }
                // Just proceed without showing an alert since policies are saved locally
                onAccept();
            }
            
            setSubmitting(false);
        }
    };

    const GuidelineItem = ({ icon: Icon, title, description }) => (
        <View style={styles.guidelineItem}>
            <Icon size={24} color="#FF6B6B" style={styles.guidelineIcon} />
            <View style={styles.guidelineContent}>
                <Text style={styles.guidelineTitle}>{title}</Text>
                <Text style={styles.guidelineDescription}>{description}</Text>
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
                        <Text style={styles.title}>Terms of Service & Community Guidelines</Text>
                        <Text style={styles.subtitle}>
                            Please review and accept our terms to continue
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <AlertTriangle size={18} color="#FF6B6B" /> Zero Tolerance Policy
                        </Text>
                        <Text style={styles.warningText}>
                            Voxxy has a zero tolerance policy for objectionable content and abusive users. 
                            Violation of these guidelines will result in immediate content removal and account termination.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Prohibited Content & Behavior</Text>
                        
                        <GuidelineItem
                            icon={AlertTriangle}
                            title="No Harassment or Bullying"
                            description="Any form of harassment, threats, or bullying toward other users is strictly prohibited."
                        />
                        
                        <GuidelineItem
                            icon={AlertTriangle}
                            title="No Hate Speech"
                            description="Content that promotes discrimination based on race, ethnicity, religion, gender, sexual orientation, or disability is forbidden."
                        />
                        
                        <GuidelineItem
                            icon={AlertTriangle}
                            title="No Inappropriate Content"
                            description="Sexually explicit, violent, or graphic content is not allowed on the platform."
                        />
                        
                        <GuidelineItem
                            icon={AlertTriangle}
                            title="No Spam or Scams"
                            description="Promotional spam, phishing attempts, or fraudulent activities will result in immediate ban."
                        />
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>
                            <Users size={20} color="#4ECDC4" /> User Safety Features
                        </Text>
                        <View style={styles.safetyItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.safetyText}>Report inappropriate content or users anytime</Text>
                        </View>
                        <View style={styles.safetyItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.safetyText}>Block users who make you uncomfortable</Text>
                        </View>
                        <View style={styles.safetyItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.safetyText}>All reports reviewed within 24 hours</Text>
                        </View>
                        <View style={styles.safetyItem}>
                            <Check size={20} color="#4ECDC4" />
                            <Text style={styles.safetyText}>Content automatically filtered for safety</Text>
                        </View>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Enforcement & Consequences</Text>
                        <Text style={styles.enforcementText}>
                            • First violation: Content removal and warning{'\n'}
                            • Severe violation: Immediate permanent ban{'\n'}
                            • We cooperate with law enforcement when required{'\n'}
                            • Appeals can be submitted to support@voxxyai.com
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.linkButton}
                        onPress={() => Linking.openURL('https://www.heyvoxxy.com/#terms')}
                    >
                        <FileText size={20} color="#9261E5" />
                        <Text style={styles.linkText}>Read Full Terms of Service</Text>
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
                                I have read and agree to the Terms of Service
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.checkbox, styles.checkboxMarginTop]}
                            onPress={() => setAgreedToContent(!agreedToContent)}
                        >
                            <View style={[styles.checkboxInner, agreedToContent && styles.checkboxChecked]}>
                                {agreedToContent && <Check size={16} color="#fff" />}
                            </View>
                            <Text style={styles.checkboxText}>
                                I understand and agree to follow the Community Guidelines with zero tolerance for violations
                            </Text>
                        </TouchableOpacity>
                    </View>
                </ScrollView>

                <View style={styles.buttonContainer}>
                    <TouchableOpacity
                        style={[styles.acceptButton, (!agreedToTerms || !agreedToContent || submitting) && styles.disabledButton]}
                        onPress={handleAccept}
                        disabled={!agreedToTerms || !agreedToContent || submitting}
                    >
                        {submitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.acceptButtonText}>I Agree & Continue</Text>
                        )}
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                        style={styles.declineButton}
                        onPress={onDecline}
                    >
                        <Text style={styles.declineButtonText}>Cancel</Text>
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
        paddingBottom: 200,
    },
    header: {
        alignItems: 'center',
        marginBottom: 30,
        marginTop: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.textPrimary,
        marginTop: 15,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    section: {
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 15,
        flexDirection: 'row',
        alignItems: 'center',
    },
    warningText: {
        fontSize: 15,
        color: '#FF6B6B',
        lineHeight: 22,
        fontWeight: '500',
        backgroundColor: 'rgba(255, 107, 107, 0.1)',
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.3)',
    },
    guidelineItem: {
        flexDirection: 'row',
        marginBottom: 20,
        backgroundColor: colors.cardBackground,
        padding: 15,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 107, 107, 0.2)',
    },
    guidelineIcon: {
        marginRight: 15,
    },
    guidelineContent: {
        flex: 1,
    },
    guidelineTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    guidelineDescription: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    safetyItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
        backgroundColor: colors.cardBackground,
        padding: 12,
        borderRadius: 8,
    },
    safetyText: {
        fontSize: 15,
        color: colors.textPrimary,
        marginLeft: 10,
    },
    enforcementText: {
        fontSize: 15,
        color: colors.textPrimary,
        lineHeight: 24,
        backgroundColor: colors.cardBackground,
        padding: 15,
        borderRadius: 10,
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginVertical: 20,
        padding: 12,
    },
    linkText: {
        fontSize: 16,
        color: '#9261E5',
        fontWeight: '600',
        marginLeft: 8,
    },
    agreementSection: {
        marginTop: 10,
    },
    checkbox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    checkboxMarginTop: {
        marginTop: 15,
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
        marginTop: 2,
    },
    checkboxChecked: {
        backgroundColor: '#9261E5',
    },
    checkboxText: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
        lineHeight: 22,
    },
    buttonContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.background,
        paddingHorizontal: 20,
        paddingVertical: 15,
        paddingBottom: 50,
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