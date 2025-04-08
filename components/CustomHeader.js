import React, { useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { UserContext } from '../context/UserContext';
import { Ionicons } from '@expo/vector-icons';

export default function CustomHeader({ title }) {
    const { user } = useContext(UserContext);
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <TouchableOpacity onPress={() => navigation.navigate('Home')}>
                <Text style={[styles.title, !user && styles.landing]}>
                    {title || 'Voxxy'}
                </Text>
            </TouchableOpacity>
            <View style={styles.menu}>
                {user ? (
                    <TouchableOpacity onPress={() => navigation.navigate('FAQ')}>
                        <Ionicons name="help-circle-outline" size={28} color="#000" />
                    </TouchableOpacity>
                ) : (
                    <>
                        <TouchableOpacity onPress={() => navigation.navigate('SignUp')}>
                            <Text style={styles.button}>Sign Up</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                            <Text style={styles.button}>Log In</Text>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderColor: '#eee',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: '#000',
    },
    landing: {
        color: '#6c63ff',
    },
    menu: {
        flexDirection: 'row',
        gap: 16,
    },
    button: {
        fontSize: 16,
        color: '#6c63ff',
        marginLeft: 16,
    },
});