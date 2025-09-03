import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA'
    },
    
    // Loading and Error States
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA'
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
        fontWeight: '500'
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA'
    },
    errorText: {
        marginTop: 16,
        fontSize: 16,
        color: '#FF6B6B',
        fontWeight: '500'
    },
    
    // Map
    map: {
        flex: 1
    },
    
    // Map Controls
    mapControls: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 30,
        left: 0,
        right: 0,
        zIndex: 10,
        paddingHorizontal: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    categoryScroll: {
        flex: 1,
        marginRight: 10
    },
    categoryChip: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    categoryChipActive: {
        backgroundColor: '#748FFC',
        borderColor: '#748FFC'
    },
    categoryChipText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666'
    },
    categoryChipTextActive: {
        color: '#FFF'
    },
    
    // Map Type Toggle
    mapTypeToggle: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 20,
        padding: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3
    },
    mapTypeButton: {
        padding: 8,
        borderRadius: 18
    },
    mapTypeButtonActive: {
        backgroundColor: '#748FFC'
    },
    
    // Custom Marker
    markerContainer: {
        alignItems: 'center'
    },
    selectedMarker: {
        transform: [{ scale: 1.2 }]
    },
    markerBubble: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    markerIcon: {
        fontSize: 20
    },
    markerArrow: {
        width: 0,
        height: 0,
        borderLeftWidth: 8,
        borderRightWidth: 8,
        borderTopWidth: 12,
        borderStyle: 'solid',
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#748FFC',
        marginTop: -2
    },
    
    // Callout
    calloutContainer: {
        width: 250,
        padding: 12,
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5
    },
    calloutTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 4
    },
    calloutPrice: {
        fontSize: 14,
        color: '#748FFC',
        fontWeight: '500',
        marginBottom: 4
    },
    calloutDescription: {
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
        marginBottom: 8
    },
    calloutActions: {
        flexDirection: 'row',
        gap: 8
    },
    calloutButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#748FFC',
        paddingVertical: 8,
        paddingHorizontal: 12,
        borderRadius: 8,
        gap: 4
    },
    calloutButtonSecondary: {
        backgroundColor: '#F0F2F5',
        borderWidth: 1,
        borderColor: '#748FFC'
    },
    calloutButtonText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#FFF'
    },
    calloutButtonTextSecondary: {
        color: '#748FFC'
    },
    
    // Selected Place Card
    selectedCard: {
        position: 'absolute',
        bottom: 20,
        left: 16,
        right: 16,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 10
    },
    selectedCardClose: {
        position: 'absolute',
        top: 12,
        right: 12,
        zIndex: 1
    },
    selectedCardTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#1A1A1A',
        marginBottom: 12,
        paddingRight: 30
    },
    selectedCardRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 8,
        gap: 8
    },
    selectedCardText: {
        flex: 1,
        fontSize: 14,
        color: '#666',
        lineHeight: 20
    },
    selectedCardActions: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12
    },
    selectedCardButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#748FFC',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        gap: 8
    },
    selectedCardButtonSecondary: {
        flex: 0,
        backgroundColor: '#F0F2F5',
        borderWidth: 1,
        borderColor: '#748FFC',
        paddingHorizontal: 16
    },
    selectedCardButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#FFF'
    },
    
    // Results Count
    resultsCount: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 100 : 80,
        alignSelf: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16
    },
    resultsCountText: {
        fontSize: 12,
        fontWeight: '500',
        color: '#FFF'
    }
});