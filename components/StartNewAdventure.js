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
    Droplet,
    Dices,
    MapPin,
    Film,
    Book,
    Edit,
    RotateCcw,
    Hamburger,
    Martini
} from 'lucide-react-native'

export default function StartNewAdventure({ onTripSelect, onBack }) {
    const adventures = [
        {
            name: 'Surprise Me!',
            icon: RotateCcw,
            iconColor: '#8b5cf6',
            active: true,
            isRandom: true
        },
        {
            name: 'Food',
            icon: Hamburger,
            iconColor: '#FF6B6B',
            active: true
        },
        {
            name: 'Drinks',
            icon: Martini,
            iconColor: '#4ECDC4',
            active: true
        },
        {
            name: 'Game Night',
            icon: Dices,
            iconColor: '#A8E6CF',
            active: true
        },
        {
            name: 'Destination',
            icon: MapPin,
            iconColor: '#B8A5C4',
            active: false
        },
        {
            name: 'Movie Night',
            icon: Film,
            iconColor: '#FFB6C1',
            active: false
        },
        {
            name: 'Book Club',
            icon: Book,
            iconColor: '#9B59B6',
            active: false
        },
        {
            name: 'Art',
            icon: Edit,
            iconColor: '#E74C3C',
            active: false
        },
    ]

    const handleSelection = (name) => {
        const adventure = adventures.find(a => a.name === name)
        if (!adventure?.active) return
        
        if (adventure.isRandom) {
            handleRandomSelection()
        } else {
            onTripSelect(name)
        }
    }

    const handleRandomSelection = () => {
        const activeAdventures = adventures.filter(adventure => adventure.active && !adventure.isRandom)
        if (activeAdventures.length > 0) {
            const randomIndex = Math.floor(Math.random() * activeAdventures.length)
            const randomAdventure = activeAdventures[randomIndex]
            onTripSelect(randomAdventure.name)
        }
    }

    const renderActivityCard = (adventure, index) => {
        const { name, icon: IconComponent, iconColor, active } = adventure

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
                        color={active ? iconColor : '#888'} 
                        size={32} 
                        strokeWidth={2}
                    />
                </View>
                <Text style={[styles.activityName, !active && styles.inactiveName]}>
                    {name}
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
                    <ArrowLeft color="#fff" size={20} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.title}>
                        Start New Activity
                    </Text>
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