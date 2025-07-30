import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    FlatList,
    Modal,
    Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Calendar, ArrowRight, X, ArrowLeft } from 'lucide-react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import HeaderSvg from '../assets/header.svg';
import TryVoxxyChat from '../components/TryVoxxyChat';
import { API_URL } from '../config';

export default function TryVoxxScreen() {
    const navigation = useNavigation();
    const [recommendations, setRecommendations] = useState([]);
    const [loadingCache, setLoadingCache] = useState(true);
    const [chatOpen, setChatOpen] = useState(false);
    const [selectedRec, setSelectedRec] = useState(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [timeLeft, setTimeLeft] = useState(null);
    const [canGetNew, setCanGetNew] = useState(true);

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

    useEffect(() => {
        loadCachedRecommendations();
    }, []);

    useEffect(() => {
        if (timeLeft && timeLeft > 0) {
            const timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        setCanGetNew(true);
                        return null;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [timeLeft]);

    const loadCachedRecommendations = async () => {
        try {
            const token = await getOrCreateSessionToken();
            
            // First check for cached recommendations
            const cachedResponse = await fetch(`${API_URL}/try_voxxy_cached?session_token=${token}`);
            if (cachedResponse.ok) {
                const cachedData = await cachedResponse.json();
                setRecommendations(cachedData.recommendations || []);
                
                // If we have cached recommendations, assume rate limit is active
                if (cachedData.recommendations && cachedData.recommendations.length > 0) {
                    setTimeLeft(3600); // Assume 1 hour countdown from when they were cached
                    setCanGetNew(false);
                } else {
                    // No cached recommendations, user can get new ones
                    setCanGetNew(true);
                }
            }
        } catch (error) {
            console.error('Error loading cached recommendations:', error);
        } finally {
            setLoadingCache(false);
        }
    };

    const openChat = () => {
        setChatOpen(true);
    };

    const handleChatClose = () => {
        setChatOpen(false);
    };

    const handleChatComplete = (newRecommendations) => {
        setRecommendations(newRecommendations);
        setChatOpen(false);
        // After getting new recommendations, user will need to wait 1 hour
        setTimeLeft(3600); // 1 hour in seconds
        setCanGetNew(false);
    };

    const openDetail = (rec) => {
        setSelectedRec(rec);
        setShowDetailModal(true);
    };

    const closeDetail = () => {
        setShowDetailModal(false);
        setSelectedRec(null);
    };

    const renderRecommendation = ({ item }) => (
        <TouchableOpacity style={styles.listItem} onPress={() => openDetail(item)}>
            <View style={styles.listTop}>
                <Text style={styles.listName}>{item.name}</Text>
                <Text style={styles.listMeta}>{item.price_range}</Text>
            </View>
            <View style={styles.listBottom}>
                <Text style={styles.listBottomText}>{item.hours}</Text>
                <Text style={styles.listBottomText}>{item.address}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.headerBar}>
                <TouchableOpacity 
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <ArrowLeft color="#fff" size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Try Voxxy Today</Text>
                <View style={styles.headerSpacer} />
            </View>
            
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {recommendations.length > 0 ? (
                    <>
                        <View style={styles.content}>
                            <Text style={styles.subtitle}>
                                Below are your recommendations, tap on one to see more details. Create an account to plan with friends, save your recommendations, & choose from different activities!
                            </Text>
                        </View>
                        
                        <View style={styles.recommendationsContainer}>
                            <FlatList
                                data={recommendations}
                                renderItem={renderRecommendation}
                                keyExtractor={(item, index) => index.toString()}
                                scrollEnabled={false}
                                showsVerticalScrollIndicator={false}
                            />
                            
                            {!canGetNew && (
                                <Text style={styles.countdownText}>
                                    New recommendations can be generated every hour
                                </Text>
                            )}
                        </View>
                    </>
                ) : !loadingCache && (
                    <View style={styles.emptyStateContainer}>
                        <TouchableOpacity 
                            style={[styles.card, !canGetNew && styles.cardDisabled]} 
                            onPress={canGetNew ? openChat : null}
                            disabled={!canGetNew}
                        >
                            <View style={styles.iconWrapper}>
                                <Calendar color="#cc31e8" size={24} />
                            </View>
                            <Text style={styles.cardTitle}>Find Perfect Restaurants</Text>
                            <Text style={[styles.cardText, !canGetNew && styles.cardTextDisabled]}>
                                {canGetNew 
                                    ? "Get personalized restaurant recommendations for your group. Sign up to save favorites and plan activities with friends!"
                                    : "New recommendations can be generated every hour"
                                }
                            </Text>
                            {canGetNew && (
                                <View style={styles.cardButton}>
                                    <Text style={styles.cardButtonText}>Get Recommendations</Text>
                                    <ArrowRight color="#fff" size={16} style={{ marginLeft: 8 }} />
                                </View>
                            )}
                        </TouchableOpacity>
                        
                        {!canGetNew && (
                            <Text style={styles.emptyStateMessage}>
                                New recommendations can be generated every hour
                            </Text>
                        )}
                    </View>
                )}
            </ScrollView>

            <View style={styles.bottomButton}>
                <TouchableOpacity 
                    style={styles.bigButton} 
                    onPress={() => navigation.navigate('SignUp')}
                >
                    <Text style={styles.bigButtonText}>Create Your Account</Text>
                </TouchableOpacity>
            </View>

            <TryVoxxyChat
                visible={chatOpen}
                onClose={handleChatClose}
                onChatComplete={handleChatComplete}
            />

            <Modal
                visible={showDetailModal}
                transparent={true}
                animationType="fade"
                onRequestClose={closeDetail}
            >
                <View style={styles.overlay}>
                    <View style={styles.detailModal}>
                        <TouchableOpacity style={styles.closeButton} onPress={closeDetail}>
                            <X color="#aaa" size={20} />
                        </TouchableOpacity>
                        
                        {selectedRec && (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                <Text style={styles.detailTitle}>{selectedRec.name}</Text>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Price:</Text> {selectedRec.price_range}
                                </Text>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Hours:</Text> {selectedRec.hours}
                                </Text>
                                <Text style={styles.detailText}>{selectedRec.description}</Text>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Why:</Text> {selectedRec.reason}
                                </Text>
                                <Text style={styles.detailText}>
                                    <Text style={styles.detailLabel}>Address:</Text> {selectedRec.address}
                                </Text>
                            </ScrollView>
                        )}
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    scrollView: {
        flex: 1,
    },
    headerBar: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#592566',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
        fontStyle: 'italic',
    },
    headerSpacer: {
        width: 40, // Same width as back button to center title
    },
    content: {
        paddingHorizontal: 32,
        paddingTop: 20,
        paddingBottom: 10,
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 24,
        marginBottom: 16,
        fontFamily: 'Montserrat_400Regular',
    },
    countdownText: {
        fontSize: 14,
        color: '#cc31e8',
        textAlign: 'center',
        marginTop: 10,
        fontFamily: 'Montserrat_600SemiBold',
    },
    emptyStateContainer: {
        flex: 1,
        paddingHorizontal: 32,
        paddingTop: 60,
        paddingBottom: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyStateMessage: {
        fontSize: 14,
        color: '#cc31e8',
        textAlign: 'center',
        marginTop: 24,
        fontFamily: 'Montserrat_600SemiBold',
    },
    card: {
        backgroundColor: '#2a2235',
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#592566',
    },
    cardDisabled: {
        backgroundColor: '#1a1520',
        borderColor: '#3a2040',
        opacity: 0.6,
    },
    iconWrapper: {
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderRadius: 50,
        width: 48,
        height: 48,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    cardText: {
        color: '#ccc',
        marginBottom: 20,
        textAlign: 'center',
        lineHeight: 20,
        fontSize: 14,
        fontFamily: 'Montserrat_400Regular',
    },
    cardTextDisabled: {
        color: '#888',
        marginBottom: 0,
    },
    cardButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#cc31e8',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 50,
    },
    cardButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    recommendationsContainer: {
        paddingHorizontal: 32,
        marginBottom: 20,
    },
    listItem: {
        backgroundColor: '#2a2235',
        padding: 16,
        marginBottom: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#592566',
    },
    listTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 6,
    },
    listName: {
        fontWeight: '600',
        color: '#fff',
        fontSize: 16,
        flex: 1,
    },
    listMeta: {
        fontSize: 14,
        color: '#ccc',
    },
    listBottom: {
        marginTop: 4,
    },
    listBottomText: {
        color: '#ccc',
        fontSize: 13,
        lineHeight: 18,
    },
    bottomButton: {
        paddingHorizontal: 32,
        paddingVertical: 20,
        paddingBottom: 34, // Extra padding for safe area
        backgroundColor: '#201925',
        borderTopWidth: 1,
        borderTopColor: '#592566',
    },
    bigButton: {
        width: '100%',
        backgroundColor: '#cc31e8',
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        marginVertical: 8,
    },
    bigButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    detailModal: {
        backgroundColor: '#2a2235',
        borderRadius: 16,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        maxHeight: '80%',
        position: 'relative',
        borderWidth: 1,
        borderColor: '#592566',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        padding: 8,
        zIndex: 1,
    },
    detailTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 16,
        paddingRight: 40,
    },
    detailText: {
        color: '#ccc',
        marginBottom: 12,
        lineHeight: 20,
        fontSize: 14,
    },
    detailLabel: {
        fontWeight: 'bold',
        color: '#fff',
    },
});