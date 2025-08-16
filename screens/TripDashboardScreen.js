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
import { X } from 'lucide-react-native'
import StartNewAdventure from '../components/StartNewAdventure'
import LetsEatChatNew from '../components/LetsEatChatNew'
import CocktailsChatNew from '../components/CocktailsChatNew'
import GameNightChatNew from '../components/GameNightChatNew'
import { logger } from '../utils/logger';


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
        logger.debug(`🎯 Selected trip: ${tripName}`)

        switch (tripName) {
            case 'Food':
                setSelectedTrip('Restaurant')
                break
            case 'Drinks':
                setSelectedTrip('Night Out')
                break
            case 'Game Night':
                setSelectedTrip('Game Night')
                break
            case 'Destination':
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

            <LetsEatChatNew
                visible={selectedTrip === 'Restaurant'}
                onClose={handleFormClose}
            />

            <CocktailsChatNew
                visible={selectedTrip === 'Night Out'}
                onClose={handleFormClose}
            />

            <GameNightChatNew
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

})