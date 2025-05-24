import React, { useState, useContext } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Image,
    Alert,
    ScrollView,
} from 'react-native';
import { UserContext } from '../context/UserContext';
import Woman from '../assets/voxxy-triangle.png';
import { useNavigation } from '@react-navigation/native';
import { API_URL } from '../config';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ProfileScreen() {
    const { user, setUser } = useContext(UserContext);
    const navigation = useNavigation();
    const [isEditing, setIsEditing] = useState(false);
    const [newName, setNewName] = useState(user?.name || '');

    const token = user?.token;

    console.log('💬 User in ProfileScreen:', user);
    console.log('💬 Token in ProfileScreen:', token);

    const handleLogout = async () => {
        console.log("🚪 handleLogout called");
        try {
            await fetch(`${API_URL}/logout`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
            });
        } catch (error) {
            console.log("Server logout failed, proceeding anyway:", error);
        } finally {
            console.log("🧹 Removing token and logging out");
            await AsyncStorage.removeItem('jwt');
            setUser(null); // ✅ This switches back to LoginScreen via AppNavigator
            navigation.navigate('/'); // ✅ Forces to root
        }
    };

    const handleSave = () => {
        if (!newName.trim()) {
            Alert.alert('Error', 'Name cannot be empty.');
            return;
        }

        console.log(newName)

        fetch(`${API_URL}/users/${user.id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // ✅ CRITICAL
            },
            body: JSON.stringify({ name: newName }),
        })
            .then((res) => {
                if (!res.ok) throw new Error('Failed to update user');
                return res.json();
            })
            .then((updatedUser) => {
                setUser({ ...user, name: updatedUser.name });
                setIsEditing(false);
            })
            .catch((err) => {
                console.error('Update error:', err);
                Alert.alert('Error', 'Failed to update profile.');
            });
    };

    const handleDelete = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure? This cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        fetch(`${API_URL}/users/${user.id}`, {
                            method: 'DELETE',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`, // ✅ CRITICAL
                            },
                        })
                            .then((res) => {
                                if (!res.ok) throw new Error('Failed to delete account');
                                setUser(null);
                            })
                            .catch((err) => {
                                console.error('Delete error:', err);
                                Alert.alert('Error', 'Failed to delete account.');
                            });
                    },
                },
            ]
        );
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.profileCard}>
                <Image source={Woman} style={styles.avatar} />

                {isEditing ? (
                    <>
                        <TextInput
                            style={styles.input}
                            value={newName}
                            onChangeText={setNewName}
                            placeholder="Enter your name"
                            placeholderTextColor="#aaa"
                        />
                        <TouchableOpacity style={styles.button} onPress={handleSave}>
                            <Text style={styles.buttonText}>Save</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <Text style={styles.name}>{user?.name || 'User'}</Text>
                        <TouchableOpacity style={styles.button} onPress={() => setIsEditing(true)}>
                            <Text style={styles.buttonText}>Edit Name</Text>
                        </TouchableOpacity>
                    </>
                )}

                <TouchableOpacity style={styles.secondaryButton} onPress={handleLogout}>
                    <Text style={styles.secondaryText}>Log Out</Text>
                </TouchableOpacity>

                <Text style={styles.danger}>⚠️ Danger Zone ⚠️</Text>

                <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
                    <Text style={styles.buttonText}>Delete Account</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        paddingTop: 100,
        paddingBottom: 80,
        backgroundColor: '#201925',
        flexGrow: 1,
        alignItems: 'center',
    },
    profileCard: {
        backgroundColor: '#2A1E30',
        padding: 24,
        borderRadius: 20,
        alignItems: 'center',
        width: '90%',
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
        elevation: 10,
    },
    avatar: {
        width: 120,
        height: 120,
        marginBottom: 20,
    },
    name: {
        fontSize: 22,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 10,
    },
    danger: {
        fontSize: 22,
        fontWeight: '700',
        color: '#FF0000',
        marginBottom: 10,
        marginTop: 20,
    },
    input: {
        backgroundColor: '#fff',
        padding: 12,
        borderRadius: 10,
        fontSize: 16,
        marginBottom: 10,
        width: '100%',
    },
    button: {
        backgroundColor: '#4e0f63',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginTop: 10,
    },
    secondaryButton: {
        backgroundColor: '#aaa',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginTop: 20,
    },
    deleteButton: {
        backgroundColor: '#d11a2a',
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 10,
        marginTop: 10,
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
    secondaryText: {
        color: '#222',
        fontWeight: '600',
        fontSize: 16,
        textAlign: 'center',
    },
});