import React from 'react';
import { View, Text, StyleSheet, StatusBar, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { ArrowLeft } from 'react-native-feather';
import { Ionicons } from '@expo/vector-icons';
import VoxxyFooter from '../components/VoxxyFooter';

export default function ComingSoonScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.safe} edges={['top']}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                    activeOpacity={0.7}
                >
                    <ArrowLeft stroke="#fff" width={24} height={24} strokeWidth={2} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Explore</Text>
                    <Text style={styles.headerSubtitle}>Discover new places</Text>
                </View>
                <View style={styles.headerSpacer} />
            </View>

            <View style={styles.container}>
                <View style={styles.iconContainer}>
                    <Ionicons name="globe" size={80} color="#9261E5" />
                </View>
                <Text style={styles.title}>Coming Soon</Text>
                <Text style={styles.description}>
                    We're working on something exciting! This feature will be available soon.
                </Text>
            </View>

            <VoxxyFooter />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    safe: {
        flex: 1,
        backgroundColor: '#201925',
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingTop: 20,
        backgroundColor: '#201925',
    },

    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },

    headerContent: {
        flex: 1,
    },

    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        fontFamily: 'Montserrat_700Bold',
    },

    headerSubtitle: {
        fontSize: 14,
        color: '#B8A5C4',
        fontWeight: '500',
    },

    headerSpacer: {
        width: 40,
    },

    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        paddingBottom: 100,
    },

    iconContainer: {
        width: 140,
        height: 140,
        borderRadius: 70,
        backgroundColor: 'rgba(146, 97, 229, 0.15)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 32,
        borderWidth: 2,
        borderColor: 'rgba(146, 97, 229, 0.3)',
    },

    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 16,
        fontFamily: 'Montserrat_700Bold',
    },

    description: {
        fontSize: 16,
        color: '#B8A5C4',
        textAlign: 'center',
        lineHeight: 24,
        fontWeight: '500',
    },
});
