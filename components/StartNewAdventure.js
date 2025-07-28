import React from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
} from 'react-native'
import { 
    ArrowLeft, 
    Coffee, 
    Sunset,
    Clock,
    Monitor,
    MapPin,
    Film,
    Users,
    Home
} from 'react-native-feather'

export default function StartNewAdventure({ onTripSelect, onBack }) {
    const adventures = [
        {
            name: 'Lets Eat',
            icon: Coffee,
            iconColor: '#FF6B6B',
            active: true,
            description: 'Schedule your next group meal together.'
        },
        {
            name: 'Night Out',
            icon: Sunset,
            iconColor: '#4ECDC4',
            active: true,
            description: 'Plan your perfect night out with friends.'
        },
        {
            name: 'Lets Meet',
            icon: Clock,
            iconColor: '#FFE66D',
            active: true,
            description: 'Find a time that works for everyone.'
        },
        {
            name: 'Game Night',
            icon: Monitor,
            iconColor: '#A8E6CF',
            active: true,
            description: 'Set up a memorable game night.'
        },
        {
            name: 'Find a Destination',
            icon: MapPin,
            iconColor: '#B8A5C4',
            active: false,
            description: 'Discover new travel destinations.'
        },
        {
            name: 'Movie Night',
            icon: Film,
            iconColor: '#FFB6C1',
            active: false,
            description: 'Plan your perfect movie night.'
        },
        {
            name: 'Kids Play Date',
            icon: Users,
            iconColor: '#DDA0DD',
            active: false,
            description: 'Coordinate a fun playdate for little ones.'
        },
        {
            name: 'Family Reunion',
            icon: Home,
            iconColor: '#87CEEB',
            active: false,
            description: 'Plan a family gathering.'
        },
    ]

    const handleSelection = (name) => {
        if (!adventures.find(a => a.name === name)?.active) return
        onTripSelect(name)
    }

    const renderActivityCard = (adventure, index) => {
        const { name, icon: IconComponent, iconColor, active, description } = adventure

        return (
            <TouchableOpacity
                key={name}
                style={[
                    styles.activityCard,
                    active ? styles.activeCard : styles.inactiveCard,
                    index % 2 === 0 ? styles.leftCard : styles.rightCard
                ]}
                onPress={() => handleSelection(name)}
                activeOpacity={active ? 0.7 : 1}
                disabled={!active}
            >
                <View style={[styles.iconContainer, { backgroundColor: `${iconColor}15` }]}>
                    <IconComponent 
                        stroke={active ? iconColor : '#888'} 
                        width={32} 
                        height={32} 
                        strokeWidth={2}
                    />
                </View>
                <Text style={[styles.activityName, !active && styles.inactiveName]}>
                    {name}
                </Text>
                <Text style={[styles.description, !active && styles.inactiveDescription]}>
                    {description}
                </Text>
                {!active && (
                    <View style={styles.comingSoonBadge}>
                        <Text style={styles.comingSoonText}>Coming Soon</Text>
                    </View>
                )}
            </TouchableOpacity>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <ArrowLeft stroke="#fff" width={20} height={20} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        New <Text style={styles.gradientText}>Voxxy</Text> Board
                    </Text>
                    <Text style={styles.subtitle}>Choose an activity to start planning!</Text>
                </View>
            </View>

            {/* Activity Grid */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.grid}>
                    {adventures.map((adventure, index) =>
                        renderActivityCard(adventure, index)
                    )}
                </View>
            </ScrollView>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingTop: 10,
        gap: 16,
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(139, 92, 246, 0.9)',
        borderWidth: 1,
        borderColor: '#8b5cf6',
        alignItems: 'center',
        justifyContent: 'center',
    },

    headerContent: {
        flex: 1,
        alignItems: 'center',
    },

    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
    },

    gradientText: {
        // Note: React Native doesn't support text gradients natively
        // You might want to use react-native-linear-gradient or similar
        color: '#B931D6',
    },

    subtitle: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
    },

    scrollContainer: {
        flex: 1,
    },

    scrollContent: {
        padding: 20,
        paddingTop: 0,
    },

    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16,
    },

    activityCard: {
        width: '47%', // Slightly less than 50% to account for gap
        backgroundColor: '#3a2a40',
        borderRadius: 16,
        padding: 24,
        alignItems: 'center',
        minHeight: 160,
        justifyContent: 'space-between',
        position: 'relative',
        borderWidth: 2,
    },

    activeCard: {
        borderColor: '#B931D6',
        opacity: 1,
        shadowColor: 'rgba(185, 49, 214, 0.3)',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 8,
        elevation: 8,
    },

    inactiveCard: {
        borderColor: 'rgba(64, 51, 71, 0.3)',
        opacity: 0.5,
    },

    leftCard: {
        // For any specific left card styling if needed
    },

    rightCard: {
        // For any specific right card styling if needed
    },

    iconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },

    emoji: {
        fontSize: 48,
        lineHeight: 56,
        marginBottom: 8,
        textAlign: 'center',
    },

    activityName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
        fontFamily: 'Montserrat_600SemiBold',
    },

    inactiveName: {
        color: '#888',
    },

    description: {
        fontSize: 12,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 16,
        flexShrink: 1,
    },

    inactiveDescription: {
        color: '#666',
    },

    comingSoonBadge: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 152, 0, 0.9)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 8,
    },

    comingSoonText: {
        fontSize: 9,
        fontWeight: '600',
        color: '#fff',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
})