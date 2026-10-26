import React, { useState, useCallback } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import {
  getRecentCashbackClaims, getVenueOwners, getVenueCountries, getCountries, setVenueApproved,
  formatAmount, CLAIM_STATUS_LABEL, REWARD_LABEL,
} from '../../lib/cashback';
import { formatAgo } from '../../utils/format';
import BackHeader from '../../components/common/BackHeader';

// Admin: approve venues for rewards (store credit and discounts) and see recent receipts.
const AdminCashbackScreen = ({ navigation }) => {
  const [claims, setClaims] = useState([]);
  const [venues, setVenues] = useState([]);
  const [countryOf, setCountryOf] = useState({});
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: claimsData }, { data: venuesData }, { data: venueCountries }, { data: countriesData }] = await Promise.all([
      getRecentCashbackClaims(),
      getVenueOwners(),
      getVenueCountries(),
      getCountries(),
    ]);
    setVenues(venuesData ?? []);
    const names = Object.fromEntries((countriesData ?? []).map((c) => [c.code, `${c.name} · ${c.currency_code}`]));
    setCountryOf(Object.fromEntries((venueCountries ?? []).map((o) => [o.venue_owner_id, names[o.country_code] ?? o.country_code])));
    setClaims(claimsData ?? []);
    setLoading(false);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleVenue = (venue, approve) => {
    const name = venue.full_name ?? 'this venue';
    Alert.alert(
      approve ? `Approve ${name}?` : `Remove approval for ${name}?`,
      approve
        ? 'Customers will see this venue and can send it receipts. It will be able to confirm its customers\' rewards — only approve venues you trust.'
        : 'It will disappear from customers\' lists and can\'t confirm anything until approved again. Store credit customers already hold stays on their account.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Remove',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusyId(venue.id);
            const { error } = await setVenueApproved(venue.id, approve);
            setBusyId(null);
            if (error) {
              Alert.alert('Error', error.message ?? 'Could not update this venue.');
              return;
            }
            load();
          },
        },
      ],
    );
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.safe}>
      <BackHeader title="Rewards" onBack={() => navigation.goBack()} />

      <FlatList
        data={[]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={() => null}
        ListHeaderComponent={
          <>
            <Text style={styles.sectionLabel}>Venues ({venues.filter((v) => !v.venue_approved).length} waiting)</Text>
            <Text style={styles.sectionHint}>
              Anyone can sign up as a venue owner. A venue isn't listed to customers, and can't confirm receipts, until you approve it.
            </Text>
            {venues.length === 0 && <Text style={styles.empty}>No venue accounts yet.</Text>}
            {venues.map((v) => (
              <View key={v.id} style={styles.venueRow}>
                <View style={styles.activityText}>
                  <Text style={styles.name}>{v.full_name || 'Unnamed venue'}</Text>
                  <Text style={styles.time}>
                    {[v.city, v.phone, v.instagram ? `@${v.instagram}` : null].filter(Boolean).join(' · ') || 'No contact details'}
                  </Text>
                  <Text style={styles.time}>{countryOf[v.id] ?? 'No country chosen yet'} · Joined {formatAgo(v.created_at)}</Text>
                </View>
                {v.venue_approved ? (
                  <TouchableOpacity style={[styles.declineBtn, styles.venueBtn]} onPress={() => handleVenue(v, false)} disabled={busyId === v.id}>
                    <Text style={styles.declineBtnText}>Approved · Remove</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={[styles.payBtn, styles.venueBtn]} onPress={() => handleVenue(v, true)} disabled={busyId === v.id}>
                    {busyId === v.id ? <ActivityIndicator size="small" color={COLORS.black} /> : <Text style={styles.payBtnText}>Approve</Text>}
                  </TouchableOpacity>
                )}
              </View>
            ))}

            <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Recent Receipts</Text>
            {claims.length === 0 && <Text style={styles.empty}>Nothing yet.</Text>}
            {claims.map((c) => (
              <View key={c.id} style={styles.activityRow}>
                <View style={styles.activityText}>
                  <Text style={styles.activityName}>{c.member?.full_name ?? 'Member'} at {c.venue?.full_name ?? 'a venue'}</Text>
                  <Text style={styles.activityTime}>{CLAIM_STATUS_LABEL[c.status]} · {formatAgo(c.created_at)}</Text>
                </View>
                <Text style={[styles.activityAmount, c.status !== 'confirmed' && styles.activityAmountNegative]}>
                  {formatAmount(c.spend_amount, c.currency_code)} → {formatAmount(c.cashback_amount, c.currency_code)} {REWARD_LABEL[c.reward_type]}
                </Text>
              </View>
            ))}
          </>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 20, marginTop: 16, marginBottom: 8,
  },
  sectionHint: { fontSize: 12, color: COLORS.textLight, lineHeight: 17, marginHorizontal: 20, marginBottom: 12 },
  list: { paddingBottom: 48 },
  empty: { fontSize: 13, color: COLORS.textMuted, marginHorizontal: 20 },
  venueBtn: { flex: 0, paddingHorizontal: 14, marginLeft: 8 },
  venueRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    marginHorizontal: 20, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  name: { fontSize: 14, fontWeight: '700', color: COLORS.text },
  time: { fontSize: 11, color: COLORS.textMuted, marginTop: 2 },
  payBtn: { flex: 1, backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  payBtnText: { fontSize: 12, fontWeight: '800', color: COLORS.black },
  declineBtn: { flex: 1, borderWidth: 1, borderColor: COLORS.error, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  declineBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.error },
  activityRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: COLORS.surface, borderRadius: 10, padding: 12,
    marginHorizontal: 20, marginBottom: 6, borderWidth: 1, borderColor: COLORS.border,
  },
  activityText: { flex: 1 },
  activityName: { fontSize: 13, fontWeight: '700', color: COLORS.text },
  activityTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  activityAmount: { fontSize: 13, fontWeight: '800', color: COLORS.success },
  activityAmountNegative: { color: COLORS.error },
});

export default AdminCashbackScreen;
