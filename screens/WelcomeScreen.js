import React, { useState, useRef, useContext, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    ScrollView,
    Animated,
    Linking,
    Alert,
    ActivityIndicator,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
    Shield,
    Lock,
    Users,
    AlertTriangle,
    FileText,
    ChevronRight,
    CheckCircle,
    Circle,
    Sparkles,
    MapPin,
    Pizza,
    Coffee,
    Beef,
    Fish,
    Salad,
    Soup,
    Sandwich
} from 'lucide-react-native';
import { API_URL } from '../config';
import { safeAuthApiCall, handleApiError } from '../utils/safeApiCall';
import { logger } from '../utils/logger';
import colors from '../styles/Colors';
import LocationPicker from '../components/LocationPicker';
import * as Haptics from 'expo-haptics';

const { width: screenWidth } = Dimensions.get('window');

// Food and dietary options (same as PreferencesModal)
const FOOD_OPTIONS = [
    { label: 'Pizza', value: 'Pizza', icon: Pizza, color: '#FF6B6B' },
    { label: 'Sushi', value: 'Sushi', icon: Fish, color: '#4ECDC4' },
    { label: 'Burgers', value: 'Burgers', icon: Sandwich, color: '#FFD93D' },
    { label: 'Tacos', value: 'Tacos', icon: Soup, color: '#FF9A3D' },
    { label: 'Pasta', value: 'Pasta', icon: Coffee, color: '#A8E6CF' },
    { label: 'Steak', value: 'Steak', icon: Beef, color: '#FF6B9D' },
    { label: 'Thai', value: 'Thai', icon: Soup, color: '#F4A460' },
    { label: 'Chinese', value: 'Chinese', icon: Coffee, color: '#FF7F50' },
    { label: 'Indian', value: 'Indian', icon: Soup, color: '#FFA500' },
    { label: 'Salads', value: 'Salads', icon: Salad, color: '#90EE90' },
    { label: 'BBQ', value: 'BBQ', icon: Beef, color: '#8B4513' },
    { label: 'Seafood', value: 'Seafood', icon: Fish, color: '#4682B4' },
];

const DIETARY_OPTIONS = [
    { label: 'Vegan', value: 'Vegan', color: '#90EE90' },
    { label: 'Vegetarian', value: 'Vegetarian', color: '#A8E6CF' },
    { label: 'Gluten-Free', value: 'Gluten-Free', color: '#FFD93D' },
    { label: 'Dairy-Free', value: 'Dairy-Free', color: '#4ECDC4' },
    { label: 'Nut Allergy', value: 'Nut Allergy', color: '#FF9A3D' },
    { label: 'Shellfish Allergy', value: 'Shellfish Allergy', color: '#FF6B9D' },
    { label: 'Kosher', value: 'Kosher', color: '#B8A5C4' },
    { label: 'Halal', value: 'Halal', color: '#9261E5' },
    { label: 'Pescatarian', value: 'Pescatarian', color: '#4682B4' },
    { label: 'Keto', value: 'Keto', color: '#FF6B6B' },
    { label: 'Paleo', value: 'Paleo', color: '#A0522D' },
    { label: 'Low-Carb', value: 'Low-Carb', color: '#DDA15E' },
];

export default function WelcomeScreen({ onComplete }) {
    const navigation = useNavigation();
    const { user, setUser, updateUser } = useContext(UserContext);

    const [currentStep, setCurrentStep] = useState(0);
    const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFullPrivacy, setShowFullPrivacy] = useState(false);
    const [showFullTerms, setShowFullTerms] = useState(false);

    // Profile setup state (Step 3)
    const [userLocation, setUserLocation] = useState(null);
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [selectedDietary, setSelectedDietary] = useState([]);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(50)).current;
    const progressAnim = useRef(new Animated.Value(0)).current;

    const POLICY_VERSION = '1.0.0';
    const TOTAL_STEPS = 3; // Privacy, Terms, Profile Setup

    useEffect(() => {
        // Entrance animation
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 600,
                useNativeDriver: true,
            }),
        ]).start();

        // Animate progress bar
        Animated.timing(progressAnim, {
            toValue: (currentStep + 1) / TOTAL_STEPS,
            duration: 300,
            useNativeDriver: false,
        }).start();
    }, [currentStep]);

    const handleNext = () => {
        if (currentStep === 0 && !acceptedPrivacy) {
            Alert.alert('Required', 'Please accept the Privacy Policy to continue');
            return;
        }
        if (currentStep === 1 && !acceptedTerms) {
            Alert.alert('Required', 'Please accept the Terms & Community Guidelines to continue');
            return;
        }

        // Animate transition
        Animated.sequence([
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 300,
                useNativeDriver: true,
            }),
        ]).start();

        setCurrentStep(currentStep + 1);
    };

    const handleComplete = async () => {
        if (!acceptedPrivacy || !acceptedTerms) {
            Alert.alert('Required', 'Please accept all policies to continue');
            return;
        }

        setIsSubmitting(true);

        try {
            // If user is logged in, sync with backend
            if (user && user.token) {
                const policyEndpoint = `${API_URL}/accept_policies`;
                logger.debug('Syncing policy acceptance with backend');

                const response = await safeAuthApiCall(
                    policyEndpoint,
                    user.token,
                    {
                        method: 'POST',
                        body: JSON.stringify({
                            accept_terms: acceptedTerms,
                            accept_privacy: acceptedPrivacy,
                            accept_guidelines: acceptedTerms, // Bundled with terms
                            terms_version: POLICY_VERSION,
                            privacy_version: POLICY_VERSION,
                            guidelines_version: POLICY_VERSION
                        })
                    }
                );

                // Keep track of the current user with token
                let currentUser = user;

                if (response) {
                    logger.debug('Policies accepted on backend successfully');

                    // Update user context with new policy status from backend
                    if (response.user) {
                        currentUser = {
                            ...user,
                            all_policies_accepted: response.user.all_policies_accepted,
                            terms_accepted: response.user.terms_accepted,
                            privacy_policy_accepted: response.user.privacy_policy_accepted,
                            community_guidelines_accepted: response.user.community_guidelines_accepted
                        };
                        setUser(currentUser);
                    }

                    // Optional: Store a simple cache flag for offline mode only
                    await AsyncStorage.setItem('policy_cache', JSON.stringify({
                        accepted_at: new Date().toISOString(),
                        version: POLICY_VERSION
                    }));
                }

                // Save profile data if any was provided
                if (userLocation || selectedFoods.length > 0 || selectedDietary.length > 0) {
                    logger.debug('Saving profile preferences from onboarding');
                    logger.debug('userLocation state:', userLocation);
                    logger.debug('selectedFoods:', selectedFoods);
                    logger.debug('selectedDietary:', selectedDietary);

                    const profileData = {};

                    // Add location if provided
                    if (userLocation) {
                        profileData.neighborhood = userLocation.neighborhood || '';
                        profileData.city = userLocation.city || '';
                        profileData.state = userLocation.state || '';
                        profileData.latitude = userLocation.latitude || null;
                        profileData.longitude = userLocation.longitude || null;
                        logger.debug('Location data being saved:', profileData);
                    }

                    // Add favorite foods if selected
                    if (selectedFoods.length > 0) {
                        profileData.favorite_food = selectedFoods.join(', ');
                    }

                    // Add dietary preferences if selected
                    if (selectedDietary.length > 0) {
                        profileData.preferences = selectedDietary.join(', ');
                    }

                    logger.debug('Complete profileData being sent to backend:', profileData);
                    logger.debug('Using user with ID:', currentUser.id, 'and token present:', !!currentUser.token);

                    // Make direct API call instead of using updateUser from context
                    // to avoid stale closure issues with user state
                    const updatedUserData = await safeAuthApiCall(
                        `${API_URL}/users/${currentUser.id}`,
                        currentUser.token,
                        {
                            method: 'PATCH',
                            body: JSON.stringify({
                                user: profileData
                            }),
                        }
                    );

                    logger.debug('Response from profile update:', updatedUserData);

                    if (updatedUserData) {
                        // Update context with the complete user data including location
                        const finalUser = { ...updatedUserData, token: currentUser.token };
                        setUser(finalUser);

                        logger.debug('Profile preferences saved successfully');
                        logger.debug('Updated user location fields:', {
                            neighborhood: updatedUserData.neighborhood,
                            city: updatedUserData.city,
                            state: updatedUserData.state,
                            latitude: updatedUserData.latitude,
                            longitude: updatedUserData.longitude,
                            full_location: updatedUserData.full_location
                        });
                    } else {
                        logger.error('Profile update returned null or undefined!');
                    }
                }
            }

            // Call the completion callback if provided (when coming from App.js)
            if (onComplete) {
                await onComplete();
            }

            // Reset navigation stack to home screen
            navigation.reset({
                index: 0,
                routes: [{ name: '/' }],
            });
        } catch (error) {
            logger.error('Failed to complete onboarding:', error);

            // For offline/error cases, store minimal cache
            await AsyncStorage.setItem('policy_cache', JSON.stringify({
                accepted_at: new Date().toISOString(),
                version: POLICY_VERSION,
                pending_sync: true
            }));

            // Call the completion callback if provided (when coming from App.js)
            if (onComplete) {
                await onComplete();
            }

            // Reset navigation stack to home screen
            navigation.reset({
                index: 0,
                routes: [{ name: '/' }],
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const renderPrivacyStep = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.iconContainer}>
                <Lock size={60} color="#9261E5" />
            </View>

            <Text style={styles.stepTitle}>Your Privacy Matters</Text>
            <Text style={styles.stepSubtitle}>
                We're committed to protecting your personal information and being transparent about how we use it.
            </Text>

            <View style={styles.highlightBox}>
                <View style={styles.highlightItem}>
                    <Shield size={24} color="#4ECDC4" />
                    <View style={styles.highlightContent}>
                        <Text style={styles.highlightTitle}>Data Protection</Text>
                        <Text style={styles.highlightText}>
                            Your data is encrypted and never sold to third parties
                        </Text>
                    </View>
                </View>

                <View style={styles.highlightItem}>
                    <Users size={24} color="#4ECDC4" />
                    <View style={styles.highlightContent}>
                        <Text style={styles.highlightTitle}>You're in Control</Text>
                        <Text style={styles.highlightText}>
                            Manage your privacy settings anytime in your profile
                        </Text>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setShowFullPrivacy(!showFullPrivacy)}
            >
                <FileText size={20} color="#9261E5" />
                <Text style={styles.linkText}>
                    {showFullPrivacy ? 'Hide' : 'Read'} Full Privacy Policy
                </Text>
                <ChevronRight
                    size={20}
                    color="#9261E5"
                    style={{ transform: [{ rotate: showFullPrivacy ? '90deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {showFullPrivacy && (
                <ScrollView style={styles.policyTextContainer} nestedScrollEnabled={true}>
                    <Text style={styles.policyTextTitle}>Privacy Policy</Text>
                    <Text style={styles.policyText}>
                        Last Updated: January 2025{"\n\n"}

                        <Text style={styles.policyTextBold}>1. Information We Collect</Text>{"\n"}
                        We collect information you provide directly to us, such as when you create an account, participate in activities, or communicate with us. This includes:{"\n"}
                        • Account information (name, email, password){"\n"}
                        • Profile information (preferences, interests){"\n"}
                        • Activity participation data{"\n"}
                        • Communications and feedback{"\n\n"}

                        <Text style={styles.policyTextBold}>2. How We Use Your Information</Text>{"\n"}
                        We use the information we collect to:{"\n"}
                        • Provide and improve our services{"\n"}
                        • Personalize your experience with AI recommendations{"\n"}
                        • Connect you with other users for activities{"\n"}
                        • Send important updates and notifications{"\n"}
                        • Ensure platform safety and security{"\n\n"}

                        <Text style={styles.policyTextBold}>3. Information Sharing</Text>{"\n"}
                        We do not sell, trade, or rent your personal information to third parties. We may share information:{"\n"}
                        • With your consent{"\n"}
                        • To comply with legal obligations{"\n"}
                        • To protect rights and safety{"\n"}
                        • With service providers who assist our operations{"\n\n"}

                        <Text style={styles.policyTextBold}>4. Data Security</Text>{"\n"}
                        We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.{"\n\n"}

                        <Text style={styles.policyTextBold}>5. Your Rights</Text>{"\n"}
                        You have the right to:{"\n"}
                        • Access your personal information{"\n"}
                        • Correct inaccurate data{"\n"}
                        • Request deletion of your data{"\n"}
                        • Opt-out of certain communications{"\n"}
                        • Export your data{"\n\n"}

                        <Text style={styles.policyTextBold}>6. Contact Us</Text>{"\n"}
                        If you have questions about this Privacy Policy, please contact us at privacy@voxxyai.com
                    </Text>
                    <TouchableOpacity
                        style={styles.externalLinkButton}
                        onPress={() => Linking.openURL('https://www.heyvoxxy.com/#/privacy')}
                    >
                        <Text style={styles.externalLinkText}>View on Website</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedPrivacy(!acceptedPrivacy)}
            >
                <View style={styles.checkbox}>
                    {acceptedPrivacy ? (
                        <CheckCircle size={24} color="#9261E5" />
                    ) : (
                        <Circle size={24} color="#666" />
                    )}
                </View>
                <Text style={styles.checkboxText}>
                    I have read and accept the Privacy Policy
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const renderTermsStep = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.iconContainer}>
                <Users size={60} color="#9261E5" />
            </View>

            <Text style={styles.stepTitle}>Community Guidelines</Text>
            <Text style={styles.stepSubtitle}>
                Help us keep Voxxy safe and welcoming for everyone
            </Text>

            <View style={styles.guidelinesBox}>
                <Text style={styles.guidelineItem}>✓ Be respectful and kind to others</Text>
                <Text style={styles.guidelineItem}>✓ No harassment or bullying</Text>
                <Text style={styles.guidelineItem}>✓ Keep content appropriate for all users</Text>
                <Text style={styles.guidelineItem}>✓ Report violations to keep our community safe</Text>
            </View>

            <View style={styles.vibeCheckBox}>
                <Sparkles size={20} color="#9261E5" style={styles.vibeCheckIcon} />
                <Text style={styles.vibeCheckText}>
                    We don't tolerate hate speech or harassment. Keep it respectful, keep the good vibes flowing ✨
                </Text>
            </View>

            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => setShowFullTerms(!showFullTerms)}
            >
                <FileText size={20} color="#9261E5" />
                <Text style={styles.linkText}>
                    {showFullTerms ? 'Hide' : 'Read'} Full Terms of Service
                </Text>
                <ChevronRight
                    size={20}
                    color="#9261E5"
                    style={{ transform: [{ rotate: showFullTerms ? '90deg' : '0deg' }] }}
                />
            </TouchableOpacity>

            {showFullTerms && (
                <ScrollView style={styles.policyTextContainer} nestedScrollEnabled={true}>
                    <Text style={styles.policyTextTitle}>Terms of Service</Text>
                    <Text style={styles.policyText}>
                        Last Updated: January 2025{"\n\n"}

                        <Text style={styles.policyTextBold}>1. Acceptance of Terms</Text>{"\n"}
                        By using Voxxy, you agree to these Terms of Service and our Community Guidelines. If you do not agree, do not use our services.{"\n\n"}

                        <Text style={styles.policyTextBold}>2. User Accounts</Text>{"\n"}
                        • You must be at least 13 years old to use Voxxy{"\n"}
                        • You are responsible for maintaining account security{"\n"}
                        • You must provide accurate information{"\n"}
                        • One person per account{"\n\n"}

                        <Text style={styles.policyTextBold}>3. Prohibited Content and Behavior</Text>{"\n"}
                        Voxxy has a ZERO TOLERANCE policy for:{"\n"}
                        • Harassment, bullying, or threats{"\n"}
                        • Hate speech or discrimination{"\n"}
                        • Sexually explicit or violent content{"\n"}
                        • Spam, scams, or fraudulent activities{"\n"}
                        • Impersonation or false information{"\n"}
                        • Illegal activities or content{"\n\n"}

                        <Text style={styles.policyTextBold}>4. Content Moderation</Text>{"\n"}
                        • All content is subject to automated and manual review{"\n"}
                        • Violations result in immediate action{"\n"}
                        • First violation: Warning and content removal{"\n"}
                        • Severe/repeat violations: Permanent ban{"\n"}
                        • We cooperate with law enforcement when required{"\n\n"}

                        <Text style={styles.policyTextBold}>5. User Generated Content</Text>{"\n"}
                        • You retain ownership of your content{"\n"}
                        • You grant us license to use content for service operation{"\n"}
                        • You are responsible for your content{"\n"}
                        • We may remove content that violates these terms{"\n\n"}

                        <Text style={styles.policyTextBold}>6. Service Availability</Text>{"\n"}
                        • We strive for 24/7 availability but do not guarantee it{"\n"}
                        • We may modify or discontinue features{"\n"}
                        • We may suspend service for maintenance{"\n\n"}

                        <Text style={styles.policyTextBold}>7. Limitation of Liability</Text>{"\n"}
                        Voxxy is provided "as is" without warranties. We are not liable for indirect, incidental, or consequential damages.{"\n\n"}

                        <Text style={styles.policyTextBold}>8. Contact</Text>{"\n"}
                        For questions or appeals: support@voxxyai.com
                    </Text>
                    <TouchableOpacity
                        style={styles.externalLinkButton}
                        onPress={() => Linking.openURL('https://www.heyvoxxy.com/#terms')}
                    >
                        <Text style={styles.externalLinkText}>View on Website</Text>
                    </TouchableOpacity>
                </ScrollView>
            )}

            <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={() => setAcceptedTerms(!acceptedTerms)}
            >
                <View style={styles.checkbox}>
                    {acceptedTerms ? (
                        <CheckCircle size={24} color="#9261E5" />
                    ) : (
                        <Circle size={24} color="#666" />
                    )}
                </View>
                <Text style={styles.checkboxText}>
                    I accept the Terms of Service and Community Guidelines
                </Text>
            </TouchableOpacity>
        </Animated.View>
    );

    const toggleFood = (value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFoods(prev =>
            prev.includes(value)
                ? prev.filter(f => f !== value)
                : [...prev, value]
        );
    };

    const toggleDietary = (value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDietary(prev =>
            prev.includes(value)
                ? prev.filter(d => d !== value)
                : [...prev, value]
        );
    };

    const handleLocationSelect = (locationData) => {
        setUserLocation(locationData);
    };

    const renderWelcomeStep = () => (
        <Animated.View style={{ opacity: fadeAnim }}>
            <View style={styles.iconContainer}>
                <Sparkles size={48} color="#9261E5" />
            </View>

            <Text style={styles.stepTitle}>Complete Your Profile</Text>
            <Text style={styles.stepSubtitle}>
                Help us personalize your Voxxy experience (optional)
            </Text>

            {/* Location Section */}
            <View style={styles.profileSection}>
                <View style={styles.sectionHeader}>
                    <MapPin size={20} color="#4ECDC4" />
                    <Text style={styles.sectionTitle}>Your Location</Text>
                </View>
                <Text style={styles.sectionDesc}>Where do you want to explore?</Text>
                <View style={styles.locationContainer}>
                    <LocationPicker
                        onLocationSelect={handleLocationSelect}
                        currentLocation={userLocation}
                    />
                </View>
            </View>

            {/* Favorite Foods Section */}
            <View style={styles.profileSection}>
                <View style={styles.sectionHeader}>
                    <Pizza size={20} color="#FF6B6B" />
                    <Text style={styles.sectionTitle}>Favorite Foods</Text>
                </View>
                <Text style={styles.sectionDesc}>Select your favorite cuisines</Text>
                <View style={styles.chipsGrid}>
                    {FOOD_OPTIONS.map((option) => {
                        const isSelected = selectedFoods.includes(option.value);
                        const IconComponent = option.icon;

                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.chip,
                                    isSelected && [styles.chipSelected, { borderColor: option.color }]
                                ]}
                                onPress={() => toggleFood(option.value)}
                                activeOpacity={0.7}
                            >
                                <IconComponent
                                    color={isSelected ? option.color : '#B8A5C4'}
                                    size={18}
                                    strokeWidth={2}
                                />
                                <Text style={[
                                    styles.chipLabel,
                                    isSelected && styles.chipLabelSelected
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            {/* Dietary Restrictions Section */}
            <View style={styles.profileSection}>
                <View style={styles.sectionHeader}>
                    <Salad size={20} color="#90EE90" />
                    <Text style={styles.sectionTitle}>Dietary Preferences</Text>
                </View>
                <Text style={styles.sectionDesc}>Any restrictions or allergies?</Text>
                <View style={styles.chipsGrid}>
                    {DIETARY_OPTIONS.map((option) => {
                        const isSelected = selectedDietary.includes(option.value);

                        return (
                            <TouchableOpacity
                                key={option.value}
                                style={[
                                    styles.chip,
                                    isSelected && [styles.chipSelected, { borderColor: option.color }]
                                ]}
                                onPress={() => toggleDietary(option.value)}
                                activeOpacity={0.7}
                            >
                                <Text style={[
                                    styles.chipLabel,
                                    isSelected && styles.chipLabelSelected
                                ]}>
                                    {option.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>

            <View style={styles.skipBox}>
                <Text style={styles.skipText}>
                    You can always update these preferences later in your profile settings
                </Text>
            </View>
        </Animated.View>
    );

    const renderContent = () => {
        switch (currentStep) {
            case 0:
                return renderPrivacyStep();
            case 1:
                return renderTermsStep();
            case 2:
                return renderWelcomeStep();
            default:
                return null;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.progressContainer}>
                <View style={styles.progressBar}>
                    <Animated.View
                        style={[
                            styles.progressFill,
                            {
                                width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ['0%', '100%']
                                })
                            }
                        ]}
                    />
                </View>
                <Text style={styles.progressText}>
                    Step {currentStep + 1} of {TOTAL_STEPS}
                </Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Animated.View
                    style={{
                        transform: [{ translateY: slideAnim }]
                    }}
                >
                    {renderContent()}
                </Animated.View>
            </ScrollView>

            <View style={styles.buttonContainer}>
                {currentStep < 2 ? (
                    <TouchableOpacity
                        style={[
                            styles.primaryButton,
                            ((currentStep === 0 && !acceptedPrivacy) ||
                             (currentStep === 1 && !acceptedTerms)) && styles.disabledButton
                        ]}
                        onPress={handleNext}
                        disabled={(currentStep === 0 && !acceptedPrivacy) ||
                                 (currentStep === 1 && !acceptedTerms)}
                    >
                        <Text style={styles.primaryButtonText}>Continue</Text>
                        <ChevronRight size={20} color="#fff" />
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.primaryButton, isSubmitting && styles.disabledButton]}
                        onPress={handleComplete}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.primaryButtonText}>Get Started</Text>
                                <ChevronRight size={20} color="#fff" />
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    progressContainer: {
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 10,
    },
    progressBar: {
        height: 6,
        backgroundColor: 'rgba(146, 97, 229, 0.2)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#9261E5',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        color: colors.textSecondary,
        marginTop: 8,
        textAlign: 'center',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingBottom: 100,
    },
    iconContainer: {
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 30,
    },
    stepTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 12,
        fontFamily: 'Montserrat_700Bold',
    },
    stepSubtitle: {
        fontSize: 16,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 30,
        paddingHorizontal: 10,
    },
    highlightBox: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(78, 205, 196, 0.2)',
    },
    highlightItem: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    highlightContent: {
        flex: 1,
        marginLeft: 15,
    },
    highlightTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 4,
    },
    highlightText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    vibeCheckBox: {
        backgroundColor: 'rgba(146, 97, 229, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    vibeCheckIcon: {
        marginRight: 12,
        marginTop: 2,
    },
    vibeCheckText: {
        flex: 1,
        fontSize: 15,
        color: colors.textPrimary,
        lineHeight: 22,
    },
    guidelinesBox: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    guidelineItem: {
        fontSize: 15,
        color: colors.textPrimary,
        marginBottom: 12,
        lineHeight: 22,
    },
    readyBox: {
        backgroundColor: colors.cardBackground,
        borderRadius: 16,
        padding: 25,
        marginTop: 20,
        marginBottom: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.2)',
    },
    readyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginBottom: 10,
    },
    readyText: {
        fontSize: 15,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 24,
    },
    futureFeatureBox: {
        backgroundColor: 'rgba(146, 97, 229, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginTop: 10,
        alignItems: 'center',
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.3)',
    },
    futureFeatureText: {
        fontSize: 14,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    profileSection: {
        marginBottom: 30,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    sectionDesc: {
        fontSize: 14,
        color: colors.textSecondary,
        marginBottom: 12,
    },
    locationContainer: {
        marginTop: 8,
    },
    chipsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        paddingVertical: 8,
        paddingHorizontal: 14,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(64, 51, 71, 0.5)',
        gap: 6,
    },
    chipSelected: {
        backgroundColor: 'rgba(185, 84, 236, 0.15)',
        borderWidth: 2,
    },
    chipLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#B8A5C4',
    },
    chipLabelSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    skipBox: {
        backgroundColor: 'rgba(78, 205, 196, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: 'rgba(78, 205, 196, 0.2)',
    },
    skipText: {
        fontSize: 13,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
    },
    linkButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        marginBottom: 20,
    },
    linkText: {
        fontSize: 16,
        color: '#9261E5',
        fontWeight: '600',
        marginHorizontal: 8,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
    },
    checkbox: {
        marginRight: 12,
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
        paddingBottom: 30,
        borderTopWidth: 1,
        borderTopColor: colors.purple3,
    },
    primaryButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 16,
        borderRadius: 50,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    disabledButton: {
        opacity: 0.5,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
        marginRight: 8,
    },
    policyTextContainer: {
        maxHeight: 300,
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 15,
        marginTop: 10,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(146, 97, 229, 0.2)',
    },
    policyTextTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.textPrimary,
        marginBottom: 15,
    },
    policyText: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 22,
    },
    policyTextBold: {
        fontWeight: '600',
        color: colors.textPrimary,
    },
    externalLinkButton: {
        marginTop: 15,
        paddingVertical: 8,
        alignItems: 'center',
    },
    externalLinkText: {
        color: '#9261E5',
        fontSize: 14,
        fontWeight: '600',
        textDecorationLine: 'underline',
    },
});