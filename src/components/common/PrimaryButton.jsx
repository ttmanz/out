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
      ? <ActivityIndicator color={COLORS.black} />
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
  disabled: { opacity: 0.5 },
  label: { color: COLORS.black, fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});

export default PrimaryButton;
