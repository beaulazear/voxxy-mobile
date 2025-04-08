import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
// import CustomHeader from '../components/CustomHeader';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
        {/* <CustomHeader /> */}
      <Text style={styles.text}>🏠 Home Screen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontSize: 22,
  },
});