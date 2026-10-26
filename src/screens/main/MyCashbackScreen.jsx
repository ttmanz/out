import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet,
  ActivityIndicator, Alert, Modal,
} from 'react-native';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { ROUTES } from '../../constants/routes';
import {
  getMyCashbackClaims, cancelCashbackClaim, getMyVenueCredits, requestCreditRedemption,
  getMyPendingCreditRedemptions, cancelCreditRedemption,
  formatAmount, CLAIM_STATUS_LABEL, REWARD_LABEL,
} from '../../lib/cashback';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import BackHeader from '../../components/common/BackHeader';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const STATUS_COLOR = {
  pending: COLORS.textSecondary, confirmed: COLORS.success,
  rejected: COLORS.error, cancelled: COLORS.textMuted,
};

// A member's store credit, pending receipts and recent receipts. (Cash back and
// cash-outs were removed from the app — only store credit and discounts remain.)
const MyCashbackScreen = ({ navigation }) => {
  useTranslation();
  const { profile } = useUser();
  const [claims, setClaims] = useState([]);
  const [credits, setCredits] = useState([]);
  const [redemptions, setRedemptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creditTarget, setCreditTarget] = useState(null);
  const [creditDraft, setCreditDraft] = useState('');
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [claimsRes, creditsRes, redemptionsRes] = await Promise.all([
      getMyCashbackClaims(profile.id),
      getMyVenueCredits(),
      getMyPendingCreditRedemptions(profile.id),
    ]);
    if (!claimsRes.error) setClaims(claimsRes.data ?? []);
    if (!creditsRes.error) setCredits(creditsRes.data ?? []);
    if (!redemptionsRes.error) setRedemptions(redemptionsRes.data ?? []);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleUseCredit = async () => {
    const amount = parseFloat(creditDraft);
    if (!amount || amount <= 0) return Alert.alert(t('rw.mycashback.error', 'Error'), t('rw.mycashback.enter_a_positive_amount', 'Enter a positive amount.'));
    if (amount > Number(creditTarget.balance)) return Alert.alert(t('rw.mycashback.error', 'Error'), t('rw.mycashback.that_s_more_than_your_credit', 'That\'s more than your credit at this venue.'));
    setSaving(true);
    const { error } = await requestCreditRedemption(creditTarget.venue_owner_id, amount);
    setSaving(false);
    if (error) return Alert.alert(t('rw.mycashback.error', 'Error'), error.message ?? t('rw.mycashback.could_not_send_your_request_', 'Could not send your request. Please try again.'));
    setCreditTarget(null);
    load();
  };

  const handleCancel = async (id, cancelFn) => {
    setBusyId(id);
    const { error } = await cancelFn(id);
    setBusyId(null);
    if (error) return Alert.alert(t('rw.mycashback.error', 'Error'), error.message ?? t('rw.mycashback.could_not_cancel_this', 'Could not cancel this.'));
    load();
  };

  const pendingClaims = claims.filter((c) => c.status === 'pending');
  const doneClaims = claims.filter((c) => c.status !== 'pending').slice(0, 5);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title={t('rw.mycashback.rewards', 'Rewards')} onBack={() => navigation.goBack()} />

      <View style={styles.actionRow}>
        <TouchableOpacity style={[styles.primaryBtn, styles.actionHalf]} onPress={() => navigation.navigate(ROUTES.SUBMIT_RECEIPT)}>
          <Text style={styles.primaryBtnText}>{t('rw.mycashback.submit_receipt', '🧾 Submit receipt')}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <>
            {credits.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('rw.mycashback.store_credit', 'Store credit')}</Text>
                {credits.map((c) => (
                  <View key={c.venue_owner_id} style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.reason}>{c.venue_name}</Text>
                      <Text style={styles.time}>{t('rw.mycashback.spend_it_at_this_venue_only', 'Spend it at this venue only')}</Text>
                    </View>
                    <Text style={styles.credit}>{formatAmount(c.balance, c.currency_code)}</Text>
                    <TouchableOpacity
                      style={styles.useBtn}
                      onPress={() => { setCreditTarget(c); setCreditDraft(String(c.balance)); }}
                    >
                      <Text style={styles.useBtnText}>{t('rw.mycashback.use', 'Use')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {(pendingClaims.length > 0 || redemptions.length > 0) && (
              <>
                <Text style={styles.sectionLabel}>{t('rw.mycashback.waiting_for_a_venue', 'Waiting for a venue')}</Text>
                {pendingClaims.map((c) => (
                  <View key={c.id} style={styles.pendingRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.reason}>{c.venue?.full_name ?? 'Venue'} — {formatAmount(c.spend_amount, c.currency_code)} {c.reward_type === 'discount' ? 'bill' : 'receipt'}</Text>
                      <Text style={styles.time}>{formatAmount(c.cashback_amount, c.currency_code)} {REWARD_LABEL[c.reward_type]} · {formatAgo(c.created_at)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleCancel(c.id, cancelCashbackClaim)} disabled={busyId === c.id}>
                      <Text style={styles.cancelText}>{t('rw.mycashback.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
                {redemptions.map((r) => (
                  <View key={r.id} style={styles.pendingRow}>
                    <View style={styles.rowText}>
                      <Text style={styles.reason}>Using {formatAmount(r.amount, r.currency_code)} credit at {r.venue?.full_name ?? 'venue'}</Text>
                      <Text style={styles.time}>Ask the venue to confirm · {formatAgo(r.created_at)}</Text>
                    </View>
                    <TouchableOpacity onPress={() => handleCancel(r.id, cancelCreditRedemption)} disabled={busyId === r.id}>
                      <Text style={styles.cancelText}>{t('rw.mycashback.cancel', 'Cancel')}</Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </>
            )}

            {doneClaims.length > 0 && (
              <>
                <Text style={styles.sectionLabel}>{t('rw.mycashback.recent_receipts', 'Recent receipts')}</Text>
                {doneClaims.map((c) => (
                  <View key={c.id} style={styles.row}>
                    <View style={styles.rowText}>
                      <Text style={styles.reason}>{c.venue?.full_name ?? 'Venue'} — {formatAmount(c.spend_amount, c.currency_code)}</Text>
                      <Text style={styles.time}>{formatAmount(c.cashback_amount, c.currency_code)} {REWARD_LABEL[c.reward_type]} · {formatAgo(c.created_at)}</Text>
                    </View>
                    <Text style={[styles.statusBadge, { color: STATUS_COLOR[c.status] }]}>{CLAIM_STATUS_LABEL[c.status]}</Text>
                  </View>
                ))}
              </>
            )}
          </>
        }
        ListEmptyComponent={
          credits.length + claims.length + redemptions.length === 0
            ? <Text style={styles.empty}>{t('rw.mycashback.submit_a_receipt_from_a_part', 'Submit a receipt from a partner venue to earn store credit or a discount.')}</Text>
            : null
        }
        renderItem={() => null}
      />

      <Modal visible={!!creditTarget} transparent animationType="fade" onRequestClose={() => setCreditTarget(null)}>
        <KeyboardAvoidingView style={styles.modalBackdrop} behavior="padding">
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Use credit at {creditTarget?.venue_name}</Text>
            <Text style={styles.modalHint}>{t('rw.mycashback.ask_the_venue_to_confirm_on_', 'Ask the venue to confirm on their phone. Your credit is only spent once they do.')}</Text>

            <Text style={styles.modalLabel}>Amount (max {formatAmount(creditTarget?.balance, creditTarget?.currency_code)})</Text>
            <TextInput
              style={styles.modalInput}
              value={creditDraft}
              onChangeText={(v) => setCreditDraft(v.replace(/[^0-9.]/g, ''))}
              placeholder="e.g. 20"
              placeholderTextColor={COLORS.textMuted}
              keyboardType="decimal-pad"
            />

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.modalCancel} onPress={() => setCreditTarget(null)} disabled={saving}>
                <Text style={styles.modalCancelText}>{t('rw.mycashback.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirm} onPress={handleUseCredit} disabled={saving}>
                {saving
                  ? <ActivityIndicator color={COLORS.black} />
                  : <Text style={styles.modalConfirmText}>{t('rw.mycashback.ask_venue', 'Ask venue')}</Text>
                }
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  actionRow: { flexDirection: 'row', gap: 10, marginHorizontal: 20, marginTop: 20, marginBottom: 8 },
  actionHalf: { flex: 1 },
  primaryBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 13, alignItems: 'center' },
  primaryBtnText: { fontSize: 13, fontWeight: '800', color: COLORS.black },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 20, marginTop: 16, marginBottom: 8,
  },
  list: { paddingHorizontal: 20, paddingBottom: 40 },
  empty: { fontSize: 14, color: COLORS.textMuted, marginTop: 8, textAlign: 'center' },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  pendingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surfaceAlt, borderRadius: 12, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  rowText: { flex: 1 },
  reason: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  credit: { fontSize: 15, fontWeight: '800', color: COLORS.primary, marginHorizontal: 10 },
  useBtn: { backgroundColor: COLORS.primary, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 7 },
  useBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.black },
  cancelText: { fontSize: 12, fontWeight: '700', color: COLORS.error, marginLeft: 10 },
  statusBadge: { fontSize: 12, fontWeight: '800' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24 },
  modalCard: { backgroundColor: COLORS.surface, borderRadius: 16, padding: 20 },
  modalTitle: { fontSize: 16, fontWeight: '700', color: COLORS.text, marginBottom: 8 },
  modalHint: { fontSize: 12, color: COLORS.textLight, lineHeight: 17, marginBottom: 10 },
  modalLabel: { fontSize: 12, fontWeight: '700', color: COLORS.textMuted, marginBottom: 6, marginTop: 10 },
  modalInput: {
    borderWidth: 1, borderColor: COLORS.borderAccent, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10, fontSize: 14,
    color: COLORS.text, backgroundColor: COLORS.surfaceAlt,
  },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, borderWidth: 1, borderColor: COLORS.borderAccent },
  modalCancelText: { color: COLORS.textMuted, fontWeight: '700' },
  modalConfirm: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.primary },
  modalConfirmText: { color: COLORS.black, fontWeight: '800' },
});

export default MyCashbackScreen;
