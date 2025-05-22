// screens/NoBoardsView.js
import React from 'react'
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Linking,
} from 'react-native'

export default function NoBoardsView() {
    const openWebApp = () => {
        Linking.openURL('https://www.voxxyai.com')
    }

    return (
        <View style={styles.container}>
            <Text style={styles.icon}>🗒️</Text>
            <Text style={styles.title}>No Boards Yet</Text>
            <Text style={styles.subtitle}>
                Looks like you haven’t planned anything yet. Get started by creating a new board on Voxxy Web!
            </Text>
            <TouchableOpacity
                style={styles.button}
                onPress={onCreatePress ?? openWebApp}
            >
                <Text style={styles.buttonText}>
                    {onCreatePress ? 'Create a Board' : 'Go to Voxxy Web'}
                </Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        minHeight: 200,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
        backgroundColor: '#0f0f14',
        borderRadius: 12,
        marginVertical: 16,
    },
    icon: {
        fontSize: 48,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        color: '#fff',
        fontWeight: '600',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        color: '#ccc',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
        maxWidth: 280,
    },
    button: {
        backgroundColor: '#b931d6',
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 24,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
})