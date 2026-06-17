import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';

const SocialButton = ({ label, color, onPress, loading = false, textColor = COLORS.white }) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: color }]}
    onPress={onPress}
    disabled={loading}
    activeOpacity={0.8}
  >
    {loading
      ? <ActivityIndicator color={textColor} />
      : <Text style={[styles.label, { color: textColor }]}>{label}</Text>
    }
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    borderRadius: 10,
    paddingVertical: 13,
    alignItems: 'center',
    marginBottom: 12,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
});

export default SocialButton;
