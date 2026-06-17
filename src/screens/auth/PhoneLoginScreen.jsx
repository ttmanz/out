import React, { useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, Alert,
  TouchableOpacity, TextInput, ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { signInWithPhone, verifyPhoneOtp } from '../../lib/auth';

const PhoneLoginScreen = ({ navigation }) => {
  const { t } = useTranslation();
  const [phase, setPhase] = useState('phone'); // 'phone' | 'otp'
  const [phone, setPhone] = useState('+357');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSendCode = async () => {
    const trimmed = phone.trim();
    if (!/^\+\d{7,15}$/.test(trimmed)) {
      setError('Enter a valid phone number with country code, e.g. +35799123456');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await signInWithPhone(trimmed);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setPhase('otp');
    }
  };

  const handleVerify = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 6) {
      setError('Enter the 6-digit code from your SMS.');
      return;
    }
    setError('');
    setLoading(true);
    const { error: authError } = await verifyPhoneOtp(phone.trim(), trimmed);
    setLoading(false);
    if (authError) {
      setError(authError.message);
    }
    // on success onAuthStateChange fires and the app navigator switches automatically
  };

  const handleResend = async () => {
    setCode('');
    setError('');
    setLoading(true);
    const { error: authError } = await signInWithPhone(phone.trim());
    setLoading(false);
    if (authError) setError(authError.message);
    else Alert.alert('Code sent', 'A new code has been sent to ' + phone.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>📱</Text>
      <Text style={styles.heading}>
        {phase === 'phone' ? 'Your phone number' : 'Enter the code'}
      </Text>
      <Text style={styles.sub}>
        {phase === 'phone'
          ? 'We\'ll send a one-time code via SMS'
          : `Code sent to ${phone}`}
      </Text>

      {phase === 'phone' ? (
        <>
          <Text style={styles.label}>Phone number</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoFocus
            placeholder="+35799123456"
            placeholderTextColor={COLORS.textMuted}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.btn} onPress={handleSendCode} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.btnText}>Send code</Text>
            }
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.label}>6-digit code</Text>
          <TextInput
            style={[styles.input, styles.codeInput]}
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            maxLength={6}
            autoFocus
            placeholder="000000"
            placeholderTextColor={COLORS.textMuted}
          />
          {!!error && <Text style={styles.error}>{error}</Text>}
          <TouchableOpacity style={styles.btn} onPress={handleVerify} disabled={loading}>
            {loading
              ? <ActivityIndicator color={COLORS.black} />
              : <Text style={styles.btnText}>Verify</Text>
            }
          </TouchableOpacity>
          <TouchableOpacity style={styles.resendBtn} onPress={handleResend} disabled={loading}>
            <Text style={styles.resendText}>Didn't get a code? Resend</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.backBtn} onPress={() => { setPhase('phone'); setCode(''); setError(''); }}>
            <Text style={styles.backText}>← Change number</Text>
          </TouchableOpacity>
        </>
      )}

      <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.cancelText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, backgroundColor: COLORS.background, justifyContent: 'center' },
  title: { fontSize: 48, textAlign: 'center', marginBottom: 12 },
  heading: { fontSize: 26, fontWeight: '800', color: COLORS.text, textAlign: 'center', marginBottom: 6 },
  sub: { fontSize: 14, color: COLORS.textMuted, textAlign: 'center', marginBottom: 32, lineHeight: 20 },
  label: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8,
  },
  input: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 12,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16,
    color: COLORS.text, backgroundColor: COLORS.surface, marginBottom: 6,
  },
  codeInput: {
    fontSize: 28, fontWeight: '700', letterSpacing: 8, textAlign: 'center',
  },
  error: { fontSize: 13, color: COLORS.error, marginBottom: 12, marginTop: 2 },
  btn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 8, marginBottom: 12,
  },
  btnText: { color: COLORS.black, fontWeight: '800', fontSize: 16 },
  resendBtn: { alignItems: 'center', paddingVertical: 8 },
  resendText: { color: COLORS.primary, fontSize: 14, fontWeight: '600' },
  backBtn: { alignItems: 'center', paddingVertical: 8, marginTop: 4 },
  backText: { color: COLORS.textMuted, fontSize: 13 },
  cancelBtn: { alignItems: 'center', paddingVertical: 16, marginTop: 16 },
  cancelText: { color: COLORS.textMuted, fontSize: 14 },
});

export default PhoneLoginScreen;
