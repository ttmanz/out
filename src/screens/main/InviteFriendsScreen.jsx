import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Share } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { COLORS } from '../../constants/colors';
import { getMyReferralCode, getMyReferrals } from '../../lib/referrals';
import { getMyReferralStats } from '../../lib/agents';
import { formatAgo } from '../../utils/format';
import { useUser } from '../../contexts/UserContext';
import Avatar from '../../components/common/Avatar';
import BackHeader from '../../components/common/BackHeader';
import GradientBorder from '../../components/common/GradientBorder';
import i18n from '../../lib/i18n';
import { useTranslation } from 'react-i18next';
// Module-level translate helper so every helper component in this file can use t().
const t = (key, defaultValue, opts) => i18n.t(key, { defaultValue, ...opts });

const InviteFriendsScreen = ({ navigation }) => {
  useTranslation();
  const { profile } = useUser();
  const [code, setCode] = useState(null);
  const [referrals, setReferrals] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile?.id) return;
    setLoading(true);
    const [{ data: codeData }, { data: referralsData }, { data: statsData }] = await Promise.all([
      getMyReferralCode(profile.id),
      getMyReferrals(profile.id),
      getMyReferralStats(),
    ]);
    setCode(codeData?.referral_code ?? null);
    setReferrals(referralsData ?? []);
    setStats(Array.isArray(statsData) ? statsData[0] ?? null : statsData ?? null);
    setLoading(false);
  }, [profile?.id]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleShare = () => {
    Share.share({
      message: t('rw.invite.join_me_use_my_code', 'Join me on Find-Mee! Use my code {{code}} when you sign up and we both get bonus points. 🎉', { code: code }),
    });
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
      <BackHeader title={t('rw.invite.invite_friends', 'Invite Friends')} onBack={() => navigation.goBack()} />

      <GradientBorder radius={18} style={styles.codeOuter}>
        <View style={styles.codeCard}>
          <Text style={styles.codeLabel}>{t('rw.invite.your_referral_code', 'Your referral code')}</Text>
          <Text style={styles.codeValue}>{code}</Text>
          <Text style={styles.codeHint}>
            {stats
              ? t('rw.invite.they_get_points_when_they_jo', 'They get +{{welcome_bonus}} points when they join. You get +{{my_bonus}} points once they complete their profile.', { welcome_bonus: stats.welcome_bonus, my_bonus: stats.my_bonus })
              : t('rw.invite.share_your_code_you_both_get', 'Share your code — you both get bonus points.')}
          </Text>
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
            <Text style={styles.shareBtnText}>{t('rw.invite.share_your_code', 'Share your code')}</Text>
          </TouchableOpacity>
        </View>
      </GradientBorder>

      {stats && stats.agent_enabled && (
        <View style={styles.agentCard}>
          {stats.is_agent ? (
            <>
              <Text style={styles.agentTitle}>{t('rw.invite.you_re_an_agent', '⭐ You\'re an agent')}</Text>
              <Text style={styles.agentSub}>You earn +{stats.my_bonus} points for every friend who completes their profile.</Text>
            </>
          ) : (
            <>
              <Text style={styles.agentTitle}>{t('rw.invite.become_an_agent', 'Become an agent')}</Text>
              <Text style={styles.agentSub}>
                {stats.qualified_count} of {stats.referrals_required} friends have completed their profile. Reach {stats.referrals_required} to
                become an agent and earn better rewards.
              </Text>
              <View style={styles.agentBar}>
                <View style={[styles.agentBarFill, { width: `${Math.min(100, Math.round((stats.qualified_count / Math.max(1, stats.referrals_required)) * 100))}%` }]} />
              </View>
            </>
          )}
        </View>
      )}

      <FlatList
        data={referrals}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={<Text style={styles.sectionLabel}>Friends who joined ({referrals.length})</Text>}
        ListEmptyComponent={<Text style={styles.empty}>{t('rw.invite.no_one_yet_share_your_code_t', 'No one yet — share your code to start earning.')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Avatar uri={item.photo_url} name={item.full_name} size={38} backgroundColor={COLORS.primaryDark} style={styles.avatar} />
            <View style={styles.info}>
              <Text style={styles.name}>{item.full_name ?? '—'}</Text>
              <Text style={styles.time}>Joined {formatAgo(item.created_at)}</Text>
            </View>
            {item.profile_completed
              ? <Text style={styles.earned}>{t('rw.invite.counted', 'Counted ✓')}</Text>
              : <Text style={styles.waiting}>{t('rw.invite.waiting_for_their_profile', 'Waiting for their profile')}</Text>}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: COLORS.background },
  codeOuter: { margin: 20, marginBottom: 8 },
  codeCard: { backgroundColor: COLORS.surface, borderRadius: 16.5, padding: 22, alignItems: 'center' },
  codeLabel: { fontSize: 13, color: COLORS.textMuted, marginBottom: 6 },
  codeValue: { fontSize: 34, fontWeight: '800', color: COLORS.primary, letterSpacing: 4 },
  codeHint: { fontSize: 12, color: COLORS.textLight, textAlign: 'center', marginTop: 10, lineHeight: 17 },
  shareBtn: { backgroundColor: COLORS.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 16 },
  shareBtnText: { fontSize: 14, fontWeight: '800', color: COLORS.black },
  sectionLabel: {
    fontSize: 13, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginHorizontal: 20, marginTop: 16, marginBottom: 8,
  },
  list: { paddingBottom: 48 },
  empty: { fontSize: 13, color: COLORS.textMuted, marginHorizontal: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: COLORS.surface, borderRadius: 12, padding: 12,
    marginHorizontal: 20, marginBottom: 8, borderWidth: 1, borderColor: COLORS.border,
  },
  avatar: { marginRight: 10 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '600', color: COLORS.text },
  time: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  agentCard: {
    marginHorizontal: 20, marginBottom: 8, padding: 14, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.borderAccent,
  },
  agentTitle: { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  agentSub: { fontSize: 12, color: COLORS.textLight, lineHeight: 17 },
  agentBar: { height: 8, borderRadius: 4, backgroundColor: COLORS.surfaceAlt, marginTop: 10, overflow: 'hidden' },
  agentBarFill: { height: 8, borderRadius: 4, backgroundColor: COLORS.primary },
  waiting: { fontSize: 11, fontWeight: '600', color: COLORS.textMuted, maxWidth: 110, textAlign: 'right' },
  earned: { fontSize: 15, fontWeight: '800', color: COLORS.success },
});

export default InviteFriendsScreen;
