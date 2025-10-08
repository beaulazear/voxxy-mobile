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
import { Pizza, Coffee, Beef, Fish, Salad, Dessert, Soup, Sandwich } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const FOOD_OPTIONS = [
    { label: 'Pizza', value: 'Pizza', icon: Pizza, color: '#FF6B6B' },
    { label: 'Sushi', value: 'Sushi', icon: Fish, color: '#4ECDC4' },
    { label: 'Burgers', value: 'Burgers', icon: Sandwich, color: '#FFD93D' },
    { label: 'Tacos', value: 'Tacos', icon: Soup, color: '#FF9A3D' },
    { label: 'Pasta', value: 'Pasta', icon: Coffee, color: '#A8E6CF' },
    { label: 'Steak', value: 'Steak', icon: Beef, color: '#FF6B9D' },
    { label: 'Thai', value: 'Thai', icon: Soup, color: '#F4A460' },
    { label: 'Chinese', value: 'Chinese', icon: Coffee, color: '#FF7F50' },
    { label: 'Indian', value: 'Indian', icon: Soup, color: '#FFA500' },
    { label: 'Salads', value: 'Salads', icon: Salad, color: '#90EE90' },
    { label: 'BBQ', value: 'BBQ', icon: Beef, color: '#8B4513' },
    { label: 'Seafood', value: 'Seafood', icon: Fish, color: '#4682B4' },
];

const DIETARY_OPTIONS = [
    { label: 'Vegan', value: 'Vegan', color: '#90EE90' },
    { label: 'Vegetarian', value: 'Vegetarian', color: '#A8E6CF' },
    { label: 'Gluten-Free', value: 'Gluten-Free', color: '#FFD93D' },
    { label: 'Dairy-Free', value: 'Dairy-Free', color: '#4ECDC4' },
    { label: 'Nut Allergy', value: 'Nut Allergy', color: '#FF9A3D' },
    { label: 'Shellfish Allergy', value: 'Shellfish Allergy', color: '#FF6B9D' },
    { label: 'Kosher', value: 'Kosher', color: '#B8A5C4' },
    { label: 'Halal', value: 'Halal', color: '#9261E5' },
    { label: 'Pescatarian', value: 'Pescatarian', color: '#4682B4' },
    { label: 'Keto', value: 'Keto', color: '#FF6B6B' },
    { label: 'Paleo', value: 'Paleo', color: '#A0522D' },
    { label: 'Low-Carb', value: 'Low-Carb', color: '#DDA15E' },
];

export default function PreferencesModal({
    visible,
    onClose,
    onSave,
    initialFavorites = '',
    initialDietary = '',
    saving = false
}) {
    const [selectedFoods, setSelectedFoods] = useState([]);
    const [selectedDietary, setSelectedDietary] = useState([]);
    const [customFoods, setCustomFoods] = useState([]);
    const [customDietary, setCustomDietary] = useState([]);

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

            dietaryArray.forEach(dietary => {
                const matchedOption = DIETARY_OPTIONS.find(opt => matchesOption(dietary, opt.value));
                if (matchedOption) {
                    recognizedDietary.push(matchedOption.value);
                } else {
                    unrecognizedDietary.push(dietary);
                }
            });

            setSelectedDietary(recognizedDietary);
            setCustomDietary(unrecognizedDietary);
        }
    }, [visible, initialFavorites, initialDietary]);

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

    const handleSave = () => {
        // Combine selected options with custom legacy values
        const allFoods = [...selectedFoods, ...customFoods];
        const allDietary = [...selectedDietary, ...customDietary];

        const favoritesString = allFoods.join(', ');
        const dietaryString = allDietary.join(', ');
        onSave(favoritesString, dietaryString);
    };

    const hasChanges = () => {
        const currentFavorites = [...selectedFoods, ...customFoods].join(', ');
        const currentDietary = [...selectedDietary, ...customDietary].join(', ');
        return currentFavorites !== initialFavorites || currentDietary !== initialDietary;
    };

    const removeCustomFood = (food) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomFoods(prev => prev.filter(f => f !== food));
    };

    const removeCustomDietary = (dietary) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setCustomDietary(prev => prev.filter(d => d !== dietary));
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
                    <Text style={styles.headerTitle}>Food Preferences</Text>
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

                    {/* Dietary Restrictions Section */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Dietary Restrictions & Allergies</Text>
                        <Text style={styles.sectionDesc}>Let us know about any dietary needs</Text>

                        <View style={styles.optionsGrid}>
                            {DIETARY_OPTIONS.map((option) => {
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

                    {/* Selection Summary */}
                    {(selectedFoods.length > 0 || selectedDietary.length > 0 || customFoods.length > 0 || customDietary.length > 0) && (
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
