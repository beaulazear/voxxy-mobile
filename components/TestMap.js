import React, { useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, Dimensions } from 'react-native';
import MapView, { Marker } from 'react-native-maps';

const { width, height } = Dimensions.get('window');
const mapsAvailable = true;

export default function TestMap() {
    const [debugInfo, setDebugInfo] = useState('');

    return (
        <View style={styles.container}>
            <Text style={styles.header}>Simple Map Test</Text>
            <Text style={styles.subHeader}>Screen: {width}x{height}</Text>
            
            <MapView
                style={{
                    width: width,
                    height: height * 0.7,
                    backgroundColor: 'blue'
                }}
                initialRegion={{
                    latitude: 37.78825,
                    longitude: -122.4324,
                    latitudeDelta: 0.0922,
                    longitudeDelta: 0.0421,
                }}
                onMapReady={() => {
                    console.log('Map is ready!');
                }}
                onMapLoaded={() => {
                    console.log('Map loaded!');
                }}
                onError={(e) => {
                    console.error('Map error:', e);
                }}
                mapType="standard"
                showsUserLocation={false}
                zoomEnabled={true}
                scrollEnabled={true}
            >
                <Marker
                    coordinate={{
                        latitude: 37.78825,
                        longitude: -122.4324
                    }}
                    title="Marker"
                    description="Test"
                />
            </MapView>
            
            <Button 
                title="Test Button" 
                onPress={() => Alert.alert('Button Works')}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        fontSize: 20,
        textAlign: 'center',
        padding: 10,
        backgroundColor: '#f0f0f0'
    },
    subHeader: {
        fontSize: 14,
        textAlign: 'center',
        padding: 5,
        color: '#666'
    }
});