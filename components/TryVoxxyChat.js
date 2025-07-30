import React, { useState } from 'react';
import {
    View,
    Text,
    TextInput,
    ScrollView,
    SafeAreaView,
    Modal,
    TouchableOpacity,
    Alert,
} from 'react-native';
import {
    FormStyles,
    GradientButton,
    GradientCard,
    GradientTimeCard,
    gradientConfigs
} from '../styles/FormStyles';
import { LinearGradient } from 'expo-linear-gradient';
import { MapPin } from 'lucide-react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../config';
import { logger } from '../utils/logger';

export default function TryVoxxyChat({ visible, onClose, onChatComplete }) {
    const [step, setStep] = useState(1);
    const totalSteps = 6;
    const percent = (step / totalSteps) * 100;

    // Form data
    const [location, setLocation] = useState('');
    const [coords, setCoords] = useState(null);
    const [isLocating, setIsLocating] = useState(false);
    const [currentLocationUsed, setCurrentLocationUsed] = useState(false);
    const [outingType, setOutingType] = useState('');
    const [selectedFoodMoods, setSelectedFoodMoods] = useState([]);
    const [selectedRestrictions, setSelectedRestrictions] = useState([]);
    const [selectedVibes, setSelectedVibes] = useState([]);
    const [budget, setBudget] = useState('');

    const headers = [
        {
            title: 'Where are you?',
            subtitle: 'Help us find dining options in your area'
        },
        {
            title: 'What time of day?',
            subtitle: 'When are you planning to go out?'
        },
        {
            title: 'Food & drink mood?',
            subtitle: 'What are you craving today?'
        },
        {
            title: 'Any restrictions?',
            subtitle: 'Let us know about dietary needs or preferences'
        },
        {
            title: 'What\'s the vibe?',
            subtitle: 'Tell us about the atmosphere you\'re looking for'
        },
        {
            title: 'Budget range?',
            subtitle: 'What\'s your spending comfort zone?'
        }
    ];

    const { title, subtitle } = headers[step - 1];

    const outingTypeOptions = [
        { value: 'Brunch', label: 'Brunch 🥂', icon: '🥂' },
        { value: 'Lunch', label: 'Lunch 🥗', icon: '🥗' },
        { value: 'Dinner', label: 'Dinner 🥘', icon: '🥘' },
        { value: 'Late-night drinks', label: 'Late-night drinks 🍸', icon: '🍸' }
    ];

    const foodMoodOptions = [
        { label: 'Italian', emoji: '🍝' },
        { label: 'Mexican', emoji: '🌮' },
        { label: 'Chinese', emoji: '🥡' },
        { label: 'Japanese', emoji: '🍣' },
        { label: 'American', emoji: '🍔' },
        { label: 'Indian', emoji: '🍛' },
        { label: 'Thai', emoji: '🥘' },
        { label: 'Mediterranean', emoji: '🫒' },
        { label: 'Comfort Food', emoji: '🍲' },
        { label: 'Something New', emoji: '🎲' }
    ];

    const restrictionOptions = [
        { label: 'Vegetarian', emoji: '🥬' },
        { label: 'Vegan', emoji: '🌱' },
        { label: 'Gluten-Free', emoji: '🌾' },
        { label: 'No Nuts', emoji: '🥜' },
        { label: 'Dairy-Free', emoji: '🥛' },
        { label: 'Keto', emoji: '🥩' },
        { label: 'Kosher', emoji: '✡️' },
        { label: 'Halal', emoji: '☪️' },
        { label: 'No restrictions', emoji: '✅' }
    ];

    const vibeOptions = [
        { label: 'Casual', emoji: '👕' },
        { label: 'Trendy', emoji: '✨' },
        { label: 'Romantic', emoji: '❤️' },
        { label: 'Family Friendly', emoji: '👨‍👩‍👧‍👦' },
        { label: 'Outdoor Seating', emoji: '🌳' },
        { label: 'Rooftop Views', emoji: '🌆' },
        { label: 'Live Music', emoji: '🎵' },
        { label: 'Cozy', emoji: '🛋️' },
        { label: 'Energetic', emoji: '⚡' },
        { label: 'Quiet', emoji: '🤫' }
    ];

    const budgetOptions = [
        { value: 'low', label: 'Low ($-$$)', subtitle: 'Budget-friendly options', icon: '💰' },
        { value: 'mid', label: 'Mid ($$-$$$)', subtitle: 'Moderate pricing', icon: '💳' },
        { value: 'high', label: 'High ($$$-$$$$)', subtitle: 'Premium dining', icon: '💎' }
    ];

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

    const useCurrentLocation = async () => {
        setIsLocating(true);

        try {
            const { status } = await Location.requestForegroundPermissionsAsync();

            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Permission to access location was denied. Please enable location services in your device settings.'
                );
                setIsLocating(false);
                return;
            }

            const location = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
                timeInterval: 15000,
                distanceInterval: 10
            });

            setCoords({
                lat: location.coords.latitude,
                lng: location.coords.longitude,
            });
            setCurrentLocationUsed(true);
            setLocation('Using current location');
            setIsLocating(false);
        } catch (error) {
            logger.error('Location error:', error);
            Alert.alert('Location Error', 'Failed to get your current location. Please enter it manually.');
            setIsLocating(false);
        }
    };

    const handleOutingTypeSelect = (type) => {
        setOutingType(type);
        setTimeout(() => {
            setStep(3);
        }, 300);
    };

    // Toggle functions for multi-select cards
    const toggleFoodMood = (mood) => {
        setSelectedFoodMoods(prev => 
            prev.includes(mood) 
                ? prev.filter(m => m !== mood)
                : [...prev, mood]
        );
    };

    const toggleRestriction = (restriction) => {
        if (restriction === 'No restrictions') {
            setSelectedRestrictions(['No restrictions']);
            return;
        }
        const withoutNone = selectedRestrictions.filter(r => r !== 'No restrictions');
        if (withoutNone.includes(restriction)) {
            setSelectedRestrictions(withoutNone.filter(r => r !== restriction));
        } else {
            setSelectedRestrictions([...withoutNone, restriction]);
        }
    };

    const toggleVibe = (vibe) => {
        setSelectedVibes(prev => 
            prev.includes(vibe) 
                ? prev.filter(v => v !== vibe)
                : [...prev, vibe]
        );
    };

    const handleBudgetSelect = (budgetValue) => {
        setBudget(budgetValue);
        setTimeout(() => {
            handleSubmit();
        }, 300);
    };

    const isNextDisabled = () => {
        switch (step) {
            case 1:
                // Require either typed location or successful current location with coords
                const hasTypedLocation = location.trim() && location !== 'Using current location';
                const hasCurrentLocation = currentLocationUsed && coords && coords.lat && coords.lng;
                return !hasTypedLocation && !hasCurrentLocation;
            case 2:
                return !outingType;
            case 3:
                return selectedFoodMoods.length === 0;
            case 4:
                return false; // Optional field, allow empty restrictions
            case 5:
                return selectedVibes.length === 0;
            case 6:
                return !budget;
            default:
                return false;
        }
    };

    const handleNext = () => {
        if (step < totalSteps) {
            setStep(step + 1);
        } else {
            handleSubmit();
        }
    };

    const handleBack = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async () => {
        try {
            const token = await getOrCreateSessionToken();
            logger.debug('🚀 Starting handleSubmit with token:', token.substring(0, 10) + '...');
            
            // Format responses similar to the web app format
            const foodMoodText = selectedFoodMoods.length > 0 ? selectedFoodMoods.join(', ') : 'Open to anything';
            const restrictionsText = selectedRestrictions.length > 0 ? selectedRestrictions.join(', ') : 'No specific restrictions';
            const vibeText = selectedVibes.length > 0 ? selectedVibes.join(', ') : 'No preference';
            
            const responses = [
                `What's the food & drink mood? Are we craving anything specific or open to surprises?\nAnswer: ${foodMoodText}`,
                `Any deal-breakers? (e.g. no pizza, gluten-free, etc)\nAnswer: ${restrictionsText}`,
                `What's the vibe? Fancy, casual, outdoor seating, rooftop views, good music…?\nAnswer: ${vibeText}`,
                `Budget range: low, mid, high?\nAnswer: ${budget}`
            ].join('\n\n');
            
            // Format location properly
            let locationToSend;
            if (currentLocationUsed && coords && coords.lat && coords.lng) {
                locationToSend = `${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`;
            } else if (location && location.trim() && location !== 'Using current location') {
                locationToSend = location.trim();
            } else {
                locationToSend = '';
            }

            // Debug location state
            logger.debug('🗺️ Location debug info:', {
                location: location,
                locationLength: location?.length || 0,
                currentLocationUsed: currentLocationUsed,
                coords: coords,
                locationToSend: locationToSend,
                locationToSendType: typeof locationToSend,
                locationToSendLength: locationToSend?.toString().length || 0
            });

            // Validate request parameters
            const requestData = {
                responses,
                activity_location: locationToSend,
                date_notes: outingType || 'restaurant visit'
            };
            
            logger.debug('📤 Sending API request:', {
                url: `${API_URL}/try_voxxy_recommendations`,
                responses: responses.substring(0, 100) + '...',
                responses_length: responses.length,
                activity_location: locationToSend,
                activity_location_type: typeof locationToSend,
                date_notes: requestData.date_notes,
                session_token_length: token.length
            });
            
            // Validate required fields
            if (!responses || responses.trim().length === 0) {
                throw new Error('Responses cannot be empty');
            }
            if (!locationToSend || locationToSend.toString().trim().length === 0) {
                logger.error('❌ Location validation failed - returning to step 1');
                Alert.alert('Location Required', 'Please enter a location or use your current location before proceeding.');
                setStep(1);
                return;
            }
            if (!requestData.date_notes || requestData.date_notes.trim().length === 0) {
                throw new Error('Date notes cannot be empty');
            }

            const fullUrl = `${API_URL}try_voxxy_recommendations`;
            logger.debug('🌐 Making fetch request to:', fullUrl);
            
            const response = await fetch(fullUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Session-Token': token
                },
                body: JSON.stringify(requestData)
            });
            
            logger.debug('📥 Response received:', {
                status: response.status,
                statusText: response.statusText,
                url: response.url,
                headers: Object.fromEntries(response.headers.entries())
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                logger.error('🚨 API Error Details:', {
                    status: response.status,
                    statusText: response.statusText,
                    url: response.url,
                    errorData,
                    requestPayload: {
                        responses: responses.substring(0, 100) + '...',
                        activity_location: locationToSend,
                        date_notes: outingType || 'restaurant visit'
                    }
                });
                
                // More specific error messages
                let errorMessage = 'Failed to get recommendations';
                if (response.status === 500) {
                    errorMessage = 'Server error - this has been logged for investigation';
                } else if (response.status === 429) {
                    errorMessage = 'Too many requests, try again later';
                } else if (response.status === 422) {
                    errorMessage = errorData.error || 'Invalid request parameters';
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                }
                
                throw new Error(`API Error ${response.status}: ${errorMessage}`);
            }

            const data = await response.json();
            onChatComplete(data.recommendations || []);
        } catch (error) {
            logger.error('💥 Final error in handleSubmit:', {
                errorMessage: error.message,
                errorStack: error.stack,
                timestamp: new Date().toISOString()
            });
            Alert.alert('Error', error.message || 'Failed to get recommendations. Please try again.');
            onChatComplete([]);
        }
    };

    const renderProgressBar = () => (
        <View style={FormStyles.progressBarContainer}>
            <LinearGradient
                {...gradientConfigs.primary}
                style={[FormStyles.progressBar, { width: `${percent}%` }]}
            />
        </View>
    );

    const renderStepContent = () => {
        switch (step) {
            case 1:
                return (
                    <View style={FormStyles.section}>
                        <TextInput
                            style={FormStyles.input}
                            value={location}
                            onChangeText={(text) => {
                                setLocation(text);
                                setCurrentLocationUsed(false);
                            }}
                            placeholder={
                                currentLocationUsed
                                    ? 'Using current location'
                                    : 'Enter city or neighborhood (e.g. San Francisco, CA)'
                            }
                            placeholderTextColor="#aaa"
                            editable={!currentLocationUsed}
                        />

                        <TouchableOpacity
                            style={FormStyles.useLocationButton}
                            onPress={useCurrentLocation}
                            disabled={isLocating || currentLocationUsed}
                        >
                            <MapPin color="#cc31e8" size={16} />
                            <Text style={FormStyles.useLocationButtonText}>
                                {currentLocationUsed
                                    ? 'Using current location'
                                    : isLocating
                                        ? 'Locating…'
                                        : 'Use my current location'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );

            case 2:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {outingTypeOptions.map((option) => (
                                <View key={option.value} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientCard
                                        selected={outingType === option.value}
                                        onPress={() => handleOutingTypeSelect(option.value)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 6 }]}>{option.icon}</Text>
                                        <Text style={[FormStyles.cardLabel, { fontSize: 14 }]}>{option.value}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {foodMoodOptions.map((option) => (
                                <View key={option.label} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientCard
                                        selected={selectedFoodMoods.includes(option.label)}
                                        onPress={() => toggleFoodMood(option.label)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 6 }]}>{option.emoji}</Text>
                                        <Text style={[FormStyles.cardLabel, { fontSize: 12, textAlign: 'center' }]}>{option.label}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 3:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {restrictionOptions.map((option) => (
                                <View key={option.label} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientCard
                                        selected={selectedRestrictions.includes(option.label)}
                                        onPress={() => toggleRestriction(option.label)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 6 }]}>{option.emoji}</Text>
                                        <Text style={[FormStyles.cardLabel, { fontSize: 12, textAlign: 'center' }]}>{option.label}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 4:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {vibeOptions.map((option) => (
                                <View key={option.label} style={[FormStyles.mobileGridItem, { aspectRatio: 1 }]}>
                                    <GradientCard
                                        selected={selectedVibes.includes(option.label)}
                                        onPress={() => toggleVibe(option.label)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 6 }]}>{option.emoji}</Text>
                                        <Text style={[FormStyles.cardLabel, { fontSize: 12, textAlign: 'center' }]}>{option.label}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            case 6:
                return (
                    <View style={FormStyles.section}>
                        <View style={[FormStyles.mobileGrid, { gap: 16 }]}>
                            {budgetOptions.map((option) => (
                                <View key={option.value} style={[FormStyles.mobileGridItem, { aspectRatio: 1.2 }]}>
                                    <GradientCard
                                        selected={budget === option.value}
                                        onPress={() => handleBudgetSelect(option.value)}
                                        style={{
                                            flex: 1,
                                            minHeight: 0,
                                            padding: 16,
                                            justifyContent: 'center'
                                        }}
                                    >
                                        <Text style={[FormStyles.cardIcon, { fontSize: 28, marginBottom: 8 }]}>{option.icon}</Text>
                                        <Text style={[FormStyles.cardLabel, { fontSize: 14, marginBottom: 4 }]}>{option.label}</Text>
                                        <Text style={[FormStyles.cardSubtitle, { fontSize: 11 }]}>{option.subtitle}</Text>
                                    </GradientCard>
                                </View>
                            ))}
                        </View>
                    </View>
                );

            default:
                return null;
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={() => onClose()}
        >
            <SafeAreaView style={FormStyles.modalContainer}>
                {renderProgressBar()}

                <Text style={FormStyles.stepLabel}>
                    Step {step} of {totalSteps}
                </Text>

                <View style={FormStyles.modalHeader}>
                    <Text style={FormStyles.title}>{title}</Text>
                    <Text style={FormStyles.subtitle}>{subtitle}</Text>
                </View>

                <ScrollView
                    style={FormStyles.stepContent}
                    contentContainerStyle={FormStyles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                >
                    {renderStepContent()}
                </ScrollView>

                <View style={FormStyles.buttonRow}>
                    <TouchableOpacity
                        style={step > 1 ? FormStyles.buttonSecondary : FormStyles.buttonSecondaryDisabled}
                        onPress={step > 1 ? handleBack : null}
                        activeOpacity={step > 1 ? 0.8 : 1}
                        disabled={step === 1}
                    >
                        <Text style={step > 1 ? FormStyles.buttonTextSecondary : FormStyles.buttonTextSecondaryDisabled}>
                            Back
                        </Text>
                    </TouchableOpacity>

                    <GradientButton
                        onPress={step < totalSteps ? handleNext : handleSubmit}
                        disabled={isNextDisabled()}
                        style={FormStyles.flex1}
                    >
                        <Text style={FormStyles.buttonTextPrimary}>
                            {step < totalSteps ? 'Next' : 'Get Recommendations'}
                        </Text>
                    </GradientButton>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

