import { StyleSheet, Dimensions } from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default StyleSheet.create({
    container: {
        flex: 1,
    },

    // Photo Gallery
    photoGallery: {
        height: 240,
        marginBottom: 20,
        marginHorizontal: -16,
        position: 'relative',
    },
    photoContainer: {
        width: SCREEN_WIDTH,
        height: 240,
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    photoFallback: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photoFallbackText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 13,
        marginTop: 8,
    },
    noPhotoPlaceholder: {
        height: 240,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
        marginHorizontal: -16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    noPhotoText: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 14,
        marginTop: 8,
    },
    photoCounter: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    photoCounterText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '700',
    },
    paginationDots: {
        position: 'absolute',
        bottom: 12,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 6,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255, 255, 255, 0.4)',
    },
    dotActive: {
        width: 20,
        backgroundColor: '#9333ea',
    },

    // Section Titles
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        fontFamily: 'Montserrat_700Bold',
    },

    // Reason Section
    reasonSection: {
        marginBottom: 20,
    },
    reasonTags: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    reasonTag: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    reasonTagText: {
        color: '#e9d5ff',
        fontSize: 13,
        fontWeight: '600',
    },
    reasonText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 14,
        lineHeight: 22,
    },

    // Action Buttons
    actionButtonsRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    actionButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        borderWidth: 1,
    },
    actionButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    favoriteButton: {
        borderColor: 'rgba(212, 175, 55, 0.3)',
    },
    favoriteButtonActive: {
        borderColor: '#D4AF37',
    },
    flagButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    flagButtonActive: {
        backgroundColor: 'rgba(239, 68, 68, 0.15)',
        borderColor: '#ef4444',
    },
    flagButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        gap: 8,
    },
    actionButtonText: {
        color: '#D4AF37',
        fontSize: 14,
        fontWeight: '700',
    },
    actionButtonTextActive: {
        color: '#fff',
    },
    flagButtonTextActive: {
        color: '#ef4444',
    },

    // Info Badges
    badgesRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 20,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        gap: 6,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    badgeText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
    },

    // Quick Actions
    quickActionsSection: {
        marginBottom: 20,
    },
    quickActionsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    quickActionButton: {
        flex: 1,
        borderRadius: 12,
        overflow: 'hidden',
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    quickActionGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        gap: 6,
    },
    quickActionText: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '700',
    },

    // Details Section
    detailsSection: {
        marginBottom: 20,
    },
    detailsGrid: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.15)',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
    },
    detailIconWrapper: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(147, 51, 234, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    detailContent: {
        flex: 1,
    },
    detailLabel: {
        fontSize: 12,
        fontWeight: '600',
        color: 'rgba(255, 255, 255, 0.5)',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '500',
        color: 'rgba(255, 255, 255, 0.9)',
        lineHeight: 20,
    },
    hoursContainer: {
        gap: 4,
    },
    hoursRow: {
        flexDirection: 'row',
        gap: 8,
    },
    hoursDays: {
        color: '#B8A5C4',
        fontSize: 13,
        fontWeight: '600',
        minWidth: 80,
    },
    hoursTime: {
        color: 'rgba(255, 255, 255, 0.9)',
        fontSize: 13,
        fontWeight: '500',
        flex: 1,
    },

    // Description Section
    descriptionSection: {
        marginBottom: 20,
    },
    descriptionText: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 14,
        lineHeight: 22,
    },

    // Reviews Section
    reviewsSection: {
        marginBottom: 20,
    },
    reviewsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    reviewsCount: {
        fontSize: 13,
        color: 'rgba(255, 255, 255, 0.5)',
        fontWeight: '600',
    },
    reviewCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.15)',
    },
    reviewHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
    },
    reviewAuthorSection: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    reviewAvatar: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reviewAuthor: {
        fontSize: 14,
        fontWeight: '600',
        color: '#fff',
        flex: 1,
    },
    reviewRating: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(255, 215, 0, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    reviewRatingText: {
        fontSize: 12,
        color: '#FFD700',
        fontWeight: '700',
    },
    reviewText: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.75)',
        lineHeight: 20,
    },
    showMoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 12,
        gap: 8,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    showMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#9333ea',
    },

    // Bottom spacing
    bottomSpacing: {
        height: 40,
    },
});
