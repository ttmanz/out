import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  ActivityIndicator, Alert, ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../../constants/colors';
import { getSession } from '../../lib/auth';
import { getSubscriptionPlans, activateSubscription, subscriptionStatus } from '../../lib/subscription';
import { useUser } from '../../contexts/UserContext';
import BackHeader from '../../components/common/BackHeader';

const SubscriptionScreen = ({ navigation, standalone = false }) => {
  const { t } = useTranslation();
  const { profile, refreshProfile } = useUser();
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [subscribing, setSubscribing] = useState(null);

  const status = subscriptionStatus(profile);

  useEffect(() => {
    getSession().then(({ data: { session } }) => {
      if (session) setUserId(session.user.id);
    });
    getSubscriptionPlans().then(({ data, error }) => {
      if (!error) setPlans(data ?? []);
      setLoading(false);
    });
  }, []);

  const handleSubscribe = async (plan) => {
    if (!userId) return;
    Alert.alert(
      t('subscription.confirmTitle'),
      t('subscription.confirmBody', { plan: plan.label, price: plan.price_display }),
      [
        { text: t('common.cancel') ?? 'Cancel', style: 'cancel' },
        {
          text: t('subscription.confirm'),
          onPress: async () => {
            setSubscribing(plan.id);
            const { error } = await activateSubscription(userId, plan.id, plan.duration_months);
            setSubscribing(null);
            if (error) {
              Alert.alert(t('common.error'), error.message);
            } else {
              await refreshProfile();
              if (!standalone && navigation) navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const statusBanner = () => {
    if (!profile) return null;
    if (status.isOnTrial && status.daysLeft > 0) {
      return (
        <View style={styles.trialBanner}>
          <Text style={styles.trialTitle}>🎉 {t('subscription.trialActive')}</Text>
          <Text style={styles.trialSub}>
            {t('subscription.trialDaysLeft', { days: status.daysLeft })}
          </Text>
        </View>
      );
    }
    if (status.isActive) {
      return (
        <View style={[styles.trialBanner, styles.activeBanner]}>
          <Text style={styles.trialTitle}>✅ {t('subscription.activeTitle')}</Text>
          <Text style={styles.trialSub}>
            {t('subscription.activeDaysLeft', { days: status.daysLeft })}
          </Text>
        </View>
      );
    }
    return (
      <View style={[styles.trialBanner, styles.expiredBanner]}>
        <Text style={styles.trialTitle}>⚠️ {t('subscription.expiredTitle')}</Text>
        <Text style={styles.trialSub}>{t('subscription.expiredSub')}</Text>
      </View>
    );
  };

  return (
    <View style={styles.safe}>
      <BackHeader
        title={t('subscription.title')}
        onBack={!standalone && navigation ? () => navigation.goBack() : undefined}
      />

      <ScrollView contentContainerStyle={styles.scroll}>
        {statusBanner()}

        <Text style={styles.sectionLabel}>{t('subscription.choosePlan')}</Text>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
        ) : (
          plans.map((plan) => {
            const isCurrentPlan = status.isActive && status.planId === plan.id;
            return (
              <View key={plan.id} style={[styles.planCard, isCurrentPlan && styles.planCardActive]}>
                <View style={styles.planHeader}>
                  <Text style={styles.planLabel}>{plan.label}</Text>
                  {plan.badge ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{plan.badge}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.planPrice}>{plan.price_display}</Text>
                {!!plan.description && (
                  <Text style={styles.planDesc}>{plan.description}</Text>
                )}
                {isCurrentPlan ? (
                  <View style={styles.currentBadge}>
                    <Text style={styles.currentBadgeText}>✓ {t('subscription.currentPlan')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={styles.subscribeBtn}
                    onPress={() => handleSubscribe(plan)}
                    disabled={subscribing !== null}
                  >
                    {subscribing === plan.id
                      ? <ActivityIndicator color={COLORS.black} size="small" />
                      : <Text style={styles.subscribeBtnText}>{t('subscription.subscribe')}</Text>
                    }
                  </TouchableOpacity>
                )}
              </View>
            );
          })
        )}

        <Text style={styles.footerNote}>{t('subscription.footerNote')}</Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 20, paddingBottom: 60 },
  trialBanner: {
    backgroundColor: 'rgba(200,128,10,0.12)',
    borderWidth: 1, borderColor: COLORS.borderAccent,
    borderRadius: 14, padding: 16, marginBottom: 24,
  },
  activeBanner: { backgroundColor: 'rgba(46,204,113,0.1)', borderColor: '#2ecc71' },
  expiredBanner: { backgroundColor: 'rgba(231,76,60,0.1)', borderColor: '#e74c3c' },
  trialTitle: { fontSize: 16, fontWeight: '800', color: COLORS.text, marginBottom: 4 },
  trialSub: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  sectionLabel: {
    fontSize: 12, fontWeight: '700', color: COLORS.primary,
    textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 16,
  },
  planCard: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: 20, marginBottom: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  planCardActive: { borderColor: COLORS.primary, borderWidth: 2 },
  planHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  planLabel: { fontSize: 18, fontWeight: '800', color: COLORS.text, flex: 1 },
  badge: {
    backgroundColor: COLORS.primary, borderRadius: 20,
    paddingHorizontal: 10, paddingVertical: 3,
  },
  badgeText: { fontSize: 11, fontWeight: '800', color: COLORS.black },
  planPrice: { fontSize: 22, fontWeight: '800', color: COLORS.primary, marginBottom: 6 },
  planDesc: { fontSize: 13, color: COLORS.textLight, lineHeight: 19, marginBottom: 14 },
  subscribeBtn: {
    backgroundColor: COLORS.primary, borderRadius: 12,
    paddingVertical: 13, alignItems: 'center', marginTop: 8,
  },
  subscribeBtnText: { color: COLORS.black, fontWeight: '800', fontSize: 15 },
  currentBadge: {
    backgroundColor: 'rgba(46,204,113,0.12)', borderRadius: 10,
    paddingVertical: 10, alignItems: 'center', marginTop: 8,
    borderWidth: 1, borderColor: '#2ecc71',
  },
  currentBadgeText: { color: '#2ecc71', fontWeight: '700', fontSize: 14 },
  footerNote: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center',
    marginTop: 24, lineHeight: 17, paddingHorizontal: 16,
  },
});

export default SubscriptionScreen;
