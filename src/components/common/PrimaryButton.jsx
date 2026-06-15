import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';

const PrimaryButton = ({ label, onPress, loading = false, disabled = false }) => (
  <TouchableOpacity
    style={[styles.button, (loading || disabled) ? styles.disabled : null]}
    onPress={onPress}
    disabled={loading || disabled}
    activeOpacity={0.8}
  >
    {loading
      ? <ActivityIndicator color={COLORS.white} />
      : <Text style={styles.label}>{label}</Text>
    }
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 12,
  },
  disabled: { opacity: 0.6 },
  label: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});

export default PrimaryButton;
