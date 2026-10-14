import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert, Share, Platform,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { COLORS } from '../../constants/colors';
import {
  getMyVouchers, createVoucher, setVoucherActive, deleteVoucher,
  redeemVoucher, getVoucherStatus,
} from '../../lib/vouchers';
import { useUser } from '../../contexts/UserContext';
import { useVenueToolsGate } from '../../hooks/useVenueToolsGate';
import BackHeader from '../../components/common/BackHeader';
import GradientBorder from '../../components/common/GradientBorder';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const STATUS_LABEL = {
  valid: 'Active', inactive: 'Deactivated', expired: 'Expired', used_up: t('rw.venuevouchers.fully_redeemed', 'Fully redeemed'),
};
const STATUS_COLOR = {
  valid: COLORS.success, inactive: COLORS.textMuted, expired: COLORS.error, used_up: COLORS.error,
};

const VenueVouchersScreen = ({ navigation }) => {
  useTranslation();
  useVenueToolsGate();
  const { profile } = useUser();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueName, setVenueName] = useState('');
  const [discountLabel, setDiscountLabel] = useState('');
  const [maxRedemptions, setMaxRedemptions] = useState('');
  const [pointsPrice, setPointsPrice] = useState('');
  const [expiresAt, setExpiresAt] = useState(null);
  const [showPicker, setShowPicker] = useState(false);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const { data, error } = await getMyVouchers(profile.id);
    if (!error) setVouchers(data ?? []);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = async () => {
    if (!venueName.trim() || !discountLabel.trim()) {
      Alert.alert(t('rw.venuevouchers.missing_info', 'Missing info'), t('rw.venuevouchers.enter_a_venue_name_and_a_dis', 'Enter a venue name and a discount to give.'));
      return;
    }
    setCreating(true);
    const { data, error } = await createVoucher(profile.id, {
      venueName: venueName.trim(),
      discountLabel: discountLabel.trim(),
      expiresAt: expiresAt ? expiresAt.toISOString() : null,
      maxRedemptions: maxRedemptions.trim() ? parseInt(maxRedemptions, 10) : null,
      pointsPrice: pointsPrice.trim() ? parseInt(pointsPrice, 10) : null,
    });
    setCreating(false);
    if (error || !data) {
      Alert.alert(t('rw.venuevouchers.error', 'Error'), t('rw.venuevouchers.could_not_create_the_voucher', 'Could not create the voucher. Please try again.'));
      return;
    }
    setDiscountLabel('');
    setMaxRedemptions('');
    setPointsPrice('');
    setExpiresAt(null);
    setVouchers((prev) => [data, ...prev]);
  };

  const handleShare = (voucher) => {
    Share.share({
      message: t('rw.venuevouchers.gave_me_a_voucher_ncode_n_ns', '🎟️ {{venue_name}} gave me a voucher: {{discount_label}}\nCode: {{code}}\n\nShow this code at {{venue_name}} to redeem it.', { venue_name: voucher.venue_name, discount_label: voucher.discount_label, code: voucher.code }),
    });
  };

  const handleToggleActive = async (voucher) => {
    setBusyId(voucher.id);
    const { error } = await setVoucherActive(voucher.id, !voucher.is_active);
    setBusyId(null);
    if (!error) {
      setVouchers((prev) => prev.map((v) => (v.id === voucher.id ? { ...v, is_active: !v.is_active } : v)));
    }
  };

  const handleRedeem = (voucher) => {
    Alert.alert(t('rw.venuevouchers.mark_redeemed_2', 'Mark redeemed?'),
      t('rw.venuevouchers.record_one_redemption_of_thi', 'Record one redemption of "{{discount_label}}"? This can\'t be undone.', { discount_label: voucher.discount_label }),
      [
        { text: t('rw.venuevouchers.cancel', 'Cancel'), style: 'cancel' },
        { text: t('rw.venuevouchers.mark_redeemed', 'Mark redeemed'),
          onPress: async () => {
            setBusyId(voucher.id);
            const nextCount = voucher.redemption_count + 1;
            const { error } = await redeemVoucher(voucher.id, nextCount);
            setBusyId(null);
            if (!error) {
              setVouchers((prev) => prev.map((v) => (v.id === voucher.id ? { ...v, redemption_count: nextCount } : v)));
            }
          },
        },
      ],
    );
  };

  const handleDelete = (voucher) => {
    Alert.alert(t('rw.venuevouchers.delete_voucher', 'Delete voucher?'), t('rw.venuevouchers.this_permanently_removes_it_', 'This permanently removes it — the code will stop working.'), [
      { text: t('rw.venuevouchers.cancel', 'Cancel'), style: 'cancel' },
      { text: t('rw.venuevouchers.delete', 'Delete'),
        style: 'destructive',
        onPress: async () => {
          setBusyId(voucher.id);
          const { error } = await deleteVoucher(voucher.id);
          setBusyId(null);
          if (!error) setVouchers((prev) => prev.filter((v) => v.id !== voucher.id));
        },
      },
    ]);
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title={t('rw.venuevouchers.my_vouchers', 'My Vouchers')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('rw.venuevouchers.create_a_voucher', 'Create a Voucher')}</Text>
        <Text style={styles.sectionHint}>{t('rw.venuevouchers.hand_the_code_to_a_customer_', 'Hand the code to a customer in person — they can share it with friends from the app.')}</Text>

        <TextInput
          style={styles.input}
          value={venueName}
          onChangeText={setVenueName}
          placeholder={t('rw.venuevouchers.venue_name', 'Venue name')}
          placeholderTextColor={COLORS.textMuted}
        />
        <TextInput
          style={styles.input}
          value={discountLabel}
          onChangeText={setDiscountLabel}
          placeholder={t('rw.venuevouchers.e_g_20_off_your_bill_or_free', 'e.g. 20% off your bill, or Free coffee')}
          placeholderTextColor={COLORS.textMuted}
        />
        <TextInput
          style={styles.input}
          value={maxRedemptions}
          onChangeText={(v) => setMaxRedemptions(v.replace(/[^0-9]/g, ''))}
          placeholder={t('rw.venuevouchers.max_redemptions_optional_bla', 'Max redemptions (optional — blank = unlimited)')}
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
        />
        <TextInput
          style={styles.input}
          value={pointsPrice}
          onChangeText={(v) => setPointsPrice(v.replace(/[^0-9]/g, ''))}
          placeholder={t('rw.venuevouchers.points_price_optional_lists_', 'Points price (optional — lists it in the Rewards catalog)')}
          placeholderTextColor={COLORS.textMuted}
          keyboardType="number-pad"
        />

        <TouchableOpacity style={styles.input} onPress={() => setShowPicker(true)} activeOpacity={0.7}>
          <Text style={expiresAt ? styles.dateText : styles.datePlaceholder}>
            {expiresAt ? `Expires ${expiresAt.toLocaleDateString()}` : 'Expiry date (optional)'}
          </Text>
          {expiresAt && (
            <TouchableOpacity onPress={() => setExpiresAt(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.clearDate}>{t('rw.venuevouchers.clear', '✕ Clear')}</Text>
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {showPicker && (
          <DateTimePicker
            value={expiresAt ?? new Date()}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            minimumDate={new Date()}
            onChange={(event, selected) => {
              if (Platform.OS === 'android') setShowPicker(false);
              if (selected) setExpiresAt(selected);
            }}
          />
        )}
        {Platform.OS === 'ios' && showPicker && (
          <TouchableOpacity style={styles.doneBtn} onPress={() => setShowPicker(false)}>
            <Text style={styles.doneBtnText}>{t('rw.venuevouchers.done', 'Done')}</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.createBtn} onPress={handleCreate} disabled={creating}>
          {creating ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.createBtnText}>{t('rw.venuevouchers.create_voucher', 'Create Voucher')}</Text>}
        </TouchableOpacity>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>{t('rw.venuevouchers.your_vouchers', 'Your Vouchers')}</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 20 }} />
        ) : vouchers.length === 0 ? (
          <Text style={styles.empty}>{t('rw.venuevouchers.no_vouchers_yet', 'No vouchers yet.')}</Text>
        ) : (
          vouchers.map((voucher) => {
            const status = getVoucherStatus(voucher);
            const busy = busyId === voucher.id;
            return (
              <GradientBorder key={voucher.id} radius={16} style={styles.cardOuter}>
                <View style={styles.card}>
                  <View style={styles.cardTop}>
                    <Text style={styles.code}>{voucher.code}</Text>
                    <Text style={[styles.status, { color: STATUS_COLOR[status] }]}>{STATUS_LABEL[status]}</Text>
                  </View>
                  <Text style={styles.discount}>{voucher.discount_label}</Text>
                  {voucher.points_price != null && (
                    <Text style={styles.pointsBadge}>🏆 {voucher.points_price} pts in Rewards catalog</Text>
                  )}
                  <Text style={styles.meta}>{voucher.venue_name}</Text>
                  <Text style={styles.meta}>
                    {voucher.redemption_count} redeemed{voucher.max_redemptions != null ? ` / ${voucher.max_redemptions} max` : ''}
                    {voucher.expires_at ? ` · Expires ${new Date(voucher.expires_at).toLocaleDateString()}` : ''}
                  </Text>

                  <View style={styles.actions}>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleShare(voucher)} disabled={busy}>
                      <Text style={styles.actionText}>{t('rw.venuevouchers.share', 'Share')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionBtn}
                      onPress={() => handleRedeem(voucher)}
                      disabled={busy || status !== 'valid'}
                    >
                      {busy ? <ActivityIndicator size="small" color={COLORS.textMuted} /> : <Text style={styles.actionText}>{t('rw.venuevouchers.mark_redeemed', 'Mark redeemed')}</Text>}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.actionBtn} onPress={() => handleToggleActive(voucher)} disabled={busy}>
                      <Text style={styles.actionText}>{voucher.is_active ? t('rw.venuevouchers.deactivate', 'Deactivate') : t('rw.venuevouchers.activate', 'Activate')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={() => handleDelete(voucher)} disabled={busy}>
                      <Text style={styles.deleteText}>{t('rw.venuevouchers.delete', 'Delete')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </GradientBorder>
            );
          })
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 6,
  },
  sectionHint: { fontSize: 12, color: COLORS.textMuted, marginBottom: 14, lineHeight: 17 },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 14, padding: 14, marginBottom: 10,
    fontSize: 14, color: COLORS.text,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  dateText: { fontSize: 14, color: COLORS.text },
  datePlaceholder: { fontSize: 14, color: COLORS.textMuted },
  clearDate: { fontSize: 12, color: COLORS.error, fontWeight: '700' },
  doneBtn: { alignSelf: 'flex-end', marginBottom: 10 },
  doneBtnText: { color: COLORS.primary, fontWeight: '700', fontSize: 14 },
  createBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 6, marginBottom: 8,
  },
  createBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
  empty: { fontSize: 14, color: COLORS.textMuted, marginTop: 8 },
  cardOuter: { marginBottom: 14 },
  card: { backgroundColor: COLORS.surface, borderRadius: 14.5, padding: 16 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  code: { fontSize: 20, fontWeight: '800', color: COLORS.text, letterSpacing: 2 },
  status: { fontSize: 11, fontWeight: '800', letterSpacing: 0.5 },
  discount: { fontSize: 15, fontWeight: '700', color: COLORS.primary, marginBottom: 4 },
  pointsBadge: { fontSize: 11, fontWeight: '700', color: COLORS.success, marginBottom: 4 },
  meta: { fontSize: 12, color: COLORS.textMuted, marginBottom: 2 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  actionBtn: {
    borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.surfaceAlt,
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8,
  },
  actionText: { fontSize: 12, fontWeight: '700', color: COLORS.textLight },
  deleteBtn: { borderColor: COLORS.error },
  deleteText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
});

export default VenueVouchersScreen;
