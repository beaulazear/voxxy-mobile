// FormStyles.js - Optimized for Simplified Universal Design
import React from 'react'
import { StyleSheet, TouchableOpacity, View, Animated } from 'react-native'
import { LinearGradient } from 'expo-linear-gradient'

const colors = {
    primary: '#cc31e8',
    primaryDark: '#bb2fd0',
    secondary: '#9051e1',
    secondaryDark: '#8040d0',
    background: '#2a1e30',
    backgroundSecondary: '#342540',
    white: '#fff',
    textPrimary: '#fff',
    textSecondary: '#ccc',
    textMuted: '#aaa',
    border: 'rgba(255, 255, 255, 0.1)',
    borderFocus: '#cc31e8',
    cardBackground: 'rgba(255, 255, 255, 0.05)',
    cardBackgroundHover: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.6)',
    shadow: 'rgba(0, 0, 0, 0.4)',
    primaryShadow: 'rgba(204, 49, 232, 0.3)',
}

export const FormStyles = StyleSheet.create({
    // Modal Container Styles - Mobile Optimized
    modalContainer: {
        flex: 1,
        backgroundColor: colors.background,
    },

    modalOverlay: {
        flex: 1,
        backgroundColor: colors.overlay,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    modalContent: {
        backgroundColor: colors.background,
        borderRadius: 24,
        width: '100%',
        maxWidth: 500,
        maxHeight: '90%',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 1,
        shadowRadius: 40,
        elevation: 20,
    },

    // Progress Bar Styles - Enhanced
    progressBarContainer: {
        height: 6,
        backgroundColor: colors.border,
        width: '100%',
    },

    progressBar: {
        height: 6,
        backgroundColor: colors.primary,
        borderRadius: 3,
    },

    stepLabel: {
        paddingVertical: 20,
        paddingHorizontal: 24,
        fontSize: 13,
        color: colors.primary,
        textAlign: 'center',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },

    // Header Styles - Mobile Optimized
    modalHeader: {
        padding: 24,
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    title: {
        color: colors.textPrimary,
        fontSize: 26,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
        marginBottom: 8,
        lineHeight: 32,
    },

    subtitle: {
        color: colors.textSecondary,
        fontSize: 16,
        lineHeight: 24,
        opacity: 0.9,
    },

    // Content Styles - Optimized Spacing
    stepContent: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 16, // Reduced from 24 since no labels
    },

    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },

    section: {
        backgroundColor: colors.cardBackground,
        borderRadius: 20,
        padding: 24, // Increased for better touch targets
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: 20, // Reduced since no labels
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },

    lastSection: {
        marginBottom: 0,
    },

    // Enhanced Form Elements - No Labels Design
    input: {
        width: '100%',
        paddingVertical: 18, // Increased for better touch
        paddingHorizontal: 18,
        fontSize: 16,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.cardBackground,
        color: colors.textPrimary,
        marginBottom: 16,
        minHeight: 56, // Larger touch target
    },

    inputFocused: {
        borderColor: colors.borderFocus,
        backgroundColor: colors.cardBackgroundHover,
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    textarea: {
        width: '100%',
        paddingVertical: 18,
        paddingHorizontal: 18,
        fontSize: 16,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.cardBackground,
        color: colors.textPrimary,
        textAlignVertical: 'top',
        minHeight: 140, // Increased for better UX
        maxHeight: 220,
    },

    textareaFocused: {
        borderColor: colors.borderFocus,
        backgroundColor: colors.cardBackgroundHover,
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    // Enhanced Grid Layout - Better Responsive
    mobileGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 16, // Increased gap for cleaner look
    },

    mobileGridItem: {
        width: '47%', // Optimal for 2-column layout
        marginBottom: 0, // Gap handles spacing
        alignSelf: 'stretch',
    },

    mobileGridItemSingle: {
        width: '100%',
        marginBottom: 0,
        alignSelf: 'stretch',
    },

    // Enhanced Selection Cards - Larger & More Prominent
    selectionCard: {
        paddingVertical: 28, // Increased padding
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120, // Increased from 110
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },

    selectionCardSelected: {
        paddingVertical: 28,
        paddingHorizontal: 20,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 120,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
        elevation: 8,
    },

    cardIcon: {
        fontSize: 36, // Larger icons
        marginBottom: 10,
        lineHeight: 42,
    },

    cardLabel: {
        fontSize: 17, // Slightly larger
        fontWeight: '700',
        color: colors.textPrimary,
        textAlign: 'center',
        marginBottom: 4,
    },

    cardSubtitle: {
        fontSize: 13, // Slightly larger
        color: colors.textSecondary,
        textAlign: 'center',
        opacity: 0.8,
        lineHeight: 16,
    },

    // Enhanced Time Cards - Better Proportions
    timeCard: {
        paddingVertical: 24, // Increased
        paddingHorizontal: 20,
        borderRadius: 16,
        backgroundColor: colors.cardBackground,
        borderWidth: 2,
        borderColor: colors.border,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 85, // Increased from 70
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },

    timeCardSelected: {
        paddingVertical: 24,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 85,
        borderWidth: 2,
        borderColor: 'transparent',
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 6,
    },

    timeCardText: {
        fontSize: 16, // Increased
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
    },

    // Range Slider Styles - Optimized
    rangeLabel: {
        color: colors.primary,
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 12,
        textAlign: 'center',
    },

    rangeValue: {
        color: colors.primary,
        fontWeight: '700',
        fontSize: 20,
        textAlign: 'center',
        marginTop: 12,
        backgroundColor: colors.cardBackground,
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        alignSelf: 'center',
        minWidth: 80,
    },

    sliderContainer: {
        marginVertical: 12,
        paddingHorizontal: 8,
    },

    slider: {
        width: '100%',
        height: 40,
        marginVertical: 8,
    },

    // Enhanced Button Styles - Better Proportions
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 16, // Increased
        paddingHorizontal: 24,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        gap: 12, // Increased gap
    },

    buttonPrimary: {
        paddingVertical: 14, // Increased
        paddingHorizontal: 24,
        borderRadius: 14, // Slightly larger radius
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minWidth: 100,
        minHeight: 48, // Increased
        flex: 1,
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },

    buttonSecondary: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minWidth: 100,
        minHeight: 48,
        flex: 1,
        backgroundColor: colors.cardBackground,
        borderWidth: 2, // Increased border
        borderColor: colors.primary,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    buttonSecondaryDisabled: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'row',
        gap: 8,
        minWidth: 100,
        minHeight: 48,
        flex: 1,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 0.5,
    },

    buttonText: {
        fontSize: 15, // Slightly larger
        fontWeight: '600',
        textAlign: 'center',
    },

    buttonTextPrimary: {
        color: colors.white,
    },

    buttonTextSecondary: {
        color: colors.primary,
    },

    buttonTextSecondaryDisabled: {
        color: colors.textMuted,
    },

    buttonDisabled: {
        opacity: 0.5,
    },

    // Enhanced Special Buttons
    useLocationButton: {
        backgroundColor: 'rgba(204, 49, 232, 0.1)',
        borderWidth: 2,
        borderColor: 'rgba(204, 49, 232, 0.3)',
        paddingVertical: 18, // Increased
        paddingHorizontal: 24,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginBottom: 20,
        minHeight: 58, // Increased
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },

    useLocationButtonText: {
        color: colors.primary,
        fontSize: 16,
        fontWeight: '600',
    },

    // Toggle Switch - Enhanced
    toggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 8,
        paddingVertical: 8,
        gap: 16,
    },

    toggleWrapper: {
        width: 56,
        height: 30, // Slightly larger
        borderRadius: 15,
        backgroundColor: colors.border,
        justifyContent: 'center',
        position: 'relative',
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },

    toggleWrapperActive: {
        width: 56,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        position: 'relative',
        shadowColor: colors.primaryShadow,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 4,
    },

    toggleCircle: {
        position: 'absolute',
        width: 24, // Slightly larger
        height: 24,
        borderRadius: 12,
        backgroundColor: colors.white,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },

    toggleLabel: {
        fontSize: 16,
        color: colors.textPrimary,
        fontWeight: '500',
        flex: 1,
        lineHeight: 22,
    },

    // DateTimePicker Modal Styles
    pickerModalContent: {
        backgroundColor: colors.background,
        borderRadius: 20,
        marginHorizontal: 20,
        marginVertical: 50,
        borderWidth: 1,
        borderColor: colors.border,
        shadowColor: colors.shadow,
        shadowOffset: { width: 0, height: 20 },
        shadowOpacity: 0.3,
        shadowRadius: 30,
        elevation: 10,
    },

    pickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },

    pickerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
        textAlign: 'center',
    },

    pickerButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        minWidth: 60,
        alignItems: 'center',
    },

    pickerButtonText: {
        fontSize: 16,
        color: colors.primary,
        fontWeight: '500',
    },

    pickerButtonDone: {
        fontWeight: '600',
        color: colors.primary,
    },

    datePicker: {
        backgroundColor: colors.background,
        paddingBottom: 20,
    },

    dateTimePickerButton: {
        width: '100%',
        paddingVertical: 18,
        paddingHorizontal: 18,
        fontSize: 16,
        borderWidth: 2,
        borderColor: colors.border,
        borderRadius: 16,
        backgroundColor: colors.cardBackground,
        marginBottom: 16,
        minHeight: 56,
        justifyContent: 'center',
        alignItems: 'flex-start',
    },

    dateTimePickerText: {
        color: colors.textPrimary,
        fontSize: 16,
    },

    // Helper Styles
    flex1: {
        flex: 1,
    },

    centerText: {
        textAlign: 'center',
    },

    marginBottom: {
        marginBottom: 20,
    },

    marginTop: {
        marginTop: 20,
    },

    // Loading and States
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },

    loadingText: {
        color: colors.textSecondary,
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 24,
    },

    errorText: {
        color: '#ef4444',
        fontSize: 14,
        marginTop: 4,
        marginBottom: 8,
        textAlign: 'center',
    },

    successText: {
        color: '#10b981',
        fontSize: 14,
        marginTop: 4,
        marginBottom: 8,
        textAlign: 'center',
    },

    // Enhanced Date/Time Layouts
    dateTimeContainer: {
        marginBottom: 20,
    },

    dateTimeRow: {
        flexDirection: 'row',
        gap: 16,
    },

    dateTimeItem: {
        flex: 1,
    },

    // Form Groups
    formGroup: {
        marginBottom: 20,
    },

    formRow: {
        flexDirection: 'row',
        gap: 16,
        alignItems: 'flex-start',
    },

    formColumn: {
        flex: 1,
    },

    // Validation Styles
    inputError: {
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.05)',
    },

    inputSuccess: {
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.05)',
    },

    // Spacing Utilities
    spacingXS: { margin: 4 },
    spacingS: { margin: 8 },
    spacingM: { margin: 16 },
    spacingL: { margin: 24 },
    spacingXL: { margin: 32 },

    paddingXS: { padding: 4 },
    paddingS: { padding: 8 },
    paddingM: { padding: 16 },
    paddingL: { padding: 24 },
    paddingXL: { padding: 32 },
})

// Animation configurations
export const animations = {
    fadeIn: {
        duration: 300,
        useNativeDriver: true,
    },
    slideUp: {
        duration: 300,
        useNativeDriver: true,
    },
    bounce: {
        duration: 200,
        useNativeDriver: true,
    },
}

// Common gradients
export const gradients = {
    primary: ['#cc31e8', '#9051e1'],
    primaryDark: ['#bb2fd0', '#8040d0'],
    background: ['#2a1e30', '#342540'],
}

// Gradient configurations
export const gradientConfigs = {
    primary: {
        colors: gradients.primary,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
        angle: 135,
    },
    primaryDark: {
        colors: gradients.primaryDark,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
        angle: 135,
    },
    background: {
        colors: gradients.background,
        start: { x: 0, y: 0 },
        end: { x: 1, y: 1 },
        angle: 135,
    },
}

// Enhanced Helper Components
export const GradientButton = ({ children, style, onPress, disabled, variant = 'primary', ...props }) => {
    const config = gradientConfigs[variant] || gradientConfigs.primary

    return (
        <LinearGradient
            {...config}
            style={[FormStyles.buttonPrimary, style, disabled && FormStyles.buttonDisabled]}
        >
            <TouchableOpacity
                onPress={onPress}
                disabled={disabled}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    minHeight: 48,
                }}
                activeOpacity={0.8}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </LinearGradient>
    )
}

export const GradientCard = ({ children, style, onPress, selected, ...props }) => {
    if (!selected) {
        return (
            <TouchableOpacity
                style={[FormStyles.selectionCard, style]}
                onPress={onPress}
                activeOpacity={0.7}
                {...props}
            >
                {children}
            </TouchableOpacity>
        )
    }

    return (
        <LinearGradient
            {...gradientConfigs.primary}
            style={[FormStyles.selectionCardSelected, style]}
        >
            <TouchableOpacity
                onPress={onPress}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                }}
                activeOpacity={0.8}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </LinearGradient>
    )
}

export const GradientTimeCard = ({ children, style, onPress, selected, ...props }) => {
    if (!selected) {
        return (
            <TouchableOpacity
                style={[FormStyles.timeCard, style]}
                onPress={onPress}
                activeOpacity={0.7}
                {...props}
            >
                {children}
            </TouchableOpacity>
        )
    }

    return (
        <LinearGradient
            {...gradientConfigs.primary}
            style={[FormStyles.timeCardSelected, style]}
        >
            <TouchableOpacity
                onPress={onPress}
                style={{
                    flex: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '100%',
                }}
                activeOpacity={0.8}
                {...props}
            >
                {children}
            </TouchableOpacity>
        </LinearGradient>
    )
}

export const GradientToggle = ({ checked, onToggle, style, ...props }) => {
    const WrapperComponent = checked ? LinearGradient : View
    const wrapperProps = checked
        ? { ...gradientConfigs.primary, style: [FormStyles.toggleWrapperActive, style] }
        : { style: [FormStyles.toggleWrapper, style] }

    return (
        <TouchableOpacity onPress={onToggle} activeOpacity={0.7} {...props}>
            <WrapperComponent {...wrapperProps}>
                <Animated.View
                    style={[
                        FormStyles.toggleCircle,
                        { left: checked ? 28 : 3 } // Adjusted for larger toggle
                    ]}
                />
            </WrapperComponent>
        </TouchableOpacity>
    )
}

export default FormStyles