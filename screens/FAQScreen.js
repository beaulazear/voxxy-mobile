import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, SafeAreaView, StatusBar } from 'react-native';
import { ArrowLeft, HelpCircle, BookOpen, ChevronDown, ChevronUp } from 'react-native-feather';
import { useNavigation } from '@react-navigation/native';

const colors = {
    background: '#201925',
    foreground: '#FAF9FA',
    muted: '#FAF9FA',
    primary: '#B03FD9',
    cardBackground: '#2C1E33',
    accentBar: '#9D60F8',
    lightBorder: '#333144',
    tabBackground: '#1B1A2E',
};

const faqs = [
    {
        question: 'How do I create a new activity?',
        answer:
            'Tap the "+" button on the home screen, choose your activity type (Restaurant, Game Night, Cocktails, or Meeting), fill in the details like name, date, and location, then invite participants by selecting contacts or entering email addresses.',
    },
    {
        question: 'How does the AI recommendation system work?',
        answer:
            'After creating an activity, participants submit their preferences through our chat interface. The AI analyzes all responses and generates personalized recommendations. You can then swipe through options, save favorites, and finalize your choice.',
    },
    {
        question: 'What are the different activity phases?',
        answer:
            'Activities have 4 phases: 1) Collecting - gathering participant preferences, 2) Voting - host reviews AI recommendations, 3) Finalized - selected option is confirmed, 4) Completed - activity has finished and can be rated.',
    },
    {
        question: 'How do I invite people to my activity?',
        answer:
            'When creating an activity, tap "Add Participants" to select from your contacts or manually enter email addresses. Invitees will receive notifications to join and submit their preferences.',
    },
    {
        question: 'Can I see my community and past activities?',
        answer:
            'Yes! Your profile shows completed activities and community members you\'ve connected with. Tap on community members to see your shared activity history, and tap on past activities to view details or leave reviews.',
    },
    {
        question: 'How do I submit preferences for an activity?',
        answer:
            'When invited to an activity, tap "Submit Your Preferences" and chat with our AI assistant. Share your preferences for food, atmosphere, budget, or availability - the more details you provide, the better the recommendations.',
    },
    {
        question: 'What happens after preferences are collected?',
        answer:
            'The activity host can generate AI recommendations based on all participant preferences. They can swipe through options, save favorites, and select the final choice. Once finalized, all participants can see the selected plan.',
    },
    {
        question: 'Can I flag or favorite activities?',
        answer:
            'Yes! You can favorite activities you enjoyed and flag inappropriate content. Your favorites help improve future recommendations, and flagged content is reviewed by our moderation team.',
    },
    {
        question: 'How do I share activity details?',
        answer:
            'Once an activity is finalized, tap "Share Final Plan Details" to send the information to participants or others. You can also share individual activities from your past activities list.',
    },
    {
        question: 'Where can I report bugs or request features?',
        answer:
            'Use the Feedback option in your Profile settings to send bug reports or feature suggestions. We appreciate your input in making Voxxy better!',
    },
];

const steps = [
    {
        title: 'Create Your First Activity',
        description: 'Tap the "+" button on the home screen, choose an activity type, and fill in the basic details like name, date, and location.',
    },
    {
        title: 'Invite Participants',
        description: 'Add friends by selecting from your contacts or entering email addresses. They\'ll receive invitations to join your activity.',
    },
    {
        title: 'Collect Preferences',
        description: 'Participants chat with the AI to share their preferences. The app collects everyone\'s input during the "Collecting" phase.',
    },
    {
        title: 'Review AI Recommendations',
        description: 'As the host, generate AI recommendations and swipe through personalized options based on participant preferences.',
    },
    {
        title: 'Finalize Your Plan',
        description: 'Select your favorite recommendation to finalize the activity. Share the final plan details with all participants.',
    },
    {
        title: 'Complete & Review',
        description: 'After your activity, mark it as completed and leave reviews to help improve future recommendations.',
    },
];

export default function FAQScreen() {
    const navigation = useNavigation();
    const [selectedTab, setSelectedTab] = useState('faq');
    const [expanded, setExpanded] = useState({});

    const toggleExpand = idx => {
        setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <SafeAreaView style={styles.safe}>
            <StatusBar barStyle="light-content" />
            
            {/* Header with back button */}
            <View style={styles.header}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Help & FAQ</Text>
                    <Text style={styles.headerSubtitle}>Get answers to common questions</Text>
                </View>
            </View>

            <View style={styles.container}>
                <View style={styles.tabContainer}>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'faq' && styles.activeTab,
                        ]}
                        onPress={() => setSelectedTab('faq')}
                    >
                        <View style={styles.tabContent}>
                            <HelpCircle 
                                stroke={selectedTab === 'faq' ? colors.foreground : colors.muted} 
                                width={16} 
                                height={16} 
                                strokeWidth={2}
                            />
                            <Text style={[styles.tabText, selectedTab === 'faq' && styles.activeTabText]}>
                                FAQs
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[
                            styles.tabButton,
                            selectedTab === 'steps' && styles.activeTab,
                        ]}
                        onPress={() => setSelectedTab('steps')}
                    >
                        <View style={styles.tabContent}>
                            <BookOpen 
                                stroke={selectedTab === 'steps' ? colors.foreground : colors.muted} 
                                width={16} 
                                height={16} 
                                strokeWidth={2}
                            />
                            <Text style={[styles.tabText, selectedTab === 'steps' && styles.activeTabText]}>
                                Guide
                            </Text>
                        </View>
                    </TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.scrollContainer}>
                    {selectedTab === 'faq' && faqs.map((item, idx) => (
                        <View key={idx} style={styles.card}>
                            <TouchableOpacity onPress={() => toggleExpand(idx)}>
                                <View style={styles.cardHeader}>
                                    <Text style={styles.question}>{item.question}</Text>
                                    <View style={styles.indicatorContainer}>
                                        {expanded[idx] ? (
                                            <ChevronUp stroke={colors.primary} width={20} height={20} strokeWidth={2} />
                                        ) : (
                                            <ChevronDown stroke={colors.primary} width={20} height={20} strokeWidth={2} />
                                        )}
                                    </View>
                                </View>
                            </TouchableOpacity>
                            {expanded[idx] && (
                                <Text style={styles.answer}>{item.answer}</Text>
                            )}
                        </View>
                    ))}

                    {selectedTab === 'steps' && steps.map((step, idx) => (
                        <View key={idx} style={styles.stepCard}>
                            <View style={styles.accentBar} />
                            <View style={styles.stepContent}>
                                <View style={styles.stepIcon}>
                                    <Text style={styles.stepIconText}>{idx + 1}</Text>
                                </View>
                                <View style={styles.stepTextGroup}>
                                    <Text style={styles.stepTitle}>{step.title}</Text>
                                    <Text style={styles.stepDescription}>{step.description}</Text>
                                </View>
                            </View>
                        </View>
                    ))}
                </ScrollView>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: colors.background,
    },
    
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 20,
        backgroundColor: colors.background,
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
        flex: 1,
        backgroundColor: colors.background,
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 20,
        marginHorizontal: 20,
        borderBottomWidth: 1,
        borderColor: colors.lightBorder,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
    },
    
    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activeTab: {
        borderBottomWidth: 3,
        borderColor: colors.primary,
    },
    tabText: {
        fontSize: 16,
        color: colors.muted,
    },
    activeTabText: {
        color: colors.foreground,
        fontWeight: '700',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 40,
    },
    card: {
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        padding: 15,
        marginBottom: 15,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    question: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.foreground,
        flex: 1,
    },
    indicatorContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    answer: {
        marginTop: 10,
        fontSize: 14,
        color: colors.muted,
        lineHeight: 20,
    },
    stepCard: {
        flexDirection: 'row',
        backgroundColor: colors.cardBackground,
        borderRadius: 12,
        marginBottom: 15,
        overflow: 'hidden',
    },
    accentBar: {
        width: 6,
        backgroundColor: colors.primary,
    },
    stepContent: {
        flex: 1,
        flexDirection: 'row',
        padding: 15,
        alignItems: 'flex-start',
    },
    stepIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    stepIconText: {
        color: '#fff',
        fontWeight: '700',
    },
    stepTextGroup: {
        flex: 1,
    },
    stepTitle: {
        color: colors.foreground,
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 4,
    },
    stepDescription: {
        color: colors.muted,
        fontSize: 14,
        lineHeight: 20,
    },
});