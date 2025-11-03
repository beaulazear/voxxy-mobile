import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { ChevronRight } from 'react-native-feather';
import { Pizza, Fish, Sandwich, Soup, Coffee, Beef, Salad, Wine, Beer, Martini } from 'lucide-react-native';

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

// Combine all dietary options for display
const ALL_DIETARY_OPTIONS = [...DIETARY_REQUIREMENTS, ...DIETARY_PREFERENCES];

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

export default function FoodPreferencesSection({ favoriteFood, preferences, barPreferences, onPress }) {
    return (
        <TouchableOpacity
            style={styles.sectionCard}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Food & Bar Preferences</Text>
                <ChevronRight stroke="#9261E5" width={20} height={20} strokeWidth={2} />
            </View>

            {favoriteFood || preferences || barPreferences ? (
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
                        const { matched, custom } = parsePreferences(preferences, ALL_DIETARY_OPTIONS);
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
                    {barPreferences && (() => {
                        const { matched, custom } = parsePreferences(barPreferences, BAR_OPTIONS);
                        return (
                            <View style={[styles.preferenceSection, (favoriteFood || preferences) && { marginTop: 16 }]}>
                                <Text style={styles.preferenceSectionLabel}>Bar Preferences</Text>
                                <View style={styles.preferencePillsContainer}>
                                    {matched.map((option, index) => {
                                        const IconComponent = option.icon;
                                        return (
                                            <View
                                                key={`bar-${index}`}
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
                                            key={`custom-bar-${index}`}
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
                    Tap to set your food and bar preferences
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
