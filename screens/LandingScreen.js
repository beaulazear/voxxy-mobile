import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    SafeAreaView,
} from 'react-native';
import HeaderSvg from '../assets/header.svg';
import { useNavigation } from '@react-navigation/native';

export default function LandingScreen() {
    const navigation = useNavigation();

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.top}>
                <HeaderSvg width={260} height={60} />
                <Text style={styles.subtitle}>
                    As a beta user, you’ll get early access to new features, special perks, and a direct line to share feedback. Help shape the future of group planning as we grow and improve together.
                </Text>
            </View>

            <View style={styles.menu}>
                <TouchableOpacity
                    style={styles.bigButton}
                    onPress={() => navigation.navigate('Login')}
                >
                    <Text style={styles.bigButtonText}>Log In</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.bigButton, styles.signUpButton]}
                    onPress={() => navigation.navigate('SignUp')}
                >
                    <Text style={styles.bigButtonText}>Create New Account</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.bigButton, styles.tryVoxxyButton]}
                    onPress={() => navigation.navigate('TryVoxxy')}
                >
                    <Text style={styles.bigButtonText}>Try Voxxy Now</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#201925',
        justifyContent: 'center',
        paddingHorizontal: 32,
    },
    top: {
        alignItems: 'center',
        marginBottom: 20,
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 20,
        padding: 10,
    },
    menu: {
        width: '100%',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    bigButton: {
        width: '100%',
        backgroundColor: '#cc31e8',
        paddingVertical: 16,
        borderRadius: 50,
        alignItems: 'center',
        marginVertical: 8,
    },
    signUpButton: {
        backgroundColor: '#592566',
    },
    tryVoxxyButton: {
        backgroundColor: '#4a90e2',
    },
    bigButtonText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
    },
});