import React from 'react';
import { View, StyleSheet } from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const ICON_GRADIENT = ['#38BDF8', '#8A3FFC']; // Active Glow → Accent Glow
const RING_GRADIENT = ['#4FD9FF', '#295DFF', '#8A3FFC'];

// An Ionicon filled with a linear gradient.
export const GradientIcon = ({
  name,
  size = 24,
  colors = ICON_GRADIENT,
  start = { x: 0, y: 0 },
  end = { x: 1, y: 1 },
}) => (
  <MaskedView
    style={{ width: size, height: size }}
    maskElement={
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={name} size={size} color="#000" />
      </View>
    }
  >
    <LinearGradient colors={colors} start={start} end={end} style={{ width: size, height: size }} />
  </MaskedView>
);

// Gradient-filled icon inside a gradient-stroked circle with a dark glassy well.
export const GradientIconCircle = ({ name, size = 52, iconSize = 24, style }) => (
  <LinearGradient
    colors={RING_GRADIENT}
    start={{ x: 0, y: 0 }}
    end={{ x: 1, y: 1 }}
    style={[{ width: size, height: size, borderRadius: size / 2, padding: 1.5 }, styles.glow, style]}
  >
    <View style={[styles.well, { borderRadius: size / 2 - 1.5 }]}>
      <GradientIcon name={name} size={iconSize} />
    </View>
  </LinearGradient>
);

const styles = StyleSheet.create({
  glow: {
    shadowColor: '#38BDF8',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
  },
  well: {
    flex: 1,
    backgroundColor: 'rgba(5,11,45,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default GradientIcon;
