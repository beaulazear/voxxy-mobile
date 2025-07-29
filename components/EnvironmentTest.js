import React from 'react';
import { View, Text } from 'react-native';
import { API_URL, IS_DEVELOPMENT, APP_ENV } from '../config';

export const EnvironmentTest = () => {
  return (
    <View style={{ padding: 20 }}>
      <Text>Environment: {APP_ENV}</Text>
      <Text>API URL: {API_URL}</Text>
      <Text>Is Development: {IS_DEVELOPMENT ? 'Yes' : 'No'}</Text>
    </View>
  );
};