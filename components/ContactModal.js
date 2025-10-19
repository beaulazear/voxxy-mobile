import React from 'react';
import {
    Modal,
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Linking,
    Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, ExternalLink, MessageCircle } from 'react-native-feather';
import { modalStyles, modalColors } from '../styles/modalStyles';
import VoxxyTriangle from '../assets/voxxy-triangle.png';

export default function ContactModal({ visible, onClose }) {
    const handleVisitWebApp = () => {
        Linking.openURL('https://www.heyvoxxy.com/#/contact');
        onClose();
    };

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={modalStyles.modalOverlay}>
                <View style={modalStyles.modalContainer}>
                    {/* Gradient Background */}
                    <LinearGradient
                        colors={modalColors.headerGradient}
                        style={modalStyles.modalGradientBackground}
                    />

                    {/* Close Button */}
                    <TouchableOpacity
                        style={modalStyles.modernCloseBtn}
                        onPress={onClose}
                    >
                        <View style={modalStyles.closeBtnCircle}>
                            <X stroke="#fff" width={18} height={18} />
                        </View>
                    </TouchableOpacity>

                    {/* Logo */}
                    <View style={styles.logoWrapper}>
                        <View style={styles.logoCircle}>
                            <Image
                                source={VoxxyTriangle}
                                style={styles.logo}
                                resizeMode="contain"
                            />
                        </View>
                    </View>

                    {/* Content */}
                    <View style={modalStyles.modalContent}>
                        <Text style={modalStyles.modernTitle}>Contact Us</Text>
                        <Text style={styles.description}>
                            Visit our web app to leave us a message or request, or stay here and continue using Voxxy.
                        </Text>

                        {/* Buttons */}
                        <View style={styles.buttonsContainer}>
                            <TouchableOpacity
                                style={styles.primaryButton}
                                onPress={handleVisitWebApp}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#B954EC', '#667eea']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.buttonGradient}
                                >
                                    <ExternalLink stroke="#fff" width={20} height={20} strokeWidth={2} />
                                    <Text style={styles.primaryButtonText}>Visit Web App</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryButton}
                                onPress={onClose}
                                activeOpacity={0.8}
                            >
                                <MessageCircle stroke="#B954EC" width={20} height={20} strokeWidth={2} />
                                <Text style={styles.secondaryButtonText}>Stay on App</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    logoWrapper: {
        alignSelf: 'center',
        marginTop: 40,
        marginBottom: -35,
        zIndex: 5,
    },
    logoCircle: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#ffffff',
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
    logo: {
        width: 40,
        height: 40,
    },
    description: {
        fontSize: 15,
        color: 'rgba(255, 255, 255, 0.75)',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 24,
        lineHeight: 22,
        paddingHorizontal: 8,
    },
    buttonsContainer: {
        width: '100%',
        gap: 12,
    },
    primaryButton: {
        width: '100%',
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#B954EC',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    buttonGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        gap: 10,
    },
    primaryButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        fontFamily: 'Montserrat_700Bold',
    },
    secondaryButton: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 14,
        backgroundColor: 'rgba(185, 84, 236, 0.1)',
        borderWidth: 1.5,
        borderColor: 'rgba(185, 84, 236, 0.3)',
        gap: 10,
    },
    secondaryButtonText: {
        color: '#B954EC',
        fontSize: 16,
        fontWeight: '600',
        fontFamily: 'Montserrat_600SemiBold',
    },
});
