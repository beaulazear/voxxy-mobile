import { StyleSheet, Platform } from 'react-native';

// Minimum touch target sizes following Apple (44pt) and Google (48dp) guidelines
export const TOUCH_TARGETS = {
    MIN_SIZE: Platform.OS === 'ios' ? 44 : 48,
    COMFORTABLE_SIZE: 48,
    LARGE_SIZE: 56,
};

// Spacing constants for better separation between interactive elements
export const SPACING = {
    MIN_GAP: 8,         // Minimum gap between buttons
    COMFORTABLE_GAP: 12, // Comfortable gap between buttons
    SECTION_GAP: 20,     // Gap between sections
    FORM_GAP: 16,        // Gap between form elements
};

// Common accessible button styles
export const AccessibleButtons = StyleSheet.create({
    // Standard button with proper touch target
    button: {
        minHeight: TOUCH_TARGETS.COMFORTABLE_SIZE,
        minWidth: TOUCH_TARGETS.COMFORTABLE_SIZE,
        paddingVertical: 12,
        paddingHorizontal: 20,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 12,
    },
    
    // Large primary button (CTAs)
    primaryButton: {
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Icon-only button with expanded touch area
    iconButton: {
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        // Add padding to expand touch area beyond visual size
        padding: 10,
    },
    
    // Small icon button with invisible expanded touch area
    smallIconButton: {
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        // Negative margin to compensate for padding (keeps layout)
        margin: -8,
        padding: 8,
    },
    
    // Back/navigation button
    backButton: {
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: -8,  // Compensate for padding
        paddingLeft: 8,
        paddingRight: 8,
    },
    
    // Tab button with good touch area
    tabButton: {
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        paddingVertical: 12,
        paddingHorizontal: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Button group with proper spacing
    buttonGroup: {
        gap: SPACING.COMFORTABLE_GAP,
    },
    
    // Horizontal button group
    horizontalButtonGroup: {
        flexDirection: 'row',
        gap: SPACING.COMFORTABLE_GAP,
    },
});

// Accessible input field styles
export const AccessibleInputs = StyleSheet.create({
    // Standard text input with good touch area
    textInput: {
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 16,
        paddingHorizontal: 16,
        fontSize: 16,
        borderRadius: 12,
    },
    
    // Input container with icon/button
    inputContainer: {
        position: 'relative',
        marginBottom: SPACING.FORM_GAP,
    },
    
    // Eye/toggle button inside input
    inputToggleButton: {
        position: 'absolute',
        right: 4,
        top: '50%',
        transform: [{ translateY: -22 }],
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
    },
    
    // Input with right padding for toggle button
    inputWithToggle: {
        paddingRight: TOUCH_TARGETS.MIN_SIZE + 12,
    },
});

// List item styles with proper touch areas
export const AccessibleLists = StyleSheet.create({
    // List item with good touch area
    listItem: {
        minHeight: TOUCH_TARGETS.LARGE_SIZE,
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    
    // List item action buttons container
    listItemActions: {
        flexDirection: 'row',
        gap: SPACING.MIN_GAP,
        alignItems: 'center',
    },
    
    // Separator between list items
    separator: {
        height: 1,
        marginVertical: SPACING.MIN_GAP,
    },
});

// Modal and dialog styles
export const AccessibleModals = StyleSheet.create({
    // Close button in modal header
    closeButton: {
        minHeight: TOUCH_TARGETS.MIN_SIZE,
        minWidth: TOUCH_TARGETS.MIN_SIZE,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 10,
        margin: -10,  // Compensate for padding
    },
    
    // Modal action buttons
    modalActions: {
        flexDirection: 'row',
        gap: SPACING.COMFORTABLE_GAP,
        paddingTop: SPACING.SECTION_GAP,
    },
});

// Helper function to create accessible touch area
export const createTouchableArea = (visualSize, minSize = TOUCH_TARGETS.MIN_SIZE) => {
    const padding = Math.max(0, (minSize - visualSize) / 2);
    return {
        padding,
        margin: -padding,  // Compensate to maintain layout
    };
};

// Helper to ensure minimum height/width
export const ensureMinSize = (size, minSize = TOUCH_TARGETS.MIN_SIZE) => {
    return Math.max(size, minSize);
};