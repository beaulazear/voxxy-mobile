import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, SafeAreaView, StatusBar } from 'react-native';
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
        question: 'What features are available in the mobile beta?',
        answer:
            'Right now the mobile beta offers read-only access to your plans—it’s a bare-minimum MVP letting you check your schedule and view your data. More interactive features and enhancements are coming soon!',
    },
    {
        question: 'How do I switch to the web app for full features?',
        answer:
            'Tap the "Open Web App" button at the bottom of this screen to access the full-featured web application and unlock premium tools.',
    },
    {
        question: 'Why do I need an account?',
        answer:
            'An account syncs your plans across devices, lets others join your boards, and saves your preferences. Sign up or log in on the web or mobile.',
    },
    {
        question: 'Is my data secure?',
        answer:
            'Yes. We use industry-standard encryption and security protocols to protect your information both in transit and at rest.',
    },
    {
        question: 'Where can I report bugs or request features?',
        answer:
            'Please use the Feedback link in Settings to send bug reports or feature suggestions. We appreciate your input!',
    },
];

const steps = [
    {
        title: 'Get Set Up',
        description: 'Download the mobile app and allow necessary permissions to get started.',
    },
    {
        title: 'View Your Data',
        description: 'Access your upcoming plans and schedule in this mobile beta.',
    },
    {
        title: 'Visit the Web App',
        description: 'Tap the "Open Web App" button for full-featured planning tools and settings.',
    },
    {
        title: 'Stay Tuned',
        description: 'Keep an eye out for exciting new mobile updates and enhancements.',
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
                    <TouchableOpacity style={styles.webButton} onPress={() => Linking.openURL('https://www.voxxyai.com')}>
                        <Text style={styles.webButtonText}>Open Web App</Text>
                    </TouchableOpacity>
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
    webButton: {
        marginTop: 20,
        backgroundColor: colors.primary,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    webButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});