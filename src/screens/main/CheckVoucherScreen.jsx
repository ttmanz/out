import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { COLORS } from '../../constants/colors';
import { getVoucherByCode, getVoucherStatus } from '../../lib/vouchers';
import BackHeader from '../../components/common/BackHeader';
import GradientBorder from '../../components/common/GradientBorder';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const STATUS_TEXT = {
  valid: t('rw.voucher.valid_show_this_to_staff_to_', 'Valid — show this to staff to redeem'),
  inactive: t('rw.voucher.this_voucher_is_no_longer_ac', 'This voucher is no longer active'),
  expired: t('rw.voucher.this_voucher_has_expired', 'This voucher has expired'),
  used_up: t('rw.voucher.this_voucher_has_already_bee', 'This voucher has already been fully redeemed'),
  not_found: "We couldn't find a voucher with that code",
};
const STATUS_COLOR = {
  valid: COLORS.success, inactive: COLORS.textMuted, expired: COLORS.error,
  used_up: COLORS.error, not_found: COLORS.error,
};

const CheckVoucherScreen = ({ navigation, route }) => {
  useTranslation();
  const [code, setCode] = useState(route?.params?.code ?? '');
  const [voucher, setVoucher] = useState(null);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async (value) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setLoading(true);
    const { data } = await getVoucherByCode(trimmed);
    setVoucher(data ?? null);
    setChecked(true);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (route?.params?.code) check(route.params.code);
  }, [route?.params?.code, check]);

  const status = checked ? getVoucherStatus(voucher) : null;

  return (
    <View style={styles.safe}>
      <BackHeader title={t('rw.voucher.check_a_voucher', 'Check a Voucher')} onBack={() => navigation.goBack()} />

      <View style={styles.body}>
        <Text style={styles.hint}>{t('rw.voucher.enter_the_code_a_friend_shar', 'Enter the code a friend shared with you to see if it\'s still valid.')}</Text>

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={code}
            onChangeText={(v) => setCode(v.toUpperCase())}
            placeholder={t('rw.voucher.code', 'CODE')}
            placeholderTextColor={COLORS.textMuted}
            autoCapitalize="characters"
            maxLength={10}
          />
          <TouchableOpacity style={styles.checkBtn} onPress={() => check(code)} disabled={loading || !code.trim()}>
            {loading ? <ActivityIndicator size="small" color={COLORS.black} /> : <Text style={styles.checkBtnText}>{t('rw.voucher.check', 'Check')}</Text>}
          </TouchableOpacity>
        </View>

        {checked && (
          <GradientBorder radius={16} style={styles.resultOuter}>
            <View style={styles.result}>
              {voucher ? (
                <>
                  <Text style={styles.discount}>{voucher.discount_label}</Text>
                  <Text style={styles.venue}>{voucher.venue_name}</Text>
                </>
              ) : null}
              <Text style={[styles.statusText, { color: STATUS_COLOR[status] }]}>{STATUS_TEXT[status]}</Text>
            </View>
          </GradientBorder>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  body: { padding: 20 },
  hint: { fontSize: 13, color: COLORS.textMuted, marginBottom: 16, lineHeight: 18 },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  input: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 14, padding: 14,
    fontSize: 18, fontWeight: '700', letterSpacing: 2, color: COLORS.text,
  },
  checkBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  checkBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 14 },
  resultOuter: { marginTop: 4 },
  result: { backgroundColor: COLORS.surface, borderRadius: 14.5, padding: 20, alignItems: 'center' },
  discount: { fontSize: 20, fontWeight: '800', color: COLORS.primary, textAlign: 'center', marginBottom: 4 },
  venue: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  statusText: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
});

export default CheckVoucherScreen;
