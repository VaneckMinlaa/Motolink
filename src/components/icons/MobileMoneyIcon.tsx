import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface MobileMoneyIconProps {
  size?: number;
  color?: string;
}

export default function MobileMoneyIcon({ size = 40, color = '#007BFF' }: MobileMoneyIconProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <Feather name="smartphone" size={size * 0.6} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F8FF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#CCE7FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});