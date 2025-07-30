import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator, Text } from 'react-native';
import { getAvatarSource } from '../utils/avatarManager';

// Safe wrapper for avatar images that handles errors gracefully
export default function SafeAvatarImage({ 
    source, 
    style, 
    fallbackAvatar = 'Avatar1.jpg',
    showLoading = true,
    ...props 
}) {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);
    const [imageSource, setImageSource] = useState(source);

    useEffect(() => {
        setImageSource(source);
        setError(false);
        setLoading(true);
    }, [source]);

    const handleError = () => {
        setError(true);
        setLoading(false);
        // Fallback to default avatar
        setImageSource(getAvatarSource(fallbackAvatar));
    };

    const handleLoad = () => {
        setLoading(false);
        setError(false);
    };

    return (
        <View style={[style, { backgroundColor: error ? '#2C2438' : 'transparent' }]}>
            {loading && showLoading && (
                <View style={[style, { position: 'absolute', justifyContent: 'center', alignItems: 'center' }]}>
                    <ActivityIndicator size="small" color="#CF38DD" />
                </View>
            )}
            
            <Image
                {...props}
                source={imageSource}
                style={[style, loading && { opacity: 0 }]}
                onError={handleError}
                onLoad={handleLoad}
                defaultSource={getAvatarSource(fallbackAvatar)}
            />
            
            {error && (
                <View style={[style, { position: 'absolute', justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ color: '#666', fontSize: 10 }}>Failed</Text>
                </View>
            )}
        </View>
    );
}