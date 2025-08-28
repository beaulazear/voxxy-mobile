import React from 'react';
import {
    ScrollView,
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    TouchableOpacity,
    Linking,
} from 'react-native';
import {
    FileText,
    UserCheck,
    Share2,
    Cookie,
    Shield,
    User,
    UserX,
    RefreshCw,
    MapPin,
    Smartphone,
    Globe,
    DollarSign,
    Clock,
    ChevronLeft,
} from 'lucide-react-native';
import colors from '../styles/Colors';

export default function PrivacyPolicyScreen({ navigation }) {
    const handleEmailPress = () => {
        Linking.openURL('mailto:team@voxxyai.com');
    };

    const PolicySection = ({ icon: Icon, title, children }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Icon size={24} color="#9261E5" />
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            <View style={styles.cardContent}>
                {children}
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.backButton}
                >
                    <ChevronLeft size={24} color={colors.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Privacy Policy</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.title}>Privacy Policy</Text>
                <Text style={styles.subtitle}>
                    Effective Date: 4/23/2025 | Last Updated: 8/23/2025
                </Text>

                <View style={styles.introWrapper}>
                    <View style={styles.bar} />
                    <Text style={styles.introText}>
                        At Voxxy, your privacy matters. This Privacy Policy explains how we collect,
                        use, and protect your information when you use our website and mobile app.
                    </Text>
                </View>

                <PolicySection icon={FileText} title="Information We Collect">
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Personal Info:</Text> Name, email address, and any optional profile details you provide.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Guest Users:</Text> We may collect your email if you participate in polls or activity boards without registering.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Product Interaction Data:</Text> How you interact with app features, including activities created, votes cast, preferences selected, and navigation patterns within the app.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Usage & Device Data:</Text> IP address, browser type, device type, operating system, pages visited, time spent, and actions taken in the app.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Location Data:</Text> City-level and precise location (when enabled) to recommend events and activities.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Contacts:</Text> When you grant permission, we access your device contacts solely to help you find friends already using Voxxy. We do not store your full contact list.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Diagnostics:</Text> Crash logs and performance data to improve app stability and fix technical issues. This data is collected anonymously.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Push Notifications:</Text> Push notification tokens for sending alerts and updates.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Group Planning Preferences:</Text> Responses to Voxxy quizzes, polls, votes, and feedback tools.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Activity Preferences:</Text> Event preferences used for AI recommendations.
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Communications:</Text> Feedback, support requests, and messages submitted through our contact forms.
                    </Text>
                </PolicySection>

                <PolicySection icon={UserCheck} title="How We Use Your Data">
                    <Text style={styles.bulletPoint}>• Provide and personalize your Voxxy experience</Text>
                    <Text style={styles.bulletPoint}>• Improve our product through analytics and feedback</Text>
                    <Text style={styles.bulletPoint}>• Send updates, surveys, and support messages</Text>
                    <Text style={styles.bulletPoint}>• Generate AI-driven recommendations for events and activities</Text>
                    <Text style={styles.bulletPoint}>• Prevent fraud or abuse</Text>
                    <Text style={[styles.sectionText, styles.emphasis]}>
                        We never sell your personal data.
                    </Text>
                </PolicySection>

                <PolicySection icon={Share2} title="Data Sharing">
                    <Text style={styles.sectionText}>
                        We only share your data with trusted third parties that help us operate, including:
                    </Text>
                    <Text style={styles.bulletPoint}>• AWS (Hosting providers)</Text>
                    <Text style={styles.bulletPoint}>• Google Places API (Venue information and location services)</Text>
                    <Text style={styles.bulletPoint}>• Mixpanel (Analytics tools)</Text>
                    <Text style={styles.bulletPoint}>• SendGrid (Email tools)</Text>
                    <Text style={styles.bulletPoint}>• OpenAI (AI-powered recommendations)</Text>
                    <Text style={styles.sectionText}>
                        When you use Voxxy's recommendation features, we send your activity preferences,
                        location, and group responses to OpenAI to generate personalized restaurant, bar,
                        and activity suggestions. Some anonymized data may be sent to OpenAI for processing.
                        These partners follow strict data protection practices.
                    </Text>
                </PolicySection>

                <PolicySection icon={Cookie} title="Cookies & Tracking">
                    <Text style={styles.sectionText}>
                        We use cookies and similar technologies to remember your preferences and understand
                        user behavior. You can manage cookie settings in your browser.
                    </Text>
                </PolicySection>

                <PolicySection icon={Shield} title="Data Security">
                    <Text style={styles.sectionText}>
                        We use encryption and secure storage to keep your data safe. While we do our best,
                        no internet-based service is 100% secure.
                    </Text>
                </PolicySection>

                <PolicySection icon={Clock} title="Data Retention">
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Personal account data:</Text> Retained until you request deletion
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Guest user emails:</Text> Deleted after 12 months if inactive
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Poll and planning data:</Text> Retained for 18 months for analytics
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Push notification tokens:</Text> Deleted after 90 days of inactivity
                    </Text>
                </PolicySection>

                <PolicySection icon={User} title="Your Rights">
                    <Text style={styles.bulletPoint}>• Access or update your data</Text>
                    <Text style={styles.bulletPoint}>• Request account deletion</Text>
                    <Text style={styles.bulletPoint}>• Opt out of marketing communications</Text>
                    <Text style={styles.sectionText}>
                        Contact us anytime at{' '}
                        <Text style={styles.link} onPress={handleEmailPress}>
                            team@voxxyai.com
                        </Text>{' '}
                        to exercise these rights.
                    </Text>
                </PolicySection>

                <PolicySection icon={UserX} title="Children's Privacy & Age Verification">
                    <Text style={styles.sectionText}>
                        Voxxy is not designed for children under 13. We verify age during registration
                        and may require parental consent where applicable. We don't knowingly collect
                        information from children. If we discover that a child under 13 has provided us
                        with personal information, we will delete it immediately. If you believe we have
                        collected information from a child under 13, please contact us.
                    </Text>
                </PolicySection>

                <PolicySection icon={MapPin} title="Location Data">
                    <Text style={styles.sectionText}>
                        When you create or respond to activities, we collect location information to
                        provide recommendations near your chosen meeting spot. This data is used solely
                        for providing our services and is not sold or used for advertising. You can
                        choose not to provide location data, but this may limit our recommendation features.
                    </Text>
                </PolicySection>

                <PolicySection icon={Smartphone} title="Mobile App Permissions">
                    <Text style={styles.sectionText}>
                        Our mobile app may request the following permissions:
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Push Notifications:</Text> To send you activity updates and reminders (optional)
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Camera/Photos:</Text> To upload profile pictures (optional)
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Contacts:</Text> To help you find friends already using Voxxy (optional)
                    </Text>
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Location:</Text> To provide venue recommendations near you (optional)
                    </Text>
                    <Text style={styles.sectionText}>
                        You can manage these permissions in your device settings at any time.
                    </Text>
                </PolicySection>

                <PolicySection icon={Shield} title="Data Linking & Anonymity">
                    <Text style={styles.sectionText}>
                        <Text style={styles.bold}>Data linked to your identity:</Text>
                    </Text>
                    <Text style={styles.bulletPoint}>• Name and email address</Text>
                    <Text style={styles.bulletPoint}>• Profile photos</Text>
                    <Text style={styles.bulletPoint}>• Location history and activity locations</Text>
                    <Text style={styles.bulletPoint}>• Activities created and participated in</Text>
                    <Text style={styles.bulletPoint}>• Votes, preferences, and interactions</Text>
                    <Text style={styles.bulletPoint}>• Comments and messages</Text>
                    
                    <Text style={[styles.sectionText, { marginTop: 10 }]}>
                        <Text style={styles.bold}>Data NOT linked to your identity:</Text>
                    </Text>
                    <Text style={styles.bulletPoint}>• Contacts (used only for friend matching, not stored)</Text>
                    <Text style={styles.bulletPoint}>• Crash logs and diagnostic data (collected anonymously)</Text>
                    
                    <Text style={[styles.sectionText, { marginTop: 10 }]}>
                        We do not use any of your data for tracking across other companies' apps or websites.
                    </Text>
                </PolicySection>

                <PolicySection icon={Globe} title="International Users">
                    <Text style={styles.sectionText}>
                        Voxxy is operated from the United States. If you use our services from outside
                        the US, your data will be transferred to and processed in the US. By using Voxxy,
                        you consent to this transfer.
                    </Text>
                </PolicySection>

                <PolicySection icon={DollarSign} title="California Privacy Rights">
                    <Text style={styles.sectionText}>
                        California residents have additional rights under the CCPA:
                    </Text>
                    <Text style={styles.bulletPoint}>• Right to know what personal information we collect</Text>
                    <Text style={styles.bulletPoint}>• Right to delete your personal information</Text>
                    <Text style={styles.bulletPoint}>• Right to opt-out of data sales (we don't sell your data)</Text>
                    <Text style={styles.bulletPoint}>• Right to non-discrimination for exercising your rights</Text>
                    <Text style={styles.sectionText}>
                        To exercise these rights, contact us at team@voxxyai.com.
                    </Text>
                </PolicySection>

                <PolicySection icon={RefreshCw} title="Policy Updates">
                    <Text style={styles.sectionText}>
                        We may update this policy over time. If we make material changes, we'll notify
                        you via email or on our site. Your continued use of Voxxy after changes means
                        you accept the updated policy.
                    </Text>
                </PolicySection>

                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={handleEmailPress}
                    >
                        <Text style={styles.contactButtonText}>
                            Questions? Contact team@voxxyai.com
                        </Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: colors.purple3,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    title: {
        fontSize: 32,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
        marginBottom: 10,
        color: colors.textPrimary,
    },
    subtitle: {
        color: colors.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    introWrapper: {
        flexDirection: 'row',
        marginBottom: 30,
    },
    bar: {
        width: 4,
        backgroundColor: '#9261E5',
        borderRadius: 2,
        marginRight: 15,
    },
    introText: {
        flex: 1,
        color: colors.textPrimary,
        fontSize: 16,
        lineHeight: 24,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 20,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3.84,
        elevation: 5,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
    },
    cardTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textPrimary,
        marginLeft: 12,
    },
    cardContent: {
        marginTop: 5,
    },
    sectionText: {
        color: colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 10,
    },
    bulletPoint: {
        color: colors.textPrimary,
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 8,
        paddingLeft: 10,
    },
    bold: {
        fontWeight: '600',
    },
    emphasis: {
        fontWeight: '600',
        marginTop: 10,
        fontSize: 16,
    },
    link: {
        color: '#9261E5',
        textDecorationLine: 'underline',
    },
    footer: {
        marginTop: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: colors.purple3,
    },
    contactButton: {
        backgroundColor: '#9261E5',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 10,
        alignItems: 'center',
    },
    contactButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});