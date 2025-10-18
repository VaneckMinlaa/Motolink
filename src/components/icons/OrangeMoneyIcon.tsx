import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';

interface OrangeMoneyIconProps {
  size?: number;
  color?: string;
}

export default function OrangeMoneyIcon({ size = 40, color = '#FF6600' }: OrangeMoneyIconProps) {
  return (
    <View style={[styles.container, { width: size, height: size }]}>
      <MaterialIcons name="smartphone" size={size * 0.6} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF5F0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0CC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});