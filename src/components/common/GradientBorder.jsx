import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const STROKE = ['#4FD9FF', '#295DFF', '#8A3FFC']; // cyan → blue → violet

// Wraps a card in the app's cyan→blue→violet gradient stroke (1.5px) with a
// soft blue glow. The child keeps its own background / padding; give it a
// borderRadius of `radius - 2` (or just omit and let this clip it).
const GradientBorder = ({ children, radius = 16, width = 1.5, glow = true, style, contentStyle, ...rest }) => (
  <LinearGradient
    colors={STROKE}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[{ borderRadius: radius, padding: width }, glow && styles.glow, style]}
    {...rest}
  >
    <View style={[{ borderRadius: radius - width, overflow: 'hidden' }, contentStyle]}>
      {children}
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 4,
  },
});

export default GradientBorder;
