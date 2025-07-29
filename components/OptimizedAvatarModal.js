import React, { useState, useCallback, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Image,
    Modal,
    FlatList,
    ActivityIndicator,
} from 'react-native';
import { ArrowLeft } from 'react-native-feather';

// Memoized avatar item to prevent unnecessary re-renders
const AvatarItem = memo(({ item, onSelect, avatarMap }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    return (
        <TouchableOpacity
            style={styles.avatarOption}
            onPress={() => onSelect(item)}
            activeOpacity={0.7}
        >
            {loading && (
                <View style={[styles.avatarOptionImage, styles.loadingContainer]}>
                    <ActivityIndicator size="small" color="#CF38DD" />
                </View>
            )}
            {!error ? (
                <Image 
                    source={avatarMap[item]} 
                    style={[styles.avatarOptionImage, loading && styles.hidden]}
                    onLoad={() => setLoading(false)}
                    onError={() => {
                        setLoading(false);
                        setError(true);
                    }}
                    // Optimize image loading
                    resizeMode="cover"
                    // Add fade animation
                    fadeDuration={200}
                />
            ) : (
                <View style={[styles.avatarOptionImage, styles.errorContainer]}>
                    <Text style={styles.errorText}>Failed</Text>
                </View>
            )}
        </TouchableOpacity>
    );
});

export default function OptimizedAvatarModal({ 
    visible, 
    onClose, 
    onSelectAvatar, 
    avatarMap 
}) {
    const handleSelectAvatar = useCallback((avatar) => {
        onSelectAvatar(avatar);
    }, [onSelectAvatar]);

    const renderItem = useCallback(({ item }) => (
        <AvatarItem 
            item={item} 
            onSelect={handleSelectAvatar} 
            avatarMap={avatarMap}
        />
    ), [handleSelectAvatar, avatarMap]);

    const keyExtractor = useCallback((item) => item, []);

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <View style={styles.avatarModal}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>Choose Your Avatar</Text>
                        <TouchableOpacity 
                            style={styles.modalCloseButton}
                            onPress={onClose}
                        >
                            <ArrowLeft stroke="#CF38DD" width={20} height={20} strokeWidth={2} />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={Object.keys(avatarMap)}
                        numColumns={3}
                        keyExtractor={keyExtractor}
                        contentContainerStyle={styles.avatarGrid}
                        renderItem={renderItem}
                        // Optimize FlatList performance
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={6}
                        initialNumToRender={6}
                        windowSize={10}
                        getItemLayout={(data, index) => ({
                            length: 90, // height + margin
                            offset: 90 * Math.floor(index / 3),
                            index,
                        })}
                    />
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarModal: {
        backgroundColor: '#1C1525',
        borderRadius: 20,
        padding: 20,
        width: '85%',
        maxHeight: '70%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFFFFF',
    },
    modalCloseButton: {
        padding: 5,
    },
    avatarGrid: {
        paddingTop: 10,
    },
    avatarOption: {
        width: 70,
        height: 70,
        borderRadius: 35,
        margin: 10,
        overflow: 'hidden',
        backgroundColor: '#2C2438',
    },
    avatarOptionImage: {
        width: '100%',
        height: '100%',
        borderRadius: 35,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    errorContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#2C2438',
    },
    errorText: {
        color: '#666',
        fontSize: 10,
    },
    hidden: {
        opacity: 0,
    },
});