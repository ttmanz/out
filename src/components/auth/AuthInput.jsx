import React from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../constants/colors';

const AuthInput = ({ label, error, multiline, ...props }) => (
  <View style={styles.wrapper}>
    {label ? <Text style={styles.label}>{label}</Text> : null}
    <TextInput
      style={[styles.input, error ? styles.inputError : null, multiline && styles.inputMultiline]}
      placeholderTextColor={COLORS.textMuted}
      autoCapitalize="none"
      multiline={multiline}
      textAlignVertical={multiline ? 'top' : 'auto'}
      {...props}
    />
    {error ? <Text style={styles.error}>{error}</Text> : null}
  </View>
);

const styles = StyleSheet.create({
  wrapper: { marginBottom: 16 },
  label: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 8, fontWeight: '600', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderAccent,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: COLORS.text,
    backgroundColor: COLORS.surface,
  },
  inputError: { borderColor: COLORS.error },
  inputMultiline: { height: 90 },
  error: { fontSize: 12, color: COLORS.error, marginTop: 4 },
});

export default AuthInput;
