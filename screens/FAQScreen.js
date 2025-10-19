import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HelpCircle, BookOpen, ChevronDown, ChevronUp, Mail } from 'react-native-feather';
import { LinearGradient } from 'expo-linear-gradient';
import VoxxyFooter from '../components/VoxxyFooter';
import VoxxyLogo from '../assets/header.svg';
import ContactModal from '../components/ContactModal';

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
        question: 'How do I create an activity?',
        answer: 'Tap the "+" button, choose Restaurant or Bar, set location and time, then add friends or go solo.',
    },
    {
        question: 'What are profile preferences?',
        answer: 'Profile preferences are your saved dining preferences (cuisine, atmosphere, budget, etc.) that save you time. Set them once in your Profile, and use them instantly in any group activity.',
    },
    {
        question: 'How does Voxxy find recommendations?',
        answer: 'Use your saved profile preferences for quick searches, or chat custom preferences for specific occasions. In groups, everyone\'s preferences combine to find places you\'ll all love.',
    },
    {
        question: 'Can I use Voxxy solo or with friends?',
        answer: 'Both! Go solo to find personal favorites, or invite friends to find places everyone will love based on everyone\'s preferences.',
    },
    {
        question: 'How do I save favorite places?',
        answer: 'Tap the heart icon on any venue to save it. View all saved favorites in your Favorites tab.',
    },
    {
        question: 'Where can I see my past activities?',
        answer: 'Check your Profile to view completed activities and your dining history.',
    },
    {
        question: 'How do I report bugs or suggest features?',
        answer: 'Use the Feedback option in Profile settings.',
    },
];

const steps = [
    {
        title: 'Set Up Your Profile',
        description: 'Save your dining preferences in your Profile to use them instantly in any activity.',
    },
    {
        title: 'Create Activity',
        description: 'Tap "+" and choose Restaurant or Bar. Set your location and time.',
    },
    {
        title: 'Add Friends or Go Solo',
        description: 'Invite friends for group planning, or go solo to find personal favorites.',
    },
    {
        title: 'Submit Preferences',
        description: 'Use your saved profile preferences for quick submission, or chat custom preferences for specific occasions.',
    },
    {
        title: 'Browse Recommendations',
        description: 'Review matched venues with details, hours, and prices. In groups, see venues that match everyone.',
    },
    {
        title: 'Pick Your Spot',
        description: 'Select a venue, share with friends, and save it to favorites.',
    }
];

export default function FAQScreen() {
    const [selectedTab, setSelectedTab] = useState('faq');
    const [expanded, setExpanded] = useState({});
    const [showContactModal, setShowContactModal] = useState(false);

    const toggleExpand = idx => {
        setExpanded(prev => ({ ...prev, [idx]: !prev[idx] }));
    };

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.headerContainer}>
                <View style={styles.header}>
                    <View style={styles.logoContainer}>
                        <View style={styles.logoGlow}>
                            <VoxxyLogo height={36} width={120} />
                        </View>
                    </View>
                    <TouchableOpacity
                        style={styles.contactButton}
                        onPress={() => setShowContactModal(true)}
                        activeOpacity={0.7}
                    >
                        <Mail color="#fff" size={20} strokeWidth={2} />
                    </TouchableOpacity>
                </View>
                <LinearGradient
                    colors={['#B954EC', '#667eea', '#B954EC']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.headerBorder}
                />
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
                                FAQ
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
                                Quick Start
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

            <VoxxyFooter />

            {/* Contact Modal */}
            <ContactModal
                visible={showContactModal}
                onClose={() => setShowContactModal(false)}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#201925',
    },

    headerContainer: {
        backgroundColor: '#201925',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 60,
        paddingHorizontal: 20,
        backgroundColor: '#201925',
    },

    logoContainer: {
        justifyContent: 'center',
        alignItems: 'flex-start',
    },

    contactButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(204, 49, 232, 0.3)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.5)',
    },

    logoGlow: {
        shadowColor: '#9f2fce',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.6,
        shadowRadius: 12,
        elevation: 12,
    },

    headerBorder: {
        height: 2,
        shadowColor: '#B954EC',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
        elevation: 8,
    },

    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    tabContainer: {
        flexDirection: 'row',
        marginTop: 16,
        marginHorizontal: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 4,
    },
    tabButton: {
        flex: 1,
        paddingVertical: 10,
        alignItems: 'center',
        borderRadius: 8,
    },

    tabContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    activeTab: {
        backgroundColor: 'rgba(146, 97, 229, 0.2)',
    },
    tabText: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.6)',
        fontWeight: '600',
    },
    activeTabText: {
        color: '#fff',
        fontWeight: '700',
    },
    scrollContainer: {
        padding: 20,
        paddingBottom: 120,
    },
    card: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 18,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.15)',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    question: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        flex: 1,
        fontFamily: 'Montserrat_700Bold',
    },
    indicatorContainer: {
        width: 28,
        height: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 12,
        backgroundColor: 'rgba(146, 97, 229, 0.15)',
        borderRadius: 14,
    },
    answer: {
        marginTop: 12,
        fontSize: 14,
        color: '#B8A5C4',
        lineHeight: 20,
        fontWeight: '500',
    },
    stepCard: {
        flexDirection: 'row',
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        marginBottom: 12,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.15)',
    },
    accentBar: {
        width: 4,
        backgroundColor: '#9261E5',
    },
    stepContent: {
        flex: 1,
        flexDirection: 'row',
        padding: 18,
        alignItems: 'flex-start',
    },
    stepIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(146, 97, 229, 0.2)',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        borderWidth: 2,
        borderColor: '#9261E5',
    },
    stepIconText: {
        color: '#9261E5',
        fontWeight: '700',
        fontSize: 16,
        fontFamily: 'Montserrat_700Bold',
    },
    stepTextGroup: {
        flex: 1,
    },
    stepTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 6,
        fontFamily: 'Montserrat_700Bold',
    },
    stepDescription: {
        color: '#B8A5C4',
        fontSize: 14,
        lineHeight: 20,
        fontWeight: '500',
    },
});