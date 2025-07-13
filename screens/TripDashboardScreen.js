import React, { useState, useContext, useEffect } from 'react'
import {
    View,
    Text,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    Modal,
    TouchableOpacity,
    Alert,
} from 'react-native'
import { UserContext } from '../context/UserContext'
import { useNavigation } from '@react-navigation/native'
import { X } from 'react-native-feather'
import StartNewAdventure from '../components/StartNewAdventure'
import LetsEatChat from '../components/LetsEatChat'
import CocktailsChat from '../components/CocktailsChat'
import GameNightChat from '../components/GameNightChat'
import LetsMeetChat from '../components/LetsMeetChat'

function MeetingForm({ visible, onClose }) {
    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="fullScreen"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Create Meeting Activity</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <X stroke="#fff" width={24} height={24} />
                    </TouchableOpacity>
                </View>
                <View style={styles.modalContent}>
                    <Text style={styles.placeholderText}>
                        LetsMeetForm Component Placeholder
                    </Text>
                    <Text style={styles.placeholderSubtext}>
                        This will be replaced with your actual LetsMeetForm component
                    </Text>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

function LoadingScreen() {
    return (
        <View style={styles.loadingContainer}>
            <Text style={styles.loadingTitle}>Loading User Data...</Text>
        </View>
    )
}

export default function TripDashboard() {
    const { user } = useContext(UserContext)
    const navigation = useNavigation()
    const [selectedTrip, setSelectedTrip] = useState(null)

    const handleTripSelect = (tripName) => {
        console.log(`🎯 Selected trip: ${tripName}`)

        switch (tripName) {
            case 'Lets Eat':
                setSelectedTrip('Restaurant')
                break
            case 'Lets Meet':
                setSelectedTrip('Meeting')
                break
            case 'Night Out':
                setSelectedTrip('Night Out')
                break
            case 'Game Night':
                setSelectedTrip('Game Night')
                break
            case 'Find a Destination':
                Alert.alert(
                    'Coming Soon!',
                    'This feature is currently in development and will be available soon.',
                    [{ text: 'OK' }]
                )
                break
            default:
                Alert.alert('Feature Coming Soon', `${tripName} will be available soon!`)
        }
    }

    const handleFormClose = (newActivityId) => {
        if (newActivityId) {
            setSelectedTrip(null)
            navigation.navigate('ActivityDetails', { activityId: newActivityId })
        } else {
            setSelectedTrip(null)
        }
    }

    const handleBack = () => {
        navigation.goBack()
    }

    if (!user) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" />
                <LoadingScreen />
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <StartNewAdventure
                onTripSelect={handleTripSelect}
                onBack={handleBack}
            />

            <LetsEatChat
                visible={selectedTrip === 'Restaurant'}
                onClose={handleFormClose}
            />

            <LetsMeetChat
                visible={selectedTrip === 'Meeting'}
                onClose={handleFormClose}
            />

            <CocktailsChat
                visible={selectedTrip === 'Night Out'}
                onClose={handleFormClose}
            />

            <GameNightChat
                visible={selectedTrip === 'Game Night'}
                onClose={handleFormClose}
            />
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#201925',
    },

    loadingTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: '#201925',
    },

    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(64, 51, 71, 0.3)',
    },

    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },

    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
    },

    modalContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    placeholderText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 16,
    },

    placeholderSubtext: {
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 20,
        fontStyle: 'italic',
    },
})