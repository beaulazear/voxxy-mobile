import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function FAQScreen() {
    return (
        <View style={styles.container}>
            <Text style={styles.text}>Frequently Asked Questions will go here!</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    text: {
        fontSize: 18,
        textAlign: 'center',
    },
});