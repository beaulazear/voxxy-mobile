import React from 'react';
import RecommendationContent from './AIRecommendations/RecommendationContent';

/**
 * RecommendationDetails - Wrapper for DraggableBottomSheet content
 *
 * Used when user taps a map marker.
 * Simply wraps the shared RecommendationContent component.
 *
 * This file exists to maintain the existing API/interface
 * while using the new unified content component under the hood.
 */
const RecommendationDetails = ({
    recommendation,
    onClose,
    onFavorite,
    isFavorited = false,
    favoriteLoading = false,
    onFlag,
    isFlagged = false,
}) => {
    return (
        <RecommendationContent
            recommendation={recommendation}
            onFavorite={onFavorite}
            isFavorited={isFavorited}
            favoriteLoading={favoriteLoading}
            onFlag={onFlag}
            isFlagged={isFlagged}
            isGameNightActivity={false}
            showActions={true}
            showQuickActions={true}
        />
    );
};

export default RecommendationDetails;
