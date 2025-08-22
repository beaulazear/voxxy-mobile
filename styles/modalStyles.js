import { StyleSheet } from 'react-native';

// Beautiful Dark Mode Purple Modal Styles
// Used in AIRecommendations component for Generate Recommendations modal
// Can be reused for other modals throughout the app

export const modalStyles = StyleSheet.create({
    // Main overlay when modal is open
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },

    // Main modal container with dark purple theme
    modalContainer: {
        width: '90%',
        maxWidth: 380,
        borderRadius: 24,
        overflow: 'hidden',
        backgroundColor: '#1A1625',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.4,
        shadowRadius: 20,
        elevation: 15,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },

    // Gradient background for modal header
    modalGradientBackground: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 110,
    },

    // Content wrapper
    modalContentWrapper: {
        backgroundColor: 'transparent',
    },

    // Close button styles
    modernCloseBtn: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 10,
    },

    closeBtnCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },

    // Icon styles
    modalIconWrapper: {
        alignSelf: 'center',
        marginTop: 60,
        marginBottom: -35,
        zIndex: 5,
    },

    iconCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 5,
    },

    // Main content area
    modalContent: {
        backgroundColor: '#1A1625',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        padding: 24,
        paddingTop: 40,
        alignItems: 'center',
    },

    // Typography
    modernTitle: {
        color: '#FFFFFF',
        fontSize: 26,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },

    modernDescription: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 24,
        paddingHorizontal: 16,
    },

    // Progress section styles
    modernProgressSection: {
        width: '100%',
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },

    progressHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },

    usersIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },

    progressLabel: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 14,
        fontWeight: '600',
    },

    modernProgressBarBg: {
        width: '100%',
        height: 8,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 12,
    },

    modernProgressFill: {
        height: '100%',
        borderRadius: 4,
    },

    progressInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },

    progressText: {
        color: 'rgba(255, 255, 255, 0.6)',
        fontSize: 13,
    },

    percentageBadge: {
        backgroundColor: 'rgba(168, 85, 247, 0.2)',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },

    percentageText: {
        color: '#A855F7',
        fontSize: 14,
        fontWeight: '700',
    },

    // Warning section styles
    modernWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(251, 191, 36, 0.1)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(251, 191, 36, 0.2)',
    },

    warningIconCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },

    modernWarningText: {
        color: '#FBBF24',
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
    },

    // Button styles
    buttonContainer: {
        flexDirection: 'row',
        width: '100%',
        gap: 12,
    },

    secondaryButton: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 12,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },

    secondaryButtonText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 15,
        fontWeight: '600',
        textAlign: 'center',
    },

    primaryButton: {
        flex: 1.5,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#8B5CF6',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },

    primaryButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },

    primaryButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});

// Color palette for reference
export const modalColors = {
    // Primary purple shades
    purple900: '#9333EA',
    purple800: '#7C3AED', 
    purple700: '#6B21A8',
    purple500: '#A855F7',
    purple400: '#C084FC',
    purple300: '#D8B4FE',  // Light purple for gradient
    
    // Background colors
    darkBg: '#1A1625',
    overlayBg: 'rgba(0, 0, 0, 0.85)',
    
    // Text colors
    textWhite: '#FFFFFF',
    textMuted: 'rgba(255, 255, 255, 0.7)',
    textDim: 'rgba(255, 255, 255, 0.6)',
    
    // Warning colors
    warningYellow: '#FBBF24',
    warningBg: 'rgba(251, 191, 36, 0.1)',
    
    // Gradient arrays for LinearGradient
    headerGradient: ['#9333EA', '#7C3AED', '#6B21A8'],
    iconGradient: ['#A855F7', '#9333EA'],
    progressGradient: ['#A855F7', '#7C3AED'],
    buttonGradient: ['#9333EA', '#7C3AED'],
};

// Example usage:
/*
import { modalStyles, modalColors } from '../styles/modalStyles';

// In your component:
<Modal visible={showModal} transparent animationType="fade">
    <SafeAreaView style={modalStyles.modalOverlay}>
        <Animated.View style={modalStyles.modalContainer}>
            <LinearGradient
                colors={modalColors.headerGradient}
                style={modalStyles.modalGradientBackground}
            />
            <View style={modalStyles.modalContent}>
                <Text style={modalStyles.modernTitle}>Your Title</Text>
                <Text style={modalStyles.modernDescription}>Your description</Text>
            </View>
        </Animated.View>
    </SafeAreaView>
</Modal>
*/