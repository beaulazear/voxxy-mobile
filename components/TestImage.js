import React from 'react';
import { View, Image } from 'react-native';
import Woman from '../assets/voxxy-triangle.png';

export default function TestImage() {
    return (
        <View
            style={{
                justifyContent: 'center',
                alignItems: 'center',
                backgroundColor: '#201925',
            }}
        >
            <Image
                source={Woman}
                style={{
                    width: 100,
                    height: 100,
                    marginBottom: 15,        // use margin instead of padding
                }}
                resizeMode="contain"     // ensures the PNG scales inside its box
            />
        </View>
    );
}