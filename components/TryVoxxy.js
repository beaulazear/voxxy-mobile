// components/TryVoxxy.js

import React, { useState, useEffect, useRef } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    TextInput,
    TouchableOpacity,
    Modal,
    FlatList,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
    Alert,
    Animated,
    PanResponder,
    Dimensions,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { CheckCircle, X, Star, ChevronRight, Clock, MapPin, ArrowLeft } from 'react-native-feather'
import { API_URL } from '../config'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import TryVoxxyChat from './TryVoxxyChat'

const { width: screenWidth } = Dimensions.get('window')

// Swipeable Card Component
const SwipeableCard = ({ recommendation, onSwipeLeft, onSwipeRight }) => {
    const pan = useRef(new Animated.ValueXY()).current
    const scale = useRef(new Animated.Value(1)).current
    const rotate = useRef(new Animated.Value(0)).current

    const panResponder = PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (evt, gestureState) => {
            return Math.abs(gestureState.dx) > Math.abs(gestureState.dy) && Math.abs(gestureState.dx) > 10
        },
        onPanResponderGrant: () => {
            pan.setOffset({ x: pan.x._value, y: pan.y._value })
            Animated.spring(scale, { toValue: 1.05, useNativeDriver: false }).start()
        },
        onPanResponderMove: (evt, gestureState) => {
            pan.setValue({ x: gestureState.dx, y: gestureState.dy })
            const rotation = gestureState.dx / screenWidth * 30
            rotate.setValue(rotation)
        },
        onPanResponderRelease: (evt, gestureState) => {
            pan.flattenOffset()
            
            const threshold = screenWidth * 0.2
            
            if (gestureState.dx > threshold) {
                // Swipe right - like
                Animated.parallel([
                    Animated.timing(pan, {
                        toValue: { x: screenWidth + 100, y: gestureState.dy },
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(rotate, {
                        toValue: 30,
                        duration: 300,
                        useNativeDriver: false,
                    }),
                ]).start(() => onSwipeRight(recommendation))
            } else if (gestureState.dx < -threshold) {
                // Swipe left - pass
                Animated.parallel([
                    Animated.timing(pan, {
                        toValue: { x: -screenWidth - 100, y: gestureState.dy },
                        duration: 300,
                        useNativeDriver: false,
                    }),
                    Animated.timing(rotate, {
                        toValue: -30,
                        duration: 300,
                        useNativeDriver: false,  
                    }),
                ]).start(() => onSwipeLeft(recommendation))
            } else {
                // Snap back to center
                Animated.parallel([
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                    }),
                    Animated.spring(scale, {
                        toValue: 1,
                        useNativeDriver: false,
                    }),
                    Animated.spring(rotate, {
                        toValue: 0,
                        useNativeDriver: false,
                    }),
                ]).start()
            }
        },
    })

    const rotateInterpolate = rotate.interpolate({
        inputRange: [-30, 0, 30],
        outputRange: ['-30deg', '0deg', '30deg'],
    })

    return (
        <Animated.View
            style={[
                s.swipeCard,
                {
                    transform: [
                        { translateX: pan.x },
                        { translateY: pan.y },
                        { rotate: rotateInterpolate },
                        { scale: scale },
                    ],
                },
            ]}
            {...panResponder.panHandlers}
        >
            {/* Swipe Indicators */}
            <Animated.View 
                style={[
                    s.swipeIndicator, 
                    s.likeIndicator,
                    { opacity: pan.x.interpolate({ inputRange: [0, 75], outputRange: [0, 1] }) }
                ]}
            >
                <CheckCircle stroke="#28a745" width={32} height={32} strokeWidth={2.5} />
                <Text style={s.likeText}>LIKE</Text>
            </Animated.View>
            
            <Animated.View 
                style={[
                    s.swipeIndicator, 
                    s.passIndicator,
                    { opacity: pan.x.interpolate({ inputRange: [-75, 0], outputRange: [1, 0] }) }
                ]}
            >
                <X stroke="#e74c3c" width={32} height={32} strokeWidth={2.5} />
                <Text style={s.passText}>PASS</Text>
            </Animated.View>

            {/* Card Content */}
            <LinearGradient
                colors={['#3A2D44', '#2C1E33']}
                style={s.cardGradient}
            >
                <View style={s.cardHeader}>
                    <View style={s.cardTitleContainer}>
                        <Text style={s.cardTitle} numberOfLines={2}>{recommendation.name}</Text>
                    </View>
                    <Text style={s.cardPriceCorner}>{recommendation.price_range || '$'}</Text>
                </View>
                
                <View style={s.cardDetails}>
                    <ScrollView style={s.cardScrollView} showsVerticalScrollIndicator={false}>
                        <Text style={s.cardDescription}>
                            {recommendation.description || 'No description available'}
                        </Text>
                        
                        {recommendation.reason && (
                            <View style={s.cardReasonSection}>
                                <Text style={s.cardReasonTitle}>Why this place?</Text>
                                <Text style={s.cardReasonText}>{recommendation.reason}</Text>
                            </View>
                        )}
                    </ScrollView>
                    
                    <View style={s.cardFooter}>
                        <View style={s.cardDetailRow}>
                            <Clock stroke="#B8A5C4" width={16} height={16} />
                            <Text style={s.cardDetailText}>{recommendation.hours || 'Hours not available'}</Text>
                        </View>
                        {recommendation.address && (
                            <View style={s.cardDetailRow}>
                                <MapPin stroke="#B8A5C4" width={16} height={16} />
                                <Text style={s.cardDetailText} numberOfLines={1}>
                                    {recommendation.address}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </LinearGradient>
        </Animated.View>
    )
}

export default function TryVoxxy() {
    const navigation = useNavigation()
    
    // ── State ─────────────────────────────────────────────────────
    const [recs, setRecs] = useState([])
    const [loadingRecs, setLoadingRecs] = useState(true)

    const [chatVisible, setChatVisible] = useState(false)
    const [showLoader, setShowLoader] = useState(false)

    const [detailRec, setDetailRec] = useState(null)
    const [signupVisible, setSignupVisible] = useState(false)

    // Swipeable states
    const [currentCardIndex, setCurrentCardIndex] = useState(0)
    const [likedRecommendations, setLikedRecommendations] = useState([])
    const [passedRecommendations, setPassedRecommendations] = useState([])
    const [showingResults, setShowingResults] = useState(false)
    const [showSwipeModal, setShowSwipeModal] = useState(false)

    // ── Helper Functions ──────────────────────────────────────────
    const getOrCreateSessionToken = async () => {
        try {
            let token = await AsyncStorage.getItem('voxxy_token');
            if (!token) {
                token = `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                await AsyncStorage.setItem('voxxy_token', token);
            }
            return token;
        } catch (error) {
            return `mobile-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        }
    };

    // ── Effects ────────────────────────────────────────────────────
    useEffect(() => {
        const loadCachedRecommendations = async () => {
            try {
                const sessionToken = await getOrCreateSessionToken();
                const response = await fetch(`${API_URL}/try_voxxy_cached?session_token=${sessionToken}`);
                const data = await response.json();
                const recommendations = data.recommendations || [];
                setRecs(recommendations);
            } catch (error) {
                console.error('Failed to load cached recommendations:', error);
            } finally {
                setLoadingRecs(false);
            }
        };

        loadCachedRecommendations();
    }, [])


    // ── Handlers ───────────────────────────────────────────────────
    function openPlan() { 
        setChatVisible(true) 
    }
    
    // Swipe handlers
    const handleSwipeRight = (recommendation) => {
        setLikedRecommendations(prev => [...prev, recommendation])
        const nextIndex = currentCardIndex + 1
        if (nextIndex >= recs.length) {
            setShowingResults(true)
        } else {
            setCurrentCardIndex(nextIndex)
        }
    }

    const handleSwipeLeft = (recommendation) => {
        setPassedRecommendations(prev => [...prev, recommendation])
        const nextIndex = currentCardIndex + 1
        if (nextIndex >= recs.length) {
            setShowingResults(true)
        } else {
            setCurrentCardIndex(nextIndex)
        }
    }

    const openSwipeInterface = () => {
        if (recs.length === 0) return
        setCurrentCardIndex(0)
        setLikedRecommendations([])
        setPassedRecommendations([])
        setShowingResults(false)
        setShowSwipeModal(true)
    }

    const resetSwipe = () => {
        setCurrentCardIndex(0)
        setLikedRecommendations([])
        setPassedRecommendations([])
        setShowingResults(false)
    }

    // ── Render ─────────────────────────────────────────────────────
    return (
        <SafeAreaView style={s.container}>
            {/* Header with back button */}
            <View style={s.header}>
                <TouchableOpacity 
                    style={s.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <Text style={s.headerTitle}>Try Voxxy</Text>
                <View style={s.headerSpacer} />
            </View>
            
            <ScrollView contentContainerStyle={s.inner}>
                <View style={s.heroSection}>
                    <Text style={s.heroTitle}>Try <Text style={s.highlight}>Voxxy</Text></Text>
                    <Text style={s.sub}>
                        {recs.length
                            ? 'Your personalized recommendations are ready! Swipe to explore.'
                            : !loadingRecs
                                ? 'Get personalized restaurant recommendations in seconds'
                                : 'Loading your experience...'}
                    </Text>
                </View>

                {loadingRecs ? (
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" color="#667eea" />
                        <Text style={s.loadingText}>Setting up your experience...</Text>
                    </View>
                ) : recs.length > 0 ? (
                    <>
                        <View style={s.actionSection}>
                            <LinearGradient
                                colors={['#667eea', '#764ba2']}
                                style={s.primaryButton}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                            >
                                <TouchableOpacity style={s.buttonContent} onPress={openSwipeInterface}>
                                    <Text style={s.primaryButtonText}>View Recommendations</Text>
                                    <ChevronRight stroke="#fff" width={20} height={20} />
                                </TouchableOpacity>
                            </LinearGradient>
                            
                            <TouchableOpacity style={s.secondaryButton} onPress={openPlan}>
                                <Text style={s.secondaryButtonText}>Try Again</Text>
                            </TouchableOpacity>
                        </View>
                        
                        {/* Show liked recommendations if any */}
                        {likedRecommendations.length > 0 && (
                            <View style={s.likedSection}>
                                <View style={s.sectionHeader}>
                                    <Star stroke="#D4AF37" fill="#D4AF37" width={20} height={20} />
                                    <Text style={s.likedTitle}>Your Favorites</Text>
                                </View>
                                <FlatList
                                    data={likedRecommendations}
                                    keyExtractor={(_, i) => i.toString()}
                                    horizontal
                                    showsHorizontalScrollIndicator={false}
                                    scrollEnabled={true}
                                    renderItem={({ item }) => (
                                        <TouchableOpacity style={s.likedCard} onPress={() => setDetailRec(item)}>
                                            <LinearGradient
                                                colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.05)']}
                                                style={s.likedCardGradient}
                                            >
                                                <Text style={s.likedCardName} numberOfLines={1}>{item.name}</Text>
                                                <Text style={s.likedCardMeta}>{item.price_range}</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    )}
                                />
                            </View>
                        )}
                        
                        {/* Fallback list view */}
                        <View style={s.fallbackSection}>
                            <Text style={s.fallbackTitle}>All Recommendations</Text>
                            <FlatList
                                data={recs}
                                keyExtractor={(_, i) => i.toString()}
                                scrollEnabled={false}
                                renderItem={({ item }) => (
                                    <TouchableOpacity style={s.rec} onPress={() => setDetailRec(item)}>
                                        <Text style={s.recName}>{item.name}</Text>
                                        <Text style={s.recMeta}>{item.price_range}</Text>
                                    </TouchableOpacity>
                                )}
                            />
                        </View>
                    </>
                ) : (
                    !loadingRecs && (
                        <View style={s.emptyCard}>
                            <LinearGradient
                                colors={['rgba(102, 126, 234, 0.1)', 'rgba(118, 75, 162, 0.1)']}
                                style={s.emptyCardGradient}
                            >
                                <View style={s.iconCircle}>
                                    <Star stroke="#667eea" width={32} height={32} strokeWidth={2} />
                                </View>
                                <Text style={s.emptyTitle}>Discover Great Places</Text>
                                <Text style={s.emptySubtitle}>Tell us your preferences and get personalized recommendations</Text>
                                <LinearGradient
                                    colors={['#667eea', '#764ba2']}
                                    style={s.startButton}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <TouchableOpacity style={s.startButtonContent} onPress={openPlan}>
                                        <Text style={s.startButtonText}>Start Experience</Text>
                                    </TouchableOpacity>
                                </LinearGradient>
                            </LinearGradient>
                        </View>
                    )
                )}
            </ScrollView>

            {/* TryVoxxyChat Modal */}
            <TryVoxxyChat
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                onChatComplete={(newRecommendations) => {
                    setRecs(newRecommendations)
                    setChatVisible(false)
                    // Open swipe interface when recommendations are ready
                    setTimeout(() => {
                        setShowSwipeModal(true)
                    }, 500)
                }}
            />

            {/* Swipe Modal */}
            <Modal
                visible={showSwipeModal}
                animationType="slide"
                onRequestClose={() => setShowSwipeModal(false)}
            >
                <SafeAreaView style={s.swipeContainer}>
                    {showingResults ? (
                        // Results View
                        <ScrollView style={s.resultsContainer}>
                            <View style={s.resultsHeader}>
                                <TouchableOpacity 
                                    style={s.closeButton}
                                    onPress={() => setShowSwipeModal(false)}
                                >
                                    <X stroke="#fff" width={24} height={24} />
                                </TouchableOpacity>
                                <Text style={s.resultsTitle}>Your Results!</Text>
                                <View style={{ width: 40 }} />
                            </View>

                            {likedRecommendations.length > 0 ? (
                                <View style={s.resultsSection}>
                                    <LinearGradient
                                        colors={['rgba(212, 175, 55, 0.1)', 'rgba(212, 175, 55, 0.05)']}
                                        style={s.resultsStats}
                                    >
                                        <Star stroke="#D4AF37" fill="#D4AF37" width={28} height={28} />
                                        <Text style={s.resultsStatsText}>
                                            You liked {likedRecommendations.length} out of {recs.length} recommendations!
                                        </Text>
                                    </LinearGradient>

                                    <FlatList
                                        data={likedRecommendations}
                                        keyExtractor={(_, i) => i.toString()}
                                        scrollEnabled={false}
                                        renderItem={({ item }) => (
                                            <TouchableOpacity 
                                                style={s.resultItem}
                                                onPress={() => setDetailRec(item)}
                                            >
                                                <LinearGradient
                                                    colors={['rgba(102, 126, 234, 0.05)', 'rgba(118, 75, 162, 0.05)']}
                                                    style={s.resultGradient}
                                                >
                                                    <View style={s.resultContent}>
                                                        <Text style={s.resultName}>{item.name}</Text>
                                                        <Text style={s.resultMeta}>{item.price_range}</Text>
                                                        <Text style={s.resultDescription} numberOfLines={2}>
                                                            {item.description || 'No description available'}
                                                        </Text>
                                                    </View>
                                                    <ChevronRight stroke="#667eea" width={24} height={24} />
                                                </LinearGradient>
                                            </TouchableOpacity>
                                        )}
                                    />

                                    <View style={s.resultsActions}>
                                        <TouchableOpacity style={s.tryAgainButton} onPress={resetSwipe}>
                                            <Text style={s.tryAgainButtonText}>Try Different Preferences</Text>
                                        </TouchableOpacity>
                                        <LinearGradient
                                            colors={['#667eea', '#764ba2']}
                                            style={s.signupGradientButton}
                                            start={{ x: 0, y: 0 }}
                                            end={{ x: 1, y: 1 }}
                                        >
                                            <TouchableOpacity 
                                                style={s.signupButtonInner} 
                                                onPress={() => setSignupVisible(true)}
                                            >
                                                <Text style={s.signupButtonText}>Sign Up for Full Experience</Text>
                                            </TouchableOpacity>
                                        </LinearGradient>
                                    </View>
                                </View>
                            ) : (
                                <View style={s.noLikesContainer}>
                                    <Text style={s.noLikesTitle}>No likes this time!</Text>
                                    <Text style={s.noLikesText}>
                                        Maybe try adjusting your preferences or try again with different options.
                                    </Text>
                                    <TouchableOpacity style={s.tryAgainButton} onPress={resetSwipe}>
                                        <Text style={s.tryAgainButtonText}>🔄 Try Again</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </ScrollView>
                    ) : (
                        // Swipe Interface
                        <>
                            <View style={s.swipeHeader}>
                                <TouchableOpacity 
                                    style={s.closeButton}
                                    onPress={() => setShowSwipeModal(false)}
                                >
                                    <X stroke="#fff" width={24} height={24} />
                                </TouchableOpacity>
                                <Text style={s.swipeHeaderTitle}>Swipe Your Preferences</Text>
                                <View style={{ width: 40 }} />
                            </View>

                            <View style={s.swipeInstructions}>
                                <View style={s.instructionItem}>
                                    <View style={s.swipeLeftDemo}>
                                        <X color="#e74c3c" size={16} />
                                    </View>
                                    <Text style={s.instructionText}>Swipe left to pass</Text>
                                </View>
                                <View style={s.instructionItem}>
                                    <View style={s.swipeRightDemo}>
                                        <CheckCircle color="#28a745" size={16} />
                                    </View>
                                    <Text style={s.instructionText}>Swipe right to like</Text>
                                </View>
                            </View>

                            <View style={s.skipButtonContainer}>
                                <TouchableOpacity 
                                    style={s.skipButton}
                                    onPress={() => setShowingResults(true)}
                                >
                                    <Text style={s.skipButtonText}>Skip to Results</Text>
                                </TouchableOpacity>
                            </View>

                            <View style={s.cardStack}>
                                {recs[currentCardIndex] && (
                                    <SwipeableCard
                                        key={recs[currentCardIndex].id || currentCardIndex}
                                        recommendation={recs[currentCardIndex]}
                                        onSwipeLeft={handleSwipeLeft}
                                        onSwipeRight={handleSwipeRight}
                                    />
                                )}
                                
                                {/* Next card preview */}
                                {recs[currentCardIndex + 1] && (
                                    <View style={[s.swipeCard, s.nextCard]}>
                                        <LinearGradient
                                            colors={['#2C1E33', '#241730']}
                                            style={s.cardGradient}
                                        >
                                            <Text style={s.nextCardTitle}>
                                                {recs[currentCardIndex + 1].name}
                                            </Text>
                                        </LinearGradient>
                                    </View>
                                )}
                            </View>

                            <View style={s.swipeProgress}>
                                <Text style={s.progressText}>
                                    {currentCardIndex + 1} of {recs.length}
                                </Text>
                            </View>
                        </>
                    )}
                </SafeAreaView>
            </Modal>


            {/* Detail Modal */}
            {detailRec && (
                <Modal visible={!!detailRec} transparent animationType="fade">
                    <View style={s.modalBg}>
                        <View style={s.detailModal}>
                            <TouchableOpacity style={s.close} onPress={() => setDetailRec(null)}>
                                <Text style={s.closeTxt}>✖</Text>
                            </TouchableOpacity>
                            
                            <ScrollView>
                                <Text style={s.detailTitle}>{detailRec.name}</Text>
                                <Text style={s.detailMeta}>{detailRec.price_range}</Text>
                                
                                {detailRec.description && (
                                    <Text style={s.detailDescription}>{detailRec.description}</Text>
                                )}
                                
                                {detailRec.hours && (
                                    <Text style={s.detailInfo}>Hours: {detailRec.hours}</Text>
                                )}
                                
                                {detailRec.address && (
                                    <Text style={s.detailInfo}>📍 {detailRec.address}</Text>
                                )}
                            </ScrollView>
                        </View>
                    </View>
                </Modal>
            )}

            {/* Signup Modal */}
            {signupVisible && (
                <Modal visible={signupVisible} transparent animationType="fade">
                    <View style={s.modalBg}>
                        <View style={s.modal}>
                            <TouchableOpacity style={s.close} onPress={() => setSignupVisible(false)}>
                                <Text style={s.closeTxt}>✖</Text>
                            </TouchableOpacity>
                            
                            <Text style={s.signupTitle}>Sign Up for Voxxy!</Text>
                            <Text style={s.signupDescription}>
                                Join Voxxy to create activities, get personalized AI recommendations, 
                                and plan amazing experiences with friends.
                            </Text>
                            
                            <TouchableOpacity 
                                style={s.btn} 
                                onPress={() => {
                                    setSignupVisible(false)
                                    // Navigate to signup - you'll need to add navigation here
                                }}
                            >
                                <Text style={s.btnText}>Get Started</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>
            )}
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#0f0f14' 
    },
    inner: { 
        padding: 24, 
        paddingBottom: 0 
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    headerSpacer: {
        width: 44, // Same as back button for centering
    },
    heroSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    heroTitle: { 
        fontSize: 36, 
        fontWeight: '700', 
        color: '#fff', 
        textAlign: 'center',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 12,
    },
    highlight: { 
        color: '#667eea',
        textShadowColor: 'rgba(102, 126, 234, 0.5)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 8,
    },
    sub: { 
        fontSize: 16, 
        color: 'rgba(255, 255, 255, 0.7)', 
        textAlign: 'center',
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    actionSection: {
        marginVertical: 24,
        gap: 16,
    },
    primaryButton: {
        borderRadius: 16,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 8,
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        paddingHorizontal: 24,
        gap: 12,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    secondaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: 'center',
    },
    emptyCard: {
        marginTop: 40,
        borderRadius: 24,
        overflow: 'hidden',
    },
    emptyCardGradient: {
        padding: 32,
        alignItems: 'center',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    iconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        color: '#fff',
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
        paddingHorizontal: 20,
    },
    startButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    startButtonContent: {
        paddingVertical: 16,
        paddingHorizontal: 32,
    },
    startButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 100,
    },
    loadingText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        marginTop: 16,
    },
    btn: { backgroundColor: '#9d60f8', padding: 12, borderRadius: 8 },
    btnText: { color: '#fff', fontWeight: '600' },
    rec: { backgroundColor: '#1a1a27', padding: 16, borderRadius: 8, marginVertical: 6 },
    recName: { color: '#fff', fontWeight: '600', fontSize: 16 },
    recMeta: { color: '#bbb', fontSize: 14, marginTop: 4 },

    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center' },
    modal: { backgroundColor: '#1a1a27', padding: 20, width: '85%', borderRadius: 8 },

    close: { position: 'absolute', top: 10, right: 10 },
    closeTxt: { fontSize: 18, color: '#bbb' },

    label: { fontSize: 14, color: '#bbb', marginBottom: 4 },
    input: { backgroundColor: '#262635', color: '#fff', padding: 8, borderRadius: 4, marginBottom: 12 },

    smallBtn: { alignSelf: 'flex-start', padding: 6, borderRadius: 4, backgroundColor: '#444' },
    smallBtnActive: { backgroundColor: '#9d60f8' },
    smallBtnTxt: { color: '#fff' },

    chip: {
        borderWidth: 1, borderColor: '#9d60f8',
        borderRadius: 16, paddingVertical: 6,
        paddingHorizontal: 12, marginRight: 8,
    },
    chipSelected: { backgroundColor: '#9d60f8' },
    chipText: { color: '#9d60f8', fontSize: 14 },
    chipTextSelected: { color: '#fff' },

    // ── Swipe Interface Styles ─────────────────────────

    swipeContainer: {
        flex: 1,
        backgroundColor: '#0f0f14',
    },
    
    swipeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    
    swipeHeaderTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    
    closeButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    skipButtonContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    
    skipButton: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    
    skipButtonText: {
        color: '#9d60f8',
        fontSize: 14,
        fontWeight: '600',
    },
    
    swipeInstructions: {
        flexDirection: 'row',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 32,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        marginHorizontal: 24,
        marginTop: 8,
        borderRadius: 16,
        marginBottom: 24,
    },
    
    instructionItem: {
        alignItems: 'center',
        gap: 8,
    },
    
    swipeLeftDemo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(231, 76, 60, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    swipeRightDemo: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(40, 167, 69, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    instructionText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        fontWeight: '500',
    },
    
    cardStack: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    
    swipeCard: {
        width: screenWidth - 40,
        height: 520,
        borderRadius: 24,
        position: 'absolute',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.35,
        shadowRadius: 20,
        elevation: 12,
        backgroundColor: '#3A2D44',
    },
    
    nextCard: {
        opacity: 0.6,
        transform: [{ scale: 0.95 }],
        zIndex: -1,
    },
    
    cardGradient: {
        flex: 1,
        borderRadius: 24,
        padding: 20,
        overflow: 'hidden',
    },
    
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 20,
        minHeight: 60,
    },
    
    cardTitleContainer: {
        flex: 1,
        marginRight: 16,
    },
    
    cardTitle: {
        color: '#fff',
        fontSize: 26,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        lineHeight: 32,
    },
    
    cardPriceCorner: {
        color: '#D4AF37',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        backgroundColor: 'rgba(212, 175, 55, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    
    cardDetails: {
        flex: 1,
        justifyContent: 'space-between',
    },
    
    cardScrollView: {
        flex: 1,
        marginBottom: 16,
    },
    
    cardDescription: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
        fontWeight: '500',
    },
    
    cardReasonSection: {
        backgroundColor: 'rgba(102, 126, 234, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginTop: 16,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.2)',
    },
    
    cardReasonTitle: {
        color: '#667eea',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    
    cardReasonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 15,
        lineHeight: 22,
        fontWeight: '500',
    },
    
    cardFooter: {
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
        paddingTop: 16,
        gap: 12,
    },
    
    cardDetailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    
    cardDetailText: {
        color: '#B8A5C4',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    
    swipeIndicator: {
        position: 'absolute',
        top: 50,
        padding: 14,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        zIndex: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 6,
    },
    
    likeIndicator: {
        right: 24,
        backgroundColor: 'rgba(40, 167, 69, 0.95)',
    },
    
    passIndicator: {
        left: 24,
        backgroundColor: 'rgba(231, 76, 60, 0.95)',
    },
    
    likeText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    
    passText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        letterSpacing: 0.5,
    },
    
    swipeProgress: {
        paddingVertical: 20,
        alignItems: 'center',
    },
    
    progressText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        fontWeight: '500',
    },
    
    nextCardTitle: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 18,
        fontWeight: '600',
        textAlign: 'center',
        marginTop: 20,
    },

    // ── Results Styles ─────────────────────────────────

    resultsContainer: {
        flex: 1,
    },
    
    resultsHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    
    resultsTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    
    resultsSection: {
        padding: 20,
    },
    
    resultsStats: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
    },
    
    resultsStatsText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        flex: 1,
    },
    
    resultItem: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    
    resultGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(102, 126, 234, 0.15)',
    },
    
    resultContent: {
        flex: 1,
        marginRight: 12,
    },
    
    resultName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    
    resultMeta: {
        color: '#B8A5C4',
        fontSize: 14,
        marginBottom: 4,
    },
    
    resultDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        lineHeight: 18,
    },
    
    resultsActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 20,
    },
    
    tryAgainButton: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        paddingVertical: 20,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
    },
    
    tryAgainButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    
    signupGradientButton: {
        flex: 1,
        borderRadius: 14,
        shadowColor: '#667eea',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },
    
    signupButtonInner: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    
    signupButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    
    noLikesContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    
    noLikesTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    
    noLikesText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 32,
    },

    // ── Additional Main Screen Styles ──────────────────

    
    likedSection: {
        marginTop: 32,
        marginBottom: 24,
    },
    
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    
    likedTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    
    likedCard: {
        marginRight: 12,
        borderRadius: 16,
        overflow: 'hidden',
        width: 160,
    },
    
    likedCardGradient: {
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(212, 175, 55, 0.2)',
        height: 80,
        justifyContent: 'center',
    },
    
    likedCardName: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    
    likedCardMeta: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '600',
    },
    
    fallbackSection: {
        marginTop: 20,
    },
    
    fallbackTitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },

    // ── Chat Modal Styles ──────────────────────────────

    chatModal: {
        backgroundColor: '#1a1a27',
        height: '70%',
        width: '90%',
        borderRadius: 12,
        padding: 16,
        maxHeight: 500,
    },

    chatScroll: {
        flex: 1,
        marginBottom: 16,
    },

    chatContent: {
        paddingBottom: 16,
    },

    message: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        padding: 12,
        borderRadius: 12,
        marginBottom: 8,
        alignSelf: 'flex-start',
        maxWidth: '80%',
    },

    messageMe: {
        backgroundColor: '#9d60f8',
        alignSelf: 'flex-end',
    },

    messageText: {
        color: '#fff',
        fontSize: 14,
        lineHeight: 20,
    },

    messageTextMe: {
        color: '#fff',
    },

    chatInput: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        gap: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },

    chatTextInput: {
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        color: '#fff',
        padding: 12,
        borderRadius: 8,
        maxHeight: 80,
        fontSize: 14,
    },

    chatSendBtn: {
        backgroundColor: '#9d60f8',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
    },

    chatSendText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    loaderContainer: {
        alignItems: 'center',
        paddingVertical: 20,
    },

    loaderText: {
        color: '#fff',
        fontSize: 14,
        marginTop: 12,
    },

    // ── Options Selection Styles ──────────────────────

    optionsContainer: {
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },

    optionsTitle: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        marginBottom: 12,
        textAlign: 'center',
    },

    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        justifyContent: 'center',
    },

    optionButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        marginBottom: 8,
    },

    optionButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },

    debugText: {
        color: '#ff0000',
        fontSize: 12,
        textAlign: 'center',
        marginBottom: 8,
    },

    // ── Detail Modal Styles ────────────────────────────

    detailModal: {
        backgroundColor: '#1a1a27',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 12,
        padding: 20,
    },

    detailTitle: {
        color: '#fff',
        fontSize: 22,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
    },

    detailMeta: {
        color: '#D4AF37',
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 16,
    },

    detailDescription: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 16,
    },

    detailInfo: {
        color: '#B8A5C4',
        fontSize: 14,
        marginBottom: 8,
    },

    // ── Signup Modal Styles ────────────────────────────

    signupTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        textAlign: 'center',
        marginBottom: 12,
    },

    signupDescription: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center',
        marginBottom: 24,
    },
})