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
        question: 'How do I find the perfect bar or restaurant?',
        answer:
            'Tap the "+" button on the home screen, choose between Restaurant or Bar, select your location and preferred time. You can either invite friends to collaborate on finding the perfect spot, or use Voxxy solo to discover your personal favorites.',
    },
    {
        question: 'How does Voxxy find personalized recommendations?',
        answer:
            'After setting up your outing, you and any invited friends share preferences through a quick chat. Voxxy analyzes everyone\'s input - dietary needs, atmosphere preferences, budget - then searches real venues near you to generate perfectly matched recommendations.',
    },
    {
        question: 'What are the different phases of planning?',
        answer:
            'Your plans have 4 phases: 1) Collecting - gathering everyone\'s preferences, 2) Reviewing - browsing through Voxxy\'s personalized recommendations, 3) Finalized - your selected venue is confirmed, 4) Completed - after your visit, you can rate and save favorites.',
    },
    {
        question: 'Can I use Voxxy by myself or with friends?',
        answer:
            'Both! Use Voxxy solo to discover personal favorite spots based on your preferences alone, or invite friends by selecting contacts or entering emails. When planning with others, everyone submits preferences and Voxxy finds places everyone will love.',
    },
    {
        question: 'How do I track my favorite spots?',
        answer:
            'Your profile saves all your dining and drinking history. View past visits, save your favorite venues for future reference, and see which friends you\'ve gone out with. You can also tap on any past outing to leave reviews or revisit details.',
    },
    {
        question: 'What preferences can I share with Voxxy?',
        answer:
            'When finding a restaurant or bar, share any preferences that matter: cuisine types, dietary restrictions, atmosphere (romantic, lively, LGBTQ+ friendly), budget, drink preferences, or any special requests. The more specific you are, the better Voxxy\'s recommendations.',
    },
    {
        question: 'How do I choose from Voxxy\'s recommendations?',
        answer:
            'After preferences are submitted, Voxxy generates personalized venue recommendations. Browse through detailed options with hours, prices, and descriptions. Save favorites, compare choices, then select your final pick. Everyone invited can see the final selection.',
    },
    {
        question: 'Can I save and share my favorite venues?',
        answer:
            'Yes! Save venues you love to your favorites for easy access later. Share final plans with friends via text or social media. Your saved favorites also help Voxxy learn your preferences for even better future recommendations.',
    },
    {
        question: 'What makes Voxxy different from other apps?',
        answer:
            'Voxxy is the only app that combines group preference matching with intelligent venue discovery. Whether finding a compromise for a group or discovering your perfect personal spot, Voxxy considers everyone\'s needs to find places you\'ll actually love.',
    },
    {
        question: 'Where can I report bugs or request features?',
        answer:
            'Use the Feedback option in your Profile settings to send bug reports or feature suggestions. We appreciate your input in making Voxxy better!',
    },
];

const steps = [
    {
        title: 'Start Your Search',
        description: 'Tap the "+" button and choose between finding a Restaurant or Bar. Select your location and preferred time - whether it\'s dinner tonight or drinks this weekend.',
    },
    {
        title: 'Go Solo or Invite Friends',
        description: 'Use Voxxy solo to discover your personal favorite spots, or invite friends to find places everyone will love. Add participants from contacts or enter their email addresses.',
    },
    {
        title: 'Share Your Preferences',
        description: 'Chat with Voxxy about what you\'re looking for - cuisine type, atmosphere, dietary needs, budget, or any special requests. Friends do the same if you\'ve invited them.',
    },
    {
        title: 'Browse Personalized Recommendations',
        description: 'Voxxy searches real venues near you and generates perfectly matched recommendations with hours, prices, and descriptions. Save favorites as you browse.',
    },
    {
        title: 'Pick Your Spot & Go!',
        description: 'Select your favorite venue to finalize the plan. Share details with friends, save to your favorites for next time, and enjoy your perfectly matched outing!',
    }
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