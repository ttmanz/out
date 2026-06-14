import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const AuthInput = ({ label, error, ...props }) => (
  <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={[styles.input, error ? styles.inputError : null]}
      placeholderTextColor={COLORS.textMuted}
      autoCapitalize="none"
      {...props}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 14, color: COLORS.text, marginBottom: 6, fontWeight: '500' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.backgroundDark,
  },
  inputError: { borderColor: COLORS.error },
  error: { fontSize: 12, color: COLORS.error, marginTop: 4 },
});

export default AuthInput;
