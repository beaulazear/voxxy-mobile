// components/TryVoxxy.js

import React, { useState, useEffect } from 'react'
import {
    SafeAreaView,
    View,
    Text,
    TouchableOpacity,
    Modal,
    FlatList,
    ScrollView,
    ActivityIndicator,
    StyleSheet,
} from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'
import { ChevronRight, Clock, MapPin, ArrowLeft, Coffee } from 'react-native-feather'
import { API_URL } from '../config'
import { useNavigation } from '@react-navigation/native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import TryVoxxyChat from './TryVoxxyChat'

export default function TryVoxxy() {
    const navigation = useNavigation()
    
    // ── State ─────────────────────────────────────────────────────
    const [recs, setRecs] = useState([])
    const [loadingRecs, setLoadingRecs] = useState(true)
    const [chatVisible, setChatVisible] = useState(false)
    const [showRecommendations, setShowRecommendations] = useState(false)
    const [detailRec, setDetailRec] = useState(null)

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
        let isMounted = true;
        
        const loadCachedRecommendations = async () => {
            try {
                const sessionToken = await getOrCreateSessionToken();
                
                // Add proper headers
                const response = await fetch(`${API_URL}/try_voxxy_cached`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Session-Token': sessionToken
                    }
                });
                
                if (!response.ok) {
                    console.warn('Failed to load cached recommendations:', response.status);
                    return;
                }
                
                const data = await response.json();
                
                // Only update state if component is still mounted
                if (isMounted) {
                    const recommendations = data.recommendations || [];
                    setRecs(recommendations);
                    
                    // If we have cached recommendations, show them
                    if (recommendations.length > 0) {
                        setShowRecommendations(true);
                    }
                }
            } catch (error) {
                console.error('Failed to load cached recommendations:', error);
            } finally {
                if (isMounted) {
                    setLoadingRecs(false);
                }
            }
        };

        loadCachedRecommendations();
        
        // Cleanup function
        return () => {
            isMounted = false;
        };
    }, [])

    // ── Handlers ───────────────────────────────────────────────────
    function openPlan() { 
        setChatVisible(true) 
    }

    const renderRecommendationItem = ({ item }) => (
        <TouchableOpacity 
            style={s.recCard}
            onPress={() => setDetailRec(item)}
            activeOpacity={0.7}
        >
            <LinearGradient
                colors={['rgba(204, 49, 232, 0.05)', 'rgba(118, 75, 162, 0.05)']}
                style={s.recCardGradient}
            >
                <View style={s.recCardContent}>
                    <View style={s.recCardHeader}>
                        <Text style={s.recCardName} numberOfLines={1}>{item.name}</Text>
                        <Text style={s.recCardPrice}>{item.price_range || '$'}</Text>
                    </View>
                    {item.description && (
                        <Text style={s.recCardDescription} numberOfLines={2}>
                            {item.description}
                        </Text>
                    )}
                    <View style={s.recCardFooter}>
                        {item.address && (
                            <View style={s.recCardInfo}>
                                <MapPin stroke="#B8A5C4" width={14} height={14} />
                                <Text style={s.recCardInfoText} numberOfLines={1}>
                                    {item.address}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <ChevronRight stroke="#cc31e8" width={20} height={20} />
            </LinearGradient>
        </TouchableOpacity>
    )

    // ── Render ─────────────────────────────────────────────────────
    if (showRecommendations && recs.length > 0) {
        return (
            <SafeAreaView style={s.container}>
                {/* Header with back button and title */}
                <View style={s.header}>
                    <TouchableOpacity 
                        style={s.backButton}
                        onPress={() => navigation.goBack()}
                        activeOpacity={0.7}
                    >
                        <ArrowLeft stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={s.headerTitle}>Your Recommendations</Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Recommendations List */}
                <FlatList
                    data={recs}
                    keyExtractor={(_, i) => i.toString()}
                    renderItem={renderRecommendationItem}
                    contentContainerStyle={s.listContent}
                    showsVerticalScrollIndicator={false}
                />

                {/* CTA Signup Button */}
                <View style={s.ctaContainer}>
                    <TouchableOpacity 
                        style={s.ctaButton}
                        onPress={() => navigation.navigate('SignUp')}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={['#cc31e8', '#9b1dbd']}
                            style={s.ctaGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <Text style={s.ctaText}>Create your Voxxy account ✨</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>

                {/* Detail Modal - moved here so it's available when showing recommendations */}
                {detailRec && (
                    <Modal visible={!!detailRec} transparent animationType="fade">
                        <View style={s.modalBg}>
                            <View style={s.detailModal}>
                                <TouchableOpacity style={s.close} onPress={() => setDetailRec(null)}>
                                    <Text style={s.closeTxt}>✖</Text>
                                </TouchableOpacity>
                                
                                <ScrollView showsVerticalScrollIndicator={false}>
                                    <Text style={s.detailTitle}>{detailRec.name}</Text>
                                    <Text style={s.detailMeta}>{detailRec.price_range}</Text>
                                    
                                    {detailRec.description && (
                                        <Text style={s.detailDescription}>{detailRec.description}</Text>
                                    )}

                                    {detailRec.reason && (
                                        <View style={s.detailReasonSection}>
                                            <Text style={s.detailReasonTitle}>Why we picked this</Text>
                                            <Text style={s.detailReasonText}>{detailRec.reason}</Text>
                                        </View>
                                    )}
                                    
                                    {detailRec.hours && (
                                        <View style={s.detailInfoRow}>
                                            <Clock stroke="#B8A5C4" width={16} height={16} />
                                            <Text style={s.detailInfo}>{detailRec.hours}</Text>
                                        </View>
                                    )}
                                    
                                    {detailRec.address && (
                                        <View style={s.detailInfoRow}>
                                            <MapPin stroke="#B8A5C4" width={16} height={16} />
                                            <Text style={s.detailInfo}>{detailRec.address}</Text>
                                        </View>
                                    )}
                                </ScrollView>
                            </View>
                        </View>
                    </Modal>
                )}
            </SafeAreaView>
        )
    }

    return (
        <SafeAreaView style={s.container}>
            {/* Header with back button and title */}
            <View style={s.mainHeader}>
                <TouchableOpacity 
                    style={s.headerBackButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                </TouchableOpacity>
                <Text style={s.mainHeaderTitle}>Try Voxxy</Text>
                <View style={{ width: 40 }} />
            </View>
            
            <ScrollView contentContainerStyle={s.inner} showsVerticalScrollIndicator={false}>

                {loadingRecs ? (
                    <View style={s.loadingContainer}>
                        <ActivityIndicator size="large" color="#cc31e8" />
                        <Text style={s.loadingText}>Setting up your experience...</Text>
                    </View>
                ) : recs.length > 0 ? (
                    // If we have cached recommendations, show a button to view them
                    <TouchableOpacity 
                        style={s.startNewActivityCard}
                        onPress={() => setShowRecommendations(true)}
                        activeOpacity={0.8}
                    >
                        <View style={s.startNewActivityOutline}>
                            <LinearGradient
                                colors={['rgba(204, 49, 232, 0.1)', 'rgba(144, 81, 225, 0.05)']}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                                style={s.startNewActivityGradient}
                            >
                                <View style={s.startNewActivityContent}>
                                    <View style={s.startNewActivityIconContainer}>
                                        <Coffee stroke="#cc31e8" width={32} height={32} strokeWidth={2.5} />
                                    </View>
                                    <Text style={s.startNewActivityTitle}>View Your Recommendations</Text>
                                    <Text style={s.startNewActivitySubtitle}>You have {recs.length} restaurant recommendations ready</Text>
                                    <View style={s.readyToVibeContainer}>
                                        <Text style={s.readyToVibeText}>View now →</Text>
                                    </View>
                                </View>
                            </LinearGradient>
                        </View>
                    </TouchableOpacity>
                ) : (
                    !chatVisible && (
                        <TouchableOpacity 
                            style={s.startNewActivityCard}
                            onPress={openPlan}
                            activeOpacity={0.8}
                        >
                            <View style={s.startNewActivityOutline}>
                                <LinearGradient
                                    colors={['rgba(204, 49, 232, 0.1)', 'rgba(144, 81, 225, 0.05)']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={s.startNewActivityGradient}
                                >
                                    <View style={s.startNewActivityContent}>
                                        <View style={s.startNewActivityIconContainer}>
                                            <Coffee stroke="#cc31e8" width={32} height={32} strokeWidth={2.5} />
                                        </View>
                                        <Text style={s.startNewActivityTitle}>Find Your Next Spot</Text>
                                        <Text style={s.startNewActivitySubtitle}>Get instant restaurant recommendations tailored to your taste</Text>
                                        <View style={s.readyToVibeContainer}>
                                            <Text style={s.readyToVibeText}>Let's eat! →</Text>
                                        </View>
                                    </View>
                                </LinearGradient>
                            </View>
                        </TouchableOpacity>
                    )
                )}
            </ScrollView>

            {/* TryVoxxyChat Modal */}
            <TryVoxxyChat
                visible={chatVisible}
                onClose={() => setChatVisible(false)}
                onChatComplete={(newRecommendations) => {
                    setRecs(newRecommendations)
                    // Wait for the success animation to complete before closing modal
                    setTimeout(() => {
                        setChatVisible(false)
                        // Show recommendations after modal closes
                        setTimeout(() => {
                            setShowRecommendations(true)
                        }, 300)
                    }, 2100)
                }}
            />
        </SafeAreaView>
    )
}

const s = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: '#0f0f14' 
    },
    inner: { 
        flexGrow: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24, 
        paddingTop: 20,
        paddingBottom: 40 
    },
    
    // ── Main Header Styles ─────────────────────────────
    mainHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    headerBackButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    mainHeaderTitle: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },

    // ── Header Styles ──────────────────────────────────
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
        width: 40,
        height: 40,
        borderRadius: 20,
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

    // ── List Styles ─────────────────────────────────────
    listContent: {
        padding: 20,
        paddingBottom: 100,
    },
    recCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
    },
    recCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.2)',
        borderRadius: 16,
    },
    recCardContent: {
        flex: 1,
        marginRight: 12,
    },
    recCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    recCardName: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
        marginRight: 12,
    },
    recCardPrice: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '600',
    },
    recCardDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 12,
    },
    recCardFooter: {
        gap: 8,
    },
    recCardInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    recCardInfoText: {
        color: '#B8A5C4',
        fontSize: 13,
        flex: 1,
    },

    // ── CTA Button Styles ───────────────────────────────
    ctaContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#0f0f14',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    ctaButton: {
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#cc31e8',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    ctaGradient: {
        paddingVertical: 16,
        paddingHorizontal: 24,
        alignItems: 'center',
    },
    ctaText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },

    // ── Start Activity Card Styles ─────────────────────
    startNewActivityCard: {
        width: '100%',
        maxWidth: 350,
        borderRadius: 28,
        shadowColor: 'rgba(204, 49, 232, 0.4)',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 15,
    },
    startNewActivityOutline: {
        borderRadius: 28,
        borderWidth: 2,
        borderColor: '#cc31e8',
        overflow: 'hidden',
    },
    startNewActivityGradient: {
        borderRadius: 26,
        backgroundColor: 'rgba(15, 15, 20, 0.8)',
    },
    startNewActivityContent: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
        paddingVertical: 48,
        gap: 16,
    },
    startNewActivityIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },
    startNewActivityTitle: {
        color: '#ffffff',
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        lineHeight: 28,
        fontFamily: 'Montserrat_700Bold',
    },
    startNewActivitySubtitle: {
        color: 'rgba(255, 255, 255, 0.8)',
        fontSize: 16,
        fontWeight: '500',
        textAlign: 'center',
        lineHeight: 22,
        paddingHorizontal: 10,
    },
    readyToVibeContainer: {
        backgroundColor: 'rgba(204, 49, 232, 0.15)',
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 24,
        marginTop: 12,
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
    },
    readyToVibeText: {
        color: '#cc31e8',
        fontSize: 16,
        fontWeight: '700',
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

    // ── Modal Styles ────────────────────────────────────
    modalBg: { 
        flex: 1, 
        backgroundColor: 'rgba(0,0,0,0.8)', 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    detailModal: {
        backgroundColor: '#1a1a27',
        width: '90%',
        maxHeight: '80%',
        borderRadius: 16,
        padding: 24,
    },
    close: { 
        position: 'absolute', 
        top: 16, 
        right: 16, 
        zIndex: 10,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeTxt: { 
        fontSize: 16, 
        color: '#fff' 
    },
    detailTitle: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        marginTop: 8,
    },
    detailMeta: {
        color: '#cc31e8',
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
    },
    detailDescription: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 20,
    },
    detailReasonSection: {
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(204, 49, 232, 0.2)',
    },
    detailReasonTitle: {
        color: '#cc31e8',
        fontSize: 14,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    detailReasonText: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 15,
        lineHeight: 22,
    },
    detailInfoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    detailInfo: {
        color: '#B8A5C4',
        fontSize: 15,
        flex: 1,
    },
})