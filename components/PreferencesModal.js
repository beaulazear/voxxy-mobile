import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    Modal,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
    ScrollView,
    ActivityIndicator,
} from 'react-native';
import { X } from 'react-native-feather';
import { Pizza, Coffee, Beef, Fish, Salad, Dessert, Soup, Sandwich, Wine, Beer, Martini } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

// Food options - optimized for Google Places API keywords
const FOOD_OPTIONS = [
    { label: 'Italian', value: 'italian', icon: Pizza, color: '#FF6B6B' },
    { label: 'Pizza', value: 'pizza', icon: Pizza, color: '#E63946' },
    { label: 'Japanese', value: 'japanese', icon: Fish, color: '#4ECDC4' },
    { label: 'Sushi', value: 'sushi', icon: Fish, color: '#06B6D4' },
    { label: 'Ramen', value: 'ramen', icon: Soup, color: '#3B82F6' },
    { label: 'Mexican', value: 'mexican', icon: Soup, color: '#FF9A3D' },
    { label: 'Burgers', value: 'burger', icon: Sandwich, color: '#FFD93D' },
    { label: 'Chinese', value: 'chinese', icon: Coffee, color: '#FF7F50' },
    { label: 'Thai', value: 'thai', icon: Soup, color: '#F4A460' },
    { label: 'Indian', value: 'indian', icon: Soup, color: '#FFA500' },
    { label: 'Korean', value: 'korean', icon: Beef, color: '#DC2626' },
    { label: 'Vietnamese', value: 'vietnamese', icon: Coffee, color: '#10B981' },
    { label: 'Mediterranean', value: 'mediterranean', icon: Salad, color: '#8B5CF6' },
    { label: 'Greek', value: 'greek', icon: Salad, color: '#3B82F6' },
    { label: 'French', value: 'french', icon: Wine, color: '#EC4899' },
    { label: 'Spanish', value: 'spanish', icon: Wine, color: '#F59E0B' },
    { label: 'American', value: 'american', icon: Sandwich, color: '#6366F1' },
    { label: 'BBQ', value: 'bbq', icon: Beef, color: '#8B4513' },
    { label: 'Steakhouse', value: 'steakhouse', icon: Beef, color: '#7F1D1D' },
    { label: 'Seafood', value: 'seafood', icon: Fish, color: '#4682B4' },
    { label: 'Breakfast', value: 'breakfast', icon: Coffee, color: '#FBBF24' },
    { label: 'Brunch', value: 'brunch', icon: Coffee, color: '#F97316' },
];

// Dietary Requirements - HARD FILTERS (venues must match these)
const DIETARY_REQUIREMENTS = [
    { label: 'Vegetarian', value: 'vegetarian', color: '#A8E6CF' },
    { label: 'Vegan', value: 'vegan', color: '#90EE90' },
    { label: 'Gluten-Free', value: 'gluten-free', color: '#FFD93D' },
    { label: 'Halal', value: 'halal', color: '#9261E5' },
    { label: 'Kosher', value: 'kosher', color: '#B8A5C4' },
];

// Dietary Preferences - Informational only (not hard filters)
const DIETARY_PREFERENCES = [
    { label: 'Pescatarian', value: 'pescatarian', color: '#4682B4' },
    { label: 'Keto', value: 'keto', color: '#FF6B6B' },
    { label: 'Paleo', value: 'paleo', color: '#A0522D' },
    { label: 'Low-Carb', value: 'low-carb', color: '#DDA15E' },
    { label: 'Dairy-Free', value: 'dairy-free', color: '#4ECDC4' },
    { label: 'Nut Allergy', value: 'nut allergy', color: '#FF9A3D' },
    { label: 'Shellfish Allergy', value: 'shellfish allergy', color: '#FF6B9D' },
];

// Bar options - optimized for Google Places API keywords
const BAR_OPTIONS = [
    { label: 'Cocktail Bar', value: 'cocktail', icon: Martini, color: '#FF6B9D' },
    { label: 'Wine Bar', value: 'wine bar', icon: Wine, color: '#9261E5' },
    { label: 'Brewery', value: 'beer', icon: Beer, color: '#FFD93D' },
    { label: 'Pub', value: 'pub', icon: Beer, color: '#F59E0B' },
    { label: 'Whiskey Bar', value: 'whiskey bar', icon: Wine, color: '#A0522D' },
    { label: 'Rooftop Bar', value: 'rooftop', icon: Wine, color: '#4ECDC4' },
    { label: 'Dive Bar', value: 'dive bar', icon: Beer, color: '#FF9A3D' },
    { label: 'Sports Bar', value: 'sports bar', icon: Beer, color: '#4682B4' },
    { label: 'Lounge', value: 'lounge', icon: Martini, color: '#B8A5C4' },
    { label: 'Speakeasy', value: 'speakeasy', icon: Martini, color: '#8B4513' },
    { label: 'Live Music', value: 'live music', icon: Wine, color: '#A8E6CF' },
    { label: 'Tiki Bar', value: 'tiki', icon: Martini, color: '#10B981' },
    { label: 'Karaoke', value: 'karaoke', icon: Martini, color: '#EC4899' },
    { label: 'Jazz Bar', value: 'jazz', icon: Wine, color: '#6366F1' },
    { label: 'Coffee Shop', value: 'coffee', icon: Coffee, color: '#8B4513' },
];

export default function PreferencesModal({
    visible,
    onClose,
    onSave,
    initialFavorites = '',
    initialDietary = '',
    initialBarPreferences = '',
    saving = false
}) {
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [selectedDietary, setSelectedDietary] = useState([]);
    const [selectedBars, setSelectedBars] = useState([]);
    const [customFoods, setCustomFoods] = useState([]);
    const [customDietary, setCustomDietary] = useState([]);
    const [customBars, setCustomBars] = useState([]);

    // Helper function to match strings case-insensitively and with variations
    const matchesOption = (input, optionValue) => {
        const normalizedInput = input.toLowerCase().trim();
        const normalizedOption = optionValue.toLowerCase().trim();

        // Exact match
        if (normalizedInput === normalizedOption) return true;

        // Match without hyphens/spaces (e.g., "gluten free" matches "Gluten-Free")
        const inputNoSpaces = normalizedInput.replace(/[-\s]/g, '');
        const optionNoSpaces = normalizedOption.replace(/[-\s]/g, '');
        if (inputNoSpaces === optionNoSpaces) return true;

        return false;
    };

    // Parse comma-separated strings into arrays when modal opens
    useEffect(() => {
        if (visible) {
            // Parse favorite foods
            const foodsArray = initialFavorites
                .split(',')
                .map(f => f.trim())
                .filter(f => f.length > 0);

            const recognizedFoods = [];
            const unrecognizedFoods = [];

            foodsArray.forEach(food => {
                const matchedOption = FOOD_OPTIONS.find(opt => matchesOption(food, opt.value));
                if (matchedOption) {
                    recognizedFoods.push(matchedOption.value);
                } else {
                    unrecognizedFoods.push(food);
                }
            });

            setSelectedFoods(recognizedFoods);
            setCustomFoods(unrecognizedFoods);

            // Parse dietary restrictions
            const dietaryArray = initialDietary
                .split(',')
                .map(d => d.trim())
                .filter(d => d.length > 0);

            const recognizedDietary = [];
            const unrecognizedDietary = [];

            // Combine both dietary requirements and preferences for matching
            const allDietaryOptions = [...DIETARY_REQUIREMENTS, ...DIETARY_PREFERENCES];

            dietaryArray.forEach(dietary => {
                const matchedOption = allDietaryOptions.find(opt => matchesOption(dietary, opt.value));
                if (matchedOption) {
                    recognizedDietary.push(matchedOption.value);
                } else {
                    unrecognizedDietary.push(dietary);
                }
            });

            setSelectedDietary(recognizedDietary);
            setCustomDietary(unrecognizedDietary);

            // Parse bar preferences
            const barsArray = initialBarPreferences
                .split(',')
                .map(b => b.trim())
                .filter(b => b.length > 0);

            const recognizedBars = [];
            const unrecognizedBars = [];

            barsArray.forEach(bar => {
                const matchedOption = BAR_OPTIONS.find(opt => matchesOption(bar, opt.value));
                if (matchedOption) {
                    recognizedBars.push(matchedOption.value);
                } else {
                    unrecognizedBars.push(bar);
                }
            });

            setSelectedBars(recognizedBars);
            setCustomBars(unrecognizedBars);
        }
    }, [visible, initialFavorites, initialDietary, initialBarPreferences]);

    const toggleFood = (value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedFoods(prev =>
            prev.includes(value)
                ? prev.filter(f => f !== value)
                : [...prev, value]
        );
    };

    const toggleDietary = (value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedDietary(prev =>
            prev.includes(value)
                ? prev.filter(d => d !== value)
                : [...prev, value]
        );
    };

    const toggleBar = (value) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setSelectedBars(prev =>
            prev.includes(value)
                ? prev.filter(b => b !== value)
                : [...prev, value]
        );
    };

    const handleSave = () => {
        // Combine selected options with custom legacy values
        const allFoods = [...selectedFoods, ...customFoods];
        const allDietary = [...selectedDietary, ...customDietary];
        const allBars = [...selectedBars, ...customBars];

        const favoritesString = allFoods.join(', ');
        const dietaryString = allDietary.join(', ');
        const barPreferencesString = allBars.join(', ');
        onSave(favoritesString, dietaryString, barPreferencesString);
    };

    const hasChanges = () => {
        const currentFavorites = [...selectedFoods, ...customFoods].join(', ');
        const currentDietary = [...selectedDietary, ...customDietary].join(', ');
        const currentBars = [...selectedBars, ...customBars].join(', ');
        return currentFavorites !== initialFavorites || currentDietary !== initialDietary || currentBars !== initialBarPreferences;
    };

    const removeCustomFood = (food) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomFoods(prev => prev.filter(f => f !== food));
    };

    const removeCustomDietary = (dietary) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomDietary(prev => prev.filter(d => d !== dietary));
    };

    const removeCustomBar = (bar) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomBars(prev => prev.filter(b => b !== bar));
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                        disabled={saving}
                    >
                        <X stroke="#fff" width={20} height={20} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Food & Bar Preferences</Text>
                    <View style={{ width: 32 }} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Favorite Foods Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Favorite Foods</Text>
                        <Text style={styles.sectionDesc}>Select your favorite cuisines and dishes</Text>

                        <View style={styles.optionsGrid}>
                            {FOOD_OPTIONS.map((option) => {
                                const isSelected = selectedFoods.includes(option.value);
                                const IconComponent = option.icon;

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.chip,
                                            isSelected && [styles.chipSelected, { borderColor: option.color }]
                                        ]}
                                        onPress={() => toggleFood(option.value)}
                                        activeOpacity={0.7}
                                        disabled={saving}
                                    >
                                        <IconComponent
                                            color={isSelected ? option.color : '#B8A5C4'}
                                            size={20}
                                            strokeWidth={2}
                                        />
                                        <Text style={[
                                            styles.chipLabel,
                                            isSelected && styles.chipLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Food Items */}
                        {customFoods.length > 0 && (
                            <View style={styles.customItemsContainer}>
                                <Text style={styles.customItemsTitle}>Custom/Legacy Items:</Text>
                                <View style={styles.customItemsGrid}>
                                    {customFoods.map((food, index) => (
                                        <TouchableOpacity
                                            key={`custom-food-${index}`}
                                            style={styles.customChip}
                                            onPress={() => removeCustomFood(food)}
                                            activeOpacity={0.7}
                                            disabled={saving}
                                        >
                                            <Text style={styles.customChipLabel}>{food}</Text>
                                            <Text style={styles.customChipX}>×</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.customItemsHelp}>Tap to remove custom items</Text>
                            </View>
                        )}
                    </View>

                    {/* Dietary Requirements Section - HARD FILTERS */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Dietary Requirements</Text>
                        <Text style={styles.sectionDesc}>⚠️ We'll ONLY show venues that meet these needs</Text>

                        <View style={styles.optionsGrid}>
                            {DIETARY_REQUIREMENTS.map((option) => {
                                const isSelected = selectedDietary.includes(option.value);

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.chip,
                                            isSelected && [styles.chipSelected, { borderColor: option.color }]
                                        ]}
                                        onPress={() => toggleDietary(option.value)}
                                        activeOpacity={0.7}
                                        disabled={saving}
                                    >
                                        <Text style={[
                                            styles.chipLabel,
                                            isSelected && styles.chipLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>
                    </View>

                    {/* Dietary Preferences Section - INFORMATIONAL */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Other Dietary Preferences</Text>
                        <Text style={styles.sectionDesc}>Additional preferences (informational)</Text>

                        <View style={styles.optionsGrid}>
                            {DIETARY_PREFERENCES.map((option) => {
                                const isSelected = selectedDietary.includes(option.value);

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.chip,
                                            isSelected && [styles.chipSelected, { borderColor: option.color }]
                                        ]}
                                        onPress={() => toggleDietary(option.value)}
                                        activeOpacity={0.7}
                                        disabled={saving}
                                    >
                                        <Text style={[
                                            styles.chipLabel,
                                            isSelected && styles.chipLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Dietary Items */}
                        {customDietary.length > 0 && (
                            <View style={styles.customItemsContainer}>
                                <Text style={styles.customItemsTitle}>Custom/Legacy Items:</Text>
                                <View style={styles.customItemsGrid}>
                                    {customDietary.map((dietary, index) => (
                                        <TouchableOpacity
                                            key={`custom-dietary-${index}`}
                                            style={styles.customChip}
                                            onPress={() => removeCustomDietary(dietary)}
                                            activeOpacity={0.7}
                                            disabled={saving}
                                        >
                                            <Text style={styles.customChipLabel}>{dietary}</Text>
                                            <Text style={styles.customChipX}>×</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.customItemsHelp}>Tap to remove custom items</Text>
                            </View>
                        )}
                    </View>

                    {/* Bar Preferences Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Bar & Drink Preferences</Text>
                        <Text style={styles.sectionDesc}>What's your go-to vibe for drinks?</Text>

                        <View style={styles.optionsGrid}>
                            {BAR_OPTIONS.map((option) => {
                                const isSelected = selectedBars.includes(option.value);
                                const IconComponent = option.icon;

                                return (
                                    <TouchableOpacity
                                        key={option.value}
                                        style={[
                                            styles.chip,
                                            isSelected && [styles.chipSelected, { borderColor: option.color }]
                                        ]}
                                        onPress={() => toggleBar(option.value)}
                                        activeOpacity={0.7}
                                        disabled={saving}
                                    >
                                        <IconComponent
                                            color={isSelected ? option.color : '#B8A5C4'}
                                            size={20}
                                            strokeWidth={2}
                                        />
                                        <Text style={[
                                            styles.chipLabel,
                                            isSelected && styles.chipLabelSelected
                                        ]}>
                                            {option.label}
                                        </Text>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {/* Custom Bar Items */}
                        {customBars.length > 0 && (
                            <View style={styles.customItemsContainer}>
                                <Text style={styles.customItemsTitle}>Custom/Legacy Items:</Text>
                                <View style={styles.customItemsGrid}>
                                    {customBars.map((bar, index) => (
                                        <TouchableOpacity
                                            key={`custom-bar-${index}`}
                                            style={styles.customChip}
                                            onPress={() => removeCustomBar(bar)}
                                            activeOpacity={0.7}
                                            disabled={saving}
                                        >
                                            <Text style={styles.customChipLabel}>{bar}</Text>
                                            <Text style={styles.customChipX}>×</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                                <Text style={styles.customItemsHelp}>Tap to remove custom items</Text>
                            </View>
                        )}
                    </View>

                    {/* Selection Summary */}
                    {(selectedFoods.length > 0 || selectedDietary.length > 0 || selectedBars.length > 0 || customFoods.length > 0 || customDietary.length > 0 || customBars.length > 0) && (
                        <View style={styles.summarySection}>
                            <Text style={styles.summaryTitle}>Your Selections</Text>
                            {(selectedFoods.length > 0 || customFoods.length > 0) && (
                                <Text style={styles.summaryText}>
                                    <Text style={styles.summaryLabel}>Favorites: </Text>
                                    {[...selectedFoods, ...customFoods].join(', ')}
                                </Text>
                            )}
                            {(selectedDietary.length > 0 || customDietary.length > 0) && (
                                <Text style={styles.summaryText}>
                                    <Text style={styles.summaryLabel}>Dietary: </Text>
                                    {[...selectedDietary, ...customDietary].join(', ')}
                                </Text>
                            )}
                            {(selectedBars.length > 0 || customBars.length > 0) && (
                                <Text style={styles.summaryText}>
                                    <Text style={styles.summaryLabel}>Bar Preferences: </Text>
                                    {[...selectedBars, ...customBars].join(', ')}
                                </Text>
                            )}
                        </View>
                    )}
                </ScrollView>

                {/* Footer with Save Button */}
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={[
                            styles.saveButton,
                            (!hasChanges() || saving) && styles.saveButtonDisabled
                        ]}
                        onPress={handleSave}
                        disabled={!hasChanges() || saving}
                        activeOpacity={0.8}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save Preferences</Text>
                        )}
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
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
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(207, 56, 221, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(207, 56, 221, 0.3)',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    content: {
        flex: 1,
        paddingHorizontal: 20,
    },
    section: {
        marginTop: 24,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
        fontFamily: 'Montserrat_700Bold',
    },
    sectionDesc: {
        fontSize: 14,
        color: '#B8A5C4',
        marginBottom: 16,
    },
    optionsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    chip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'rgba(64, 51, 71, 0.5)',
        gap: 8,
    },
    chipSelected: {
        backgroundColor: 'rgba(185, 84, 236, 0.15)',
        borderWidth: 2,
    },
    chipLabel: {
        fontSize: 14,
        fontWeight: '500',
        color: '#B8A5C4',
    },
    chipLabelSelected: {
        color: '#fff',
        fontWeight: '600',
    },
    chipDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    customItemsContainer: {
        marginTop: 16,
        padding: 12,
        backgroundColor: 'rgba(255, 165, 0, 0.1)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    customItemsTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: '#FFA500',
        marginBottom: 8,
    },
    customItemsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    customChip: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.2)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.4)',
        gap: 6,
    },
    customChipLabel: {
        fontSize: 13,
        fontWeight: '500',
        color: '#FFA500',
    },
    customChipX: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFA500',
        lineHeight: 18,
    },
    customItemsHelp: {
        fontSize: 11,
        color: 'rgba(255, 165, 0, 0.7)',
        marginTop: 8,
        fontStyle: 'italic',
    },
    summarySection: {
        marginTop: 32,
        marginBottom: 24,
        padding: 20,
        backgroundColor: 'rgba(42, 30, 46, 0.6)',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(78, 205, 196, 0.3)',
    },
    summaryTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 12,
    },
    summaryText: {
        fontSize: 14,
        color: '#B8A5C4',
        lineHeight: 20,
        marginBottom: 8,
    },
    summaryLabel: {
        fontWeight: '600',
        color: '#4ECDC4',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.1)',
    },
    saveButton: {
        backgroundColor: '#9333EA',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#6b6b6b',
        opacity: 0.5,
    },
    saveButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});
