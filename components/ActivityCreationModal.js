import React, { useState, useEffect, useRef } from 'react'
import {
    Modal,
    View,
    SafeAreaView,
    Animated,
    StyleSheet,
    Dimensions,
    Alert,
} from 'react-native'
import StartNewAdventure from './StartNewAdventure'
import LetsEatChatNew from './LetsEatChatNew'
import CocktailsChatNew from './CocktailsChatNew'
import GameNightChatNew from './GameNightChatNew'
import { logger } from '../utils/logger'

const { width: screenWidth } = Dimensions.get('window')

export default function ActivityCreationModal({ visible, onClose, onActivityCreated }) {
    const [currentView, setCurrentView] = useState('dashboard') // 'dashboard' or activity type
    const slideAnim = useRef(new Animated.Value(0)).current
    
    // Reset to dashboard when modal opens
    useEffect(() => {
        if (visible) {
            setCurrentView('dashboard')
            slideAnim.setValue(0)
        }
    }, [visible])

    // Animate transitions between views
    const animateToView = (toView) => {
        Animated.timing(slideAnim, {
            toValue: toView === 'dashboard' ? 0 : -screenWidth,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }

    const handleTripSelect = (tripName) => {
        logger.debug(`🎯 Selected trip: ${tripName}`)
        
        let viewName = null
        switch (tripName) {
            case 'Food':
                viewName = 'Restaurant'
                break
            case 'Drinks':
                viewName = 'Night Out'
                break
            case 'Game Night':
                viewName = 'Game Night'
                break
            case 'Destination':
                Alert.alert(
                    'Coming Soon!',
                    'This feature is currently in development and will be available soon.',
                    [{ text: 'OK' }]
                )
                return
            default:
                Alert.alert('Feature Coming Soon', `${tripName} will be available soon!`)
                return
        }

        if (viewName) {
            setCurrentView(viewName)
            animateToView(viewName)
        }
    }

    const handleFormClose = (newActivityId) => {
        if (newActivityId) {
            // Activity was created successfully
            onClose()
            onActivityCreated(newActivityId)
        } else {
            // User cancelled, go back to dashboard
            setCurrentView('dashboard')
            animateToView('dashboard')
        }
    }

    const handleBack = () => {
        if (currentView === 'dashboard') {
            onClose()
        } else {
            setCurrentView('dashboard')
            animateToView('dashboard')
        }
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={false}
            onRequestClose={handleBack}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.viewContainer}>
                    <Animated.View 
                        style={[
                            styles.animatedContainer,
                            {
                                transform: [{ translateX: slideAnim }]
                            }
                        ]}
                    >
                        {/* Dashboard View */}
                        <View style={styles.viewWrapper}>
                            <StartNewAdventure
                                onTripSelect={handleTripSelect}
                                onBack={handleBack}
                            />
                        </View>

                        {/* Chat Views - render in place when selected */}
                        {currentView !== 'dashboard' && (
                            <View style={[styles.viewWrapper, styles.chatViewWrapper]}>
                                {currentView === 'Restaurant' && (
                                    <LetsEatChatNew
                                        visible={true}
                                        onClose={handleFormClose}
                                    />
                                )}
                                {currentView === 'Night Out' && (
                                    <CocktailsChatNew
                                        visible={true}
                                        onClose={handleFormClose}
                                    />
                                )}
                                {currentView === 'Game Night' && (
                                    <GameNightChatNew
                                        visible={true}
                                        onClose={handleFormClose}
                                    />
                                )}
                            </View>
                        )}
                    </Animated.View>
                </View>
            </SafeAreaView>
        </Modal>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    viewContainer: {
        flex: 1,
        overflow: 'hidden',
    },
    animatedContainer: {
        flexDirection: 'row',
        width: screenWidth * 2,
        flex: 1,
    },
    viewWrapper: {
        width: screenWidth,
        flex: 1,
    },
    chatViewWrapper: {
        position: 'absolute',
        left: screenWidth,
        top: 0,
        bottom: 0,
    },
})