import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput, Image,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { COLORS } from '../../constants/colors';
import { getCashbackVenues, submitCashbackClaim, formatAmount } from '../../lib/cashback';
import { uploadReceipt } from '../../lib/storage';
import { resizeForUpload } from '../../lib/imageResize';
import { useUser } from '../../contexts/UserContext';
import BackHeader from '../../components/common/BackHeader';
import GradientBorder from '../../components/common/GradientBorder';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const RECEIPT_MAX_EDGE = 1600;

const offersFor = (venue) => {
  if (!venue) return [];
  const list = [];
  if (Number(venue.credit_percent) > 0) list.push({ type: 'credit', label: t('rw.receipt.store_credit_at', 'Store credit at {{venue_name}}', { venue_name: venue.venue_name }), percent: Number(venue.credit_percent) });
  if (Number(venue.discount_percent) > 0) list.push({ type: 'discount', label: t('rw.receipt.discount_off_your_bill', 'Discount off your bill'), percent: Number(venue.discount_percent) });
  return list;
};

const SubmitReceiptScreen = ({ navigation }) => {
  useTranslation();
  const { profile } = useUser();
  const [venues, setVenues] = useState([]);
  const [loading, setLoading] = useState(true);
  const [venueId, setVenueId] = useState(null);
  const [rewardType, setRewardType] = useState(null);
  const [receiptUri, setReceiptUri] = useState(null);
  const [amount, setAmount] = useState('');
  const [picking, setPicking] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await getCashbackVenues();
    setVenues(data ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const venue = useMemo(() => venues.find((v) => v.venue_owner_id === venueId) ?? null, [venues, venueId]);
  const offers = useMemo(() => offersFor(venue), [venue]);

  const chooseVenue = (v) => {
    setVenueId(v.venue_owner_id);
    const list = offersFor(v);
    setRewardType(list.length === 1 ? list[0].type : null);
  };

  const currency = venue?.currency_code ?? null;
  const minSpend = Number(venue?.min_spend ?? 0);
  const isDiscount = rewardType === 'discount';
  const spend = parseFloat(amount);
  const chosen = offers.find((o) => o.type === rewardType);
  const reward = chosen && spend > 0 ? Math.round(spend * chosen.percent) / 100 : null;

  const capture = async (fromCamera) => {
    setPicking(true);
    try {
      if (fromCamera) {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert(t('rw.receipt.camera_needed', 'Camera needed'), t('rw.receipt.allow_camera_access_to_photo', 'Allow camera access to photograph your receipt.'));
          return;
        }
      }
      const options = { mediaTypes: ['images'], allowsEditing: false, quality: 0.8 };
      const result = fromCamera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      const uri = result.assets?.[0]?.uri;
      if (!result.canceled && uri) setReceiptUri(await resizeForUpload(uri, RECEIPT_MAX_EDGE));
    } finally {
      setPicking(false);
    }
  };

  const handleSubmit = async () => {
    if (!venue) return Alert.alert(t('rw.receipt.missing_info', 'Missing info'), t('rw.receipt.choose_the_venue_you_spent_a', 'Choose the venue you spent at.'));
    if (!rewardType) return Alert.alert(t('rw.receipt.missing_info', 'Missing info'), t('rw.receipt.choose_what_you_d_like_from_', 'Choose what you\'d like from this venue.'));
    if (!isDiscount && !receiptUri) return Alert.alert(t('rw.receipt.missing_info', 'Missing info'), t('rw.receipt.add_a_photo_of_your_receipt', 'Add a photo of your receipt.'));
    if (!spend || spend <= 0) return Alert.alert(t('rw.receipt.missing_info', 'Missing info'), isDiscount ? t('rw.receipt.enter_your_bill_total', 'Enter your bill total.') : t('rw.receipt.enter_the_total_on_your_rece', 'Enter the total on your receipt.'));
    if (spend < minSpend) return Alert.alert(t('rw.receipt.too_small', 'Too small'), t('rw.receipt.the_minimum_is', 'The minimum is {{currency}}.', { currency: formatAmount(minSpend, currency) }));

    setSubmitting(true);
    let path = null;
    if (receiptUri) {
      const upload = await uploadReceipt(profile.id, receiptUri);
      if (upload.error) {
        setSubmitting(false);
        return Alert.alert(t('rw.receipt.error', 'Error'), t('rw.receipt.could_not_upload_your_photo_', 'Could not upload your photo. Check your connection and try again.'));
      }
      path = upload.path;
    }
    const { error } = await submitCashbackClaim(venue.venue_owner_id, spend, path, rewardType);
    setSubmitting(false);
    if (error) return Alert.alert(t('rw.receipt.error', 'Error'), error.message ?? t('rw.receipt.could_not_send_this_please_t', 'Could not send this. Please try again.'));

    Alert.alert(t('rw.receipt.sent', 'Sent'),
      isDiscount
        ? t('rw.receipt.ask_to_confirm_your_discount', 'Ask {{venue_name}} to confirm your discount at the till — they\'ll get an alert.', { venue_name: venue.venue_name })
        : t('rw.receipt.will_check_your_receipt_you_', '{{venue_name}} will check your receipt. You\'ll get an alert once they confirm it.', { venue_name: venue.venue_name }),
    );
    navigation.goBack();
  };

  return (
    <KeyboardAvoidingView style={styles.safe} behavior="padding">
      <BackHeader title={t('rw.receipt.submit_a_receipt', 'Submit a Receipt')} onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.sectionLabel}>{t('rw.receipt.where_did_you_spend', 'Where did you spend?')}</Text>
        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 16 }} />
        ) : venues.length === 0 ? (
          <Text style={styles.empty}>{t('rw.receipt.no_venues_are_offering_rewar', 'No venues are offering rewards yet.')}</Text>
        ) : (
          venues.map((v) => {
            const selected = v.venue_owner_id === venueId;
            const parts = [];
            if (Number(v.credit_percent) > 0) parts.push(t('rw.receipt.store_credit', '{{credit_percent}}% store credit', { credit_percent: Number(v.credit_percent) }));
            if (Number(v.discount_percent) > 0) parts.push(t('rw.receipt.off_your_bill', '{{discount_percent}}% off your bill', { discount_percent: Number(v.discount_percent) }));
            return (
              <TouchableOpacity
                key={v.venue_owner_id}
                style={[styles.optionRow, selected && styles.optionRowSelected]}
                onPress={() => chooseVenue(v)}
                activeOpacity={0.8}
              >
                <View style={styles.optionText}>
                  <Text style={styles.optionTitle}>{v.venue_name}</Text>
                  <Text style={styles.optionDesc}>{parts.join(' · ')}</Text>
                </View>
                <Text style={styles.check}>{selected ? '●' : '○'}</Text>
              </TouchableOpacity>
            );
          })
        )}

        {offers.length > 1 && (
          <>
            <Text style={styles.sectionLabel}>{t('rw.receipt.what_would_you_like', 'What would you like?')}</Text>
            {offers.map((o) => {
              const selected = o.type === rewardType;
              const value = spend > 0 ? ` — ${formatAmount(Math.round(spend * o.percent) / 100, currency)}` : '';
              return (
                <TouchableOpacity
                  key={o.type}
                  style={[styles.optionRow, selected && styles.optionRowSelected]}
                  onPress={() => setRewardType(o.type)}
                  activeOpacity={0.8}
                >
                  <View style={styles.optionText}>
                    <Text style={styles.optionTitle}>{o.label}</Text>
                    <Text style={styles.optionDesc}>{o.percent}%{value}</Text>
                  </View>
                  <Text style={styles.check}>{selected ? '●' : '○'}</Text>
                </TouchableOpacity>
              );
            })}
          </>
        )}

        <Text style={styles.sectionLabel}>{isDiscount ? t('rw.receipt.photo_of_your_bill_optional', 'Photo of your bill (optional)') : t('rw.receipt.photograph_your_receipt', 'Photograph your receipt')}</Text>
        {receiptUri ? (
          <View>
            <Image source={{ uri: receiptUri }} style={styles.preview} resizeMode="contain" />
            <TouchableOpacity onPress={() => setReceiptUri(null)}>
              <Text style={styles.removeText}>{t('rw.receipt.retake', '✕ Retake')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.photoRow}>
            <TouchableOpacity style={styles.photoBtn} onPress={() => capture(true)} disabled={picking}>
              <Text style={styles.photoBtnText}>{picking ? t('rw.receipt.opening', 'Opening…') : t('rw.receipt.take_photo', '📷 Take photo')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.photoBtn} onPress={() => capture(false)} disabled={picking}>
              <Text style={styles.photoBtnText}>{t('rw.receipt.from_gallery', '🖼️ From gallery')}</Text>
            </TouchableOpacity>
          </View>
        )}

        <Text style={styles.sectionLabel}>{isDiscount ? t('rw.receipt.bill_total_before_discount', 'Bill total (before discount)') : t('rw.receipt.total_on_the_receipt', 'Total on the receipt')}</Text>
        <TextInput
          style={styles.input}
          value={amount}
          onChangeText={(v) => setAmount(v.replace(/[^0-9.]/g, ''))}
          placeholder={currency ? `Amount (${currency})` : 'Amount'}
          placeholderTextColor={COLORS.textMuted}
          keyboardType="decimal-pad"
        />
        <Text style={styles.hint}>
          {minSpend > 0 ? `Minimum ${formatAmount(minSpend, currency)}. ` : ''}
          {isDiscount ? t('rw.receipt.do_this_before_you_pay_the_v', 'Do this before you pay — the venue takes the discount off your bill.') : t('rw.receipt.the_venue_will_check_this_ag', 'The venue will check this against your photo.')}
        </Text>

        {reward != null && (
          <GradientBorder radius={14} style={styles.summaryOuter}>
            <View style={styles.summary}>
              <Text style={styles.summaryText}>
                {isDiscount
                  ? t('rw.receipt.you_ll_get_off_your_bill_onc', 'You\'ll get {{currency}} off your {{currency2}} bill once {{venue_name}} confirms.', { currency: formatAmount(reward, currency), currency2: formatAmount(spend, currency), venue_name: venue.venue_name })
                  : t('rw.receipt.you_ll_get_store_credit_at_o', 'You\'ll get {{currency}} store credit at {{venue_name}} once they confirm.', { currency: formatAmount(reward, currency), venue_name: venue.venue_name })}
              </Text>
            </View>
          </GradientBorder>
        )}

        <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color={COLORS.black} /> : <Text style={styles.submitBtnText}>{t('rw.receipt.send_to_venue', 'Send to venue')}</Text>}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 48 },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 18, marginBottom: 8,
  },
  empty: { fontSize: 14, color: COLORS.textMuted },
  optionRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  optionRowSelected: { borderColor: COLORS.borderAccent },
  optionText: { flex: 1 },
  optionTitle: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  optionDesc: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  check: { fontSize: 18, color: COLORS.primary },
  photoRow: { flexDirection: 'row', gap: 10 },
  photoBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 16, borderRadius: 12,
    borderWidth: 1.5, borderColor: COLORS.borderAccent, borderStyle: 'dashed',
    backgroundColor: 'rgba(253,171,83,0.04)',
  },
  photoBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.primary },
  preview: { width: '100%', height: 260, borderRadius: 12, backgroundColor: COLORS.surface },
  removeText: { fontSize: 13, fontWeight: '600', color: COLORS.error, marginTop: 8 },
  input: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 14, padding: 14, fontSize: 14, color: COLORS.text,
  },
  hint: { fontSize: 12, color: COLORS.textMuted, marginTop: 6, lineHeight: 17 },
  summaryOuter: { marginTop: 18 },
  summary: { backgroundColor: COLORS.surface, borderRadius: 13.5, padding: 14 },
  summaryText: { fontSize: 14, fontWeight: '700', color: COLORS.success, textAlign: 'center' },
  submitBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 15, alignItems: 'center', marginTop: 20,
  },
  submitBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
});

export default SubmitReceiptScreen;
