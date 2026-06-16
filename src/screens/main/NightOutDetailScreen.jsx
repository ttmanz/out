import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getNightOut, updateRsvp } from '../../lib/nightOut';
import { formatAgo } from '../../utils/format';
import AdBanner from '../../components/common/AdBanner';
import ProfileBanner from '../../components/common/ProfileBanner';

const RSVP_OPTIONS = [
  { status: 'going', emoji: '✅', labelKey: 'nightOut.rsvpGoing' },
  { status: 'maybe', emoji: '🤔', labelKey: 'nightOut.rsvpMaybe' },
  { status: 'declined', emoji: '❌', labelKey: 'nightOut.rsvpDeclined' },
];
const STATUS_LABEL = { going: '✅ Going', maybe: '🤔 Maybe', declined: '❌ Declined', invited: '⏳ Invited' };

const NightOutDetailScreen = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { nightOutId } = route.params;
  const [myId, setMyId] = useState(null);
  const [plan, setPlan] = useState(null);
  const [loading, setLoading] = useState(true);
  const [rsvping, setRsvping] = useState(false);

  const load = useCallback(async () => {
    const { data: { session } } = await getSession();
    if (!session) return;
    setMyId(session.user.id);
    const { data, error } = await getNightOut(nightOutId);
    if (!error) setPlan(data);
    setLoading(false);
  }, [nightOutId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myMembership = plan?.members?.find((m) => m.user_id === myId);
  const isOrganizer = plan?.organizer_id === myId;

  const handleRsvp = async (status) => {
    if (!myMembership) return;
    setRsvping(true);
    const { error } = await updateRsvp(nightOutId, myId, status);
    if (error) Alert.alert(t('common.error'), t('nightOut.rsvpFailed'));
    else await load();
    setRsvping(false);
  };

  if (loading || !plan) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.purple} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.back}>
          <Text style={styles.backText}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{plan.title}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        <AdBanner page="NightOutDetail" />
        <ProfileBanner navigation={navigation} />
        <View style={styles.infoCard}>
          <Text style={styles.planTitle}>{plan.title}</Text>
          {!!plan.venue && <Text style={styles.planMeta}>📍 {plan.venue}</Text>}
          {!!plan.planned_at && <Text style={styles.planMeta}>🕐 {plan.planned_at}</Text>}
          {!!plan.description && <Text style={styles.planDesc}>{plan.description}</Text>}
          <Text style={styles.planOrganizer}>
            {isOrganizer
              ? t('nightOut.youOrganized')
              : `${t('nightOut.by')} ${plan.organizer?.full_name}`}
          </Text>
          <Text style={styles.planTime}>{formatAgo(plan.created_at)}</Text>
        </View>

        {myMembership && !isOrganizer && (
          <View style={styles.rsvpSection}>
            <Text style={styles.sectionLabel}>{t('nightOut.yourRsvp')}</Text>
            <Text style={styles.currentStatus}>{STATUS_LABEL[myMembership.status]}</Text>
            <View style={styles.rsvpRow}>
              {RSVP_OPTIONS.map(({ status, emoji, labelKey }) => (
                <TouchableOpacity
                  key={status}
                  style={[styles.rsvpBtn, myMembership.status === status && styles.rsvpBtnActive]}
                  onPress={() => handleRsvp(status)}
                  disabled={rsvping || myMembership.status === status}
                >
                  {rsvping && myMembership.status !== status
                    ? <ActivityIndicator size="small" color={COLORS.purple} />
                    : <Text style={styles.rsvpBtnText}>{emoji} {t(labelKey)}</Text>
                  }
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <Text style={styles.sectionLabel}>{t('nightOut.guestList')}</Text>
        {(plan.members ?? []).map((member) => (
          <View key={member.id} style={styles.memberRow}>
            <View style={styles.memberAvatar}>
              <Text style={styles.memberAvatarText}>
                {member.member?.full_name?.[0]?.toUpperCase() ?? '?'}
              </Text>
            </View>
            <Text style={styles.memberName}>{member.member?.full_name}</Text>
            <Text style={styles.memberStatus}>{STATUS_LABEL[member.status]}</Text>
          </View>
        ))}

        {plan.members?.length === 0 && (
          <Text style={styles.empty}>{t('nightOut.noGuests')}</Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    backgroundColor: COLORS.surface,
    borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  back: { width: 40, alignItems: 'flex-start' },
  backText: { fontSize: 30, color: COLORS.purple, lineHeight: 34 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: COLORS.text, textAlign: 'center' },
  scroll: { padding: 16, paddingBottom: 48 },
  infoCard: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 18, marginBottom: 14,
    borderWidth: 1.5, borderColor: COLORS.purpleBg,
    shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08, shadowRadius: 8, elevation: 2,
  },
  planTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginBottom: 8 },
  planMeta: { fontSize: 13, color: COLORS.textMuted, marginBottom: 4 },
  planDesc: { fontSize: 14, color: COLORS.text, marginTop: 8, marginBottom: 8, lineHeight: 20 },
  planOrganizer: { fontSize: 12, color: COLORS.purple, fontWeight: '600', marginTop: 8 },
  planTime: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
  rsvpSection: {
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 16, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.textMuted,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10, marginTop: 4,
  },
  currentStatus: { fontSize: 15, fontWeight: '700', color: COLORS.text, marginBottom: 12 },
  rsvpRow: { flexDirection: 'row', gap: 8 },
  rsvpBtn: {
    flex: 1, paddingVertical: 10, borderRadius: 10,
    borderWidth: 1.5, borderColor: COLORS.border,
    alignItems: 'center', backgroundColor: COLORS.background,
  },
  rsvpBtnActive: { borderColor: COLORS.purple, backgroundColor: COLORS.purpleBg },
  rsvpBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.text },
  memberRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border,
  },
  memberAvatar: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: COLORS.purple, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  memberAvatarText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  memberName: { flex: 1, fontSize: 14, fontWeight: '500', color: COLORS.text },
  memberStatus: { fontSize: 12, color: COLORS.textMuted },
  empty: { color: COLORS.textMuted, fontSize: 14, textAlign: 'center', marginTop: 20 },
});

export default NightOutDetailScreen;
