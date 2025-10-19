import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Share,
    Animated,
    Dimensions,
    Image,
    Platform,
    Alert,
} from 'react-native';
import { X, Copy, MessageCircle, Mail, Link as LinkIcon } from 'react-native-feather';
import { LinearGradient } from 'expo-linear-gradient';
import * as Clipboard from 'expo-clipboard';
import { logger } from '../utils/logger';

const { width } = Dimensions.get('window');

export default function ShareFavoriteModal({ visible, onClose, favorite }) {
    const [shareAnimation] = useState(new Animated.Value(0));
    const [copiedAnimation] = useState(new Animated.Value(0));
    const [showCopied, setShowCopied] = useState(false);

    React.useEffect(() => {
        if (visible) {
            Animated.spring(shareAnimation, {
                toValue: 1,
                useNativeDriver: true,
                tension: 50,
                friction: 7,
            }).start();
        } else {
            Animated.timing(shareAnimation, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    if (!favorite) return null;

    const title = favorite.title || favorite.name || favorite.activity_name || 'Unnamed Place';

    // Generate shareable link - this creates a proper Voxxy share URL
    const generateShareLink = () => {
        // Create a unique shareable URL for this favorite
        // This will deep link into the app or show a web preview
        // Use environment-based URL:
        // - Development/Staging: voxxyai.com
        // - Production: heyvoxxy.com
        const baseUrl = __DEV__
            ? 'https://www.voxxyai.com/share/favorite'
            : 'https://www.heyvoxxy.com/share/favorite';
        const shareId = favorite.id;

        // Encode the place data into URL params for rich preview
        const params = new URLSearchParams({
            name: title,
            address: favorite.address || '',
            lat: favorite.latitude || '',
            lng: favorite.longitude || '',
        });

        return `${baseUrl}/${shareId}?${params.toString()}`;
    };

    // Generate shareable content with personality
    const generateShareContent = () => {
        const voxxyLink = generateShareLink();

        // Create engaging, personal message
        let content = `💜 I found this gem on Voxxy and thought you'd love it!\n\n`;
        content += `✨ ${title}\n\n`;

        if (favorite.description) {
            // Truncate description if too long
            const desc = favorite.description.length > 100
                ? favorite.description.substring(0, 97) + '...'
                : favorite.description;
            content += `${desc}\n\n`;
        }

        if (favorite.address) {
            content += `📍 ${favorite.address}\n`;
        }

        if (favorite.price_range) {
            content += `💰 ${favorite.price_range}\n`;
        }

        // Add the Voxxy share link prominently
        content += `\n🔗 View on Voxxy:\n${voxxyLink}\n`;

        // Add map link as backup
        if (favorite.latitude && favorite.longitude) {
            const mapsUrl = Platform.select({
                ios: `https://maps.apple.com/?ll=${favorite.latitude},${favorite.longitude}&q=${encodeURIComponent(title)}`,
                android: `https://www.google.com/maps/search/?api=1&query=${favorite.latitude},${favorite.longitude}`,
            });
            content += `\n🗺️ Directions: ${mapsUrl}`;
        } else if (favorite.address) {
            const mapsUrl = Platform.select({
                ios: `https://maps.apple.com/?address=${encodeURIComponent(favorite.address)}`,
                android: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(favorite.address)}`,
            });
            content += `\n🗺️ Directions: ${mapsUrl}`;
        }

        return content;
    };

    const shareContent = generateShareContent();
    const shareLink = generateShareLink();

    const handleNativeShare = async () => {
        try {
            const result = await Share.share({
                message: shareContent,
                title: `Check out ${title}!`,
            });

            if (result.action === Share.sharedAction) {
                // Successfully shared
                logger.info('Favorite shared successfully');
                // Optional: Add analytics or feedback here
                setTimeout(() => {
                    onClose();
                }, 300);
            } else if (result.action === Share.dismissedAction) {
                // User dismissed the share dialog
                logger.info('Share dismissed by user');
            }
        } catch (error) {
            logger.error('Error sharing favorite:', error);
            Alert.alert('Error', 'Oops! Something went wrong while sharing. Please try again.');
        }
    };

    const handleCopyLink = async () => {
        try {
            // Copy just the Voxxy link (cleaner for sharing)
            await Clipboard.setStringAsync(shareLink);

            // Show copied feedback
            setShowCopied(true);
            Animated.sequence([
                Animated.timing(copiedAnimation, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(copiedAnimation, {
                    toValue: 0,
                    duration: 200,
                    delay: 1500,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowCopied(false);
            });
        } catch (error) {
            logger.error('Error copying to clipboard:', error);
            Alert.alert('Error', 'Failed to copy link');
        }
    };

    const handleCopyMessage = async () => {
        try {
            // Copy the full message with link
            await Clipboard.setStringAsync(shareContent);

            // Show copied feedback
            setShowCopied(true);
            Animated.sequence([
                Animated.timing(copiedAnimation, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
                Animated.timing(copiedAnimation, {
                    toValue: 0,
                    duration: 200,
                    delay: 1500,
                    useNativeDriver: true,
                }),
            ]).start(() => {
                setShowCopied(false);
            });
        } catch (error) {
            logger.error('Error copying to clipboard:', error);
            Alert.alert('Error', 'Failed to copy message');
        }
    };

    const modalScale = shareAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.8, 1],
    });

    const modalOpacity = shareAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 1],
    });

    const triangleRotate = shareAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const copiedScale = copiedAnimation.interpolate({
        inputRange: [0, 1],
        outputRange: [0.5, 1],
    });

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    activeOpacity={1}
                    onPress={onClose}
                />

                <Animated.View
                    style={[
                        styles.modalContainer,
                        {
                            transform: [{ scale: modalScale }],
                            opacity: modalOpacity,
                        },
                    ]}
                >
                    <LinearGradient
                        colors={['#2a1e2e', '#201925']}
                        style={styles.gradientContainer}
                    >
                        {/* Close Button */}
                        <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                            <X color="#fff" size={24} />
                        </TouchableOpacity>

                        {/* Voxxy Triangle with Animation */}
                        <Animated.View
                            style={[
                                styles.logoContainer,
                                {
                                    transform: [{ rotate: triangleRotate }],
                                },
                            ]}
                        >
                            <Image
                                source={require('../assets/voxxy-triangle.png')}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </Animated.View>

                        {/* Title */}
                        <Text style={styles.modalTitle}>Share this gem</Text>
                        <Text style={styles.placeName} numberOfLines={2}>
                            {title}
                        </Text>

                        {/* Shareable Link Highlight */}
                        <View style={styles.linkHighlight}>
                            <View style={styles.linkHeader}>
                                <LinkIcon color="#9333ea" size={16} />
                                <Text style={styles.linkLabel}>Your shareable link</Text>
                            </View>
                            <TouchableOpacity
                                style={styles.linkBox}
                                onPress={handleCopyLink}
                                activeOpacity={0.7}
                            >
                                <Text style={styles.linkText} numberOfLines={1}>
                                    {shareLink}
                                </Text>
                                <Copy color="#9333ea" size={16} />
                            </TouchableOpacity>
                        </View>

                        {/* Preview Content */}
                        <View style={styles.previewContainer}>
                            <Text style={styles.previewLabel}>Message Preview</Text>
                            <Text style={styles.previewText} numberOfLines={6}>
                                {shareContent}
                            </Text>
                        </View>

                        {/* Share Options */}
                        <View style={styles.shareOptions}>
                            <TouchableOpacity
                                style={styles.shareButton}
                                onPress={handleNativeShare}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#9333ea', '#7c3aed']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.shareButtonGradient}
                                >
                                    <MessageCircle color="#fff" size={20} />
                                    <Text style={styles.shareButtonText}>Share Now</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <View style={styles.copyButtonsRow}>
                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyLink}
                                    activeOpacity={0.8}
                                >
                                    <LinkIcon color="#3b82f6" size={16} />
                                    <Text style={styles.copyButtonText}>Copy Link</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={styles.copyButton}
                                    onPress={handleCopyMessage}
                                    activeOpacity={0.8}
                                >
                                    <Copy color="#10b981" size={16} />
                                    <Text style={styles.copyButtonText}>Copy All</Text>
                                </TouchableOpacity>
                            </View>
                        </View>

                        {/* Copied Feedback */}
                        {showCopied && (
                            <Animated.View
                                style={[
                                    styles.copiedFeedback,
                                    {
                                        transform: [{ scale: copiedScale }],
                                        opacity: copiedAnimation,
                                    },
                                ]}
                            >
                                <Text style={styles.copiedText}>✨ Copied to clipboard!</Text>
                            </Animated.View>
                        )}

                        {/* Footer Note */}
                        <Text style={styles.footerNote}>
                            Share your favorite spots with friends 💜
                        </Text>
                    </LinearGradient>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: Math.min(width - 40, 400),
        borderRadius: 24,
        overflow: 'hidden',
        elevation: 10,
        shadowColor: '#9333ea',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 16,
    },
    gradientContainer: {
        padding: 24,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.3)',
        borderRadius: 24,
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 20,
        marginTop: 10,
    },
    logo: {
        width: 80,
        height: 80,
    },
    modalTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#fff',
        textAlign: 'center',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    placeName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#9333ea',
        textAlign: 'center',
        marginBottom: 20,
        paddingHorizontal: 20,
    },
    linkHighlight: {
        backgroundColor: 'rgba(147, 51, 234, 0.1)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: 'rgba(147, 51, 234, 0.3)',
    },
    linkHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 10,
    },
    linkLabel: {
        color: '#9333ea',
        fontSize: 13,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    linkBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
        gap: 10,
    },
    linkText: {
        flex: 1,
        color: '#fff',
        fontSize: 13,
        fontWeight: '500',
    },
    previewContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: 'rgba(147, 51, 234, 0.2)',
    },
    previewLabel: {
        color: 'rgba(255, 255, 255, 0.5)',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 10,
    },
    previewText: {
        color: 'rgba(255, 255, 255, 0.7)',
        fontSize: 13,
        lineHeight: 19,
    },
    shareOptions: {
        gap: 12,
    },
    shareButton: {
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#9333ea',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    shareButtonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    shareButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    copyButtonsRow: {
        flexDirection: 'row',
        gap: 10,
    },
    copyButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.15)',
        gap: 8,
    },
    copyButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    copiedFeedback: {
        position: 'absolute',
        bottom: 20,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    copiedText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
        backgroundColor: 'rgba(34, 197, 94, 0.9)',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
        overflow: 'hidden',
    },
    footerNote: {
        color: 'rgba(255, 255, 255, 0.4)',
        fontSize: 12,
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },
});
