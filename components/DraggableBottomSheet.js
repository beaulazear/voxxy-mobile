import React, { useRef, useEffect, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    Animated,
    PanResponder,
    Dimensions,
    StyleSheet,
    TouchableWithoutFeedback,
} from 'react-native';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = SCREEN_HEIGHT * 0.4; // 40% of screen
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.9; // 90% of screen
const HANDLE_HEIGHT = 60;
const SWIPE_THRESHOLD = 50;

export default function DraggableBottomSheet({
    visible,
    onClose,
    children,
    title = "Details"
}) {
    const translateY = useRef(new Animated.Value(0)).current;
    const [isExpanded, setIsExpanded] = useState(false);
    const scrollViewRef = useRef(null);
    const scrollOffset = useRef(0);
    const isExpandedRef = useRef(false); // Ref for PanResponder closure
    const [backdropReady, setBackdropReady] = useState(false); // Prevent immediate backdrop tap

    // Keep ref in sync with state
    useEffect(() => {
        isExpandedRef.current = isExpanded;
    }, [isExpanded]);

    useEffect(() => {
        if (visible) {
            // Show immediately in collapsed state
            setIsExpanded(false);
            isExpandedRef.current = false;
            translateY.setValue(0); // Set immediately, no animation
            setBackdropReady(true); // Enable immediately
        } else {
            // Animate out - move down by sheet height
            setBackdropReady(false);
            Animated.timing(translateY, {
                toValue: COLLAPSED_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const expandSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded(true);
        isExpandedRef.current = true;
        // No transform needed - just change height
    };

    const collapseSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setIsExpanded(false);
        isExpandedRef.current = false;
        // Reset scroll position when collapsing
        if (scrollViewRef.current) {
            scrollViewRef.current.scrollTo({ y: 0, animated: false });
        }
        scrollOffset.current = 0;
        // No transform needed - just change height
    };

    const closeSheet = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        setIsExpanded(false);
        isExpandedRef.current = false;
        scrollOffset.current = 0;
        Animated.timing(translateY, {
            toValue: COLLAPSED_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            if (onClose) onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                const { dy } = gestureState;
                return Math.abs(dy) > 5; // Only capture if moved more than 5 pixels
            },
            onPanResponderRelease: (_, gestureState) => {
                const { dy, vy } = gestureState;

                // Simple gesture detection
                if (dy > SWIPE_THRESHOLD || vy > 0.5) {
                    // Swiped down
                    if (isExpandedRef.current) {
                        collapseSheet();
                    } else {
                        closeSheet();
                    }
                } else if (dy < -SWIPE_THRESHOLD || vy < -0.5) {
                    // Swiped up
                    if (!isExpandedRef.current) {
                        expandSheet();
                    }
                }
            },
        })
    ).current;

    const handleScroll = (event) => {
        scrollOffset.current = event.nativeEvent.contentOffset.y;
    };

    if (!visible) return null;

    return (
        <View style={styles.overlay} pointerEvents="box-none">
            {/* Bottom Sheet */}
            <Animated.View
                style={[
                    styles.container,
                    {
                        height: isExpanded ? EXPANDED_HEIGHT : COLLAPSED_HEIGHT,
                        transform: [{ translateY }],
                    },
                ]}
            >
                {/* Draggable Handle Area */}
                <View {...panResponder.panHandlers} style={styles.handleContainer}>
                    <View style={styles.handle} />
                    <Text style={styles.title} numberOfLines={1}>{title}</Text>

                    {/* Tap to expand/collapse */}
                    <TouchableOpacity
                        style={styles.expandButton}
                        onPress={() => {
                            if (isExpanded) {
                                collapseSheet();
                            } else {
                                expandSheet();
                            }
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.expandButtonText}>
                            {isExpanded ? '−' : '+'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Scrollable Content */}
                <ScrollView
                    ref={scrollViewRef}
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={true}
                    scrollEnabled={true}
                    bounces={true}
                    onScroll={handleScroll}
                    scrollEventThrottle={16}
                    nestedScrollEnabled={true}
                >
                    {children}
                </ScrollView>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    backdrop: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: COLLAPSED_HEIGHT, // Don't cover the bottom sheet area!
        backgroundColor: '#000',
    },
    container: {
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#201925',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 20,
    },
    handleContainer: {
        height: HANDLE_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    },
    handle: {
        width: 40,
        height: 5,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 3,
        position: 'absolute',
        top: 12,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginTop: 8,
        paddingHorizontal: 60, // Space for button
    },
    expandButton: {
        position: 'absolute',
        right: 20,
        top: 14,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(147, 51, 234, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
        zIndex: 10,
    },
    expandButtonText: {
        fontSize: 24,
        fontWeight: '600',
        color: '#9333ea',
        lineHeight: 24,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 40,
    },
});
