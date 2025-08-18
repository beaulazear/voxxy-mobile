import React, { useState, useEffect, useRef, useContext } from 'react'
import {
    View,
    SafeAreaView,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native'
import StartNewAdventure from './StartNewAdventure'
import { UserContext } from '../context/UserContext'
import { logger } from '../utils/logger'

// Import just the content parts of the chat components
// We'll need to extract the core logic from the existing chat components
// For now, let's import them as-is and handle the modal issue

const { width: screenWidth } = Dimensions.get('window')

export default function UnifiedActivityCreation({ onClose, onActivityCreated }) {
    const [currentView, setCurrentView] = useState('dashboard')
    const slideAnim = useRef(new Animated.Value(0)).current
    const { user } = useContext(UserContext)

    // Reset when component mounts
    useEffect(() => {
        setCurrentView('dashboard')
        slideAnim.setValue(0)
    }, [])

    const slideToChat = () => {
        Animated.timing(slideAnim, {
            toValue: -screenWidth,
            duration: 300,
            useNativeDriver: true,
        }).start()
    }

    const slideToDashboard = () => {
        Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
        }).start(() => {
            setCurrentView('dashboard')
        })
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
            default:
                // Handle coming soon items
                return
        }

        if (viewName) {
            setCurrentView(viewName)
            slideToChat()
        }
    }

    const handleChatClose = (activityId) => {
        if (activityId) {
            // Activity created successfully
            onActivityCreated(activityId)
        } else {
            // User cancelled, go back to dashboard
            slideToDashboard()
        }
    }

    const handleBack = () => {
        if (currentView === 'dashboard') {
            onClose()
        } else {
            slideToDashboard()
        }
    }

    // For now, we'll render a message about the selected activity
    // In a full implementation, we'd extract the chat component logic
    const renderChatView = () => {
        // This is where we'd render the extracted chat component content
        // For demonstration, showing a placeholder
        return (
            <View style={styles.chatPlaceholder}>
                <Text style={styles.chatText}>
                    {currentView} Chat View
                </Text>
                <TouchableOpacity 
                    onPress={() => handleChatClose(null)}
                    style={styles.backButton}
                >
                    <Text style={styles.backButtonText}>Back</Text>
                </TouchableOpacity>
            </View>
        )
    }

    return (
        <SafeAreaView style={styles.container}>
            <Animated.View 
                style={[
                    styles.slidingContainer,
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

                {/* Chat View */}
                <View style={styles.viewWrapper}>
                    {renderChatView()}
                </View>
            </Animated.View>
        </SafeAreaView>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
    },
    slidingContainer: {
        flexDirection: 'row',
        width: screenWidth * 2,
        flex: 1,
    },
    viewWrapper: {
        width: screenWidth,
        flex: 1,
    },
    chatPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    chatText: {
        color: '#fff',
        fontSize: 24,
        marginBottom: 20,
    },
    backButton: {
        backgroundColor: '#CC31E8',
        paddingHorizontal: 30,
        paddingVertical: 15,
        borderRadius: 25,
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})