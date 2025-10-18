import { FontAwesome } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface CashIconProps {
  size?: number;
  color?: string;
}

export default function CashIcon({ size = 40, color = '#28a745' }: CashIconProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <FontAwesome name="money" size={size * 0.6} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0FFF4',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#C3E6CB',
    justifyContent: 'center',
    alignItems: 'center',
  },
});