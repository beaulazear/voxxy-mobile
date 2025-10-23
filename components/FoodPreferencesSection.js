import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import { Pizza, Fish, Sandwich, Soup, Coffee, Beef, Salad } from 'lucide-react-native';

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

// Helper to match preference strings
const matchesOption = (input, optionValue) => {
    const normalizedInput = input.toLowerCase().trim();
    const normalizedOption = optionValue.toLowerCase().trim();
    if (normalizedInput === normalizedOption) return true;
    const inputNoSpaces = normalizedInput.replace(/[-\s]/g, '');
    const optionNoSpaces = normalizedOption.replace(/[-\s]/g, '');
    return inputNoSpaces === optionNoSpaces;
};

// Parse comma-separated preferences
const parsePreferences = (prefsString, optionsArray) => {
    if (!prefsString) return { matched: [], custom: [] };

    const items = prefsString.split(',').map(item => item.trim()).filter(item => item.length > 0);
    const matched = [];
    const custom = [];

    items.forEach(item => {
        const matchedOption = optionsArray.find(opt => matchesOption(item, opt.value));
        if (matchedOption) {
            matched.push(matchedOption);
        } else {
            custom.push(item);
        }
    });

    return { matched, custom };
};

export default function FoodPreferencesSection({ favoriteFood, preferences, onPress }) {
    return (
        <TouchableOpacity
            style={styles.sectionCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Food Preferences</Text>
                <ChevronRight stroke="#9261E5" width={20} height={20} strokeWidth={2} />
            </View>

            {favoriteFood || preferences ? (
                <>
                    {favoriteFood && (() => {
                        const { matched, custom } = parsePreferences(favoriteFood, FOOD_OPTIONS);
                        return (
                            <View style={styles.preferenceSection}>
                                <Text style={styles.preferenceSectionLabel}>Favorites</Text>
                                <View style={styles.preferencePillsContainer}>
                                    {matched.map((option, index) => {
                                        const IconComponent = option.icon;
                                        return (
                                            <View
                                                key={`food-${index}`}
                                                style={[styles.preferencePill, { borderColor: option.color }]}
                                            >
                                                {IconComponent && (
                                                    <IconComponent
                                                        color={option.color}
                                                        size={16}
                                                        strokeWidth={2}
                                                    />
                                                )}
                                                <Text style={styles.preferencePillText}>{option.label}</Text>
                                            </View>
                                        );
                                    })}
                                    {custom.map((item, index) => (
                                        <View
                                            key={`custom-food-${index}`}
                                            style={[styles.preferencePill, styles.customPreferencePill]}
                                        >
                                            <Text style={styles.preferencePillText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })()}
                    {preferences && (() => {
                        const { matched, custom } = parsePreferences(preferences, DIETARY_OPTIONS);
                        return (
                            <View style={[styles.preferenceSection, favoriteFood && { marginTop: 16 }]}>
                                <Text style={styles.preferenceSectionLabel}>Dietary</Text>
                                <View style={styles.preferencePillsContainer}>
                                    {matched.map((option, index) => (
                                        <View
                                            key={`dietary-${index}`}
                                            style={[styles.preferencePill, { borderColor: option.color }]}
                                        >
                                            <Text style={styles.preferencePillText}>{option.label}</Text>
                                        </View>
                                    ))}
                                    {custom.map((item, index) => (
                                        <View
                                            key={`custom-dietary-${index}`}
                                            style={[styles.preferencePill, styles.customPreferencePill]}
                                        >
                                            <Text style={styles.preferencePillText}>{item}</Text>
                                        </View>
                                    ))}
                                </View>
                            </View>
                        );
                    })()}
                </>
            ) : (
                <Text style={styles.preferencesPlaceholder}>
                    Tap to set your food preferences
                </Text>
            )}
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    sectionCard: {
        backgroundColor: '#2A1E30',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(185, 84, 236, 0.15)',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
        flex: 1,
    },
    preferenceSection: {
        marginTop: 8,
    },
    preferenceSectionLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: '#9261E5',
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    preferencePillsContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    preferencePill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(146, 97, 229, 0.12)',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 16,
        borderWidth: 1.5,
        borderColor: '#9261E5',
        gap: 6,
    },
    customPreferencePill: {
        backgroundColor: 'rgba(184, 165, 196, 0.15)',
        borderColor: '#B8A5C4',
    },
    preferencePillText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
    },
    preferencesPlaceholder: {
        fontSize: 14,
        color: '#B8A5C4',
        fontStyle: 'italic',
    },
});
