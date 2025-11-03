import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Modal,
    SafeAreaView,
    StyleSheet,
    ScrollView,
} from 'react-native';
import { Icons } from '../../constants/featherIcons';
import * as Haptics from 'expo-haptics';
import RecommendationContent from './RecommendationContent';

/**
 * RecommendationDetailModal - Full-screen modal for detailed recommendation view
 *
 * Used when tapping a recommendation card in list/cards view.
 * Provides immersive full-screen experience with slide-up animation.
 *
 * For map markers, use DraggableBottomSheet instead.
 */
const RecommendationDetailModal = ({
    visible,
    recommendation,
    onClose,
    isGameNightActivity = false,
    activityText = {},
    // Flag management
    isFlagged = false,
    onFlagToggle,
    // Favorite management
    isFavorited = false,
    favoriteLoading = false,
    onFavorite,
}) => {
    const handleClose = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onClose();
    };

    if (!recommendation) return null;

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={handleClose}
        >
            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerContent}>
                        <Text style={styles.title} numberOfLines={2}>
                            {recommendation?.title || recommendation?.name}
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={handleClose}
                        activeOpacity={0.7}
                    >
                        <View style={styles.closeButtonCircle}>
                            <Icons.X color="#fff" size={20} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    bounces={true}
                >
                    <RecommendationContent
                        recommendation={recommendation}
                        onFavorite={onFavorite}
                        isFavorited={isFavorited}
                        favoriteLoading={favoriteLoading}
                        onFlag={onFlagToggle}
                        isFlagged={isFlagged}
                        isGameNightActivity={isGameNightActivity}
                        showActions={true}
                        showQuickActions={true}
                    />
                </ScrollView>
            </SafeAreaView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    safeArea: {
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
        gap: 12,
    },
    headerContent: {
        flex: 1,
    },
    title: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        fontFamily: 'Montserrat_700Bold',
    },
    closeButton: {
        padding: 4,
    },
    closeButtonCircle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 8,
        paddingBottom: 40,
    },
});

export default RecommendationDetailModal;
